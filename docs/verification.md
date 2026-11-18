# Local preflight verification

Owner: implementer. Date: November 16, 2026. Scope: approved local tooling, official Firebase
skill adoption (Gate G6 prerequisites), Gate A diagram evidence, the Phase 4 frozen contract with
its minimal tested domain skeleton (§5), the Phase 7 pre-integration defect fixes (§6), and the
Rules/persistence cut against the local Firestore emulator (§7). No UI, Auth session or live
Firebase project exists, and no cloud provisioning, spend, deployment, commit or push was performed.

Every command below was run in the project root on Windows PowerShell with Node 24.14.0,
npm 11.9.0 and Python 3.15.2. Outputs are sanitized: absolute user directories are replaced by
`~` and repeated package-install noise is omitted. Nothing here is a passing result for
application behavior; SPEC/PLAN/CONSTRAINTS checks remain unmeasured.

## 1. Mermaid renderer (exact pin)

`package.json` declares tooling only, no application scaffold:

| Package | Pin | Why |
|---|---|---|
| `@mermaid-js/mermaid-cli` | `12.2.0` | real Mermaid renderer used by the checker |
| `puppeteer` | `25.17.0` | declared peer of mermaid-cli, pinned so the browser control layer is reproducible |

Install command (one-time network access to the npm registry):

```powershell
$env:PUPPETEER_SKIP_DOWNLOAD='1'; npm install --no-fund --no-audit
```

```text
added 192 packages in 47s
```

`PUPPETEER_SKIP_DOWNLOAD=1` avoided Puppeteer's bundled Chromium download (~200 MB). The checker
instead reuses an already installed browser: Google Chrome `157.0.8103.78` at its default Windows
install path, detected at run time and passed to Puppeteer through a temporary
`executablePath` config, or through `MERMAID_PUPPETEER_CONFIG` if set. No browser was downloaded
by this preflight. Check-time rendering is offline: the CLI is loaded from
`node_modules/@mermaid-js/mermaid-cli/src/cli.js` via `node`, so no `npx` fetch happens per diagram.

Verified renderer version:

```powershell
node node_modules/@mermaid-js/mermaid-cli/src/cli.js --version
```

```text
12.2.0
```

## 2. Diagram checker

`scripts/check_diagrams.py` is a standard-library Python wrapper, adapted from the global template,
that extracts ` ```mermaid ` blocks from Markdown, renders each one with the pinned Mermaid CLI and
writes SVG plus a JSON report under `.git/opencode/`.

Contract:

- Missing renderer, missing Markdown, missing Mermaid block or any failed render exits non-zero.
- `--self-test` renders a known-good diagram (must pass) and a malformed one (must fail); it exits
  non-zero if the renderer is unavailable, so an unverified environment is never reported as OK.
- No homegrown parser stands in for rendering: the CLI is the only pass/fail authority.
- Defaults: `--out-dir .git/opencode/diagrams`, `--report .git/opencode/diagram-check.json`.

### Red step (tests written first)

```powershell
py -3 -m unittest tests.test_check_diagrams -v
```

```text
FAIL: test_no_mermaid_blocks_fails ... AssertionError: 2 != 1 :
  can't open file '...\scripts\check_diagrams.py': [Errno 2] No such file or directory
FAIL: test_valid_diagram_passes_and_writes_svg ... AssertionError: 2 != 0 : ...
FAIL: test_malformed_diagram_fails ... (same missing script)
ERROR: test_extracts_only_mermaid_blocks ... (same missing script)

Ran 4 tests in 0.234s
FAILED (failures=3, errors=1)
```

### Green step

```powershell
py -3 -m unittest tests.test_check_diagrams -v
```

```text
test_extracts_only_mermaid_blocks ... ok
test_malformed_diagram_fails ... ok
test_no_mermaid_blocks_fails ... ok
test_valid_diagram_passes_and_writes_svg ... ok

Ran 4 tests in 4.926s
OK
```

(First green run. A later re-run after making the checker's SVG path independent of the working
directory also passed 4/4 and re-rendered the spec diagram byte-identically.)

The tests cover the nontrivial checker behavior: block extraction, a valid diagram producing an SVG
and an `ok` report, a malformed diagram failing with no SVG written, and a document without
Mermaid blocks failing.

### Checker self-test

```powershell
py -3 scripts/check_diagrams.py --self-test
```

```text
self-test OK
SELFTEST_EXIT:0
```

### Gate A render of `docs/spec.md`

```powershell
py -3 scripts/check_diagrams.py docs
```

```text
OK docs\spec.md#1 -> .git\opencode\diagrams\docs__spec-1.svg
1/1 diagrams OK
CHECK_EXIT:0
```

Artifacts (not committed; `.git/opencode/` is local evidence):

| Artifact | Size | SHA-256 |
|---|---|---|
| `.git/opencode/diagrams/docs__spec-1.svg` | 244,962 bytes | `509bad4ed3dc5bfb312d5d4d0acab6c191f95209683c356525e38ad122d48eb6` |
| `.git/opencode/diagram-check.json` | 363 bytes | — |

The report records `renderer: "12.2.0"`, `ok: true` and one result. The SVG contains the spec's
flowchart node labels (for example `Outgoing captures private text in memory` and the reopen
branch), so this is a render of the real spec diagram, not a placeholder. `docs/ARCHITECTURE.md`
did not exist during this preflight; §5 adds that second diagram and re-renders both.

## 3. Official Firebase agent skills (G6 prerequisite)

### Catalog check before install

Existing global catalog `~/.agents/skills` (44 skills before this install) contained no `firebase-*` or
Firestore-specific skill; the project had no `.agents/` directory. Global and project `SKILL.md`
names were checked before installing, so no duplicate was added.

### Pinned upstream revision

| Item | Value |
|---|---|
| Repository | `firebase/agent-skills` |
| Revision | `99954a30898bb5ddc8152ee10e124dc3b4106bf7` (commit dated 2026-11-09) |
| Skills listed at that revision | 14 (from `skills add ... -l`) |

Naming reconciliation against ADR 0001:

| Task | Actually installed ID | ADR candidate / documentation table | Result |
|---|---|---|---|
| AI Logic, hybrid, App Check | `firebase-ai-logic-basics` | same | match |
| Authentication | `firebase-auth-basics` | same | match |
| Firestore | `firebase-firestore` | `firebase-firestore-standard` / `-enterprise-native-mode` | documentation table names do not exist as skill directories; edition variants are `references/standard/` and `references/enterprise/` inside `firebase-firestore` |
| Rules audit | `firebase-security-rules-auditor` | `firestore-security-rules-auditor` | guide table name does not exist; the real ID is `firebase-security-rules-auditor` |
| Static SPA Hosting | `firebase-hosting-basics` | same | match |
| CLI/project setup | not installed | `firebase-basics`, `firebase-local-env-setup` | `firebase-local-env-setup` is absent from the repository; `firebase-basics` is deferred until CLI/project work is authorized |
| Rules authoring | not installed | `firestore-rules-creation` | `firebase-firestore` delegates rules authoring to it; considered for the later rules-authoring task, outside this preflight |

The repository's own README now points install commands at `firebase/skills` while installs still
resolve through `firebase/agent-skills`; that guide/repository alias mismatch is recorded, not
silently resolved.

### Install command and result

```powershell
npx -y skills@latest add firebase/agent-skills@99954a30898bb5ddc8152ee10e124dc3b4106bf7 `
  -s firebase-ai-logic-basics firebase-auth-basics firebase-firestore `
     firebase-security-rules-auditor firebase-hosting-basics `
  -g -a opencode -y --json
```

Installed to `~/.agents/skills` (scope `global`, mode `copy`), recorded in
`~/.agents/.skill-lock.json` with the pinned `ref`:

| Skill | Files | Size | Upstream folder hash (also the lock `skillFolderHash`) |
|---|---|---|---|
| `firebase-ai-logic-basics` | 6 | 64.8 KB | `2f45dc17630ad5045139fa0fa63a680879b11980` |
| `firebase-auth-basics` | 6 | 28.1 KB | `ee4364167c59d8c5eb99c1f02383346a2a1d2fd1` |
| `firebase-firestore` | 15 | 71.9 KB | `19908d324efc45714b6520f0ff8d0c8150f532b1` |
| `firebase-hosting-basics` | 3 | 5.5 KB | `600d72f9f565a5cb3856413c8d373db90d6361e0` |
| `firebase-security-rules-auditor` | 1 | 3.9 KB | `88cb827c95d7266070b6dbc45afd8935a3770113` |

The lock hashes match the GitHub tree SHAs for those directories at the pinned revision, so the
copied content is verifiable against the recorded commit.

### Loading route

After installation the five skill IDs became visible in this session's skill catalog and were
listed with their upstream descriptions; the loader reports them as available by exact ID
(`firebase-ai-logic-basics`, `firebase-auth-basics`, `firebase-firestore`,
`firebase-security-rules-auditor`, `firebase-hosting-basics`). Contents were read from
`~/.agents/skills/<id>/SKILL.md` and treated as reference. Upstream instructions never override
project workflow, permissions, or the no-provisioning/no-spend boundaries; their CLI commands
(e.g. `firebase init ailogic`, `firebase deploy`) were **not** run.

Firebase MCP was **not** enabled or configured. `firebase-tools` was not installed globally.

## 4. State and limits

- Files created by the preflight: `package.json`, `package-lock.json`, `scripts/check_diagrams.py`,
  `tests/test_check_diagrams.py`, `docs/verification.md`. §5 records the Phase 4 additions.
- `node_modules/` and `__pycache__/` are covered by the existing `.gitignore`.
- At preflight there was no application, test suite, Firebase project, emulator, rules file or
  deployment. §5 now adds the pure domain modules and their suites; nothing else changed.
- The checker rendered one real diagram (Gate A). §5 adds the architecture sequence diagram.
- Screen-reader, keyboard, accessibility, privacy, Rules, hybrid and cloud evidence remains
  unmeasured; CONSTRAINTS.md thresholds are still targets.

## 5. Phase 4 — frozen contract and minimal domain skeleton

Scope of this cut: contract freeze plus a pure, tested domain module. No UI, no Firebase adapter,
no `firestore.rules`, no emulator, no deployment, no commit and no push.

### 5.1 Tooling added (merged into the existing `package.json`)

| Package | Exact pin | Reason | Verified |
|---|---|---|---|
| `typescript` | `7.0.2` | strict type check separate from Vitest transpilation | `npx tsc --version` → `Version 7.0.2` |
| `vitest` | `5.1.0` | unit runner for the domain contract | `npx vitest --version` → `vitest/5.1.0 win32-x64 node-v24.14.0` |
| `vite` | `8.3.8` | peer required by Vitest 5.1.0 | resolved by `npm install` |
| `@types/node` | `24.19.2` | integrity with the Node 24 runtime | resolved by `npm install` |

The existing Mermaid pins (`@mermaid-js/mermaid-cli` `12.2.0`, `puppeteer` `25.17.0`) were kept and
their lockfile entries unchanged; `PUPPETEER_SKIP_DOWNLOAD=1` reused the installed browser again.
`npm install --no-fund --no-audit` added `38 packages in 14s` with no browser download.

### 5.2 Red step — tests before implementation

Domain tests first (`src/domain.ts` and `src/validation.ts` absent):

```powershell
npm run test:unit
```

```text
FAIL  tests/transitions.test.ts [ tests/transitions.test.ts ]
Error: Cannot find module '../src/domain' imported from .../tests/transitions.test.ts
FAIL  tests/validation.test.ts [ tests/validation.test.ts ]
Error: Cannot find module '../src/domain' imported from .../tests/validation.test.ts
 Test Files  2 failed (2)
      Tests  no tests
EXIT: 1
```

Verifier tests first (`scripts/verificar.py` absent):

```powershell
py -3 -m unittest tests.test_verificar -v
```

```text
ModuleNotFoundError: No module named 'verificar'
Ran 10 tests in 0.423s
FAILED (errors=10)
EXIT: 1
```

Two implementation-adjacent test defects were fixed during green (a `targetVersion` mismatch in one
observation case, and an assertion that mutated a frozen object); the assertions were corrected, not
the contract.

### 5.3 Green step

```powershell
npm run typecheck
```

```text
> tsc --noEmit -p tsconfig.json
TSC_EXIT:0
```

```powershell
npm run test:unit
```

```text
 RUN  v5.1.0 C:/Users/acer/Documents/Firebase-AIlogic-Hackathon
 Test Files  2 passed (2)
      Tests  54 passed (54)
      Duration  337ms
UNIT_EXIT:0
```

The 54 cases cover: fixture/constant drift for enums, limits and error codes; ASCII, supplementary
(U+1F600), combining (`e` + U+0301), precomposed (U+00E9) and mixed byte boundaries at and above the
120/800 byte caps; unpaired surrogates in both directions; unknown, missing and mistyped keys;
1–5 card bounds; input immutability and frozen results; error messages that never echo rejected
text; publication planning with stable IDs; every allowed transition and the full rejection set
(wrong role, wrong state, non-owner, stale version, forged version, invalid identifiers, blank or
oversized payloads, missing/duplicate/stale/unobservable/cross-venue/mismatched observation targets);
activity ID derivation and exactly one activity per version. Phase 7 added the task-input contract
group (unknown/missing task keys, stored title/detail/identifier bounds, impossible
owner/state/resolution combinations, target snapshot validation, no mutation) and the version
headroom group (unsafe integers, exhausted increment).

```powershell
npm run test:tools
```

```text
Ran 18 tests in 9.298s
OK
TOOLS_EXIT:0
```

`tests/test_check_diagrams.py` (4) plus `tests/test_verificar.py` (14): evidence field completeness,
output hashes, fail-closed behavior without git metadata or required artifacts, honest `unborn`
commit reporting, blocker-caused `ok=false`, `MODE=`/`MODE:` project-mode parsing, post-check tree
mutation detection, git metadata command failure failing closed, a scope regression that keeps Gate C
and Q5 unclaimed, CLI `--self-test`/`--list`, and a one-check CLI report run.

