#!/usr/bin/env python3
"""Run the Firebase CLI for the local emulator tests with a minimal, allowlisted environment.

``firebase-tools`` writes ``firebase-debug.log`` into the working directory on every run and, for
``emulators:exec``, dumps the complete child environment on one debug line. The Q5 scan found host
credentials on that line. Two layers now prevent a repeat:

1. Prevention. The CLI is spawned with an explicit allowlist of Windows/profile/runtime variables
   plus the variables these tests read. Everything else — including any credential the host shell
   happens to export — never reaches the CLI, the emulators, the test runner, or a log they write.
   This holds even when the process is killed before step 2 can run.
2. Defense in depth. After the CLI exits, any ``firebase-debug*.log`` left behind has its
   ``with environment {…}`` payload replaced with a placeholder, so a log written by some other
   path still cannot carry the payload. The rest of the log stays: a failed run keeps its
   diagnostic.

The wrapper also refuses anything that is not an emulator-only test run, so a live Firebase command
cannot borrow this environment policy (or silently run against a real project).

Usage: py -3 scripts/firebase_safe.py emulators:exec --project demo-<name> ... <vitest|playwright> ...
"""

from __future__ import annotations

import os
import re
import shutil
import subprocess
import sys
from collections.abc import Mapping
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
CLI = REPO_ROOT / "node_modules" / "firebase-tools" / "lib" / "bin" / "firebase.js"
LOG_GLOB = "firebase-debug*.log"
PLAYLOAD_REPLACEMENT = '{"<environment redacted by scripts/firebase_safe.py>"}'
# shortcut: assumes the environment dump stays on one log line (true for firebase-tools 15.36.0);
# upgrade to a JSON-aware scrub if a CLI upgrade pretty-prints it.
ENV_DUMP = re.compile(r"(with environment )\{[^\n]*\}(\r?)$", re.MULTILINE)

# Only `emulators:exec` runs here, and only the repo's test runners may be the executed script.
ALLOWED_COMMANDS = {"emulators:exec"}
TEST_RUNNERS = {"vitest", "playwright"}
# Anything that could reach a live backend or a real account is refused before the process starts.
LIVE_TOKENS = {
    "deploy",
    "login",
    "logout",
    "serve",
    "init",
    "use",
    "open",
    "emulators:start",
    "emulators:export",
    "emulators:import",
    "functions:secrets",
}
LIVE_PREFIXES = (
    "hosting:",
    "functions:",
    "firestore:",
    "database:",
    "storage:",
    "projects:",
    "apps:",
    "ext:",
    "target:",
    "appcheck",
    "auth:import",
    "auth:export",
    "--token",
    "--account",
    "--impersonate-service-account",
)

# Everything the CLI, Java (Firestore emulator), Node, npm and Playwright need on Windows for a
# local run, plus the variables these tests read (e2e/support.ts, src/firebase.ts). No credential
# name appears here, and nothing is inherited implicitly.
ALLOWED_VARS = frozenset(
    name.lower()
    for name in (
        # Windows process basics
        "SystemRoot",
        "windir",
        "SystemDrive",
        "ComSpec",
        "PATHEXT",
        "PATH",
        "OS",
        "COMPUTERNAME",
        "USERNAME",
        "USERDOMAIN",
        "LOGONSERVER",
        "NUMBER_OF_PROCESSORS",
        "PROCESSOR_ARCHITECTURE",
        "PROCESSOR_IDENTIFIER",
        "PROCESSOR_LEVEL",
        "PROCESSOR_REVISION",
        # profile and temp directories (Java temp, Playwright browser cache, emulator jar cache)
        "USERPROFILE",
        "HOMEDRIVE",
        "HOMEPATH",
        "HOME",
        "APPDATA",
        "LOCALAPPDATA",
        "TEMP",
        "TMP",
        "TMPDIR",
        "ProgramData",
        "ProgramFiles",
        "ProgramFiles(x86)",
        "CommonProgramFiles",
        "CommonProgramFiles(x86)",
        "ALLUSERSPROFILE",
        "PUBLIC",
        # runtimes and local caches
        "JAVA_HOME",
        "JDK_HOME",
        "FIREBASE_EMULATORS_PATH",
        "PLAYWRIGHT_BROWSERS_PATH",
        "CI",
        # read by this repository's tests
        "SHIFTRELAY_PROJECT_ID",
        "SHIFTRELAY_EMULATOR_HOST",
        "VITE_FIREBASE_PROJECT_ID",
        "VITE_EMULATOR_HOST",
    )
)


