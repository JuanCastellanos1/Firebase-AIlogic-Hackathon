# ShiftRelay — frozen interfaces (Phase 4)

Status: **frozen** for Phase 4, November 16, 2026; the local-draft contract in §9 was frozen in
slice 2 the same day, the cloud reconciliation contract in §10 on November 17, 2026, and the runtime
configuration contract in §11 the same day. Authority:
this file describes the contract;
`src/domain.ts` and `src/validation.ts` implement it; `tests/fixtures/contrato.json` is its
machine-readable mirror, and `tests/validation.test.ts` fails if the three drift apart. The §9
mirror is `contrato.json` `localDraft`, checked by `tests/ai-output.test.ts`; the §10 mirror is
`contrato.json` `reconciliation`, checked by `tests/reconciliation.test.ts`; the §11 mirror is
`contrato.json` `runtime`, checked by `tests/runtime-config.test.ts`.

Change rule: any change to a type, limit, enum, error code or transition updates this file, the
fixture and the code **in the same commit**. Nothing in this file is an SDK API; no Firebase import
appears in the domain modules. Unimplemented pieces are named in §10, not implied.

Requirements source: `docs/spec.md`. Boundaries and Rules feasibility: `docs/ARCHITECTURE.md`.

## 1. Shared records

Standard-edition Firestore, one venue per demonstration. Paths are fixed; the venue is always an
explicit path segment, never inferred from client state.

| Record | Path | Fields |
|---|---|---|
| Membership | `venues/{venueId}/members/{uid}` | `uid`, `venueId`, `role` (`outgoing` \| `incoming`) |
| Handover | `venues/{venueId}/handovers/{handoverId}` | `id`, `venueId`, `creatorId`, `createdAt` (server timestamp), `taskIds` (array of 1–5 task IDs) |
| Task | `venues/{venueId}/tasks/{taskId}` | `id`, `venueId`, `handoverId`, `creatorId`, `createdAt` (server timestamp), `title` (1–120 bytes), `detail` (0–800 bytes), `state` (`open` \| `accepted` \| `resolved`), `ownerId` (string \| null), `version` (safe integer ≥ 1), `updatedAt` (server timestamp), `resolution` (string 1–800 bytes, `null` unless `state` is `resolved`) |
| Activity | `venues/{venueId}/activities/{activityId}` | `id`, `taskId`, `venueId`, `actorId`, `at` (server timestamp), `action` (`create` \| `accept` \| `resolve` \| `reopen` \| `observe`), `fromState` (state \| null), `toState`, `fromVersion` (integer \| null), `toVersion`, `resolution` (string \| null), `reason` (string \| null), `observation` (object \| null) |

`Task` input is a trust boundary, never cast: unknown or missing keys fail, `title`/`detail` obey the
byte caps above, `version` is a safe integer (`≤ 2^53−1`), and the state fixes the other two fields —
`open` has `ownerId: null` and `resolution: null`; `accepted` has an owner and `resolution: null`;
`resolved` has an owner and a 1–800 byte resolution. A combination no transition can produce is
`invalid_state`.

Observation object (only on `action: "observe"`): `kind` (`duplicate` \| `contradiction`),
`targetTaskId`, `targetVersion` (integer ≥ 1), `rationale` (1–400 bytes).

Rules for every record: no client deletes, no membership writes, no activity updates or deletes,
`createdAt`/`updatedAt`/`at` equal to `request.time`. Only the transitions in §3 change task fields.
Membership is provisioned out of band by an administrator; the app has no path to create it.

Document IDs (including `handoverId`, `taskId`, `targetTaskId`, `venueId`, `creatorId`, `uid` when
used as a path segment) must match `^[A-Za-z0-9_-]{1,64}$`. Arbitrary text is rejected with
`invalid_identifier` before it can become a path segment. `activityId` is not free-form: it is
derived (see §4) and therefore exempt from that pattern while staying bounded by its own template.

