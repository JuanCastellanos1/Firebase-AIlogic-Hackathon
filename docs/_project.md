# Project State

GITHUB_SYNC=https://github.com/JuanCastellanos1/Firebase-AIlogic-Hackathon.git
MODE=full
DEADLINE=2026-11-30 14:00 America/Los_Angeles (official submission cutoff)
STACK=React + TypeScript + Vite; modular Firebase JS SDK (AI Logic, App Check, Auth, Firestore); Firebase Hosting; Vitest + Playwright + Firebase emulators
PYTHON_CMD=py -3
BRANCH=feat/hackathon-ideation
DEFAULT_BRANCH=main
BASE_SHA=538ed9f9a83b6bda18b8fb6e4bacfb712ded575f

## Brief

Read summary.md first; consult the official rules if needed. Brainstorm hackathon project ideas in English. The user wants an innovative and complete product that must be a web application portable to Android and must solve a real-life problem, not merely provide information.

## Scope and decisions

- English-only policy is authoritative in AGENTS.md.
- Current authorization: user approved the remaining permissions package: local development/tools/skills, localhost servers/emulators, isolated-profile browser automation, hardware/local-model testing, local branches/commits, dedicated nonproduction Firebase setup and synthetic tests, delegated feature-branch pushes/draft PRs, Apache-2.0 license. Spending is FREE-TIER-ONLY: no billing account, paid plan, paid APIs, or charges. Android is responsive web now. User separately confirmed creating project shiftrelay-hybridai-2026 (subject to ID availability) and default Standard Firestore database in permanent region us-east1. No cloud resources are claimed to exist until actual provisioning evidence. Public deployment, merge, visibility changes, submission and cloud deletion still require action-specific confirmation.
- The user states 15 days to finish. As of November 16, this may extend beyond the official November 30 cutoff. Use the earlier official cutoff; working hours and team capacity remain unknown.
- Must: hackathon compliance, actual runtime Firebase AI Logic usage, App Check, web delivery, credible Android portability, actionable end-to-end workflow, coherent product experience, real target audience.
- Submission must include a public open-source repository and a public YouTube demonstration of at most three minutes. Testing access must remain available through December 16, 2026.
- Nice-to-haves: propose after idea comparison; do not silently require a second native implementation.
- Sponsor rules prefer multiple platforms but allow one; Android portability alone does not establish Android-category eligibility.
- Team size, devices capable of local inference and cloud credentials/access remain unknown. Budget is free-tier-only; never silently enable billing or substitute paid services.
- No credentials required for ideation. Use synthetic data for any future demo by default.
- GitHub access verified; empty remote cloned through a temporary staging folder to preserve summary.md. Default symbolic branch is main. User now authorizes delegated feature-branch pushes/draft PRs; master never pushes. No merge authorized.
- Existing summary is a secondary source, sufficient for initial ideation; technical feasibility requires current official SDK documentation before committing to a design.

## Phase 0 evidence — November 16, 2026

- Python 3.15.2 (`py -3 --version`).
- Node v24.14.0; npm 11.9.0; Git 2.55.0.windows.5; OpenCode v2.3.0.
- `opencode mcp list`: context7 connected; github connected.
- `git ls-remote <remote>`: exit 0, no refs. Clone confirms empty repository.
- GitHub MCP authenticated as repository owner; branch feat/hackathon-ideation selected locally.
- No prior PLAN, HANDOFF, AGENTS, or .gitignore existed at startup. summary.md preserved.
- Initial documentation baseline committed locally as538ed9f9a83b6bda18b8fb6e4bacfb712ded575f; main points to that requirements baseline, implementation remains on feat/hackathon-ideation. No push/merge performed.

## Next milestone

ShiftRelay and its stack/scope are approved. Official Firebase skills installed globally from reviewed revision 99954a30898bb5ddc8152ee10e124dc3b4106bf7: firebase-ai-logic-basics, firebase-auth-basics, firebase-firestore, firebase-security-rules-auditor, firebase-hosting-basics. All five are now visible in the skill catalog. See docs/skills.md for loading policy. Firebase MCP remains optional and unconfigured.

Framing artifacts exist: docs/spec.md (15 criteria), docs/PLAN.md (three slices), CONSTRAINTS.md (six thresholds). Phase 4 added frozen interfaces, fixture, pure domain validation/transition functions and verifier. Master re-executed 54 domain tests and 18 tooling tests successfully, including fixes to target identity, complete task shape validation, safe versions and fail-closed evidence. Verifier explicitly excludes unimplemented product checks; no Gate C/product completion claim.

