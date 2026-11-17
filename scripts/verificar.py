#!/usr/bin/env python3
"""ShiftRelay evidence verifier (Phase 4-5, manual slice).

Usage:
  py -3 scripts/verificar.py
  py -3 scripts/verificar.py --list
  py -3 scripts/verificar.py --report .git/opencode/evidence.json
  py -3 scripts/verificar.py --self-test

Adapted from the global workflow template. The check list is explicit and limited to what
this repository actually implements: typecheck, unit tests, Firestore Rules suites, tooling
tests, diagram checks, contract fixture, lint, production build, the emulator-backed Playwright
suite, the pinned Gitleaks credential scan and the production dependency audit.

`ok` means: no prerequisite blocker and every check exited 0. It is not a product,
accessibility, privacy or delivery claim; the unimplemented list names the remaining gaps.
`gate_c_eligible` additionally requires a real commit, a clean tree, an unchanged tree after
the checks, and no unimplemented scope item; an unborn HEAD is reported as `commit: "unborn"`.

Q5 is measured mechanically here: `secret-scan` runs the pinned Gitleaks runner over the whole
working tree plus `dist/`, and `dependency-audit` runs `npm audit --omit=dev --audit-level=high`.
Both must pass for `ok`. Neither is a product or delivery claim, and reviewer sign-off on the
redacted report remains a scope item.
"""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import os
import re
import shlex
import shutil
import subprocess
import sys
import time
from pathlib import Path

SCHEMA = 1
PHASE = 5
PY = ["py", "-3"] if os.name == "nt" and shutil.which("py") else [sys.executable]
NPM = ["npm"]

REQUIRED_FILES = [
    "package.json",
    "package-lock.json",
    "tsconfig.json",
    "vite.config.ts",
    "playwright.config.ts",
    "eslint.config.js",
    "index.html",
    "vitest.config.mts",
    "vitest.rules.config.mts",
    "firebase.json",
    "firestore.rules",
    "firestore.indexes.json",
    "src/domain.ts",
    "src/validation.ts",
    "src/tasks.ts",
    "src/firebase.ts",
    "src/session.ts",
    "src/main.tsx",
    "src/App.tsx",
    "src/PrivateDraft.tsx",
    "src/Handover.tsx",
    "src/localDraft.ts",
    "src/aiValidation.ts",
    "src/reconciliation.ts",
    "src/cloudReconcile.ts",
    "src/CloudReconciliation.tsx",
    "src/styles.css",
    "tests/fixtures/handover.ts",
    "tests/fixtures/contrato.json",
    "tests/validation.test.ts",
    "tests/transitions.test.ts",
    "tests/ai-output.test.ts",
    "tests/reconciliation.test.ts",
    "tests/rules/support.ts",
    "tests/rules/permissions.test.ts",
    "tests/rules/concurrency.test.ts",
    "tests/rules/publication.test.ts",
    "e2e/support.ts",
    "e2e/global-setup.ts",
    "e2e/handover.spec.ts",
    "e2e/conflicts.spec.ts",
    "e2e/offline.spec.ts",
    "e2e/accessibility.spec.ts",
    "e2e/privacy.spec.ts",
    "e2e/local-draft.spec.ts",
    "e2e/reconciliation.spec.ts",
    "tests/test_check_diagrams.py",
    "tests/test_verificar.py",
    "tests/test_scan_secrets.py",
    "tests/test_firebase_safe.py",
    "scripts/check_diagrams.py",
    "scripts/scan_secrets.py",
    "scripts/firebase_safe.py",
    "scripts/seed-emulator.mjs",
    "docs/ARCHITECTURE.md",
    "docs/INTERFACES.md",
    "docs/PLAN.md",
    "docs/spec.md",
    "docs/verification.md",
    "README.md",
    "LICENSE",
    "CONSTRAINTS.md",
]

FIXTURE_CHECK = (
    "import json,pathlib,sys;"
    "d=json.loads(pathlib.Path('tests/fixtures/contrato.json').read_text(encoding='utf-8'));"
    "keys=('schema','enums','limits','errors','transitions','idPattern','collections','localDraft','reconciliation');"
    "missing=[k for k in keys if k not in d];"
    "sys.exit(('missing: '+','.join(missing)) if missing else (0 if d['errors'] and d['transitions'] and d['localDraft']['errors'] and d['reconciliation']['errors'] else 3))"
)

