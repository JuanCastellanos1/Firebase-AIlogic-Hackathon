# ShiftRelay quality contract

Proposed November 16, 2026. Owner: master; enforcement: implementer + independent reviewer. Skill applied: constraint-driven-development (noninteractive defaults; no user interview or tooling installation). Read with `docs/spec.md` and `docs/PLAN.md` before code.

**Status: targets unchanged; partial implemented-code evidence exists, final delivery validation remains open.** Commands now exist in package.json and scripts/verificar.py. The measured-results section separates automated/emulator evidence from live-device and delivery requirements. Missing checks remain pending blockers, never implicit passes.

## Six blocking thresholds

| ID / reason | Non-weakenable target | Realistic planned check | When / owner |
|---|---|---|---|
| Q1 — Prevent private disclosure | **0** private-sentinel occurrences in outbound payloads, Firestore/browser storage, URLs, console/error logs; **0** inference requests without the required explicit action; **0** payload telemetry or silent local-to-cloud fallbacks | `npm run test:e2e -- e2e/privacy.spec.ts` and `e2e/reconciliation.spec.ts`; inspect captured bodies and persistence against exact preview; repeat AC13 manually on real localhost/hosted paths. Synthetic sentinel is removed from approved fields; metadata traffic distinguished from content | Every relevant slice; implementer, real device-test implementer; reviewer inspects evidence |
| Q2 — Ownership and authorization are facts | **100%** enumerated allowed/denied permission + state-transition cases pass; race creates **exactly 1** owner and matching acceptance event; **0** stale/unauthorized updates or missing/forged activities accepted | `npm run test:unit -- tests/transitions.test.ts`; `npm run test:rules -- tests/rules/permissions.test.ts`; `npm run test:rules -- tests/rules/concurrency.test.ts`; two isolated client race and direct SDK negative cases in Auth/Firestore emulators (AC07–09) | Each shared-data change and final verification; implementer + Rules reviewer |
| Q3 — Critical paths cannot be traded for a green badge | **100%** AC01–AC14 checks pass before delivery, with **0** skipped/deleted/weakened critical tests, new suppression comments, unimplemented stubs or empty error handlers; **0** type/lint/build errors | `npm run typecheck`, `npm run lint`, `npm run build`, all unit/Rules/E2E suites; future `py -3 scripts/verificar.py --report .git/opencode/evidence.json` aggregates actual results, manual evidence references and constraint-floor diff review. AC15 gets an explicit product go/no-go, not an automatic test pass | Slice-end for introduced criteria, all before delivery; implementer, reviewer compares against approved contract/history |
| Q4 — Accessible ownership actions | **0** serious/critical automated accessibility findings across capture/preview/consent/task states; ordinary text contrast **>=4.5:1**; **0** horizontal document overflow at **320 CSS px**; **100%** core actions keyboard operable and usable at **200% zoom** | `npm run test:e2e -- e2e/accessibility.spec.ts` with an authorized axe-core integration; manual keyboard, focus, screen-reader, zoom and actual Android touch checklist in `docs/verification.md`. Automated scans are not WCAG certification; use external axe rules plus manual evidence, not a homegrown WCAG verdict | Every UI slice and hosted verification; UI implementer + reviewer |
| Q5 — Ship neither secrets nor known severe dependency risks | **0** embedded credentials, service-account keys, direct Gemini secrets, passwords or debug tokens in source/build/public evidence; **0** high/critical production dependency advisories | `npm audit --omit=dev --audit-level=high`; future `npm run scan:secrets` must wrap an authorized pinned redacting scanner (not a homegrown regex substitute), with exact CLI verified through current docs and documented at setup; plus reviewer inspection of source, public config, built output and sanitized evidence. Exclude private `.git` evidence only from public artifact scan, not from credential hygiene review; findings reported without values | Task-end secret review; dependency changes + final build scan; implementer/security reviewer |
| Q6 — Hybrid evidence must be genuine | At least **1 successful real local request on localhost and 1 on hosted HTTPS**, with authoritative exact Nano 4 compatibility evidence, plus **1 separately consented real cloud comparison** using Firebase AI Logic; **0 mocks** counted toward this threshold; App Check enforced on live AI Logic, and Firestore before public release | AC13 manual protocol in `docs/verification.md`: device/OS/browser/SDK, local source + model provenance, enablement/download state, cloud model/source, sanitized request/preview comparison and attestation enforcement evidence. Mocks only cover reproducible failure branches | Before hybrid/eligibility claim and delivery; device-test implementer + master eligibility owner |

