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

Review evidence is fresh for `dbd217c`, unlike the stale dirty pre-WIP report found at startup. Gate C remains **not approved** because of concrete code/evidence blockers, not because framing needs to be repeated. Prior localhost Nano 4 and AI-proxy App Check evidence is retained as dated evidence; hosted/manual checks are not marked complete.

Allocation unchanged. Cut optional polish or scope extras before security, authorization, accessibility, critical tests, privacy or reproducible evidence. Non-blocking review findings are bounded in `docs/DEBT.md`; five-card and byte/permission limits remain unchanged.
