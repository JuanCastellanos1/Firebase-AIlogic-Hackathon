# ShiftRelay — Three-slice implementation plan

Status: slice 1 manual workflow implemented locally (November 16, 2026), emulator-only; slice 2
strictly-local drafting implemented with mocked failure branches plus one real Chrome 157
download/ON_DEVICE request on localhost; slice 3 consented reconciliation contract, UI, pure tests,
labelled-mock browser tests and an unimplemented-live `ONLY_IN_CLOUD` adapter implemented locally
(November 17, 2026). Phase 5 then added the three explicit runtime modes, the dev-only live-local
runner, the build-output guard and one genuine consented `ONLY_IN_CLOUD` request from localhost
(November 17, 2026). No Hosting deployment, no Rules deployment, no App Check enforcement evidence
and no push/commit exist.
Skills applied: writing-plans and constraint-driven-development. Workflow-specified location and
three-slice checklist override skill defaults. No calendar or delivery-duration promise.

**Goal:** Demonstrate private capture → reviewed shared tasks → explicit ownership → recorded resolution/reopening, with genuine local drafting and separately consented cloud reconciliation.

**Architecture:** React/strict TypeScript/Vite static SPA with minimal semantic HTML/CSS and component state. Modular Firebase AI Logic/App Check/Auth/Firestore and Hosting; Rules enforce the domain contract, not client UI or AI. Private context lives only in page memory.

**Spec:** `docs/spec.md`; **quality contract:** root `CONSTRAINTS.md`; **stack and sources:** `docs/adr/0001-shiftrelay-stack.md`. Read all three before building. No unapproved implementation, installs, provisioning, commits, push, merge or deployment. Future commands and paths below do not exist yet.

## Shared execution rules and dependencies

- [ ] Master obtains G0/G4 approval, assigns people to checkpoint roles and confirms budget/effort. Native Android required means replan; responsive web is the default. Master reconciles operational `_project`, `_presupuesto`, HANDOFF and ADR status after this framing; planner does not overwrite those concurrent-owned files.
- [x] Gate A: approved by master after the implementer preflight created `scripts/check_diagrams.py`,
  used the pinned reviewed renderer and captured real render/check output before slice 1. Evidence:
  `.git/opencode/diagrams/` and `docs/verification.md` §1–§2, §5.4. Do not re-open Gate A for this
  slice; new diagrams still go through the same checker.
- [x] G6: official Firebase agent skills were reviewed, pinned to upstream revision
  `99954a30898bb5ddc8152ee10e124dc3b4106bf7`, authorized and installed; each task loads at most three
  relevant skills (recorded in `docs/skills.md` and `docs/verification.md` §3). Split Auth/Firestore,
  AI/App Check, Rules audit and Hosting into separate task contexts; do not blindly use ADR candidate
  names. Firebase MCP is optional, not a substitute for runtime use.
- [x] Phase 4: implementer authored `docs/ARCHITECTURE.md` and `docs/INTERFACES.md` from the spec,
  with fixture and contract review before code. Rules enforce publication/event coupling, ownership,
  versions and observation target checks within the documented limits (31 emulator cases); see
  `docs/ARCHITECTURE.md` §6/§8 for the measured budget and residual risks.
- [ ] Recheck official APIs via Context7, resolve compatible exact versions and runtime/emulator
  prerequisites, then request authorized tooling/setup. Firebase SDK/API pins for slices 1–3 are
  resolved and reviewed; the live-call prerequisites (G3 access/attestation/budget) and hosted model
  availability remain open. Do not invent a local model ID, pin a tutorial model or assume hosted
  availability.
- [ ] Every slice: write the named failing tests, record red, implement only that slice, run green + lint/typecheck/build, exercise a real UI path and update contracts/fixtures/docs together. Final `scripts/verificar.py` must aggregate checks with actual exit/output hashes per workflow; it is implementer-owned, not created here. Evidence goes to `.git/opencode/` only once repository state supports it; no fake commit SHA for unborn history.

## Review focus (pin tests in their owning slice)

1. A lost acknowledgment must not duplicate publication/events (slice 1, offline tests).
2. A role/membership change must clear session content and deny direct writes (slice 1, permissions/handover tests).
3. A valid-looking AI output can still invent facts or contain private asides (slice 2, bad-output and sentinel tests; human review stays required).
4. A late result must not repopulate a signed-out/edited/canceled session (slices 2–3, privacy/reconciliation tests).
5. Cloud comparison over a bounded subset must not be presented as exhaustive or merge unrelated records (slice 3, context and confirmation tests).

## Phase 4 — frozen contract paths (created November 16, 2026)

Phase 4 delivered the contract before any shared-data code. Files created or merged in this cut:

