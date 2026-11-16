# ADR 0001 — ShiftRelay web-first stack

Date: November 16, 2026. Status: **Stack/scope approved by user; runtime feasibility pending.**

Scope: stack decision only, not a PRD, implementation plan, scaffold, or Gate A approval. The user selected ShiftRelay; master updated operational state to reflect that choice. Planning skill used: `brainstorming`; interview steps are deferred to master.

## Context and decision

ShiftRelay closes non-emergency community-venue handovers: private notes → editable task drafts → approved shared handover → cloud reconciliation suggestions → human acceptance, ownership, resolution, and reopening. Assume one venue, two authenticated participants/roles, synthetic demonstration data, text-only single-turn inference, and no native delivery commitment. These are conservative scope assumptions, not validated user research.

| Layer | Recommendation and reason |
|---|---|
| Client | **React + TypeScript + Vite**, static SPA. React documents a Vite `react-ts` path; this bounded authenticated workflow has no SSR/SEO requirement to justify a server framework [S1–S3]. Use strict TypeScript and separate type checking: Vite transpilation is not type checking. |
| UI/state | Semantic HTML, minimal ordinary CSS with shared variables, responsive layouts, React component state/hooks. No component framework or global state package until a concrete need appears. |
| Firebase client | **Modular Firebase JavaScript SDK**: `firebase/app`, `firebase/ai`, `firebase/app-check`, `firebase/auth`, `firebase/firestore`. Firebase recommends the modular API for bundler/tree-shaking support [S4]. No compat SDK or separate direct Gemini API client. |
| Inference | **Firebase AI Logic**, initially Gemini Developer API backend, with distinct strictly-local drafting and explicitly-approved cloud reconciliation. Use supported structured output plus independent runtime validation, never trusting TypeScript types or model output alone [S5–S6]. |
| Abuse protection | **App Check**, production web reCAPTCHA Enterprise provider; private debug tokens only for authorized local development/CI. Enforce AI Logic before real calls and Firestore before public release. App Check is not identity, venue permission, or a spending guarantee [S5, S7]. |
| Identity | **Firebase Authentication**. Smallest demo assumption: pre-provisioned email/password test accounts, session-scoped sign-in, no public role-granting signup. Actual production provider and judge access remain approval decisions [S8]. Test identities contain no real personal information. |
| Shared data | **Cloud Firestore Standard edition**, bounded venue/task/handover queries, membership-controlled Security Rules, transactional state changes, and append-only activity records. No private-note collection [S9–S10]. |
| Delivery | **Firebase Hosting**, not App Hosting: serve Vite's static `dist` output over HTTPS, with SPA rewrites if client-side paths are used. Hosting explicitly targets static sites/SPAs [S2, S11]. |
| Tests/tooling | **Vitest** for deterministic domain/validation tests; **Playwright** for end-to-end UI; Firebase Auth/Firestore emulators and `@firebase/rules-unit-testing` for authorization. Firebase CLI is development/deployment tooling, not an application server [S12–S14]. |

Select mutually compatible stable package/tool versions and pin exact direct dependencies plus the npm lockfile **at authorized scaffold time**. Do not treat current documentation minimums as recommended pins or claim an unverified “latest” version. Check Node engines and peer dependencies then. Existing project-state evidence reports Node 24.14.0; it was not re-executed here. Retrieved Vite guidance lists Node 20.19+/22.12+; current Vitest guidance lists Node >=22.12 and Vite >=6.4 [S1, S12]. Emulator Java/runtime prerequisites also need checking before setup.

## Privacy and authority boundaries

