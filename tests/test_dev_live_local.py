"""Regression tests for the dev-only live-local runner (scripts/dev_live_local.py).

The runner injects the outside-root private Firebase values into a Vite dev process. These tests
use synthetic values only: nothing here reads, prints or writes the real private file.
"""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "scripts"))

import dev_live_local as runner

SYNTHETIC = {
    "VITE_FIREBASE_API_KEY": "AIzaSyntheticDevRunnerKey0000000000000000",
    "VITE_FIREBASE_AUTH_DOMAIN": "shiftrelay-hybridai-2026.firebaseapp.com",
    "VITE_FIREBASE_PROJECT_ID": "shiftrelay-hybridai-2026",
    "VITE_FIREBASE_MESSAGING_SENDER_ID": "1013230596333",
    "VITE_FIREBASE_APPCHECK_SITE_KEY": "6LSyntheticSiteKey0000000000000000000000",
    "VITE_FIREBASE_APPCHECK_DEBUG_TOKEN": "11111111-2222-4333-8444-555555555555",
}
SECRET_NAMES = (
    "VITE_FIREBASE_API_KEY",
    "VITE_FIREBASE_APPCHECK_DEBUG_TOKEN",
    "VITE_FIREBASE_APPCHECK_SITE_KEY",
)


def env_text(values: dict[str, str], commented_app_id: bool = True) -> str:
    lines = ["# synthetic private file"]
    for name, value in values.items():
        lines.append(f"{name}={value}")
    if commented_app_id:
        lines.append(f"# VITE_FIREBASE_APP_ID={runner.LIVE_APP_ID}")
    return "\n".join(lines) + "\n"


class ParseTests(unittest.TestCase):
    def test_parses_entries_and_ignores_comments(self) -> None:
        parsed = runner.parse_env_text(env_text(SYNTHETIC) + "\n\n# trailing\n")
        self.assertEqual(parsed, {**SYNTHETIC, "VITE_FIREBASE_APP_ID": runner.LIVE_APP_ID})

    def test_reads_the_commented_out_live_block(self) -> None:
        commented = "\n".join(f"# {name}={value}" for name, value in SYNTHETIC.items())
        prose = "# Public Firebase web config, local only\n# shiftrelay-hybridai-2026 (Spark)\n"
        parsed = runner.parse_env_text(prose + commented + "\n")
        self.assertEqual(parsed, SYNTHETIC)

    def test_ignores_names_outside_the_allowlist(self) -> None:
        text = env_text(SYNTHETIC) + "SOME_OTHER_SECRET=value\n# OTHER=value\n"
        parsed = runner.parse_env_text(text)
        self.assertNotIn("SOME_OTHER_SECRET", parsed)
        self.assertNotIn("OTHER", parsed)
        self.assertEqual(
            parsed, {**SYNTHETIC, "VITE_FIREBASE_APP_ID": runner.LIVE_APP_ID}
        )

    def test_duplicate_name_is_refused(self) -> None:
        text = env_text(SYNTHETIC) + "VITE_FIREBASE_API_KEY=other\n"
        with self.assertRaises(runner.ConfigError):
            runner.parse_env_text(text)

    def test_malformed_line_is_refused(self) -> None:
        with self.assertRaises(runner.ConfigError):
            runner.parse_env_text("this is not an assignment\n")


class ValidationTests(unittest.TestCase):
    def test_accepts_a_complete_synthetic_configuration(self) -> None:
        live = runner.validate_live_config(SYNTHETIC)
        self.assertEqual(live["VITE_FIREBASE_LIVE_LOCAL"], "1")
        self.assertEqual(live["VITE_FIREBASE_PROJECT_ID"], "shiftrelay-hybridai-2026")

    def test_missing_name_fails_closed_without_echoing_other_values(self) -> None:
        for name in runner.REQUIRED_NAMES:
            partial = {key: value for key, value in SYNTHETIC.items() if key != name}
            with self.assertRaises(runner.ConfigError) as caught:
                runner.validate_live_config(partial)
            message = str(caught.exception)
            self.assertIn(name, message)
            for secret in SECRET_NAMES:
                if secret in partial:
                    self.assertNotIn(partial[secret], message)

    def test_blank_value_fails_closed(self) -> None:
        broken = dict(SYNTHETIC)
        broken["VITE_FIREBASE_APPCHECK_DEBUG_TOKEN"] = "  "
        with self.assertRaises(runner.ConfigError) as caught:
            runner.validate_live_config(broken)
        self.assertIn("VITE_FIREBASE_APPCHECK_DEBUG_TOKEN", str(caught.exception))

    def test_wrong_project_or_app_is_refused(self) -> None:
        for overrides in (
            {"VITE_FIREBASE_PROJECT_ID": "another-project"},
            {"VITE_FIREBASE_APPCHECK_SITE_KEY": "not-a-site-key"},
            {"VITE_FIREBASE_API_KEY": "not-an-api-key"},
        ):
            broken = dict(SYNTHETIC)
            broken.update(overrides)
            with self.assertRaises(runner.ConfigError) as caught:
                runner.validate_live_config(broken)
            for value in overrides.values():
                self.assertNotIn(value, str(caught.exception))

    def test_private_file_inside_the_repository_is_refused(self) -> None:
        with self.assertRaises(runner.ConfigError):
            runner.check_private_path(REPO_ROOT / "firebase-development.env", REPO_ROOT)
        runner.check_private_path(REPO_ROOT.parent / "shiftrelay-private" / "x.env", REPO_ROOT)

    def test_child_environment_drops_host_credentials(self) -> None:
        host = {
            "PATH": "C:\\Windows",
            "SystemRoot": "C:\\Windows",
            "GOOGLE_APPLICATION_CREDENTIALS": "C:\\creds.json",
            "FIREBASE_TOKEN": "host-token",
            "SHIFTRELAY_QA_OUTGOING_PASSWORD": "host-password",
        }
        child = runner.child_env(host, runner.validate_live_config(SYNTHETIC))
        for name in ("GOOGLE_APPLICATION_CREDENTIALS", "FIREBASE_TOKEN", "SHIFTRELAY_QA_OUTGOING_PASSWORD"):
            self.assertNotIn(name, child)
        self.assertEqual(child["PATH"], "C:\\Windows")
        self.assertEqual(child["VITE_FIREBASE_LIVE_LOCAL"], "1")

    def test_banner_never_contains_a_value(self) -> None:
        banner = runner.banner(runner.validate_live_config(SYNTHETIC), 5173)
        for name in SECRET_NAMES:
            self.assertNotIn(SYNTHETIC[name], banner)
        self.assertIn("127.0.0.1:5173", banner)


if __name__ == "__main__":
    unittest.main()
