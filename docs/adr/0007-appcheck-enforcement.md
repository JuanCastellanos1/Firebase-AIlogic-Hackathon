# ADR 0007 — Debug-token rotation and real App Check enforcement for Firebase AI Logic

Date: November 17, 2026. Status: **Rotation complete; App Check enforcement was absent at the policy level and is now ENFORCED and proven by probe. Release is not claimed.**

Scope: security remediation for the agent-created App Check debug token and the Firebase AI Logic App Check boundary on `shiftrelay-hybridai-2026`. Only this ADR and the outside-root private configuration changed. No application source, test, package, Rules file, Hosting content or CI file was touched; nothing was deployed, committed or pushed. Billing remained disabled throughout.

Trigger: a live integration run printed the current localhost App Check debug token into a transcript, so that token is treated as exposed. Separately, that run reported an "unattested" request returning 200, which needed an explanation before any enforcement or release claim.

## 1. Debug-token rotation

| Step | Observed result |
|---|---|
| Tokens before rotation | exactly 1, display name `ShiftRelay local debug (localhost only)` |
| Revoke | `DELETE` of that token resource returned `200` |
| Replacement | one new token registered with the same display name, `200` |
| Old token after revoke | exchange `403`, code `PERMISSION_DENIED`, reason "App attestation failed." |
| Replacement token | exchange `200`, `ttl: 3600s`, signed token held in memory only |
| Token list after rotation | exactly 1 token, same display name, different resource id |
| Private config | one line replaced, old value absent, line count unchanged, 1445 bytes, original bytes otherwise identical |
| ACLs | file and refreshed backup restricted to the current Windows account (`icacls /inheritance:r`) |

Two intermediate attempts are worth recording because they are easy traps: the admin host with OAuth and a camelCase body returns `401 UNAUTHENTICATED`, and the Firebase App Check exchange endpoint is a client endpoint. The working shape, taken from the installed SDK and the REST reference, is `POST https://content-firebaseappcheck.googleapis.com/v1/projects/<project>/apps/<app>:exchangeDebugToken?key=<API key>` with `{"debug_token": "<token>"}`. Because the public browser key now has HTTP-referrer restrictions, the same exchange without a browser-like `Referer` returns `403 PERMISSION_DENIED` ("Permission denied on the service"). Any future script must send a matching referrer or run in the page origin.

The old token was revoked before a working client-shape exchange was captured, so the pre-revocation 200 was not recorded; what is proven is the security-relevant direction: the value that was in the private file is no longer accepted (`403`, "App attestation failed."), the replacement is accepted (`200`), and the token list contains exactly the replacement. The private file's token had come from the single registered token, so no other candidate existed.

No other token was revoked, no unrelated resource was deleted, the QA passwords were not rotated (no evidence of exposure), and the Google-managed Gemini key was not read or modified.

**Cached-token limit.** A revoked debug token can no longer be exchanged, but an App Check token already issued from it stays valid until it expires. This project's App Check token TTL is `3600s`, so treat one hour as the worst-case residual window for the exposed value; after that it cannot produce new tokens.

## 2. Real enforcement state and fix

The App Check service configuration for Firebase AI Logic is the documented Service resource with service id `firebaseml.googleapis.com` (the CLI maps the `ailogic` alias to that id; `firebasevertexai.googleapis.com` is rejected as "Service not supported"). Queried through the App Check v1 API:

| Moment | `enforcementMode` | `updateTime` |
|---|---|---|
| Before | **unset (null)** | `1970-01-01T00:00:00Z` (never configured) |
| After explicit update | **ENFORCED** | `2026-11-17T21:06:14.509967Z` |

So the provider registration from the previous task was only a provider; there was no enforcement policy at all. That is sufficient to explain a 200 for a request without a valid App Check token. The update used `PATCH https://firebaseappcheck.googleapis.com/v1/projects/<project-number>/services/firebaseml.googleapis.com?updateMask=enforcementMode` with `enforcementMode: ENFORCED`. It is free, required no billing change, did not touch the reCAPTCHA threshold, did not add `localhost` to the reCAPTCHA key, and did not disable attestation.

Official documentation states enforcement can take **up to 15 minutes** to take effect (<https://firebase.google.com/docs/app-check/enable-enforcement>). The first probes after the update still returned 200, consistent with propagation rather than with a policy error; the boundary was re-probed after 17 minutes.

## 3. Controlled boundary probe (through the Firebase AI Logic proxy)

Minimal synthetic payload (`"Reply with the single word OK."`, `maxOutputTokens: 8`), model `gemini-3.5-flash-lite`, no PII, no response text captured. Only status, header presence, error code, model version and text length were recorded.

| Probe | App Check header | HTTP | Result |
|---|---|---|---|
| Valid replacement token | present | **200** | model `gemini-3.5-flash-lite`, `finishReason: STOP` |
| Header absent entirely | absent | **401** | `UNAUTHENTICATED`, "Firebase App Check token is invalid." |
| Garbage token | present, invalid | **401** | same code and reason |
| SDK-like client headers, no token | absent | **401** | same code and reason |

The signed App Check token was exchanged immediately before the valid call and was never printed, logged or persisted.

**Diagnosis of the earlier `unattested` 200.** Two independent causes were possible and both are now accounted for: (a) the service policy had never been set, and (b) the previous harness called a button on a page where the Firebase App Check SDK was already initialized, and the AI SDK attaches `X-Firebase-AppCheck` to every request with a cached token (TTL one hour), so "no header" was not actually achieved. The current probe bypasses the SDK and controls the header explicitly, which is why it can prove absence. The previous evidence did show two App Check exchanges in the same run, consistent with normal SDK token acquisition rather than a header-less call.

## 4. Verification bookkeeping

- Billing: `billingEnabled: false` with no billing account before and after the rotation and the enforcement change.
- Private config still contains only the known names; the debug-token value changed and nothing else did. Backup refreshed from the verified current file so no stale (now revoked) token copy remains.
- Whole-tree pinned scanner after these changes: no leaks; no allowlist, exclusion or scanner parameter was added.
- No `.env` file exists in the repository; `.gitignore` still covers `.env.*`.

## 5. What this does not establish

- It does not prove in-app consent or UI behaviour; it is a boundary test through the same proxy the app uses.
- It does not replace the deployed-app validation: the hosted build must initialize App Check with the reCAPTCHA Enterprise key before any AI Logic call, and the local dev runner must keep using the rotated debug token. Clients that send no token will now fail by design.
- Enforcement propagation can still be in flight on other surfaces; re-verify before the release gate rather than assuming this timestamp is universal.
- Exact Gemini Nano 4 identity remains a separate, unresolved item and is unaffected by this work.