Timestamps are absent from the pure TypeScript types on purpose: `src/domain.ts` has no clock, and
the adapter/Rules layer supplies `request.time`. `Task` in code is the authoritative subset that
transitions read and write.

## 2. Reviewed packet (publication input)

Exactly this shape, no extra keys at packet or card level:

```ts
interface ReviewedCard { readonly title: string; readonly detail: string }
interface ReviewedPacket { readonly cards: readonly ReviewedCard[] }
```

- 1–5 cards; `title` 1–120 UTF-8 bytes, nonblank; `detail` 0–800 UTF-8 bytes.
- No `ownerId`, `state`, `version`, `actorId`, `createdAt` or model metadata: the AI cannot supply
  authority fields, and the validator rejects them as `unknown_key`.
- Accepted strings are preserved byte for byte: no trimming, no Unicode normalization, no encoding
  repair, no truncation. Over-limit input is rejected, never shortened.
- Unpaired UTF-16 surrogates are rejected (`unpaired_surrogate`) before any byte counting, because
  `TextEncoder` would otherwise substitute U+FFFD and silently change the string.
- The packet returned to the caller is a new, deeply frozen object; the input is never mutated.

Byte contract: a limit means UTF-8 bytes of the exact string, never `.length`, code points or
graphemes. Conformance cases in `tests/validation.test.ts` (title cap 120): 120 ASCII pass / 121 fail;
30 U+1F600 = 120 bytes pass / 31 = 124 fail; 40 × (`e` + U+0301) = 120 pass / 41 = 123 fail;
60 U+00E9 = 120 pass / 61 = 122 fail; mixed precomposed + supplementary padded to 120 pass / 121 fail.
The same mixed classes are applied to `detail` (800) and `resolution` (800).

## 3. Transitions (frozen matrix)

Every transition increments `version` by exactly 1 and emits exactly one activity whose
`toVersion` equals the new task version. Any other request fails without mutation.

| Action | Actor | From state | Owner precondition | To state | Owner after | Extra payload |
|---|---|---|---|---|---|---|
| `create` (publication) | `outgoing` | — | — | `open` | `null` | card fields; `version` 1 |
| `accept` | `incoming` | `open` | `ownerId` is `null` | `accepted` | actor | — |
| `resolve` | `incoming` | `accepted` | `ownerId === actorId` | `resolved` | unchanged | `resolution` 1–800 bytes |
| `reopen` | `incoming` | `resolved` | `ownerId === actorId` | `accepted` | unchanged | `reason` 1–400 bytes; task `resolution` cleared |
| `observe` | either role | `open` or `accepted` | target is a distinct current task in this venue, `open` or `accepted`, whose `id` equals the command's `targetTaskId` | unchanged | unchanged | `kind`, `targetTaskId`, `targetVersion`, `rationale` 1–400 bytes |

Rejected by design, each with its code: self-assignment or any publish by `outgoing`; accepting an
`accepted` or `resolved` task; resolving an `open` task; resolving or reopening another member's
task; owner replacement or release; arbitrary state patches; forged version jumps; deleting shared
records; editing or deleting activities; a standalone activity.

Clearing a resolution on `reopen` does not lose history: the earlier `resolve` activity keeps its
`resolution` value, and `reopen` records `reason` with `resolution: null` (§4).

## 4. Activity coupling

- `activityId = "{taskId}__v{toVersion}"` (`activityIdFor`), so one retry cannot fork a history and
  a duplicate activity for the same version is a document ID collision, not a second event.
- The task ID keeps its 1–64 character cap; the derived activity ID is exempt from the free-form
  identifier pattern and bounded at 83 characters (64 + `__v` + a 16-digit safe-integer version).
  Rules require exact derivation, so a forged suffix, task ID or version is denied.
- `create`: `fromState: null`, `fromVersion: null`, `toState: "open"`, `toVersion: 1`, actor is the
  handover creator.
- `accept`/`resolve`/`reopen`: `fromState` is the previous task state, `fromVersion` the previous
  version, `actorId` the authenticated actor for that request.