Gate A APPROVED. Master re-executed the implemented manual-slice verifier on November16: typecheck/lint/build pass,54 unit tests,31 Rules tests,7 emulator-backed E2E tests and19 tool tests pass,2/2 diagrams render. Scoped ok=true; HEAD still unborn/dirty, Gate C not eligible and product gaps explicit. Build has an808.84kB JS chunk warning; no performance pass claimed. Five-card production Rules access-budget caching remains a documented risk, not proven by emulator alone.

Master independently exercised separate-profile UI on localhost through real emulator sign-in, memory-only private note, one reviewed task publication, sign-out/incoming sign-in, accept, resolve and reopen. State progressed v1→v2→v3→v4 with retained owner and resolution history; raw note cleared after sharing. Page errors were empty; console showed only Vite/React dev messages. Temporary synthetic auth-vault profiles removed and browser closed. PowerShell requires quoted '@eN' refs and agent-browser.cmd for password-stdin; guessed wait labels timed out without app failure, corrected by inspecting actual DOM/status.

Read-only local device probe: Acer Nitro AN515-54, approximately 15.8 GiB physical RAM. This is inventory, not evidence of sufficient local-model capability; GPU/available disk/browser/model eligibility remain unverified. Web mobile support does not establish Android-browser local inference; native Kotlin would reuse backend/domain contracts, not React UI.

## Current active work

- Implementer ses_e1ca82d8effe4fvhgQBd7tmy2a completed manual UI/emulator slice. Publication now uses transactions (not offline-queued batches), stable IDs/read-back and explicit retry. React Auth sessions and membership are real emulator-backed, not mock role switches. Master reran verifier/UI; manual screen-reader,200%zoom and real Android touch remain unverified.
- Implementer ses_e1ca58388ffeFsRI6wS6wYzf5w completed approved provisioning. Master independently reran repo-local projects:list and firestore:databases:get successfully: shiftrelay-hybridai-2026 is ACTIVE, display ShiftRelay, number1013230596333; (default) database STANDARD/FIRESTORE_NATIVE, us-east1, freeTier=true, PITR disabled. Implementer additionally verified Cloud Billing API billingEnabled=false and no linked account; this billing API check is reported by implementer, not re-executed by master. Only required Firestore API enabled by agent; no app registration, API key, seed data, Rules release or Hosting deployment. Firebase created an empty default Hosting site resource. Default-deny is documented platform behavior, not empirically client-tested. Provisioning evidence write under .git was permission-denied; complete sanitized report is in that child session and summarized here.
- Official docs rechecked through Context7: Gemini Developer API free tier requires Spark with no linked Cloud Billing account (https://firebase.google.com/docs/ai-logic/pricing); us-east1 is a supported Firestore regional location (https://firebase.google.com/docs/firestore/locations). Database location does not establish Gemini processing/data residency. Availability/quota/service prerequisites still require real checks.
- Implementer ses_e1b0acbe5ffeVKDDpHSW39qnE3 completed real pinned Gitleaks8.30.1 scanner and8regressions. Working tree/untracked/gitignored/build scan included, .git/node_modules excluded, findings redacted, no leaks. Its full rerun hit master preview-port collisions plus genuine gRPC advisories. Master stopped only owned preview process trees and independently verified patched audit/scanner afterward.
- Debugger ses_e1addfe3affesmR200a2KxP0FH completed scoped @firebase/firestore -> @grpc/grpc-js1.13.6 fix with full verifier12/12 checks passing; master inspected resulting report. No advisory suppression/downgrade.
- Debugger ses_e1ad2a6feffet0yB8UBPcnNUZ9 contained a generated Firebase CLI log that had dumped inherited host environment credentials during a failed emulator invocation. No staging, Git history or remote exposure occurred; credential values were never echoed. The emulator-only safe wrapper now passes a minimal child environment, rejects live operations, and scrubs residual env-dump diagnostics defensively. Full verifier12/12 passes with37tool tests; master reran scanner78files clean immediately before initial staging. Never use unwrapped emulator commands with inherited host credentials. Rotate credentials only if such a local log was externally shared; no external compromise established.
- User now requests continuous execution to finished product; continue local/AI/cloud configuration/review within existing free-only limits, without unnecessary routine approval prompts. Required specific public-deploy/merge/submission confirmations and real-world evidence cannot be waived or invented.
- Planner ses_e1b09fc31ffen0CJOCOVSacj43 completed docs/adr/0002-on-device-feasibility.md: stock Chrome157 exposes LanguageModel and English-text downloadable state on loopback and official-docs HTTPS; no download/generation/model identity/hosted-app proof. CPU route plausible, GPU4GiB not qualifying evidence. Exact Nano4 compatibility remains unresolved; no eligibility claim.