CHECKS = [
    {"name": "typecheck", "command": [*NPM, "run", "typecheck"], "timeout": 300},
    {"name": "lint", "command": [*NPM, "run", "lint"], "timeout": 300},
    {"name": "build", "command": [*NPM, "run", "build"], "timeout": 300},
    # Scans the working tree plus the dist/ output this run just produced.
    {"name": "secret-scan", "command": [*NPM, "run", "scan:secrets"], "timeout": 900},
    {
        "name": "dependency-audit",
        "command": [*NPM, "audit", "--omit=dev", "--audit-level=high"],
        "timeout": 300,
    },
    {"name": "unit", "command": [*NPM, "run", "test:unit"], "timeout": 300},
    {
        "name": "ai-output",
        "command": [*NPM, "run", "test:unit", "--", "tests/ai-output.test.ts"],
        "timeout": 300,
    },
    {
        "name": "reconciliation",
        "command": [*NPM, "run", "test:unit", "--", "tests/reconciliation.test.ts"],
        "timeout": 300,
    },
    {"name": "rules-tests", "command": [*NPM, "run", "test:rules"], "timeout": 900},
    {"name": "e2e-tests", "command": [*NPM, "run", "test:e2e"], "timeout": 1800},
    {"name": "tools-tests", "command": [*NPM, "run", "test:tools"], "timeout": 600},
    {"name": "checker-self-test", "command": [*PY, "scripts/check_diagrams.py", "--self-test"], "timeout": 300},
    {"name": "diagrams", "command": [*PY, "scripts/check_diagrams.py", "docs"], "timeout": 600},
    {"name": "contract-fixture", "command": [*PY, "-c", FIXTURE_CHECK], "timeout": 120},
]

SCOPE = {
    "phase": PHASE,
    "name": "consented-cloud-reconciliation-slice3-emulator-and-tested-mock",
    "included": [check["name"] for check in CHECKS],
    "unimplemented": [
        "Q5 reviewer closure: the pinned Gitleaks scan (working tree + dist, no project allowlist) "
        "and the production dependency audit now run locally, but reviewer sign-off on the redacted "
        "report and on the pre-deploy public artifact set is still open",
        "genuine local model and hybrid runtime evidence: one localhost Chrome ON_DEVICE request "
        "now runs, but exact Nano 4 identity/provenance, hosted HTTPS, App Check and a separately "
        "consented real cloud comparison are still missing (AC13/Q6)",
        "live cloud reconciliation runtime: the ONLY_IN_CLOUD adapter and the explicit free-tier "
        "model gemini-3.5-flash-lite are implemented and the demo build reports notconfigured, but no "
        "live Firebase app/App Check configuration, real cloud request, quota, latency or model "
        "availability was measured; every cloud result in the suites is a labelled test mock",
        "manual accessibility: screen-reader announcements, 200% zoom and actual Android Chrome touch "
        "(automated axe serious/critical, keyboard and 320px checks only)",
        "live Firebase project, Hosting configuration, deployment and cloud provisioning",
        "AC15 representative-user product usefulness validation",
    ],
}


def now() -> str:
    return dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def run_command(command: list[str], cwd: Path, timeout: int) -> tuple[int, str, int]:
    started = time.monotonic()
    command_line = subprocess.list2cmdline(command) if os.name == "nt" else shlex.join(command)
    try:
        proc = subprocess.run(
            command_line,
            cwd=str(cwd),
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=timeout,
            shell=True,
        )
        output = (proc.stdout or "") + (proc.stderr or "")
        return proc.returncode, output, int((time.monotonic() - started) * 1000)
    except subprocess.TimeoutExpired as exc:
        partial = exc.stdout if isinstance(exc.stdout, str) else ""
        return 124, partial + f"\nTIMEOUT after {timeout}s", int((time.monotonic() - started) * 1000)
    except FileNotFoundError as exc:
        return 127, str(exc), int((time.monotonic() - started) * 1000)
    except Exception as exc:  # noqa: BLE001 - every failure must reach the evidence
        return 1, repr(exc), int((time.monotonic() - started) * 1000)


