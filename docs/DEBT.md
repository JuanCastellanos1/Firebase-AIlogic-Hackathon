# ShiftRelay — Grouped Review Debt

Reviewed source: `dbd217cdb4e38606dc6d39285e0fcfc3f5caec78`, November 19, 2026. Both independent reviewers used `opencode-go/qwen3.8-flash`. Blocking fixes D1–D4/U1 are tracked in `_project.md` and are **not** deferred as debt. At most eight grouped non-blocking findings below; no validation, security or accessibility floor is waived.

| ID | Finding / source | Disposition and upgrade trigger |
|---|---|---|
| N1 | Membership self-record bootstrap reads and handover task-ID validation clarity (`firestore.rules`). | Shared data authorization must be fixed under D2. Self-UID-only membership metadata reads and indirect task-ID validation through linked valid tasks are non-blocking; clarify or tighten before multi-venue expansion without granting roster access. |
| N2 | Persisted activity display casts/fallbacks (`src/session.ts`). | Harden display-only decoding before legacy/admin-written data migration. Rules continue to validate every client write; never use a display fallback as write authority. |
| N3 | Bounded task/history reads at 50 records have no visible truncation signal (`src/session.ts`, queue UI). | Document the bound for synthetic QA; add a visible limit signal/pagination before larger venue usage. Do not claim exhaustive queue/history or silently lower server authorization limits. |
| N4 | Plain publication errors become generic uncertainty text (`src/tasks.ts`, `describeFailure`). | Safe explicit read-back/no auto-retry is retained. Introduce typed conflict copy before broader deployment polish; never reinterpret uncertainty as success. |
| N5 | Private-prompt delimiter and source-span semantic quality (`src/localDraft.ts`, ADR0006). | Keep explicit human review and no factual-span guarantee. Consider robust source alignment before claiming verified extraction; bounds-only validation is not semantic validation. |
| N6 | Stale remount comment and duplicated UI contract constants/over-limit submit feedback. | **Comment part closed November 19, 2026:** `src/CloudReconciliation.tsx` now describes the task-signature effect instead of a React `key` remount. Reuse existing constants and improve client byte-limit feedback when those controls are next touched; server/runtime caps remain authoritative and unchanged. |
| N7 | Emulator-specific failure copy and membership-read error classification in live modes. | **Copy part closed November 19, 2026:** the workspace-read, unreachable and sign-in failure sentences are mode-neutral (`src/App.tsx`, `src/session.ts`); no error-state behavior changed. Still debt: distinguish failed verification from a proven absence of access during UX hardening. Always clear private/shared state on access/session failures. |
| N8 | Build UUID guard is lowercase-only (`scripts/check_dist.py`). | **Closed November 19, 2026:** the debug-token rule is case-insensitive, with an uppercase synthetic regression in `tests/test_dist_guard.py`. Existing Vite resolved-env refusal remains primary defense; no real token may enter a build. |

## Not debt that can be ignored

Hosted config compatibility, reCAPTCHA-attested cloud/local HTTPS proof, Firestore enforcement/production five-card budget, manual screen-reader/zoom/Android app checks, honest AC15 decision, final public-artifact review and local demo materials remain delivery conditions in `CONSTRAINTS.md` / `PUBLISH.md`. They are not passed by permission, mocks or this ledger.
