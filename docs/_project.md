# ShiftRelay — Project State

GITHUB_SYNC=https://github.com/JuanCastellanos1/Firebase-AIlogic-Hackathon.git
MODE=full
REVIEW_MODEL=opencode-go/qwen3.8-flash
DEADLINE=2026-11-30 14:00 America/Los_Angeles
STACK=React + TypeScript + Vite; Firebase AI Logic, App Check, Auth, Standard Firestore, Hosting; Vitest, Playwright, Firebase emulators
PYTHON_CMD=py -3
BRANCH=feat/hackathon-ideation
DEFAULT_BRANCH=main
BASE_SHA=538ed9f9a83b6bda18b8fb6e4bacfb712ded575f
RESUME_SOURCE_SHA=dbd217cdb4e38606dc6d39285e0fcfc3f5caec78

## Active resume — November 20, 2026 UTC

**QA candidate prepared:** clean isolated clone and sealed stage of reviewed/CI-green `00c2b2e`
passed full verifier, keyed-build safeguards and Q5 pre-deploy artifact review. Live preflight
confirmed billing off, memberships valid and AI Logic enforcement. ADR 0009 records reviewed
deny-all recovery for a first release (no prior release exists; restore not live-tested).
Deployment confirmation is next; clone/stage/report paths and constraints are in HANDOFF.

**Publication update:** user pushed `00c2b2e`; master confirmed remote SHA matches HEAD.
Current-source Verification run `44664598466` completed successfully for that SHA; master verified
GitHub REST conclusion `success`, updated `2026-11-20T03:05:22Z`. Next: assess gated QA prerequisites
and prepare a clean release workspace without discarding later operational edits.
No PR/merge/deploy authorized by this CI-only action. Later operational edits remain uncommitted.

**Latest stop:** both reviewers approved implemented-code review at `00c2b2e`; full post-commit
verifier finished `02:50:35Z`, 16/16 pass, clean/stable/complete, matching SHA. Eight delivery
gaps and `gate_c_eligible=false` remain. User approved a CI-only feature push, but tool policy
denied the delegate's push before execution. Nothing published; current-source CI remains absent.
Master will not bypass permissions or push. Exact user action and commands: HANDOFF latest stop.
This operational update is uncommitted after the certified checkpoint; use Git/evidence/review SHA
as the source of current mechanical status, not older future-tense records below.

Current fix checkpoint: `a7711cd233303371cc71493b47b0a66061b41953`. Its full verifier finished
at `2026-11-20T02:22:47Z`: 16/16 exit 0, clean/stable tree, complete scope and matching SHA.
The earlier milestone/next-step sections below describe the pre-fix review and are historical.
Both fix reviews approved D1–D4/U1 at `a7711cd`; no code blockers remain. Gate C's final clean
evidence checkpoint is pending after operational record reconciliation.
User approved two fresh Qwen 3.8 Flash reviewers because the original sessions are inaccessible
from this parent session. Exact sessions and next step: `docs/HANDOFF.md`, active resume update.
Operational record changes after this checkpoint require a commit and regenerated evidence.
No push/deploy/merge. Eight hosted/manual/delivery scope items remain unimplemented.

## Current milestone — November 19, 2026

Resumed from the clean amended WIP commit `dbd217c` on the existing feature branch. The closure handoff's `2fd7fc5` was the pre-amend SHA, not the final saved checkpoint. Completed framing/build work is retained; do not repeat ideation, Gate A or the three feature slices.

- Gate A: passed with real diagram evidence.
- Build: manual ownership workflow, private local drafting, consented cloud reconciliation, three runtime modes, security/tooling fixes and QA preparation are implemented. Hosted and manual delivery evidence remains incomplete.
- Gate C: **DO NOT APPROVE** at `dbd217c`, following two independent Qwen 3.8 Flash reviews. Phase 6.5 is the next work, not deployment.
- Gate D: pending review closure, current-source CI, authenticated hosted QA, remaining manual checks, final artifact review and authorized merge.

## Brief and non-negotiables

ShiftRelay turns private non-emergency community-venue shift notes into reviewed shared tasks, explicitly accepted ownership and recorded resolution/reopening. Web-first; responsive Android web now, not a native Android build. One venue and synthetic demonstration data. English only as specified in `AGENTS.md`.

