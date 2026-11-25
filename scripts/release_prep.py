#!/usr/bin/env python3
"""Reviewed release preparation: the public site-key build and the sealed deploy stage.

Both subcommands are local and print no configuration value. Neither calls Firebase or deploys.

- `build` reads only the public reCAPTCHA Enterprise site key from the outside-root private file
  and forwards it, alone, into a minimal child environment. The Firebase API key, the App Check
  debug token and the QA passwords never enter a build. The artifact is then checked by
  `scripts/check_dist.py`, the pinned Gitleaks runner and `npm audit --omit=dev --audit-level=high`
  before anyone stages it.
- `stage` copies only the built public assets plus the reviewed Rules, indexes and Hosting config
  into a temporary directory outside the repository, and prints the exact `firebase deploy`
  commands for the delegated release agent. It refuses unless the verifier evidence describes
  HEAD with `ok=true`, `dirty=false` and a stable tree, the working tree is clean, and the project
  is `shiftrelay-hybridai-2026`. No credential is put on argv.

Usage:
  py -3 scripts/release_prep.py build [--file PATH]
  py -3 scripts/release_prep.py stage [--project ID] [--evidence PATH] [--stage PATH]
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import tempfile
from collections.abc import Callable, Mapping
from pathlib import Path

import dev_live_local as runner
import scan_secrets
import verificar

REPO_ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = Path(__file__).resolve().parent
SITE_KEY_NAME = "VITE_FIREBASE_APPCHECK_SITE_KEY"
DEPLOY_PROJECT = "shiftrelay-hybridai-2026"
# The verifier's own CHECKS names, imported (a module import runs no check). The release gate must
# see every one of them exactly once, so a partial `--only` run can never authorize a deploy.
REQUIRED_CHECK_NAMES = tuple(check["name"] for check in verificar.CHECKS)
# Gitleaks' generic rule, the only rule a public identifier may be classified under.
PUBLIC_IDENTIFIER_RULE = "generic-api-key"
# The only replacement the isolated proof copy may carry. Low entropy on purpose: the pinned
# scanner must not report it, and the real artifact is never touched.
PUBLIC_SCAN_MARKER = b"PUBLIC_TEST_MARKER_NOT_A_CREDENTIAL"
QUOTE_CHARS = ('"', "'", "`")
# Every name the private file may hold that a production build must never see.
LIVE_ONLY_NAMES = frozenset(runner.ALLOWED_NAMES) - {SITE_KEY_NAME}
DEPLOY_FILES = ("firestore.rules", "firestore.indexes.json", "firebase.json")

ConfigError = runner.ConfigError
check_private_path = runner.check_private_path
Runner = Callable[..., "tuple[int, str]"]


def site_key(text: str) -> str:
    """The one public value a hosted build needs, validated by shape. Never logged."""
    value = runner.parse_env_text(text).get(SITE_KEY_NAME, "").strip()
    if value == "":
        raise ConfigError(f"the private file has no value for {SITE_KEY_NAME}")
    if not value.startswith("6L"):
        raise ConfigError(f"{SITE_KEY_NAME} is not a reCAPTCHA site key")
    return value


def build_env(host: Mapping[str, str], key: str) -> dict[str, str]:
    """Windows/runtime allowlist plus the public site key. Nothing else is inherited."""
    env = runner.child_env(host, {SITE_KEY_NAME: key})
    leaked = sorted(LIVE_ONLY_NAMES.intersection(env))
    if leaked:
        raise ConfigError("refusing a build with live-only names: " + ", ".join(leaked))
    return env


def run_process(command: list[str], cwd: Path, env: Mapping[str, str], timeout: int = 1800) -> tuple[int, str]:
    """Run one child with an explicit environment. Values never appear in argv."""
    line = subprocess.list2cmdline([str(part) for part in command])
    try:
        proc = subprocess.run(
            line,
            cwd=str(cwd),
            env=dict(env),
            shell=True,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=timeout,
        )
    except subprocess.TimeoutExpired:
        return 124, f"TIMEOUT after {timeout}s"
    return proc.returncode, (proc.stdout or "") + (proc.stderr or "")


def artifact_steps() -> tuple[tuple[str, Callable[..., list[str]]], ...]:
    """The pre-deployment gates, in order, over the artifact the build just wrote."""
    return (
        ("dist-guard", lambda dist: [sys.executable, str(SCRIPTS / "check_dist.py"), str(dist)]),
        ("secret-scan", lambda dist: [sys.executable, str(SCRIPTS / "scan_secrets.py")]),
        (
            "dependency-audit",
            lambda dist: [shutil.which("npm") or "npm", "audit", "--omit=dev", "--audit-level=high"],
        ),
    )


def tail(output: str, lines: int = 12) -> str:
    return "\n".join(output.strip().splitlines()[-lines:])


def verify_artifact(
    dist: Path,
    repo_root: Path,
    run: Runner,
    env: Mapping[str, str] | None = None,
    site_key_value: str | None = None,
    scan: Callable[[Path], dict] | None = None,
) -> int:
    child = runner.child_env(os.environ, {}) if env is None else env
    for name, step in artifact_steps():
        if name == "secret-scan" and site_key_value is not None:
            code, message = classify_scan(repo_root, site_key_value, scan or scan_secrets.run)
            if code == 0:
                print(f"release prep: secret-scan PASS - {message}")
                continue
            print(f"release prep: FAIL - secret-scan: {message}", file=sys.stderr)
            return 1
        code, output = run(step(dist=dist), repo_root, child)
        if code != 0:
            print(f"release prep: FAIL - {name} (exit {code})", file=sys.stderr)
            print(tail(output), file=sys.stderr)
            return 1
        print(f"release prep: {name} PASS")
    return 0


def public_literal_spans(root: Path, key: str) -> list[tuple[Path, int, int]]:
    """Every exact quoted ``<key>`` literal in ``root``, as byte spans. Nothing else matches."""
    tokens = [f"{quote}{key}{quote}".encode() for quote in QUOTE_CHARS]
    spans: list[tuple[Path, int, int]] = []
    for path in sorted(root.rglob("*")):
        if not path.is_file():
            continue
        data = path.read_bytes()
        for token in tokens:
            start = data.find(token)
            while start != -1:
                spans.append((path, start, start + len(token)))
                start = data.find(token, start + 1)
    return spans


def differs_only_at(dist: Path, clone: Path, relative: Path, start: int, end: int) -> bool:
    """The clone equals ``dist`` byte for byte except the one replaced literal span."""
    original = (dist / relative).read_bytes()
    if (clone / relative).read_bytes() != original[:start] + PUBLIC_SCAN_MARKER + original[end:]:
        return False
    files = [path.relative_to(dist) for path in dist.rglob("*") if path.is_file()]
    if set(files) != {path.relative_to(clone) for path in clone.rglob("*") if path.is_file()}:
        return False
    return all(
        item == relative or (clone / item).read_bytes() == (dist / item).read_bytes()
        for item in files
    )


def rescan_without_public_literal(
    dist: Path, relative: Path, start: int, end: int, scan: Callable[[Path], dict], repo_root: Path
) -> tuple[int, str]:
    """Prove the single finding is the public literal by re-scanning an isolated copy.

    Only the exact quoted literal is replaced, in a copy; `dist/` itself is never written. A
    genuine secret on the same reported line survives the replacement and stays a finding.
    """
    scratch = Path(tempfile.mkdtemp(prefix="public-site-key-rescan-"))
    try:
        if scratch.resolve().is_relative_to(Path(repo_root).resolve()):
            return 1, "the isolated proof copy would land inside the repository"
        clone = scratch / "dist"
        shutil.copytree(dist, clone)
        original = (dist / relative).read_bytes()
        (clone / relative).write_bytes(original[:start] + PUBLIC_SCAN_MARKER + original[end:])
        if not differs_only_at(dist, clone, relative, start, end):
            return 1, "the isolated copy is not dist with only the public literal replaced"
        result = scan(clone)
        if result.get("error"):
            return 1, f"the isolated re-scan failed: {result['error']}"
        residual = result.get("findings") or []
        if residual or result.get("ok") is not True:
            return 1, (
                f"{len(residual)} residual finding(s) remain after replacing only the exact quoted "
                "public-site-key literal; the reported finding is not proven public"
            )
        return 0, "an isolated copy with only that exact literal replaced re-scanned with 0 findings"
    finally:
        shutil.rmtree(scratch, ignore_errors=True)


def classify_scan(repo_root: Path, key: str, scan: Callable[[Path], dict]) -> tuple[int, str]:
    """Accept exactly one finding: the public site key the build itself inserted.

    The scanner is unchanged (no ignore file, no project config, no allowlist, no weaker
    redaction). Exactly one `generic-api-key` finding inside `dist/` must match exactly one
    quoted literal equal to the approved public site key, in the reported file; replacing only
    that literal in an isolated byte-identical copy must leave zero findings. A genuine secret
    that merely shares the reported line survives the replacement and fails. Nothing is printed.
    """
    repo_root = Path(repo_root)
    result = scan(repo_root)
    if result.get("error"):
        return 1, f"scanner error: {result['error']}"
    findings = result.get("findings") or []
    if len(findings) != 1:
        return 1, (
            f"{len(findings)} findings; the keyed build must show exactly one public-site-key "
            "finding"
        )
    finding = findings[0]
    if finding.get("rule") != PUBLIC_IDENTIFIER_RULE:
        return 1, f"finding rule {finding.get('rule')!r} is not a public identifier"
    reported = Path(str(finding.get("file", "")))
    if not reported.is_absolute():
        reported = repo_root / reported
    dist = (repo_root / "dist").resolve()
    try:
        relative = reported.resolve().relative_to(dist)
    except (ValueError, OSError):
        return 1, "the finding is not inside the built dist/"
    try:
        spans = public_literal_spans(dist, key)
    except OSError:
        return 1, "the built dist/ could not be read for the public-site-key proof"
    if len(spans) != 1:
        return 1, (
            f"{len(spans)} exact quoted public-site-key literals in dist; exactly one is required"
        )
    literal_file, start, end = spans[0]
    if literal_file.relative_to(dist) != relative:
        return 1, "the single exact public-site-key literal is not in the reported finding file"
    try:
        code, residual = rescan_without_public_literal(dist, relative, start, end, scan, repo_root)
    except OSError:
        return 1, "the isolated public-site-key proof could not read the artifact"
    if code != 0:
        return 1, residual
    return 0, (
        f"1 classified finding: gitleaks {PUBLIC_IDENTIFIER_RULE} at dist/{relative.as_posix()}:"
        f"{finding.get('line')} matched only the exact quoted public reCAPTCHA Enterprise site key "
        f"literal (public by design, not a credential); {residual}; scanner unchanged, no allowlist"
    )


def build_artifact(
    private_file: Path | str | None = None,
    repo_root: Path = REPO_ROOT,
    run: Runner = run_process,
    environ: Mapping[str, str] | None = None,
    scan: Callable[[Path], dict] | None = None,
) -> int:
    private = Path(private_file) if private_file else runner.default_private_file()
    try:
        runner.check_private_path(private, repo_root)
        if not private.is_file():
            raise ConfigError(f"private file not found: {private}")
        key = site_key(private.read_text(encoding="utf-8"))
        env = build_env(dict(os.environ if environ is None else environ), key)
    except ConfigError as error:
        print(f"refused: {error}", file=sys.stderr)
        return 2
    if not runner.VITE_BIN.is_file():
        print(f"refused: vite is missing at {runner.VITE_BIN}; run `npm ci`", file=sys.stderr)
        return 2
    node = shutil.which("node")
    if node is None:
        print("refused: `node` not found on PATH", file=sys.stderr)
        return 2
    print(
        "release prep: hosted build with the public reCAPTCHA Enterprise site key "
        "(value not printed; no API key, debug token or QA password in the build)"
    )
    code, output = run([node, str(runner.VITE_BIN), "build"], repo_root, env)
    if code != 0:
        print(f"release prep: FAIL - vite build (exit {code})", file=sys.stderr)
        print(tail(output), file=sys.stderr)
        return 1
    print(tail(output, lines=3))
    return verify_artifact(
        repo_root / "dist", repo_root, run, env, site_key_value=key, scan=scan
    )


def require_outside(path: Path, repo_root: Path) -> None:
    """A stage inside the repository would re-enter the Q5 scan and the git tree."""
    try:
        path.resolve().relative_to(repo_root.resolve())
    except ValueError:
        return
    raise ConfigError(f"the stage directory must be outside {repo_root.name}")


def git(repo_root: Path, args: list[str], run: Runner) -> tuple[int, str]:
    return run(["git", *args], repo_root, runner.child_env(os.environ, {}))


def check_evidence(evidence: Path, repo_root: Path, head: str) -> None:
    if not evidence.is_file():
        raise ConfigError(f"verifier evidence not found: {evidence}")
    try:
        data = json.loads(evidence.read_text(encoding="utf-8"))
    except ValueError as error:
        raise ConfigError(f"verifier evidence is not valid JSON: {error}") from error
    if not isinstance(data, dict):
        raise ConfigError("verifier evidence is not an object")
    if data.get("ok") is not True:
        raise ConfigError("verifier evidence is not ok; re-run scripts/verificar.py")
    if data.get("dirty") is not False:
        raise ConfigError("verifier evidence was produced on a dirty tree, not a reviewed commit")
    if data.get("tree_stable") is not True:
        raise ConfigError("verifier evidence did not certify a stable tree")
    if str(data.get("commit", "")) != head:
        raise ConfigError("verifier evidence does not describe the current commit")
    if Path(str(data.get("cwd", ""))).resolve() != repo_root.resolve():
        raise ConfigError("verifier evidence was produced in a different repository")
    records = data.get("checks")
    if not isinstance(records, list) or not all(isinstance(item, dict) for item in records):
        raise ConfigError("verifier evidence has malformed check records")
    names = [str(item.get("name")) for item in records]
    missing = [name for name in REQUIRED_CHECK_NAMES if name not in names]
    unexpected = [name for name in names if name not in REQUIRED_CHECK_NAMES]
    duplicates = sorted({name for name in names if names.count(name) > 1})
    failed = [name for name, item in zip(names, records) if item.get("exit") != 0]
    if missing or unexpected or duplicates or failed:
        problems = []
        if missing:
            problems.append("missing " + ", ".join(missing))
        if unexpected:
            problems.append("unexpected " + ", ".join(unexpected))
        if duplicates:
            problems.append("duplicated " + ", ".join(duplicates))
        if failed:
            problems.append("failing " + ", ".join(failed))
        raise ConfigError(
            f"verifier evidence does not record the current check list ({'; '.join(problems)}); "
            "re-run the full scripts/verificar.py"
        )


def stage_release(
    repo_root: Path = REPO_ROOT,
    evidence_path: Path | str | None = None,
    stage_dir: Path | str | None = None,
    project: str = DEPLOY_PROJECT,
    run: Runner = run_process,
) -> int:
    try:
        return _stage(repo_root, evidence_path, stage_dir, project, run)
    except ConfigError as error:
        print(f"refused: {error}", file=sys.stderr)
        return 2


def _stage(
    repo_root: Path,
    evidence_path: Path | str | None,
    stage_dir: Path | str | None,
    project: str,
    run: Runner,
) -> int:
    repo = Path(repo_root).resolve()
    if project != DEPLOY_PROJECT:
        raise ConfigError(f"project {project!r} is not the reviewed release project")
    stage = Path(stage_dir) if stage_dir else Path(tempfile.gettempdir()) / "shiftrelay-stage"
    require_outside(stage, repo)
    missing = [name for name in DEPLOY_FILES if not (repo / name).is_file()]
    if not (repo / "dist" / "index.html").is_file():
        missing.insert(0, "dist/index.html")
    if missing:
        raise ConfigError("missing deploy input: " + ", ".join(missing))
    code, head = git(repo, ["rev-parse", "HEAD"], run)
    head = head.strip()
    if code != 0 or head == "":
        raise ConfigError("git HEAD is unavailable")
    code, status = git(repo, ["status", "--porcelain"], run)
    if code != 0:
        raise ConfigError("git status failed")
    if status.strip():
        raise ConfigError("the working tree is not clean; commit the reviewed changes first")
    check_evidence(Path(evidence_path) if evidence_path else repo / ".git" / "opencode" / "evidence.json", repo, head)
    if stage.exists() and any(stage.iterdir()):
        raise ConfigError(f"the stage directory is not empty: {stage}")
    stage.mkdir(parents=True, exist_ok=True)
    shutil.copytree(repo / "dist", stage / "dist")
    for name in DEPLOY_FILES:
        shutil.copy2(repo / name, stage / name)
    assets = sum(1 for path in (stage / "dist").rglob("*") if path.is_file())
    if assets != sum(1 for path in (repo / "dist").rglob("*") if path.is_file()):
        raise ConfigError("the copied public asset count does not match dist")

    print(f"release stage: {stage}")
    print(f"project: {DEPLOY_PROJECT}")
    print(f"source commit: {head}")
    print(f"contents: {assets} public assets + {', '.join(DEPLOY_FILES)}")
    print("next (delegated release agent, minimal child environment, no token on argv):")
    print(f'  cd "{stage}"')
    print(f"  firebase deploy --only firestore:rules,firestore:indexes --project {DEPLOY_PROJECT}")
    print(f"  firebase deploy --only hosting --project {DEPLOY_PROJECT}")
    print("Nothing was deployed by this command.")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Reviewed release preparation; no deployment.")
    sub = parser.add_subparsers(dest="command", required=True)
    build = sub.add_parser("build", help="build dist with only the public reCAPTCHA site key")
    build.add_argument("--file", default=None)
    stage = sub.add_parser("stage", help="copy the reviewed deploy set to a sealed directory")
    stage.add_argument("--project", default=DEPLOY_PROJECT)
    stage.add_argument("--evidence", default=None)
    stage.add_argument("--stage", default=None)
    args = parser.parse_args(argv)
    if args.command == "build":
        return build_artifact(args.file)
    return stage_release(evidence_path=args.evidence, stage_dir=args.stage, project=args.project)


if __name__ == "__main__":
    raise SystemExit(main())