- Action-scoped fields are `null` everywhere else: `resolution` only on `resolve`, `reason` only on
  `reopen`, `observation` only on `observe`. No reconciliation or resolution text is smuggled into
  another action.
- The atomic requirement is authored in `firestore.rules` and measured in the local emulator:
  handover, tasks and creation activities commit in one transaction; each task create requires the
  handover and its creation activity in the post-state; each activity requires the task in the
  post-state; each task update requires its matching activity by derived ID; an observation requires
  its target in the post-state, so a batch cannot resolve or accept a target and cite its earlier
  version. The call budget is in `docs/ARCHITECTURE.md` §6.

## 5. Public functions

```ts
// src/domain.ts
activityIdFor(taskId: string, version: number): string;
// constants: ROLES, TASK_STATES, ACTIVITY_ACTIONS, OBSERVATION_KINDS, ID_PATTERN, LIMITS

// src/validation.ts
utf8Bytes(value: string): number;                       // throws unpaired_surrogate
hasUnpairedSurrogate(value: string): boolean;
validateReviewedPacket(input: unknown): ReviewedPacket; // frozen copy or ContractError
validateTask(input: unknown): Task;                     // same task-input rules, for server reads
planPublication(packet: unknown, context: unknown): PublicationPlan;
applyTransition(task: unknown, command: unknown, targetTask?: unknown): TransitionResult;
```

`planPublication` takes `{ venueId, handoverId, creatorId, taskIds }` and returns a frozen
`{ handover, tasks, activities }` plan: tasks are `open`, unassigned, version 1, with the reviewed
text untouched and the caller's stable IDs (so a retry reuses the same IDs, matching the spec's
no-duplicate-publication rule). It validates the packet itself, so it cannot be bypassed.

`applyTransition` returns `{ task, activity }` with the new task and the single matching activity,
both frozen. `targetTask` is required for `observe` and ignored otherwise; `null` produces
`missing_target`, and a snapshot whose `id` is not `command.targetTaskId` is
`forbidden_transition` (the caller cannot observe one task while recording another). Both the task
and the target snapshot are validated against §1 before any transition logic, so malformed or
partially shaped input is rejected instead of cast. It does not mutate its arguments and does not
read a clock or a database: the caller persists the result inside a transaction with the server
timestamps.

### 5.1 Persistence adapter (implemented, `src/tasks.ts`)

```ts
publishHandover(db: Firestore, plan: PublicationPlan): Promise<"created" | "existing">;
readPublication(
  db: Firestore,
  venueId: string,
  handoverId: string,
  expectedTaskIds: readonly string[],
): Promise<
  | { readonly status: "published"; readonly tasks: readonly Task[] }
  | { readonly status: "absent" }
  | { readonly status: "mismatch" }
>;
runTaskTransition(db: Firestore, venueId: string, taskId: string, command: TransitionCommand): Promise<TransitionResult>;
taskFromData(id: string, data: Record<string, unknown>): Task;
```

`publishHandover` runs inside `runTransaction`, not `writeBatch`. It first reads the handover,
task and activity documents by the caller's stable IDs. If the handover already exists with the
same IDs and unchanged reviewed content, it returns `"existing"` without writing, so a retry after
an uncertain acknowledgment cannot duplicate records. A reused ID with different content throws
`publication id conflict`. Offline, Firestore rejects the transaction; the adapter has no retry
queue and never calls `disableNetwork`, so it never queues a publication for silent replay. A
five-card publication is 11 writes (handover, five tasks, five activities), inside the transaction
write limit.

`readPublication` reads the handover and tasks from the server, never from the local cache, and
reports `published`, `absent` or `mismatch`. It is the explicit recovery path after an uncertain
acknowledgment.

`taskFromData` strips the server timestamps and validates the persisted task through `validateTask`
(the exported form of the same task-input contract) before the UI displays it.