- `docs/ARCHITECTURE.md` — C4 level-1/level-2 boundaries as text tables, one sequence diagram, Rules request/read budget, diagram-budget reconciliation, residual risks R1–R5.
- `docs/INTERFACES.md` — frozen records, packet contract, transition matrix, activity coupling, error taxonomy, function signatures.
- `tests/fixtures/contrato.json` — machine-readable mirror of the contract (enums, limits, errors, transitions, Rules budget); drift-tested from `tests/validation.test.ts`.
- `tests/fixtures/handover.ts` — synthetic builders plus UTF-8 boundary string helpers.
- `src/domain.ts`, `src/validation.ts` — pure strict-TypeScript contract: no SDK import, no clock, no I/O.
- `tests/validation.test.ts`, `tests/transitions.test.ts` — 54 Vitest cases (ASCII, supplementary, combining, precomposed and mixed boundaries; every allowed and rejected transition; task-input contract and version headroom; immutability).
- `tsconfig.json` — strict, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noEmit`.
- `package.json` — merged: `typescript` `7.0.2`, `vitest` `5.1.0`, `vite` `8.3.8`, `@types/node` `24.19.2` added; the existing Mermaid pins (`@mermaid-js/mermaid-cli` `12.2.0`, `puppeteer` `25.17.0`) are unchanged. The later Rules cut added `firebase` `13.3.0`, `@firebase/rules-unit-testing` `6.0.0` and `firebase-tools` `15.36.0`.
- `scripts/verificar.py`, `tests/test_verificar.py` — evidence aggregator and its regression tests (15 after the Rules-cut scope update). The aggregator has no secret scanner: Q5 requires an authorized pinned scanner (Phase 7 removed the homegrown regex and records the gap). The Q5 cut below now provides that pinned scanner.
- `docs/verification.md` — updated with real red/green output and scope limits.

Not created in that Phase 4 cut, by design: `firestore.rules`, `firebase.json`, emulator config, React files, Firebase adapters, Playwright suites, `lint`/`build` scripts. The Rules cut below added the Rules, emulator config and the persistence adapter; React, Auth and Playwright remain open.

## Slice 1 manual UI cut (implemented November 16, 2026, emulator-only)

Delivered on top of the Rules/persistence cut, without a live project, deployment, commit or push:

- Contract/runtime: `src/domain.ts`, `src/validation.ts` (added `validateTask` for server reads),
  `src/tasks.ts` rewritten so publication is a transaction with stable-ID read-back rather than a
  `writeBatch` (a batch is persisted by the SDK and replayed after reconnection).
- Firebase/session: `src/firebase.ts` (explicit `demo-shiftrelay` + local emulators; in-memory Auth
  persistence; Firestore memory cache; non-demo/non-local configuration fails closed),
  `src/session.ts` (membership reads/watch, bounded task/activity reads, stale-result guard).
- UI: `src/main.tsx`, `src/App.tsx`, `src/PrivateDraft.tsx`, `src/Handover.tsx`, `src/styles.css`,
  `index.html`, `src/vite-env.d.ts`, `vite.config.ts`, `eslint.config.js`, `playwright.config.ts`,
  merged `tsconfig.json`, `.env.example`.
- E2E: `e2e/support.ts`, `e2e/global-setup.ts`, `e2e/handover.spec.ts`, `e2e/conflicts.spec.ts`,
  `e2e/offline.spec.ts`, `e2e/accessibility.spec.ts`, `e2e/privacy.spec.ts`.
- Rules/offline tests: `tests/rules/publication.test.ts` (lost-ack idempotence, ID conflict and
  read-back after a task advanced).
- Local operation/delivery: `scripts/seed-emulator.mjs`, `README.md`, Apache-2.0 `LICENSE`.
- Tooling pins: added React `19.3.1`, React DOM `19.3.1`, Playwright `1.65.1`, axe-core
  `4.14.0`, ESLint `10.15.0`, `@eslint/js` `10.0.1`, `typescript-eslint` `8.72.2`,
  `eslint-plugin-react-hooks` `7.1.1`, `globals` `17.14.0`, `@types/react` `19.3.0` and
  `@types/react-dom` `19.3.0`, all exact. TypeScript moved from `7.0.2` to `6.0.3` because
  `typescript-eslint` 8.72.2 rejects the TS 7 API; typecheck and lint now share the same supported
  compiler. Vite, Vitest, Firebase and the Mermaid pins are unchanged.
- Verifier: explicit `lint`, `build` and `e2e-tests` checks added; product/manual-accessibility/
  hybrid/live/credential-scanner gaps remain named as unimplemented.

Evidence and limits are in `docs/verification.md` §8. Still unimplemented in slice 1: no AI, no
cloud reconciliation, no App Check, no Hosting/deployment, no screen-reader/200%-zoom/Android-device
manual checks, no credential scanner and no AC15 product validation.

## Q5 credential scan and dependency audit (implemented November 16, 2026)

Replaces the named Q5 gap with a pinned upstream scanner and a real production audit. No
application, Rules or UI behavior changed; evidence and limits are in `docs/verification.md` §9.

- `scripts/scan_secrets.py` — runner for Gitleaks `8.30.1` (Windows x64), pinned to the official
  release asset `gitleaks_8.30.1_windows_x64.zip` with SHA-256
  `d29144deff3a68aa93ced33dddf84b7fdc26070add4aa0f4513094c8332afc4e` and binary SHA-256
  `17157e2ee8b76fc8b1d8bee607a250e34b8a8023c8bc81822d4b5ee4d78fcb7c`. `--install` downloads,
  hash-verifies and unpacks into `%TEMP%\opencode\tools\gitleaks\8.30.1\`; the binary is never
  committed and no service is installed. Missing or mismatching tooling exits 2 with the install
  command instead of reporting a pass.
- Scan scope: whole working tree plus `dist/` (untracked and gitignored files included), with only
  `.git` and `node_modules` excluded by Gitleaks' embedded default config. No project config and no
  allowlist: a repository `.gitleaks.toml` is rejected and `.gitleaksignore` lookups are pointed at
  an empty temp directory. The runner refuses to run without `dist/index.html`, without files, or
  when the scanner reports zero bytes, no report, an unexpected exit, or findings with exit 0.
- `tests/test_scan_secrets.py` — 8 regression cases: known-positive fixture fails with the value
  redacted everywhere, negative fixture passes, missing scanner fails closed, empty/missing input
  fails closed, gitignored/untracked inputs are scanned, a project allowlist is rejected,
  `.git`/`node_modules` exclusion, and the npm/verifier wiring. Fixtures are generated in the
  approved temp directory; the synthetic token is assembled at run time so the repository stores no
  credential-shaped literal.
- `package.json` — `scan:secrets` script (`py -3 scripts/scan_secrets.py`); `test:tools` includes
  the new suite.
- `scripts/firebase_safe.py` — emulator wrapper used by `test:rules` and `test:e2e`. It spawns the
  CLI with an explicit allowlist of Windows/profile/runtime variables plus the four test-read
  variables instead of inheriting the host environment, so host credentials never reach the child or
  its debug log; it refuses anything but `emulators:exec` against a `demo-*` project running
  `vitest`/`playwright`; and it still scrubs any `with environment {…}` payload from a leftover log
  as defense in depth. `tests/test_firebase_safe.py` proves the drop, the kill-before-scrub case
  with the pinned scanner, and the command guard. Incident and residual risk:
  `docs/verification.md` §9.6.
- `scripts/verificar.py` — new `secret-scan` (after `build`) and `dependency-audit`
  (`npm audit --omit=dev --audit-level=high`) checks, both required files, and a measured Q5 line
  instead of the static "not implemented" one. Q5 reviewer closure over the redacted report and the
  pre-deploy public artifact set stays listed as unimplemented.
- Evidence: `.git/opencode/secret-scan.json` (redacted: scanner, hashes, scope, findings, exit).
- Measured status: the scan is clean. The production audit first reported 4 high `@grpc/grpc-js`
  advisories through `@firebase/firestore` 4.20.0 and now reports `found 0 vulnerabilities` after a
  single exact-pinned, consumer-scoped override (`@firebase/firestore` → `@grpc/grpc-js` `1.13.6`,
  the lowest version outside both advisory ranges). No Firebase downgrade, no
  `npm audit fix --force`, no advisory suppression and no unrelated package was touched; the pin,
  the advisory ranges and the API-compatibility check are recorded in `docs/verification.md` §9.4.

## Slice 1 — Demonstrate a secure manual handover through closure

**Demo:** outgoing manually creates/reviews/shares three synthetic tasks; a separate incoming session accepts, resolves and reopens one; a second incoming test client loses a simultaneous acceptance race. No AI required to complete the core workflow.

**Dependencies:** G0/G4 scope/build permission, Gate A evidence, reviewed Phase 4 contract; G6 Auth/Firestore and Rules task prerequisites. Emulator-only work still requires setup authorization; real Auth/Firestore configuration requires G3. No deployment in this slice.

**Planned files (create unless already introduced by an authorized setup):**
- Tooling: `package.json`, `package-lock.json`, `index.html`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `vite.config.ts`, `vitest.config.mts`, `vitest.rules.config.mts`, `eslint.config.js`, `playwright.config.ts`, `firebase.json`, `firestore.rules`, `firestore.indexes.json`, `.env.example` (public configuration placeholders only), `src/vite-env.d.ts`. Merge `.gitignore`, never replace existing content.
- Contract/UI: `docs/ARCHITECTURE.md`, `docs/INTERFACES.md`, `src/main.tsx`, `src/App.tsx`, `src/styles.css`, `src/domain.ts`, `src/validation.ts`, `src/firebase.ts`, `src/session.ts`, `src/tasks.ts`, `src/PrivateDraft.tsx`, `src/Handover.tsx`. Keep private editor state out of data/session serialization.
- Tests/fixtures: `tests/fixtures/handover.ts`, `tests/validation.test.ts`, `tests/transitions.test.ts`, `tests/rules/support.ts`, `tests/rules/permissions.test.ts`, `tests/rules/concurrency.test.ts`, `e2e/handover.spec.ts`, `e2e/conflicts.spec.ts`, `e2e/offline.spec.ts`, `e2e/accessibility.spec.ts`, `e2e/privacy.spec.ts` (manual boundary first).
- Evidence/check contracts: `scripts/check_diagrams.py`, `scripts/verificar.py` (implementer writes later), `docs/verification.md` (reproduction steps and non-sensitive results); update spec/PLAN/constraints only to reflect approved decisions, not weaker checks.

**Produces:** reviewed packet validator, immutable shared fields, membership/session boundary, atomic publication with stable IDs, versioned accept/resolve/reopen + matching activity, denied direct writes, and reusable synthetic fixtures. Exact types/SDK interfaces are fixed in reviewed INTERFACES before code, not guessed as SDK APIs here.

**Implemented in the Rules/persistence cut (November 16, 2026), emulator-only:** `firestore.rules`, `firebase.json` (Firestore emulator, no hosting block), `firestore.indexes.json`, `src/tasks.ts` (batch publication and transaction adapter), `tests/rules/support.ts`, `tests/rules/permissions.test.ts` (25 cases), `tests/rules/concurrency.test.ts` (3 cases), and isolated `vitest.config.mts` / `vitest.rules.config.mts` so `npm run test:unit` never starts an emulator. The later manual UI cut added the Auth session, `src/firebase.ts`, `src/session.ts`, React UI, Playwright suites, lint, build and the publication/offline tests above. Evidence and limits are in `docs/verification.md` §7 and §8. No live Firebase access, provisioning, deployment or push exists.

- [ ] Write fixture and red validation/transition/Rules tests for AC01/02/07/08/09; include every allowed and rejected action, creation linkage, missing/forged activity and role escalation. Pin AC02's UTF-8 byte contract in both client and direct emulator tests: ASCII, supplementary `U+1F600`, combining `e` + `U+0301`, precomposed `U+00E9`, and mixed strings at/one byte over each shared-field cap, with identical verdicts and exact read-back. Do not use JS `.length` or Rules `String.size()` for byte limits, or normalize text silently; client rejects unpaired surrogates.
- [ ] Implement manual memory-only capture/preview, authenticated roles, Rules and transactions; no optimistic confirmed states, queues, private storage or telemetry.
- [ ] Add red then green two-session workflow, concurrent acceptance, offline/lost-acknowledgment retry and keyboard/narrow-layout tests (AC10/12). Test session loss/member revocation and publication idempotence.
- [ ] Create documented npm scripts matching the spec's command contracts. Run `npm run test:unit`, `npm run test:rules`, `npm run test:e2e -- e2e/handover.spec.ts`, conflict/offline/accessibility/privacy specs, `npm run typecheck`, `npm run lint`, `npm run build` and production dependency check. Never present mocked network failure tests as deployed access proof.
- [ ] Evidence: red/green outputs; emulator denied/allowed cases; exact race result (one owner/event); two-session UI walkthrough with console checks; memory/storage sentinel captures; accessibility scan and manual keyboard/screen-reader/zoom results; diagram render output. Aggregate via `py -3 scripts/verificar.py --report .git/opencode/evidence.json` when available. No slice completion if a critical check is skipped.

## Slice 2 — Demonstrate genuinely local private drafting with safe manual fallback

**Demo:** explicit local setup/generation on a verified desktop turns synthetic messy notes into editable draft cards; remove a private aside and share through slice 1. Show local-unavailable/failing state with the same usable manual workflow and no upload.

**Dependencies:** slice 1 contracts and green checks; G1 exact Nano 4/hardware and G2 origin feasibility before local/hybrid claims; G6 AI Logic/App Check skill review/adoption; G3 for authorized runtime App Check configuration. A failed feasibility checkpoint goes to master, not an automatic cloud substitute.

**Files:** create `src/localDraft.ts`, `src/aiValidation.ts`, `tests/ai-output.test.ts`, `e2e/local-draft.spec.ts`; extend `src/PrivateDraft.tsx`, `src/validation.ts`, `src/firebase.ts`, `tests/fixtures/handover.ts`, `e2e/privacy.spec.ts`, `e2e/accessibility.spec.ts`, `docs/INTERFACES.md`, `docs/verification.md`, and verification aggregation. No native files, new service or persistent private collection.

**Consumes/produces:** consumes slice 1 allowlisted reviewed-card contract; produces only validated memory draft proposals and capability/error states. Local adapter never invokes cloud, shares, assigns or resolves tasks.

- [x] Write failing tests for AC03/04/05: UTF-8 byte schema/response boundaries including
  supplementary and combining text; valid private UTF-16 source offsets that do not split surrogate
  pairs; refused/oversized/injected output, download/unavailable/error state, manual preservation,
  late result/session invalidation. Red was a missing `../src/aiValidation` module in
  `tests/ai-output.test.ts`; the 17-case suite is now green and the E2E capability cases pass.
- [x] Implement explicit strictly-local setup/request and editable suggestions, with no prefer-local
  fallback. Discard stale responses, retain human review and construct a fresh publication object.
  `src/localDraft.ts` uses `getAI`/`getGenerativeModel` with `InferenceMode.ONLY_ON_DEVICE` and
  re-checks `availability` after `initializeDeviceModel`; `PrivateDraft` exposes unsupported,
  downloadable, downloading (progress), ready and error states, and replaces cards only through an
  explicit "use suggestions" action.
- [x] Run named local-draft/privacy/AI-output suites plus regression suite, typecheck/lint/build.
  Unit/browser capability mocks are useful only for failure branches, clearly labeled. Added
  `tests/ai-output.test.ts`, `e2e/local-draft.spec.ts`, plus privacy endpoint assertions and an
  accessibility scan of the local controls. The real Chrome evidence below is not mock evidence.
- [ ] Device-test implementer follows AC13 on actual installed supported desktop Chrome, localhost
  and authorized HTTPS origin; records device/OS/browser/SDK, model compatibility provenance,
  observed local source, enablement and download behavior. Run sentinel checks during
  success/failure/manual fallback; retain sanitized captures without credentials/prompt logging.
  Hosted testing needs explicit setup/deploy authorization, not granted by this plan.
  **Slice 2 progress:** real Chrome `157.0.8103.78` on Windows 10, localhost origin, downloaded
  component `nano_v3_gpu_component` `2025.8.8.1141` (4.27 GB weights) and made one genuine Firebase
  AI Logic `ON_DEVICE` request that produced five reviewed cards; no AI endpoint request was
  observed, storage stayed empty and the note cleared on sign-out. **Still open:** hosted HTTPS,
  exact Nano 4 identity/provenance, App Check, manual unsupported-chrome path and cloud comparison.
- [ ] Evidence: actual local request + authoritative exact-model compatibility, no-private-content
  network/storage/log captures, manual fallback walkthrough, regression results and any unresolved
  compatibility discrepancy. If only mocks or localhost work, mark genuine hosted-local capability
  **unverified/no-go**, not complete. **Recorded:** real localhost request, sentinel/network/storage
  observations, mock-labelled fallback suite and green regressions. **Not met:** authoritative exact
  Nano 4 compatibility. Exact model identity remains **UNKNOWN**, so the hosted-local and eligibility
  claim is **unverified/no-go**; see `docs/verification.md` §10.

Implemented files in this cut: `src/localDraft.ts`, `src/aiValidation.ts`,
`tests/ai-output.test.ts`, `e2e/local-draft.spec.ts`; extended `src/PrivateDraft.tsx`,
`src/firebase.ts` (local demo `appId` only), `src/styles.css`, `tests/fixtures/contrato.json`
(`localDraft` block), `e2e/privacy.spec.ts`, `e2e/accessibility.spec.ts`, `docs/INTERFACES.md` §9,
`docs/verification.md` §10 and `scripts/verificar.py`. No dependency, service, storage collection,
cloud call or deployment was added.

## Slice 3 — Demonstrate separately consented cloud reconciliation and honest delivery evidence

**Demo:** reviewed projector/supply tasks from successive handovers yield a real source-linked duplicate/contradiction suggestion and incoming brief; a human confirms or dismisses without automatic state/owner changes, then accepts/resolves. Declining cloud gives the same manual ownership path.

**Dependencies:** slices 1–2, G3 approved cloud model/access/budget/judging window, G6 AI Logic/App Check and later Hosting skill tasks, G5 coordinator access/value checkpoint. Production/public availability and deployment need separate master/user authorization. Do not treat a mock as real cloud/hybrid evidence.

**Files:** created `src/reconciliation.ts`, `src/cloudReconcile.ts`, `src/CloudReconciliation.tsx`,
`tests/reconciliation.test.ts`, `e2e/reconciliation.spec.ts`; extended `src/App.tsx`,
`src/session.ts`, `src/Handover.tsx`, `src/styles.css`, `src/vite-env.d.ts`,
`tests/fixtures/contrato.json`, `tests/test_verificar.py`, `e2e/support.ts`, `scripts/verificar.py`,
`docs/INTERFACES.md`, `docs/ARCHITECTURE.md`, `docs/verification.md`. `src/Reconciliation.tsx` cannot
coexist with `src/reconciliation.ts` on a case-insensitive filesystem (TypeScript rejects a
case-only file-name clash), so the UI component is `src/CloudReconciliation.tsx` and the real SDK
adapter is the separate `src/cloudReconcile.ts`.
`docs/PUBLISH.md` and license changes remain open for their authorized delivery step. No Rules change
was needed: the existing `observe` transition and Rules already enforce exact observation updates,
target-version checks and the coupled activity, and its suites already cover them.

**Consumes/produces:** consumes only current authorized published task snapshots; produces validated ephemeral proposals and one human-confirmed versioned observation activity, never merged records or automatic task writes. Preview, one-shot consent, request and late-result invalidation share an exact immutable snapshot.

- [x] Write failing AC04/06/11 tests: context selection at >20, distinct consent, packet equality,
  stale source/target, invalid identifiers/schema, refusal/quota/timeout, cancel/sign-out and late
  responses. Red was a missing `../src/reconciliation` module for 20 new unit cases; the browser
  suite then failed for real causes (a `failWith: null` test double wrongly treated as a failure, and
  shared emulator state making the >20 bound nondeterministic) before going green. No extra Rules
  test was added because `tests/rules/permissions.test.ts` and `concurrency.test.ts` already assert
  the observation transition, target-version checks and forged-event denials.
- [x] Implement bounded preview + explicit cloud action, validated suggestions and manual
  confirm/dismiss; no automatic retry, raw source, telemetry, owner changes or destructive merge.
  Confirm rejects stale versions instead of silently recomputing consent or intent.
- [ ] Run all unit/Rules/E2E checks, typecheck/lint/build, dependency review and constraint checks.
  Done in this cut: typecheck/lint/build, 91 unit, 20 E2E (including the consented flow), Rules
  suites, dependency audit and secret scan via the verifier. Still open: real Android Chrome touch,
  screen-reader and 200%-zoom walkthrough; mobile emulation alone does not establish actual device
  support.
- [ ] Complete AC13 real hosted hybrid protocol with App Check enforcement and approved real cloud model. Repeat sentinel/packet capture, denied/failed consent and end-to-end closure. Record local and cloud source/model provenance separately; privacy evidence must not expose tokens or credentials.
- [ ] Product lead completes AC15 two-coordinator comparison, times the three-task acceptance path and records cloud utility against deterministic matching. Master closes G5 or explicitly records no-go/unvalidated product claims; do not invent impact or interview results.
- [ ] Prepare reproducible setup/judge-access/rollback instructions, license/public-repository review, English public demo <=3 minutes and availability plan through December 16. Private credentials use separately approved access instructions; no live secrets or demo passwords in source/build/public materials. A limited sprint quota alone is insufficient.
- [ ] Evidence: all actual verifier outputs + reviewed commit/clean-tree evidence when history exists, sanitized hosted network checks, real runtime provenance, device/accessibility results, representative-user decision and authorized delivery walkthrough. Reviewer/master close subsequent gates; this checklist grants no commit/push/merge/deploy permission.

Implemented in the slice 3 cut (November 17, 2026, local only): the frozen reconciliation contract in
`docs/INTERFACES.md` §10 and `contrato.json` `reconciliation`; the pure selection/consent/validation
module; the `ONLY_IN_CLOUD` adapter with the explicit free-tier model `gemini-3.5-flash-lite` and a
`notconfigured` demo default; the optional UI panel with exact preview, visible >20 context selection,
one-shot approval, one in-flight request, cancel/sign-out/late-result invalidation, confirm (one
`observe` activity) and dismiss (no write); observation history display; and 20 unit plus 6
emulator-backed E2E cases. No live cloud request, App Check enforcement, Rules change, Hosting or
deployment was produced; every cloud response in the suites is a labelled `test-network-mock`.

## Phase 5 — live configuration modes and one consented cloud request (November 17, 2026)

Unattended slice: safe live Firebase/Auth/App Check configuration with exactly three explicit modes, a
dev-only path for the outside-root private values, a build-output guard, and one genuine consented
`ONLY_IN_CLOUD` request. No Rules change, no billing, no deployment, no commit, no push.

- `src/runtimeConfig.ts` (new) — pure resolver for `emulator` (default on a local host),
  `live-local` (local host plus the dev runner flag and every allowlisted value), `hostedQA` (one of
  the two approved Hosting origins, config read at runtime from `/__/firebase/init.json`). Fail-closed
  `RuntimeConfigError` codes, no fallback, no value in any message. Frozen in `docs/INTERFACES.md`
  §11 and mirrored in `contrato.json` `runtime`.
- `src/firebase.ts` — one `initializeApp` per mode; emulator wiring unchanged; live modes keep
  in-memory Auth persistence and the Firestore memory cache; App Check is initialized during module
  import (before any AI call) with reCAPTCHA Enterprise in a hosted build and the registered debug
  token in `live-local`. The debug-token assignment exists only in a development build.
- `src/cloudReconcile.ts` — the labelled `test-network-mock` double is reachable only in a development
  build; `emulator` still reports `notconfigured`; the two live modes use the real adapter.
  `src/main.tsx` imports the app dynamically so a rejected configuration renders a closed message and
  initializes nothing.
- `vite.config.ts` refuses a build when any live-only value name is present in the build environment
  (a Vite build would otherwise inline it); `scripts/check_dist.py` (new, `dist-guard`) refuses a
  `dist/` containing an API-key literal, a UUID-shaped debug-token literal, the test hook, the private
  configuration path or a QA credential name.
- `scripts/dev_live_local.py` (new) reads the outside-root private file, accepts allowlisted names only
  (including entries the file keeps commented out), rebuilds the child environment from a
  Windows/runtime allowlist, binds `127.0.0.1:5173` with no CORS headers, prints no value, and refuses a private file inside
  the repository, a missing/blank value, a wrong project/app, or a malformed key shape.
- Tests: `tests/runtime-config.test.ts` (23 cases: mode selection, every required name, wrong
  project/app, unknown origin, hosted payload validation and unavailability, value-free failures,
  fixture drift), `e2e/runtime-modes.spec.ts` (the default build has no App Check, no debug-token
  global, no live config fetch and no cloud host contact), `tests/test_dev_live_local.py` (12 cases) and
  `tests/test_dist_guard.py` (8 cases). Red recorded for the runner and the guard modules before they
  existed.
- `tests/build-env.test.ts` (3 cases, B2): `src/firebase.ts` references only the names the resolver
  reads, so a real production `vite build` into an approved temporary directory embeds no synthetic
  unrelated `VITE_*` sentinel; the build refuses a live-only value supplied through `process.env` or
  a `.env` file, name only, never the value. The guard reads the resolved env, so dotenv cannot
  bypass it.
- Measured: 114 unit tests (5 files), 21 emulator-backed E2E tests, 57 tool tests, typecheck, lint,
  build, `dist-guard`, the pinned secret scan and the production dependency audit. One genuine
  consented live request: App Check debug exchange 200, `firebasevertexai.googleapis.com` `POST
  .../models/gemini-3.5-flash-lite:generateContent` 200, `inferenceSource in_cloud`, 161 response
  bytes, 1.9 s, with the exact approved packet shown first. A fresh browser session signed in with a
  synthetic QA identity (identitytoolkit 200) and the venue membership read was denied by the current
  closed Rules, which is the expected external blocker.
- Open and honest: App Check *enforcement* is not demonstrated — a second request from an app instance
  with no App Check initialization was accepted (200) instead of rejected, so no rejection evidence
  exists; in-app cloud comparison needs the reviewed Rules deployed (explicitly not done here);
  `hostedQA` needs an empirical check of the reserved JSON endpoint and a hosted reCAPTCHA-attested
  request after the gated deployment; the first call's quota/latency is a single sample. The App Check
  debug SDK logs the debug token to the local console by design; that is dev-only and excluded from
  builds, and captures must not reproduce it.

## Current verification and Gate A

Implementer preflight (authorized November 16, 2026) added local tooling only: `package.json`/`package-lock.json` pin `@mermaid-js/mermaid-cli` 12.2.0 with `puppeteer` 25.17.0, `scripts/check_diagrams.py` renders with that pinned CLI, `tests/test_check_diagrams.py` holds its regression tests, and `docs/verification.md` records real commands and exits. Gate A evidence exists at `.git/opencode/diagrams/docs__spec-1.svg` and `.git/opencode/diagrams/docs__ARCHITECTURE-1.svg`, and master approved Gate A; `docs/HANDOFF.md` records the approval. The two-diagram budget is unchanged.

The preflight paragraph below is historical. It describes the repository before the approved Gate A
render/checker evidence existed: at that time no application, scripts or `node_modules` were present,
`mmdc`/`scripts/check_diagrams.py` were absent and Gate A was pending. That is no longer the current
state; the approved Gate A evidence above supersedes it. Later slices re-render both diagrams through
the same checker in every verifier run.

## Phase 7 fix — derived activity IDs (November 17, 2026)

Pre-QA blocker B1, reproduced in the local Firestore emulator before the change: a valid
64-character task ID produced a 68-character creation activity ID and Rules rejected the
publication because `isId` capped every activity ID at 64 characters. The task/venue/user
identifier cap stays 64; only the derived activity ID validation changed.

- `firestore.rules` — `isDerivedActivityId(value, taskId, version)` requires exact
  `"{taskId}__v{toVersion}"`; the derived ID is bounded at 83 characters (64 + `__v` + a 16-digit
  safe version) and no longer uses the free-form `isId`. Forged suffix, task ID or version still
  fails because the derivation cannot match.
- `docs/INTERFACES.md` §1/§4 and `tests/fixtures/contrato.json` (`activityIdMaxLength: 83`) state
  the same contract; `tests/validation.test.ts` fails on drift.
- `tests/rules/derived-activity.test.ts` (new, 6 emulator cases): 64-character publication plus
  accept, resolve and reopen with matching events; an 83-character derived ID at the safe-integer
  version ceiling; UUID unchanged; a 65-character task ID rejected client-side and at Rules;
  forged activity IDs denied. Two cases were red before the Rules change and all six are green
  after it.
- Measured: 115 unit, 37 Rules (4 files), 21 E2E and 57 tool tests; typecheck, lint, build,
  dist-guard, secret scan and the production dependency audit pass. Full verifier reported
  `ok=True` and `GATE_C: NOT ELIGIBLE` because the tree is intentionally dirty and 8 scope items
  remain unimplemented.

## Phase 8 — reviewed-candidate build and Hosting preparation (November 17, 2026)

Preparation only: no deployment, commit or push, and no cloud call. The deploy itself stays with a
delegated release agent after independent review and green CI.

- `firebase.json` — added the minimal `hosting` block: `public: "dist"`, one SPA rewrite to
  `/index.html`, and four response headers. The `Content-Security-Policy` covers
  `default-src 'self'`, `script-src` for `https://www.google.com/recaptcha/` and
  `https://www.gstatic.com/recaptcha/`, `connect-src 'self' https://*.googleapis.com` plus the
  reCAPTCHA host, `frame-src` for `https://www.google.com/recaptcha/` and
  `https://recaptcha.google.com/recaptcha/`, and `object-src`/`base-uri`/`frame-ancestors 'none'`.
  No `unsafe-eval`, no `unsafe-inline`. Also `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin` and `X-Robots-Tag: noindex, nofollow` for QA.
  No `.firebaserc` was added, so every command must name `--project shiftrelay-hybridai-2026`.
