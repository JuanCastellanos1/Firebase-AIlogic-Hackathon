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

**Dated correction - November 20, 2026 (bounded hosted QA reconciled).** Four bounded delegated runs
now cover hosted manual ownership, hosted local drafting, desktop zoom/keyboard and Android emulator
touch; §5.2 records exactly what each produced and what it did not, and §13/§14 were corrected
accordingly. They close no delivery group: the eight static verifier items remain open
(`gate_c_eligible=false`), and no complete screen-reader result, hosted-attestation result or AC15
result exists. **Later on November 20, 2026** the user performed the touch workflow on their own
physical Android 16 phone (user observation, no agent instrumentation; §5.2) and an outside-root
harness recorded ordinary-text contrast ratios for 31 states. Physical hardware is required by
explicit user decision - `CONSTRAINTS.md` "Hardware clarification", `docs/PLAN.md` "Delivery
clarification" - so that earlier scope-wording question is resolved, not waived (§13). No group is
closed. The full per-group mapping, provenance and remaining blockers are in
`docs/verification.md` §17 and §18.

Status legend: **verified** = an existing report or file says so, cited inline; **planned** = a
documented command or checklist not yet run; **blocked** = needs a decision, a review or hardware.

## 1. Current status

**Dated update — November 20, 2026.** The `Implemented-code checks`, `Test totals` and
`scripts/verificar.py` gate rows below were reconciled to the then-current clean checkpoint
`a7711cd` recorded in `docs/verification.md` §15.7; they now cite the later verified snapshot
`88eaa15` described in the next paragraph.
The working tree is dirty again because of later documentation edits, so that report certifies
`a7711cd` only, not those edits, a future commit, or any release. Both fix reviewers have since
approved the fix cut at `a7711cd` (D1–D4/U1 closed, no blockers); clean evidence for the commit
current at gate time is still pending, so Gate C and Gate D remain unapproved.

**Dated update — November 20, 2026 (later verified snapshot `88eaa15`, durable status semantics).**
`.git/opencode/evidence.json` at `88eaa157646e0d44ce6f8346cd100660d2b916af` records `ok=true`,
`dirty=false`, `status=[]`, `tree_stable=true`, `scope.complete=true`, all 16 checks `exit=0`,
window `2026-11-20T18:51:28Z`–`18:55:09Z` (`finished_at=2026-11-20T18:55:09Z`),
`gate_c_eligible=false` with the single reason `8 scope items unimplemented`; `.git/opencode/review.sha`
names the same commit. Read that report as a **historical snapshot of one clean tree**: the live Git
state, `evidence.json` and `review.sha` are authoritative whenever this file is read, and neither this
paragraph nor the rows below is a standing claim about the current files. Any documentation-only edit
after `88eaa15` is not certified by that report; conversely it needs no repeat of the earlier builds,
deployments, hosted QA or artifact review, because none of those bytes changed. A report for a future
commit certifies only that commit once it exists, and none is claimed here.

