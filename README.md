# ShiftRelay

Private shift notes become reviewed shared tasks with server-confirmed ownership, recorded
resolution and explicit reopening. A private note is drafted locally on the device, a human
reviews each card, and only the approved fields are shared. Ownership, resolution and reopening
are human actions enforced by Firestore Rules, and an optional cloud comparison runs only after a
separate, explicit consent.

Three features are implemented: a manual handover workflow, strictly-local private drafting
through Firebase AI Logic `ONLY_ON_DEVICE`, and separately consented cloud reconciliation. The
local model is **not** available on every machine, and no local-to-cloud fallback exists; when it
is unavailable the manual workflow stays fully usable.

## Runtime modes (exactly three, fail-closed)

| Mode | Where | Configuration |
|---|---|---|
| `emulator` (default on a local host) | `127.0.0.1` / `localhost` | `demo-shiftrelay` Auth (9099) and Firestore (8080) emulators; no App Check |
| `live-local` | a local host plus the dev runner | real project from the outside-root private file; registered localhost App Check debug token |
| `hostedQA` | `shiftrelay-hybridai-2026.web.app` or `.firebaseapp.com` only | public config read at runtime from `/__/firebase/init.json`; reCAPTCHA Enterprise site key from the build |

Any other origin, project, app or incomplete value renders a closed message naming the error code
and makes no cloud request. Auth persists only in memory and Firestore uses a memory cache in every
mode, so no credential or private draft survives a reload, sign-out or member revocation.

## What works

- Real email/password sign-in (emulators locally, the live project in the live modes).
- A private, memory-only shift note and up to five reviewed cards. Local drafting is an explicit
  action, reports `unsupported`/`downloadable`/`downloading`/`ready`/`error`, and discards late or
  stale results.
- Explicit review, then one atomic publication of 1–5 open tasks with stable IDs. A transaction,
  not a write batch: an offline attempt is unconfirmed and is not queued for silent replay.
- Incoming membership accepts open work, resolves it with a recorded resolution, and reopens it
  with a reason. Every change is versioned with exactly one activity.
- Role comes from the venue membership document. The UI has no role toggle.
- Optional cloud reconciliation: an exact bounded preview, a distinct consent click, one in-flight
  request, validated duplicate/contradiction suggestions, and a human confirm (one observation
  activity) or dismiss (no write). No merged records, no owner changes, no automatic retry.
- Responsive semantic UI, keyboard operation at 320 CSS px, and automated axe serious/critical
  checks.

## Requirements

- Node.js 22.13 or newer, npm 11.
- Java 21 for the Firestore emulator.
- Python 3.13 (`py -3` on Windows) for the repository tooling and verifier.
- Chromium installed once: `npx playwright install chromium`.

Exact pins live in `package.json` and `package-lock.json`.

## Setup

```powershell
npm install
npx playwright install chromium
```

Start the local emulators in one terminal, seed two synthetic accounts, then start the UI:

```powershell
npm run emulators
npm run seed:emulator    # prints the generated passwords once; they are never stored
npm run dev              # http://127.0.0.1:5173
```

The project is always `demo-shiftrelay` on `127.0.0.1`. `firebase` refuses non-emulated services
for a `demo-` project, and `src/runtimeConfig.ts` refuses a non-demo project, non-local host or
non-local page origin.

Use the outgoing account to draft, review and share; use the incoming account in a separate
browser profile to accept, resolve and reopen.

## QA release preparation (local; nothing is deployed by these commands)

```powershell
npm run build:qa        # hosted build with only the public reCAPTCHA site key
npm run release:stage   # sealed copy of dist + reviewed Rules/indexes/config
```

