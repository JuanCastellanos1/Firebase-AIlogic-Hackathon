# ShiftRelay — publication, QA release and delivery

Phase 8 delivery artifact, written November 17, 2026. **No deployment had been executed when this
paragraph was written (superseded November 20, 2026 — see the dated corrections below):** no
Hosting release, no Firestore Rules release, no GitHub Actions run and no video existed. The reviewed
`hosting` configuration, the keyed QA build and the sealed-stage helper were local artifacts only.
Every step below is either marked *verified* with the artifact that proves it, or *planned* and
still owned by master/`github-sync`/the delegated release agent.

**Dated correction — November 19, 2026.** Two statements in this paragraph and in the table below
were accurate when written and are superseded: CI has run. Real GitHub Actions run `44222898293`
completed with `conclusion: success` for `b0910d32f7cd6403ccb59419613eadfa0fe40c83` (master re-read
the public REST metadata on November 19, 2026), and `.github/workflows/verification.yml` is tracked.
The earlier "never run / untracked" claim came from the pre-commit WIP state. That run covers only
the source at `b0910d3`; it does **not** validate the WIP commit `dbd217c` or these review fixes, so
a green run on the exact reviewed commit is still required before merge. Deployment and video remain
absent.

**Dated correction — November 20, 2026 (first limited QA deploy executed).** A first Firestore Rules
and Hosting release now exists, so every "never deployed" statement in this file is dated history, not
current state. Both deployments were run from the sealed stage for the reviewed, CI-green source
`00c2b2ed78b1f43b01da430d7cca14699757d077` (`00c2b2e`; CI run `44664598466`,
`conclusion: success`). The later local commit `803670724ba2a6c939bd986bb7b41b1d84e6c4ac` is the
documentation-only recovery record and was **not** deployed. Real results are in §5.1 and in the
sanitized private report
`C:\Users\acer\AppData\Local\Temp\opencode\shiftrelay-release-run-20261119\deploy-report.md` (temp
storage, disposable; it holds no API key, site key, token, password or reserved config value). Only the
HTTP surface was observed: browser Auth, console/CSP, reCAPTCHA token exchange, model calls and app
flows have no result yet, and no recovery was executed.

**Dated correction — November 20, 2026 (bounded hosted QA reconciled).** Four bounded delegated runs
now cover hosted manual ownership, hosted local drafting, desktop zoom/keyboard and Android emulator
touch; §5.2 records exactly what each produced and what it did not, and §13/§14 were corrected
accordingly. They close no delivery group: the eight static verifier items remain open
(`gate_c_eligible=false`), and no complete screen-reader result, hosted-attestation result or AC15
result exists; no physical-device run was made, which is a recorded limit rather than an AC12
requirement. The full per-group mapping, provenance and remaining blockers are in
`docs/verification.md` §17.

Status legend: **verified** = an existing report or file says so, cited inline; **planned** = a
documented command or checklist not yet run; **blocked** = needs a decision, a review or hardware.

## 1. Current status

**Dated update — November 20, 2026.** The `Implemented-code checks`, `Test totals` and
`scripts/verificar.py` gate rows below were reconciled to the clean checkpoint `a7711cd` recorded in
`docs/verification.md` §15.7.
The working tree is dirty again because of later documentation edits, so that report certifies
`a7711cd` only, not those edits, a future commit, or any release. Both fix reviewers have since
approved the fix cut at `a7711cd` (D1–D4/U1 closed, no blockers); clean evidence for the final
operational commit is still pending, so Gate C and Gate D remain unapproved.

| Item | Status | Evidence |
|---|---|---|
| Implemented-code checks (16) | verified at the clean checkpoint `a7711cd` (November 20, 2026) | `.git/opencode/evidence.json`: `ok=true`, `commit=a7711cd233303371cc71493b47b0a66061b41953`, `dirty=false`, `status=[]`, `tree_stable=true`, `scope.complete=true`, all 16 checks `exit=0`, `finished_at=2026-11-20T02:22:47Z` (`docs/verification.md` §15.7) |
| Test totals | last **counted** on the earlier dirty run (§15.6), not re-counted at the checkpoint | 121 unit (7 files, incl. 17 ai-output, 20 reconciliation, 24 runtime-config), 41 Rules, 21 E2E, 84 tool tests, 2 diagrams, pinned Gitleaks clean, production audit 0 vulnerabilities — measured on `dbd217c` plus the fix working tree. The `a7711cd` report stores per-check `exit`/`duration_ms`/`stdout_sha256`, not per-suite counts, so no total is claimed for it |
| Local drafting (ONLY_ON_DEVICE), v4 model path | verified once, loopback | isolated Chrome 157, `gemma4_component` 2026.8.7.929, `gemma4_gpu_low_tier_model` (`gemma4-2b-it`), genuine 5-card generation (`docs/adr/0006-nano4-runtime-proof.md`) |
| Earlier local drafting run | verified once, **not** Nano 4 | component `nano_v3_gpu_component` 2025.8.8.1141, localhost only (`docs/verification.md` §10) |
| Consented cloud request from localhost | verified once | `gemini-3.5-flash-lite`, `inference_source in_cloud`, 161 bytes, 1912 ms, App Check debug exchange 200, `.git/opencode/live-config-evidence.json` (`docs/verification.md` §13.3) |
| App Check **enforcement** | verified: `ENFORCED` for `firebaseml.googleapis.com`; valid `200`, missing/garbage `401` | controlled probes through the AI Logic proxy (`docs/adr/0007-appcheck-enforcement.md`) |
| Hosting config, keyed QA build, sealed stage | implemented and locally exercised; **never deployed** | `firebase.json`, `scripts/release_prep.py`, `tests/test_release_prep.py`, `docs/verification.md` §14 |
| Hosting / Rules deployment | not performed before 2026-11-20; **first limited QA deploy executed** on that date (§5.1) | `docs/verification.md` §16; private report `deploy-report.md` |
| Firestore Rules + indexes release | **verified** November 20, 2026, `03:51:56Z` | release `projects/shiftrelay-hybridai-2026/releases/cloud.firestore`; ruleset `137c406c-59b1-4081-96e3-4d810f358663` (19354 bytes, LF-normalized `0b877ada…` = reviewed content) |
| Hosting release | **verified** November 20, 2026, `03:52:33Z`, 5 files byte-identical to the sealed stage | release `sites/shiftrelay-hybridai-2026/releases/1795146753235000`, version `sites/shiftrelay-hybridai-2026/versions/38fe83ad84b89cf9`, `FINALIZED` |
| Hosted HTTP surface | **verified HTTP only** (status, headers, `init.json`, asset bytes); browser Auth/CSP/reCAPTCHA/model/flows not observed in §5.1 | §5.1; browser-dependent checks stay *planned* there and are only partly covered by §5.2 |
| Bounded hosted QA runs (manual ownership, hosted local model, desktop zoom/keyboard, Android emulator) | **partial**: each run limited to the states it names; inspected delegate reports, not master replays; no delivery group closed | §5.2; `docs/verification.md` §17 |
| GitHub Actions | verified once, **not for the WIP commit**: run `44222898293` succeeded for `b0910d32f7cd6403ccb59419613eadfa0fe40c83` (REST metadata re-read November 19, 2026). The workflow is tracked; the earlier "never run / untracked" entry described the pre-commit WIP state | `.github/workflows/verification.yml`; the run predates `dbd217c` and these review fixes |
| `scripts/verificar.py` gate | `GATE_C: NOT ELIGIBLE` | single reason at the clean checkpoint: `8 scope items unimplemented`; `dirty working tree` is no longer listed (`.git/opencode/evidence.json`: `gate_c_eligible=false`, `gate_c_reasons`) |