`runTaskTransition` reads the current task (and the observation target) inside `runTransaction`,
calls `applyTransition`, then writes the task change and its single activity together with
`serverTimestamp()`. A stale expected version or a changed read set aborts it; offline it rejects
rather than queuing a replay. Neither function performs authorization of its own: Rules decide, and
both fail closed. The module holds no configuration, credentials, clock, retry queue or emulator
switch, so the caller must supply the client instance (tests connect it to `127.0.0.1:8080`).


## 6. Errors

One error type: `ContractError { code, path, limit? }`, message `"<code> at <path>"`. The message
never contains the rejected text, so a validation failure cannot leak private content into a log.

| Code | Condition |
|---|---|
| `not_an_object` | Input (or a nested card/command/task) is not a plain object |
| `unknown_key` | Key outside the allowlist at packet, card, context, command or task level |
| `missing_key` | Required key absent |
| `invalid_type` | Wrong runtime type (e.g. non-string title, non-array `cards`) |
| `invalid_identifier` | ID or path segment fails `^[A-Za-z0-9_-]{1,64}$` |
| `duplicate_identifier` | The same task ID appears twice in one publication |
| `identifier_count_mismatch` | `taskIds.length` differs from the card count |
| `card_count_out_of_range` | Fewer than 1 or more than 5 cards |
| `blank_required` | Required text is empty or whitespace only |
| `byte_limit_exceeded` | UTF-8 byte length exceeds the field cap (`limit` is set) |
| `unpaired_surrogate` | Lone UTF-16 surrogate in any validated text |
| `invalid_role` | Role is not `outgoing` or `incoming` |
| `invalid_state` | State is not `open`, `accepted` or `resolved`, or the owner/resolution combination is impossible for that state |
| `invalid_action` | Action is not one of the four command actions |
| `invalid_version` | Version or expected version is not a safe integer ≥ 1, or the source version is `2^53−1` so incrementing it would stop being exact |
| `stale_version` | `expectedVersion` differs from the current task version |
| `forbidden_transition` | Role, state, owner, venue or observation-target identity precondition fails |
| `actor_not_owner` | Owner-only action attempted by another member |
| `invalid_observation_kind` | Kind is not `duplicate` or `contradiction` |
| `missing_target` | `observe` without a target snapshot |
| `duplicate_target` | Target equals the source task |
| `stale_target` | Target version differs from `targetVersion` |
| `target_state_not_observable` | Target is `resolved` |

## 7. Order of checks

`applyTransition` evaluates in this fixed order, so a test failure points at one cause: task
shape/keys → task types, byte limits, identifiers, state and version → command shape/keys → types
and byte limits → identifiers → role enum → action → version validity → increment headroom →
`expectedVersion` vs task version (`stale_version`) → role permission → state → owner → target
(read, identity, duplicate, venue, version, state). `validateReviewedPacket` evaluates: packet shape
and keys → `cards` type and count → each card's shape, keys, types, text limits.

## 8. Rules-facing summary

`firestore.rules` enforces, and the emulator suites measure: venue membership on every read and
write, `request.auth.uid` as `actorId`/owner, `request.time` as all timestamps, immutability of
published task content and identity fields, the transition matrix above, one activity per version
with matching post-state in both directions, byte caps with `toUtf8().size()`, and bounded
venue-scoped list queries (Rules are not filters). Membership documents are readable only by their
own uid and writable by no client. Budget for the design and its measured result are in
`docs/ARCHITECTURE.md` §6, including the five-card caching risk.

## 9. Local draft contract (slice 2, frozen November 16, 2026)

Strictly local private drafting: one single-turn English request through Firebase AI Logic with
`InferenceMode.ONLY_ON_DEVICE` (no cloud fallback), returning editable suggestions only. Nothing in
this section is persisted, shared, logged or sent to a cloud model.

### 9.1 Model output (untrusted JSON text)

```ts
interface DraftSuggestion {
  readonly title: string;
  readonly detail: string;
  readonly sourceStart: number;
  readonly sourceEnd: number;
}
```

The model must return only:

```json
{ "cards": [ { "title": "…", "detail": "…", "sourceStart": 0, "sourceEnd": 23 } ] }
```