### 5.4 Diagram budget and render

`phases/4-5-build.md` asks Cortes 1 for C4 context/container diagrams plus a sequence diagram, while
`workflow/core.md` allows two diagrams in `full` mode. Reconciliation (recorded in
`docs/ARCHITECTURE.md` §7): C4 level-1/level-2 boundaries are text tables with trust positions, and
the single architecture diagram is a sequence of publication and ownership. Total across the project:
spec flowchart (1) + architecture sequence (1) = 2.

```powershell
py -3 scripts/check_diagrams.py docs
```

```text
OK docs\ARCHITECTURE.md#1 -> .git\opencode\diagrams\docs__ARCHITECTURE-1.svg
OK docs\spec.md#1 -> .git\opencode\diagrams\docs__spec-1.svg
2/2 diagrams OK
DIAGRAM_EXIT:0
```

| Artifact | SHA-256 |
|---|---|
| `docs__ARCHITECTURE-1.svg` | `e62cb3fcc628c03753af043c4e1885cd37bdb18076d733d7722699c85d870873` |
| `docs__spec-1.svg` | `509bad4ed3dc5bfb312d5d4d0acab6c191f95209683c356525e38ad122d48eb6` |

The spec SVG hash is identical to the Gate A preflight render, so the checker output is stable and
the pre-existing diagram was not altered by this cut.

### 5.5 Evidence run

```powershell
py -3 scripts/verificar.py --report .git/opencode/evidence.json
```

```text
CHECK typecheck: PASS
CHECK unit: PASS
CHECK tools-tests: PASS
CHECK checker-self-test: PASS
CHECK diagrams: PASS
CHECK contract-fixture: PASS
evidence: .git\opencode\evidence.json
scope: phase 4 contract-freeze-minimal-domain (product checks unimplemented)
Q5 credential scan: NOT IMPLEMENTED (homegrown diff regex removed; no pinned scanner installed)
GATE_C: NOT ELIGIBLE (unborn HEAD; dirty working tree; 8 scope items unimplemented)
ok=True commit=unborn dirty=True
VERIFY_EXIT:0
```

Per-check exit, duration and `stdout_sha256` are recorded in `.git/opencode/evidence.json` (local,
not versioned). The report also records `mode: "full"` (read from `docs/_project.md`) and
`tree_stable: true` (the git state is re-read after the checks, so a check that changes the tree
cannot be reported as clean). Repository state is honest, not normalized: the repository has no
commit yet, so `commit` is `unborn` and `dirty` is `true` with every path untracked.
`gate_c_eligible` is therefore false, and it stays false while any scope item is unimplemented, so
`ok=true` refers only to the six named Phase 4 checks, never to the product, Q1–Q6 or Gate C.

### 5.6 Rules feasibility finding

Documented limits (Context7 `/websites/firebase_google`, retrieved November 16, 2026): 10 document
access calls per single-document/query request, 20 per transaction or batched write, per-operation
limit still 10, cached calls excluded. The designed publication needs `1 + 5N` uncached calls for
`N` cards: 6 at one card, 16 at three, **26 at five**, and only 12 distinct document paths at five
cards with 3 calls per write. So: every individual write is comfortably inside 10; the atomic
20-call budget at the spec's five-card maximum depends on the documented caching of repeated same-path
`get()` calls. This is a measured-risk item for the Rules slice, not a proven pass, and the card cap
will not be lowered to fit. Observations need 2 writes and 5 uncached calls, so the call budget is
not their constraint; their constraint is that a Rules `get()` validates a snapshot and does not lock
the target, so target-version checking must also be part of the client transaction read set.

No `docs/spec.md` constraint was found infeasible. Two claims are deliberately narrowed rather than
silently weakened and are listed as R1–R5 in `docs/ARCHITECTURE.md` §8: target-version atomicity for
observations, and "exactly one accept" being a transaction property rather than a Rules-only property.

Superseded by §7.7: the authored `firestore.rules` also links a handover to its tasks, so the
uncached cost is higher than the Phase 4 estimate above; the five-card budget conclusion is recorded
there with the measured emulator result.

### 5.7 Scope limits of this evidence

Still unimplemented and unmeasured: a real credential scanner (see §6, Q5), `firestore.rules` and
all Rules/emulator tests, Firebase initialization and adapters, Auth session and membership
provisioning, React UI, accessibility (keyboard, screen reader, 200% zoom, 320 px), Playwright
suites, npm `lint` and production `build`, local model drafting, cloud reconciliation, Hosting,
hybrid runtime evidence and deployment. The Phase 4 unit tests are pure-function tests: they prove
the contract, not any backend behavior. CONSTRAINTS.md thresholds Q1–Q6 remain unmeasured targets.

Next step (owned by master): authorize the Firestore Rules and emulator slice, where the five-card
call budget and the client/Rules byte-verdict equality must be measured before any authorization or
publication claim. Q5 also needs an authorized pinned scanner decision before any secret-hygiene
claim.

## 6. Phase 7 — pre-integration defect fixes

Six defects were reported after inspection. Each was reproduced with a failing regression before
the fix. Scope unchanged: no UI, adapter, Rules, cloud, commit or push.

Red first (both suites failed for the reported reasons):

```text
 FAIL  tests/transitions.test.ts > applyTransition accept > rejects unsafe versions and exhausted increments
Expected: "invalid_version"  Received: "stale_version"
 FAIL  ... > applyTransition task input contract > rejects missing and unknown task keys instead of casting them
 FAIL  ... > enforces the stored title, detail and identifier bounds
 FAIL  ... > rejects owner, state and resolution combinations no transition can produce
Expected: "invalid_state"  Received: "forbidden_transition"
 FAIL  ... > validates the target snapshot with the same contract
Error: expected ContractError, nothing was thrown
 FAIL  ... > applyTransition observe > rejects a snapshot that is not the task the command names
Error: expected ContractError, nothing was thrown
 Test Files  1 failed | 1 passed (2)
      Tests  6 failed | 48 passed (54)
UNIT_EXIT:1
```

```text
FAIL: test_secret_scan_is_absent_and_q5_gap_is_named
AssertionError: 'secret-scan' unexpectedly found in ['typecheck', ..., 'contract-fixture', 'secret-scan']
Ran 14 tests in 3.596s
FAILED (failures=3, errors=3)
```

### 6.1 Observation target identity was never checked

**Symptom:** `applyTransition` for `observe` accepted any well-formed task snapshot as the target,
so a command naming `targetTaskId: "task-a"` could be recorded against `task-b` at the same version.
**Cause:** `readTask(targetTask)` validated shape only; `command.observation.targetTaskId` was used
for the duplicate check and stored in the activity but never compared with `target.id`.
**Fix:** reject a snapshot whose `id` differs from `command.observation.targetTaskId` as
`forbidden_transition at targetTask.id`, before duplicate/venue/version/state checks.
**Test:** `tests/transitions.test.ts` → "rejects a snapshot that is not the task the command names".

### 6.2 Task input was cast after partial validation

**Symptom:** a task missing `handoverId`/`creatorId`, with a blank or oversized title/detail, extra
keys, or an impossible owner/state/resolution combination reached transition logic intact.
**Cause:** `readTask` checked a subset and returned `value as unknown as Task`; the domain declares
that input `unknown`.
**Fix:** `readTask` validates the whole persisted-free `Task` contract (exact keys, identifiers,
title/detail byte caps, safe version, and `open` ⇒ no owner/no resolution, `accepted` ⇒ owner and no
resolution, `resolved` ⇒ owner and 1–800 byte resolution) and returns a frozen copy. `accepted` with
`ownerId: null` and `resolved` with a cleared resolution are impossible under the transition matrix,
so rejecting them narrows nothing legitimate. Two test fixtures that built such impossible states
were corrected instead of the contract.
**Tests:** `tests/transitions.test.ts` → the "applyTransition task input contract" group, plus the
target-snapshot and no-mutation observation cases.

### 6.3 Versions were integers, not safe integers

**Symptom:** `version: 2^53` or `1e308` passed `Number.isInteger`, and a task at `2^53−1` produced a
non-monotonic `version + 1`.
**Cause:** `versionField` used `Number.isInteger` and nothing rejected an exhausted increment.
**Fix:** `Number.isSafeInteger` in `versionField`, and `invalid_version at task.version` when the
source version is `2^53−1`. `2^53−2` still transitions to `2^53−1`.
**Test:** `tests/transitions.test.ts` → "rejects unsafe versions and exhausted increments".

### 6.4 Verifier read the wrong project-mode syntax

**Symptom:** `evidence.json` reported `mode: "unknown"` although `docs/_project.md` says `MODE=full`.
**Cause:** the regex required `MODE:`.
**Fix:** `MODE\s*[:=]` in `project_mode`; `--self-test` now also fails if the real file is unreadable.
**Tests:** `tests/test_verificar.py` → "reads assignment and colon syntax"; the CLI report test now
asserts the real project reports `full`.

### 6.5 Verifier could report a clean tree a check had just dirtied

**Symptom:** git state was read only before the checks, so a check writing files produced
`dirty: false` and a passing run; a failed `git status` silently produced an empty status.
**Cause:** `git_state` treated any failure as "no changes", and `build_evidence` never re-read state.
**Fix:** `git_state` records `ok`/`problems` (unborn `HEAD` is exit 1 with no output; every other
non-zero exit is a blocker), `build_evidence` re-reads the state after the checks, reports
`state_after`/`tree_stable`, and requires a stable tree for `ok`. Git metadata failure now blocks
before any check runs.
**Tests:** `tests/test_verificar.py` → "a check that mutates the tree is not reported clean" and
"git metadata failure fails closed".

### 6.6 The homegrown secret scan was not a Q5 scanner

**Symptom:** the verifier printed `CHECK secret-scan: PASS` for a regex over `git diff` output, while
untracked and clean tracked files were never scanned; Q5 requires an authorized pinned redacting
scanner, not a regex substitute.
**Cause:** the scan was invented locally to fill the Q5 slot.
**Fix:** the regex and its `--self-test` cases were removed, `secret-scan` is gone from
`SCOPE["included"]` and from the passing check list, and
`SCOPE["unimplemented"]` now names "real credential scanner for Q5 … Q5 stays unmeasured".
`gate_c_eligible` requires an empty unimplemented list, so Phase 4 scope alone can never print
`GATE_C: ELIGIBLE` or a product/Q5 claim; the CLI states the Q5 gap on every run.
**Test:** `tests/test_verificar.py` → "secret scan is absent and Q5 gap is named" and "passing Phase 4
checks never claim Gate C or product scope". Q5 is **not** met and remains a blocker.

## 7. Rules and persistence cut (Phase 4–5, slice 1 partial)

Scope: authorization and persistence contract only, against the local Firestore emulator. No UI, no
Auth session, no live Firebase project, no provisioning, no deployment, no commit and no push. The
frozen contract in `docs/INTERFACES.md` did not change; `tests/fixtures/contrato.json` needed no edit
because no type, limit, enum, error code or transition changed.

### 7.1 Dependencies added (exact pins, merged into the existing `package.json`)

| Package | Pin | Scope | Why |
|---|---|---|---|
| `firebase` | `13.3.0` | dependency | modular client SDK used by `src/tasks.ts`; also powers emulator identity |
| `@firebase/rules-unit-testing` | `6.0.0` | dev | loads `firestore.rules`, clears data, seeds with rules disabled |
| `firebase-tools` | `15.36.0` | dev | `emulators:exec`, so no `npx @latest` download per run |

The four existing pins (`typescript` 7.0.2, `vitest` 5.1.0, `vite` 8.3.8, `@types/node` 24.19.2) and
the Mermaid pins are unchanged. Install output (network access to the npm registry only):

```powershell
$env:PUPPETEER_SKIP_DOWNLOAD='1'; npm install --no-fund --no-audit
```

```text
added 792 packages in 2m
```

Runtime for the Rules suites: Node 24.14.0, Java `openjdk 21.0.8` (Temurin), Firebase CLI 15.36.0,
`cloud-firestore-emulator-v1.22.0.jar` downloaded once into the user emulator cache. The project id
is `demo-shiftrelay`; `firebase.json` binds the emulator to `127.0.0.1:8080` and disables the UI.
`firebase` refuses non-emulated services for a `demo-` project id, so no live read, write, auth call,
provisioning or spend is possible from these commands.

### 7.2 Skills used for this cut

- `firebase-firestore` (installed at the pinned revision): read `references/standard/web_sdk_usage.md`
  and `references/standard/indexes.md`. Its mandatory edition-discovery command was **not** run
  because live project discovery is not authorized; the approved local scope fixes Standard edition
  emulators, and the emulator reports `Database Edition: STANDARD`.
- `firestore-rules-creation` (absent at preflight; installed now from the same reviewed revision
  `99954a30898bb5ddc8152ee10e124dc3b4106bf7`, folder hash
  `0dbc00cf86de7935d6b02c04a2d5dee680d35b3b`): loaded by its discovered ID. No
  `firestore-rules-author` subagent exists in this environment, so the skill's documented
  direct-authoring fallback applied. Upstream deployment instructions were not followed.
- Upstream skill text is reference data: no install, deploy, provisioning or billing command from it
  was executed.

### 7.3 Files created in this cut

`firestore.rules`, `firebase.json`, `firestore.indexes.json`, `src/tasks.ts`,
`tests/rules/support.ts`, `tests/rules/permissions.test.ts`, `tests/rules/concurrency.test.ts`,
`vitest.config.mts`, `vitest.rules.config.mts`. `package.json` was merged, not replaced. `src/firebase.ts`
was deliberately not created: there is no app shell or Auth flow yet, and a client initializer with no
caller would be unverified code. Tests supply their own emulator-bound Firestore instances.