## 2. Actual cloud target

| Fact | Value | Source |
|---|---|---|
| Project | `shiftrelay-hybridai-2026` (number `1013230596333`) | `docs/adr/0003-cloud-ai-setup.md` |
| Plan | Spark, no billing account (`billingEnabled: false`) | ADR 0003, ADR 0004 |
| Firestore | `(default)`, `FIRESTORE_NATIVE`, Standard edition, `us-east1`, `freeTier=true`, PITR disabled | `docs/HANDOFF.md`, `docs/_project.md` |
| Web app | exactly one: `1:1013230596333:web:a0b89365ee59732eb85ce4` (`ShiftRelay Web`) | ADR 0003, ADR 0004 |
| Hosting sites | `shiftrelay-hybridai-2026.web.app`, `shiftrelay-hybridai-2026.firebaseapp.com` | ADR 0004 |
| Cloud model | `gemini-3.5-flash-lite` (free-tier, SDK default) | ADR 0003, `src/cloudReconcile.ts` |
| Runtime modes | `emulator` (default, local only), `live-local` (localhost + dev runner), `hostedQA` (the two Hosting origins only) | `src/runtimeConfig.ts`, `docs/INTERFACES.md` §11 |
| Hosting config | `public: "dist"`, one SPA rewrite, CSP + nosniff + referrer policy + `noindex` header; no `.firebaserc` | `firebase.json` |

Region note: `us-east1` is a supported Firestore location; it does **not** establish where Gemini
processing happens.

## 3. Reproducible candidate-release checklist (local)

Prerequisites: Node 24.14.0/npm 11, Java 21 (Firestore emulator), Python **3.13 or newer** (`py -3`),
the pinned Chromium, and the pinned Gitleaks asset installed. Exact pins: `package.json`; CI mirrors
them. CI installs Python 3.13 (`.github/workflows/verification.yml` itself enforces
`sys.version_info >= (3, 13)`); the QA host that produced the November 20, 2026 reports resolved
`py -3` to CPython 3.15.2, so 3.13 is a floor, not an exact local pin.

```powershell
npm ci
npx playwright install chromium
npm run scan:secrets -- --install
py -3 scripts/verificar.py --report .git/opencode/evidence.json
git status --short
git clean -ndx
```

Accept as a candidate only if all of the following hold, and quote the run, not this file:

1. `ok=true`, every check `exit=0`, `scope.complete=true`, and full unique executed coverage: all 16
   current check names present, each exactly once — no missing, unexpected, or duplicated record. A
   `--only` run sets `scope.complete=false` and is never release evidence.
2. `commit` equals the reviewed commit and `dirty=false` (a dirty run is not release evidence; the
   November 20, 2026 checkpoint met both conditions for `a7711cd` and Gate C was still
   `NOT ELIGIBLE` for the eight scope gaps, so a clean report is not release approval).
3. `GATE_C` still reports the 8 unimplemented scope items — they are named, not waived
   (`scripts/verificar.py` `SCOPE.unimplemented`).
4. Independent review of the full relevant code and of the sanitized evidence is recorded.
5. The pinned secret scan is clean over the working tree **and** `dist/`, and `guard:dist` passes.
6. The keyed artifact is produced only by `npm run build:qa` after the reviewed commit, and its
   three gates pass. The keyed bundle contains the public reCAPTCHA site key, so the helper requires
   exactly one `generic-api-key` finding inside `dist/`, then re-scans an isolated byte-identical copy
   in which **only** the exact quoted public-site-key literal is replaced by a public test marker:
   zero residual findings and unchanged other bytes are the proof, so a genuine secret that merely
   shares the reported minified line still fails. The scanner is unchanged (no allowlist, no ignore,
   no rule edit); any other finding, rule, location or literal count fails. Rebuild keyless with
   `npm run build` before a manual `npm run scan:secrets`, because that manual scan does not classify
   the public value.