- Root and card keys are exact: `cards`, then `title`, `detail`, `sourceStart`, `sourceEnd`.
  Unknown keys (including `ownerId`, `state`, `version`, `priority`, `actorId`) are
  `unknown_key`; a missing key is `missing_key`.
- 1–5 cards. `title` is 1–120 UTF-8 bytes and nonblank; `detail` is 0–800 UTF-8 bytes.
- The private note is 1–4,000 UTF-8 bytes. `sourceStart`/`sourceEnd` are integers with
  `0 ≤ start < end ≤ note.length` in **UTF-16 code units**, and neither offset may fall inside a
  surrogate pair (`invalid_source_span`). They point at the note text that supports the card; they
  are never reserialized into shared fields.
- The raw response is capped at **12,000 UTF-8 bytes before JSON parsing**
  (`response_too_large`). Empty/whitespace-only output is `empty_response`; unparseable or
  refusal prose is `invalid_json`.
- Accepted strings are preserved exactly: no trimming, Unicode normalization, encoding repair or
  truncation. Unpaired UTF-16 surrogates are `unpaired_surrogate`. Text is rendered as plain text;
  HTML and instruction-shaped strings are never executed and never grant authority.
- Accepted output is a new deeply frozen array. The input note and response strings are not mutated.

### 9.2 Errors (`AiOutputError`, `src/aiValidation.ts`)

One error type: `{ code, path }`, message `"<code> at <path>"`; the rejected text is never echoed.
Codes: `not_an_object`, `unknown_key`, `missing_key`, `invalid_type`, `card_count_out_of_range`,
`blank_required`, `byte_limit_exceeded`, `unpaired_surrogate`, `empty_response`, `invalid_json`,
`response_too_large`, `invalid_source_span`, `note_empty`, `note_too_large`.

### 9.3 Public functions

```ts
// src/aiValidation.ts
const AI_DRAFT_LIMITS: {
  responseBytes: 12000; noteBytes: 4000; cards: 5; titleBytes: 120; detailBytes: 800;
};
const AI_OUTPUT_ERROR_CODES: readonly AiOutputErrorCode[];
class AiOutputError extends Error { readonly code; readonly path }
validateDraftOutput(raw: unknown, note: unknown): readonly DraftSuggestion[];

// src/localDraft.ts
type LocalDraftCapability =
  | { status: "unsupported" | "downloadable" | "downloading" | "available" | "error" };
type LocalDraftErrorCode =
  | "unsupported" | "not_ready" | "download_failed" | "generation_failed"
  | "not_on_device" | "invalid_note";
class LocalDraftError extends Error { readonly code }
const LOCAL_MODEL_OPTIONS; // English text in and out, passed to availability and creation
probeLocalDraft(): Promise<LocalDraftCapability>;
initializeLocalDraft(onProgress: (value: number) => void, signal?: AbortSignal): Promise<void>;
generateLocalDraft(note: string, signal?: AbortSignal): Promise<{
  readonly suggestions: readonly DraftSuggestion[];
  readonly inferenceSource: "on_device";
}>;
```

### 9.4 Adapter rules measured by the slice

- Capability comes from the documented `globalThis.LanguageModel.availability(options)` only. The
  three states are shown to the user (`unavailable` maps to `unsupported`).
- `initializeDeviceModel` runs only from an explicit click/key press, reports
  `onDownloadProgress`, and is followed by a fresh availability read: the installed SDK can resolve
  its promise after an internal download rejection, so a non-`available` re-read is a
  `download_failed`, never a ready state.
- `generateContent` is only reached when availability is already `available`; an absent
  `LanguageModel` never constructs a request. The model is created with
  `InferenceMode.ONLY_ON_DEVICE`, and the response is rejected unless
  `response.inferenceSource === "on_device"`. No local-drafting module path calls a cloud model; the
  separate consent-gated cloud path is §10 and never handles private note text.
- One generation is in flight at a time. The UI aborts session creation with the documented
  `AbortSignal`, ignores late results after edit, cancel, sign-out or membership loss, and keeps the
  raw note in component memory only. The SDK exposes no public model-dispose call; dropping the
  only adapter/session reference and aborting creation is the documented cleanup available.
