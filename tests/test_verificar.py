"""Regression tests for the evidence verifier (tooling, not application behavior)."""

from __future__ import annotations

import hashlib
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

REPO_ROOT = Path(__file__).resolve().parents[1]
VERIFIER = REPO_ROOT / "scripts" / "verificar.py"
PY = [sys.executable]

# The seven technical gaps that must stay byte-identical while scope changes are reviewed.
# AC15 is absent by the approved November 23, 2026 decision: its master/reviewer product-decision
# and existing draft-copy claims review is satisfied, so it is no longer unimplemented scope.
EXPECTED_UNIMPLEMENTED = (
    "Q5 reviewer closure: the pinned Gitleaks scan (working tree + dist, no project allowlist), "
    "the production dependency audit and the new dist-guard now run locally, but reviewer sign-off "
    "on the redacted report and on the pre-deploy public artifact set is still open",
    "hosted delivery checks: the `hostedQA` mode is implemented and unit-tested, but no Hosting "
    "build was deployed, the reserved /__/firebase/init.json endpoint is unproven for the modular "
    "SDK and must be checked empirically after the gated deployment, and no hosted "
    "reCAPTCHA-Enterprise-attested request exists",
    "App Check enforcement is ENFORCED for `firebaseml.googleapis.com` and probe-proven (valid "
    "token 200, missing or garbage token 401; docs/adr/0007-appcheck-enforcement.md), but hosted "
    "reCAPTCHA-Enterprise attestation and Firestore App Check enforcement before public release "
    "remain pending",
    "in-app live cloud reconciliation: the signed-in live app reaches the Auth success path and "
    "is denied at the membership read by the current closed Rules; the reviewed Ruleset "
    "deployment (separately approved, not performed here) is required, and the cloud "
    "reconciliation suggestion/confirm flow has only labelled-mock evidence",
    "hosted local model ON_DEVICE request, quota/latency beyond one measured cloud call and the "
    "separately consented hosted cloud comparison (AC13/Q6 remain open); the local model path is "
    "proven on localhost for Nano 4 by docs/adr/0006-nano4-runtime-proof.md, while a hosted "
    "local-model request and the hosted reCAPTCHA-attested cloud request are still absent",
    "manual accessibility: screen-reader announcements, 200% zoom and actual Android Chrome touch "
    "(automated axe serious/critical, keyboard and 320px checks only)",
    "live Firebase Hosting deployment, public release and any further cloud provisioning remain "
    "outside this cut and need their own confirmation",
)

EXPECTED_CHECKS = {
    "typecheck",
    "lint",
    "build",
    "dist-guard",
    "secret-scan",
    "dependency-audit",
    "unit",
    "ai-output",
    "reconciliation",
    "runtime-config",
    "rules-tests",
    "e2e-tests",
    "tools-tests",
    "checker-self-test",
    "diagrams",
    "contract-fixture",
}


def load_module():
    sys.path.insert(0, str(REPO_ROOT / "scripts"))
    try:
        import verificar
    finally:
        sys.path.pop(0)
    return verificar


def init_repo(path: Path) -> None:
    run = lambda *args: subprocess.run(
        ["git", *args], cwd=path, check=True, capture_output=True, text=True
    )
    run("init", "-q", "-b", "main")
    run("config", "user.email", "demo@example.invalid")
    run("config", "user.name", "Demo")


def commit_all(path: Path, message: str = "baseline") -> None:
    subprocess.run(["git", "add", "-A"], cwd=path, check=True, capture_output=True)
    subprocess.run(["git", "commit", "-qm", message], cwd=path, check=True, capture_output=True)


