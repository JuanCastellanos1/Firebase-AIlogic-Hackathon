# ShiftRelay — Time and Scope Budget

Official cutoff: November 30, 2026, 2 PM Pacific. Resumed November 19. Percentages allocate available effort, not invented full-time working hours. No measured labor totals were supplied. Firebase spending remains free-tier-only; no billing changes authorized.

| Block | Phases | Planned effort | Actual evidence / status |
|---|---|---:|---|
| Setup | 0 | 5% | Repository/tooling/skills configured; retained, not repeated. |
| Framing | 1–3 | 20% | Concept, stack, spec, plan, quality floor and rendered diagrams exist; Gate A passed. |
| Build | 4–5 | 45% | Three feature slices and live/QA preparation preserved in amended WIP `dbd217c`. Fresh full implemented-code verifier on resume: 16/16 pass, clean matching SHA. Hosted/manual delivery checks remain open. |
| Quality and fixes | 6–6.5 | 20% | Two requested Qwen 3.8 Flash reviews completed; both reject Gate C. D1–D4 and U1 are routed to one bounded correction cut with regressions and fix-only re-review. No quality threshold lowered. |
| Delivery | 8 | 10% | Earlier CI succeeded only for `b0910d3`. Current-source CI, hosted QA, final validation/review, local demo video and gated merge pending. No push/deploy/merge during resume verification/review. |

## Gate C update — November 19

**QA preparation — November 20 UTC:** isolated clean `00c2b2e` clone passed full 16-check
verifier at `03:17:25Z`, keyed build gates and sealed staging. Read-only live preflight confirms
billing disabled, enforced AI Logic App Check and both synthetic membership shapes. Reviewer
approved Q5 public artifacts and emulator-tested deny-all recovery; no prior live Rules release
exists. No deployment yet. Original operational edits preserved; allocation unchanged.

**Publication update — November 20 UTC:** user published `00c2b2e`, remote SHA independently
confirmed. Verification run `44664598466` completed successfully for that source; GitHub REST
independently checked (`updated_at=2026-11-20T03:05:22Z`). Current-source CI condition is now met.
No allocation change, no PR/merge/deploy. This supersedes the publication block recorded below.

**Latest stop — November 20 UTC:** both code fix reviews approved `00c2b2e`, all 16 post-commit
checks passed on its clean/stable tree at `02:50:35Z`. No production changes or repeated build
slices. CI-only push was explicitly approved but denied by delegate tool policy before execution;
zero pushes/deployments/merges, current-source CI not started. Remaining work is permission/user
publication, current-source CI and eight delivery gaps. Allocation unchanged; labor unmeasured.
Closure records are later uncommitted documentation, not part of that certified checkpoint.

**Resume update — November 20 UTC:** fix checkpoint `a7711cd` passed all 16 verifier checks on
a clean/stable tree at `02:22:47Z`. Both replacement Qwen reviewers approved D1–D4/U1 with no
code blockers; non-blocking follow-ups are grouped under existing N1/N6/N8. User authorized replacement sessions after parent-session access
was refused. Gate C remains open; record reconciliation and post-commit evidence are still due.
No repeated framing/build, no push/deploy/merge, no allocation or quality-floor change. Actual
labor totals remain unmeasured. Earlier paragraphs below retain the November 19 review history.

Review evidence is fresh for `dbd217c`, unlike the stale dirty pre-WIP report found at startup. Gate C remains **not approved** because of concrete code/evidence blockers, not because framing needs to be repeated. Prior localhost Nano 4 and AI-proxy App Check evidence is retained as dated evidence; hosted/manual checks are not marked complete.

Allocation unchanged. Cut optional polish or scope extras before security, authorization, accessibility, critical tests, privacy or reproducible evidence. Non-blocking review findings are bounded in `docs/DEBT.md`; five-card and byte/permission limits remain unchanged.