Unit/rules isolation: `vitest.config.mts` includes only `tests/*.test.ts`, so `npm run test:unit`
never collects `tests/rules/**`; `vitest.rules.config.mts` includes only `tests/rules/**/*.test.ts`,
runs files sequentially (one shared emulator project) and raises the per-test timeout.

### 7.4 Red step

`firestore.rules` and `src/tasks.ts` were absent, so the suites could neither load rules nor import
the adapter:

```powershell
npm run test:rules
```

```text
!  firestore: Cloud Firestore rules file ...\firestore.rules specified in firebase.json does not exist.
!  firestore: The emulator will default to allowing all reads and writes.
 FAIL  tests/rules/concurrency.test.ts [ tests/rules/concurrency.test.ts ]
Error: Cannot find module '../../src/tasks' imported from .../tests/rules/concurrency.test.ts
 FAIL  tests/rules/permissions.test.ts [ tests/rules/permissions.test.ts ]
Error: Cannot find module '../../src/tasks' imported from .../tests/rules/permissions.test.ts
 Test Files  2 failed (2)
      Tests  no tests
RULES_EXIT:1
```

### 7.5 Green step

```powershell
npm run typecheck
```

```text
> tsc --noEmit -p tsconfig.json
TSC_EXIT:0
```

```powershell
npm run test:unit
```

```text
 Test Files  2 passed (2)
      Tests  54 passed (54)
 UNIT_EXIT:0
```

The unit command collected only the two domain files, confirming `tests/rules` isolation.

```powershell
npm run test:rules
```

```text
 Starting emulators: firestore
 Detected demo project ID "demo-shiftrelay", emulated services will use a demo configuration
 +  firestore: Firestore Emulator was started in standard edition.
 Running script: vitest run --config vitest.rules.config.mts
 Test Files  2 passed (2)
      Tests  28 passed (28)
      Duration  19.24s
RULES_EXIT:0
```

28 emulator cases: 25 in `permissions.test.ts`, 3 in `concurrency.test.ts`. The Rules file under test
is the real `firestore.rules` read from disk; the emulator would otherwise default to allow-all, and
the denial cases prove it did not.

```powershell
npm run test:tools
```

```text
Ran 19 tests in 18.292s
OK
TOOLS_EXIT:0
```

`tests/test_check_diagrams.py` (4) still passes; `tests/test_verificar.py` now has 15 tests, including
the updated explicit-check assertion and a new scope test that keeps the product gaps named.

### 7.6 What the emulator measured

Every negative case below is a direct modular-SDK write (not the client validator), so the verdict is
Rules behavior. Every positive case goes through `src/tasks.ts` and the real SDK.

- **Identity and membership.** Signed-out clients cannot read tasks, handovers or membership, and
  cannot list. A nonmember cannot read, list or write. A member can read the venue's tasks and
  handovers, and can list only with an explicit limit of at most 50; a query without a limit and a
  limit of 51 are denied. A member reads its own membership document only; another member's document
  and any roster list are denied. A member of venue A has no access to venue B. No client can create,
  update or delete membership, so an incoming member cannot promote itself to outgoing.
- **Atomic publication.** Outgoing published 1, 2, 3, 4 and 5 cards; each batch produced the
  handover, N open/unassigned/version-1 tasks and N creation activities, with task `createdAt`,
  `updatedAt` and activity `at` equal to the server commit time. Incoming, nonmember and signed-out
  publications are denied. Partial batches are denied: handover without tasks, tasks without
  handover, tasks without their activities, and a batch missing one of the two listed tasks. Forged linkage is
  denied: a task the handover does not list, a task claiming another handover, a task or handover
  with another creator, a handover whose `id` field does not match its path, six cards, an empty task
  list, an unknown key, and client-supplied creation time.
- **Transitions.** Incoming accepts an open task (v2, owner = actor, `accept` event); the owner
  resolves (v3, resolution retained in the event), reopens (v4, resolution cleared on the task,
  previous resolution still on the v3 event), and either role records an observation without changing
  state or owner. Denied with direct writes: outgoing acceptance, assigning the task to a different
  owner, releasing the owner, accepting an accepted task, resolving an open task, reopening an
  accepted task, resolving or reopening another member's task, arbitrary state patches, version
  jumps, post-publication title edits, a resolution smuggled into an accept, deletes of task,
  activity or handover, standalone activities, actor mismatch, non-derived activity ID, activity for
  a version the task does not reach, a version above the safe-integer ceiling, client-supplied event time,
  client-supplied update time, activity updates, and observations against a moved, missing, self, resolved or
  cross-venue target with an over-limit rationale or a non-positive target version.
- **Byte contract.** For every class (ASCII, supplementary `U+1F600`, combining `e`+`U+0301`,
  precomposed `U+00E9`, mixed) the client verdict and the direct-Rules verdict agreed at the title cap
  and one byte over, and at the detail cap and one byte over; accepted strings read back
  byte-identically, including the supplementary and combining cases. Resolution 800 bytes and reopen
  reason 400 bytes pass through the adapter; 801 and 401 bytes, and blank text, are denied by Rules.
- **Concurrency.** Two isolated clients raced to accept the same open task: exactly one succeeded,
  the task ended at version 2 with the winner as owner, exactly one `__v2` acceptance event exists
  with the winner as actor, no `__v3` event exists, and the other task was untouched. A write built
  from a snapshot captured before that acceptance was denied, and the owner did not change. An
  observation whose target moved from version 1 to 2 was rejected by the adapter (`stale_target`) and
  by a forged direct write; nothing was written.

### 7.7 Rules request/read budget conclusion

The authored coupling is stricter than the Phase 4 sketch: a handover create now also proves that
every listed task exists in the same batch, so the uncached cost is `7N+2` calls for `N` cards
(9 at one card, 23 at three, 37 at five) over `2N+2` distinct paths (12 at five). Per-operation cost
is at most 7, under the documented 10. The 20-call budget for a batched write at five cards is met
only with the documented caching of repeated same-path `get()` calls. The emulator accepted 1–5 card
batches atomically, but it does not report whether it enforces the 10/20 call limits, so this is
functional evidence, not a production-budget measurement. The five-card cap was not lowered; a
production denial escalates to master (`docs/ARCHITECTURE.md` §8, R3).

Observation costs 5 uncached calls over 4 distinct paths, so its constraint is the target snapshot,
not the call budget (R1).

### 7.8 Emulator findings worth knowing

- **`exists()` / `existsAfter()` are unusable in emulator 1.22.0.** Probing them produced evaluation
  errors even for absent documents, and so did negated null comparisons. `firestore.rules` therefore
  accesses coupled documents directly: a missing membership, handover, task or activity raises an
  evaluation error, which Rules treat as a denial. Every missing-record case is asserted as a denial
  in the suites, and no rule relies on an error being treated as allow. Recorded as R6 in
  `docs/ARCHITECTURE.md`.
- The emulator's verbose denial log lists the outcome of allow statements for collections the write
  did not target, so a log line reading `evaluation error` is not by itself a defect; the assertions,
  not the log text, decide the verdict. Allowed writes produced no failure logs.
- `connectFirestoreEmulator(db, host, port, { mockUserToken: { user_id } })` gives a modular client
  without the Auth emulator; seeding uses the emulator's rules-disabled mode
  (`initializeTestEnvironment` + `withSecurityRulesDisabled`). No Admin credentials exist anywhere.

### 7.9 Verifier scope extension and evidence run

`scripts/verificar.py` now includes a real `rules-tests` check (`npm run test:rules`), requires the
new files and the emulator toolchain (Node, npm, Java), and its `SCOPE` names the Rules cut. The
remaining blockers are still listed, so the verifier cannot claim product or Gate C completion.
`tests/test_verificar.py` was updated to expect the new check, to forbid `e2e` in any check, and to
assert that the unimplemented list still names the Auth session, UI, Playwright, credential scanner,
lint and build gaps (19 tooling tests pass).

```powershell
py -3 scripts/verificar.py --report .git/opencode/evidence.json
```

```text
CHECK typecheck: PASS
CHECK unit: PASS
CHECK rules-tests: PASS
CHECK tools-tests: PASS
CHECK checker-self-test: PASS
CHECK diagrams: PASS
CHECK contract-fixture: PASS
evidence: .git\opencode\evidence.json
scope: phase 4 contract-freeze-minimal-domain-plus-rules (product checks unimplemented)
Q5 credential scan: NOT IMPLEMENTED (homegrown diff regex removed; no pinned scanner installed)
GATE_C: NOT ELIGIBLE (unborn HEAD; dirty working tree; 7 scope items unimplemented)
ok=True commit=unborn dirty=True
VERIFY_EXIT:0
```

### 7.10 Limits of this evidence

Still unimplemented and unmeasured: Auth sign-in/session, membership provisioning, session-loss
handling, `src/firebase.ts`, React UI, accessibility (keyboard, screen reader, 200% zoom, 320 px),
Playwright end-to-end suites, privacy sentinel capture, `lint`, production `build`, local model
drafting, cloud reconciliation, Hosting, App Check, deployment and any live Firebase behavior. The
Rules are emulator-verified for synthetic identities only and are not deployed. Q2 is measured for
its Rules/Rules-race half but not its two-session UI half; Q3 is partial (typecheck, unit, Rules and
tooling are green, lint/build/E2E do not exist); Q1, Q4, Q5 and Q6 remain unmeasured.


## 8. Manual slice 1 cut — UI, Auth session and emulator-backed E2E

Scope: the manual private-note → reviewed publication → accepted ownership → resolution/reopen
workflow, against the local `demo-shiftrelay` Auth and Firestore emulators with synthetic identities.
No AI, cloud reconciliation, App Check, Hosting, deployment, live Firebase project, commit or push.
The frozen domain contract did not change; the persistence-adapter semantics did (batch → transaction
with stable-ID read-back), so `docs/INTERFACES.md`, `docs/ARCHITECTURE.md`,
`tests/fixtures/contrato.json` and `src/tasks.ts` were updated together.

### 8.1 Red evidence during the cut

Real failures observed before the final green run, kept here so the green result is not mistaken for
a one-shot success:

| Red observation | Cause and correction |
|---|---|
| `npm run test:rules` failed 3/32: one publication test built a 1-card plan with 3 task IDs; two “offline” tests expected `disableNetwork()` to reject transactions. | The first was a test-fixture defect; corrected to a one-ID context. `disableNetwork()` **queues** writes/transactions by design, so it cannot prove no-replay; those cases were removed and the real-browser offline suite is the evidence. |
| Playwright accessibility failed with axe `label-content-name-mismatch` (serious) on `Accept/Resolve/Reopen` buttons. | Real UI defect: the accessible name did not contain the visible label. Names changed to `Accept task: …`, `Resolve task: …`, `Reopen task: …`; scan green. |
| The conflict E2E failed because the losing accept surfaced `permission-denied` as “Access denied by Firestore Rules”, not a conflict. | Real UX defect: `permission-denied` on a current task is usually a lost version race. The message now says “Conflict: Firestore Rules rejected this change…”; revocation is handled separately by the membership watch. |
| The privacy test assumed no IndexedDB at all. | A `firebase-heartbeat-database` exists even with automatic data collection disabled; it is metadata, not Auth persistence or Firestore cache. The test now reads every IndexedDB record for the sentinel and rejects only `firebaseLocalStorageDb` / `firestore` databases. |
| The second offline E2E timed out waiting for an Accept button. | Test-harness race: it set offline while the explicit Refresh was still in flight. The test now waits for the task heading before going offline. |
| `tsc` failed on two `playwright-core` type trees (axe 4.14 resolved 1.57, Playwright 1.65). | Added an exact `playwright-core` 1.65.1 override; typecheck and the axe test then passed. TypeScript was moved from 7.0.2 to 6.0.3 because `typescript-eslint` 8.72.2 rejects the TS 7 API; both typecheck and lint use 6.0.3. |
| The ARCHITECTURE Mermaid diagram failed to render. | A semicolon in a sequence message was parsed as a statement separator; replaced with a comma. |

### 8.2 Green commands and actual output

```powershell
npm run typecheck
```

```text
> tsc --noEmit -p tsconfig.json
TSC_EXIT:0
```

```powershell
npm run lint
```

```text
> eslint .
LINT_EXIT:0
```

```powershell
npm run build
```

```text
> vite build
vite v8.3.8 building client environment for production...
✓ 41 modules transformed.
dist/index.html                   0.46 kB │ gzip:   0.29 kB
dist/assets/index-BSb7wnxz.css    8.85 kB │ gzip:   2.63 kB
dist/assets/index-B-eLfPnJ.js   808.89 kB │ gzip: 245.04 kB
✓ built in 842ms
BUILD_EXIT:0
```

The bundle-size hint is a Vite recommendation, not an error; no performance threshold was set for
this slice.

```powershell
npm run test:unit
```

```text
Test Files  2 passed (2)
     Tests  54 passed (54)
UNIT_EXIT:0
```

```powershell
npm run test:rules
```

```text
Test Files  3 passed (3)
     Tests  31 passed (31)
     Duration  29.62s
RULES_EXIT:0
```

The 31 Rules cases are 25 permissions + 3 concurrency + 3 publication (lost-ack idempotence, a
same-ID/different-content conflict, and recognition of an already-published handover after a task
advanced). The emulator is `demo-shiftrelay`; no live service is reachable.

```powershell
npm run test:e2e
```

```text
Running 7 tests using 1 worker
ok 1 accessibility.spec.ts: 320px layout, keyboard path, focus restoration and axe serious/critical scan
ok 2 conflicts.spec.ts: two incoming sessions race one accept: exactly one owner and one event
ok 3 handover.spec.ts: outgoing publishes three reviewed cards and incoming accepts, resolves and reopens one
ok 4 offline.spec.ts: offline share is unconfirmed and never queued; explicit server check and retry publish once
ok 5 offline.spec.ts: offline accept and resolve stay unconfirmed and do not change the task
ok 6 privacy.spec.ts: private sentinel never reaches storage, requests, console, URL or Firestore
ok 7 privacy.spec.ts: member revocation clears private and shared state from the page
7 passed (1.2m)
E2E_EXIT:0
```

