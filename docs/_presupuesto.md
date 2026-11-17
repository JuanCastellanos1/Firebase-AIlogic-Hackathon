# Time and Scope Budget

Baseline: user allows 15 days; official submission cutoff is November 30, 2026, at 2 PM Pacific. The earlier cutoff controls. Percentages below allocate available effort, not assumed full-time working hours.

| Block | Phases | Planned effort | Actual evidence | Status |
|---|---|---:|---|---|
| Setup | 0 | 5% | Rules summary read; tools and MCP checked; empty remote connected; startup artifacts created | Gate 0 environment checks passed; initial history unborn |
| Framing | 1–3 | 20% | Stack ADR, 15 criteria, three-slice plan, six thresholds; master reran 4 diagram tests, renderer self-test and 1/1 real render successfully | Gate A approved; live-runtime checkpoints remain owned and unverified |
| Build | 4–5 | 45% | Slice2committed92379f9; Slice3 master14checks pass91unit20reconciliation17AI-output31Rules20E2E37tools,scans/audit/type/lint/build/2diagrams. ProductionAppCheck/keyrestrictions/2syntheticmembers provisioned,stillSpark | CommitSlice3; liveconfig/AppCheck/realcloudrequest+QAintegration next. ExactNano4/hostedmanualtests not proven |
| Quality and fixes | 6–6.5 | 20% | Gitleaks + scopedgRPC fix + minimal emulator child env prevent CLI credential log exposure; post-commit full manual-slice checks pass | Independent finalGateC/reviewer pending later slices and real/manual evidence |
| Delivery | 8 | 10% | User authorized authenticatedQAdeploy aftercodereview+automatedchecks to permit final livevalidation; finalreviewedrelease/PRmerge gated. VerifiedSlice2feature pushed; mainbaseline bootstrap unresolved | QA+finaldelivery,CI,review,localvideo pending. No billing/terms/YouTube/hackathonsubmission authorized |

## Scope policy

Aim for one complete core workflow, not a broad feature catalog. Keep web delivery mandatory and verify Android portability before selecting architecture. Native Android packaging is not yet a delivery commitment. Cut extras before validation, accessibility, security, testing, or submission evidence.

## Gate 0 update

Gate A approved. Manual-slice automated checks and independent browser flow now pass under master; full product/manual accessibility criteria do not. Free-only cloud project/database exist, no live frontend/AI setup. Next scope is Q5 scanner followed by strictly local drafting, conditional on genuine runtime evidence. No paid usage, commits/pushes/merges yet. Allocation unchanged; no engineering hours invented. Gates B/C/D remain open; no hybrid compliance claim.
