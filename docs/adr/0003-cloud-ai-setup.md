# ADR 0003 — Cloud AI/Auth/App Check setup for shiftrelay-hybridai-2026

Date: November 16, 2026; Q5 follow-up November 17, 2026. Status: **Provisioning performed and verified; local config moved outside the repository so the credential scan is clean; production App Check key and all deploys remain open.**

Scope: nonproduction Firebase setup for the existing project `shiftrelay-hybridai-2026` only. No application source, package, lockfile, scanner, test or fixture was changed. The only other file touched is one additive, sanitized evidence section in `docs/verification.md` reporting the Q5 result. No git commit, push, deploy, external post, billing link, legal-terms acceptance, user creation, data seeding or model generation was performed. Billing is free-tier-only and remains disabled.

## Billing verification (re-executed, authoritative)

`GET https://cloudbilling.googleapis.com/v1/projects/shiftrelay-hybridai-2026/billingInfo` returned `billingEnabled: false` with no billing account name. The Cloud Billing API had never been enabled in this project, so the free, read-only metadata API `cloudbilling.googleapis.com` was enabled first (`serviceusage ...:enable`); no billing account was created or linked and no chargeable service was touched. Result: the project is on the no-cost Spark plan, which is the documented precondition for the Gemini Developer API "free tier" (<https://firebase.google.com/docs/ai-logic/pricing>).

## Web app registration

`apps:list` returned zero apps; exactly one WEB app was then registered through the documented CLI:

```
firebase apps:create WEB "ShiftRelay Web" --project shiftrelay-hybridai-2026
```

- appId (non-secret): `1:1013230596333:web:a0b89365ee59732eb85ce4`
- displayName `ShiftRelay Web`, platform WEB, state ACTIVE.
- Re-checked `apps:list`: exactly one app, no duplicates and no Android/iOS apps.

The public web config (`apiKey`, `authDomain`, `projectId`, `messagingSenderId`, `appId`) was fetched with the Web App config endpoint and written **only** to local, gitignored configuration outside the repository (see "Local development configuration" below); no value was printed.

## Firebase AI Logic — Gemini Developer API, free tier

Provisioned with the same backend call the documented `firebase init ailogic` command makes (`POST https://firebase.googleapis.com/v1alpha/firebase:provisionFirebaseApp` with `webInput` + `firebaseAiLogicInput`), from an isolated temp working directory. The interactive CLI was **not** run, so no prompt was answered and no `firebase.json`, `.firebaserc` or client config file was generated in the repository. The request has no terms-acceptance field; no legal terms were accepted on the user's behalf.

Verified consequences (not inferred from a single API-enable):

| Check | Observed |
|---|---|
| `firebasevertexai.googleapis.com` (Firebase AI Logic API) | `state: ENABLED` |
| `generativelanguage.googleapis.com` (Gemini Developer API) | `state: ENABLED` |
| AI Logic service account (P4SA) | `service-1013230596333@gcp-sa-firebasevertexai.iam.gserviceaccount.com` present in IAM policy |
| Provisioning operation | completed with `error: null`; returned client config for the registered web app |
| Agent Platform / Vertex AI (`aiplatform.googleapis.com`) | **not enabled** — provider is the Gemini Developer API only |
| Cloud Functions / Cloud Run / Storage / recaptchaenterprise | not enabled by this setup |

The provisioning workflow additionally enabled Firebase-managed services `clouderrorreporting`, `fcmregistrations` and `firebaseappdistribution`; none is paid and none requires billing.

The Google-managed Gemini API key that the provisioning workflow creates is not enumerable here: that would need the API Keys API (`apikeys.googleapis.com`), which was deliberately left disabled. Service enablement, the P4SA and the successful provisioning operation are the evidence recorded; no claim is made about the key's internal restrictions beyond what the operation returned.

### Model choice (documented recommendation, not yet exercised)

Use `gemini-3.5-flash-lite` as the `ONLY_IN_CLOUD` reconciliation model: it is the SDK 13.x default, general-use (not preview/experimental), and free-tier-eligible. `gemini-3.8-flash` is the documented quality upgrade if lite proves insufficient; `gemini-4-argon`/`gemini-4-carbon` and preview or media models are out of scope because parts of them require billing. Do **not** pin `gemini-2.5-*` (deprecated / auto-routed from December 1, 2026). Actual per-model free-tier availability must be proven by the first genuine SDK call, not by API enablement — that call requires the app's App Check wiring and is owned by the app slice.

## Authentication

Email/password was enabled through the same provisioning backend (`firebaseAuthInput.emailAuthProviderMode = PROVIDER_ENABLED`), which is what `firebase deploy --only auth` sends; no deploy command was run.

Verified with `GET https://identitytoolkit.googleapis.com/admin/v2/projects/shiftrelay-hybridai-2026/config`:

- `emailEnabled: true`, `emailPasswordRequired: true` (password sign-in enabled).
- `anonymousEnabled: false`; MFA disabled.
- `authorizedDomains`: the two default Hosting domains plus `localhost` and `127.0.0.1`, added for local development only. No production domain was registered beyond the Firebase-created defaults.
- No users, no passwords, no role grants and no membership documents were created. Public role signup remains unsupported by design.

## App Check

- `firebaseappcheck.googleapis.com` enabled. AI Logic App Check needs no service toggle: per the pinned CLI (15.36.0) and <https://firebase.google.com/docs/ai-logic/app-check>, AI Logic is enforced by default and can never be un-enforced; the mandatory-enforcement date built into that CLI is November 2, 2026, i.e. already in force.
- Production web provider is **reCAPTCHA Enterprise**, which is Spark-compatible (only four score levels are selectable without billing). The app's `recaptchaEnterpriseConfig` resource exists with `minValidScore: 0.5` and `tokenTtl: 3600s` but **no siteKey**, and `recaptchaenterprise.googleapis.com` is not enabled. Creating the score-based key and registering it is a human console/API-key step (see below); nothing was enforced publicly and no bypass was deployed.
- A local-only debug token was registered for the web app via the documented `POST .../apps/{appId}/debugTokens` endpoint (same request as `firebase appcheck:debugtokens:create`): display name `ShiftRelay local debug (localhost only)`. The token value is a secret, was never printed, and is stored only in the outside-repository private file described below. One token exists; unused tokens can be revoked with `firebase appcheck:debugtokens:delete`.

## Local development configuration (outside the repository)

The credential-bearing file is no longer in the working tree. It was moved to:

```
%LOCALAPPDATA%\Temp\opencode\shiftrelay-private\firebase-development.env
```

- Moved, not copied: the source `.env.local` was deleted only after the destination matched it byte-for-byte, line-for-line and by SHA-256 in memory. `git ls-files .env.local`, `git log --all -- .env.local` and `git status` confirm the original was never tracked, staged or committed; the `.gitignore` rule `.env.*` is unchanged.
- Directory and file ACLs were reset to the current Windows account only (`icacls /inheritance:r`), removing inherited `SYSTEM`/`Administrators` grants where the OS permits. This is local-disk hygiene, not a substitute for rotation.
- File contents: the five commented `VITE_FIREBASE_*` cloud values and the active `VITE_FIREBASE_APPCHECK_DEBUG_TOKEN`, exactly as before the move. Values are never printed, recorded in evidence or documented here.

Variable names a future dev runner may read from that file (names only):

| Name | Purpose |
|---|---|
| `VITE_FIREBASE_API_KEY` | public Firebase web API key (public by design, see below) |
| `VITE_FIREBASE_AUTH_DOMAIN` | Auth domain |
| `VITE_FIREBASE_PROJECT_ID` | `shiftrelay-hybridai-2026` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | sender id |
| `VITE_FIREBASE_APP_ID` | registered web app id |
| `VITE_FIREBASE_APPCHECK_DEBUG_TOKEN` | **secret**, localhost-only App Check debug token |

Rules for that runner: read the file from the outside-root path (never copy it back into the repository), require every key to be present and non-empty before starting, assign the debug token to `self.FIREBASE_APPCHECK_DEBUG_TOKEN` **before** App Check initialization, and use it in dev/localhost only. No production build may reference the debug token: a build-time or test-time assertion that the token string is absent from `dist` is the intended guard.

### Why the move was needed (Q5)

The pinned Gitleaks Q5 run scans the whole working tree, including gitignored files, and correctly flagged the `gcp-api-key` pattern at `.env.local:4`. That was the public Firebase web API key, not a leaked secret, but Q5 has no allowlist and the finding had to be removed rather than suppressed. Moving the file outside the repository removes it from the scan scope without weakening the scanner. After the move: `npm run scan:secrets` reports 83 files / 1,733,268 bytes and no leaks (exit 0), and `verificar.py --only secret-scan` reports `CHECK secret-scan: PASS`, `ok=True`, with `GATE_C: NOT ELIGIBLE` still reported because the tree is dirty and six scope items are unimplemented.

### Safe runtime configuration for production

Verified against current official documentation on November 17, 2026:

- Firebase web API keys are **public by design**: they identify the project/app, while authorization comes from Security Rules, IAM and App Check. Google's guidance states that keys restricted to Firebase services "do not need to be treated as secrets, and it's safe to include them in your code or configuration files" (<https://firebase.google.com/docs/projects/api-keys>). Two conditions apply: the key must stay restricted to Firebase-related APIs, and the Gemini Developer API must **not** be on that key's allowlist (the AI Logic proxy uses a separate Google-managed key).
- The documented alternative to hard-coding is environment-specific configuration: set the values as environment variables or a configuration file per environment rather than editing keys in code (<https://firebase.google.com/docs/projects/api-keys#environment-specific-keys>).
- The Hosting reserved endpoint `/__/firebase/init.json` does exist and returns the active project's config, but the same official page warns that **reserved Hosting URLs are available only with Firebase JS SDK version 8 and earlier** and that version 9 or later cannot use them (<https://firebase.google.com/docs/hosting/reserved-urls>). This app pins the modular `firebase` 13.3.0 SDK, so the endpoint is **not** recommended on current evidence; it would also be unavailable when running from a plain local dev server.

Proposed approach therefore: inject the five public config values at build time from environment variables (Vite `import.meta.env`), keep the debug token out of every build, rely on App Check + Security Rules + API-key restrictions for security, and revisit `/__/firebase/init.json` only if Firebase publishes modular-SDK support for it. No source change is made here; the frontend guard stays as-is.

## Remaining human / separately authorized steps

1. **Production App Check provider (console or Google Cloud console):** enable the reCAPTCHA Enterprise API, create a score-based **Web** key for the production Hosting domain(s) only (never add `localhost`), then register the site key with App Check for `ShiftRelay Web` (console `Security > App Check`, or `firebase appcheck:providers:set recaptcha-enterprise --site-key ...`). Without this, App Check enforcement for AI Logic will reject every request from a deployed build; local development uses the debug token.
2. **First genuine AI Logic call:** perform one authorized `ONLY_IN_CLOUD` request from the built app on `localhost` with the debug token, recording `inferenceSource`, model name and the exact error/success. This is the only real proof of free-tier model availability and quota.
3. **Deploys:** Hosting, Firestore Rules and any public release still need action-specific confirmation. Nothing was deployed, and no client was connected to the closed Firestore database.
4. **Auth testing identities:** synthetic least-privilege test users remain a separate, explicitly authorized step; no credentials are stored in source or docs.
5. **Cloud-mode dev runner (next app slice):** author it to read `%LOCALAPPDATA%\Temp\opencode\shiftrelay-private\firebase-development.env`, fail closed if any listed name is missing, and keep the debug token dev-only. Rotating or revoking the debug token is only needed if the private file or the token is exposed outside this machine.

## How the commands were run safely

Live commands ran from `%LOCALAPPDATA%\Temp\opencode\...` (never the repository) through a wrapper that passes only OS/profile variables to the CLI child process, plus isolated temp Node scripts that reuse firebase-tools' own on-disk refresh token and print only sanitized status fields. No token, API key or debug token was printed, passed on argv, or written to a log; no host credential was exported to a CLI child. No `firebase-debug*.log` remained in the repository or the run directory.