7. Only then: `npm run release:stage` (refuses a dirty tree or evidence for another commit) prints
   the deploy commands; a delegated release agent runs them from that sealed stage.

Known pre-existing artifact to remove before staging: root `firestore-debug.log` (emulator debug
output, not tracked, ignored by git).

## 4. Review and CI requirements

- **Review**: independent reviewer(s) read the full relevant source and `.git/opencode/*evidence*.json`;
  blocking findings are fixed and re-reviewed before any deployment. Reviewer also closes Q5 by
  inspecting the redacted scan report and the pre-deploy public artifact set.
- **CI**: `.github/workflows/verification.yml` runs `py -3 scripts/verificar.py` on `windows-2025`
  with `permissions: contents: read`, pinned actions, pinned Node/Python/Java, no cloud credentials
  and no deploy step; it uploads only sanitized evidence (7-day retention). It must be committed and
  pushed by `github-sync` on the feature branch, and **green on the exact reviewed commit** before
  merge. A green run is implemented-code evidence, not device proof (Gemini Nano 4, Android hardware
  and hosted QA are out of its scope, as the workflow comments state).
- **PR/merge**: `github-sync` opens the PR against `main` (default branch, restored and verified in
  `docs/_project.md`), never pushes to `main`; master never pushes. Merge after gates + green CI plus
  explicit user approval.

## 5. QA release (authenticated)

**Status: the deployment step is executed (November 20, 2026, §5.1); the browser/QA evidence step is
not.** The section body below is the pre-deploy plan, kept as written; §5.1 records what actually
happened.

User-approved sequence: authenticated QA deployment **after** code review + automated checks, to
collect live evidence; the final reviewed release/PR merge comes after the remaining gates and CI.

Preconditions, all required:

1. Reviewed commit SHA; `ok=true`, `dirty=false`, `scope.complete=true` verifier run covering all 16
   checks uniquely (a `--only` run never qualifies); green CI; reviewer sign-off.
2. `firebase.json` now has the `hosting` block (`public: "dist"`, one SPA rewrite to
   `/index.html`, a CSP restricted to the official Firebase SDK, AI Logic and reCAPTCHA Enterprise
   hosts, plus `nosniff`, a referrer policy and `noindex`). There is deliberately no `.firebaserc`,
   so every command must name `--project shiftrelay-hybridai-2026`. The CSP is **not yet exercised
   on a hosted origin**; the post-deploy check below must include a console/CSP error check, and a
   needed directive is fixed by a reviewed change, never by adding `unsafe-eval`.
3. A production build carrying the public reCAPTCHA Enterprise site key and no live-only value:
   `npm run build:qa`. The helper reads only that public key from the outside-root private file in
   memory, rebuilds the child environment from a Windows/runtime allowlist plus that one name, and
   runs the dist guard, the pinned scanner and the production dependency audit. The debug token and
   every other live value must stay absent (enforced by `vite.config.ts`, `scripts/check_dist.py`
   and the helper).
4. The reviewed `firestore.rules` / `firestore.indexes.json` release is authorized; the current live
   posture is the closed default, so the signed-in app stops at the membership read
   (`docs/verification.md` §13.3 item 2).
5. Live CLI work runs from the sealed stage outside the repository with a minimal child environment
   (never inheriting host credentials), against the live project only — never against `demo-*`.
   `npm run release:stage` performs the copy and prints the commands; it refuses an unknown
   project, a dirty tree, missing inputs, or verifier evidence that is not `ok=true`,
   `dirty=false`, `tree_stable` and for HEAD.

Documented commands (verify against `firebase --help` at run time; not executed here):

```powershell
# after the reviewed commit, a clean reviewer-sign-off and a keyed build
npm run build:qa
npm run release:stage -- --evidence .git/opencode/evidence.json
# the delegated release agent, in the printed stage directory, with a minimal child environment
firebase deploy --only firestore:rules,firestore:indexes --project shiftrelay-hybridai-2026
firebase deploy --only hosting --project shiftrelay-hybridai-2026
```

Order matters: Rules first, then the build/release, so the released client never faces a Ruleset it
was not reviewed against. `firebase hosting:channel:deploy <channel>` exists but is **not usable for
this app today**: `src/runtimeConfig.ts` accepts only the two live site origins, so a
`<site>--<channel>-<hash>.web.app` URL fails closed with `unknown_origin`.

Post-deploy verification (record each observation; do not assume):

- Page loads over HTTPS on `https://shiftrelay-hybridai-2026.web.app`, the mode banner reads "Live
  project on Hosting · synthetic data · App Check reCAPTCHA Enterprise", and the console shows no
  CSP violation from the Firebase SDK or reCAPTCHA Enterprise.
- Response headers actually returned: CSP, `X-Content-Type-Options: nosniff`, `Referrer-Policy`,
  `X-Robots-Tag: noindex`. A missing header is a finding, not a pass.
- `/__/firebase/init.json` returns a JSON object with the project config. Reserved Hosting URLs are
  documented for JS SDK 8 and earlier and this app uses modular 13.3.0, so 200 + JSON here is an
  **empirical result to record, never an assumption**. If it returns 404 or non-JSON, the resolver
  fails closed and the page shows "will not start the live configuration". That is a release
  blocker to fix by a reviewed change; do not weaken the resolver. There is no previous Hosting
  release on a first deploy, so the only clean response is to stop and record the site as QA-only
  until it is fixed.
