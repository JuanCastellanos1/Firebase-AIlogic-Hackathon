# ShiftRelay — Grouped Review Debt

Reviewed source: `dbd217cdb4e38606dc6d39285e0fcfc3f5caec78`, November 19, 2026. Both independent reviewers used `opencode-go/qwen3.8-flash`. Blocking fixes D1–D4/U1 are tracked in `_project.md` and are **not** deferred as debt. At most eight grouped non-blocking findings below; no validation, security or accessibility floor is waived.

| ID | Finding / source | Disposition and upgrade trigger |
|---|---|---|
| N1 | Membership self-record bootstrap reads and handover task-ID validation clarity (`firestore.rules`). | D2 authorization fix approved by the replacement data/privacy reviewer at `a7711cd`. Self-UID-only membership metadata reads and indirect task-ID validation through linked valid tasks remain non-blocking; clarify before multi-venue expansion without granting roster access. The adjacent comment says three bindings but lists four; correct when next touched, with no behavior change. |
| N2 | Persisted activity display casts/fallbacks (`src/session.ts`). | Harden display-only decoding before legacy/admin-written data migration. Rules continue to validate every client write; never use a display fallback as write authority. |
| N3 | Bounded task/history reads at 50 records have no visible truncation signal (`src/session.ts`, queue UI). | Document the bound for synthetic QA; add a visible limit signal/pagination before larger venue usage. Do not claim exhaustive queue/history or silently lower server authorization limits. |
| N4 | Plain publication errors become generic uncertainty text (`src/tasks.ts`, `describeFailure`). | Safe explicit read-back/no auto-retry is retained. Introduce typed conflict copy before broader deployment polish; never reinterpret uncertainty as success. |
| N5 | Private-prompt delimiter and source-span semantic quality (`src/localDraft.ts`, ADR0006). | Keep explicit human review and no factual-span guarantee. Consider robust source alignment before claiming verified extraction; bounds-only validation is not semantic validation. |
| N6 | Stale status/comments and duplicated UI contract constants/over-limit submit feedback. | HANDOFF/PUBLISH status reconciled November 20 via dated supersession; preserve historical records on future edits. Remount wording changed, but the new effect wording is still imprecise: see follow-up below. Reuse existing constants and improve byte-limit feedback when controls are next touched; server/runtime caps remain unchanged. |
| N7 | Emulator-specific failure copy and membership-read error classification in live modes. | **Copy part closed November 19, 2026:** the workspace-read, unreachable and sign-in failure sentences are mode-neutral (`src/App.tsx`, `src/session.ts`); no error-state behavior changed. Still debt: distinguish failed verification from a proven absence of access during UX hardening. Always clear private/shared state on access/session failures. |
| N8 | Runtime/build configuration hardening (`scripts/check_dist.py`, `src/runtimeConfig.ts`). | **UUID guard closed November 19, 2026:** debug-token rule is case-insensitive with an uppercase synthetic regression. New non-blocking review follow-up: hostedQA does not mirror live-local's `AIza` prefix check; project/app allowlists remain the real boundary. Consider parity before expanding hosted configuration/origins; no exposure or security waiver inferred. Existing Vite resolved-env refusal remains primary build defense; no real token may enter a build. |

## November 20 fix-review reconciliation

### November 23 replacement focused review

Closure note (November 24): the outside-root hosted collector reached engineering
preflight GO offline (pinned-SDK path, 192/192 assertions, 26/26 runner stubs,
full five-asset gate before credentials). That is not formal Gate C, not a live
permit and not payload proof; the original one-call payload stays unmeasured.
All earlier N6 groups remain; no new group is opened at closure.

N6 processfollowup: runtime-evidenceplanner returnedemptytwice (oneoriginal+
onereducedretry); masterreconstructedfromsummary/spec/CONSTRAINTS/PUBLISH and
queriedofficialSDKdocs. No thirdplannerloop. SubsequentpinnedSDKfeasibility
is a distinct read-only technicalquestion, not retryingmissingplanningartifact.

Same reviewer APPROVED `5f87582..2c3d3ca` reader-evidence six-doc range,
no blockers. FOURtargetedsuccessreaderchecks explicitlyevidenced, not wholeAC12/
Q4closure. Four N6 groups: narrow staleverifierblanketmanualwording at next
substantiveverifierchange (not immediatecosmeticloop); retain gate/sourceinference
and outofbandposthashqualifiers; neveropenpreservederrorcontext; carriedfocus/
selector/identitylimitsunchanged. No blanketadditionalreader/hardwarefloor.