| Item | Status | Evidence |
|---|---|---|
| Implemented-code checks (16) | verified at the clean snapshot `88eaa15` (November 20, 2026; that tree only) | `.git/opencode/evidence.json`: `ok=true`, `commit=88eaa157646e0d44ce6f8346cd100660d2b916af`, `dirty=false`, `status=[]`, `tree_stable=true`, `scope.complete=true`, all 16 checks `exit=0`, `finished_at=2026-11-20T18:55:09Z` (`docs/verification.md` §17) |
| Test totals | last **counted** on the earlier dirty run (§15.6), not re-counted at a clean snapshot | 121 unit (7 files, incl. 17 ai-output, 20 reconciliation, 24 runtime-config), 41 Rules, 21 E2E, 84 tool tests, 2 diagrams, pinned Gitleaks clean, production audit 0 vulnerabilities — measured on `dbd217c` plus the fix working tree. The `88eaa15` and `a7711cd` reports store per-check `exit`/`duration_ms`/`stdout_sha256`, not per-suite counts, so no total is claimed for either clean snapshot |
| Local drafting (ONLY_ON_DEVICE), v4 model path | verified once, loopback | isolated Chrome 157, `gemma4_component` 2026.8.7.929, `gemma4_gpu_low_tier_model` (`gemma4-2b-it`), genuine 5-card generation (`docs/adr/0006-nano4-runtime-proof.md`) |
| Earlier local drafting run | verified once, **not** Nano 4 | component `nano_v3_gpu_component` 2025.8.8.1141, localhost only (`docs/verification.md` §10) |
| Consented cloud request from localhost | verified once | `gemini-3.5-flash-lite`, `inference_source in_cloud`, 161 bytes, 1912 ms, App Check debug exchange 200, `.git/opencode/live-config-evidence.json` (`docs/verification.md` §13.3) |
| App Check **enforcement** | verified: `ENFORCED` for `firebaseml.googleapis.com`; valid `200`, missing/garbage `401` | controlled probes through the AI Logic proxy (`docs/adr/0007-appcheck-enforcement.md`) |
| Hosting config, keyed QA build, sealed stage | implemented and locally exercised; **never deployed** | `firebase.json`, `scripts/release_prep.py`, `tests/test_release_prep.py`, `docs/verification.md` §14 |
| Hosting / Rules deployment | not performed before 2026-11-20; **first limited QA deploy executed** on that date (§5.1) | `docs/verification.md` §16; private report `deploy-report.md` |
| Firestore Rules + indexes release | **verified** November 20, 2026, `03:51:56Z` | release `projects/shiftrelay-hybridai-2026/releases/cloud.firestore`; ruleset `137c406c-59b1-4081-96e3-4d810f358663` (19354 bytes, LF-normalized `0b877ada…` = reviewed content) |
| Hosting release | **verified** November 20, 2026, `03:52:33Z`, 5 files byte-identical to the sealed stage | release `sites/shiftrelay-hybridai-2026/releases/1795146753235000`, version `sites/shiftrelay-hybridai-2026/versions/38fe83ad84b89cf9`, `FINALIZED` |
| Hosted HTTP surface | **verified HTTP only** (status, headers, `init.json`, asset bytes); browser Auth/CSP/reCAPTCHA/model/flows not observed in §5.1 | §5.1; browser-dependent checks stay *planned* there and are only partly covered by §5.2 |
| Bounded hosted QA runs (manual ownership, hosted local model, desktop zoom/keyboard, Android emulator, physical-phone user walkthrough, one consented hosted cloud request on November 23, 2026 — §5.4) | **partial**: each run limited to the states it names; delegate reports inspected, not master replays; the physical-phone walkthrough is user-observed; no delivery group closed | §5.2, §5.4; `docs/verification.md` §17, §18, §20 |
| GitHub Actions | verified once, **not for the WIP commit**: run `44222898293` succeeded for `b0910d32f7cd6403ccb59419613eadfa0fe40c83` (REST metadata re-read November 19, 2026). The workflow is tracked; the earlier "never run / untracked" entry described the pre-commit WIP state | `.github/workflows/verification.yml`; the run predates `dbd217c` and these review fixes |
| `scripts/verificar.py` gate | `GATE_C: NOT ELIGIBLE` | single reason at the clean snapshot `88eaa15`: `8 scope items unimplemented`; `dirty working tree` is no longer listed (`.git/opencode/evidence.json`: `gate_c_eligible=false`, `gate_c_reasons`) |

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
   November 20, 2026 snapshots met both conditions for `a7711cd` and `88eaa15`, and Gate C was still
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

Four bounded delegate runs against the deployed origin now exist, plus one user-performed
physical-phone walkthrough of the same origin. Every delegate run is a sanitized report
inspected by master, **not** an independent master replay, and each is limited to the states it
names. The user-driven walkthrough is evidence only for what the user actually reported. The
eight-group mapping, provenance table and remaining blockers live in
`docs/verification.md` §17; this subsection records only what reached the hosted origin.