- Suggestions are non-authoritative. Only an explicit "use suggestions" action replaces the
  editable cards; review and share remain separate, unchanged slice 1 actions.

### 9.5 Deliberately deferred (not frozen here)

Cloud reconciliation is frozen separately in §10. No code in this cut accepts or returns cloud
reconciliation packet or response shapes, and the local adapter has no cloud path.

## 10. Cloud reconciliation contract (slice 3, frozen November 17, 2026)

Optional, separately consented comparison of already-shared tasks. The packet is assembled from a
fresh authorized read, is shown verbatim before approval, and is sent only by an explicit one-shot
action. Suggestions are ephemeral; only a human confirmation records one ordinary observation.

### 10.1 Bounded context and exact packet

- Sources: **1–5** selected tasks. Context: **0–20** other tasks. Only `open` or `accepted` tasks are
  eligible for either role; `resolved` tasks are excluded and cannot be selected.
- When more than 20 other eligible tasks exist, the caller must pass an explicit visible
  `contextTaskIds` selection (`context_selection_required` otherwise). Nothing is omitted silently;
  the UI shows how many eligible tasks exist and how many are included.
- The packet is exactly `{ sources: TaskSnapshot[], context: TaskSnapshot[] }`, and a snapshot has
  exactly `id`, `version`, `title`, `detail`, `state`. No `ownerId`, `resolution`, `creatorId`,
  `handoverId`, `venueId`, member roster, activity, private note, source span or model authority
  field exists in the packet.
- Outgoing bytes are `JSON.stringify` of that object in the fixed field order above. The preview
  renders the same string the consent stores and the adapter receives, so preview/request byte
  equality is asserted, not assumed.
- The preview also displays the model (`gemini-3.5-flash-lite`), the recipient purpose and the full
  system instruction. These are constants, not model output.

### 10.2 One-shot consent and freshness

- A consent is an immutable snapshot: exact packet bytes, model, purpose, system instruction and
  each included task version.
- Before the request the UI performs a fresh server read, re-plans with the same selection and
  compares the new packet bytes with the consent (`consentStatus`). A difference, a newly required
  context selection, an edit, a context change, a cancel or a sign-out invalidates the consent; the
  user must preview and approve again.
- At most one request is in flight. There is no automatic retry; a failed attempt also consumes the
  consent. After the response arrives, the same fresh-read comparison runs again, and a result from a
  changed context is discarded rather than applied. An aborted request's late result is dropped by
  the page-level operation token.
- Viewing, previewing, refreshing and sharing never generate a cloud call.

### 10.3 Model output (untrusted JSON text)

```json
{ "brief": "…", "suggestions": [
  { "kind": "duplicate|contradiction", "taskId": "…", "taskVersion": 1,
    "targetTaskId": "…", "targetVersion": 1, "rationale": "…" } ] }
```

- Raw response capped at **12,000 UTF-8 bytes before parsing**. Empty/whitespace output is
  `empty_response`; prose/refusal is `invalid_json`.
- Root keys exactly `brief`, `suggestions`; 0–5 suggestions; each suggestion keys exactly the six
  above. `brief` is 0–1,200 UTF-8 bytes; `rationale` is 1–400 UTF-8 bytes and nonblank.
- Both IDs must be distinct and present in the approved packet at exactly the approved versions
  (`unknown_task_id`, `duplicate_target`, `stale_task_version`). Unknown authority fields
  (`ownerId`, `action`, `state`, …) are `unknown_key`.
- Strings are preserved byte for byte, rendered as plain text, never executed. HTML and
  instruction-shaped text are data. `brief` may be empty; `suggestions` may be empty.
- Accepted output is a new deeply frozen object; the raw text and packet are not mutated.

### 10.4 Errors

