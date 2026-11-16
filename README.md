# ShiftRelay

Private shift notes become reviewed shared tasks with server-confirmed ownership, recorded
resolution and explicit reopening. This repository is the **manual, emulator-only slice 1**:
there is no AI call, cloud deployment or public signup.

## What works

- Real email/password sign-in against the local Firebase Auth emulator.
- A private, memory-only shift note and up to five manually written cards.
- Explicit review, then one atomic publication of 1–5 open tasks with stable IDs.
- A transaction, not a write batch: an offline attempt is unconfirmed and is not queued for
  silent replay. Recovery is an explicit server read-back or retry with the same IDs.
- Incoming membership accepts open work, resolves it with a recorded resolution, and reopens
  it with a reason. Every change is versioned with exactly one activity.
- Role comes from the venue membership document. The UI has no role toggle.
- Sign-out and member revocation clear private and shared page state; late results are ignored.
- Responsive semantic UI, keyboard operation at 320 CSS px, and automated axe serious/critical
  checks.

## Requirements

- Node.js 22.13 or newer, npm 11.
- Java 21 for the Firestore emulator.
- Python 3 (`py -3` on Windows) for the repository tooling tests and verifier.
- Chromium installed once: `npx playwright install chromium`.

Exact pins live in `package.json` and `package-lock.json`. TypeScript is pinned to `6.0.3`
because `typescript-eslint` 8.72.2 does not support the TypeScript 7 API; typechecking and
linting run with the same compiler. React 19.3.1, Vite 8.3.8, Playwright 1.65.1, axe-core
4.14.0 and ESLint 10.15.0 are pinned.

## Setup

```powershell
npm install
npx playwright install chromium
```

Start the local emulators in one terminal:

```powershell
npm run emulators
```

The project is always `demo-shiftrelay` on `127.0.0.1`: Auth on 9099 and Firestore on 8080.
`firebase` refuses non-emulated services for a `demo-` project, and `src/firebase.ts` refuses a
non-demo project, non-local host or non-local page origin.

Seed two synthetic accounts (passwords are generated at runtime and printed once; they are not
stored in source, build or documentation):

```powershell
npm run seed:emulator
```

Start the UI in another terminal:

```powershell
npm run dev
```

Open <http://127.0.0.1:5173>, sign in with one of the printed accounts, and use the outgoing
account to draft/review/share. Use the incoming account in a separate browser profile or window
to accept, resolve and reopen.

## Tests and checks

```powershell
npm run typecheck
npm run lint
npm run build
npm run test:unit
npm run test:rules
npm run test:e2e
npm run test:tools
py -3 scripts/verificar.py --report .git/opencode/evidence.json
```

`test:rules` starts only the Firestore emulator. `test:e2e` starts Auth and Firestore, clears
them, starts Vite through Playwright, and runs seven browser tests. Playwright artifacts go to
`.git/opencode/playwright/` only.

## Boundaries and limitations

- One demonstration venue (`venue-hall-01`); no multi-venue, roster, chat or notification work.
- Synthetic data only. No real credentials, personal data, billing or paid resources.
- Manual workflow only: no local model, cloud model, AI Logic, App Check or reconciliation UI.
- No Hosting configuration, deployment, App Check enforcement or live Firebase project.
- Auth persistence is in-memory; Firestore uses a memory cache. The browser may create the
  Firebase heartbeat metadata database, which contains no private text.
- Automated axe checks are not a WCAG certification. Screen-reader, 200% zoom and actual
  Android Chrome touch checks remain manual and unmeasured.
- The Firestore emulator does not prove production Rules call-budget caching; five-card
  publication remains a documented risk in `docs/ARCHITECTURE.md`.
- Q5 requires an authorized pinned credential scanner; none is installed, so Q5 is unmeasured.

## Documentation

- `docs/spec.md` — product workflow and acceptance criteria.
- `docs/ARCHITECTURE.md` — boundaries, sequence, Rules budget and residual risks.
- `docs/INTERFACES.md` — frozen domain contract and adapter semantics.
- `docs/PLAN.md` — three slices and current implementation status.
- `docs/verification.md` — real commands, outputs, limitations and evidence paths.
- `CONSTRAINTS.md` — blocking quality thresholds.

## License

Apache License 2.0. See `LICENSE`.
