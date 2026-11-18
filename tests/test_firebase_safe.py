"""Regression tests for the Firebase debug-log guard (tooling, not application behavior).

Two layers are covered. Prevention: the wrapper spawns the CLI with an allowlisted environment, so
host credentials are absent from the child and therefore from any log it dumps, even if the process
is killed before the post-exit scrub runs. Defense in depth: the post-exit scrub still replaces an
environment payload that some other path might write.

Every fixture value is synthetic, assembled at run time and never printed. The scanner is used to
prove cleanliness, not to hide a rule.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "scripts"))

import firebase_safe
import scan_secrets

TEMP_ROOT = Path(tempfile.gettempdir()) / "opencode"
# Runtime-assembled so no credential-shaped literal lands in the source or the .pyc. The shapes
# mirror the three host variables from the incident; the scanner test below proves they are
# detectable, so "absent from the child" is a meaningful assertion.
FAKE_PAT = "".join(["ghp_", "Q7ZR4T5Y6U7I2O3P", "A1B2C3D4E5F6G7H8", "K9L0"])
FAKE_KEY_A = "".join(["sk_", "E7Xv2Wq9Lm4Rn8Tb1Yc6Uj3Hd5Pg0Ka2"])
FAKE_KEY_B = "".join(["omni_", "R4tY7uI9oP2aS5dF8gH1jK3lZ6xC0vB4"])
DIAGNOSTIC = "[info] i  Script exited successfully (code 0)\n"
ENV_LINE = (
    '[debug] [2026-01-01T00:00:00.000Z] Running playwright test with environment '
    f'{{"PATH":"C:\\\\Windows","GITHUB_TOKEN":"{FAKE_PAT}"}}\n'
)
EMULATOR_ARGS = ["emulators:exec", "--project", "demo-shiftrelay", "--only", "firestore", "vitest run"]


class FirebaseSafeTest(unittest.TestCase):
    def setUp(self) -> None:
        TEMP_ROOT.mkdir(parents=True, exist_ok=True)

    def workspace(self) -> Path:
        tmp = tempfile.TemporaryDirectory(dir=TEMP_ROOT, prefix="firebase-safe-")
        self.addCleanup(tmp.cleanup)
        return Path(tmp.name)

    def require_scanner(self) -> None:
        try:
            scan_secrets.scanner()
        except scan_secrets.ScannerMissing as exc:
            self.fail(f"{exc}; install with `py -3 scripts/scan_secrets.py --install`")

    # -- prevention -------------------------------------------------------------------------

    def test_child_environment_keeps_only_allowlisted_variables(self) -> None:
        parent = dict(os.environ)
        parent.update(
            {"GITHUB_TOKEN": FAKE_PAT, "ELEVENLABS_API_KEY": FAKE_KEY_A, "OMNIROUTE_API_KEY": FAKE_KEY_B}
        )

        env = firebase_safe.child_env(parent)
        names = {name.lower() for name in env}

        for name in ("github_token", "elevenlabs_api_key", "omniroute_api_key"):
            self.assertNotIn(name, names, name)
        joined = json.dumps(env)
        for value in (FAKE_PAT, FAKE_KEY_A, FAKE_KEY_B):
            self.assertNotIn(value, joined)
        for name in ("path", "temp", "systemroot", "userprofile"):
            self.assertIn(name, names)

    def test_host_credentials_are_dropped_from_the_real_environment(self) -> None:
        env = firebase_safe.child_env(dict(os.environ))
        names = {name.lower() for name in env}

        for name in ("github_token", "gh_token", "elevenlabs_api_key", "omniroute_api_key", "debug"):
            self.assertNotIn(name, names, name)
        self.assertLess(len(env), len(os.environ))

    def test_spawned_child_cannot_see_host_credentials(self) -> None:
        parent = dict(os.environ)
        parent.update({"GITHUB_TOKEN": FAKE_PAT, "OMNIROUTE_API_KEY": FAKE_KEY_B})

        probe = subprocess.run(
            [sys.executable, "-c", "import os,json;print(json.dumps(sorted(os.environ)))"],
            env=firebase_safe.child_env(parent),
            capture_output=True,
            text=True,
            timeout=120,
        )

        self.assertEqual(probe.returncode, 0, probe.stderr)
        names = json.loads(probe.stdout)
        self.assertIn("PATH", names)
        for name in ("GITHUB_TOKEN", "ELEVENLABS_API_KEY", "OMNIROUTE_API_KEY"):
            self.assertNotIn(name, names, name)
        self.assertNotIn(FAKE_PAT, probe.stdout)
        self.assertNotIn(FAKE_KEY_B, probe.stdout)

    def test_log_written_by_restricted_child_scans_clean_before_any_scrub(self) -> None:
        """Simulates a kill before the scrub: the dump exists, prevention already made it clean."""
        self.require_scanner()
        parent = dict(os.environ)
        parent.update(
            {"GITHUB_TOKEN": FAKE_PAT, "ELEVENLABS_API_KEY": FAKE_KEY_A, "OMNIROUTE_API_KEY": FAKE_KEY_B}
        )
        root = self.workspace()
        log = root / "firebase-debug.log"
        dumped = json.dumps(firebase_safe.child_env(parent))
        log.write_text(
            f'[debug] [2026-01-01T00:00:00.000Z] Running playwright test with environment {dumped}\n'
            + DIAGNOSTIC,
            encoding="utf-8",
        )

        result = scan_secrets.run(root)

        text = log.read_text(encoding="utf-8")
        self.assertIn("with environment", text)
        self.assertIn('"PATH"', text)
        for value in (FAKE_PAT, FAKE_KEY_A, FAKE_KEY_B):
            self.assertNotIn(value, text)
        self.assertTrue(result["ok"], result)
        self.assertEqual(result["findings"], [])
        self.assertFalse((root / ".gitleaks.toml").exists())

    # -- command guard ----------------------------------------------------------------------

    def test_emulator_test_command_is_accepted(self) -> None:
        self.assertIsNone(firebase_safe.check_command(EMULATOR_ARGS))
        self.assertIsNone(firebase_safe.check_command([*EMULATOR_ARGS[:-1], "playwright test"]))

    def test_live_commands_are_refused(self) -> None:
        for args in (
            ["deploy", "--project", "demo-shiftrelay"],
            ["hosting:channel:deploy", "preview", "--project", "demo-shiftrelay"],
            ["login"],
            ["emulators:start", "--project", "demo-shiftrelay"],
            ["emulators:exec", "--project", "demo-shiftrelay", "npx firebase deploy"],
            ["emulators:exec", "--project", "demo-shiftrelay", "vitest run && firebase deploy"],
        ):
            with self.subTest(args=args):
                self.assertIsNotNone(firebase_safe.check_command(args), args)

    def test_live_or_missing_project_is_refused(self) -> None:
        for args in (
            ["emulators:exec", "--only", "firestore", "vitest run"],
            ["emulators:exec", "--project", "shiftrelay-prod", "vitest run"],
            ["emulators:exec", "--project=demo-shiftrelay", "npm run test:unit"],
        ):
            with self.subTest(args=args):
                self.assertIsNotNone(firebase_safe.check_command(args), args)

    # -- defense in depth: post-exit scrub --------------------------------------------------

    def test_environment_payload_is_replaced_and_diagnostics_kept(self) -> None:
        root = self.workspace()
        log = root / "firebase-debug.log"
        log.write_text("header\n" + ENV_LINE + DIAGNOSTIC, encoding="utf-8")

        replacements = firebase_safe.scrub_logs(root)

        text = log.read_text(encoding="utf-8")
        self.assertEqual(replacements, 1)
        self.assertNotIn(FAKE_PAT, text)
        self.assertNotIn("C:\\\\Windows", text)
        self.assertIn(firebase_safe.PLAYLOAD_REPLACEMENT, text)
        self.assertIn("Running playwright test with environment", text)
        self.assertIn(DIAGNOSTIC, text)
        self.assertIn("header", text)

    def test_redaction_removes_the_finding_without_allowlisting_it(self) -> None:
        self.require_scanner()
        root = self.workspace()
        log = root / "firebase-debug.log"
        log.write_text(ENV_LINE + DIAGNOSTIC, encoding="utf-8")

        before = scan_secrets.run(root)
        self.assertEqual(before["exit"], 1, before)
        self.assertTrue(before["findings"], before)
        self.assertTrue(before["findings"][0]["file"].endswith("firebase-debug.log"))

        firebase_safe.scrub_logs(root)
        after = scan_secrets.run(root)

        self.assertTrue(log.is_file(), "the diagnostic log must survive the scrub")
        self.assertTrue(after["ok"], after)
        self.assertEqual(after["findings"], [])
        self.assertFalse((root / ".gitleaks.toml").exists())
        self.assertFalse((root / ".gitleaksignore").exists())

    def test_npm_emulator_scripts_route_through_the_wrapper(self) -> None:
        package = json.loads((REPO_ROOT / "package.json").read_text(encoding="utf-8"))
        scripts = package["scripts"]
        for name in ("test:rules", "test:e2e"):
            self.assertIn("scripts/firebase_safe.py", scripts[name], name)
            self.assertNotIn("firebase emulators:exec", scripts[name], name)
        self.assertIn("tests.test_firebase_safe", scripts["test:tools"])


if __name__ == "__main__":
    unittest.main()