Same reviewer APPROVED `a23561a..5f87582`, no blockers. Five N6 notes retained:
state-only effect can consume without own/enabled node in unobserved narrow
refresh/competitor windows; denied/error accept focus unrestored (master explicitly
retains as scoped success-path limitation, no contract waiver); future failure-path
decision needs assertion; preserve identity/artifacts before reruns on recurrence;
structural status selector change only if future direct-child UI churn requires it.
Controlled original-defect correction accepted, historical failed-variant attribution
unknown. Final C/D and actual-reader reconfirmation remain open.

Nov24 supersession: explicit exact-source original-defect RED/GREEN pair is
master-inspected (a23561a Handover fails new accept-focus assertion; unchanged
candidate passes same spec/command). Candidate admitted for full verification/
review, NOT finally accepted. Older two failed variants remain unattributable,
not a proven current-candidate failure rate or established scheduler race.
Denied/stale/error focus limits and actual-reader gaps remain explicit.

November24 N6 followup: accept-focus regression reproduced the original loss;
candidate correction remains UNVERIFIED, not deferred as an accepted repair.
Two post-change failures lack variant attribution; repeated passes and one
authorized passing instrumented sample did not capture failing ordering.
DIAG/DIAG2 projected evidence covers passing runs only. All artifacts preserved;
no attributable current-candidate failure rate. Attempt permission exhausted,
further execution paused for user decision. See HANDOFF top/verification§26.

Focused accessibility/delivery checkpoint `a23561a`: reviewer
`ses_df435283affev31so1dyMcZZ25` APPROVED cumulative `71d0871..a23561a`,
no blockers; bounded status-carrier/resolve-reopen-focus correction re-reviewed.
Five nonblocking notes grouped under N6: contradictory optional-inset/cut arithmetic
before filming; predicted accept-button focus loss to assess/record before reader
reconfirmation; inherited LOCALHOST model provenance must not imply hosted measurement;
unsupported system-font licensing assertion; deliberate structural status selector
may need a testid only if future UI churn requires it. First four are routed to
bounded docs correction/explicit limitation recording; no untested source expansion.
Actual reader reconfirmation and final C/D remain open.

Cumulative local-contrast/AC15metadata/preview-sync checkpoint `71d0871`: same
reviewer APPROVED `af421ae..71d0871`, no blockers; testfix rootcause/regression
explicitly closed, failed RED preserved. Five notes remain N6: precommit snapshots;
quote reviewed§23 transport correction instead of raw report's batchGet diagnosis;
add semantic waits if future sibling fixtures change signatures; policy-denied
ignored-tree hygiene; preserve intermediate fix-attempt log alongside RED if
outside-root artifacts are later archived. No standalone polish/replay required.

AC15 scope checkpoint `af421ae`: same reviewer APPROVED `84bd353..af421ae`,
no blockers; decision and existing draft-copy claims review explicitly approved.
Five notes remain N6: dated pre-commit snapshots; PUBLISH correction parenthetical
under-enumerates its governing blanket supersession; idea's historical research
checkpoint superseded at top; policy-denied ignored-tree hygiene; PLAN's pending
claims-review checkbox now satisfied for existing drafts only. At next substantive
verifier change reconcile static item8 with actual approval/future-asset review.
No research session or immediate cosmetic/checkpoint loop required.

Enforcement/contrast checkpoint `84bd353`: same focused reviewer
`ses_df69e6660ffeWf4eXej8AhaiI9` APPROVED `0001fa1..84bd353`, no blockers.
Five nonblocking notes stay under N6: dated pre-commit snapshots; quote reviewed §21
rather than the report's additional workspace-count/JSON-unrendered-list slips;
quote ADR0007's historical causal sentence alongside §6 limits; policy-denied
ignored-tree hygiene inspection; existing long-row readability. Batch if touched,
no standalone polish/replay or new debt group; final C/D remain open.