`ReconcileError { code, path, limit? }`, message `"<code> at <path>"`; rejected text is never echoed.
Output codes: `not_an_object`, `unknown_key`, `missing_key`, `invalid_type`, `invalid_identifier`,
`invalid_version`, `invalid_observation_kind`, `duplicate_target`, `unknown_task_id`,
`stale_task_version`, `blank_required`, `byte_limit_exceeded`, `unpaired_surrogate`, `empty_response`,
`invalid_json`, `response_too_large`, `suggestion_count_out_of_range`.
Plan codes (returned as `{ status: "invalid", code }`): `invalid_input`,
`source_count_out_of_range`, `context_count_out_of_range`, `unknown_task_id`, `duplicate_task_id`,
`task_state_not_reconcilable`.

### 10.5 Public functions

```ts
// src/reconciliation.ts (pure: no SDK, clock, storage or network)
const CLOUD_MODEL; const CLOUD_PURPOSE; const CLOUD_SYSTEM_INSTRUCTION;
const RECONCILE_LIMITS; const RECONCILE_PLAN_CODES; const RECONCILE_OUTPUT_CODES;
planReconciliation(input: unknown):
  | { status: "ready"; preview: ReconciliationPreview; eligibleContextIds: readonly string[] }
  | { status: "context_selection_required"; eligibleContextIds: readonly string[] }
  | { status: "invalid"; code: ReconcilePlanCode };
serializeCloudPacket(packet: CloudPacket): string;
createCloudConsent(preview: ReconciliationPreview): CloudConsent;
consentStatus(consent: CloudConsent, preview: ReconciliationPreview): "valid" | "changed";
validateReconcileOutput(raw: unknown, packet: CloudPacket): ReconcileResult;
observationCommandFor(suggestion: ReconcileSuggestion, actorId: string, actorRole: Role): TransitionCommand;

// src/cloudReconcile.ts
cloudReconciliationProvider():
  | { status: "ready"; label: "firebase-ai-logic-only-in-cloud" | "test-network-mock";
      generate(packetText: string, signal?: AbortSignal): Promise<{ text: string }> }
  | { status: "notconfigured"; reason: string };
```

### 10.6 Human confirmation and adapter rules

- Confirming a suggestion sends one existing `observe` command through `applyTransition` and
  `runTaskTransition` on the source task: `expectedVersion` is the source version from the validated
  suggestion, the target is a distinct current task, and state/owner/version semantics are §3. The
  server adds one activity (`observation` only) and increments only the source version; the target
  and any owner are unchanged. Confirm re-reads fresh versions first and rejects a mismatch with a
  conflict instead of rebasing.
- Dismissing writes nothing. No suggestion is ever applied automatically, and no task is merged,
  closed, reassigned or resolved by reconciliation.
- `src/cloudReconcile.ts` uses `getGenerativeModel(getAI(app), { mode: InferenceMode.ONLY_IN_CLOUD,
  inCloudParams: { model: CLOUD_MODEL, systemInstruction, generationConfig: { responseMimeType:
  "application/json", responseSchema, maxOutputTokens: 2048 } } })` and rejects a response whose
  `inferenceSource` is not `in_cloud`. There is no on-device fallback.
- `cloudReconciliationProvider()` is mode-driven (§11): `emulator` returns `notconfigured`, the two
  live modes return the real adapter, and a page-injected double is reachable only in a development
  build and only when it labels itself `test-network-mock`. The UI shows that label, and those results
  are never presented as real cloud evidence.

### 10.7 Deliberately deferred

Hosted reCAPTCHA attestation, in-app live cloud comparison (needs the reviewed Rules deployed) and
real-device checks are not frozen here and are not claimed. See §11 for the configuration contract and
`docs/verification.md` §13 for the one measured live request.

## 11. Runtime configuration contract (frozen November 17, 2026)

Three modes, exactly one active, no fallback. `src/runtimeConfig.ts` implements this; the fixture
mirror is `contrato.json` `runtime`, drift-checked by `tests/runtime-config.test.ts`.