The Firebase SDK emitted `console.warn` transport messages only during the deliberate offline and
lost-race cases; there were no uncaught page errors and no private sentinel in console, request
bodies or storage. The privacy test also rejects `firebaseLocalStorageDb` and `firestore*` IndexedDB
databases; the only database present is the Firebase heartbeat metadata store, whose records were
searched for the sentinel and did not contain it.

```powershell
npm run test:tools
```

```text
Ran 19 tests in 13.689s
OK
TOOLS_EXIT:0
```

```powershell
py -3 scripts/check_diagrams.py docs
```

```text
OK docs\ARCHITECTURE.md#1 -> .git\opencode\diagrams\docs__ARCHITECTURE-1.svg
OK docs\spec.md#1 -> .git\opencode\diagrams\docs__spec-1.svg
2/2 diagrams OK
DIAGRAMS_EXIT:0
```

### 8.3 Browser walkthrough and screenshots

A separate `agent-browser` profile (not the Playwright browser) signed in through the real UI with
the runtime-generated synthetic accounts, published three cards, then used the incoming account to
accept, resolve and reopen one task. The console contained only Vite connection and React DevTools
development messages; no error or warning after sign-out. Screenshots are evidence only, under
`.git/opencode/`:

- `ui-sign-in.png`
- `ui-outgoing-review.png`
- `ui-outgoing-confirmed.png`
- `ui-incoming-queue.png`
- `ui-incoming-accepted.png`
- `ui-incoming-resolved.png`
- `ui-incoming-reopened.png`

Live preview while the local servers run: <http://127.0.0.1:5173/>. Start with
`npm run emulators`, `npm run seed:emulator` and `npm run dev` in separate terminals.

### 8.4 What the E2E suites proved

- **AC01/AC08:** outgoing published exactly three reviewed cards; incoming saw only approved content
  (no sentinel), accepted, resolved with a recorded resolution, and reopened with a reason. Every
  step returned through a server-acknowledged transaction, and the task version advanced 1 → 2 → 3 → 4
  with one derived activity per version.
- **AC07/AC09:** the real Rules suites still deny signed-out/nonmember/cross-venue reads and writes,
  role escalation, direct transition bypasses, forged activities and stale updates. Two isolated
  incoming sessions raced one accept: exactly one owner, one version-2 acceptance event, no second
  event, and the loser saw a conflict requiring refresh.
- **AC10:** real browser offline (`BrowserContext.setOffline`) made publication, accept and resolve
  stay unconfirmed; the emulator held no new document; after reconnection an explicit server check
  reported `absent`, and an explicit retry wrote exactly once. No silent queued replay was observed.
- **AC05/Q1:** a unique private sentinel in the raw note appeared in no Firestore document, request
  body, URL, console message, localStorage/sessionStorage or IndexedDB record; sign-out removed the
  private draft from the page. Membership revocation cleared both private and shared state.
- **AC12/Q4:** keyboard-only sign-in, card entry, review, share, accept and resolve worked at 320 CSS
  px with no horizontal document overflow; focus returned to the Resolve trigger after Cancel; axe
  reported zero serious/critical violations on sign-in, draft, review, incoming queue, resolve form
  and resolved task. This is automated evidence, not a WCAG certification.

### 8.5 Final verifier

```powershell
py -3 scripts/verificar.py --report .git/opencode/evidence.json
```

```text
CHECK typecheck: PASS
CHECK lint: PASS
CHECK build: PASS
CHECK unit: PASS
CHECK rules-tests: PASS
CHECK e2e-tests: PASS
CHECK tools-tests: PASS
CHECK checker-self-test: PASS
CHECK diagrams: PASS
CHECK contract-fixture: PASS
evidence: .git\opencode\evidence.json
scope: phase 5 manual-handover-ui-slice1-emulator-only (unimplemented work is listed)
Q5 credential scan: NOT IMPLEMENTED (no pinned authorized scanner installed)
GATE_C: NOT ELIGIBLE (unborn HEAD; dirty working tree; 5 scope items unimplemented)
ok=True commit=unborn dirty=True
VERIFY_EXIT:0
```

`ok=True` is limited to the named scope. Gate C is not eligible because the repository still has an
unborn HEAD, a dirty working tree and the named unimplemented product/manual/hybrid/live/scanner
items.

Constraint status: Q1 is measured for the synthetic sentinel path only; Q2 is measured in both the
Rules and two-browser halves; Q3 is partial (typecheck, lint, build, unit, Rules, E2E and tooling are
green, but AC13/AC15 manual/product work is absent); Q4 is automated only (axe, keyboard, 320 px—no
screen reader, 200% zoom or device); Q5 and Q6 remain unmeasured.

### 8.6 Limits of this evidence

Still unimplemented and unmeasured: local model drafting, cloud reconciliation, Firebase AI Logic,
App Check, Hosting, deployment, live project behavior, screen-reader announcements, 200% browser
zoom, actual Android Chrome touch and AC15 representative-user validation. Q5 was still unmeasured
in this cut; §9 adds the pinned scanner and the production dependency audit. The Firestore emulator
does not prove production Rules call-budget caching, so the five-card publication remains a
documented production risk. The Auth/Firestore emulators and synthetic identities are not
production security evidence. No commit, push, merge or deployment was performed.

## 9. Q5 credential scan and production dependency audit (November 16, 2026)

Scope: replace the named Q5 gap with a real pinned scanner and a real production dependency audit.
No application, Rules, UI, AI or backend behavior changed; `src/`, `firestore.rules`, the E2E
suites and the frozen contract were not touched. No commit, push, deployment or cloud action.

### 9.1 Tool: Gitleaks 8.30.1 (official release, hash-pinned)

| Item | Value |
|---|---|
| Scanner | Gitleaks, `gitleaks version` → `8.30.1` |
| Asset | `gitleaks_8.30.1_windows_x64.zip` (official GitHub release) |
| Asset SHA-256 | `d29144deff3a68aa93ced33dddf84b7fdc26070add4aa0f4513094c8332afc4e` |
| Extracted `gitleaks.exe` SHA-256 | `17157e2ee8b76fc8b1d8bee607a250e34b8a8023c8bc81822d4b5ee4d78fcb7c` |
| Tool location | `%TEMP%\opencode\tools\gitleaks\8.30.1\` — temp tool cache, never in the repository |
| Install | `npm run scan:secrets -- --install` |

The asset hash matches the release's published `gitleaks_8.30.1_checksums.txt`. Install downloads
the pinned asset, verifies the zip hash, extracts, re-verifies the binary hash and installs no
service. A missing or mismatching binary is a hard failure (exit 2) that prints the exact install
command and both hashes, so an unverified environment is never reported as a pass. CLI behavior
(`dir` command, `--redact`, `--report-format json`, exit codes `0` clean / `1` leaks or error) was
taken from the official v8.30.1 README, not from memory.

### 9.2 Scope actually scanned

`npm run scan:secrets` → `py -3 scripts/scan_secrets.py` (standard-library Python, so it stays
reproducible on this Windows/PowerShell environment).

- Whole working tree **plus the production build**: 74 files, 1,501,488 bytes in the final verifier
  run. The runner refuses to scan when `dist/index.html` is absent, so a stale or missing build
  cannot be reported as a clean production scan.
- Untracked and gitignored files are scanned. Gitleaks' directory scan does not read
  `.gitignore`; the regression suite proves it with a fixture where `.env` and `dist/bundle.js`
  are gitignored and both are reported.
- Only `.git` and `node_modules` are excluded, by Gitleaks' embedded default config. That same
  default config also skips lockfiles (`package-lock.json`), images, fonts and compiled binaries;
  the dependency graph is covered by §9.4 instead. This scope is measured, not assumed: the
  exclusion was confirmed by scanning a fixture with planted values under `.git` and
  `node_modules`.
- No project config and no allowlist: the runner rejects a repository `.gitleaks.toml` outright and
  points `--gitleaks-ignore-path` at an empty temp directory, so neither a project config nor a
  `.gitleaksignore` can hide a finding.
- Not scanned, and reported as such: `.git/opencode/` (local evidence, screenshots, previous
  reports) and `node_modules`. Public release artifacts still need the reviewer's own scan (§9.5).

Fail-closed guards, each with a regression test: scanner missing or hash mismatch, empty scan
target, zero bytes read, unreadable scanner report, scanner exit above 1, exit 0 with findings,
exit 1 without findings, and missing build output. `ok` is a clean scan only; findings are never a
pass.

### 9.3 Red then green

Red (before `package.json` and the verifier knew about the runner; 1 failure, 1 error):

```text
FAIL: test_known_positive_fixture_fails_with_the_value_redacted
AssertionError: True is not false
ERROR: test_npm_script_and_verifier_use_the_pinned_scanner
KeyError: 'scan:secrets'
Ran 8 tests in 5.761s
FAILED (failures=1, errors=1)
```

The `KeyError` proved the npm/verifier integration was missing. The `AssertionError` was a real
runner defect: `run()` reported `ok` for a scan that had found a leaked value, so a positive
fixture would have been reported as a pass. `ok` is now `exit == 0 and not findings`.

Green:

```powershell
py -3 -m unittest tests.test_scan_secrets -v
```

```text
Ran 8 tests in 4.703s
OK
```

The 8 cases cover: a synthetic known-positive fixture failing with the value redacted (the value
appears nowhere in the scanner log, the summary, the report or a `Match`/`Secret` field), a
negative fixture passing and writing a report, `scanner unavailable` failing closed with the
install command and expected hash, empty and missing input failing closed, gitignored/untracked
inputs being scanned, a project allowlist file being rejected, `.git`/`node_modules` exclusion with
an exact file count, and the npm-script/verifier wiring.

The first clean-tree run of the real scan found one thing worth recording: the synthetic fixture
token in `tests/test_scan_secrets.py` was itself reported as
`aws-access-token tests/test_scan_secrets.py:21`. That is a true positive on a shaped literal. It
was fixed by assembling the synthetic value at run time so the repository stores no
credential-shaped literal — not by an allowlist, a `.gitleaksignore` or a `gitleaks:allow`
comment, none of which this runner accepts. The second scan then reported the same value again,
this time from `tests/__pycache__/test_scan_secrets.cpython-315.pyc:56`: CPython folds
`"AKIA" + "…"` at compile time, so the compiled test cache carried a full literal even though the
source no longer did. The fixture now uses `"".join([...])`, which is not folded; both the source
and the regenerated `.pyc` are clean, and `__pycache__` stays inside the scanned scope rather than
being quietly excluded.

```powershell
npm run scan:secrets
```

```text
> scan:secrets
> py -3 scripts/scan_secrets.py

scanner: gitleaks 8.30.1 (asset sha256 d29144deff3a68aa93ced33dddf84b7fdc26070add4aa0f4513094c8332afc4e, exe sha256 17157e2ee8b76fc8b1d8bee607a250e34b8a8023c8bc81822d4b5ee4d78fcb7c)
scope: 74 files, 1501488 bytes under C:\Users\acer\Documents\Firebase-AIlogic-Hackathon (untracked and gitignored files included; only .git and node_modules excluded)
result: no leaks found
report: .git\opencode\secret-scan.json
```

`.git/opencode/secret-scan.json` records the scanner version, both hashes, the scope (file count,
bytes, exclusions, `project_allowlist: false`), `findings: []`, exit 0 and `ok: true`. It contains
no scanner log and no matched value.

### 9.4 Production dependency audit — resolved by a scoped `@grpc/grpc-js` pin (November 16, 2026)

Red, before the fix:

```powershell
npm audit --omit=dev --audit-level=high
```

```text
@grpc/grpc-js  <=1.13.5
Severity: high
@grpc/grpc-js: In certain configurations, getAuthContext can return unauthorized certificates as though they were authorized - https://github.com/advisories/GHSA-m9gg-hp2v-232j
@grpc/grpc-js: The server transmits some error messages thrown by method handlers to the client in status messages - https://github.com/advisories/GHSA-f596-whhp-79r4
fix available via `npm audit fix --force`
Will install firebase@9.14.0, which is a breaking change
node_modules/@grpc/grpc-js
  @firebase/firestore  1.3.1-0 - 1.3.1-canary.df1b588 || ...
    @firebase/firestore-compat  <=0.0.900-exp.520ca39d0 || ...
      firebase  0.900.22 || ...
4 high severity vulnerabilities

