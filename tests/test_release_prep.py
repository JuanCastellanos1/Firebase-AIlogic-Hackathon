"""Regression tests for scripts/release_prep.py and the Hosting deploy configuration.

Two things are proven here without any cloud call:

- `build` forwards only the public reCAPTCHA Enterprise site key into the child build
  environment, never the API key, debug token or a QA password, and never on argv;
- `stage` copies only the reviewed deploy set, and refuses a dirty tree, missing or mismatched
  verifier evidence, an unknown project or a stage inside the repository.

Every synthetic value is assembled at run time, so the repository stores no credential-shaped
literal. Nothing here reads, prints or writes the real private file.
"""

from __future__ import annotations

import hashlib
import io
import json
import subprocess
import sys
import tempfile
import unittest
from contextlib import redirect_stderr, redirect_stdout
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "scripts"))

import release_prep as prep
import scan_secrets
import verificar

# High-entropy shapes computed at import time: the repository stores no credential-shaped
# literal, so the pinned scanner never sees one in this file or its bytecode cache.
SITE_KEY = "6L" + hashlib.sha256(b"shiftrelay-synthetic-public-site-key").hexdigest()[:38]
GENERIC_SECRET = "".join(("kq3", "Zr9Wt2Yb7Nm4", "Xc8Lv1Pd6aQ5"))
API_KEY = "AIza" + ("S1n2T3h4E5t6I7c8K9e0y1V2a3L4u5E6" * 2)[:35]
DEBUG_TOKEN = "11111111-2222-4333-8444-555555555555"
QA_PASSWORD = "synthetic-qa-password-not-a-secret"
SECRETS = (API_KEY, DEBUG_TOKEN, QA_PASSWORD)


def bundle_with_site_key(key: str = SITE_KEY) -> str:
    """A minified line in the shape the reviewed build writes: the public key in one literal."""
    return f'const e={{"VITE_FIREBASE_APPCHECK_SITE_KEY":"{key}"}};'


def private_text() -> str:
    """A private file with every name: the build may read one of them."""
    return "\n".join(
        (
            "# synthetic private file",
            f"# VITE_FIREBASE_API_KEY={API_KEY}",
            f"# VITE_FIREBASE_APPCHECK_DEBUG_TOKEN={DEBUG_TOKEN}",
            f"# SHIFTRELAY_QA_OUTGOING_PASSWORD={QA_PASSWORD}",
            f"# {prep.SITE_KEY_NAME}={SITE_KEY}",
            "",
        )
    )


def run_git(repo: Path, *args: str) -> str:
    completed = subprocess.run(
        ["git", *args], cwd=repo, check=True, capture_output=True, text=True
    )
    return completed.stdout.strip()


def make_repo(root: Path, bundle: str = "const a = 1;") -> Path:
    repo = root / "repo"
    (repo / "dist" / "assets").mkdir(parents=True)
    (repo / "dist" / "index.html").write_text("<html></html>", encoding="utf-8")
    (repo / "dist" / "assets" / "app.js").write_text(bundle, encoding="utf-8")
    (repo / "firestore.rules").write_text("rules_version = '2';\n", encoding="utf-8")
    (repo / "firestore.indexes.json").write_text('{"indexes": []}\n', encoding="utf-8")
    (repo / "firebase.json").write_text('{"hosting": {"public": "dist"}}\n', encoding="utf-8")
    (repo / "notes.txt").write_text("reviewed notes, not deployed\n", encoding="utf-8")
    run_git(repo, "init", "-q", "-b", "main")
    run_git(repo, "config", "user.email", "demo@example.invalid")
    run_git(repo, "config", "user.name", "Demo")
    run_git(repo, "add", "-A")
    run_git(repo, "commit", "-qm", "baseline")
    return repo


def head(repo: Path) -> str:
    return run_git(repo, "rev-parse", "HEAD")


def write_evidence(repo: Path, path: Path, **overrides: object) -> Path:
    data: dict = {
        "ok": True,
        "commit": head(repo),
        "dirty": False,
        "tree_stable": True,
        "cwd": str(repo.resolve()),
        "checks": [{"name": name, "exit": 0} for name in prep.REQUIRED_CHECK_NAMES],
    }
    data.update(overrides)
    path.write_text(json.dumps(data), encoding="utf-8")
    return path