1. **Private capture:** keep raw notes and unapproved drafts only in page memory, outside Firestore, localStorage, analytics, crash reports, console output, and request/error logging. Clear on explicit discard/sign-out; closing/reloading can lose them, so warn clearly. This trades draft recovery for a smaller persistence/privacy surface. Do not claim protection against malicious extensions, compromised devices, or all platform metadata.
2. **Local inference:** configure the private drafting model with documented `ONLY_ON_DEVICE`, never `PREFER_ON_DEVICE`. Use a visible user interaction to initialize/download the model before generation. Show unavailable, downloading, failure, and ready states. On failure, retain the manual structured-entry path; do not silently upload or reuse raw notes in a cloud prompt [S5–S6]. Model download/attestation traffic is not the same as uploading note contents; verify the latter separately.
3. **Approval:** construct a new allowlisted task packet, not a serialized editor/session object. Show exactly which draft fields will be shared and which existing shared records will be included. Redaction is editable assistance, not a secrecy guarantee. Sharing/persistence approval and cloud-inference approval are separate actions; changing the packet invalidates its prior approval. Declining cloud preserves manual sharing/ownership workflows.
4. **Cloud reconciliation:** send only the approved packet and authorized, bounded open-task context using a separate `ONLY_IN_CLOUD` model. Return proposed duplicate/contradiction links and an incoming-shift brief, not write commands. Validate schema, field lengths, identifiers, membership, and current record versions. Treat all notes and suggestions as untrusted data; render plain text, never model HTML. Malformed/refused/failed responses leave shared state unchanged.
5. **Human decisions:** only a user confirms merges, acceptance, resolution, or reopening. Model calls and consent prompts stay outside retryable Firestore transaction callbacks. A transaction re-reads task state/version, atomically updates ownership/state and associated activity, and rejects stale/double acceptance. Show a conflict and refresh rather than overwriting. Transactions can retry and fail offline; do not display confirmed acceptance before server acknowledgment [S9]. No offline-ownership promise or persistent Firestore disk cache in the initial scope.
6. **Server-enforced permissions:** Rules deny by default, require authenticated venue membership, and constrain create/update/delete fields, types, sizes, allowed state transitions, actor identity, immutable venue/creator fields, and permitted owner changes. Provision membership out of band through an authorized administrator; clients cannot grant roles or change venue membership. Rules must also require the corresponding activity record atomically (using post-write checks where appropriate), prevent activity edits/deletes, and bind actor/time to authenticated identity/server request time [S9–S10, S14]. An activity feed is not a certified tamper-proof audit trail. Client transactions alone are not authorization.

Browser Firebase configuration is not a place for secrets; every Vite-exposed value is public. Never embed service-account credentials, direct Gemini secrets, demo passwords, or App Check debug tokens in source/build/submission. Authorized judge credentials, if needed, belong in approved private testing instructions, not the public artifact. No prompt/response payload telemetry; assess and avoid optional platform logging that captures content. Approved packets themselves can still disclose information: consent is not automatic anonymization.

## Browser, SDK, model, and Android feasibility

- Firebase's retrieved web guide specifies **Firebase JS SDK >=12.5.0 and desktop Chrome >=139**, Chrome Prompt API, required enablement flags in its localhost instructions, sufficient storage, and user activation for model initialization [S5]. These are documented lower bounds, **not** proof that every such SDK/browser combination supports the current model or hosted deployment.
- Chrome's current Prompt API page separately lists web availability at **Chrome 148** (extensions at 138), while Firebase still lists 139 [S15]. Treat this as a documentation compatibility discrepancy: use a currently supported desktop Chrome and verify the actual SDK/browser/flag or origin-access combination on both localhost and the HTTPS hosted origin before making a claim. Do not resolve the discrepancy by silently promising 139 production support.
- Chrome's retrieved hardware guidance lists Windows 10/11, macOS 13+, Linux, or qualifying Chromebook Plus; >=22 GB free profile-volume space; GPU with **more than 4 GB VRAM**, or CPU with >=16 GB RAM and >=4 cores; and an unmetered connection for initial download. Availability/download status and actual requests must still succeed [S15]. Capture exact device, OS, browser, SDK, enablement, download state, latency, and observed inference source without note contents.
- The web guide supports single-turn text and structured output, with a documented 9,216-token local limit. Keep packets bounded and handle oversized input; no dependency on local chat, tools, PDF/audio/video, or OCR [S5].
- **Exact model remains a blocker:** `summary.md` says the challenge requires **Gemini Nano 4**. “Prompt API available” or response source “on-device” does not establish Nano 4 identity. Master must reconcile official challenge requirements with SDK/browser release documentation and observable device/model evidence. Where identity is not exposed, obtain authoritative compatibility evidence rather than invent a model identifier or assume the browser-selected model is compliant.
- Cloud model choice is also deferred until project access and quality/cost testing. The retrieved configuration page says the default changed to `gemini-3.5-flash-lite` starting in JS SDK 13.0.0 [S6]; therefore do not infer current defaults from the 12.5.0 minimum. Explicitly select and record a supported model at implementation time, check quotas/deprecation through the judging window, and do not pin an old tutorial model.
- **Android now:** responsive, touch/keyboard-accessible mobile web with manual entry and separately consented cloud inference. Chrome's local foundation-model APIs are not documented for Android/iOS browsers [S15].
- **Android later:** a separately scoped native Kotlin/Android client could reuse domain records, transition semantics, Firebase backend and Rules—not the React UI or web inference implementation. Firebase documents Android AI Logic >=17.10.0, BoM >=34.10.0, an additional `firebase-ai-ondevice` integration with minimum API 26, selected devices, and experimental hybrid support using ML Kit's beta Prompt API [S16]. Verify exact model/hardware, permissions, App Check Play Integrity, and privacy independently. **Capacitor or a WebView does not establish local Nano support**; no native build, wrapper, category eligibility, or universal offline claim is approved here.

