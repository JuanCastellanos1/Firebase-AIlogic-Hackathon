#!/usr/bin/env python3
"""Production artifact guard: refuse live values and test hooks in the built `dist/`.

The app resolves live configuration at runtime (dev runner environment for `live-local`, the
same-origin Hosting endpoint for `hostedQA`), so a built bundle needs no credential at all. Only the
public reCAPTCHA Enterprise site key may be embedded. This guard fails the build output closed if:

- a Firebase web API key literal appears (the Q5 rule, here as a build-output invariant),
- the App Check debug-token global or a QA password variable name appears,
- the labelled `test-network-mock` hook survived the production build,
- the outside-root private configuration path appears,
- `dist/index.html` is missing (nothing to guard is a failure, not a pass).

Findings name the rule and the file; the matched value is never printed.

Usage: py -3 scripts/check_dist.py [dist]
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

Reporter = tuple[str, str]

RULES: tuple[tuple[str, re.Pattern[str]], ...] = (
    # Google API keys used by Firebase web apps. Shape check only; no value is ever stored here.
    ("firebase-web-api-key", re.compile(r"AIza[0-9A-Za-z_-]{35}")),
    # A debug token is a UUID; the SDK's own property name is expected, a literal value is not.
    # Case-insensitive: a token pasted in upper case is the same credential.
    (
        "appcheck-debug-token-value",
        re.compile(
            r"\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b",
            re.IGNORECASE,
        ),
    ),
    ("test-network-mock-hook", re.compile(r"__shiftrelayTestCloud")),
    ("private-config-path", re.compile(r"shiftrelay-private|firebase-development\.env")),
    ("qa-credential-name", re.compile(r"SHIFTRELAY_QA_")),
)


def find_findings(dist: Path) -> list[Reporter]:
    """Return (rule, relative file) pairs for every match in the built output."""
    findings: list[Reporter] = []
    for path in sorted(dist.rglob("*")):
        if not path.is_file():
            continue
        text = path.read_bytes().decode("utf-8", errors="replace")
        relative = path.relative_to(dist).as_posix()
        for name, pattern in RULES:
            if pattern.search(text):
                findings.append((name, relative))
    return findings


def main(argv: list[str] | None = None) -> int:
    args = sys.argv[1:] if argv is None else argv
    dist = Path(args[0]) if args else Path("dist")
    if not (dist / "index.html").is_file():
        print(f"dist guard: FAIL - {dist / 'index.html'} is missing; build first", file=sys.stderr)
        return 2
    files = [path for path in dist.rglob("*") if path.is_file()]
    total = sum(path.stat().st_size for path in files)
    findings = find_findings(dist)
    if findings:
        for name, relative in findings:
            print(f"dist guard: FAIL - {name} in {relative}", file=sys.stderr)
        return 1
    print(f"dist guard: PASS - {len(files)} files, {total} bytes, 0 rules matched")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