- `scripts/release_prep.py` (new) — `build` reads only the public reCAPTCHA Enterprise site key
  from the outside-root private file, rebuilds the child environment from
  `scripts/dev_live_local.py`'s Windows/runtime allowlist plus that single name, and then runs the
  dist guard, the pinned Gitleaks runner and the production dependency audit. `stage` copies only
  `dist/**`, `firestore.rules`, `firestore.indexes.json` and `firebase.json` into a temporary
  directory outside the repository and prints the two `firebase deploy` commands; it refuses a
  dirty tree, evidence that is not `ok=true`/`dirty=false`/`tree_stable` for HEAD, an unknown
  project, or a stage inside the repository. Nothing is executed by the helper.
- Scanner classification instead of an allowlist: the keyed artifact contains exactly one
  `generic-api-key` finding, the public site key the build itself inserts next to
  `VITE_FIREBASE_APPCHECK_SITE_KEY`. The helper re-runs the unchanged scanner, accepts only that
  one finding when the reported `dist/` line contains the public value, and fails on any other
  rule, a second finding, a location outside `dist/`, or an unreadable location. No
  `.gitleaks.toml`, no `.gitleaksignore`, no redaction change, no obfuscation. The keyless
  `npm run build` artifact that the verifier scans stays clean.
- `package.json` — `build:qa` and `release:stage` scripts; `test:tools` now includes
  `tests.test_release_prep`.