class SiteKeyTests(unittest.TestCase):
    def test_reads_the_public_site_key_from_a_commented_block(self) -> None:
        self.assertEqual(prep.site_key(private_text()), SITE_KEY)

    def test_missing_or_wrong_site_key_fails_closed_without_echoing_values(self) -> None:
        cases = (
            private_text().replace(f"# {prep.SITE_KEY_NAME}={SITE_KEY}", ""),
            private_text().replace(SITE_KEY, "not-a-site-key"),
        )
        for text in cases:
            with self.assertRaises(prep.ConfigError) as caught:
                prep.site_key(text)
            message = str(caught.exception)
            for secret in SECRETS:
                self.assertNotIn(secret, message)

    def test_private_file_inside_the_repository_is_refused(self) -> None:
        with self.assertRaises(prep.ConfigError):
            prep.check_private_path(REPO_ROOT / "firebase-development.env", REPO_ROOT)


class BuildEnvironmentTests(unittest.TestCase):
    def test_child_environment_carries_only_the_public_site_key(self) -> None:
        host = {
            "PATH": "C:\\Windows",
            "SystemRoot": "C:\\Windows",
            "GOOGLE_APPLICATION_CREDENTIALS": "C:\\creds.json",
            "FIREBASE_TOKEN": "host-token",
            "SHIFTRELAY_QA_OUTGOING_PASSWORD": QA_PASSWORD,
        }
        env = prep.build_env(host, SITE_KEY)
        self.assertEqual(env[prep.SITE_KEY_NAME], SITE_KEY)
        self.assertEqual(env["PATH"], "C:\\Windows")
        for name in ("GOOGLE_APPLICATION_CREDENTIALS", "FIREBASE_TOKEN", "SHIFTRELAY_QA_OUTGOING_PASSWORD"):
            self.assertNotIn(name, env)
        for name in prep.LIVE_ONLY_NAMES:
            self.assertNotIn(name, env)
        self.assertNotIn("VITE_FIREBASE_LIVE_LOCAL", env)

    def test_build_never_puts_a_value_on_argv_or_the_wrong_names_in_env(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            repo = make_repo(root, bundle_with_site_key())
            private = root / "firebase-development.env"
            private.write_text(private_text(), encoding="utf-8")
            calls: list[tuple[list[str], dict[str, str]]] = []
            scans: list[Path] = []
            bundle = repo / "dist" / "assets" / "app.js"

            def fake_run(command, cwd, env, timeout=1800):
                calls.append(([str(part) for part in command], dict(env)))
                return 0, "built"

            def fake_scan(scan_root):
                scans.append(Path(scan_root))
                if Path(scan_root).resolve() == repo.resolve():
                    finding = {"rule": prep.PUBLIC_IDENTIFIER_RULE, "file": str(bundle), "line": 1}
                    return {"findings": [finding], "ok": False, "error": None}
                return {"findings": [], "ok": True, "error": None}

            code = prep.build_artifact(
                private_file=private,
                repo_root=repo,
                run=fake_run,
                environ={"PATH": "C:\\Windows"},
                scan=fake_scan,
            )
        self.assertEqual(code, 0, calls)
        build_command, build_child_env = calls[0]
        self.assertIn("build", build_command)
        for secret in SECRETS:
            self.assertNotIn(secret, " ".join(build_command))
        self.assertEqual(build_child_env[prep.SITE_KEY_NAME], SITE_KEY)
        for name in prep.LIVE_ONLY_NAMES:
            self.assertNotIn(name, build_child_env)
        self.assertEqual(len(calls), 3)
        self.assertEqual(len(scans), 2)
        self.assertNotEqual(scans[1].resolve(), repo.resolve())
        checks = " ".join(" ".join(command) for command, _ in calls[1:])
        self.assertIn("check_dist.py", checks)
        self.assertIn("audit --omit=dev --audit-level=high", checks)

    def test_a_failed_build_stops_before_any_artifact_check(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            repo = make_repo(root)
            private = root / "firebase-development.env"
            private.write_text(private_text(), encoding="utf-8")
            calls: list[str] = []

            def fake_run(command, cwd, env, timeout=1800):
                calls.append(command[1] if len(command) > 1 else command[0])
                return 1, "build error"

            code = prep.build_artifact(private_file=private, repo_root=repo, run=fake_run)
        self.assertEqual(code, 1)
        self.assertEqual(len(calls), 1)

    def test_artifact_checks_are_dist_guard_scanner_and_production_audit(self) -> None:
        commands = [" ".join(step(dist=Path("dist"))) for _, step in prep.artifact_steps()]
        joined = "\n".join(commands)
        self.assertIn("check_dist.py", joined)
        self.assertIn("scan_secrets.py", joined)
        self.assertIn("audit --omit=dev --audit-level=high", joined)
        self.assertEqual(len(commands), 3)

    def test_artifact_checks_fail_fast_and_report_the_failing_step(self) -> None:
        codes = iter((0, 1, 0))
        seen: list[str] = []

        def fake_run(command, cwd, env, timeout=1800):
            seen.append(" ".join(str(part) for part in command))
            return next(codes), "output"

        code = prep.verify_artifact(Path("dist"), REPO_ROOT, fake_run)
        self.assertEqual(code, 1)
        self.assertEqual(len(seen), 2)
        self.assertIn("scan_secrets.py", seen[1])


class KeyedScanTests(unittest.TestCase):
    """The one classified finding must be the public site key, proven from the artifact bytes.

    Co-location is not proof: a minified line can hold a genuine secret next to the public
    identifier, so the helper re-scans an isolated copy in which only the exact quoted public-key
    literal is replaced. The real pinned Gitleaks runs the critical cases below.
    """

    def fixture(self, root: Path, bundle: str, extra: dict[str, str] | None = None) -> Path:
        repo = root / "repo"
        (repo / "dist" / "assets").mkdir(parents=True)
        (repo / "dist" / "index.html").write_text("<html></html>", encoding="utf-8")
        (repo / "dist" / "assets" / "App.js").write_text(bundle, encoding="utf-8")
        for name, text in (extra or {}).items():
            path = repo / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(text, encoding="utf-8")
        return repo

    @staticmethod
    def tree_digest(root: Path) -> dict[str, str]:
        return {
            path.relative_to(root).as_posix(): hashlib.sha256(path.read_bytes()).hexdigest()
            for path in root.rglob("*")
            if path.is_file()
        }

    @staticmethod
    def dispatch(repo: Path, first: dict, residual: dict | None = None):
        clean = {"findings": [], "ok": True, "error": None}

        def scan(scan_root):
            if Path(scan_root).resolve() == repo.resolve():
                return dict(first)
            return dict(residual or clean)

        return scan

    def test_accepts_the_public_site_key_the_build_inserted(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            repo = self.fixture(
                Path(tmp),
                bundle_with_site_key() + "\n",
                {"dist/assets/other.js": "const b = 2;\n"},
            )
            before = self.tree_digest(repo)
            code, message = prep.classify_scan(repo, SITE_KEY, scan_secrets.run)
            after = self.tree_digest(repo)
        self.assertEqual(code, 0, message)
        self.assertIn("not a credential", message)
        self.assertIn("1 classified finding", message)
        self.assertIn("0 findings", message)
        self.assertNotIn(SITE_KEY, message)
        self.assertEqual(before, after, "the real dist/ must not change")

    def test_rejects_a_real_generic_secret_that_shares_the_line_with_the_public_site_key(self) -> None:
        line = f'const s="{SITE_KEY}";const c={{api_key:"{GENERIC_SECRET}"}};'
        with tempfile.TemporaryDirectory() as tmp:
            repo = self.fixture(Path(tmp), line + "\n")
            reported = scan_secrets.run(repo)
            # This is exactly the shape the old co-location check accepted: one generic finding,
            # and the public key literal on the reported line. The reported value is not the key.
            self.assertIsNone(reported["error"])
            self.assertEqual([item["rule"] for item in reported["findings"]], [prep.PUBLIC_IDENTIFIER_RULE])
            self.assertEqual(reported["findings"][0]["line"], 1)
            bundle_line = (repo / "dist" / "assets" / "App.js").read_text(encoding="utf-8").splitlines()[0]
            self.assertIn(SITE_KEY, bundle_line)
            code, message = prep.classify_scan(repo, SITE_KEY, scan_secrets.run)
        self.assertEqual(code, 1, message)
        self.assertIn("residual", message.lower())
        for value in (SITE_KEY, GENERIC_SECRET):
            self.assertNotIn(value, message)

    def test_rejects_a_finding_whose_matched_value_only_has_the_key_as_a_substring(self) -> None:
        bundle = f'const e={{"VITE_FIREBASE_APPCHECK_SITE_KEY":"prefix{SITE_KEY}"}};'
        with tempfile.TemporaryDirectory() as tmp:
            repo = self.fixture(Path(tmp), bundle + "\n")
            reported = scan_secrets.run(repo)
            self.assertIsNone(reported["error"])
            self.assertEqual(len(reported["findings"]), 1)
            code, message = prep.classify_scan(repo, SITE_KEY, scan_secrets.run)
        self.assertEqual(code, 1, message)
        self.assertIn("exact", message)
        self.assertNotIn(SITE_KEY, message)

    def test_the_literal_match_is_exact_and_never_a_prefix_substring_or_bare_value(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "prefix.js").write_text(f'"{SITE_KEY}EXTRA"', encoding="utf-8")
            (root / "substring.js").write_text(f'"prefix{SITE_KEY}"', encoding="utf-8")
            (root / "bare.js").write_text(SITE_KEY, encoding="utf-8")
            self.assertEqual(prep.public_literal_spans(root, SITE_KEY), [])
            (root / "quoted.js").write_text(f"`{SITE_KEY}`", encoding="utf-8")
            spans = prep.public_literal_spans(root, SITE_KEY)
            self.assertEqual(len(spans), 1)
            path, start, end = spans[0]
            matched = path.read_bytes()[start:end]
        self.assertEqual(path.name, "quoted.js")
        self.assertEqual(matched, f"`{SITE_KEY}`".encode())

    def test_refuses_every_scan_shape_that_is_not_the_one_proven_public_literal(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            repo = self.fixture(
                Path(tmp),
                bundle_with_site_key() + "\n",
                {"dist/assets/other.js": "const b = 2;\n", "script.py": f'K="{SITE_KEY}"\n'},
            )
            bundle = repo / "dist" / "assets" / "App.js"
            other = repo / "dist" / "assets" / "other.js"
            outside = repo / "script.py"
            good = {"rule": prep.PUBLIC_IDENTIFIER_RULE, "file": str(bundle), "line": 1}
            clean = {"findings": [], "ok": True, "error": None}
            cases = (
                ("scanner error", {"findings": [], "ok": False, "error": "scanner unavailable"}, clean),
                ("no finding", {"findings": [], "ok": True, "error": None}, clean),
                ("two findings", {"findings": [good, dict(good)], "ok": False, "error": None}, clean),
                ("other rule", {"findings": [dict(good, rule="firebase-web-api-key")], "ok": False, "error": None}, clean),
                ("outside dist", {"findings": [dict(good, file=str(outside))], "ok": False, "error": None}, clean),
                ("reported file without the literal", {"findings": [dict(good, file=str(other))], "ok": False, "error": None}, clean),
                ("residual finding", {"findings": [good], "ok": False, "error": None}, {"findings": [good], "ok": False, "error": None}),
                ("rescan error", {"findings": [good], "ok": False, "error": None}, {"findings": [], "ok": False, "error": "scanner unavailable"}),
                ("rescan without ok", {"findings": [good], "ok": False, "error": None}, {"findings": [], "error": None}),
            )
            for label, first, residual in cases:
                code, message = prep.classify_scan(repo, SITE_KEY, self.dispatch(repo, first, residual))
                self.assertEqual(code, 1, (label, message))
                self.assertNotIn(SITE_KEY, message, label)

    def test_accepts_only_with_one_exact_literal_and_a_clean_isolated_rescan(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            repo = self.fixture(Path(tmp), bundle_with_site_key() + "\n")
            bundle = repo / "dist" / "assets" / "App.js"
            finding = {"rule": prep.PUBLIC_IDENTIFIER_RULE, "file": str(bundle), "line": 1}
            code, message = prep.classify_scan(
                repo, SITE_KEY, self.dispatch(repo, {"findings": [finding], "ok": False, "error": None})
            )
        self.assertEqual(code, 0, message)
        self.assertIn("0 findings", message)
        self.assertNotIn(SITE_KEY, message)

    def test_refuses_two_exact_public_key_literals_in_dist(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            repo = self.fixture(Path(tmp), f'const a="{SITE_KEY}";const b="{SITE_KEY}";\n')
            bundle = repo / "dist" / "assets" / "App.js"
            finding = {"rule": prep.PUBLIC_IDENTIFIER_RULE, "file": str(bundle), "line": 1}
            code, message = prep.classify_scan(
                repo, SITE_KEY, self.dispatch(repo, {"findings": [finding], "ok": False, "error": None})
            )
        self.assertEqual(code, 1, message)
        self.assertIn("2 exact quoted", message)
        self.assertNotIn(SITE_KEY, message)


class StageTests(unittest.TestCase):
    def stage(self, repo: Path, evidence: Path, stage_dir: Path, **kwargs: object):
        out = io.StringIO()
        err = io.StringIO()
        with redirect_stdout(out), redirect_stderr(err):
            code = prep.stage_release(
                repo_root=repo,
                evidence_path=evidence,
                stage_dir=stage_dir,
                project=kwargs.get("project", prep.DEPLOY_PROJECT),
            )
        return code, out.getvalue() + err.getvalue()

    def test_stage_copies_only_the_reviewed_deploy_set(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            repo = make_repo(root)
            evidence = write_evidence(repo, root / "evidence.json")
            stage_dir = root / "sealed"
            code, out = self.stage(repo, evidence, stage_dir)
            self.assertEqual(code, 0, out)
            names = sorted(entry.name for entry in stage_dir.iterdir())
            self.assertEqual(
                names, sorted(["dist", "firestore.rules", "firestore.indexes.json", "firebase.json"])
            )
            self.assertFalse((stage_dir / "notes.txt").exists())
            self.assertTrue((stage_dir / "dist" / "assets" / "app.js").is_file())
            self.assertEqual(len(list((stage_dir / "dist").rglob("*.js"))), 1)
            self.assertIn("shiftrelay-hybridai-2026", out)
            self.assertIn("--project shiftrelay-hybridai-2026", out)
            self.assertIn("Nothing was deployed", out)
            for secret in SECRETS:
                self.assertNotIn(secret, out)

    def test_stage_refuses_a_dirty_tree(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            repo = make_repo(root)
            evidence = write_evidence(repo, root / "evidence.json")
            (repo / "notes.txt").write_text("changed\n", encoding="utf-8")
            code, out = self.stage(repo, evidence, root / "sealed")
            self.assertEqual(code, 2)
            self.assertIn("clean", out.lower())

    def test_stage_refuses_evidence_for_another_commit_ok_flag_or_tree(self) -> None:
        cases = (
            {"commit": "0" * 40},
            {"ok": False},
            {"dirty": True},
            {"tree_stable": False},
            {"cwd": "C:\\elsewhere"},
            {"checks": [{"name": "build", "exit": 1}]},
            {"checks": []},
        )
        for override in cases:
            with tempfile.TemporaryDirectory() as tmp:
                root = Path(tmp)
                repo = make_repo(root)
                evidence = write_evidence(repo, root / "evidence.json", **override)
                code, _ = self.stage(repo, evidence, root / "sealed")
                self.assertEqual(code, 2, override)
                self.assertFalse((root / "sealed").exists(), override)

    def test_stage_requires_every_current_check_name_exactly_once(self) -> None:
        # The authoritative list is the verifier's own CHECKS, imported without running a check.
        names = list(prep.REQUIRED_CHECK_NAMES)
        self.assertEqual(names, [check["name"] for check in verificar.CHECKS])
        self.assertEqual(len(names), len(set(names)))
        cases = (
            ("partial", [{"name": "build", "exit": 0}, {"name": "secret-scan", "exit": 0}]),
            ("missing", [{"name": name, "exit": 0} for name in names[:-1]]),
            ("duplicate", [{"name": "build", "exit": 0}] + [{"name": name, "exit": 0} for name in names]),
            ("unknown", [{"name": name, "exit": 0} for name in names] + [{"name": "extra-check", "exit": 0}]),
            ("failing", [{"name": name, "exit": 0 if name != "rules-tests" else 1} for name in names]),
            ("malformed", ["build"]),
        )
        for label, checks in cases:
            with tempfile.TemporaryDirectory() as tmp:
                root = Path(tmp)
                repo = make_repo(root)
                evidence = write_evidence(repo, root / "evidence.json", checks=checks)
                code, out = self.stage(repo, evidence, root / "sealed")
                self.assertEqual(code, 2, (label, out))
                self.assertIn("check", out.lower(), label)
                self.assertFalse((root / "sealed").exists(), label)

    def test_stage_accepts_evidence_with_the_full_current_check_list(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            repo = make_repo(root)
            evidence = write_evidence(repo, root / "evidence.json")
            code, out = self.stage(repo, evidence, root / "sealed")
        self.assertEqual(code, 0, out)

    def test_stage_refuses_missing_evidence_unknown_project_and_inside_repo(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            repo = make_repo(root)
            good = write_evidence(repo, root / "evidence.json")
            self.assertEqual(self.stage(repo, root / "absent.json", root / "a")[0], 2)
            self.assertEqual(
                self.stage(repo, good, root / "b", project="another-project")[0], 2
            )
            self.assertEqual(self.stage(repo, good, repo / "sealed")[0], 2)
            for name in ("a", "b", "sealed"):
                self.assertFalse((root / name).exists() or (repo / name).exists())


class HostingConfigTests(unittest.TestCase):
    def test_firebase_json_declares_the_spa_hosting_block_with_security_headers(self) -> None:
        config = json.loads((REPO_ROOT / "firebase.json").read_text(encoding="utf-8"))
        hosting = config["hosting"]
        self.assertEqual(hosting["public"], "dist")
        self.assertEqual(
            hosting["rewrites"], [{"source": "**", "destination": "/index.html"}]
        )
        headers = {
            item["key"]: item["value"]
            for block in hosting["headers"]
            for item in block["headers"]
        }
        csp = headers["Content-Security-Policy"]
        for directive in (
            "default-src 'self'",
            "script-src 'self' https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/",
            "connect-src 'self' https://*.googleapis.com https://www.google.com/recaptcha/",
            "frame-src https://www.google.com/recaptcha/ https://recaptcha.google.com/recaptcha/",
            "object-src 'none'",
            "base-uri 'none'",
            "frame-ancestors 'none'",
        ):
            self.assertIn(directive, csp)
        self.assertNotIn("unsafe-eval", csp)
        self.assertNotIn("'unsafe-inline'", csp)
        self.assertEqual(headers["X-Content-Type-Options"], "nosniff")
        self.assertEqual(headers["Referrer-Policy"], "strict-origin-when-cross-origin")
        self.assertIn("noindex", headers["X-Robots-Tag"])

    def test_no_firebaserc_is_added_so_every_command_names_the_project(self) -> None:
        self.assertFalse((REPO_ROOT / ".firebaserc").exists())

    def test_package_and_verifier_wire_the_release_helpers(self) -> None:
        package = json.loads((REPO_ROOT / "package.json").read_text(encoding="utf-8"))
        self.assertIn("release_prep.py build", package["scripts"]["build:qa"])
        self.assertIn("release_prep.py stage", package["scripts"]["release:stage"])
        self.assertIn("tests.test_release_prep", package["scripts"]["test:tools"])
        verifier = (REPO_ROOT / "scripts" / "verificar.py").read_text(encoding="utf-8")
        self.assertIn("scripts/release_prep.py", verifier)
        self.assertIn("tests/test_release_prep.py", verifier)


if __name__ == "__main__":
    unittest.main()