Keep private input in memory and strictly on-device; no silent cloud fallback, payload telemetry or AI-authorized task mutations. Sharing and cloud inference require separate explicit review/consent. Server Rules enforce permissions, versions and activity coupling. The six targets in `CONSTRAINTS.md` remain unchanged.

## Permissions retained on resume

Approved: implementation/local tools/reviewed Firebase skills; isolated browser/model/accessibility tests; local commits; delegated feature pushes, safe repository bootstrap, CI, PR and gated merge; Apache-2.0; Spark-only Firebase/AI/Auth/App Check/key restrictions; synthetic test users/memberships and data resets.

Authenticated QA Hosting/secure Rules deployment is specifically approved **after code review and automated checks**, to collect live evidence before final validation. Final release/merge still requires gates and CI. Agent-created exposed development/QA credentials may be revoked/replaced; never touch unrelated credentials. Chrome's specific first-run agreement was approved only for the disposable Android QA device, signed out with optional reporting off.

Never enable billing/Blaze/paid resources, accept other new legal terms, force-push, change visibility, delete cloud resources, publish to YouTube or submit the hackathon entry without specific approval. Master never pushes. No new cloud action is needed for Phase 6.5.

## Verified records versus pending evidence

- On resume, master regenerated `.git/opencode/evidence.json` **after** `dbd217c`: `ok=true`, `dirty=false`, `tree_stable=true`, matching commit, all 16 implemented checks exit 0. Review SHA/patch were generated afterward against `origin/main` at the requirements root. This is implemented-code evidence, not final delivery certification.
- Qwen reviewers validated those inputs. Review sessions: data/privacy `ses_e0b4b0c92ffekd70cGqZZj6Zhh`; UI/runtime/tools `ses_e0b4b0c87ffexgrxbUnlfc4lfT`. Both rejected Gate C; no release admission while blockers remain.
- CI **has run**: GitHub Actions run `44222898293` succeeded for `b0910d32f7cd6403ccb59419613eadfa0fe40c83`; master independently re-read its public REST metadata on November 19. It does **not** certify `dbd217c` or subsequent fixes. A review statement claiming CI never executed is rejected on that evidence.
- Nano 4 localhost proof: ADR0006 records the sponsor-documented Gemma 4 flag, ready Gemma 4 weights, legacy v3 not installed, two genuine Firebase AI Logic on-device generations. Semantic source-span alignment remains imperfect and requires human review. Intended hosted-origin proof is pending.
- AI Logic App Check: ADR0007 records `firebaseml.googleapis.com` ENFORCED, valid-token 200 and absent/invalid-token 401 after propagation, and completed debug-token rotation. Recheck live state at QA; hosted reCAPTCHA and Firestore enforcement are not inferred from that result.
- Android: ADR0008 records isolated Android 17/Chrome 149, fixed guest networking, first-run completed signed out/reporting off. No app flow was validated on Android, and no physical-device claim is made.
- External project `shiftrelay-hybridai-2026`, Standard Firestore/us-east1 and one web app are provisioned; prior setup verified billing disabled. Real configuration and test credentials stay outside the repository under the private path documented in ADR0003/0004. Do not print/read them for code review.

## Phase 6.5 blocker set

- D1: runtime live-local API-key shape must match the frozen `AIza` validation contract.
- D2: server membership authorization must bind the record's venue to its path, not only its UID.
- D3: pin cloud model/output-token/structured-response request wiring with regression assertions.
- D4: reconcile current scope/docs with ADR0006/0007, preserving dated historical results and all genuine hosted/manual gaps.
- U1: `--only` evidence must name only executed checks; release staging must reject incomplete check coverage even when selected checks passed.

Record grouped non-blocking findings in `docs/DEBT.md` (at most eight), update the budget at review closure, and re-review **only the fix diff** using explicit `opencode-go/qwen3.8-flash`. Do not silently substitute Haiku or a guessed variant.

## Next exact step

Implement the blocker fixes with red/green regressions; no limit/test/security weakening. Commit the fix plus corrected operational records, regenerate the full verifier after commit, require clean SHA-matched evidence, and refresh review SHA/patch. Both original Qwen reviewers must confirm their blockers closed before Gate C closes. Only then proceed to current-source CI and the already-approved limited hosted QA path. `docs/HANDOFF.md` carries the exact session resume details.
