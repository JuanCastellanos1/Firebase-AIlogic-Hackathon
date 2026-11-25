# ADR 0004 — Production App Check, public key restrictions and synthetic QA identities

Date: November 17, 2026. Status: **Cloud-side preparation complete and verified. Deployments and application wiring remain out of scope and unexecuted.**

Scope: cloud state for `shiftrelay-hybridai-2026` plus the outside-root private configuration only. No application source, package, lockfile, test, fixture, plan, verification file, Firestore Rules or Hosting content was modified, and nothing was deployed, committed or pushed. The user had explicitly approved this package: live Firebase/reCAPTCHA work, API-key restrictions, synthetic users and memberships, authenticated QA deployment after code review plus automated checks, CI/PR/merge, accessibility tests/local video and one organizer question. Billing, legal-terms acceptance, YouTube upload, hackathon submission, resource deletion and force-push remain unauthorized and were not performed.

## Billing re-verified

`GET https://cloudbilling.googleapis.com/v1/projects/shiftrelay-hybridai-2026/billingInfo` returned `billingEnabled: false` with no billing account, both before and after this work. Enabling the reCAPTCHA Enterprise and API Keys APIs created no billing link and no chargeable resource; reCAPTCHA Enterprise stays on its no-cost quota.

## Production App Check provider (reCAPTCHA Enterprise)

| Item | Verified state |
|---|---|
| `recaptchaenterprise.googleapis.com` | ENABLED |
| reCAPTCHA keys in project | exactly 1 |
| Key display name | `ShiftRelay Web (score, hosting only)` |
| Integration type | `SCORE` (score-based, no checkbox) |
| Allowed domains | exactly `shiftrelay-hybridai-2026.web.app` and `shiftrelay-hybridai-2026.firebaseapp.com` |
| `allowAllDomains` | `false` |
| `localhost` on the key | absent by design |
| App Check provider resource | `projects/<project-number>/apps/<web-app>/recaptchaEnterpriseConfig` |
| Site key registered | yes, matches the created key (read back) |
| Token TTL | `3600s` |
| Risk threshold | `minValidScore: 0.5` (documented default) |

The provider was registered through the documented App Check REST endpoint (`updateMask=siteKey`) for the single registered web app `1:1013230596333:web:a0b89365ee59732eb85ce4`, then read back independently. No enforcement toggle was changed and no bypass was published.

