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

### Docs-only review at `88eaa15`

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
