# Project Instructions

## Language — English only

Write all conversations, project documentation, code comments, identifiers, UI copy, tests, and submission materials in English. Preserve proper names and source URLs accurately.

## Product direction

Build ShiftRelay for the Firebase #BuildHybridAI 2026 hackathon: private shift notes become reviewed shared tasks with accepted ownership and recorded resolution. The user selected this concept. Read `docs/adr/0001-shiftrelay-stack.md` before stack-specific work; it defines the web-first stack, Android boundaries, and official Firebase agent-skills adoption plan. Implementation has not started.

## Current environment

PowerShell on Windows. Use `py -3` for Python. Pinned local dependencies, pure domain modules, Firestore Rules and an emulator-tested persistence adapter exist. Read `package.json` for current commands and `docs/verification.md` for evidence and unimplemented checks.

## Context

- Before ideation, read `summary.md` and `docs/_project.md` for requirements and constraints.
- Before resuming work, read `docs/HANDOFF.md` for the exact next step.
- Preserve the existing summary; check the official rules when a requirement is ambiguous.

## Boundaries

Use synthetic demonstration data. Keep credentials and personal data out of source and submission materials. Spending is free-tier-only: never enable billing or paid resources. Responsive Android web is approved; native Android/local-model support are not assumed. Local implementation/tooling and reviewed Firebase skills are approved; delegate authorized feature-branch pushes, never push as master. Obtain action-specific confirmation before public deployment, merge, visibility changes, submission or cloud-resource deletion.
