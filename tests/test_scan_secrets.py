"""Regression tests for the Q5 credential scan runner (tooling, not application behavior).

Every fixture is generated in the approved temp directory. The synthetic token matches the
scanner's AWS rule; it is not a real credential.
"""

from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "scripts"))

import scan_secrets

TEMP_ROOT = Path(tempfile.gettempdir()) / "opencode"
# Assembled at run time (join is not constant-folded into the .pyc) so neither the source nor the
# compiled test cache stores a credential-shaped literal. The positive test below still proves the
# scanner detects this exact value.
SYNTHETIC_TOKEN = "".join(["AKIA", "Q7ZR4T5Y6U7I2O3P"])


class ScanSecretsTest(unittest.TestCase):
    def setUp(self) -> None:
        TEMP_ROOT.mkdir(parents=True, exist_ok=True)

    def workspace(self) -> Path:
        tmp = tempfile.TemporaryDirectory(dir=TEMP_ROOT, prefix="scan-test-")
        self.addCleanup(tmp.cleanup)
        return Path(tmp.name)

    def require_scanner(self) -> Path:
        try:
            return scan_secrets.scanner()
        except scan_secrets.ScannerMissing as exc:
            self.fail(f"{exc}; install with `py -3 scripts/scan_secrets.py --install`")

    def test_known_positive_fixture_fails_with_the_value_redacted(self) -> None:
        self.require_scanner()
        root = self.workspace()
        (root / "leaked-notes.md").write_text(
            f"aws_access_key_id = {SYNTHETIC_TOKEN}\n", encoding="utf-8"
        )
        result = scan_secrets.run(root)

        self.assertFalse(result["ok"])
        self.assertEqual(result["exit"], 1)
        self.assertTrue(result["findings"], result)
        self.assertEqual(result["findings"][0]["rule"], "aws-access-token")
        self.assertTrue(result["findings"][0]["file"].endswith("leaked-notes.md"))
        self.assertIn("leaks found: 1", result["output"])
        # The matched value must survive nowhere: not in the scanner log, not in the summary.
        blob = json.dumps(result)
        self.assertNotIn(SYNTHETIC_TOKEN, blob)
        self.assertNotIn('"Match"', blob)
        self.assertNotIn('"Secret"', blob)

    def test_negative_fixture_passes(self) -> None:
        self.require_scanner()
        root = self.workspace()
        (root / "handover.md").write_text(
            "Shift handover: restock aisle four before 07:00.\n", encoding="utf-8"
        )
        report = self.workspace() / "report.json"
        result = scan_secrets.run(root, report)

        self.assertTrue(result["ok"], result)
        self.assertEqual(result["exit"], 0)
        self.assertEqual(result["findings"], [])
        self.assertGreater(result["scope"]["scanned_bytes"], 0)
        written = json.loads(report.read_text(encoding="utf-8"))
        self.assertTrue(written["ok"])
        self.assertNotIn("output", written)

    def test_unavailable_scanner_fails_closed(self) -> None:
        root = self.workspace()
        (root / "notes.md").write_text("nothing secret here\n", encoding="utf-8")
        result = scan_secrets.run(root, exe=root / "no-gitleaks.exe")

        self.assertFalse(result["ok"])
        self.assertEqual(result["exit"], 2)
        self.assertEqual(result["findings"], [])
        self.assertIn("scanner unavailable", result["error"])
        self.assertIn("--install", result["error"])
        self.assertIn(scan_secrets.ASSET_SHA256, result["error"])

    def test_empty_or_missing_input_fails_closed(self) -> None:
        self.require_scanner()
        empty = self.workspace()
        result = scan_secrets.run(empty)
        self.assertFalse(result["ok"])
        self.assertEqual(result["exit"], 2)
        self.assertIn("empty scan input", result["error"])

        absent = self.workspace() / "does-not-exist"
        result = scan_secrets.run(absent)
        self.assertFalse(result["ok"])
        self.assertIn("not a directory", result["error"])

    def test_untracked_and_gitignored_files_are_scanned(self) -> None:
        self.require_scanner()
        root = self.workspace()
        (root / ".gitignore").write_text("dist/\n.env\n", encoding="utf-8")
        (root / "dist").mkdir()
        (root / "dist" / "bundle.js").write_text(
            f"const key = '{SYNTHETIC_TOKEN}';\n", encoding="utf-8"
        )
        (root / ".env").write_text(f"AWS_ACCESS_KEY_ID={SYNTHETIC_TOKEN}\n", encoding="utf-8")

        result = scan_secrets.run(root)

        names = {Path(finding["file"]).name for finding in result["findings"]}
        self.assertIn("bundle.js", names)
        self.assertIn(".env", names)

    def test_project_allowlist_config_is_rejected(self) -> None:
        self.require_scanner()
        root = self.workspace()
        (root / "app.ts").write_text("export const venue = 'demo';\n", encoding="utf-8")
        (root / ".gitleaks.toml").write_text("[extend]\nuseDefault = true\n", encoding="utf-8")

        result = scan_secrets.run(root)

        self.assertFalse(result["ok"])
        self.assertIn(".gitleaks.toml", result["error"])

    def test_vcs_and_dependency_directories_are_excluded(self) -> None:
        self.require_scanner()
        root = self.workspace()
        for name in (".git", "node_modules"):
            directory = root / name
            directory.mkdir()
            (directory / "config.txt").write_text(
                f"aws_access_key_id = {SYNTHETIC_TOKEN}\n", encoding="utf-8"
            )
        (root / "app.ts").write_text("export const venue = 'demo';\n", encoding="utf-8")

        result = scan_secrets.run(root)

        self.assertTrue(result["ok"], result)
        self.assertEqual(result["findings"], [])
        self.assertEqual(result["scope"]["files"], 1)

    def test_npm_script_and_verifier_use_the_pinned_scanner(self) -> None:
        package = json.loads((REPO_ROOT / "package.json").read_text(encoding="utf-8"))
        script = package["scripts"]["scan:secrets"]
        self.assertIn("scripts/scan_secrets.py", script)

        sys.path.insert(0, str(REPO_ROOT / "scripts"))
        try:
            import verificar
        finally:
            sys.path.pop(0)
        checks = {check["name"]: " ".join(check["command"]) for check in verificar.CHECKS}
        self.assertIn("scan:secrets", checks["secret-scan"])
        self.assertIn("npm audit --omit=dev --audit-level=high", checks["dependency-audit"])
        self.assertNotIn("secret-scan", "\n".join(verificar.SCOPE["unimplemented"]).lower())
        self.assertIn("credential scan", scan_secrets.__doc__)
        self.assertNotIn("NOT IMPLEMENTED", scan_secrets.__doc__)


if __name__ == "__main__":
    unittest.main()