| Run | What it produced | What it did not |
|---|---|---|
| Hosted manual QA (delegate report) | both roles signed in and read membership; five reviewed cards published with v1 creation activity; incoming accept/resolve/reopen persisted at v4 with four activity entries; sentinel absent across 28 observed outbound requests and inspected storage | no inference; no cloud-reconciliation confirm/dismiss on the hosted origin |
| Hosted local model (delegate report) | two genuine `ONLY_ON_DEVICE` generations, 4/5 suggestions, 79.7 s and 24.5 s, ADR 0006 Gemma 4 provenance, no measured AI-host request | no hosted reCAPTCHA-attested cloud request; AC13/Q6 still open; legacy v3 reported 0 MiB weights with install pending, so provenance must be rechecked before future model claims |
| Desktop 200% zoom / keyboard (delegate report) | real Chrome 157.0.8103.79, five real `Ctrl+=` presses to true 200% (DPR 1.25→2.5, viewport 1266→633 CSS px), no measured horizontal overflow, clipping or overlapping interactive boxes; keyboard order and visible focus on signed-out and read-only signed-in states | no screen-reader output; no mutation-state accessibility; no WCAG certification; no network/console capture |
| Android emulator (delegate report) | Android 17/SDK 37 x86_64 AVD, Chrome 149.0.7827.5: native touch raised the real IME, focused fields stayed visible, no measured horizontal overflow at 411×834 or 914×331, 15 named controls in the initial workspace, one synthetic sign-in and sign-out | no task mutation or touch workflow; no traffic observation; no physical-device or TalkBack run (supplementary only; physical hardware is now the required condition - see §13) |
| Physical Android phone (user report) | Android 16, Chrome reported as "latest" with the exact version unrecorded: portrait/landscape reachability with the native keyboard, portrait no horizontal scrolling, empty-submit native required message; one synthetic sign-in per role; manually typed draft, review and one publication followed by the exact persistent status "Server confirmed 1 open task. The private note was cleared from this tab."; accept with the user as owner, resolve with a synthetic note, reopen returning Accepted with the same owner; history and sign-out | no agent instrumentation or replay, no agent-captured screenshot or traffic capture, no AI call, no second task mutated, no screen-reader, zoom, timing, network or App Check measurement; no delivery group closed (`docs/verification.md` §18.1) |