class VerifierTest(unittest.TestCase):
    def setUp(self) -> None:
        self.verificar = load_module()

    def test_checks_are_explicit_and_limited_to_implemented_scope(self) -> None:
        names = {check["name"] for check in self.verificar.CHECKS}
        self.assertEqual(names, EXPECTED_CHECKS)
        for check in self.verificar.CHECKS:
            self.assertIsInstance(check["command"], list)
            self.assertTrue(check["command"])
        rules = next(check for check in self.verificar.CHECKS if check["name"] == "rules-tests")
        self.assertIn("test:rules", " ".join(rules["command"]))
        e2e = next(check for check in self.verificar.CHECKS if check["name"] == "e2e-tests")
        self.assertIn("test:e2e", " ".join(e2e["command"]))
        reconciliation = next(
            check for check in self.verificar.CHECKS if check["name"] == "reconciliation"
        )
        self.assertIn("tests/reconciliation.test.ts", " ".join(reconciliation["command"]))

    def test_run_check_records_exit_duration_and_output_hash(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            result, output = self.verificar.run_check(
                "good", [*PY, "-c", "print('hello')"], Path(tmp), 60
            )
        self.assertEqual(result["exit"], 0)
        self.assertEqual(result["name"], "good")
        self.assertGreaterEqual(result["duration_ms"], 0)
        self.assertEqual(
            result["stdout_sha256"], hashlib.sha256(output.encode("utf-8", errors="replace")).hexdigest()
        )
        self.assertIn("hello", output)

    def test_run_check_reports_failures_without_raising(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            result, _ = self.verificar.run_check(
                "bad", [*PY, "-c", "raise SystemExit(7)"], Path(tmp), 60
            )
        self.assertEqual(result["exit"], 7)

    def test_missing_git_metadata_fails_closed(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            blockers = self.verificar.prerequisites(Path(tmp))
        self.assertTrue(any("git" in item for item in blockers), blockers)
        self.assertTrue(any("missing required file" in item for item in blockers), blockers)

    def test_missing_artifacts_fail_closed(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            init_repo(root)
            blockers = self.verificar.prerequisites(root)
        joined = "\n".join(blockers)
        self.assertIn("docs/INTERFACES.md", joined)
        self.assertIn("tests/fixtures/contrato.json", joined)
        self.assertIn("tests/ai-output.test.ts", joined)
        self.assertIn("tests/reconciliation.test.ts", joined)
        self.assertIn("scripts/scan_secrets.py", joined)
        self.assertIn("node_modules", joined)
        self.assertNotIn("not a git repository", joined)

    def test_unborn_head_is_reported_without_fake_commit(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            init_repo(root)
            state = self.verificar.git_state(root)
            evidence = self.verificar.build_evidence(
                root,
                [{"name": "ok", "command": [*PY, "-c", "print('ok')"]}],
                60,
                "full",
                {"phase": 4, "name": "test"},
            )
        self.assertEqual(state["commit"], "unborn")
        self.assertTrue(state["dirty"])
        self.assertEqual(evidence["commit"], "unborn")
        self.assertTrue(evidence["ok"])
        self.assertFalse(evidence["gate_c_eligible"])

    def test_blockers_make_evidence_not_ok(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            init_repo(root)
            evidence = self.verificar.build_evidence(
                root,
                [{"name": "ok", "command": [*PY, "-c", "print('ok')"]}],
                60,
                "full",
                {"phase": 4, "name": "test"},
                blockers=["missing tool: node"],
            )
        self.assertFalse(evidence["ok"])
        self.assertFalse(evidence["gate_c_eligible"])
        self.assertIn("missing tool: node", evidence["blockers"])

    def test_secret_scan_runs_the_pinned_scanner_not_a_regex(self) -> None:
        scope = self.verificar.SCOPE
        checks = {check["name"]: " ".join(check["command"]) for check in self.verificar.CHECKS}
        self.assertIn("scan:secrets", checks["secret-scan"])
        self.assertIn("npm audit --omit=dev --audit-level=high", checks["dependency-audit"])
        self.assertFalse(hasattr(self.verificar, "secret_scan"))
        self.assertIn("secret-scan", scope["included"])
        runner = (REPO_ROOT / "scripts" / "scan_secrets.py").read_text(encoding="utf-8")
        self.assertIn("gitleaks", runner.lower())
        self.assertIn("ASSET_SHA256", runner)
        self.assertIn("--redact=100", runner)
        gap = "\n".join(scope["unimplemented"]).lower()
        self.assertNotIn("credential scanner for q5 (not implemented", gap)
        self.assertIn("q5", gap)

    def test_scope_does_not_claim_product_completion(self) -> None:
        scope = self.verificar.SCOPE
        for name in ("rules-tests", "e2e-tests", "lint", "build", "secret-scan"):
            self.assertIn(name, scope["included"])
        gaps = "\n".join(scope["unimplemented"]).lower()
        for gap in (
            "q5 reviewer closure",
            "local model",
            "cloud reconciliation",
            "manual accessibility",
            "live firebase",
        ):
            self.assertIn(gap, gaps)

    def test_ac15_is_no_longer_unimplemented_scope_and_seven_gaps_stay_exact(self) -> None:
        items = self.verificar.SCOPE["unimplemented"]
        # AC15's product decision and the existing draft-copy claims review were approved at
        # checkpoint af421ae, so that item is removed; the seven technical gaps stay byte-identical
        # and the gate keeps failing closed on them.
        self.assertEqual(items, list(EXPECTED_UNIMPLEMENTED))
        lowered = "\n".join(items).lower()
        for gone in ("ac15", "coordinator", "research", "recruitment"):
            self.assertNotIn(gone, lowered)

    def test_seven_technical_gaps_keep_gate_c_closed(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            init_repo(root)
            (root / "a.txt").write_text("a\n", encoding="utf-8")
            commit_all(root)
            evidence = self.verificar.build_evidence(
                root,
                [{"name": "ok", "command": [*PY, "-c", "print('ok')"]}],
                60,
                "full",
                self.verificar.SCOPE,
            )
        self.assertTrue(evidence["ok"])
        self.assertFalse(evidence["gate_c_eligible"])
        self.assertIn("7 scope items unimplemented", evidence["gate_c_reasons"])

    def test_passing_phase4_checks_never_claim_gate_c_or_product_scope(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            init_repo(root)
            (root / "a.txt").write_text("a\n", encoding="utf-8")
            commit_all(root)
            evidence = self.verificar.build_evidence(
                root,
                [{"name": "ok", "command": [*PY, "-c", "print('ok')"]}],
                60,
                "full",
                self.verificar.SCOPE,
            )
        self.assertTrue(evidence["ok"])
        self.assertTrue(evidence["tree_stable"])
        self.assertFalse(evidence["gate_c_eligible"])
        self.assertTrue(any("unimplemented" in reason for reason in evidence["gate_c_reasons"]))

    def test_project_mode_reads_assignment_and_colon_syntax(self) -> None:
        self.assertEqual(self.verificar.project_mode(REPO_ROOT), "full")
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            docs = root / "docs"
            docs.mkdir()
            cases = (
                ("MODE=full\n", "full"),
                ("- MODE: lite\n", "lite"),
                ("MODE = full\n", "full"),
                ("MODE=production\n", "unknown"),
            )
            for text, expected in cases:
                (docs / "_project.md").write_text(text, encoding="utf-8")
                self.assertEqual(self.verificar.project_mode(root), expected, text)

    def test_a_check_that_mutates_the_tree_is_not_reported_clean(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            init_repo(root)
            (root / "tracked.txt").write_text("original\n", encoding="utf-8")
            commit_all(root)
            evidence = self.verificar.build_evidence(
                root,
                [{"name": "mutator", "command": [*PY, "-c", "open('created.txt','w').write('x')"]}],
                60,
                "full",
                self.verificar.SCOPE,
            )
        self.assertEqual(evidence["checks"][0]["exit"], 0)
        self.assertFalse(evidence["tree_stable"])
        self.assertFalse(evidence["ok"])
        self.assertFalse(evidence["gate_c_eligible"])
        self.assertIn("created.txt", "\n".join(evidence["state_after"]["status"]))

    def test_git_metadata_failure_fails_closed(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            init_repo(root)
            broken = lambda args, cwd: (128, "fatal: not a git repository\n")
            with mock.patch.object(self.verificar, "git", side_effect=broken):
                state = self.verificar.git_state(root)
                evidence = self.verificar.build_evidence(
                    root,
                    [{"name": "never", "command": [*PY, "-c", "print('x')"]}],
                    60,
                    "full",
                    self.verificar.SCOPE,
                )
        self.assertFalse(state["ok"])
        self.assertTrue(state["problems"])
        self.assertFalse(evidence["ok"])
        self.assertEqual(evidence["checks"], [])
        self.assertTrue(any("git" in item for item in evidence["blockers"]))
        self.assertFalse(evidence["gate_c_eligible"])

    def test_cli_self_test_and_list_exit_zero(self) -> None:
        self_test = subprocess.run(
            [*PY, str(VERIFIER), "--self-test"], capture_output=True, text=True, timeout=120
        )
        listing = subprocess.run(
            [*PY, str(VERIFIER), "--list"], capture_output=True, text=True, timeout=120, cwd=REPO_ROOT
        )
        self.assertEqual(self_test.returncode, 0, self_test.stdout + self_test.stderr)
        self.assertIn("self-test OK", self_test.stdout)
        self.assertEqual(listing.returncode, 0, listing.stdout + listing.stderr)
        for name in EXPECTED_CHECKS:
            self.assertIn(name, listing.stdout)

    def test_evidence_report_is_written_by_the_cli(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            report = Path(tmp) / "evidence.json"
            result = subprocess.run(
                # One check only: the full list already includes this tooling suite.
                [*PY, str(VERIFIER), "--report", str(report), "--only", "contract-fixture"],
                capture_output=True,
                text=True,
                timeout=900,
                cwd=REPO_ROOT,
            )
            data = json.loads(report.read_text(encoding="utf-8"))
        self.assertIn(result.returncode, (0, 1))
        for key in (
            "schema",
            "project",
            "mode",
            "phase",
            "commit",
            "dirty",
            "status",
            "cwd",
            "started_at",
            "finished_at",
            "checks",
            "blockers",
            "gate_c_eligible",
            "scope",
            "ok",
        ):
            self.assertIn(key, data)
        self.assertEqual(data["phase"], 5)
        self.assertTrue(all("stdout_sha256" in check for check in data["checks"]))
        self.assertEqual(result.returncode == 0, data["ok"])
        self.assertFalse(data["gate_c_eligible"])
        self.assertNotIn("GATE_C: ELIGIBLE", result.stdout)
        self.assertIn("Q5 credential scan: not run in this invocation", result.stdout)
        self.assertIn("Q5 dependency audit: not run in this invocation", result.stdout)

    def test_partial_run_reports_only_the_executed_scope_and_no_gate_claim(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            report = Path(tmp) / "evidence.json"
            result = subprocess.run(
                [*PY, str(VERIFIER), "--report", str(report), "--only", "contract-fixture"],
                capture_output=True,
                text=True,
                timeout=900,
                cwd=REPO_ROOT,
            )
            data = json.loads(report.read_text(encoding="utf-8"))
        self.assertEqual([check["name"] for check in data["checks"]], ["contract-fixture"])
        self.assertEqual(data["scope"]["included"], ["contract-fixture"])
        self.assertFalse(data["scope"]["complete"])
        self.assertFalse(data["gate_c_eligible"])
        self.assertTrue(any("partial" in reason for reason in data["gate_c_reasons"]))
        self.assertIn(f"1 of {len(self.verificar.CHECKS)} checks executed", result.stdout)

    def test_scope_coverage_is_derived_from_the_executed_checks(self) -> None:
        scope = self.verificar.SCOPE
        full = self.verificar.scope_for(scope, [check["name"] for check in self.verificar.CHECKS])
        partial = self.verificar.scope_for(scope, ["contract-fixture", "contract-fixture"])
        empty = self.verificar.scope_for(scope, [])
        self.assertTrue(full["complete"])
        self.assertEqual(full["included"], [check["name"] for check in self.verificar.CHECKS])
        self.assertFalse(partial["complete"])
        self.assertEqual(partial["included"], ["contract-fixture", "contract-fixture"])
        self.assertFalse(empty["complete"])
        self.assertEqual(empty["included"], [])


if __name__ == "__main__":
    unittest.main()