- App Check: the site key is loaded from this origin, the token exchange succeeds, and a control
  probe without a valid token is rejected (`docs/adr/0007-appcheck-enforcement.md` proves the
  service boundary; the hosted browser path is what this step adds).
- Sign-in with a synthetic QA identity, membership read, share → accept → resolve → reopen, then the
  consented cloud preview → one request → confirm/dismiss. Sanitized network captures only.
- Sentinel check: the private sentinel never appears in outbound bodies, storage, URL or console.
- Five-card production Rules call-budget and latency recorded as observations, not promises.

Checklist status after November 20, 2026: the HTTPS load, the response-header and `/__/firebase/init.json`
bullets are **recorded** in §5.1; every browser-dependent bullet (mode banner, console/CSP violation,
App Check token exchange, sign-in and the share/accept/resolve flow, sentinel check, request budget)
remains **unobserved**.

### 5.1 First limited QA deploy executed (November 20, 2026)

Deploy source: `00c2b2ed78b1f43b01da430d7cca14699757d077` (`00c2b2e`), the reviewed and CI-green
commit. The later local commit `803670724ba2a6c939bd986bb7b41b1d84e6c4ac` is the documentation-only
recovery record and is **not** the deployed source.

Gates checked immediately before the first mutation, all passing: clean clone at that SHA
(`git status --porcelain` empty) with `.git/opencode/evidence.json` `ok=true`, `dirty=false`,
`tree_stable=true`, `scope.complete=true`, all 16 checks `exit=0`; CI run `44664598466`
`head_sha=00c2b2e…`, `conclusion=success` (GitHub REST re-read); sealed stage of 8 files whose SHA-256
values equal the approved report (`firebase.json 9f563e39…`, `firestore.indexes.json 54c9d0b6…`,
`firestore.rules 2aa81ebf…`, and the 5 `dist/` files); reviewer session
`ses_e0908dad0ffe2MIBCEN4qxxnC8` had approved the Q5 artifact boundary and the recovery plan with no
blockers; operator OAuth exchange succeeded with no new login, terms prompt or credential; billing
`billingEnabled=false`; Firestore Rules at 0 releases and 0 rulesets.

Commands, run from the sealed stage with the pinned `firebase-tools` 15.36.0, an allowlisted
OS/runtime child environment (no inherited credential variables), no `--debug`, no `--force` and no
secret on argv; exit 0 for both, Rules/indexes first:

```powershell
firebase deploy --only firestore:rules,firestore:indexes --project shiftrelay-hybridai-2026
firebase deploy --only hosting --project shiftrelay-hybridai-2026
```

| Result | Identifier |
|---|---|
| Firestore Rules release | `projects/shiftrelay-hybridai-2026/releases/cloud.firestore`, `updateTime 2026-11-20T03:51:56.114653Z` (the only Rules release) |
| Ruleset | `projects/shiftrelay-hybridai-2026/rulesets/137c406c-59b1-4081-96e3-4d810f358663`, `createTime 2026-11-20T03:51:54.735288Z` |
| Ruleset content | file `firestore.rules`, 19354 bytes, SHA-256 `2aa81ebf…` as served, LF-normalized `0b877ada…` = the reviewed repository content |
| Hosting release | `sites/shiftrelay-hybridai-2026/releases/1795146753235000`, version `sites/shiftrelay-hybridai-2026/versions/38fe83ad84b89cf9`, `FINALIZED`, `releaseTime 2026-11-20T03:52:33.235Z`, 5 files uploaded |
| Billing after | `billingEnabled=false`, no billing account |

Hosted bytes were fetched from `https://shiftrelay-hybridai-2026.web.app` and compared with the
sealed stage: `index.html cdf38e0f…`, `App-D3ukP5Gr.js 59192eb7…`, `index-CCtoaJ7i.js 9fa17223…`,
`index-DhjtbPNK.css bdce1526…`, `jsx-runtime-CB-FNcEI.js de6e2aa3…` — 5 of 5 identical.

HTTP-only smoke (no generation, no data write):

| Observation | Result |
|---|---|
| `GET /` | 200, `text/html; charset=utf-8`, 558 bytes = the deployed `index.html` |
| `Content-Security-Policy` | present, exactly the reviewed policy from `firebase.json` (no `unsafe-eval`, no `unsafe-inline`) |
| `X-Content-Type-Options` / `Referrer-Policy` / `X-Robots-Tag` | `nosniff` / `strict-origin-when-cross-origin` / `noindex, nofollow` (plus platform HSTS) |
| `GET /__/firebase/init.json` | **200**, `application/json`, 345 bytes, parsed as a JSON object; keys `apiKey, appId, authDomain, databaseURL, messagingSenderId, projectId, storageBucket`; `projectId` and `appId` match the project and web app. This reserved URL is therefore empirically available to the modular SDK; no config value is recorded in this file |
| SPA rewrite | `GET /venue/hall-01` → 200 `text/html` (558 bytes) |

Boundary of this evidence: it is **HTTP-only**. Nothing here observes the hosted page running — no
browser Auth session, no console/CSP-violation check, no reCAPTCHA-Enterprise App Check token exchange,
no local or cloud model call, no share → accept → resolve → reopen flow, no sentinel check and no
request budget. Browser QA is being run separately and has produced no result yet; it must not be
inferred from this section. *(Dated correction, later on November 20, 2026: bounded browser runs now
exist and are recorded in §5.2; this HTTP-only boundary still applies to §5.1, and none of §5.2 closes
a delivery group.)* The accepted hardcoded venue constant (`venue-hall-01`) is synthetic
demonstration data, not a credential and not a security boundary.

