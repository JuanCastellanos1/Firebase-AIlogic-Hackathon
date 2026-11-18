#!/usr/bin/env python3
"""Start the Vite dev server in `live-local` mode from the outside-root private configuration.

This is the only path that gives a local page the real Firebase project. It exists because the live
values must never be source, a build, argv or a log:

- The private file is read (not copied) from outside the repository and never written back.
- Only the allowlisted names below are forwarded, and only as the child process environment. Values
  never appear in argv, on stdout/stderr or in an environment dump this script prints.
- The child environment is rebuilt from a Windows/runtime allowlist plus those names, so unrelated
  host credentials (Firebase CLI tokens, service-account paths, QA passwords) never reach Vite.
- The server binds 127.0.0.1 with a strict port; `vite.config.ts` sends no CORS headers.
- Any missing, blank or mismatched value is a hard failure that names the variable, never a value.

Usage: py -3 scripts/dev_live_local.py [--file PATH] [--port 5173]
"""

from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
from collections.abc import Mapping
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
VITE_BIN = REPO_ROOT / "node_modules" / "vite" / "bin" / "vite.js"
LIVE_PROJECT_ID = "shiftrelay-hybridai-2026"
LIVE_APP_ID = "1:1013230596333:web:a0b89365ee59732eb85ce4"

# The public configuration plus the secret localhost-only App Check debug token. `APP_ID` is not
# required: the private file keeps the public app id commented out, so src/runtimeConfig.ts
# defaults it to the documented id.
REQUIRED_NAMES = (
    "VITE_FIREBASE_API_KEY",
    "VITE_FIREBASE_AUTH_DOMAIN",
    "VITE_FIREBASE_PROJECT_ID",
    "VITE_FIREBASE_MESSAGING_SENDER_ID",
    "VITE_FIREBASE_APPCHECK_SITE_KEY",
    "VITE_FIREBASE_APPCHECK_DEBUG_TOKEN",
)
ALLOWED_NAMES = frozenset((*REQUIRED_NAMES, "VITE_FIREBASE_APP_ID"))

# Windows/runtime basics Vite and Node need. No credential name appears here.
BASE_ENV_ALLOWLIST = frozenset(
    name.lower()
    for name in (
        "PATH",
        "PATHEXT",
        "ComSpec",
        "SystemRoot",
        "windir",
        "SystemDrive",
        "OS",
        "COMPUTERNAME",
        "USERNAME",
        "USERDOMAIN",
        "NUMBER_OF_PROCESSORS",
        "PROCESSOR_ARCHITECTURE",
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
    )
)


class ConfigError(Exception):
    """A refusal. The message names a variable or a path, never a configuration value."""


def parse_env_text(text: str) -> dict[str, str]:
    """Read the allowlisted `NAME=value` entries from the private file.

    The live block in the approved private file is still commented out by default (the guarded demo
    build must not use it), so an allowlisted name is accepted whether its line is active or prefixed
    with `#`. Prose comments and any other variable name are skipped, never executed or expanded.
    """
    values: dict[str, str] = {}
    for number, raw in enumerate(text.splitlines(), start=1):
        line = raw.strip()
        if line == "":
            continue
        commented = line.startswith("#")
        body = line.lstrip("#").strip() if commented else line
        if body == "":
            continue
        if "=" not in body:
            if commented:
                continue
            raise ConfigError(f"private file line {number} is not a NAME=value assignment")
        name, _, value = body.partition("=")
        name = name.strip()
        if name not in ALLOWED_NAMES:
            continue
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in "'\"":
            value = value[1:-1]
        if name in values:
            raise ConfigError(f"private file defines {name} more than once")
        values[name] = value
    return values


def check_private_path(path: Path, root: Path) -> None:
    """Refuse a private file that lives inside the repository (it would re-enter the Q5 scan)."""
    resolved = path.resolve()
    try:
        resolved.relative_to(root.resolve())
    except ValueError:
        return
    raise ConfigError(f"{path.name} is inside the repository; keep the private file outside {root.name}")


def validate_live_config(values: Mapping[str, str]) -> dict[str, str]:
    """Validate the allowlisted live values and return the child environment additions."""
    missing = [name for name in REQUIRED_NAMES if values.get(name, "").strip() == ""]
    if missing:
        raise ConfigError(
            "the private file is missing a required value for: " + ", ".join(sorted(missing))
        )
    if values["VITE_FIREBASE_PROJECT_ID"] != LIVE_PROJECT_ID:
        raise ConfigError("VITE_FIREBASE_PROJECT_ID is not the approved project")
    if values.get("VITE_FIREBASE_APP_ID", LIVE_APP_ID) != LIVE_APP_ID:
        raise ConfigError("VITE_FIREBASE_APP_ID is not the approved web app")
    if not values["VITE_FIREBASE_API_KEY"].startswith("AIza"):
        raise ConfigError("VITE_FIREBASE_API_KEY is not a Firebase web API key")
    if not values["VITE_FIREBASE_APPCHECK_SITE_KEY"].startswith("6L"):
        raise ConfigError("VITE_FIREBASE_APPCHECK_SITE_KEY is not a reCAPTCHA site key")
    live = {name: values[name] for name in REQUIRED_NAMES}
    if "VITE_FIREBASE_APP_ID" in values:
        live["VITE_FIREBASE_APP_ID"] = values["VITE_FIREBASE_APP_ID"]
    live["VITE_FIREBASE_LIVE_LOCAL"] = "1"
    return live


def child_env(host: Mapping[str, str], live: Mapping[str, str]) -> dict[str, str]:
    """Only the Windows/runtime allowlist plus the live names. Nothing else is inherited."""
    env = {name: value for name, value in host.items() if name.lower() in BASE_ENV_ALLOWLIST}
    env.update(live)
    return env


def banner(live: Mapping[str, str], port: int) -> str:
    """Human status line: mode, host, port and public project id only."""
    return (
        f"live-local dev server: http://127.0.0.1:{port} "
        f"(project {live['VITE_FIREBASE_PROJECT_ID']}, App Check debug provider; "
        "values read from the outside-root private file and never printed)"
    )


def default_private_file() -> Path:
    local = os.environ.get("LOCALAPPDATA", "")
    return Path(local) / "Temp" / "opencode" / "shiftrelay-private" / "firebase-development.env"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--file", default=None)
    parser.add_argument("--port", type=int, default=5173)
    args = parser.parse_args(argv)
    private = Path(args.file) if args.file else default_private_file()
    try:
        check_private_path(private, REPO_ROOT)
        if not private.is_file():
            raise ConfigError(f"private file not found: {private}")
        values = parse_env_text(private.read_text(encoding="utf-8"))
        live = validate_live_config(values)
    except ConfigError as error:
        print(f"refused: {error}", file=sys.stderr)
        return 2
    if not VITE_BIN.is_file():
        print(f"refused: vite is missing at {VITE_BIN}; run `npm ci`", file=sys.stderr)
        return 2
    node = shutil.which("node")
    if node is None:
        print("refused: `node` not found on PATH", file=sys.stderr)
        return 2
    print(banner(live, args.port))
    try:
        return subprocess.run(
            [node, str(VITE_BIN), "--host", "127.0.0.1", "--port", str(args.port), "--strictPort"],
            cwd=str(REPO_ROOT),
            env=child_env(os.environ, live),
        ).returncode
    except KeyboardInterrupt:
        return 130


if __name__ == "__main__":
    raise SystemExit(main())