- `tests/test_release_prep.py` (new, 17 cases) — site-key extraction from the commented private
  block, missing/wrong shape refusal without echoing values, child-environment allowlist (no API
  key, debug token or QA password, no `VITE_FIREBASE_LIVE_LOCAL`), no value on argv, build failure
  stopping before the artifact checks, fixed check order and fail-fast behaviour, the single
  public-site-key classification and its refusals, the sealed-stage copy set and every fail-closed
  gate, the `firebase.json` hosting/CSP shape, the absence of `.firebaserc`, and the npm/verifier
  wiring.
- `scripts/verificar.py` — `scripts/release_prep.py` and `tests/test_release_prep.py` are required
  artifacts. No new check was added: the tooling suite covers them, and `build:qa` cannot run in
  CI because the private file does not exist there.
- `.github/workflows/verification.yml` — authored and statically checked only, still uncommitted
  and never run. It stays keyless: it runs the repository verifier with `npm run build`, no cloud
  credentials and no deploy step.
- `README.md` — rewritten to the actual three features, three modes, commands, QA build/stage
  helpers, privacy rules (private credential channel for the synthetic judge identities) and the
  verified/unverified split.
- `docs/PUBLISH.md` — updated for the real hosting block, the helpers, the verified App Check
  enforcement (service `firebaseml.googleapis.com`, controlled 401 probes), Rules rollback by
  redeploying the last known-good ruleset, the still-unproven `/__/firebase/init.json` path and the
  demo script's real Nano 4/cloud evidence versus the pending hosted/Android/screen-reader/AC15
  checks.

Measured in this cut: 17 new tool tests (74 tool tests total), typecheck, lint and the keyless
build pass; `npm run build:qa` produced the keyed artifact and its three gates passed with the one
classified public-identifier finding; `npm run release:stage` refused the intentionally dirty tree.
`firebase deploy` was never run and no Hosting or Rules resource was touched.