Hygiene: the sealed stage kept exactly its original 8 files with unchanged hashes; CLI-generated cache
and log artifacts were moved out of it. No commit, push, PR, merge, billing change, legal-term
acceptance, enforcement change, deletion or recovery deploy happened. The sanitized private report is
`C:\Users\acer\AppData\Local\Temp\opencode\shiftrelay-release-run-20261119\deploy-report.md` (temp
storage, disposable; it contains no key, site key, token, password or raw reserved config body).

### 5.2 Bounded hosted QA reconciled (November 20, 2026)

Four bounded runs against the deployed origin now exist. Every one is a sanitized delegate report
inspected by master, **not** an independent master replay, and each is limited to the states it
names. The eight-group mapping, provenance table and remaining blockers live in
`docs/verification.md` §17; this subsection records only what reached the hosted origin.

| Run | What it produced | What it did not |
|---|---|---|
| Hosted manual QA (delegate report) | both roles signed in and read membership; five reviewed cards published with v1 creation activity; incoming accept/resolve/reopen persisted at v4 with four activity entries; sentinel absent across 28 observed outbound requests and inspected storage | no inference; no cloud-reconciliation confirm/dismiss on the hosted origin |
| Hosted local model (delegate report) | two genuine `ONLY_ON_DEVICE` generations, 4/5 suggestions, 79.7 s and 24.5 s, ADR 0006 Gemma 4 provenance, no measured AI-host request | no hosted reCAPTCHA-attested cloud request; AC13/Q6 still open; legacy v3 install state must be rechecked |
| Desktop 200% zoom / keyboard (delegate report) | real Chrome 157.0.8103.79, five real `Ctrl+=` presses to true 200% (DPR 1.25→2.5, viewport 1266→633 CSS px), no measured horizontal overflow, clipping or overlapping interactive boxes; keyboard order and visible focus on signed-out and read-only signed-in states | no screen-reader output; no mutation-state accessibility; no WCAG certification; no network/console capture |
| Android emulator (delegate report) | Android 17/SDK 37 x86_64 AVD, Chrome 149.0.7827.5: native touch raised the real IME, focused fields stayed visible, no measured horizontal overflow at 411×834 or 914×331, 15 named controls in the initial workspace, one synthetic sign-in and sign-out | no task mutation or touch workflow; no traffic observation; no physical-device or TalkBack run (limits, not AC12 requirements) |