Signed-out empty-submit native validation was also observed in the real browser (0 `submit` events,
two click-caused `invalid` events, Chrome's native message, focus moved to Email): it establishes
submit blocking, not screen-reader speech. Narrator evidence remains a user observation of the three
sign-in controls' names, roles and required state; protected-password speech and any error/status
announcement are unobserved.

Ordinary-text contrast ratios were recorded outside these hosted runs by an outside-root harness:
algorithm self-check 13/13; hosted signed-out minimum 6.821:1; 17 local synthetic signed-in/hover
states with 4.608:1 minimum; 12 local labelled cloud-mock states (pending 9.776:1, error 10.145:1,
packet preview 16.283:1) - 31 states, **0 active ordinary failures, 0 unmeasurable** in the measured
sets. Disabled controls at 3.206:1 and 2.766:1 are listed separately as SC 1.4.3 inactive components,
not counted as passes; no CSS or threshold changed. Unmeasured: transient/local-model/queue and
hosted-authenticated states at the required 4.5:1. Scope limits, not extra thresholds: non-text
contrast, other engines and viewports, dark mode/high contrast, 320 px/200% re-measurement. No
overall Q4 closure and no WCAG verdict (`docs/verification.md` §18.2).

**Dated narrow update, November 23, 2026.** Fourteen further states are now recorded outside these
hosted runs (all local, none hosted) — ten local-model (probing, unavailable, downloadable,
downloading 50 %, enable failure, unusable output, drafting in flight, cancelled by button, cancelled
by editing the note, suggestions panel), two queue (action pending/failure) and two workspace phase
(loading, denied) — with **0 active ordinary failures and 0 unmeasurable**, ordinary
minimum **4.608:1** (the unchanged placeholder), the pending/info/error tokens at 9.776:1 / 15.653:1 /
10.145:1, and **24** disabled-label instances below 4.5 (lowest **2.744:1**) kept in the separate
SC 1.4.3 inactive bucket, not counted as passes and not a waiver. Provenance and limits — including
that the local-model states reuse the existing `e2e/local-draft.spec.ts` test double and that queue
and phase states were harness-induced on loopback only — are in `docs/verification.md` §21. Still
unmeasured after this update: queue refresh failure, workspace `phase === "error"`, cloud
`status-confirmed`, stale-consent/context-layout tone, and hosted-authenticated states. No CSS,
threshold or scope change and no new failure.

Status: this evidence reduces unknowns without closing any delivery group. The touch workflow AC12
names is now user-observed on the required physical phone, but screen-reader announcements, 200%
zoom/keyboard on mutation states and the unmeasured contrast states remain open (**November 23
update:** the local core mutation states now have bounded 200% evidence in §5.3; the states not
sampled there remain open). Every browser-dependent
bullet in §5 remains open except where the rows above give bounded coverage; none is fully closed,
the hosted App Check exchange remains unresolved, `SCOPE.unimplemented` still names all eight items,
and Gates C/D stay unapproved.

**November 23, 2026 supersession (narrow):** the hosted App Check exchange and one hosted consented
cloud request are no longer unobserved — §5.4 records one delegated observation (two App Check POST
200, one `firebasevertexai` POST 200, zero suggestions, no task write). The exchange 403/throttle
blocker is **not** established as reproducibly resolved, no served model or limited-use flag was
captured, and the rest of this paragraph is unchanged.

### 5.3 Bounded local 200% mutation zoom (November 23, 2026)

A separate bounded implementer run exercised the existing manual workflow on the **local emulators**,
not the hosted origin. No hosted, cloud, Auth-live or model action was performed; no network, console
or HAR capture occurred. Master inspected the outside-root report, not a replay. Full record:
`docs/verification.md` §19 and `Temp/opencode/shiftrelay-zoom-core-20261123/REPORT.md`.

- Environment: Windows 10.0.19045; 1536×864 logical display (1920×1080 at 125% OS scale); real Google
  Chrome 157.0.8103.79 on an owned profile through agent-browser 0.43.0/CDP; Vite `127.0.0.1:5173` in
  emulator mode with local Auth 9099/Firestore 8080. Two runtime-created synthetic users in sequential
  outgoing and incoming sessions. The local-model capability probe reported "downloadable"; it was
  not enabled and no generation was requested.
- Zoom: five real browser `Ctrl+=` presses to true 200%: DPR 1.25→2.5, CSS viewport 1266×766→633×383,
  outer window unchanged, `visualViewport.scale = 1`, computed CSS `zoom = 1`; `Ctrl+0` restored
  1.25/1266. No CSS zoom, device-scale or viewport emulation.
- Coverage: 13 sampled states, **12 at 200%** plus one 100% baseline; nine 200% states have real
  keyboard traversal and three are geometry/live-region probes only. Traversed states: outgoing
  empty/filled/review/publish-confirmed and incoming open/accepted/resolve-form/reopen-form/
  reopened-history.
- Measured at 200%: no horizontal document overflow, right-edge overflow, clipped-text candidate or
  overlapping interactive-box pair. In the nine traversed states every focus stop was in the
  633×383 viewport with a solid 2.8px ring and no covering element.
- Mutations: one publication (two synthetic cards), then accept, resolve and reopen on the first card,
  all activated by Tab+Enter. The local Firestore emulator recorded accepted v4 with the incoming
  owner, activities create/accept/resolve/reopen v1–v4, and the second card open/unowned. The
  synthetic note sentinel was absent from those **inspected shared documents** (storage only; no
  traffic capture, so no transport-wide claim).
- Visibility: the publish `role="status"` confirmation was above the viewport (top −474 / bottom
  −428 at 383 px height) and must be scrolled to; accept/resolved/reopened confirmations were in
  view. Focus-rect geometry does not prove full textarea or all result-text visibility; no blanket
  visibility claim is made.
- Still open: screen-reader speech; ordinary-text contrast for unmeasured states (**November 23
  update:** the transient/local-model/queue states are now recorded in `docs/verification.md` §21;
  queue refresh failure, workspace `phase === "error"` and hosted-authenticated states remain
  unmeasured); 200% coverage of
  states not sampled here; the publish confirmation's offscreen position above (a visibility
  observation, not an established defect); non-text contrast, other engines/viewports, dark/high
  contrast, real AT; the physical-phone Chrome version (desktop 157.0.8103.79 does not fill that gap).
  No group closed, no WCAG/Q4 verdict, Gates C/D open.