## Official Firebase agent skills adoption

Inspected `C:/Users/acer/.agents/skills` on November 16: existing general skills include brainstorming, specification, testing, security, and frontend guidance; **no `firebase-*` or Firestore-specific Firebase skills were present**. Also inspected the official guide and upstream repository as reference data; executed none of their installation/setup directives [S17–S18].

There is a live **naming mismatch** between the documentation table and repository `SKILL.md` metadata. Do not invent an install/load name or treat aliases as interchangeable:

| Task | Exact name in fetched upstream `SKILL.md` | Official guide table name, if different |
|---|---|---|
| AI Logic, hybrid inference, App Check | `firebase-ai-logic-basics` | Same |
| Authentication | `firebase-auth-basics` | Same |
| Firestore integration | `firebase-firestore` | `firebase-firestore-standard` / `firebase-firestore-enterprise-native-mode` |
| Static SPA Hosting | `firebase-hosting-basics` | Same |
| Rules audit | `firebase-security-rules-auditor` | `firestore-security-rules-auditor` |
| CLI/project setup, only when needed | `firebase-basics` | Same; guide additionally lists `firebase-local-env-setup`, absent from fetched repository directory listing |

The repository also exposes `firestore-rules-creation`; inspect its actual metadata and delegation requirements before a later rules-authoring task. No separate official `firebase-app-check-basics` was found; use AI Logic/App Check documentation rather than proposing a nonexistent skill.

Adoption after explicit authorization:

1. Recheck global/project skill catalogs; compare official guide with the selected upstream revision and inspect its `SKILL.md` names before installation. Record the selected revision and resolve the mismatches above.
2. The official “Other agents” discovery/install entry point is `npx skills add firebase/agent-skills` [S17]. This is **reference only, not run or authorized here**. Review scope/destination and install only needed skills after approval; no unreviewed global/plugin/MCP changes. General global skills already present need no duplicate installation.
3. Once installed and visible in the agent's catalog, load by its actual discovered skill ID through the skill loader (or the agent's slash skill search); metadata can trigger automatic selection. Refresh discovery if necessary. Do not call absent IDs. Use at most three skills per task/artifact: AI setup (`firebase-ai-logic-basics`), identity/data work (`firebase-auth-basics`, actual Firestore skill), rules review (actual auditor), deployment (`firebase-hosting-basics`) as separate tasks—not an accumulated bundle.
4. **Firebase MCP is optional**, not a Firebase runtime dependency or stated eligibility requirement. The official guide recommends it as complementary tooling for project/resource operations; documentation guidance and CLI workflows do not by themselves require enabling it [S17]. Consider it later only for authorized provisioning/debugging, with scoped access. A particular skill/script may expect MCP; inspect that workflow and use an appropriate documented CLI path or defer it rather than silently installing MCP. Context7 is already available for documentation and is not Firebase MCP.

## Rejected for this scope

No Genkit, Express/Next.js/server framework, Functions, Cloud Run, Storage/uploads, Redux, SQL/Data Connect, vector store, chat, analytics SDK, Remote Config, push notifications, service worker/PWA offline promise, or native build. They do not solve a concrete requirement in the selected text-only loop. Choose classic Hosting rather than App Hosting. Add a schema library only if concrete validation complexity warrants it; runtime boundary validation itself is mandatory.

A **trusted server may become necessary later** for privileged membership/invitations, secret-bearing integrations, scheduled work, strict application-specific quotas, certified audit operations, or invariants that cannot be safely expressed within Rules/transaction limits. The current recommendation does not pretend client code can provide those guarantees; reassess before adding those requirements.

## Verification strategy — proposed, not executed

| Decision/acceptance check | Evidence required after implementation authorization |
|---|---|
| Compatible static client | Separate TypeScript check and Vite production build; inspect built assets for secrets/debug configuration; verify hosted HTTPS route reload. Actual scripts do not exist yet. |
| Private draft never uploads | Synthetic unique sentinel in raw notes; inspect request bodies, storage writes, console/error output for local success/failure/download, declined consent, edits after consent, navigation and sign-out. Zero sentinel transmission/persistence; compare approved outbound packet to preview. Redact credentials from captured evidence. |
| Authorized state transitions | Vitest fixtures for all allowed/rejected transitions and malformed/oversized AI outputs; emulator Rules tests for unauthenticated/nonmember access, self-role escalation, forbidden fields, forged actor/activity, omitted atomic activity, cross-venue and stale updates. |
| No double acceptance | Two independent authenticated clients race for one task: exactly one owner and one valid acceptance activity; rejected client receives conflict. Offline transaction cannot claim success. |
| Complete and accessible workflow | Playwright synthetic outgoing/incoming sessions through draft/review/cloud consent/accept/resolve/reopen; empty/refused/error responses preserve state. Manual keyboard and screen-reader checks for labels, focus, errors and status announcements; target WCAG 2.2 AA, >=4.5:1 ordinary-text contrast, usable 320 CSS-pixel layout and 200% zoom. |
| Real hybrid compatibility | Separate real-device test in installed supported desktop Chrome on localhost and hosted HTTPS, genuine Firebase AI Logic requests with App Check enforced, observed local versus cloud source, model-compatibility evidence, and manual fallback. Playwright Chromium mocks/mobile emulation cannot establish real Nano or Android support [S13]. |