Signed-out empty-submit native validation was also observed in the real browser (0 `submit` events,
two click-caused `invalid` events, Chrome's native message, focus moved to Email): it establishes
submit blocking, not screen-reader speech. Narrator evidence remains a user observation of the three
sign-in controls' names, roles and required state; protected-password speech and any error/status
announcement are unobserved.

Status: this evidence reduces unknowns without closing any delivery group. Every browser-dependent
bullet in §5 remains open except where the rows above give bounded coverage; none is fully closed,
the hosted App Check exchange remains unresolved, `SCOPE.unimplemented` still names all eight items,
and Gates C/D stay unapproved.

## 6. Rollback — documented, not exercised

- **Hosting**: the console's Release history offers **Roll back** for a chosen release, which
  creates a new release serving that earlier content. A first deployment has no earlier release, so
  record the current release id and the exact `dist` before the first deploy.
- **Firestore Rules/indexes**: official CLI documentation states that releases of Security Rules
  cannot be rolled back. Recovery is to deploy the previous reviewed ruleset again from git history
  (`firebase deploy --only firestore:rules --project shiftrelay-hybridai-2026`), which creates a new
  release over the current rules. Record the SHA of the last known-good ruleset before every deploy.
- **Client**: keep the previous `dist` build artifact and its commit SHA so a re-deploy of that exact
  build is possible. Never roll back by editing live files.
- Rollback is documented and drillable; it had **not** been exercised when this list was written (no
  deployment existed).

**State after the first deploy — November 20, 2026.** One Rules release and one Hosting release now
exist, and the recovery question changed with them:

- **Hosting**: release `1795146753235000` (version `38fe83ad84b89cf9`) is the only release, so the
  console's Roll back still has no earlier content to serve. Recovery for this site is a re-deploy of a
  recorded `dist` + commit SHA, never a file edit.
- **Firestore Rules**: release `cloud.firestore` on ruleset `137c406c…` is the only release. Rules
  releases cannot be rolled back through the CLI, so there is still **no prior release to restore**;
  recovery is a **new** deploy.

**Future containment path (documented, not executed, not authorized here).** The reviewer-approved
deny-all candidate is durably embedded in `docs/adr/0009-first-release-recovery.md`
(690 bytes, SHA-256 `a217d884210709d68d3616ca9999465f2419bdd865724c195c462e4cc3763dd9`, extraction
convention and local emulator proof in that ADR). Using it would be a *new deny-all Rules deployment*
that either reaches a newly deployed ruleset (containment of client access) — it is **not** a
prior-release rollback, not a restore and not a reproduction of a state the project never had.
Returning to application behaviour would then be a second, separately approved deploy of
`firestore.rules` (`0b877ada…` as LF). Neither step was executed, no recovery drill was run, and no
restore is tested or claimed. Never `--force`, never delete a ruleset or release, never accept legal
terms or enable billing as part of a recovery.

## 7. App Check, domains and API-key restrictions

| Control | State | Source |
|---|---|---|
| App Check provider | reCAPTCHA Enterprise, score-based `SCORE`, one key `ShiftRelay Web (score, hosting only)` | ADR 0004 |
| Allowed domains on the key | exactly the two Hosting domains; `allowAllDomains: false`; **no** localhost | ADR 0004 |
| Token TTL / threshold | `3600s`, `minValidScore: 0.5` | ADR 0004 |
| AI Logic enforcement | **ENFORCED and proven** for service id `firebaseml.googleapis.com` (`firebasevertexai.googleapis.com` is reported as "Service not supported"). Controlled probes through the AI Logic proxy: valid replacement token `200`, header absent `401`, garbage token `401` (both `UNAUTHENTICATED`, "Firebase App Check token is invalid."). | ADR 0007, `docs/verification.md` §13.3 |
| Public browser key API targets | 10: `firebase`, `logging`, `firebaseinstallations`, `firebaseappcheck`, `identitytoolkit`, `securetoken`, `firebaserules`, `datastore`, `firestore`, `firebasevertexai` | ADR 0004 |
| Referrer restrictions | the two Hosting origins plus `localhost` / `127.0.0.1` (dev only, port 5173 variants) | ADR 0004 |
| `generativelanguage.googleapis.com` on the public key | absent by design (AI Logic proxies with a Google-managed identity) | ADR 0004 |
| Firestore App Check enforcement | **planned** before public release (console: Security → App Check → Enforce) | ADR 0001 decision 6, `https://firebase.google.com/docs/app-check/enable-enforcement` |
| Debug token | secret, localhost only, registered `ShiftRelay local debug (localhost only)`, never in a build | ADR 0003, `docs/verification.md` §13.4 |

New origins (a custom domain, a preview channel) need a reviewed change to the reCAPTCHA key, the API
key referrers and `HOSTED_QA_HOSTS` together. One without the others fails closed.

## 8. Private configuration (outside the repository)

Single file: `%LOCALAPPDATA%\Temp\opencode\shiftrelay-private\firebase-development.env`, ACL restricted
to the current Windows account. Values are never printed, committed or pasted into chat/docs. Names
only (ADR 0004):

`VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`,
`VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`,
`VITE_FIREBASE_APPCHECK_DEBUG_TOKEN`, `VITE_FIREBASE_APPCHECK_SITE_KEY`, `SHIFTRELAY_QA_VENUE_ID`,
`SHIFTRELAY_QA_OUTGOING_EMAIL`, `SHIFTRELAY_QA_OUTGOING_PASSWORD`, `SHIFTRELAY_QA_OUTGOING_UID`,
`SHIFTRELAY_QA_INCOMING_EMAIL`, `SHIFTRELAY_QA_INCOMING_PASSWORD`, `SHIFTRELAY_QA_INCOMING_UID`.

- Local use: `npm run dev:live-local` (`scripts/dev_live_local.py`) — allowlisted names only, minimal
  child environment, fail-closed, prints no value.
- Hosted build: `npm run build:qa` (`scripts/release_prep.py build`) reads **only**
  `VITE_FIREBASE_APPCHECK_SITE_KEY` from that file in memory, forwards it alone into the build child
  environment, and then runs the dist guard, the pinned scanner and the production audit. The debug
  token and QA passwords never enter `dist` (`scripts/check_dist.py`, `vite.config.ts`, exact-value
  check in `docs/verification.md` §13.4).
- The agent-created localhost debug token that appeared once in a transcript was revoked and replaced
  (`docs/adr/0007-appcheck-enforcement.md`); the QA passwords had no exposure evidence and were not
  rotated.
- **Synthetic judge credentials**: the two identities are synthetic `@example.com` accounts with
  generated passwords. Per the official FAQ, credentials belong in the testing instructions when a
  login is needed; project policy forbids credentials in source, README, docs or public materials.
  They are delivered only through a private channel the user approves (for example the organizer's
  submission form or a direct message), never in the repository or the video, and rotated/revoked
  after judging. The exact channel is still a master/user decision; this file contains no value.

## 9. Availability through December 16, 2026

Judging runs Dec 10–16, 2026 (official FAQ: submissions close Nov 30, 2:00 PM PT; judging Dec 10–16;
winners ~Dec 21). Keep the entry testable:

- Do not delete or recreate the project, database, Hosting site, web app, App Check key or the two
  synthetic memberships; no billing link (linking billing moves Gemini usage to the paid tier), no
  visibility change.
- Keep the reviewed Ruleset deployed; an undeployed or reverted Ruleset silently disables the signed-in
  flow.
- Re-load the hosted URL and repeat one synthetic sign-in plus one consented cloud request in the
  judging window, and record date/result. A single sample today is not availability evidence.
- Free-tier quota is the real risk: the free tier is limited and some models/features require billing
  (official pricing + 429 guidance). Judges hitting quota should see a clear error state, not a broken
  page. Requesting a Google Account Quota is the documented free remedy and is not needed unless a
  paid-tier model is chosen.

## 10. Demo script / shot list (≤3 minutes, **not recorded**)

Recording is a separate, later action on the real runtime; no video, screenshot set or asset exists in
this repository. Times sum to 2:55. Evidence that exists for the recording: the genuine local
`ONLY_ON_DEVICE` generation is `docs/adr/0006-nano4-runtime-proof.md` (v4 component
`gemma4_component` 2026.8.7.929, model `gemma4_gpu_low_tier_model` / `gemma4-2b-it`, sponsor-
documented flag path, loopback origin); the genuine consented cloud request and the App Check
boundary are `docs/verification.md` §13.3 and `docs/adr/0007-appcheck-enforcement.md`. Still absent
and never to be staged on camera: a hosted HTTPS on-device request, Android Chrome touch,
screen-reader/200% zoom, and AC15.

| Time | Shot | Note |
|---|---|---|
| 0:00–0:08 | Title card: "Handovers fail when private notes never become owned work" | own text only |
| 0:08–0:22 | Who it is for and the problem: an outgoing volunteer's private note, an incoming volunteer who must accept and close work | on-screen text, synthetic venue |
| 0:22–0:30 | The hybrid split: private note → on-device model (no cloud fallback); shared records → one-shot consented cloud comparison | own diagram |
| 0:30–0:55 | Sign in (synthetic identity), type a synthetic shift note, show the local model state, generate, show drafted cards with source links | real app, real local request |
| 0:55–1:15 | Edit a card, delete the private aside, show the exact reviewed packet, share; show the incoming session seeing only approved fields | real app |
| 1:15–1:35 | Incoming accepts, resolves with a resolution, reopen with a reason; version and activity visible | real app |
| 1:35–2:05 | Cloud consent: exact packet preview, separate approve click, real duplicate/contradiction suggestion, human confirm (no merge) and dismiss alternative | real app; needs the reviewed Rules release — until then only labelled-mock UI evidence exists |
| 2:05–2:25 | Honesty shot: local model unavailable case keeps manual entry and never uploads; unsupported state is a real state, not a mock | real app |
| 2:25–2:45 | Evidence card: repo, commit SHA, verifier report name, what is still unverified | no invented numbers |
| 2:45–2:55 | Close on the running hosted URL and the accept/resolve action | last frame is the real CTA |

Rules for the recording: no third-party logos, trademarks or assets; no real names, phone numbers,
addresses, credentials or personal data; synthetic data only; never present a mocked or simulated
model response as real — if the on-device path is not available on the recording machine, show the real
unavailable state and the manual path. If time is short, cut in this order: the dismiss path, then the
second resolution, then the diagram card — keep the private note → local draft → approved share →
accept/resolve spine. Each cut only shortens the video; it must not relabel unverified capability.

**Dated correction — November 20, 2026.** The "still absent" list in the paragraph above has moved
for three entries and not for two: a hosted HTTPS `ONLY_ON_DEVICE` generation now exists as an inspected
delegate report (two generations, §5.2), Android Chrome touch exists on an x86_64 **emulator** only,
and 200% zoom plus keyboard/focus were measured on desktop Chrome in read-only states. No observed
screen-reader speech exists beyond the user-observed sign-in control naming, and AC15 is unvalidated;
no hosted reCAPTCHA-attested cloud request exists. A shot of these runs may be described as bounded
evidence, never as physical-device, WCAG or hybrid/cloud proof.

## 11. Submission draft (English, ~180 words)

> **ShiftRelay — private shift notes become owned work.**
>
> Community venues hand over non-emergency work through chat notes, so the next volunteer inherits
> unowned tasks and no record of what was closed. ShiftRelay turns one shift's note into reviewed,
> accepted and resolved tasks.
>
> The AI split is deliberate. Drafting runs `ONLY_ON_DEVICE` through Firebase AI Logic: the raw note is
> page memory, the model is initialized only on an explicit user action, and there is no
> local-to-cloud fallback. Sharing is a separate, exact-field approval; ownership, resolution and
> reopening are human actions with append-only history. Cloud reconciliation is optional, separately
> consented, bounded to current shared task versions, and returns duplicate/contradiction observations
> that a human confirms or dismisses — never automatic merges or writes. Firestore Rules, not the UI,
> enforce roles, versions and one owner.
>
> Built with React/TypeScript, Firebase AI Logic, App Check, Auth, Firestore, Rules and Hosting, using
> the official Firebase agent skills (pinned revision
> `99954a30898bb5ddc8152ee10e124dc3b4106bf7`).
>
> Differentiation is a hypothesis, not a measured result: most hybrid examples fall back to cloud;
> ShiftRelay refuses that fallback for private text and still records ownership. No user-impact,
> interview, latency or coverage figure is claimed.

## 12. Chrome setup prerequisite (pending)

The official FAQ states: *"It's available through the Chrome Prompt API. In chrome://flags, search for
'Gemma 4 for Built-in AI' and enable it. On-device inference on web only runs in Chrome versions and
devices that support Nano."* (`https://firebasehybridaihackathon.devpost.com/details/faqs`, read
November 17, 2026.)

