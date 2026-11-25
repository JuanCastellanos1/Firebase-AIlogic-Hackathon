# Project Instructions

## Language — English only

Write all conversations, project documentation, code comments, identifiers, UI copy, tests, and submission materials in English. Preserve proper names and source URLs accurately.

## Product direction

Build ShiftRelay for the Firebase #BuildHybridAI 2026 hackathon: private shift notes become reviewed shared tasks with accepted ownership and recorded resolution. Read `docs/adr/0001-shiftrelay-stack.md` before stack-specific work for the web-first stack, Android boundaries, and official Firebase skills. Manual handovers, local drafting and consented reconciliation are implemented; live integration and release validation are in progress. Never equate mocked cloud results or generic local-model availability with verified hybrid/Nano 4 compliance.

## Current environment

PowerShell on Windows. Use `py -3` for Python. Pinned local dependencies, pure domain modules, Firestore Rules and an emulator-tested persistence adapter exist. Read `package.json` for current commands and `docs/verification.md` for evidence and unimplemented checks.

## Context

- Before ideation, read `summary.md` and `docs/_project.md` for requirements and constraints.
- Before resuming work, read `docs/HANDOFF.md` for the exact next step.
- Preserve the existing summary; check the official rules when a requirement is ambiguous.

## Boundaries

Use synthetic demonstration data. Keep credentials and personal data out of source and submission materials. Spending is free-tier-only: never enable billing or paid resources. Responsive Android web is approved; native Android/local-model support are not assumed. Implementation/tooling/reviewed Firebase skills and delegated feature pushes are approved; master never pushes. User specifically approved authenticated QA deployment after code review/automated checks, final reviewed Hosting/Rules release and PR merge after gates/CI. See `docs/_project.md` for scope. No legal-term acceptance, visibility changes, cloud deletion, YouTube publication or hackathon submission without specific approval. Use the safe emulator wrapper; raw Firebase CLI child environments can leak host credentials into debug logs.

## Authenticated browser evidence

Before collecting authenticated traffic, prove metadata-only projection with a synthetic credential-shaped fixture: emitted output must exclude fixture values, request/response bodies, headers and URL queries. Project in-process before tool output to method, status, hostname/path and sentinel-match booleans only. Raw request JSON, console dumps and HAR can expose passwords/tokens even when credential entry used safe stdin; never return or persist them. On exposure, stop QA and use the retained exact-account containment permission; deleting a local log does not erase tool transcripts.