### 5.4 One consented hosted cloud reconciliation (November 23, 2026)

One bounded delegate run, under the user's explicit narrow approval: one synthetic-account sign-in,
one reviewed shared-task-packet cloud request from the app's own consent control, then dismiss with
no task write. **Delegated observed evidence**, not a master replay: master inspected the outside-root
report and `src/cloudReconcile.ts:110-127`, not the browser. No browser or cloud action was taken for
this record. Full record: `docs/verification.md` §20 and
`Temp/opencode/shiftrelay-hosted-cloud-20261123.md`.

| Item | Observed |
|---|---|
| Route | user's real Chrome via the browse extension (relay 0.1.5); credential entry through the inspected stdin transport; capture `bodies:false`, `capturedBodyBytes 0`, no raw traffic retrieved |
| Sign-in demand | one synthetic sign-in; `content-firebaseappcheck` **POST 200**, then `identitytoolkit` **POST `/v1/accounts:{seg}` 200** |
| Consented request | exact local preview **1101 UTF-8 bytes**, **1 source + 5 context** synthetic published tasks, per-task fields `id, version, title, detail, state` inside `sources`/`context`; approval checkbox then one send |
| Cloud leg | second `content-firebaseappcheck` **POST 200**, then `firebasevertexai` **OPTIONS 200 / POST 200**; brief rendered with **0 suggestions**; one-shot approval consumed (checkbox reset, send disabled) |
| Dismissal | **N/A** — no suggestion existed, so no dismiss control rendered; no confirm action, no task write requested or performed |
| Network completeness | 37 entries, 2 transport failures, 3 status-0 entries, no 4xx/5xx; zero HTTP errors is not a completeness claim |
| Cleanup | capture stopped, owned tab closed, 0 agent tabs; in-memory Auth meant no sign-out was needed; token store untouched |