## Guard the bar

**Product-scope decision — November 23, 2026:** AC15/G5 no longer require
representative-coordinator recruitment, sessions or timing research before delivery.
Proceed with usefulness explicitly **UNVALIDATED** and no validated usefulness,
comparative-improvement or impact claims. Q3 still requires an explicit product
decision and review of public/demo/submission wording; this is not a research pass.
AC01–AC14 and Q1–Q6 technical evidence/thresholds remain unchanged, including actual
reader status/error speech, hardware, privacy, authorization and genuine runtime.
In-product human review/consent/confirmation remain mandatory.

No lowering thresholds, narrowing fixtures to dodge a failure, silently excluding routes/cases, accepting test skips, adding `@ts-ignore`/`eslint-disable`/coverage ignores, or weakening Rules to make checks green. No exceptions are granted here. A blocker returns to master; a user-approved scope change requires explicit spec/plan/budget review, **not** waiver of privacy, authorization, accessibility, critical evidence or secret hygiene. Cut extras instead.

Rules, runtime boundary validation, error handling that prevents data loss, and human confirmation are mandatory even when a particular bad input is not in the current fixture. Under Q3/AC02, all text caps use the spec's **UTF-8 byte** contract, with unchanged numeric maxima; **zero client/Rules verdict discrepancies** are allowed for ASCII, supplementary, combining, precomposed and mixed boundary fixtures. Verify through `npm run test:unit -- tests/validation.test.ts` and `npm run test:rules -- tests/rules/permissions.test.ts`, including exact accepted read-back and no implicit normalization. Rules `toUtf8().size()` is the documented byte measure; Rules `String.size()` is not assumed equivalent to JavaScript `.length` (official String/Bytes sources are cited in the spec). This refines existing boundary checks, not a seventh threshold or a passing result. Red checks and unavailable hardware/tooling stay visible as no-go/pending. App Check and spending alerts do not establish a hard budget cap; G3 still needs a project-administrator-approved budget/quota/access plan.

## Measured results

**Hardware clarification — November 20, 2026 (user decision):** a physical Android
phone is required for release touch-workflow evidence. The existing Android OS
emulator results remain useful but do not satisfy that hardware condition.
Responsive Android web remains the product scope; no native app or on-device
Android AI claim is introduced. Full touch-workflow and accessibility obligations
remain unchanged; no threshold is waived.

Gate A passed with real rendered diagrams. At committed checkpoint6cbfded72d2b027b8e17845ca92b4af72d629c47 master regenerated evidence after commit:ok=true,dirty=false,SHA matches,14 implemented checks pass. Automated totals:91unit tests (including17AI-output and20reconciliation tests),31Rules emulator tests,20E2E tests,37tool tests; targetedAI/reconciliation commands rerun subsets, not additional unique tests. Typecheck/lint/build,realGitleaks source+dist scan,production dependency audit and2diagrams passed. No threshold above was lowered or waived.

| Contract | Current evidence and remaining limit |
|---|---|
| Q1 | Emulator E2E sentinel/consent/late-result checks pass. Real local-only inference was exercised in isolatedChrome; final live/hosted request-body/privacy repeat still required. |
| Q2 |31Rules cases and real emulator races/idempotence checks pass. Production Rules access-budget caching and live denied-access checks remain unverified. |
| Q3 | Implemented-code automated checks pass at named checkpoint; full AC01–AC14 delivery evidence is incomplete. No product-completion claim. |
| Q4 | Automated axe serious/critical,keyboard and320px layout checks pass. Manual screen-reader,200%zoom and physicalAndroid touch evidence remain open. |
| Q5 | Verified pinnedGitleaks8.30.1 reports no source/build leaks and npm productionaudit reports0vulnerabilities after scopedgRPC fix. Finalpublicartifact review and independentreview closure remain open. Private devconfiguration is stored outside repository, never excluded through a scan allowlist. |
| Q6 | One genuine FirebaseAI Logic ONLY_ON_DEVICE localhost generation reported with sourceon_device. No genuine cloud or intended-hosted-origin completion yet; downloaded component namednano_v3_gpu_component, so exactNano4 compatibility remains unproven. |

Current source may be ahead of that checkpoint during live integration; re-run and inspect evidence before any new gate claim. Product usefulness/user timing claims require actual external evidence if made; the November 23 decision omits that research and forbids validated-impact claims rather than requiring participant sessions for delivery. Final accessibility/model claims still require actual evidence, not mocks or permission alone.