AUDIT_EXIT:1
```

Reproduced path in the production tree: `firebase` 13.3.0 → `@firebase/firestore` 4.20.0 →
`@grpc/grpc-js` 1.9.16 (`node -p` on the installed package: `1.9.16`).

**Cause.** `@firebase/firestore` 4.20.0 declares `"@grpc/grpc-js": "~1.9.0"`, so the resolver is
told to stay inside 1.9.x, and every 1.9.x release is inside the advisory range. No Firebase patch
upgrade exists to pull a newer edge: `npm view firebase version` → `13.3.0` and
`npm view @firebase/firestore version` → `4.20.0`, both already installed here. The audit's own
suggestion (`npm audit fix --force` → `firebase@9.14.0`) is a major downgrade that breaks the
pinned stack, so it was rejected.

**Advisory facts used to pick the version** (OSV API, `api.osv.dev/v1/vulns/<id>`, not memory):

| Advisory | Alias | Affected ranges | Fixed |
|---|---|---|---|
| GHSA-m9gg-hp2v-232j | CVE-2026-101916 | `>=0 <1.13.6`, `>=1.14.0 <1.14.5` | `1.13.6`, `1.14.5` |
| GHSA-f596-whhp-79r4 | CVE-2026-101915 | `>=0 <1.13.6`, `>=1.14.0 <1.14.5` | `1.13.6`, `1.14.5` |

`api.osv.dev/v1/query` for `@grpc/grpc-js@1.13.6` returns no vulnerabilities.

**Fix.** One exact-pinned transitive override, scoped to the one consumer, in `package.json`:

```json
"overrides": {
  "@firebase/firestore": {
    "@grpc/grpc-js": "1.13.6"
  },
  "playwright-core": "1.65.1"
}
```

Why this pin and not something else:

- `1.13.6` is the lowest published version outside both advisory ranges, so it is the smallest
  change that removes the finding; no newer version is assumed.
- The override is nested under `@firebase/firestore`, not global, so the four `@grpc/grpc-js`
  1.14.7 copies that `firebase-tools` (dev) already resolves through `google-gax` and
  `@google-cloud/*` are untouched. Nothing unrelated was bumped.
- API compatibility, measured rather than assumed: `@firebase/firestore`'s Node build (the only
  consumer in the production tree) uses exactly four grpc symbols —
  `grpc.Metadata`, `grpc.credentials.createSsl`, `grpc.credentials.createInsecure` and
  `grpc.loadPackageDefinition` (`dist/common-CqUiBvHi.node.cjs.js`). `node -e` resolving
  `@grpc/grpc-js` from `node_modules/@firebase/firestore` printed `resolved 1.13.6` and
  `apis function function function function`. `1.9 → 1.13` is a minor step inside major 1.
- It also keeps the peer loader line consistent: 1.13.6 requires `@grpc/proto-loader ^0.7.13`
  (installed: `0.7.15`, inside Firebase's `^0.7.8`), while 1.14.x requires `^0.8.0` and would have
  added a second loader tree for no security gain.

**Lock result.** `npm install` → `changed 1 package, and audited 1168 packages`. Root
`node_modules/@grpc/grpc-js` moved `1.9.16 → 1.13.6`; the string `1.9.16` no longer appears anywhere
in `package-lock.json`. `npm explain @grpc/grpc-js` prints the pinned edge and its only production
consumer:

```text
@grpc/grpc-js@1.13.6 overridden
node_modules/@grpc/grpc-js
  overridden @grpc/grpc-js@"1.13.6" (was "~1.9.0") from @firebase/firestore@4.20.0
```

The three `@grpc/grpc-js@1.14.7 dev` entries in the same output are `firebase-tools` sub-trees and
are unchanged. There is no `firebase-admin` in the tree (`node_modules/firebase-admin` absent), so
the client SDK's Node transport is the only production consumer.

Green, after the fix:

```powershell
npm audit --omit=dev --audit-level=high
```

```text
found 0 vulnerabilities
AUDIT_EXIT:0
```

No package was downgraded, `npm audit fix --force` was not run, no advisory was ignored, no
`.nsprc`/allowlist/`audit-level` change was made and the Q5 threshold (`0` high/critical production
advisories) was not weakened. The earlier reachability note is kept only as context: neither
`getAuthContext` nor `grpc-js` appears in `dist/assets/index-*.js`, which explains why the browser
demo never exercised the code, but bundle absence was not used as an exemption — the dependency
edge itself is now clean.

Residual, stated plainly: the override is a deliberate deviation from Firebase's declared
`~1.9.0` range, so a future `@firebase/firestore` release that widens that range should be allowed
to supersede it; the Rules and E2E suites in §9.6 are the evidence that the Node transport still
works under 1.13.6.

### 9.5 Verifier integration and full run after the pin

`scripts/verificar.py` runs two Q5 checks — `secret-scan` (`npm run scan:secrets`, after `build`)
and `dependency-audit` (`npm audit --omit=dev --audit-level=high`) — requires
`scripts/scan_secrets.py` and `tests/test_scan_secrets.py` to exist, and prints the measured outcome
of both. `tests/test_verificar.py` fails if either check is dropped or if the audit command is
changed (`EXPECTED_CHECKS` and the explicit `npm audit --omit=dev --audit-level=high` assertion), so
the dependency gate cannot be removed silently; that assertion is the regression guard for this fix.

```powershell
py -3 scripts/verificar.py --report .git/opencode/evidence.json
```

```text
CHECK typecheck: PASS
CHECK lint: PASS
CHECK build: PASS
CHECK secret-scan: PASS
CHECK dependency-audit: PASS
CHECK unit: PASS
CHECK rules-tests: PASS
CHECK e2e-tests: PASS
CHECK tools-tests: PASS
CHECK checker-self-test: PASS
CHECK diagrams: PASS
CHECK contract-fixture: PASS
evidence: .git\opencode\evidence.json
scope: phase 5 manual-handover-ui-slice1-emulator-only-q5-checks (unimplemented work is listed)
Q5 credential scan: PASS (pinned Gitleaks over the working tree + dist, values redacted)
Q5 dependency audit: PASS (npm audit --omit=dev --audit-level=high)
GATE_C: NOT ELIGIBLE (unborn HEAD; dirty working tree; 5 scope items unimplemented)
ok=True commit=unborn dirty=True
VERIFY_EXIT:0
```

Measured inside that run: `typecheck`/`lint` clean, `build` 41 modules → `dist/assets/index-CWYQFoS4.js`
808.84 kB, `secret-scan` 74 files / no leaks (the exact byte count is in `evidence.json`; it moves
with each documentation edit), `dependency-audit` `found 0 vulnerabilities`, `unit` 2 files / 54
tests, `rules-tests` 3 files / 31 tests, `e2e-tests` 7/7 in about a minute (accessibility,
conflicts, handover, two offline cases, two privacy cases), `tools-tests` 27 tests,
`checker-self-test` OK, `diagrams` 2/2. The run was repeated after the §9.4/§9.5 edits and stayed
green with the same counts; the last run is the one recorded in `evidence.json`.

The Rules and E2E suites are also the runtime proof for §9.4: both start the Firestore emulator and
drive `@firebase/firestore` from Node, so the `@grpc/grpc-js` 1.13.6 transport was loaded and used,
not just installed. Ports 8080, 9099, 4400 and 4500 were free before the run (checked once with
`Get-NetTCPConnection`); the previous window's start failures were that collision, not a source
regression.

`ok=True` is not a gate or product claim: Gate C stays ineligible because HEAD is unborn, the tree
is dirty (the repository has no commit yet) and 5 scope items remain unimplemented.

Still unmeasured after §9: reviewer sign-off over the redacted report and a scan of the final public
artifact set, live/hosted credential review, and any upstream Firebase release that widens the
`@grpc/grpc-js` range so the §9.4 override can be dropped. No scanner or audit result here is a
product, privacy or delivery claim.

### 9.6 Incident: emulator debug log carried host credentials (November 16, 2026)

Redacted record; no credential value, file line, or account identity is reproduced here.

- **Symptom.** `npm run scan:secrets` exited 1 with three findings, all on the same line of the
  root-level `firebase-debug.log`: one `github-pat` and two `generic-api-key`. The scan was correct;
  nothing was staged (`git ls-files` empty, `git count-objects` 0 objects, no stash, unborn HEAD), so
  nothing reached a commit or a remote.
- **Classification.** True positive, not a synthetic fixture: the line was the Firebase CLI's own
  dump of the process environment for an `emulators:exec` run, and it contained host-supplied
  credentials (one GitHub personal-access-token value plus two other credential-named variables).
  None of them belong to this repository.
- **Root cause.** `firebase-tools` 15.36.0 writes `firebase-debug.log` into the working directory on
  every run (`lib/logger.js` → `process.cwd()`), and `emulators:exec` logs
  `Running <cmd> with environment {…}` — the full child environment — as one debug line. On exit it
  deletes that log when the code is below 2 and `DEBUG` is unset, so the log only survives a
  *failed* run: exactly the file a green-tree scan should never wave through, and exactly the file a
  failed test needs. Reproduction: one `emulators:exec` run with the log path redirected to temp,
  then inspected in memory, produced the same single env-dump line with the same credential shapes.
- **Containment.** The flagged log was already absent when the incident was triaged: a later
  successful emulator run had let the CLI delete it. No copy existed under `%TEMP%`, the
  `configstore` directory, `.git/opencode/`, or the Playwright output; the reproduction log was
  deleted after it had been read in memory. Anything that would have contained the value is gone
  locally, and no remote was ever contacted with it.
- **Fix, not an allowlist.** `scripts/firebase_safe.py` now wraps every emulator test run in two
  layers, and `test:rules` / `test:e2e` go through it.
  *Prevention:* the CLI is spawned with an explicit allowlist of Windows/profile/runtime variables
  (`PATH`, `PATHEXT`, `ComSpec`, `SystemRoot`/`windir`, `SystemDrive`, `TEMP`/`TMP`, `USERPROFILE`,
  `HOME`, `HOMEDRIVE`/`HOMEPATH`, `APPDATA`, `LOCALAPPDATA`, `ProgramData`/`ProgramFiles*`/`PUBLIC`,
  processor/OS basics, `JAVA_HOME`/`JDK_HOME`, `FIREBASE_EMULATORS_PATH`,
  `PLAYWRIGHT_BROWSERS_PATH`, `CI`) plus the four variables this repository's tests read
  (`SHIFTRELAY_PROJECT_ID`, `SHIFTRELAY_EMULATOR_HOST`, `VITE_FIREBASE_PROJECT_ID`,
  `VITE_EMULATOR_HOST`). Nothing else is inherited, so no credential from the host shell reaches the
  CLI, the emulators, the test runner, or any log they write — including when the process dies
  before the second layer runs.
  *Guard:* only `emulators:exec` is accepted, `--project` must start with `demo-`, the executed
  script must start with `vitest` or `playwright`, and any token that names a live command
  (`deploy`, `hosting:`, `auth:import`, `emulators:start`, `--token`, …) is refused with exit 2
  before a process is created.
  *Defense in depth:* after the CLI exits, any remaining `firebase-debug*.log` still has its
  `with environment {…}` payload replaced by a placeholder, while the rest of the log — emulator
  events, script exit code, failure context — is preserved. The scanner, its pinned hash, its scope
  and its refusal of `.gitleaks.toml`/`.gitleaksignore` are untouched.
- **Proof: prevention, not matcher evasion.** `tests/test_firebase_safe.py` (10 cases) sets fake
  host values for the three incident variables (assembly at run time; nothing printed), shows the
  allowlist drops them from both the policy mapping and a *real* spawned child, then writes a
  Firebase-style environment dump **from the restricted child env and never scrubs it** — the
  killed-before-scrub case — and still gets a scanner pass with no allowlist file. The scrub case is
  kept separately: the same fixture is flagged before redaction and clean after it. Measured
  end-to-end against the real CLI: with `DEBUG` forced so the log survives and no scrub applied, the
  dump held 39 variables (allowlist plus CLI/emulator-added ones) and **zero** `ghp_`-shaped values,
  against 87 variables and one credential on the original incident line.
- **Measured after the change:** `tools-tests` 30 tests OK; `test:rules` 31 tests OK and `test:e2e`
  7/7 OK through the wrapper under the restricted env, so real Java, npm, Playwright, the temp
  directory and the user profile still work; `npm run scan:secrets` exit 0.
- **Remaining limits.** A *manual* CLI run outside the wrapper (for example `npx firebase
  emulators:exec` typed by hand) still inherits the host environment and can still write that dump.
  The wrapper itself covers the commands the demo and the verifier use. Within the wrapper, a
  log written by some other path would be scrubbed only after the process exits; prevention is what
  closes that window for the environment dump.
- **Not a compromise.** Nothing here indicates the host credentials were exposed outside this
  machine: the offending log was local and already deleted, no commit or remote ever contained it,
  and no value was transmitted, extracted or validated outbound. Revocation and reissue are only
  warranted if a `firebase-debug.log` from this machine was actually shared or uploaded; that
  decision belongs to the credential owner and was not taken here. A blanket rotation is not
  justified by this evidence.

## 10. Slice 2 — strictly local private drafting (November 16, 2026)

Scope: one new capability, memory-only local drafting, on top of the slice 1 manual workflow. No
cloud reconciliation, App Check, Hosting, deployment, live project, dependency, storage collection
or service was added. The frozen §1–§8 contract did not change; `docs/INTERFACES.md` §9 and
`tests/fixtures/contrato.json` `localDraft` were frozen together with the new code and tests.

### 10.1 Red then green

Red (the new suite before `src/aiValidation.ts` existed):

```powershell
npm run test:unit
```

```text
FAIL  tests/ai-output.test.ts [ tests/ai-output.test.ts ]
Error: Cannot find module '../src/aiValidation' imported from .../tests/ai-output.test.ts
 Test Files  1 failed | 2 passed (3)
      Tests  54 passed (54)
UNIT_EXIT:1
```

The first implementation run then failed 4/17 for test-side fixtures (two span ends were still inside
the note, one unknown-key case expected `missing_key`, and one non-array `cards` case expected
`not_an_object`). The assertions were corrected to the contract, not the contract to the tests.
Green:

```powershell
npm run test:unit
```

```text
 Test Files  3 passed (3)
      Tests  71 passed (71)
```

`tests/ai-output.test.ts` alone is 17 cases; `npm run test:unit -- tests/ai-output.test.ts` is also a
separate verifier check.

### 10.2 Local adapter and UI

- `src/localDraft.ts` reads `globalThis.LanguageModel.availability` with the same English text
  options used for creation, and reports `unsupported`, `downloadable`, `downloading` or `available`.
  It constructs `getAI(app, { backend: new GoogleAIBackend() })` and
  `getGenerativeModel(ai, { mode: InferenceMode.ONLY_ON_DEVICE, onDeviceParams: { createOptions,
  promptOptions: { responseConstraint: schema } } })`. `getGenerativeModel` internally names a cloud
  model for hybrid parameters; `ONLY_ON_DEVICE` routing never calls it, and every generation is
  discarded unless `response.inferenceSource === "on_device"`.
- `initializeDeviceModel` is called only from the "Enable on-device drafting" button and forwards
  `onDownloadProgress`. A fresh availability read follows the promise, because the installed SDK can
  resolve it after its internal download promise rejected first; a non-`available` re-read becomes
  `download_failed`. The real Chrome run below showed no numeric progress before ready (the UI stayed
  on "Preparing the on-device model…"), which is an observed limitation, not a hidden successful
  progress state.
- `src/aiValidation.ts` caps the raw response at 12,000 UTF-8 bytes before parsing, accepts only the
  exact card keys, enforces the 120/800-byte fields, and validates UTF-16 source spans against the
  note without splitting a surrogate pair. It preserves strings exactly and never echoes rejected
  text in an error.
- `src/PrivateDraft.tsx` shows the distinct local states, keeps the raw note and existing cards on
  every local failure, and requires an explicit "Use these suggestions" action before replacing the
  editable cards. Review and share stay separate. Editing the note, canceling, signing out or losing
  membership invalidates the in-flight result via an operation token and abort, so a late response
  cannot repopulate the page.
- `src/firebase.ts` adds only a local demo `appId` placeholder, because the AI SDK requires the
  config field; the existing demo/local guards are unchanged. No API key, App Check token, cloud
  endpoint or credential was added.

### 10.3 Emulator-backed E2E (capability mocks labelled)

```powershell
py -3 scripts/firebase_safe.py emulators:exec --project demo-shiftrelay --only auth,firestore "playwright test e2e/local-draft.spec.ts"
```

```text
Running 7 tests using 1 worker
ok 1 available model drafts through ON_DEVICE and only explicit acceptance changes cards
ok 2 downloadable model needs a click and reports progress before drafting
ok 3 download failure keeps the note and the manual workflow usable
ok 4 unavailable model shows a distinct state and keeps manual entry
ok 5 unusable model output is rejected without touching the note or cards
ok 6 editing the note cancels an in-flight local draft
ok 7 a late local result cannot repopulate a signed-out page
7 passed (29.6s)
```

`LanguageModel` is an init-script mock in these seven cases only, because Playwright's Chromium has
no Prompt API. Every request still goes through the real pinned Firebase AI SDK (13.3.0 /
`@firebase/ai` 3.1.0), its `ONLY_ON_DEVICE` adapter and the mocked local session. The mocks cover
capability/failure branches and are **not** counted as hybrid evidence. The first E2E run failed in
the download-error case because the SDK resolved initialization after a fast internal rejection;
that real edge case produced the availability re-read fix above. The first success-case assertion
also matched two ON_DEVICE sentences; the selector was narrowed, not the UI.

### 10.4 Genuine system Chrome 157 on localhost

This is manual evidence on the actual installed browser, separate from the mocks. The system Chrome
was launched with a dedicated temporary profile and only the ADR 0002 arguments:

```text
"C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9338
--user-data-dir="…\slice2-local-standard-20261116" --no-first-run --no-default-browser-check
--flag-switches-begin --flag-switches-end about:blank
```

`chrome://version` reported Google Chrome `157.0.8103.78` (official 64-bit) and exactly those
arguments. The page origin was `http://127.0.0.1:5173` (numeric loopback, not the `localhost`
hostname). Before any click, `LanguageModel` existed, `navigator.ai` was undefined,
`isSecureContext` was true, and the English text availability was `downloadable` in about 1.99 s.
The on-device AI setting in `chrome://settings/ai` was already enabled; it was inspected, not
changed.

| Observation | Actual result |
|---|---|
| Network metered check | `Get-NetConnectionProfile` exposed no cost type; `DefaultMediaCost\WiFi=1` (unrestricted) was readable, the per-network profile cost was not readable without administrator rights; the page reported `navigator.connection.saveData=false`. No metered flag was observed. |
| User activation | The download began only after the "Enable on-device drafting" click; `navigator.userActivation.hasBeenActive` was true afterwards. |
| Download | UI showed "Preparing the on-device model…"; Chrome then wrote `OptGuideOnDeviceModel/2025.8.8.1141/weights.bin` (4,269,932,544 bytes) and exposed component `nano_v3_gpu_component` `2025.8.8.1141`. No numeric percentage was observed before the ready button appeared. |
| Model identity | **UNKNOWN.** The component/version is not an authoritative Gemini Nano 4 identifier; no exact-model claim is made. |
| Local request | One click produced five suggestions (projector bulb, spare bulbs, cable kit, cable return, entrance plants) with source spans `0–13`, `14–26`, `27–35`, `36–46`, `47–58`; the UI stated "Generated on this device (ON_DEVICE)". |
| Network during request | Resource timing was cleared before the request; afterwards the only resource entry was the emulator's Firestore Listen channel. No `googleapis.com`, `generativelanguage.googleapis.com` or `aiplatform.googleapis.com` entry. |
| Storage/console | `localStorage` and `sessionStorage` were `{}`; the only IndexedDB database was `firebase-heartbeat-database`; console contained only Vite connection and React DevTools development messages. |
| Private sentinel | `HALL-PRIVATE-SENTINEL-9f2c` stayed in the 173-byte note field before acceptance; after explicit acceptance, review and share, the emulator held five tasks and no sentinel. After sign-out the page, localStorage and sessionStorage contained no sentinel. |
| Manual workflow | Suggestions replaced the cards only after "Use these suggestions"; "Review cards" then showed the exact fields and "Share handover" was a separate server-confirmed action. |

The real model was downloaded into a dedicated temporary profile under the approved temp directory;
the profile was not the everyday Chrome profile. The Chrome session and the temporary local servers
were closed afterwards; only this agent's processes were stopped.

### 10.5 Limits of this evidence

- Exact Gemini Nano 4 identity/compatibility is still **UNKNOWN**; no organizer mapping was obtained
  and no eligibility claim is made.
- Hosted HTTPS, App Check, a deployed origin, and a separately consented cloud comparison were not
  exercised. No Firebase AI Logic service provisioning (`init ailogic`) was run; the localhost
  request is on-device and does not prove cloud setup.
- The unsupported/download failure paths are browser-capability mocks, not real Chrome failures. A
  real unsupported Chrome/mobile path and the 4 GB-class GPU/CPU backend selection were not
  independently measured.
- No dependency or production bundle performance threshold was set; Vite's existing >500 kB chunk
  warning is unchanged.
- Q1 is measured for the synthetic localhost sentinel path, Q3 remains partial, Q4 is automated
  only, and Q5/Q6 keep the limits recorded in §9 and §10.4. The verifier's `ok` is scoped to the
  named checks, never a product, eligibility or Gate C claim.

### 10.6 Full verifier state and the Q5 blocker

The full run was executed after the E2E green above:

```powershell
py -3 scripts/verificar.py --report .git/opencode/evidence.json
```

```text
CHECK typecheck: PASS
CHECK lint: PASS
CHECK build: PASS
CHECK secret-scan: FAIL
CHECK dependency-audit: PASS
CHECK unit: PASS
CHECK ai-output: PASS
CHECK rules-tests: PASS
CHECK e2e-tests: PASS
CHECK tools-tests: PASS
CHECK checker-self-test: PASS
CHECK diagrams: PASS
CHECK contract-fixture: PASS
Q5 credential scan: FAIL (pinned Gitleaks over the working tree + dist, values redacted)
Q5 dependency audit: PASS (npm audit --omit=dev --audit-level=high)
GATE_C: NOT ELIGIBLE (checks failed; dirty working tree; 6 scope items unimplemented)
ok=False commit=b41b0a4e9cc4a69bd07439c3b4cf5793ee75c149 dirty=True
```

Measured inside that run: `unit` 3 files / 71 tests, `ai-output` 17 tests, `rules-tests` 3 files /
31 tests, `e2e-tests` 14/14, `tools-tests` 37 tests, `diagrams` 2/2, `dependency-audit` zero
vulnerabilities. `secret-scan` reported exactly one finding, `gcp-api-key`, at
`.env.local:4`. That file appeared during concurrent cloud provisioning at 12:21:58, after the
slice 2 implementation started and while this slice was already running; it is not created or read
by this slice. It is gitignored local configuration, but the Q5 runner correctly includes ignored
files and was not weakened, excluded or allowlisted for it. Deleting or rewriting the file belongs
to its owning provisioning work, so `ok=False` is reported rather than hidden. All slice 2 checks
themselves pass; the scanner blocker is external to the source change and must be resolved before a
full green verifier is claimed.

## 11. Q5 credential finding closure - private local Firebase config (November 17, 2026)

Scope: resolution of the single Q5 finding reported at the end of section 10. No application
source, package, lockfile, scanner, test or fixture changed; no cloud call, deploy, commit or push
was performed. This section records only sanitized results - no credential value is reproduced.

**Cause.** The pinned Gitleaks runner scans the whole working tree, including gitignored files, as
designed. The cloud-provisioning work had written the app's Firebase web configuration to the
gitignored `.env.local`, and `gcp-api-key` matched the commented public `apiKey` line at
`.env.local:4`. That value is a public-by-design Firebase web key, not a leaked secret, but Q5 has
no allowlist and the scanner must not be weakened, so the file had to leave the tree.

**Resolution.** The whole file was moved (not copied) to
`%LOCALAPPDATA%\Temp\opencode\shiftrelay-private\firebase-development.env`, outside the repository
and therefore outside the Q5 scan root. Before the repository copy was deleted, the destination was
compared with the source in memory: equal byte count (792), equal SHA-256 and identical parsed
lines (11) all had to hold; they did. Directory and file ACLs were then reset to the current Windows
account only (`icacls /inheritance:r`). The repository copy was removed last. No unrelated user
variables existed in the file, so nothing else was moved or overwritten.

**Index and history.** `git ls-files .env.local` is empty, `git log --all -- .env.local` is empty, and
`git status` never listed the file. The `.gitignore` rule `.env.*` (line 6) is unchanged and still
matches `.env.local`, so recreating it by accident cannot stage it.

**Measured after the move** (existing `dist`, adopted as built by slice 2 - no rebuild was run):

```text
scanner: gitleaks 8.30.1 (asset sha256 d29144de..., exe sha256 17157e2e...)
scope: 83 files, 1733268 bytes under <repo> (untracked and gitignored files included;
       only .git and node_modules excluded)
result: no leaks found
```

- `npm run scan:secrets`: exit 0, report `ok=true`, zero findings.
- `py -3 scripts/verificar.py --only secret-scan`: `CHECK secret-scan: PASS`, `ok=True`,
  `GATE_C: NOT ELIGIBLE (dirty working tree; 6 scope items unimplemented)` - the scoped run is
  honest about the unimplemented work and is not a gate pass.
- `py -3 -m unittest tests.test_check_diagrams tests.test_verificar tests.test_scan_secrets
  tests.test_firebase_safe`: `Ran 37 tests ... OK`, exit 0.

**Unchanged on purpose.** No allowlist, exclusion, `.gitleaks.toml`, `.gitleaksignore` or scanner
parameter was added; the scan root, redaction and fail-closed rules are identical. No rotation was
performed: the key is public by design and no exposure outside this machine, the git index or git
history was established. The active secret in that file is the App Check debug token, which stays
local and dev-only.

**Residual risk and next constraint.** The Firebase web API key is still present in the moved file
and must remain restricted to Firebase-related APIs (never the Gemini Developer API). Any future
cloud-mode dev runner must read the private path, fail closed on a missing name, and keep
`VITE_FIREBASE_APPCHECK_DEBUG_TOKEN` out of production builds; the full production-config rationale
is in ADR 0003.

## 12. Slice 3 — separately consented cloud reconciliation (November 17, 2026)

Scope: the reconciliation contract, the bounded context/packet, the one-shot consent and the
confirmed-observation flow, plus an `ONLY_IN_CLOUD` adapter that is deliberately unreachable in this
demo build. No live cloud request, App Check enforcement, Hosting, deployment, dependency, Rules
change or new collection was produced. The frozen §1–§8 domain contract did not change;
`docs/INTERFACES.md` §10 and `contrato.json` `reconciliation` were frozen together with the code and
tests.

### 12.1 Red then green

Red 1 — the pure suite before `src/reconciliation.ts` existed:

```powershell
npm run test:unit -- tests/reconciliation.test.ts
```

```text
FAIL  tests/reconciliation.test.ts [ tests/reconciliation.test.ts ]
Error: Cannot find module '../src/reconciliation' imported from
       .../tests/reconciliation.test.ts
 Test Files  1 failed (1)
      Tests  no tests
```

Red 2 — the first real browser run of `e2e/reconciliation.spec.ts` failed 4 of 6. Both causes were
real, not test cosmetics:

- The page-injected double initialised `failWith: null`, and the adapter treated any non-`undefined`
  value as a failure, so a successful mock response surfaced the generic cloud-failure message. The
  adapter now fails only on a non-empty string code.
- The suite shared accumulated emulator state, so by the third case more than 20 context tasks
  existed and the preview was correctly disabled. Each case now starts from a cleared demo venue
  (`resetDocuments`), which is setup isolation, not a relaxed assertion.

```text
  4 failed
    one approved packet yields one confirmed observation ...
    a stale target rejects confirmation and writes no observation
    one request in flight, cancel and sign-out ...
    quota, offline, auth and invalid responses ...
  2 passed (3.5m)
```

Green — targeted:

```powershell
npm run test:unit -- tests/reconciliation.test.ts
```

```text
 Test Files  1 passed (1)
      Tests  20 passed (20)
```

```powershell
$env:PATH = ((Resolve-Path node_modules\.bin).Path + ';' + $env:PATH)
py -3 scripts/firebase_safe.py emulators:exec --project demo-shiftrelay --only auth,firestore "playwright test e2e/reconciliation.spec.ts"
```

```text
Running 6 tests using 1 worker
  ok 1 the local demo is not configured, previews locally and never contacts a cloud endpoint
  ok 2 more than twenty eligible tasks require a visible context selection
  ok 3 one approved packet yields one confirmed observation and a dismissal writes nothing
  ok 4 a stale target rejects confirmation and writes no observation
  ok 5 one request in flight, cancel and sign-out discard late results without a retry
  ok 6 quota, offline, auth and invalid responses never write and keep the manual path
  6 passed (41.3s)
```

The `PATH` prefix is needed because `scripts/firebase_safe.py` only accepts a script whose first token
is `playwright`/`vitest`; `npm run test:e2e -- <file>` appends the file after the quoted script and is
refused. The wrapper, its environment allowlist and its guard are unchanged.

### 12.2 What the green tests measure

- `tests/reconciliation.test.ts` (20 cases): fixture mirror of limits/model/error codes; packet has
  exactly `sources`/`context` with only `id`, `version`, `title`, `detail`, `state`; no sentinel and
  no owner/resolution/creator/handover/venue field; 1–5 sources and 0–20 context; `>20` returns
  `context_selection_required` and an explicit 20-ID selection is honoured; resolved tasks excluded;
  input not mutated and snapshots frozen; consent byte equality and invalidation on packet/model/
  instruction change; the observation command is bounded; exact output acceptance, 0–5 suggestions,
  1,200-byte brief and 400-byte rationale boundaries in UTF-8, 12,000-byte raw cap before parsing,
  unknown/extra keys, unknown IDs, stale versions, self-comparison, invalid kind, blank rationale,
  injection/HTML preserved as plain text, and no rejected text echoed in errors.
- `e2e/reconciliation.spec.ts` (6 cases, emulator + labelled double): the demo shows `notconfigured`
  with no send control and zero external requests; preview is local and exact; >20 eligible tasks
  require checking a visible subset before preview; one approved packet produces exactly one mock
  call whose received bytes equal the preview; one confirmation records exactly one observation on
  the source (`version + 1`, owner/state unchanged, target version unchanged) and a dismissal writes
  nothing; a target or source changed by a second client rejects confirmation with no write; selection
  edit, cancel and sign-out discard late results with no automatic retry and one call per explicit
  send; quota/offline/auth failures, extra-field, oversized and non-JSON responses are rejected with
  no write and the manual accept path still works. The panel is axe-scanned for serious/critical
  findings and has no horizontal overflow at 320 CSS px.

### 12.3 Full verifier

```powershell
py -3 scripts/verificar.py --report .git/opencode/evidence.json
```

```text
CHECK typecheck: PASS
CHECK lint: PASS
CHECK build: PASS
CHECK secret-scan: PASS
CHECK dependency-audit: PASS
CHECK unit: PASS
CHECK ai-output: PASS
CHECK reconciliation: PASS
CHECK rules-tests: PASS
CHECK e2e-tests: PASS
CHECK tools-tests: PASS
CHECK checker-self-test: PASS
CHECK diagrams: PASS
CHECK contract-fixture: PASS
Q5 credential scan: PASS (pinned Gitleaks over the working tree + dist, values redacted)
Q5 dependency audit: PASS (npm audit --omit=dev --audit-level=high)
GATE_C: NOT ELIGIBLE (dirty working tree; 6 scope items unimplemented)
ok=True commit=92379f96981b14960cf31e1499175501669b61a8 dirty=True
```

Measured inside that run: 91 unit tests (4 files), 17 ai-output, 20 reconciliation, 31 Rules tests
(3 files), 20 E2E, 37 tool tests, 2 diagrams, zero dependency vulnerabilities. `dirty=True` is
expected: this cut makes no commit, and the tree also holds another agent's untracked
`docs/adr/0004-production-appcheck.md`. `ok=True` is scoped to these checks, not a product, hybrid,
accessibility or Gate C claim.

### 12.4 Limits of this evidence

- **No real cloud request was made.** `cloudReconciliationProvider()` returns `notconfigured` in the
  demo build because the shared app is the `demo-shiftrelay` emulator app with no live App Check
  configuration. Every suggestion, quota/offline/auth failure and late response in the suites comes
  from a page-injected double that labels itself `test-network-mock`; the UI shows "TEST MOCK - not a
  real cloud request". None of it counts as AC13/Q6 hybrid or cloud evidence.
- The `ONLY_IN_CLOUD` adapter, `gemini-3.5-flash-lite`, the structured-output schema and the
  `inferenceSource === "in_cloud"` rejection are reviewed code with no live execution; free-tier
  availability, quota and latency remain unmeasured. Live mode also needs its own live Firebase app
  and App Check wiring, which this build intentionally does not have.
- No Rules change was needed; the observation transition, target-version check and coupled activity
  were already enforced and tested (31 Rules cases). Reconciliation confirmation reuses that exact
  path, so it inherits the same Rules coupling and the R1 snapshot window.
- Manual screen-reader, 200%-zoom and actual Android Chrome touch checks are still open; the new
  panel has only automated axe/keyboard/320px coverage.
- `docs/PUBLISH.md`, Hosting, deployment, AC15 product validation and the live hybrid protocol remain
  unimplemented and are named by the verifier scope.

## 13. Phase 5 - runtime modes and one consented live cloud request (November 17, 2026)

Scope: three explicit runtime modes with fail-closed configuration, a dev-only runner for the
outside-root private values, a build-output guard, unit/E2E coverage for both, and one genuine
consented `ONLY_IN_CLOUD` request from localhost. No Rules change, no billing, no Hosting or Rules
deployment, no commit and no push. Private values were read in memory only; no value appears in this
document, in source, in argv, in a log line or in `dist/`.

### 13.1 Red then green

Red 1 - the dev-runner suite before `scripts/dev_live_local.py` existed:

```text
ModuleNotFoundError: No module named 'dev_live_local'
Ran 1 test ... FAILED (errors=1)
```

Red 2 - the build-output suite before `scripts/check_dist.py` existed:

```text
ModuleNotFoundError: No module named 'check_dist'
Ran 1 test ... FAILED (errors=1)
```

Red 3 - the guard against the *existing* build output, which still carried the development test hook:

```powershell
py -3 scripts/check_dist.py dist
```

```text
dist guard: FAIL - test-network-mock-hook in assets/index-CzS0KCbl.js
```

Green after the double was gated on `import.meta.env.DEV` and the App Check debug assignment on a
development build:

```text
dist guard: PASS - 5 files, 906268 bytes, 0 rules matched
```

Honest note: `tests/runtime-config.test.ts` was written against `src/runtimeConfig.ts` in the same
edit, so that file has no red step; the two new Python suites and the guard above do.

### 13.2 What the new automated checks measure

- `tests/runtime-config.test.ts` (23 cases): the fixture mirror (`modes`, hosts, project, app id,
  env names, App Check plans, error codes) matches the code; `emulator` is the default on both local
  hosts with no App Check and no network; a non-demo project and a non-local emulator host are
  refused; an unknown/blank/`*.web.app.evil.test` origin is `unknown_origin`; `live-local` requires
  each of the six names (blank and whitespace rejected) and refuses a wrong project/app or a
  non-reCAPTCHA site key; the documented public app id is the default when the private file keeps
  `VITE_FIREBASE_APP_ID` commented out; failure messages and `describeRuntimeFailure` never contain a
  supplied value; `hostedQA` refuses to fetch anything without the production site key, reads only
  `/__/firebase/init.json`, validates the exact project/app, ignores a debug token left in the
  environment (its serialized config contains none), and fails closed for an unavailable, non-object
  or field-incomplete payload.
- `tests/test_dev_live_local.py` (12 cases): parsing of active, commented-out and prose lines;
  non-allowlisted names ignored; duplicate names refused; every required name fails closed with a
  variable name but no other value; wrong project/app/key shapes refused without echoing the value; a
  private file inside the repository refused; the child environment drops host credentials
  (`GOOGLE_APPLICATION_CREDENTIALS`, `FIREBASE_TOKEN`, QA passwords) while keeping the live names; the
  banner contains no value.
- `tests/test_dist_guard.py` (8 cases): a clean output passes; a synthetic API-key literal, a
  UUID-shaped debug-token literal, the test hook, the private configuration path and QA credential
  names are each found by rule and file with the value redacted; the SDK's own
  `FIREBASE_APPCHECK_DEBUG_TOKEN` property name alone is not a finding; a missing `dist` fails closed;
  the verifier runs the guard after `build`; the script itself exits 0 on a clean directory.
- `tests/build-env.test.ts` (3 cases, B2): the repository's real `vite build` runs into an approved
  temporary directory, never `dist/`; a synthetic unrelated `VITE_*` value present at build time is
  absent from every emitted file, and a live-only value from `process.env` or a `.env` file makes the
  build fail before output with the variable name but never the value. Red step recorded: before the
  fix the sentinel was embedded and a `.env` value bypassed the build guard.
- `e2e/runtime-modes.spec.ts` (1 case): on the default build the page boots the emulator mode, leaves
  `globalThis.FIREBASE_APPCHECK_DEBUG_TOKEN` undefined, fetches no `/__/firebase/init.json`, and
  contacts none of `firebasevertexai`, `content-firebaseappcheck`, `recaptchaenterprise` or
  `www.google.com`. This is the canary that fails if a `live-local` dev server is ever reused by the
  Playwright web server.

### 13.3 Live run: configuration, App Check and one real request

The only path to the live project is `npm run dev:live-local`
(`py -3 scripts/dev_live_local.py`), which prints the mode, host, port and public project id only:

```text
live-local dev server: http://127.0.0.1:5173 (project shiftrelay-hybridai-2026, App Check debug
provider; values read from the outside-root private file and never printed)
```

Because the live Firestore Rules are still the closed default, the in-app cloud panel cannot be
reached without a membership read; weakening Rules for evidence was refused. Instead a temporary
local page at `/live-check.html` (deleted afterwards, never part of a build) imported the real
modules - `src/firebase.ts` for app, Auth and App Check, and `src/reconciliation.ts` +
`src/cloudReconcile.ts` for the exact packet, the one-shot consent and the real adapter - showed the
exact 345-byte packet plus model, purpose and system instruction, and sent one request only after an
explicit approval click. A headless Chrome 157 driver recorded host, path and status only (never a
query string, which carries the API key):

```text
mode: live-local; project: shiftrelay-hybridai-2026; App Check: debug-token
App Check token: obtained (debug provider; value never displayed)
POST content-firebaseappcheck.googleapis.com/v1/projects/shiftrelay-hybridai-2026/apps/<app>:exchangeDebugToken -> 200
POST firebasevertexai.googleapis.com/v1beta/projects/shiftrelay-hybridai-2026/models/gemini-3.5-flash-lite:generateContent -> 200
result: status: success; label: firebase-ai-logic-only-in-cloud; model: gemini-3.5-flash-lite; bytes: 161; 1912 ms
```

The adapter only returns a response whose `inferenceSource` is `in_cloud`, so this is a real
Firebase AI Logic `ONLY_IN_CLOUD` call with the explicit free-tier model, not a mock. Raw evidence
(sanitized) is in `.git/opencode/live-config-evidence.json` with screenshots
`.git/opencode/live-check-preview.png` and `live-check-result.png`. The page and the driver were
removed/kept outside the application source, so no hosted build carries a live-check route.

Two observations that matter and are not claims of success:

1. **App Check enforcement is not demonstrated.** A second request from a second `initializeApp(...)`
   instance in the same page - one that never called `initializeAppCheck` and therefore sent no App
   Check token (the SDK resolves App Check per app instance) - was also accepted:
   `status: unexpected success; inferenceSource in_cloud`. No rejection was observed, so the product
   does not claim enforcement evidence and no enforcement setting was changed.
2. **The real app signs in and is blocked by Rules, as predicted.** A fresh browser session signed in
   with a synthetic QA identity from the private file
   (`identitytoolkit .../accounts:signInWithPassword -> 200`, `accounts:lookup -> 200`), the Firestore
   listen channel opened, and the UI showed "No venue access" because the membership read is denied by
   the current closed Ruleset. In-app cloud comparison therefore depends on the separately approved
   reviewed Rules deployment; no Rule was weakened. Screenshot: `.git/opencode/live-app-signin.png`
   (synthetic address only).

The App Check debug provider is an SDK feature that logs the debug token to the local console
(`Firebase App Check debug token: ...`). That is dev-only, the token never enters a build, and console
captures must not reproduce it. Live-local also loads the public reCAPTCHA Enterprise script while
attesting with the debug token; `automaticDataCollectionEnabled: false` (no telemetry) disables App
Check token auto-refresh, which the SDK warns about once per page.

### 13.4 Build-output and private-value checks

The production build embeds no live value. Exact-value search of the private API key, debug token,
site key and both QA passwords across the files in `dist/`:

```text
dist files 5 bytes 906268
VITE_FIREBASE_API_KEY occurrences 0
VITE_FIREBASE_APPCHECK_DEBUG_TOKEN occurrences 0
VITE_FIREBASE_APPCHECK_SITE_KEY occurrences 0
SHIFTRELAY_QA_OUTGOING_PASSWORD occurrences 0
SHIFTRELAY_QA_INCOMING_PASSWORD occurrences 0
```

`npm run guard:dist` (`py -3 scripts/check_dist.py dist`) passes with 0 rules matched, the pinned
Gitleaks scan passes over the working tree plus `dist/`, and `npm audit --omit=dev --audit-level=high`
reports `found 0 vulnerabilities`. `vite.config.ts` additionally refuses a build when any live-only
variable name is present in the build environment, so a leaked dev shell cannot inline one.

### 13.5 Full verifier

```powershell
py -3 scripts/verificar.py --report .git/opencode/evidence.json
```

```text
CHECK typecheck: PASS
CHECK lint: PASS
CHECK build: PASS
dist guard: PASS - 5 files, 906268 bytes, 0 rules matched
CHECK dist-guard: PASS
CHECK secret-scan: PASS
scope: 105 files, 2092549 bytes (untracked and gitignored files included; only .git and node_modules excluded)
CHECK dependency-audit: PASS
CHECK unit: PASS
CHECK ai-output: PASS
CHECK reconciliation: PASS
CHECK runtime-config: PASS
CHECK rules-tests: PASS
CHECK e2e-tests: PASS
CHECK tools-tests: PASS
CHECK checker-self-test: PASS
CHECK diagrams: PASS
CHECK contract-fixture: PASS
Q5 credential scan: PASS (pinned Gitleaks over the working tree + dist, values redacted)
Q5 dependency audit: PASS (npm audit --omit=dev --audit-level=high)
GATE_C: NOT ELIGIBLE (checks failed, blocked, or the tree changed during the run; dirty working tree; 8 scope items unimplemented)
ok=False commit=6cbfded72d2b027b8e17845ca92b4af72d629c47 dirty=True
```

Measured inside that run: 114 unit tests (5 files), 17 ai-output, 20 reconciliation, 23 runtime-config,
31 Rules tests (3 files), 21 E2E, 57 tool tests, 2 diagrams, 0 dependency vulnerabilities, and the
pinned scanner over 105 files / 2,092,549 bytes with no findings. All 16 checks exited 0.

The only non-zero signal is `tree_stable`: a concurrently working master session edited
`docs/adr/0002-on-device-feasibility.md` (and earlier `AGENTS.md`, `CONSTRAINTS.md`,
`docs/_project.md`, `docs/_presupuesto.md`, `docs/HANDOFF.md`, `.github/`) while the suite ran, so the
verifier cannot certify that the tree it measured is the tree it reported. An earlier run of the same
code reported `ok=True` with the identical 16 PASS lines; no check has ever failed in any run.
`GATE_C` stays NOT ELIGIBLE regardless, because this cut makes no commit (dirty tree) and 8 scope
items are explicitly unimplemented. Re-run the command once the concurrent session is quiet if a
`ok=True` record is needed for the gate.

### 13.6 Limits of this evidence

- The live request is one localhost call with a registered debug token. It proves the project, the
  model id, the App Check exchange path and the adapter's `in_cloud` guard; it is not quota, latency or
  availability evidence, and it is not a hosted build.
- `hostedQA` is implemented and unit-tested only. The reserved `/__/firebase/init.json` endpoint is
  documented for JS SDK 8 and earlier, so its behaviour with the modular 13.3.0 SDK must be checked
  empirically after the gated Hosting deployment (master's earlier read of an undeployed site returned
  404, as expected). The site key is a build-time public value; a hosted release build must be produced
  from the private environment and the gated release step, not from this cut.
- App Check enforcement remains unproven (see 13.3, item 1). No enforcement toggle was changed and no
  bypass was added.
- In-app cloud reconciliation, observation confirmation and the whole signed-in shared workflow still
  need the reviewed Rules deployed; today the live app stops at the denied membership read.
- Manual screen-reader/200%-zoom/Android-touch checks, exact Nano 4 identity, a hosted local-model
  request and AC15 product validation remain open and are named by the verifier scope.
- Disclosure: while debugging the temporary live page, the App Check SDK's own console line
  (`Firebase App Check debug token: ...`) was captured once into an interactive tool transcript. The
  registered localhost debug token must therefore be treated as exposed on this machine: revoke it and
  create a replacement before any further local live run. Revocation is a cloud action and needs
  explicit confirmation; nothing was revoked here. The token never entered the repository, a build,
  argv or a file, and the App Check exchange evidence recorded above contains no token value.

## Blocker B1 — derived activity IDs (November 17, 2026)

Symptom: a valid 64-character task ID could not be published. Rules denied the creation activity
because `validActivity` called `isId(activity.id)`, capping the derived ID at 64 characters; the
creation ID is `taskId + "__v1"` (68 characters), and the worst case at the safe-integer version
ceiling is 83.

Reproduced in the real local Firestore emulator (8080) before touching Rules, with
`tests/rules/derived-activity.test.ts`: 2 failed, 4 passed. The two failures were the
64-character publication (denied at the activity `create`) and the 83-character derived ID; the
UUID and forged-ID cases already passed.

```powershell
$env:PATH = "$PWD\node_modules\.bin;$env:PATH"
py -3 scripts/firebase_safe.py emulators:exec --project demo-shiftrelay --only firestore "vitest run --config vitest.rules.config.mts tests/rules/derived-activity.test.ts"
```

Red:

```text
 × publishes, accepts, resolves and reopens a 64-character task ID with matching events
 × accepts an 83-character derived ID at the safe-integer version ceiling
 Tests  2 failed | 4 passed (6)
```

Fix: `firestore.rules` now validates the activity ID only as its exact derivation,
`isDerivedActivityId(activity.id, activity.taskId, activity.toVersion)`. `isId` still applies to
`taskId`, `venueId`, `actorId` and every free-form identifier at 1–64 characters; versions still
use `isSafeVersion`. A forged suffix, task ID or version is denied by the equality itself, and the
creation/transition coupling is unchanged. `docs/INTERFACES.md` §1/§4, `contrato.json`
(`activityIdMaxLength: 83`) and `tests/validation.test.ts` carry the clarified contract.

Green (same command): `6 passed (6)`. Full Rules suite: `4 passed (4)` files, `37 passed (37)`
tests. Unit `115 passed (115)`; E2E `21 passed`; tools `57` tests `OK`; typecheck, lint, build,
`dist-guard`, pinned secret scan and `npm audit --omit=dev --audit-level=high` all exit 0.

Full verifier output:

```text
CHECK typecheck: PASS
CHECK lint: PASS
CHECK build: PASS
CHECK dist-guard: PASS
scope: 107 files, 2127285 bytes
CHECK secret-scan: PASS
CHECK dependency-audit: PASS
CHECK unit: PASS
CHECK ai-output: PASS
CHECK reconciliation: PASS
CHECK runtime-config: PASS
CHECK rules-tests: PASS
CHECK e2e-tests: PASS
CHECK tools-tests: PASS
CHECK checker-self-test: PASS
CHECK diagrams: PASS
CHECK contract-fixture: PASS
GATE_C: NOT ELIGIBLE (dirty working tree; 8 scope items unimplemented)
ok=True commit=6cbfded72d2b027b8e17845ca92b4af72d629c47 dirty=True
```

One intermediate full-verifier run exited 1 on a single E2E case,
`e2e/reconciliation.spec.ts:284 a stale target rejects confirmation and writes no observation`,
because the `Exact outgoing packet (not sent yet)` heading never appeared. The same suite passed
21/21 in the preceding verifier run and 21/21 immediately after (`npm run test:e2e`, exit 0); no
Rules assertion or B1 case was involved. It is recorded as a transient UI wait, not a regression,
and the final verifier run above is all-pass.

`tree_stable` was true for this run; the tree remains dirty by design (no commit or stage). No
Rules, cap, ownership, auth or version behavior was relaxed.

## 14. Phase 8 — reviewed-candidate build and Hosting preparation (November 17, 2026)

Local preparation only: no `firebase deploy`, no commit, no push and no cloud call. Two artifacts
were added and one configuration change was made.

### 14.1 Hosting block

`firebase.json` now declares `hosting.public: "dist"`, one SPA rewrite to `/index.html`, and four
response headers: a `Content-Security-Policy` limited to `'self'`, the documented reCAPTCHA
Enterprise hosts (`script-src https://www.google.com/recaptcha/`,
`https://www.gstatic.com/recaptcha/`; `frame-src https://www.google.com/recaptcha/`,
`https://recaptcha.google.com/recaptcha/`; `connect-src` also `https://*.googleapis.com`), plus
`object-src`/`base-uri`/`frame-ancestors 'none'`; `X-Content-Type-Options: nosniff`;
`Referrer-Policy: strict-origin-when-cross-origin`; `X-Robots-Tag: noindex, nofollow`. No
`unsafe-eval` and no `unsafe-inline`. No `.firebaserc` was added, so `--project` is mandatory on
every command. The CSP frame/connect hosts follow the official reCAPTCHA CSP guidance and the SDK's
own `https://www.google.com/recaptcha/enterprise.js` endpoint read from the installed package; it
has **not** been exercised on a hosted origin.

### 14.2 Release helper (red → green)

Red, before `scripts/release_prep.py` existed:

```text
ModuleNotFoundError: No module named 'release_prep'
Ran 1 test ... FAILED (errors=1)
```

Green, same command:

```powershell
py -3 -m unittest tests.test_release_prep -v
```

```text
Ran 17 tests in 17.794s
OK
```

The suite proves: the public site key is read from a commented private block and validated by shape;
a missing or wrong-shaped key is refused without echoing any value; the build child environment is
the Windows/runtime allowlist plus `VITE_FIREBASE_APPCHECK_SITE_KEY` only (no API key, debug token,
QA password or `VITE_FIREBASE_LIVE_LOCAL`); no value reaches argv; a failed build stops before the
artifact checks; the checks run in the fixed order dist-guard → scanner → production audit and fail
fast; the keyed artifact's single public-site-key finding is classified, and a different rule, a
second finding, a location outside `dist/`, an unreadable line or a line without the public value is
refused; the sealed stage copies exactly `dist/**`, `firestore.rules`, `firestore.indexes.json`,
`firebase.json`; a dirty tree, evidence for another commit/`ok`/tree, missing evidence, an unknown
project and a stage inside the repository are all refused; and the npm/verifier wiring exists.

Tool suite: `npm run test:tools` → `Ran 74 tests ... OK` (57 before, 17 new).

### 14.3 Real keyed build and the classified finding

```powershell
npm run build:qa
```

```text
release prep: hosted build with the public reCAPTCHA Enterprise site key (value not printed; no API key, debug token or QA password in the build)
- Using dynamic import() to code-split the application
- Use build.rolldownOptions.output.codeSplitting to improve chunking: https://rolldown.rs/reference/OutputOptions.codeSplitting
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.
release prep: dist-guard PASS
release prep: secret-scan PASS - 1 classified finding: the public reCAPTCHA Enterprise site key at dist/assets/App-CzJwBaA2.js:42 (public by design, not a credential; scanner unchanged, no allowlist)
release prep: dependency-audit PASS
```

The first run of the same command failed honestly, and that failure is the reason the
classification exists:

```text
result: 1 findings (values redacted by the scanner)
  generic-api-key C:/.../dist/assets/App-CzJwBaA2.js:42
release prep: FAIL - secret-scan (exit 1)
```

Diagnosis: the Vite replacement inlines the public site key next to the environment property name
`VITE_FIREBASE_APPCHECK_SITE_KEY`, which Gitleaks' `generic-api-key` rule matches on shape and
entropy. The value is a public reCAPTCHA **site** key (Google documents site keys as public; the
key is restricted to the two Hosting domains and never to `localhost`), not a credential. The
resolution keeps the pinned scanner untouched: the keyless `npm run build` artifact that the
verifier scans is clean, and for the keyed artifact the helper re-runs the same scanner and accepts
the finding only when it is exactly one `generic-api-key` inside `dist/` whose reported line
contains the public value the build was given. No `.gitleaks.toml`, no `.gitleaksignore`, no
redaction change, no value obfuscation and no scan exclusion was added; any other finding fails the
build. The classification is printed by name and location, never the value.

### 14.4 Sealed stage refusal

The stage command was run against the current, intentionally dirty tree:

```text
refused: the working tree is not clean; commit the reviewed changes first
exit 2
```

It also refuses unknown projects, evidence that is not `ok=true`/`dirty=false`/`tree_stable` for
HEAD, a different `cwd`, missing `dist`/Rules/indexes/config, and a stage directory inside the
repository (17 tested cases above). Nothing was copied to a stage and no deploy command was run.

### 14.5 Full verifier on this cut

```text
CHECK typecheck: PASS
CHECK lint: PASS
CHECK build: PASS
CHECK dist-guard: PASS
scope: 115 files, 2269361 bytes (untracked and gitignored files included; only .git and node_modules excluded)
CHECK secret-scan: PASS
CHECK dependency-audit: PASS
CHECK unit: PASS
CHECK ai-output: PASS
CHECK reconciliation: PASS
CHECK runtime-config: PASS
CHECK rules-tests: PASS
CHECK e2e-tests: PASS
CHECK tools-tests: PASS
CHECK checker-self-test: PASS
CHECK diagrams: PASS
CHECK contract-fixture: PASS
Q5 credential scan: PASS (pinned Gitleaks over the working tree + dist, values redacted)
Q5 dependency audit: PASS (npm audit --omit=dev --audit-level=high)
GATE_C: NOT ELIGIBLE (dirty working tree; 8 scope items unimplemented)
ok=True commit=6cbfded72d2b027b8e17845ca92b4af72d629c47 dirty=True
```

Measured: 120 unit tests in 7 files (17 ai-output, 20 reconciliation, 23 runtime-config), 37 Rules
tests, 21 E2E tests, 74 tool tests, 2 diagrams, 0 production dependency vulnerabilities, and the
pinned scanner over 115 files / 2,269,361 bytes with no findings (the verifier rebuilds keyless
before scanning). All 16 checks exited 0; `ok=True`, `tree_stable=True`. `GATE_C` stays NOT ELIGIBLE
because the cut makes no commit (dirty tree) and the 8 scope items remain explicitly unimplemented.

### 14.6 Limits of this evidence

- Nothing was deployed. The CSP, the SPA rewrite, the reserved `/__/firebase/init.json` response and
  a hosted reCAPTCHA-attested request remain unexercised; they are the post-deploy checklist in
  `docs/PUBLISH.md` §5, and a 404/non-JSON config response is a recorded release blocker, not a
  reason to weaken the resolver.
- The CI workflow was not changed here and still has never run; it remains keyless and cannot
  execute `build:qa` (the private file does not exist in CI).
- The keyed artifact exists locally under the gitignored `dist/` only after `build:qa`. A manual
  `npm run scan:secrets` on that tree reports the one classified public-identifier finding and
  exits 1 by design; the verifier rebuilds keyless first. This is an operational rule, not a
  scanner exception.
- No secret value was printed, written to evidence, or placed on argv; the private file was read
  only for the one public name.
