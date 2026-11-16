# Handoff

## Stage and gates

Gate A approved. Manual UI/contract/emulator workflow implemented and independently exercised by master. Gates B/C/D not approved: manual device/accessibility checks and later product slices remain. No live hybrid or completed-product claim.

## Artifacts

- `AGENTS.md`: English-only and spending/permission boundaries.
- `docs/_project.md`, `docs/_presupuesto.md`: authoritative operational state and latest approvals.
- `summary.md`, `docs/idea.md`, `docs/adr/0001-shiftrelay-stack.md`: rules, selected concept and stack rationale.
- `docs/spec.md`, `docs/PLAN.md`, `CONSTRAINTS.md`: acceptance criteria, three slices and quality floor.
- `docs/ARCHITECTURE.md`, `docs/INTERFACES.md`, `tests/fixtures/contrato.json`: frozen domain/data contract and residual risks.
- `docs/skills.md`, `docs/verification.md`: installed/loaded Firebase skills and actual implementation/test history.
- `src/domain.ts`, `src/validation.ts`, `src/tasks.ts`, `firestore.rules`: current tested pure model and shared-data adapter/Rules; more UI files are being added by active agent.
- `.git/opencode/evidence.json`: scoped evidence, not product/Gate C approval. Verifier deliberately names missing product checks and real credential scanner.

## Permissions and decisions

User approved development/tools/skills, isolated browser testing, local AI/hardware tests, local commits, delegated feature pushes/draft PRs, Apache-2.0, synthetic data, new nonproduction Firebase setup. Free-tier-only: no billing link, Blaze/paid APIs/resources or spending. Responsive Android web now; native port is outside current delivery scope. User separately confirmed permanent Firestore region us-east1, proposed project shiftrelay-hybridai-2026, default Standard database. Check ID availability; stop on collision or missing authentication. Specific public deployment, merge, visibility changes, submission and cloud deletion still need confirmation. Master never pushes.

## Agent work — do not duplicate active verification

1. `ses_e1ca82d8effe4fvhgQBd7tmy2a` completed manual UI. Master reran typecheck/lint/build,54unit31Rules7E2E19tools and2diagrams successfully. Master also exercised actual agent-browser two-role publication→accept→resolve→reopen v1→v4; raw note cleared, owner/history retained, no page errors. Browser/auth-vault test profiles cleaned; owned preview servers stopped. No live frontend/AI/deploy/commit.
2. `ses_e1ca58388ffeFsRI6wS6wYzf5w` completed: project shiftrelay-hybridai-2026 and default Standard Firestore/us-east1 created. Master independently reran projects:list and firestore:databases:get: ACTIVE, project number1013230596333, freeTier=true, PITR disabled. Agent verified billingEnabled=false via Cloud Billing API (not independently repeated by master). No app registration/key/data/Rules/Hosting deploy. Empty Hosting site auto-created by Firebase. Default closed Rules posture is platform-documented only, not client-tested; do not mistake zero Rules releases for a deployed app Ruleset. Provisioning evidence edit under .git was denied twice; full sanitized report retained in child session, summary in _project. No credentials recorded here.

3. `ses_e1b0acbe5ffeVKDDpHSW39qnE3` completed scanner: official Gitleaks8.30.1 pinned with verified release/binary hashes,8regressions, whole working tree/build scan. Found genuine gRPC audit failure; its rules/E2E start failures were collision with master's preview ports, not source failures. Master has stopped those preview processes.
4. `ses_e1addfe3affesmR200a2KxP0FH` debugger applied exact scoped @firebase/firestore/@grpc/grpc-js1.13.6 override; audit went red→green. Full verifier was launched in background inside that child session; final automatic completion is pending. Do not poll, start competing emulator suites, change app/package/tests or commit before it returns. Master independently ran audit(0vulnerabilities),npm ls(patched edge) and scanner(74files clean) after fix.
5. `ses_e1b09fc31ffen0CJOCOVSacj43` planner completed docs/adr/0002-on-device-feasibility.md: stock Chrome157 reports English text model downloadable on loopback/official-docs HTTPS; CPU route plausible. No model download/request/identity or hosted-app proof. Browser probes cleaned up.

Wait for automatic completion notifications; do not poll background sessions. Before new delegation verify file ownership. Current source should remain stable until debugger verifier finishes.

## Verified versus reported results

Master actually reran 54 domain tests, 18 tool tests, typecheck, renderer self-test and both Mermaid renders: all passed. Debugger fixed wrong observation-target identity, incomplete unknown-task validation, unsafe version increment, MODE parsing, git-state evidence mutation/failure handling, and removed misleading homegrown secret scan.

Master subsequently reran the full manual slice with31Rules and7real emulator-backed E2E tests, type/lint/build and19tools successfully. Post-scanner tooling count is27; post-gRPC-fix full verifier is pending. Model, real Android, manual screen-reader/200%zoom and product usefulness are not proven. Production five-card access-budget caching remains a residual risk; do not lower cap silently. Full E2E logs include expected permission-denied/offline SDK warnings in negative cases; clean independent happy-path browser console had only Vite/React dev messages.

## Exact next steps

Receive debugger's automatic final verifier output; independently verify resulting evidence before commits/gate decisions. No further broad install approval needed. Establish coherent local baseline/implementation commits after clean scanner and full test results, record real BASE_SHA, regenerate evidence after commit before review SHA/patch. Root HEAD still unborn as of latest inspected state. Never treat scoped ok as full product approval. Then delegate Slice2 strictly-local drafting with memory-only edit/review/manual fallback; use ADR0002 proven capability surfaces but keep exact Nano4 claim unresolved. Real cloud web app/AI/App Check setup and specific deployment remain separate authorized-action checks. No cloud data should be connected yet.

## Reproduction commands

```powershell
git status --short
git clean -ndx
Get-Content package.json
npm run typecheck
npm run test:unit
npm run test:rules
npm run test:tools
py -3 scripts/check_diagrams.py docs
py -3 scripts/verificar.py --report .git/opencode/evidence.json
```

UI/build/lint/E2E commands may be added by active agent; inspect package scripts before use. No credentials in chat, source or logs.

## Open blockers

Exact Nano4 and hosted local support, real device tests, manual screen-reader/zoom/Android touch checks, user validation, credential scanner and full product quality/review evidence. Authenticated access/provisioning succeeded; live app registration/AI setup and real client verification are still pending. Rules deployment requires explicit confirmation and a reviewed secure application Ruleset, never test-mode/public access. No Firebase MCP enabled.

## Suggested skills

Load agent-browser core guide before browser commands; verification-before-completion for gate claims. Use actual installed Firebase Auth/Firestore/Rules authoring/auditor/AI Logic/Hosting skills per task, max three per artifact. Relevant official skills were installed from reviewed revision 99954a30898bb5ddc8152ee10e124dc3b4106bf7; authoring skill adoption is recorded by backend implementer.