def child_env(source: Mapping[str, str]) -> dict[str, str]:
    """Return only the allowlisted variables from ``source``. Nothing is inherited implicitly."""
    return {name: value for name, value in source.items() if name.lower() in ALLOWED_VARS}


def check_command(args: list[str]) -> str | None:
    """Return a refusal reason, or ``None`` when ``args`` is an allowed emulator-only test run."""
    if not args:
        return "usage: py -3 scripts/firebase_safe.py emulators:exec --project demo-<name> ... <vitest|playwright> ..."
    if args[0] not in ALLOWED_COMMANDS:
        return (
            f"refused: {args[0]!r} is not allowed; this wrapper runs `emulators:exec` for the local "
            "test suites only (live deploy, auth and emulator-control commands must run outside it)"
        )
    if args[-1].startswith("-"):
        return "refused: the executed script must be the last argument"
    head = (args[-1].split() or [""])[0]
    if head not in TEST_RUNNERS:
        return f"refused: script {args[-1]!r} must start with one of {sorted(TEST_RUNNERS)}"
    for arg in args[1:]:
        for token in re.split(r"[\s&|;]+", arg):
            candidate = token.strip("'\"").lower()
            if candidate in LIVE_TOKENS or candidate.startswith(LIVE_PREFIXES):
                return (
                    f"refused: {token!r} could reach a live backend or account; only local emulator "
                    "test runs are allowed here"
                )
    project = None
    for index, arg in enumerate(args):
        if arg in ("-P", "--project") and index + 1 < len(args):
            project = args[index + 1]
        elif arg.startswith("--project="):
            project = arg.split("=", 1)[1]
    if not project:
        return "refused: pass --project demo-<name>; a missing project could resolve to a live one"
    if not project.startswith("demo-"):
        return f"refused: project {project!r} is not an emulator demo project (must start with 'demo-')"
    return None


def scrub(text: str) -> tuple[str, int]:
    """Replace environment payloads with a placeholder; return the text and replacement count."""
    count = 0

    def replace(match: re.Match[str]) -> str:
        nonlocal count
        count += 1
        return match.group(1) + PLAYLOAD_REPLACEMENT + match.group(2)

    return ENV_DUMP.sub(replace, text), count


def scrub_logs(root: Path) -> int:
    """Scrub every debug log the CLI left in ``root``. Returns the replacement count."""
    replacements = 0
    for log in sorted(root.glob(LOG_GLOB)):
        text = log.read_text(encoding="utf-8", errors="replace")
        cleaned, count = scrub(text)
        if count:
            staging = log.with_name(log.name + ".scrub")
            staging.write_text(cleaned, encoding="utf-8")
            staging.replace(log)
            replacements += count
    return replacements


def main(argv: list[str] | None = None) -> int:
    args = sys.argv[1:] if argv is None else argv
    reason = check_command(args)
    if reason:
        print(reason, file=sys.stderr)
        return 2
    if not CLI.is_file():
        print(f"FAIL: firebase CLI missing at {CLI}; run `npm ci`", file=sys.stderr)
        return 2
    node = shutil.which("node")
    if node is None:
        print("FAIL: `node` not found on PATH", file=sys.stderr)
        return 2
    try:
        return subprocess.run(
            [node, str(CLI), *args], cwd=str(REPO_ROOT), env=child_env(os.environ)
        ).returncode
    finally:
        scrubbed = scrub_logs(REPO_ROOT)
        if scrubbed:
            print(f"firebase debug log: {scrubbed} environment payload(s) redacted", file=sys.stderr)


if __name__ == "__main__":
    raise SystemExit(main())
