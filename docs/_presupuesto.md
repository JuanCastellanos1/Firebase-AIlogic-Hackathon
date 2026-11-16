# Time and Scope Budget

Baseline: user allows 15 days; official submission cutoff is November 30, 2026, at 2 PM Pacific. The earlier cutoff controls. Percentages below allocate available effort, not assumed full-time working hours.

| Block | Phases | Planned effort | Actual evidence | Status |
|---|---|---:|---|---|
| Setup | 0 | 5% | Rules summary read; tools and MCP checked; empty remote connected; startup artifacts created | Gate 0 environment checks passed; initial history unborn |
| Framing | 1–3 | 20% | Stack ADR, 15 criteria, three-slice plan, six thresholds; master reran 4 diagram tests, renderer self-test and 1/1 real render successfully | Gate A approved; live-runtime checkpoints remain owned and unverified |
| Build | 4–5 | 45% | Master reran manual slice:54unit31Rules7E2E19tools, type/lint/build and2diagrams pass; also independently exercised publication→accept→resolve→reopen UI. Active Firebase project/default Standard us-east1 database verified | Manual slice automated checks pass; scanner in progress. No live app/AI integration. Hardware/browser capability observed but exact model unresolved |
| Quality and fixes | 6–6.5 | 20% | Pinned real redacting Gitleaks added; master confirms clean74-file source/build scan and0 production dependency vulnerabilities after scoped gRPC override | Full post-fix verifier result pending; no Gate C/reviewer approval |
| Delivery | 8 | 10% | None | Reserve for deployment, public repository, video and submission |

## Scope policy

Aim for one complete core workflow, not a broad feature catalog. Keep web delivery mandatory and verify Android portability before selecting architecture. Native Android packaging is not yet a delivery commitment. Cut extras before validation, accessibility, security, testing, or submission evidence.

## Gate 0 update

Gate A approved. Manual-slice automated checks and independent browser flow now pass under master; full product/manual accessibility criteria do not. Free-only cloud project/database exist, no live frontend/AI setup. Next scope is Q5 scanner followed by strictly local drafting, conditional on genuine runtime evidence. No paid usage, commits/pushes/merges yet. Allocation unchanged; no engineering hours invented. Gates B/C/D remain open; no hybrid compliance claim.
