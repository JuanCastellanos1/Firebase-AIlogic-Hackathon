#!/usr/bin/env python3
"""Q5 credential scan: pinned upstream Gitleaks runner, no homegrown regex.

Usage:
  py -3 scripts/scan_secrets.py
  py -3 scripts/scan_secrets.py --install
  py -3 scripts/scan_secrets.py --report .git/opencode/secret-scan.json

The scanner is Gitleaks, downloaded from its official release URL and verified against the
published SHA-256 before it is executed. The binary lives in the OS temp tool cache, never in
the repository. Scans run with ``--redact=100``: the scanner itself blanks the matched value in
its console output and in its JSON report, so no secret reaches this file, the console or the
evidence written under ``.git/opencode/``.

Scope is the whole working tree plus the production build: untracked and gitignored files are
included (directory scans do not read ``.gitignore``), and only ``.git`` and ``node_modules``
are excluded, by Gitleaks' own embedded default allowlist. No project config or allowlist is
added; a ``.gitleaks.toml`` in the repository is rejected instead of silently suppressing
findings.

Fail-closed: exit 2 when the scanner is missing, not hash-verified, unusable, or when the scan
consumed no bytes. Exit 1 when the scanner reports findings. Exit 0 only for a real clean scan.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import urllib.request
import zipfile
from pathlib import Path

VERSION = "8.30.1"
ASSET = "gitleaks_8.30.1_windows_x64.zip"
ASSET_SHA256 = "d29144deff3a68aa93ced33dddf84b7fdc26070add4aa0f4513094c8332afc4e"
EXE_SHA256 = "17157e2ee8b76fc8b1d8bee607a250e34b8a8023c8bc81822d4b5ee4d78fcb7c"
RELEASE_URL = f"https://github.com/gitleaks/gitleaks/releases/download/v{VERSION}/{ASSET}"

TEMP_ROOT = Path(tempfile.gettempdir()) / "opencode"
TOOL_DIR = TEMP_ROOT / "tools" / "gitleaks" / VERSION
EXE = TOOL_DIR / "gitleaks.exe"
DEFAULT_REPORT = Path(".git/opencode/secret-scan.json")
# Gitleaks' embedded default config skips exactly these two directories.
EXCLUDED_DIRS = {".git", "node_modules"}
SCANNED_BYTES = re.compile(r"scanned ~(\d+) bytes")


class ScannerMissing(RuntimeError):
    """The pinned scanner is absent or does not match its recorded hash."""


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def install(target: Path = TOOL_DIR) -> Path:
    """Download, hash-verify and unpack the pinned release into the temp tool cache."""
    if os.name != "nt":
        raise ScannerMissing(f"only the Windows x64 asset is pinned; this runtime is {os.name}")
    target.mkdir(parents=True, exist_ok=True)
    archive = target / ASSET
    if not archive.is_file():
        partial = archive.with_suffix(".part")
        with urllib.request.urlopen(RELEASE_URL, timeout=120) as response:
            partial.write_bytes(response.read())
        partial.replace(archive)
    actual = sha256(archive)
    if actual != ASSET_SHA256:
        raise ScannerMissing(f"{ASSET} sha256 {actual} != published {ASSET_SHA256}")
    with zipfile.ZipFile(archive) as bundle:
        bundle.extract("gitleaks.exe", target)
    exe = target / "gitleaks.exe"
    actual = sha256(exe)
    if actual != EXE_SHA256:
        raise ScannerMissing(f"gitleaks.exe sha256 {actual} != recorded {EXE_SHA256}")
    return exe


def scanner() -> Path:
    """Return the verified scanner path or raise ScannerMissing (never a silent fallback)."""
    if not EXE.is_file():
        raise ScannerMissing(f"gitleaks {VERSION} not found at {EXE}")
    actual = sha256(EXE)
    if actual != EXE_SHA256:
        raise ScannerMissing(f"gitleaks.exe sha256 {actual} != recorded {EXE_SHA256}")
    return EXE


def count_files(root: Path) -> int:
    total = 0
    for _, dirs, files in os.walk(root):
        dirs[:] = [name for name in dirs if name not in EXCLUDED_DIRS]
        total += len(files)
    return total


def run(
    root: Path,
    report_path: Path | None = None,
    exe: Path | None = None,
    timeout: int = 600,
) -> dict:
    """Scan ``root`` and return a redacted summary. Never includes a matched value."""
    result: dict = {
        "scanner": {
            "name": "gitleaks",
            "version": VERSION,
            "asset": ASSET,
            "asset_sha256": ASSET_SHA256,
            "exe_sha256": EXE_SHA256,
        },
        "scope": {
            "root": str(root),
            "files": 0,
            "scanned_bytes": 0,
            "excluded_dirs": sorted(EXCLUDED_DIRS),
            "includes_untracked": True,
            "includes_build_output": True,
            "project_allowlist": False,
        },
        "findings": [],
        "exit": 2,
        "ok": False,
        "error": None,
        "output": "",
    }
    try:
        binary = scanner() if exe is None else exe
        if exe is not None and not exe.is_file():
            raise ScannerMissing(f"gitleaks not found at {exe}")
    except ScannerMissing as exc:
        result["error"] = (
            f"scanner unavailable: {exc}. Install the verified pin with "
            f"`py -3 scripts/scan_secrets.py --install` (Gitleaks {VERSION}, SHA-256 {ASSET_SHA256})."
        )
        return result

    root = root.resolve()
    if not root.is_dir():
        result["error"] = f"scan target is not a directory: {root}"
        return result
    if (root / ".gitleaks.toml").exists():
        result["error"] = (
            "project .gitleaks.toml present; this runner uses the pinned default config and does "
            "not accept project allowlists for Q5"
        )
        return result
    files = count_files(root)
    if files == 0:
        result["error"] = f"empty scan input: no files under {root}"
        return result
    result["scope"]["files"] = files

    TEMP_ROOT.mkdir(parents=True, exist_ok=True)
    scratch = Path(tempfile.mkdtemp(dir=TEMP_ROOT, prefix="secret-scan-"))
    raw_report = scratch / "gitleaks.json"
    # Point the ignore-file lookup at an empty temp directory so a .gitleaksignore in the
    # repository cannot suppress findings.
    ignore_root = scratch / "ignore"
    ignore_root.mkdir()
    command = [
        str(binary),
        "dir",
        str(root),
        "--no-banner",
        "--no-color",
        "--redact=100",
        "--report-format",
        "json",
        "--report-path",
        str(raw_report),
        "--gitleaks-ignore-path",
        str(ignore_root),
        "--timeout",
        str(timeout),
    ]
    try:
        proc = subprocess.run(
            command,
            cwd=str(root),
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=timeout + 60,
        )
        output = (proc.stdout or "") + (proc.stderr or "")
        code = proc.returncode
    except subprocess.TimeoutExpired as exc:
        stdout = exc.stdout if isinstance(exc.stdout, str) else ""
        result["output"] = stdout + f"\nTIMEOUT after {timeout}s"
        result["error"] = f"scanner timed out after {timeout}s"
        shutil.rmtree(scratch, ignore_errors=True)
        return result
    except OSError as exc:
        result["error"] = f"scanner failed to start: {exc!r}"
        shutil.rmtree(scratch, ignore_errors=True)
        return result

    result["output"] = output
    match = SCANNED_BYTES.search(output)
    if match:
        result["scope"]["scanned_bytes"] = int(match.group(1))
    try:
        raw = json.loads(raw_report.read_text(encoding="utf-8"))
    except (OSError, ValueError) as exc:
        result["error"] = f"scanner report unreadable ({exc!r}); exit {code}"
        shutil.rmtree(scratch, ignore_errors=True)
        return result
    finally:
        shutil.rmtree(scratch, ignore_errors=True)

    if not isinstance(raw, list):
        result["error"] = "scanner report is not a finding list"
        return result
    result["exit"] = code
    result["findings"] = [
        {
            "rule": item.get("RuleID", ""),
            "file": item.get("File", ""),
            "line": item.get("StartLine", 0),
        }
        for item in raw
        if isinstance(item, dict)
    ]
    if code not in (0, 1):
        result["error"] = f"scanner exit {code}"
        return result
    if result["scope"]["scanned_bytes"] == 0:
        result["error"] = "scanner read no bytes; refusing to report a pass"
        return result
    if code == 1 and not result["findings"]:
        result["error"] = "scanner exited 1 without a finding; refusing to report a pass"
        return result
    if code == 0 and result["findings"]:
        result["error"] = "scanner exited 0 with findings; refusing to report a pass"
        return result

    # `ok` is a clean scan, not merely a successful run: findings are never a pass.
    result["ok"] = code == 0 and not result["findings"]
    if report_path is not None:
        report_path.parent.mkdir(parents=True, exist_ok=True)
        payload = {key: value for key, value in result.items() if key != "output"}
        report_path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
        result["report"] = str(report_path)
    return result


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--report", default=str(DEFAULT_REPORT))
    parser.add_argument("--install", action="store_true")
    parser.add_argument("--timeout", type=int, default=600)
    args = parser.parse_args(argv)

    if args.install:
        try:
            exe = install()
        except (ScannerMissing, OSError) as exc:
            print(f"install FAILED: {exc}", file=sys.stderr)
            return 2
        print(f"installed: gitleaks {VERSION} -> {exe}")
        print(f"asset sha256: {ASSET_SHA256}")
        print(f"exe sha256: {EXE_SHA256}")
        return 0

    repo = Path(__file__).resolve().parents[1]
    if not (repo / "dist" / "index.html").is_file():
        print(
            "FAIL: dist/index.html missing; run `npm run build` first so the production "
            "bundle is scanned too",
            file=sys.stderr,
        )
        return 2

    result = run(repo, Path(args.report), timeout=args.timeout)
    scope = result["scope"]
    print(
        f"scanner: gitleaks {VERSION} (asset sha256 {ASSET_SHA256}, exe sha256 {EXE_SHA256})"
    )
    print(
        f"scope: {scope['files']} files, {scope['scanned_bytes']} bytes under {scope['root']} "
        "(untracked and gitignored files included; only .git and node_modules excluded)"
    )
    if result["error"]:
        print(f"FAIL: {result['error']}", file=sys.stderr)
        return 2
    if result["findings"]:
        print(f"result: {len(result['findings'])} findings (values redacted by the scanner)")
        for finding in result["findings"]:
            print(f"  {finding['rule']} {finding['file']}:{finding['line']}")
    else:
        print("result: no leaks found")
    if "report" in result:
        print(f"report: {result['report']}")
    return 0 if result["ok"] else (1 if result["findings"] else 2)


if __name__ == "__main__":
    raise SystemExit(main())