| Mode | When | Firebase project | App Check | Cloud reconciliation |
|---|---|---|---|---|
| `emulator` | default on `127.0.0.1` / `localhost` | `demo-shiftrelay` emulators only | none | `notconfigured` |
| `live-local` | local host **and** `VITE_FIREBASE_LIVE_LOCAL=1` from the dev runner | approved live project/app | registered debug token (`self.FIREBASE_APPCHECK_DEBUG_TOKEN`), site key supplied but unused for attestation | real adapter |
| `hostedQA` | origin is one of the two approved Hosting hosts | config read at runtime from `/__/firebase/init.json` | reCAPTCHA Enterprise with the build-time public site key, never a debug token | real adapter |

### 11.1 Inputs and validation

- `VITE_FIREBASE_APPCHECK_SITE_KEY` is the only live value a build may embed: it is the public
  reCAPTCHA Enterprise site key. The five public config values and the secret debug token are never
  build inputs; `vite.config.ts` refuses a build when any of those names is present in the build
  environment.
- `live-local` requires `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`,
  `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_MESSAGING_SENDER_ID`,
  `VITE_FIREBASE_APPCHECK_SITE_KEY` and `VITE_FIREBASE_APPCHECK_DEBUG_TOKEN`, all non-blank, plus a
  project equal to `shiftrelay-hybridai-2026` and a web app equal to the documented public app id
  (`VITE_FIREBASE_APP_ID` is optional because the private file keeps it commented out; a different
  value is refused). The site key must start with `6L` and the API key with `AIza`.
- `scripts/dev_live_local.py` is the only source of those values: it reads the outside-root private
  file (refusing a path inside the repository), accepts allowlisted names only — including entries the
  file keeps commented out — rebuilds the child environment from a Windows/runtime allowlist, binds
  `127.0.0.1` with a strict port and no CORS headers (`server.cors: false`, because the dev server
  serves the live configuration), and prints the mode, host, port and public project id only. Values
  never reach argv, a log line or a file inside the repository.
- `hostedQA` reads the same-origin `/__/firebase/init.json`, then requires `projectId` and `appId` to
  equal the approved project and web app and all five fields to be non-empty strings. A missing site
  key, an unavailable or malformed response, or a mismatch fails closed *before* a Firebase app is
  created.
- Emulator mode keeps its existing refusals: non-demo project, non-local emulator host.

### 11.2 Errors

`RuntimeConfigError { code, reason }` with message `"<code>: <reason>"`; no configuration value is
ever included. Codes: `unknown_origin`, `non_local_emulator`, `wrong_project`, `wrong_app`,
`live_local_incomplete`, `site_key_missing`, `hosted_config_unavailable`, `hosted_config_invalid`.
`describeRuntimeFailure` turns any of them into the closed page message; `src/main.tsx` renders that
instead of a blank page and initializes nothing.

### 11.3 Build-output invariants

`scripts/check_dist.py` fails when the built `dist/` contains a Firebase web API key literal, a
debug-token-shaped UUID literal, the labelled `test-network-mock` hook, the private configuration path
or a QA credential variable name, and fails closed when `dist/index.html` is absent. It runs as the
`dist-guard` verifier check right after `build`.

### 11.4 Known upstream gap

Reserved Hosting URLs (`/__/firebase/init.json`) are documented for Firebase JS SDK 8 and earlier;
this app uses the modular 13.3.0 SDK, and the endpoint is not covered by that documentation. The app
therefore treats a successful manual JSON read as an unproven assumption: it validates the payload
exactly and fails closed otherwise, and a hosted build must be checked empirically after the gated
deployment. No reserved SDK script is loaded and no modular support is claimed.

## 12. Out of scope for this phase

Hosting deployment and its manual checks, App Check enforcement evidence, in-app live cloud comparison
(blocked by the undeployed Rules), quota/latency beyond one measured call, and any live Firebase
behavior beyond one attested `ONLY_IN_CLOUD` request from localhost. The Firestore Rules, emulator
configuration, persistence adapter, Auth emulator session, responsive web UI, strictly local drafting,
the consented reconciliation contract and the three runtime modes above are implemented and measured
against synthetic data.