def git(args: list[str], cwd: Path) -> tuple[int, str]:
    code, out, _ = run_command(["git", *args], cwd, 60)
    return code, out


def run_check(name: str, command: list[str], cwd: Path, timeout: int) -> tuple[dict, str]:
    code, output, duration = run_command(command, cwd, timeout)
    record = {
        "name": name,
        "command": " ".join(command),
        "exit": code,
        "duration_ms": duration,
        "stdout_sha256": hashlib.sha256(output.encode("utf-8", errors="replace")).hexdigest(),
    }
    return record, output


def git_state(cwd: Path) -> dict:
    """Commit plus tree state. A failed git command is a problem, never a clean tree."""
    status_code, status_out = git(["status", "--porcelain"], cwd)
    commit_code, commit_out = git(["rev-parse", "--verify", "--quiet", "HEAD"], cwd)
    problems: list[str] = []
    if status_code != 0:
        problems.append(f"git status --porcelain failed (exit {status_code})")
    # Exit 1 with no output means HEAD does not exist yet (unborn repository). Any other
    # non-zero exit is unavailable metadata and must fail closed.
    if commit_code != 0 and not (commit_code == 1 and not commit_out.strip()):
        problems.append(f"git rev-parse HEAD failed (exit {commit_code})")
    commit = commit_out.strip() if commit_code == 0 and commit_out.strip() else "unborn"
    status = [line for line in status_out.splitlines() if line.strip()] if status_code == 0 else []
    return {
        "commit": commit,
        "dirty": bool(status) or commit == "unborn",
        "status": status,
        "ok": not problems,
        "problems": problems,
    }


def prerequisites(cwd: Path) -> list[str]:
    """Fail closed: missing tool, artifact or git metadata is a blocker, never a pass."""
    blockers: list[str] = []
    for tool in ("git", "node", "npm", "java"):
        if shutil.which(tool) is None:
            blockers.append(f"missing tool: {tool}")
    for name in REQUIRED_FILES:
        if not (cwd / name).is_file():
            blockers.append(f"missing required file: {name}")
    for package in (
        "typescript",
        "vitest",
        "vite",
        "react",
        "react-dom",
        "eslint",
        "firebase",
        "firebase-tools",
        "@firebase/rules-unit-testing",
        "@playwright/test",
        "@axe-core/playwright",
    ):
        if not (cwd / "node_modules" / package).is_dir():
            blockers.append(f"node_modules/{package} missing; run npm install")
    code, _ = git(["rev-parse", "--git-dir"], cwd)
    if code != 0:
        blockers.append("not a git repository: git metadata unavailable")
    return blockers


def project_mode(cwd: Path) -> str:
    state = cwd / "docs" / "_project.md"
    if state.exists():
        match = re.search(
            r"^\s*[-*]?\s*MODE\s*[:=]\s*(lite|full)\s*$", state.read_text(encoding="utf-8"), re.MULTILINE
        )
        if match:
            return match.group(1)
    return "unknown"


