"""Tests for the Mermaid diagram checker (tooling, not application behavior)."""

from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
CHECKER = REPO_ROOT / "scripts" / "check_diagrams.py"


class CheckDiagramsTest(unittest.TestCase):
    def run_checker(self, *args: str) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            [sys.executable, str(CHECKER), *args],
            capture_output=True,
            text=True,
            timeout=300,
            cwd=REPO_ROOT,
        )

    def test_extracts_only_mermaid_blocks(self) -> None:
        sys.path.insert(0, str(REPO_ROOT / "scripts"))
        try:
            import check_diagrams
        finally:
            sys.path.pop(0)

        markdown = (
            "# Title\n\n```mermaid\nflowchart TD\n  A --> B\n```\n\n"
            "```js\nnot a diagram\n```\n\n"
            "```mermaid\n\n```\n"
        )
        self.assertEqual(
            check_diagrams.mermaid_blocks(markdown), ["flowchart TD\n  A --> B"]
        )

    def test_valid_diagram_passes_and_writes_svg(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            doc = tmp_path / "valid.md"
            doc.write_text(
                "```mermaid\nflowchart TD\n  A[Start] --> B[End]\n```\n",
                encoding="utf-8",
            )
            result = self.run_checker(
                str(doc),
                "--out-dir",
                str(tmp_path / "out"),
                "--report",
                str(tmp_path / "report.json"),
            )
            self.assertEqual(result.returncode, 0, result.stderr)
            svgs = list((tmp_path / "out").glob("*.svg"))
            self.assertEqual(len(svgs), 1)
            self.assertIn("<svg", svgs[0].read_text(encoding="utf-8"))
            report = json.loads((tmp_path / "report.json").read_text(encoding="utf-8"))
            self.assertTrue(report["ok"])
            self.assertEqual(len(report["results"]), 1)

    def test_malformed_diagram_fails(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            doc = tmp_path / "broken.md"
            doc.write_text(
                "```mermaid\nflowchart TD\n  A[Start] -->\n```\n", encoding="utf-8"
            )
            result = self.run_checker(
                str(doc),
                "--out-dir",
                str(tmp_path / "out"),
                "--report",
                str(tmp_path / "report.json"),
            )
            self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
            self.assertEqual(list((tmp_path / "out").glob("*.svg")), [])
            report = json.loads((tmp_path / "report.json").read_text(encoding="utf-8"))
            self.assertFalse(report["ok"])

    def test_no_mermaid_blocks_fails(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            doc = tmp_path / "plain.md"
            doc.write_text("# No diagrams\n", encoding="utf-8")
            result = self.run_checker(str(doc), "--out-dir", str(tmp_path / "out"))
            self.assertEqual(result.returncode, 1, result.stdout + result.stderr)


if __name__ == "__main__":
    unittest.main()
