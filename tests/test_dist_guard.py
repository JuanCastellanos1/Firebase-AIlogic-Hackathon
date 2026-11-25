"""Regression tests for scripts/check_dist.py (production artifact guard).

Every synthetic value is assembled at run time, so the repository stores no credential-shaped
literal and the scanner stays clean while the guard is still proven to detect one.
"""

from __future__ import annotations

import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "scripts"))

import check_dist as guard

SCRIPT = REPO_ROOT / "scripts" / "check_dist.py"


def synthetic_api_key() -> str:
    return "AIza" + ("B1c2D3e4F5g6H7i8J9k0L1m2N3o4P5q6R7" * 2)[:35]


class FindTests(unittest.TestCase):
    def test_clean_output_passes(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            dist = Path(directory)
            (dist / "index.html").write_text("<html><body>ok</body></html>", encoding="utf-8")
            (dist / "assets").mkdir()
            (dist / "assets" / "app.js").write_text("const x = 'demo-shiftrelay';", encoding="utf-8")
            self.assertEqual(guard.find_findings(dist), [])

    def test_api_key_literal_is_found(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            dist = Path(directory)
            (dist / "app.js").write_text(f"const k = '{synthetic_api_key()}';", encoding="utf-8")
            findings = guard.find_findings(dist)
            self.assertEqual([rule for rule, _ in findings], ["firebase-web-api-key"])
            self.assertNotIn(synthetic_api_key(), str(findings))

    def test_debug_token_value_and_test_hook_are_found(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            dist = Path(directory)
            (dist / "app.js").write_text(
                'self.FIREBASE_APPCHECK_DEBUG_TOKEN = "11111111-2222-4333-8444-555555555555";'
                " globalThis.__shiftrelayTestCloud = {};",
                encoding="utf-8",
            )
            rules = [rule for rule, _ in guard.find_findings(dist)]
            self.assertIn("appcheck-debug-token-value", rules)
            self.assertIn("test-network-mock-hook", rules)

    def test_uppercase_uuid_shaped_token_value_is_found(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            dist = Path(directory)
            (dist / "app.js").write_text(
                'self.FIREBASE_APPCHECK_DEBUG_TOKEN = "AAAAAAAA-BBBB-4CCC-8DDD-EEEEEEEEEEEE";',
                encoding="utf-8",
            )
            rules = [rule for rule, _ in guard.find_findings(dist)]
            self.assertEqual(rules, ["appcheck-debug-token-value"])

    def test_sdk_property_name_alone_is_not_a_finding(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            dist = Path(directory)
            (dist / "app.js").write_text(
                "typeof globals.FIREBASE_APPCHECK_DEBUG_TOKEN !== 'string';", encoding="utf-8"
            )
            self.assertEqual(guard.find_findings(dist), [])

    def test_private_configuration_path_is_found(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            dist = Path(directory)
            (dist / "app.js").write_text(
                "const p = 'shiftrelay-private/firebase-development.env';", encoding="utf-8"
            )
            rules = [rule for rule, _ in guard.find_findings(dist)]
            self.assertEqual(rules, ["private-config-path"])

    def test_missing_dist_fails_closed(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            self.assertEqual(guard.main([str(Path(directory) / "absent")]), 2)


class WiringTests(unittest.TestCase):
    def test_verifier_runs_the_guard_after_the_build(self) -> None:
        text = (REPO_ROOT / "scripts" / "verificar.py").read_text(encoding="utf-8")
        self.assertIn('"name": "dist-guard"', text)
        self.assertIn("scripts/check_dist.py", text)
        build = text.index('"name": "build"')
        self.assertLess(build, text.index('"name": "dist-guard"'))

    def test_script_runs_and_reports_a_real_dist(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            dist = Path(directory)
            (dist / "index.html").write_text("<html></html>", encoding="utf-8")
            completed = subprocess.run(
                [sys.executable, str(SCRIPT), str(dist)],
                cwd=str(REPO_ROOT),
                capture_output=True,
                text=True,
                encoding="utf-8",
                timeout=120,
            )
        self.assertEqual(completed.returncode, 0, completed.stdout + completed.stderr)
        self.assertIn("dist guard: PASS", completed.stdout)


if __name__ == "__main__":
    unittest.main()