def build_evidence(
    cwd: Path,
    checks: list[dict],
    timeout: int,
    mode: str,
    scope: dict,
    blockers: list[str] | None = None,
) -> dict:
    started = now()
    state = git_state(cwd)
    blockers = list(blockers or [])
    if not state["ok"]:
        blockers.extend(f"git metadata: {problem}" for problem in state["problems"])
    results: list[dict] = []
    if not blockers:
        for check in checks:
            record, output = run_check(
                check["name"], list(check["command"]), cwd, int(check.get("timeout", timeout))
            )
            print(f"--- {check['name']} (exit {record['exit']}) ---")
            print(output.rstrip())
            print(f"CHECK {check['name']}: {'PASS' if record['exit'] == 0 else 'FAIL'}")
            results.append(record)
    else:
        for blocker in blockers:
            print(f"BLOCKER: {blocker}", file=sys.stderr)

    # A check may mutate the tree, so the pre-check state cannot be the reported one.
    # shortcut: compares commit and porcelain status only; a check that mutates and
    # restores byte-identically stays invisible. Upgrade with a full tree hash if checks
    # ever get repository write access.
    state_after = git_state(cwd) if state["ok"] else state
    tree_stable = (
        state["ok"]
        and state_after["ok"]
        and state["commit"] == state_after["commit"]
        and state["status"] == state_after["status"]
    )

    ok = not blockers and all(item["exit"] == 0 for item in results) and tree_stable
    gate_c_reasons: list[str] = []
    if not ok:
        gate_c_reasons.append("checks failed, blocked, or the tree changed during the run")
    if state_after["commit"] == "unborn":
        gate_c_reasons.append("unborn HEAD")
    if state_after["dirty"]:
        gate_c_reasons.append("dirty working tree")
    unimplemented = list(scope.get("unimplemented") or [])
    if unimplemented:
        gate_c_reasons.append(f"{len(unimplemented)} scope items unimplemented")
    return {
        "schema": SCHEMA,
        "project": cwd.name,
        "mode": mode,
        "phase": PHASE,
        "commit": state_after["commit"],
        "dirty": state_after["dirty"],
        "status": state_after["status"],
        "cwd": str(cwd),
        "started_at": started,
        "finished_at": now(),
        "scope": scope,
        "blockers": blockers,
        "checks": results,
        "state_after": state_after,
        "tree_stable": tree_stable,
        "gate_c_eligible": not gate_c_reasons,
        "gate_c_reasons": gate_c_reasons,
        "ok": ok,
    }


def self_test() -> int:
    with_tmp = Path.cwd()
    code, _, _ = run_command([sys.executable, "-c", "print('ok')"], with_tmp, 60)
    if code != 0:
        print("self-test FAIL: good command")
        return 1
    code, _, _ = run_command([sys.executable, "-c", "raise SystemExit(1)"], with_tmp, 60)
    if code == 0:
        print("self-test FAIL: bad command")
        return 1
    if project_mode(Path(__file__).resolve().parents[1]) not in ("lite", "full"):
        print("self-test FAIL: docs/_project.md MODE not readable")
        return 1
    for check in CHECKS:
        if not check["command"]:
            print(f"self-test FAIL: empty command for {check['name']}")
            return 1
    print("self-test OK")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--report", default=".git/opencode/evidence.json")
    parser.add_argument("--list", action="store_true")
    parser.add_argument("--only", action="append", default=[])
    parser.add_argument("--timeout", type=int, default=300)
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args(argv)

    if args.self_test:
        return self_test()

    if args.list:
        for check in CHECKS:
            print(f"{check['name']}: {' '.join(check['command'])}")
        return 0

    checks = CHECKS
    if args.only:
        wanted = set(args.only)
        checks = [check for check in CHECKS if check["name"] in wanted]
        unknown = wanted - {check["name"] for check in checks}
        if unknown:
            print(f"unknown checks: {', '.join(sorted(unknown))}", file=sys.stderr)
            return 1

    cwd = Path.cwd()
    blockers = prerequisites(cwd)
    data = build_evidence(cwd, checks, args.timeout, project_mode(cwd), SCOPE, blockers)

    report = Path(args.report)
    report.parent.mkdir(parents=True, exist_ok=True)
    report.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    print(f"evidence: {report}")
    print(f"scope: phase {data['phase']} {data['scope']['name']} (unimplemented work is listed)")
    outcomes = {record["name"]: record["exit"] for record in data["checks"]}

    def outcome(name: str) -> str:
        if name not in outcomes:
            return "not run in this invocation"
        return "PASS" if outcomes[name] == 0 else "FAIL"

    print(
        f"Q5 credential scan: {outcome('secret-scan')} "
        "(pinned Gitleaks over the working tree + dist, values redacted)"
    )
    print(
        f"Q5 dependency audit: {outcome('dependency-audit')} "
        "(npm audit --omit=dev --audit-level=high)"
    )
    if data["gate_c_eligible"]:
        print("GATE_C: ELIGIBLE (all checks, real commit, clean stable tree, no unimplemented scope)")
    else:
        print(f"GATE_C: NOT ELIGIBLE ({'; '.join(data['gate_c_reasons'])})")
    print(f"ok={data['ok']} commit={data['commit']} dirty={data['dirty']}")
    return 0 if data["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