Recorded as a **setup prerequisite and verified once** in an isolated profile (`docs/adr/0006-nano4-runtime-proof.md`):
the flag persisted as `gemma4-for-built-in-ai@1`, `gemma4_component` 2026.8.7.929 reached "Ready",
the model entry was `gemma4_gpu_low_tier_model` (`gemma4-2b-it`), and a genuine Firebase AI Logic
`ONLY_ON_DEVICE` request returned five cards on loopback. The earlier `nano_v3_gpu_component`
2025.8.8.1141 run **must not be relabelled Gemini Nano 4**. The "Nano 4" name here follows the
sponsor FAQ mapping to that flag; no independent Google statement about this exact component is
claimed, the ordinary profile was not probed, and no hosted on-device request exists.

## 13. Honest limits

Unverified and not to be claimed: a hosted on-device request; a hosted reCAPTCHA-attested request; the
deployed CSP actually running without violations (the header is served as reviewed, but no browser
console was observed); in-app cloud reconciliation on the deployed origin; real Android Chrome touch;
screen-reader and 200% zoom manual checks; AC15 user research; any WCAG certification;
latency/quota/coverage numbers; performance (the build reports a ~809 kB JS chunk warning). Exercised
and proven: App Check enforcement at the AI Logic service boundary
(`docs/adr/0007-appcheck-enforcement.md`), the sponsor-documented local v4 model path
(`docs/adr/0006-nano4-runtime-proof.md`), and — since November 20, 2026 — the deployed Rules/indexes and
Hosting release with its HTTP surface, including `/__/firebase/init.json` returning 200 JSON (§5.1;
HTTP only, no browser run). Free-tier cloud processing is a separate caveat: Google may
use submitted content and generated responses to improve its products, and human reviewers may read
them, so only synthetic data may ever reach the cloud model
(`https://ai.google.dev/gemini-api/terms#unpaid-services`).