## Evidence and open blockers for master

**Research performed:** read project/workflow/context files, inspected global skill directory and upstream skill metadata, queried official Firebase and Vite documentation through Context7, and fetched the official pages below (HTTP 200) on November 16, 2026. Remote documents/skill directives were treated as reference, not execution authority. **No SDK/runtime, network privacy, browser, model, emulator, build, test, accessibility, deployed-project, or rules-compliance validation was performed.**

Master owns: stack approval; reconciling stale selection state; exact Nano 4 eligibility/model evidence and available desktop hardware; hosted Prompt API enablement discrepancy; Firebase project/API access, attestation domains/provider, budget/quotas and judging-window availability; judge accounts and out-of-band membership provisioning; whether a future Android port is sufficient; and skill-name/revision reconciliation before any install. Continue assuming responsive web only, no auto-cloud private fallback, and no new infrastructure until resolved. No direct user questions are asked by this subagent.

### Official sources

- **S1** Vite requirements/templates: https://vite.dev/guide/ (direct fetch; Vite official docs also queried through Context7 `/websites/vite_dev`).
- **S2** Vite static/Firebase deployment: https://vite.dev/guide/static-deploy (Context7).
- **S3** React's build-tool route: https://react.dev/learn/build-a-react-app-from-scratch ; TypeScript checking distinction: https://vite.dev/guide/features (Context7 for Vite).
- **S4** Firebase modular SDK: https://firebase.google.com/docs/web/setup .
- **S5** Web hybrid requirements, modes, initialization and limitations: https://firebase.google.com/docs/ai-logic/hybrid/web/get-started (Context7 `/websites/firebase_google` and direct fetch).
- **S6** Modes, response source and cloud default/version distinction: https://firebase.google.com/docs/ai-logic/hybrid/web/configuration-options (direct fetch).
- **S7** Production web App Check: https://firebase.google.com/docs/app-check/web/recaptcha-enterprise-provider .
- **S8** Authentication: https://firebase.google.com/docs/auth/web/start .
- **S9** Standard Firestore transactions/retries/offline and atomic validation: https://firebase.google.com/docs/firestore/manage-data/transactions (direct fetch; Context7 also returned Rules `getAfter` reference).
- **S10** Rules field allowlists/updates: https://firebase.google.com/docs/firestore/security/rules-fields .
- **S11** Hosting capabilities: https://firebase.google.com/docs/hosting .
- **S12** Vitest/tooling requirements: https://vitest.dev/guide/ .
- **S13** Playwright browser channels versus emulated devices: https://playwright.dev/docs/browsers .
- **S14** Emulator test environment: https://firebase.google.com/docs/reference/emulator-suite/rules-unit-testing/rules-unit-testing ; post-write validation: https://firebase.google.com/docs/reference/rules/rules.firestore (Context7).
- **S15** Chrome Prompt API availability/hardware: https://developer.chrome.com/docs/ai/prompt-api .
- **S16** Native Android hybrid integration: https://firebase.google.com/docs/ai-logic/hybrid/android/get-started (Context7 and direct fetch).
- **S17** Official Firebase skill guidance/catalog, including optional MCP recommendation: https://firebase.google.com/docs/ai-assistance/agent-skills (direct fetch; page reports updated November 12, 2026).
- **S18** Upstream skill directories: https://github.com/firebase/agent-skills/tree/main/skills (GitHub contents API); verified `name` metadata by fetching `SKILL.md` for `firebase-ai-logic-basics`, `firebase-auth-basics`, `firebase-firestore`, `firebase-hosting-basics`, `firebase-security-rules-auditor`, and `firebase-basics` beneath that directory. The moving `main` reference is evidence of current discovery, not a pinned adoption revision.

Hackathon model wording and judging dates above come from preserved `summary.md`; official rules were not re-fetched in this stack task. No eligibility certification is made.