Hosted-cloud documentation checkpoint `0001fa1`: reviewer
`ses_df69e6660ffeWf4eXej8AhaiI9` APPROVED `5d8ba43..0001fa1`, no blockers.
Group its four nonblocking notes under N6: pre-commit status snapshots (now
superseded by HANDOFF's dated checkpoint), capture-stop timestamp attached to the
result row, prefer reviewed §20/PUBLISH §5.4 over the report's stronger wire-location/
zero-write wording, and disclose policy-denied ignored-tree hygiene inspection.
No standalone polish/replay required; approval is not final C/D closure.

Reviewer `ses_df8e8e6caffeMclzaM1hR3sDsT` APPROVED the focused
`dc5a273..df9706f` physical/contrast/closure documentation cut, no blockers.
B1/B2/B3 stay closed. Approval excludes subsequent operational resume notes;
final C/D remain open. Group six follow-ups under existing **N6**, not new debt groups:
conservative Q4/dated-checkpoint status supersession; mark superseded ledger notes
resolved by dated decisions; retain the inaccessible reviewer step only as history;
explicitly list the missing exact physical Chrome version as a partial browser record;
incidental formatting; reduce duplicated contrast tables/long-row review friction.
Batch with the next substantive documentation pass, preserving provenance and scope.
No standalone polish cycle, quality waiver or repeated physical QA required.

### Docs-only review at `88eaa15`

Re-review at `21d723f` closed B1/B2. New B3 unsupported expansion of “4/5”
suggestions into separate run counts is a blocker, not deferred debt.
Same reviewer subsequently APPROVED `dc5a273`: B1/B2/B3 all closed.
Provenance attribution and duplicate-current-heading notes are fixed; remaining
N6 notes below stay deferred with the existing trigger, not new blockers.
New nonblocking notes remain **N6**: PLAN hosted-local status correction,
executed-next-step snapshots, historical dirty-tree tense, inherited-vs-measured
model provenance, TalkBack/physical-hardware scope distinction, explicit emulator
origin for axe evidence, reproducible full guard paths and old-history cosmetics.
Address before submission-facing publication or when the relevant record is touched;
do not reopen completed QA solely for documentation polish.

Blocking B1 (stale PUBLISH hosted-local claim) and B2 (checkpoint-relative status)
are fixes, not deferred debt; same-reviewer confirmation remains required.
Group nonblocking documentation findings under existing **N6**, not a ninth group:
spacing/SHA readability, accurate contract citations, named rather than misleading
counts, contrast-evidence limits, static-scope drift enumeration, precise guard
command/exit attribution and no-capture versus incidental Auth traffic.
Physical Android wording in CONSTRAINTS measured Q4 conflicts with the narrower
responsive-web framing; retain the ambiguity, do not assert a waiver.
Master independently reran normal guard selfcheck (exit 0) AND
`--no-live --inject-unsafe` (exit 2); reject the review suggestion that exit 2
was only a transport-failure fixture. Clarify exact commands in delivery docs.
No new quality requirement or gate exception is created by this ledger.

Both replacement Qwen reviewers approved `dbd217c..a7711cd` with no code blockers. Follow-ups
are grouped into the existing ledger, not added as a ninth group:

- **N1:** retain fail-closed anonymous evaluation-error behavior and cached/read-budget caveats;
  clarify the three/four-bindings comment when touched. Before Rules deployment, directly verify
  both synthetic QA memberships contain matching UID, venueId and a declared role. Historical
  provisioning records are not a fresh live pre-deploy check.
- **N6:** HANDOFF/PUBLISH evidence status was reconciled November 20 through dated supersession;
  future status edits must preserve dated evidence. Status prose can become stale when its own
  commit is certified: use live Git/evidence.json/review.sha as authoritative, and treat run-specific
  SHA/time/dirty/pending prose as dated snapshots, not gate input. Remaining comment caveat: reconciliation
  clearing is done by the render-time signature check, not the effect; App's emulator-only header
  is stale. Behavior is approved, comment cleanup remains open. Release documentation/docstrings
  should explicitly require complete executed-check coverage, not only green selected checks.
  Recount test totals on the next full run before publishing fresh totals.
  QA-preparation follow-ups: reconcile Python prerequisite prose (actual 3.15.2, not 3.13);
  the disposable preflight generator still has its old backup-directory label and must not be
  mistaken for a repeatable recovery tool. ADR 0009 is the durable recovery source.
- **N8:** strengthen release evidence schema validation on next gate-helper change: require
  complete scope, nonblank command, valid output hash/duration, and verifier-shaped fixtures in
  addition to the already-required full unique check list. This is non-blocking hardening, not
  permission to stage partial evidence. Hosted API-key prefix parity remains deferred. Uppercase
  UUID detection is stricter defense-in-depth, not proof that case-sensitive tokens are equivalent.
  Review patch encoding was corrected by writing raw git stdout bytes; avoid shell re-encoding.
  Q5 pre-deploy review accepted `venue-hall-01` as an existing compiled synthetic source constant,
  not a credential or venue-obscurity control. Stage public-artifact boundary approved for QA;
  release agent must still verify CLI deploy sub-targets at run time.

The eight original groups and all release conditions remain in force. Reviewer session outputs,
not these operational summaries alone, establish the review verdicts.

## Not debt that can be ignored

Hosted config compatibility, reCAPTCHA-attested cloud/local HTTPS proof, Firestore enforcement/production five-card budget, manual screen-reader/zoom/Android app checks, honest AC15 decision, final public-artifact review and local demo materials remain delivery conditions in `CONSTRAINTS.md` / `PUBLISH.md`. They are not passed by permission, mocks or this ledger.