**Dated correction — November 20, 2026.** Two entries in the list above now have bounded evidence and
must still not be overstated: 200% zoom and keyboard/focus were measured on desktop Chrome in
signed-out and read-only signed-in states only, and native Android Chrome touch was measured on an
x86_64 emulator only. Physical device and TalkBack specifically are **not** required by `docs/spec.md`
AC12/`CONSTRAINTS.md` Q4 (responsive web, "No device-local Android-browser claim"), so their absence
is a recorded limit, not a new blocker. Screen-reader announcements are only partially observed: one
user-observed Narrator pass covered the three sign-in controls' names, roles and required state, and
no status/alert/error announcement or protected-password announcement was observed. A hosted
`ONLY_ON_DEVICE` generation exists; a hosted reCAPTCHA-attested cloud request does not, so AC13/Q6
stay open. AC15 remains unvalidated. See §5.2 and `docs/verification.md` §17.

## 14. Open items before submission

Status as of November 20, 2026 (earlier wording kept where still true):

1. Reviewed commit + `dirty=false` verifier run + green CI on that SHA (owner: active agent,
   `github-sync`). **Done for `00c2b2e`:** 16/16 clean evidence and CI run `44664598466` succeeded on
   that exact SHA. Still open: clean verifier evidence for the final operational commit that carries
   these documentation edits, and the PR/merge step.
2. Keyed QA build and sealed stage — implemented, exercised and now **deployed** from the sealed stage
   (§5.1). Any *next* deploy needs a fresh reviewed build + stage, not a re-use of this one.
3. Rules/indexes release — **done** (`cloud.firestore`, ruleset `137c406c…`, `03:51:56Z`); Hosting —
   **done** (`1795146753235000`, `03:52:33Z`); HTTP surface observed (§5.1). **Updated November 20,
   2026:** a synthetic sign-in and the share/accept/resolve/reopen workflow are now covered by an
   inspected delegate run (§5.2). Console/CSP coverage is partial, not absent: the earlier signed-out
   hosted smoke recorded no CSP violations and no page errors, while authenticated and model-path
   console/CSP behavior, the hosted reCAPTCHA-attested App Check exchange and the hosted consented
   cloud flow remain unverified. No group closed.
4. Decide the private judge-credential channel; keep values out of the repo.
5. Record the ≤3 minute demo on the real runtime; upload is a separate user approval.
6. Probe the ordinary Chrome profile for the flag/model; real device, screen-reader, zoom and user
   checks. **Updated November 20, 2026:** desktop 200% zoom/keyboard, submit-time native validation
   and emulator touch are measured (bounded, §5.2). Still required by contract: full screen-reader
   announcements (AC12) and the Android Chrome **touch workflow** AC12 names, neither of which the
   read-only runs cover. Not required by AC12/Q4 and therefore limits/follow-ups only: physical
   device, TalkBack specifically, Android font-scale/high-contrast, ordinary-profile probing, manual
   AT coverage of mutation states. Zoom measurements do not extend to mutation states.
7. Remove `firestore-debug.log`; confirm clean tree (`git clean -ndx`) before staging. Still applies to
   any future stage; the November 20, 2026 stage itself was sealed and verified.

## 15. Sources

Official pages read November 17, 2026 (unless a repository artifact is cited above):

- Hackathon FAQ (deadline, judging window, App Check requirement, Chrome flag, credentials guidance):
  `https://firebasehybridaihackathon.devpost.com/details/faqs`
- Rules (platform/model wording): `https://firebasehybridaihackathon.devpost.com/rules`
- AI Logic pricing / free tier and Spark: `https://firebase.google.com/docs/ai-logic/pricing`
- AI Logic data governance: `https://firebase.google.com/docs/ai-logic/data-governance`
- Gemini API Additional Terms, Unpaid Services: `https://ai.google.dev/gemini-api/terms#unpaid-services`
- App Check enforcement: `https://firebase.google.com/docs/app-check/enable-enforcement`
- AI Logic App Check / enforcement by default: `https://firebase.google.com/docs/ai-logic/app-check`
- Rules deployment: `https://firebase.google.com/docs/rules/manage-deploy`
- Hosting rollback and release retention: `https://firebase.google.com/docs/hosting/manage-hosting-resources`
- Hosting preview channels / CLI: `https://firebase.google.com/docs/cli`
- Reserved Hosting URLs (SDK 8 caveat): `https://firebase.google.com/docs/hosting/reserved-urls`
- Public API-key guidance: `https://firebase.google.com/docs/projects/api-keys`
- Web hybrid modes and options: `https://firebase.google.com/docs/ai-logic/hybrid/web/configuration-options`
- Chrome Prompt API requirements: `https://developer.chrome.com/docs/ai/prompt-api`
- Official Firebase agent skills: `https://firebase.google.com/docs/ai-assistance/agent-skills`

Repository artifacts: `docs/verification.md` §10–§14, `docs/HANDOFF.md`, `docs/_project.md`,
`docs/PLAN.md`, `CONSTRAINTS.md`, `docs/adr/0001-shiftrelay-stack.md` through
`docs/adr/0008-android-qa.md`, `src/runtimeConfig.ts`, `firebase.json`,
`scripts/release_prep.py`, `.github/workflows/verification.yml`, `.git/opencode/evidence.json`.
