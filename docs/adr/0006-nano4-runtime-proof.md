# ADR 0006 — Nano 4 (Gemma 4 for Built-in AI) runtime proof

Date: November 17, 2026. Status: **isolated-profile download, readiness and genuine Firebase AI Logic
`ONLY_ON_DEVICE` generation verified locally; hosted/App Check/AC13 claims remain open.**

Scope: independent runtime validation only. No application, package, test, verifier, PLAN or
verification file was changed. The generation ran against an immutable committed app in a detached
temporary worktree; the working tree's tracked files were not touched. Ports changed only in the
temporary copy (recorded below). The evidence write to `.git/opencode/nano4/` was rejected by the
edit permission, so the captures are reproduced in this ADR and the final report.

## Provenance

- Official sponsor FAQ (retrieved 2026-11-17, HTTP 200):
  https://firebasehybridaihackathon.devpost.com/details/faqs — Tools & Technology:
  "How do I enable Gemini Nano 4 in Chrome? … In chrome://flags, search for "Gemma 4 for Built-in
  AI" and enable it." This is the documented mapping used here.
- Isolated profile `%LOCALAPPDATA%\Temp\opencode\nano4-faq-20261117-independent` (ownership handed
  over from the planner after its process stopped; no process was running before reuse).
- Persisted experiments read back from that profile's `Local State`: `gemma4-for-built-in-ai@1`
  only. `chrome://version` command line after restart showed the browser-generated
  `--enable-features=AIApiFoundationalModel:model_version/v4,OptimizationGuideManifestBroker`.
  No hardware bypass, no automation-disabling component/network flags, no ordinary profile, no
  registry or policy edit was used.
- System Chrome `157.0.8103.79`, official 64-bit Stable build, Windows 10 22H2 (19045.6466).

## Download and readiness (browser UI only — no direct Prompt API inference)

Started from the handed-over partial state: `gemma4_component` `2026.8.7.929` was `Not Installed`
in `chrome://components` ("Nueva colección", `0.0.0.0`), broker use case `prompt_api_gemma4` was
already `Requested`/`Pending Assets`, English text availability was `downloading`.

Clicked that component's own "Check for update" row action; the row entered "Comprobando estado…".
The broker simultaneously showed a full transfer counter (`2.0 GB / 2.0 GB`, `2,177,316,096` bytes),
then the payload appeared and the state settled without an error. Final observations:

| Item | Actual value |
|---|---|
| `chrome://components` row | `Optimization Guide Manifest Component: gemma4_component`, version **`2026.8.7.929`**, status **`Actualizado`** (up to date) |
| Broker asset | `gemma4_component` `2026.8.7.929`, state **Ready**, progress **100%**, error **None** |
| Broker use case | `prompt_api_gemma4` — **Available** (requested) |
| Model entry | **`gemma4_gpu_low_tier_model`**, folder **2,360.73 MiB**, backend `GPU (fastest inference)` |
| Weights | `...\OptGuideManifestModel\7feacbfe…\2026.8.7.929\weights.bin`, **2,475,399,520 bytes** |
| Model manifest | `name: "Optimization Guide On Device Model"`, `BaseModelSpec.name: "gemma4-2b-it"`, `version 2026.06.10.0000` |
| Legacy asset | `nano_v3_gpu_component` `2025.8.8.1141` — **Not Installed** in this profile |
| `LanguageModel.availability()` (English text) on `https://developer.chrome.com` | **`available`** |

The earlier stalled check and the full-transfer counter were recorded as observations; no failure
cause is asserted. Only one retry strategy was needed (component row update), within the two-attempt
bound.

## Genuine Firebase AI Logic generation

Harness (temporary, outside the main tree):

- App: detached worktree at `6cbfded72d2b027b8e17845ca92b4af72d629c47`; `node_modules` reached
  through a directory junction to the repository's existing install. No dependency install, no
  build, no main-tree command.
- Temporary copy changes only: `firebase.json` emulator ports (Firestore 8188, Auth 9199, hub 4411,
  logging 4511, websocket 9155), `src/firebase.ts` constants 9099→9199 and 8080→8188,
  `vite.config.ts` 5173→9533. No inference, validation or privacy logic changed.
- Emulators launched with a temporary strict launcher that imports `scripts/firebase_safe.py`'s
  `child_env` allowlist and log scrubber (no raw inherited environment, no live command); Vite on
  `127.0.0.1:9533`. Auth seed: random password generated at runtime, seeded through the emulator
  REST API, stored only in the harness vault and filled via the agent-browser auth vault; the
  password was never printed.

Flow: sign in as the synthetic `outgoing` member → the local-drafting panel rendered its `ready`
state (only shown when the Firebase capability probe reads `available`) → typed a synthetic
287-byte shift note in memory → activated "Draft cards with on-device model".

Results:

- Run 1, real app handler: **five cards in 31.6 s**; UI: "Generated on this device (ON_DEVICE)";
  `src/localDraft.ts` throws `not_on_device` unless `result.response.inferenceSource === "on_device"`.
- "Use these suggestions" populated the five reviewed-card fields; human review stayed required.
- Run 2, CDP point-and-click on the same button: **five different cards in 12.5 s**, proving real
  model output rather than a fixture.
- Sentinel: request log cleared before each run. Run 2 produced **no requests**; run 1 showed only
  local Firestore `Listen/channel` long-polls. No cloud AI host was contacted. `localStorage`,
  `sessionStorage` and cookies were empty; IndexedDB held only `firebase-heartbeat-database`.
  Console showed no errors. The HAR (which included the earlier synthetic Auth exchange) was
  deleted unread.
- Model-quality limit: the current validator checks only bounds/order/no-surrogate-split for
  `sourceStart`/`sourceEnd`. Run 2's spans were shifted relative to the supporting sentence, so the
  output passed validation but its source alignment is imperfect. Reported as a model-quality
  observation, not silently corrected.

## Decisions and limits

- **Go:** the sponsor-documented flag path, the v4 component/model identity and a genuine local
  Firebase AI Logic response are now verified on this machine, on a loopback origin.
- **No-go:** hosted HTTPS behavior, App Check enforcement, the AC13 privacy sentinel on the hosted
  origin, and any claim that a v3 run was Nano 4 remain unverified. The hosted proof belongs to the
  later QA stage.
- The Chrome pointer-click path worked only after the browser window was activated; the first
  attempt used the app's own DOM activation handler. Either way, the shipped component handler ran.

Cleanup: the owned browser, Vite and emulator processes were stopped; the isolated profile and the
downloaded model were kept as private cache. No main-app source, ports 5173/8080/9099, npm script,
build, verifier, commit, push, deploy or cloud resource was touched.