`build:qa` reads the public reCAPTCHA Enterprise site key from the outside-root private file in
memory, rebuilds the child environment from a Windows/runtime allowlist plus that one name, builds,
and then runs the dist guard, the pinned Gitleaks scanner and the production dependency audit. The
Firebase API key, the App Check debug token and the QA passwords are never part of a build. The
one scanned finding is the public site key the build itself inserts; it is reported and classified
by the release helper, never suppressed: no ignore file, no project allowlist, no weaker
redaction, and any other finding fails the build.

`release:stage` copies only the built public assets plus `firestore.rules`,
`firestore.indexes.json` and `firebase.json` into a temporary directory outside the repository. It
refuses unless the verifier evidence describes HEAD with `ok=true`, `dirty=false` and a stable
tree, the working tree is clean, and the project is `shiftrelay-hybridai-2026`. It prints the exact
`firebase deploy` commands; it does not run them and never puts a credential on argv.

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

`test:rules` starts only the Firestore emulator. `test:e2e` starts Auth and Firestore through
`scripts/firebase_safe.py` (minimal child environment), clears them, starts Vite through
Playwright, and runs the browser suites. Playwright artifacts go to `.git/opencode/playwright/`
only.

## Privacy and credentials

- Private note text lives only in page memory. It is sent to the on-device model only after the
  explicit action, and to the cloud only after the separate consent shows the exact reviewed
  packet. No payload telemetry, no analytics, no automatic fallback.
- Synthetic demonstration data only. No real names, addresses, phone numbers or personal data in
  source, builds, evidence or video.
- The Firebase web API key and the reCAPTCHA Enterprise site key are public identifiers; the key
  is restricted to Firebase APIs and the approved origins. The App Check debug token and the
  synthetic QA passwords are secrets and live only in an outside-root file restricted to the
  current Windows account. They never enter the repository, a build, argv, logs or evidence.
- The two synthetic judge identities are delivered only through a private channel the user
  approves (for example the organizer's form or a direct message). They are not in the README,
  the repository or the video, and are rotated after judging.

## Boundaries and honest limits

- One demonstration venue (`venue-hall-01`); no multi-venue, roster, chat or notification work.
- No billing, paid plan or paid API. Free-tier quota is a real limit; a quota error is shown as an
  error state, not hidden.
- Verified locally: the three modes, the emulator suites, one genuine `ONLY_ON_DEVICE` generation
  on Chrome 157 (v4 component `gemma4_component` 2026.8.7.929, model `gemma4-2b-it`, sponsor-
  documented flag path), one genuine consented `ONLY_IN_CLOUD` request from localhost, and App
  Check enforcement through the AI Logic proxy (valid token 200; missing and garbage token 401).
- Not verified: a hosted HTTPS on-device request, the hosted build's empirical `/__/firebase/init.json`
  behaviour, a hosted reCAPTCHA-Enterprise-attested request, real Android Chrome touch,
  screen-reader and 200%-zoom walkthroughs. Automated axe
  checks are not a WCAG certification.
- Product usefulness is **unvalidated**. Coordinator/user research is not a delivery
  prerequisite; no validated usefulness, timing, comparative-improvement or impact claim is made
  (November 23, 2026 scope decision, `docs/spec.md` AC15/G5).
- The Firestore emulator does not prove production Rules call-budget caching; the five-card
  publication remains a documented risk in `docs/ARCHITECTURE.md`.

## Documentation

- `docs/spec.md` — product workflow and acceptance criteria.
- `docs/ARCHITECTURE.md` — boundaries, sequence, Rules budget and residual risks.
- `docs/INTERFACES.md` — frozen domain contract and adapter semantics.
- `docs/PLAN.md` — slices and current implementation status.
- `docs/PUBLISH.md` — QA release, rollback, demo script, submission draft and limits.
- `docs/verification.md` — real commands, outputs, limitations and evidence paths.
- `docs/adr/` — stack, on-device feasibility, cloud setup, App Check, Nano 4 proof and Android QA.
- `CONSTRAINTS.md` — blocking quality thresholds.

## License

Apache License 2.0. See `LICENSE`.
