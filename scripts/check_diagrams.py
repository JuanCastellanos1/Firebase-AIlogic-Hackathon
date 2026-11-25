#!/usr/bin/env python3
"""Render Mermaid blocks from Markdown with the pinned Mermaid CLI.

Usage:
  py -3 scripts/check_diagrams.py docs
  py -3 scripts/check_diagrams.py docs/spec.md --out-dir .git/opencode/diagrams
  py -3 scripts/check_diagrams.py --self-test

A missing renderer, a file without Mermaid blocks or a failed render exits
non-zero: an unrendered diagram is never reported as a pass.
"""

from __future__ import annotations

import argparse
import contextlib
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
MMDC_CLI = REPO_ROOT / "node_modules" / "@mermaid-js" / "mermaid-cli" / "src" / "cli.js"
BLOCK = re.compile(r"```mermaid\s*\n(.*?)```", re.DOTALL | re.IGNORECASE)
BROWSERS = [
    Path(r"C:\Program Files\Google\Chrome\Application\chrome.exe"),
    Path(r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"),
    Path(r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"),
    Path(r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"),
    Path("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"),
    Path("/usr/bin/google-chrome"),
    Path("/usr/bin/chromium"),
]


def mermaid_blocks(text: str) -> list[str]:
    return [m.group(1).strip() for m in BLOCK.finditer(text) if m.group(1).strip()]


def markdown_files(paths: list[str]) -> list[Path]:
    result: list[Path] = []
    for raw in paths:
        path = Path(raw)
        if path.is_file() and path.suffix.lower() == ".md":
            result.append(path)
        elif path.is_dir():
            result.extend(sorted(path.rglob("*.md")))
    return result


def renderer_command() -> list[str] | None:
    """Pinned local Mermaid CLI through Node; nothing is fetched at check time."""
    node = shutil.which("node")
    if node and MMDC_CLI.is_file():
        return [node, str(MMDC_CLI)]
    mmdc = shutil.which("mmdc")
    return [mmdc] if mmdc else None


@contextlib.contextmanager
def browser_config():
    """Puppeteer launch config: explicit override, an installed browser, or none."""
    override = os.environ.get("MERMAID_PUPPETEER_CONFIG")
    if override:
        yield Path(override)
        return
    browser = next((p for p in BROWSERS if p.is_file()), None)
    if browser is None:
        yield None
        return
    with tempfile.TemporaryDirectory(prefix="mmdc-puppeteer-") as tmp:
        config = Path(tmp) / "puppeteer.json"
        config.write_text(
            json.dumps({"executablePath": str(browser)}), encoding="utf-8"
        )
        yield config


def render(block: str, svg: Path, command: list[str], config: Path | None) -> tuple[bool, str]:
    svg = svg.resolve()
    svg.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="mermaid-") as tmp:
        source = Path(tmp) / "diagram.mmd"
        source.write_text(block, encoding="utf-8")
        args = [*command, "-i", str(source), "-o", str(svg), "-q"]
        if config is not None:
            args.extend(["-p", str(config)])
        try:
            proc = subprocess.run(
                args, capture_output=True, text=True, timeout=300, cwd=REPO_ROOT
            )
        except subprocess.TimeoutExpired:
            return False, "mermaid-cli timed out after 300s"
    if proc.returncode != 0:
        lines = (proc.stderr or proc.stdout or "").strip().splitlines()
        return False, lines[-1] if lines else "mermaid-cli failed"
    if not svg.is_file() or svg.stat().st_size == 0:
        return False, "mermaid-cli produced no SVG"
    return True, ""


def diagram_slug(path: Path, index: int) -> str:
    try:
        stem = path.resolve().relative_to(REPO_ROOT).with_suffix("").as_posix()
    except ValueError:
        stem = path.with_suffix("").name
    return f"{stem.replace('/', '__')}-{index}.svg"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write_report(path: Path, report: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")


def self_test() -> int:
    valid = "flowchart TD\n  A[Start] --> B[End]"
    invalid = "flowchart TD\n  A[Start] -->"
    if mermaid_blocks(f"```mermaid\n{valid}\n```") != [valid]:
        print("self-test FAIL: block extraction")
        return 1
    command = renderer_command()
    if command is None:
        print("self-test FAIL: Mermaid CLI not installed (run npm install)")
        return 1
    with browser_config() as config, tempfile.TemporaryDirectory(
        prefix="mermaid-selftest-"
    ) as tmp:
        tmp_path = Path(tmp)
        ok, detail = render(valid, tmp_path / "valid.svg", command, config)
        if not ok:
            print(f"self-test FAIL: valid diagram did not render: {detail}")
            return 1
        bad_ok, _ = render(invalid, tmp_path / "invalid.svg", command, config)
        if bad_ok:
            print("self-test FAIL: malformed diagram accepted")
            return 1
    print("self-test OK")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("paths", nargs="*", default=["docs"])
    parser.add_argument("--self-test", action="store_true")
    parser.add_argument("--out-dir", default=".git/opencode/diagrams")
    parser.add_argument("--report", default=".git/opencode/diagram-check.json")
    args = parser.parse_args()
    if args.self_test:
        return self_test()

    command = renderer_command()
    if command is None:
        print(
            "Mermaid CLI not found. Run npm install at the repository root.",
            file=sys.stderr,
        )
        return 1

    files = markdown_files(args.paths)
    if not files:
        print("No Markdown files in the given paths.", file=sys.stderr)
        return 1

    out_dir = Path(args.out_dir)
    results = []
    failures = 0
    with browser_config() as config:
        for path in files:
            blocks = mermaid_blocks(path.read_text(encoding="utf-8"))
            for i, block in enumerate(blocks, 1):
                svg = out_dir / diagram_slug(path, i)
                label = f"{path}#{i}"
                ok, detail = render(block, svg, command, config)
                results.append(
                    {
                        "source": label,
                        "ok": ok,
                        "svg": str(svg).replace("\\", "/") if ok else None,
                        "sha256": sha256(svg) if ok else None,
                        "error": detail or None,
                    }
                )
                if ok:
                    print(f"OK {label} -> {svg}")
                else:
                    failures += 1
                    print(f"FAIL {label}: {detail}", file=sys.stderr)

    if not results:
        print("No Mermaid blocks found.", file=sys.stderr)
        return 1

    write_report(
        Path(args.report),
        {
            "schema": 1,
            "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "renderer": subprocess.run(
                [*command, "--version"], capture_output=True, text=True, timeout=60
            ).stdout.strip(),
            "ok": failures == 0,
            "results": results,
        },
    )
    print(f"{len(results) - failures}/{len(results)} diagrams OK")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