Not established: the served model name (requested `gemini-3.5-flash-lite` only), the `limited_use`
flag (session vs limited-use exchange distinguished by position plus the source-verified
`useLimitedUseAppCheckTokens: true`, not by reading the flag), and `inferenceSource` as a raw field
(cloud source is the adapter's `not_in_cloud` check not firing). Reproducibility is limited to this
interactive real-Chrome profile and run; reCAPTCHA scoring still governs the path, and this record
does not claim future automation can never succeed. The metadata projection was proven 12/12 on a
loopback fixture by the delegate; master inspected the projection source and did not replay it.

No group is closed and no gate moves. `firebaseml` DISABLED versus the enforced service resource,
Firestore App Check enforcement, screen-reader speech, remaining contrast states, AC13/Q6 as a whole,
AC15, judge access, the ≤3-minute demo, PR/merge and release all remain open.

**Dated supersession, narrow, November 23, 2026 — two clauses of the paragraph above only.** (a)
`firebaseml` DISABLED versus the enforced service resource is no longer an unreconciled target:
ADR 0007 §6 records that an App Check `service_id` is a policy key, not a host (`service_id` "has no
semantic meaning beyond identifying the service to App Check … nor is it necessarily the API that
should be enabled to use the service"), that `firebaseml.googleapis.com` is the control resource
labelled "Firebase AI Logic" while `firebasevertexai.googleapis.com` is the SDK traffic host and the
API that must be enabled, and that a DISABLED Service Usage entry for the former is expected rather
than a defect — <https://firebase.google.com/docs/reference/appcheck/rest/v1/projects.services>
(fetched 2026-11-23). No configuration fix is made or recommended and **no** new current-live-
enforcement, `PATCH`-causation or replay-state claim follows; ADR 0007 §6 declines all three. (b)
"remaining contrast states" is refined, not closed: the transient/local-model/queue states are
recorded in `docs/verification.md` §21, while queue refresh failure, workspace `phase === "error"`,
cloud `status-confirmed`, stale-consent/context-layout tone and hosted-authenticated states remain
unmeasured. Every other item in the paragraph, including Firestore App Check enforcement, the
screen-reader item and every gate, stands unchanged.

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

**Dated correction - November 20, 2026.** The "still absent" list in the paragraph above has moved
for the hosted HTTPS `ONLY_ON_DEVICE`, Android Chrome touch and 200% zoom/keyboard entries, and has
not moved for screen-reader speech or AC15: a hosted HTTPS `ONLY_ON_DEVICE` generation now exists as
an inspected delegate report (two generations, §5.2), Android Chrome touch exists on an x86_64
**emulator** and - later the same day - as a **user-observed walkthrough on the user's own physical
Android 16 phone** (no agent instrumentation, no screenshot or recording; §5.2,
`docs/verification.md` §18.1), and 200% zoom plus keyboard/focus were measured on desktop Chrome in
read-only states (**November 23 update:** the local core mutation states also have bounded 200%
evidence, §5.3). Still absent are screen-reader speech beyond the user-observed sign-in control
naming and AC15 validation; no hosted reCAPTCHA-attested cloud request exists. Ordinary-text contrast
ratios now exist for 31 measured states (§5.2, `docs/verification.md` §18.2). Any shot of these runs
may be described as bounded evidence, never as WCAG or hybrid/cloud proof, and no physical-phone
footage exists.

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

**Dated correction — November 20, 2026.** The closing "no hosted on-device request exists" claim is
superseded. An inspected delegate run against `https://shiftrelay-hybridai-2026.web.app` reports two
genuine Firebase AI Logic `ONLY_ON_DEVICE` generations on the deployed origin (4/5 suggestions per the
inspected HANDOFF summary; the per-run split is not recorded; 79.7 s and 24.5 s as reported timings; no
measured AI-host request). The Gemma 4 provenance (`gemma4_component` 2026.8.7.929,
`gemma4_gpu_low_tier_model` / `gemma4-2b-it`) is inherited from the ADR 0006 localhost evidence, not
re-measured on the hosted origin. A legacy v3 asset was reported earlier at 0 MiB weights with its
install pending, so v3 provenance must be rechecked before future model claims and nothing v3 is
relabelled Nano 4. This is one delegate's inspected report, not a master replay (§5.2,
`docs/verification.md` §17): it is hosted local-model evidence
only, not a hosted reCAPTCHA-attested cloud request, not AC13 completion and not an independent
"Nano 4" identification. A hosted attested cloud request remains unverified, so AC13/Q6 stay open.

## 13. Honest limits

Unverified and not to be claimed: a hosted on-device request (**superseded — see the dated
correction below**); a hosted reCAPTCHA-attested request; the deployed CSP actually running without
violations (the header is served as reviewed, but no browser console was observed); in-app cloud
reconciliation on the deployed origin; real Android Chrome touch;
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

**Dated correction — November 23, 2026.** The "hosted reCAPTCHA-attested request" and "in-app cloud
reconciliation on the deployed origin" entries above are no longer unobserved: §5.4 records one
delegated observation of a consented hosted cloud request (App Check exchange POST 200 twice,
`firebasevertexai` POST 200, brief with zero suggestions, no task write). It establishes only that;
the served model, the limited-use flag and `inferenceSource` were not directly observed, the path is
not shown to be reproducible without an interactive real-Chrome session, and the projection proof
cited there is the delegate's (master inspected the source, not a replay).

**Dated correction - November 20, 2026 (updated after the physical-phone and contrast evidence).**
The **hosted on-device request**, **200% zoom/keyboard**, **real Android Chrome touch** and
**ordinary-text contrast** entries above now have bounded evidence and must still not be overstated:
200% zoom and keyboard/focus were measured on desktop Chrome in signed-out and read-only signed-in
states only (**November 23 update:** the core mutation states now have bounded local 200% evidence,
§5.3; hosted read-only remains the hosted measurement); the Android touch workflow was performed by
the user on their own physical Android 16
phone (Chrome reported as "latest", exact version unrecorded) against the hosted origin, with
portrait/landscape reachability, no portrait horizontal scrolling, the empty-submit native required
message, one synthetic sign-in per role, a manually typed draft, one publication with the confirmed
open-task status, accept as self, resolve, reopen returning Accepted with the same owner, history and
sign-out. No agent instrumented, replayed or captured the phone. Emulator results stay supplementary.

The hardware question is **resolved by explicit user decision**, recorded in `CONSTRAINTS.md`
("Hardware clarification") and `docs/PLAN.md` ("Delivery clarification"): a physical Android phone is
required for release touch-workflow evidence and emulator-only results do not satisfy it. The earlier
"unresolved scope wording" note (responsive-web framing in `docs/spec.md` line 9 versus AC12's manual
physical-device checklist) is superseded as a scope question; what remains open is unmeasured
content, not whether hardware is required. TalkBack specifically, Android font-scale/high-contrast and
ordinary-profile probing are not named by AC12 or Q4, so their absence is a recorded limit rather than
an automatic blocker. Screen-reader announcements are only partially observed: one user-observed
Narrator pass covered the three sign-in controls' names, roles and required state, and no
status/alert/error announcement or protected-password announcement was observed.

Ordinary-text contrast **ratios** are now recorded for 31 rendered states by an outside-root harness
(algorithm self-check 13/13; hosted signed-out minimum 6.821:1; 17 local synthetic signed-in/hover
states at 4.608:1 minimum; 12 local labelled cloud-mock states, pending 9.776:1, error 10.145:1,
packet preview 16.283:1; 0 active failures and 0 unmeasurable in those sets). Disabled controls
(3.206:1, 2.766:1) are recorded separately under SC 1.4.3's inactive-component exemption. This does
not close AC12/Q4: ordinary-text contrast >=4.5:1 for transient/local-model/queue and
hosted-authenticated states remains unmeasured; non-text contrast (SC 1.4.11), other engines and
viewports, dark mode/high contrast, 320 px/200% re-measurement and real assistive technology are
scope limits, not additional thresholds, and no WCAG certification follows (`docs/verification.md`
§18). **November 23, 2026, narrow:** the transient/local-model/queue half of that gap is now
measured — 14 further local states, 0 active failures, ordinary minimum 4.608:1, 24 disabled-label
instances below 4.5 recorded separately with a 2.744:1 low (`docs/verification.md` §21) — while
hosted-authenticated states and the states §21 names as unrendered stay unmeasured; the scope limits
listed here are unchanged, not newly required. A hosted `ONLY_ON_DEVICE` generation exists; a
hosted reCAPTCHA-attested cloud request does not, so AC13/Q6 stay open. AC15 remains unvalidated.
See §5.2 and
`docs/verification.md` §17.

**Dated correction — November 23, 2026.** The preceding sentence's "does not" is superseded only for
the single observation in §5.4: one hosted attested cloud request returned 200 with a validated brief
and zero suggestions. AC13/Q6 stay open because the served model is unknown, provenance is the
adapter's own check rather than a captured field, there is no quota/latency coverage beyond this one
call, and the rest of AC13/Q6 (hosted local-model provenance recheck, product decision) is untouched.

## 14. Open items before submission

Status as of November 20, 2026 (earlier wording kept where still true):

1. Reviewed commit + `dirty=false` verifier run + green CI on that SHA (owner: active agent,
   `github-sync`). **Done for `00c2b2e`:** 16/16 clean evidence and CI run `44664598466` succeeded on
   that exact SHA. **Snapshot `88eaa15`:** full 16/16 clean/stable/complete at `18:55:09Z` (§1). Still
   open: reviewer sign-off on the docs-only fixes and, at gate time, verifier evidence for the commit
   then current (a report certifies only its own SHA); no re-run of the deployment, hosted QA or
   artifact review is implied by a docs-only edit. PR/merge step open.
2. Keyed QA build and sealed stage — implemented, exercised and now **deployed** from the sealed stage
   (§5.1). Any *next* deploy needs a fresh reviewed build + stage, not a re-use of this one.
3. Rules/indexes release — **done** (`cloud.firestore`, ruleset `137c406c…`, `03:51:56Z`); Hosting —
   **done** (`1795146753235000`, `03:52:33Z`); HTTP surface observed (§5.1). **Updated November 20,
   2026:** a synthetic sign-in and the share/accept/resolve/reopen workflow are now covered by an
   inspected delegate run and, later the same day, user-observed on a physical Android phone (§5.2).
   Console/CSP coverage is partial, not absent: the earlier signed-out
   hosted smoke recorded no CSP violations and no page errors, while authenticated and model-path
   console/CSP behavior, the hosted reCAPTCHA-attested App Check exchange and the hosted consented
   cloud flow remain unverified. No group closed. **November 23, 2026:** the App Check exchange and
   one hosted consented cloud request now have one delegated observation (§5.4: exchange POST 200
   twice, `firebasevertexai` POST 200, zero suggestions, no task write); authenticated console/CSP
   behavior, reproducibility, served-model provenance and Firestore App Check enforcement remain
   unverified, and no group is closed.
4. Decide the private judge-credential channel; keep values out of the repo.
5. Record the ≤3 minute demo on the real runtime; upload is a separate user approval.
6. Probe the ordinary Chrome profile for the flag/model; real device, screen-reader, zoom and user
   checks. **Updated November 20, 2026 (later):** desktop 200% zoom/keyboard, submit-time native
   validation, emulator touch, a **user-observed physical Android 16 phone walkthrough of the touch
   workflow** (sign-in per role, manual draft, review, one publication with the confirmed open-task
   status, accept as self, resolve, reopen returning Accepted with the same owner, history and
   sign-out) and **recorded ordinary-text contrast ratios** (31 states, 0 active failures, minimum
   4.608:1) now exist (bounded, §5.2 and `docs/verification.md` §18). Physical hardware is required by
   explicit user decision (`CONSTRAINTS.md` "Hardware clarification"), so the earlier unresolved
   scope-wording note no longer applies. Still required by contract: full screen-reader announcements
   (AC12 - only the three sign-in controls' names/roles/required state were user-observed), 200%
   zoom/keyboard core actions after a mutation (**November 23 update:** core mutation states now have
   bounded local evidence, §5.3; states not sampled there remain required), and ordinary-text contrast
   >=4.5:1 for the unmeasured
   core states (transient/local-model/queue, hosted authenticated). Scope limits only, not additional
   thresholds: non-text contrast, other engines and viewports, dark mode/high contrast, 320 px/200%
   re-measurement. Limits/
   follow-ups only: TalkBack specifically, Android font-scale/high-contrast, ordinary-profile probing,
   manual AT coverage of mutation states. No WCAG certification follows.

   **November 23, 2026, narrow:** the transient/local-model/queue contrast states are no longer in
   this open list — 14 further states are recorded in `docs/verification.md` §21 (ten local-model,
   two queue, two workspace phase) with 0 active ordinary failures; hosted-authenticated states, queue
   refresh failure, workspace `phase === "error"`,
   cloud `status-confirmed` and the stale-consent/context-layout tone remain open. No new
   requirement is added by this update.
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