**AI Logic enforcement.** The App Check services list is empty and `firebasevertexai.googleapis.com` is explicitly reported as "Service not supported" for per-service enforcement, matching the pinned CLI note that AI Logic is enforced by default and enforcement is mandatory (the CLI's own date constant is November 2, 2026). There is therefore no enforcement switch to set; a deployed client must send real reCAPTCHA Enterprise tokens, and local work must use the registered debug token.

## Public browser API key restrictions

Identity confirmed without printing the key: API Keys resource id matches the `apiKeyId` of the registered web app, display name `Browser key (auto created by Firebase)`, and it is the only web app in the project. No other app or project uses it.

| Aspect | Before | After |
|---|---|---|
| API targets | 27 Firebase/Google services (including products not used) | 10: `firebase`, `logging`, `firebaseinstallations`, `firebaseappcheck`, `identitytoolkit`, `securetoken`, `firebaserules`, `datastore`, `firestore`, `firebasevertexai` |
| HTTP referrers | none | `https://shiftrelay-hybridai-2026.web.app/*`, `https://shiftrelay-hybridai-2026.firebaseapp.com/*`, `http://localhost/*`, `http://localhost:5173/*`, `http://127.0.0.1/*`, `http://127.0.0.1:5173/*` |
| Server / Android / iOS restrictions | none | unchanged (none) |

`generativelanguage.googleapis.com` is not and was not on this key's allowlist, as Firebase documentation requires for publicly reachable keys. The Google-managed Gemini Developer API key was **not read, modified or rotated**. The update was applied through the documented `keys.patch` call with `updateMask=restrictions` and its long-running operation was polled to completion; the final state above is a readback, not an assumption.

Consequence to keep in mind: requests from an origin not in that referrer list (including a dev server on another port) will now fail until the pattern is added. That is the intended tightening, and only local/QA hosts were allowed.

## Synthetic QA identities and memberships

- Exactly two Firebase Authentication users exist (the project previously had zero), both email/password, `emailVerified: true`, with synthetic `@example.com` addresses; addresses and randomly generated passwords were never printed and are stored only in the outside-root private file.
- No administrator or service-account credential was created; provisioning used the existing operator OAuth session.
- Firestore documents written out of band, intentionally bypassing the still-closed Rules: `venues/venue-hall-01/members/{uid}` for those two UIDs only, each with exactly three fields — `uid` (equal to the document id), `venueId` = `venue-hall-01`, `role` = `outgoing` / `incoming`. This matches `VENUE_ID` in `src/session.ts` and the Rules' membership shape.
- Readback: 2 member documents, 3 fields each, roles `incoming` and `outgoing`, no extra fields, no personal data beyond the synthetic identity.
- Venue collection audit: 0 tasks, 0 handovers, 0 activities. No existing document was read-modified or deleted, no task/seed data was created, and no signup or privilege Rule changed.

## Outside-root private configuration

Single file: `%LOCALAPPDATA%\Temp\opencode\shiftrelay-private\firebase-development.env` (1445 bytes, was 792).

- The pre-change file was copied to `firebase-development.env.bak-20261117` and hash-verified byte-identical before the append; the append preserved the original bytes exactly (prefix equality checked), so all earlier values are intact.
- ACL: directory and both files are restricted to the current Windows account (`icacls /inheritance:r`).
- Staging files used during provisioning (`staging/recaptcha-site-key.txt`, `staging/qa-secrets.json`) and the older stray debug-token copy were deleted after the merge, so exactly one local copy of each value remains.

Variable names now stored there (names only): `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID` (still commented out), `VITE_FIREBASE_APPCHECK_DEBUG_TOKEN`, `VITE_FIREBASE_APPCHECK_SITE_KEY`, `SHIFTRELAY_QA_VENUE_ID`, `SHIFTRELAY_QA_OUTGOING_EMAIL`, `SHIFTRELAY_QA_OUTGOING_PASSWORD`, `SHIFTRELAY_QA_OUTGOING_UID`, `SHIFTRELAY_QA_INCOMING_EMAIL`, `SHIFTRELAY_QA_INCOMING_PASSWORD`, `SHIFTRELAY_QA_INCOMING_UID`.

## Leak and repository checks

- Pinned Gitleaks 8.30.1 over the whole working tree plus the existing `dist` (no rebuild): 86 files, 1,781,446 bytes, **no leaks**, exit 0.
- Exact-value check (private values searched literally across every repository file, including `dist`): 0 occurrences for the API key, debug token, site key and both QA passwords.
- `git check-ignore` still reports `.env.local` under `.gitignore:6:.env.*`; only `.env.example` is tracked; no env file appears in `git status`.

## SDK public configuration approach and missing keys

Deliver the five public values at build time through environment variables and fetch nothing from the network: they are public by design once the key is restricted as above. The App Check **site key** is also public and belongs in the production build; the **debug token** is a secret and must only be assigned to `self.FIREBASE_APPCHECK_DEBUG_TOKEN` in local/dev runs.

- Required for the production build: `apiKey`, `authDomain`, `projectId`, `appId`, `messagingSenderId`, App Check reCAPTCHA site key.
- Not needed / intentionally absent: `storageBucket` and `measurementId` (Storage and Analytics are out of scope). No service-account or Gemini key is needed by the browser; the AI Logic proxy handles that server-side.
- `/__/firebase/init.json` remains **not recommended**: current official docs restrict reserved Hosting URLs to Firebase JS SDK 8 and earlier, and this app uses the modular 13.3.0 SDK.
- Future dev runner: read the private file, fail closed on a missing name, use the debug token on localhost only, and assert at build time that neither the debug token nor any QA password appears in `dist`.

## Explicitly not done

No Rules deploy, no Hosting deploy, no CI change, no commit or push, no organizer message, no video, no submission, no deletion, no billing change, no legal-terms acceptance, no app-source edit, no emulator or product-suite run, and no generation request. Readiness is not claimed: enforcement and the real first App Check-protected AI call still depend on the application slice and on the approved post-review deployment.
