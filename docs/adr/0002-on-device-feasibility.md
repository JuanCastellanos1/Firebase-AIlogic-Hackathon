# ADR 0002 — On-device feasibility for Slice 2

Date: November 16, 2026. Status: **Browser capability demonstrated; exact Nano 4 compliance and AC13 remain blocked.**

Scope: independent, read-only feasibility investigation, except this requested ADR and authorized isolated browser profiles. No application, dependency, test, interface, specification, plan, or verification files changed. No model download, generation, Firebase app registration, AI provisioning, billing, deployment, commit, or push performed.

## Context and decision

AC13 requires genuine Firebase AI Logic local and separately approved cloud inference on localhost and the intended hosted HTTPS origin, source evidence, exact Nano 4 compatibility evidence, App Check, and a privacy-sentinel repeat. Browser API discovery alone satisfies none of the generation/privacy requirements.

**Conditional go for a later authorized implementation; no-go for claiming AC13 or hackathon model compliance now.** This desktop can expose the current Prompt API without experimental AI flags or an origin-trial token and reports the English text model as `downloadable`. That is permission/capability evidence, not an installed model, successful download, inference, or Nano 4 identity. Preserve the existing emulator-only application guard until a separately authorized integration changes it. Do not replace Nano 4 with an unidentified Gemini Nano release.

Read: `AGENTS.md`, `summary.md`, `docs/_project.md`, `docs/HANDOFF.md`, ADR 0001, AC13, `package.json`, installed AI Logic web reference, and installed SDK declarations/adapter. Loaded skills: `firebase-ai-logic-basics`, `agent-browser` (core guide plus commands/WebGPU references), `documentation-and-adrs`. Requested `workflow/core.md` and `phases/1-3-framing.md` were absent at repository-relative paths; no substitute workflow was invented.

## Actual inventory and documented requirements

Read-only Windows CIM and `nvidia-smi` results; no host identifiers, serial numbers, account details, credentials, or everyday-profile content retained here. Values are a snapshot, not resource reservations.

| Item | Actual observation | Current official Chrome requirement / interpretation |
|---|---|---|
| OS | Windows 10 Home Single Language, 10.0.19045, build 19045, 64-bit | Windows 10/11 supported [S2]. Does not assess OS security-update entitlement. |
| Installed Chrome | System Google Chrome **157.0.8103.78**, official 64-bit build; file version and `chrome://version` agree | Firebase says desktop Chrome >=139, JS SDK >=12.5.0 [S3]; Chrome lists general web Prompt API from **148**, extensions from 138 [S2]. This machine exceeds both lower bounds. |
| CPU | Intel Core i5-9300H @ 2.40 GHz; **4 physical cores, 8 logical processors** | CPU route requires >=4 cores and >=16 GB RAM [S2]. |
| RAM | Two 8,589,934,592-byte modules: **16 GiB installed**. OS-visible 15.84 GiB; free 10.84 GiB at probe time | Installed capacity meets the nominal 16 GB threshold. OS-visible/free RAM must not be mistaken for installed capacity; actual runtime remains untested. |
| Discrete GPU | NVIDIA GeForce GTX 1650; **4096 MiB VRAM**, driver 581.57 (`nvidia-smi`) | GPU route requires **strictly more than 4 GB VRAM** [S2]. This 4 GiB-class card is not evidence of meeting that requirement. CPU is the plausible route; actual backend selection was not observed. |
| Integrated GPU | Intel UHD Graphics 630; CIM AdapterRAM 1,073,741,824 bytes; driver 26.20.100.6911 | CIM adapter memory is not reliable evidence of usable dedicated model VRAM. No qualifying GPU inferred. |
| Profile-volume disk | C: 476.29 GiB total, **79.45 GiB free** | >=22 GB free on profile volume [S2]; model removed if free space falls below 10 GB. Both isolated profiles were on C:. Model size varies; no exact download size measured. |
| Network | Documentation/HTTPS access succeeded | Initial download requires unlimited/unmetered connection [S2]. Metered status, bandwidth and model-download endpoints were not verified. |
| Firebase dependency | Repository pins `firebase` **13.3.0**; installed `@firebase/ai` declarations/adapter inspected | Exceeds documented minimum; no SDK request was executed. Pin alone is not compatibility proof. |

Inventory commands executed (selected fields only):

```powershell
$os = Get-CimInstance Win32_OperatingSystem
# Caption, Version, BuildNumber, OSArchitecture,
# TotalVisibleMemorySize / 1MB and FreePhysicalMemory / 1MB (GiB)
Get-CimInstance Win32_Processor |
  Select-Object Name,NumberOfCores,NumberOfLogicalProcessors
Get-CimInstance Win32_PhysicalMemory | Select-Object Capacity,Speed
Get-CimInstance Win32_VideoController | Select-Object Name,AdapterRAM,DriverVersion
Get-CimInstance Win32_LogicalDisk -Filter 'DriveType=3'
# Reported only DeviceID, Size/1GB and FreeSpace/1GB; no volume labels/serials.
(Get-Item 'C:\Program Files\Google\Chrome\Application\chrome.exe').VersionInfo |
  Select-Object ProductName,ProductVersion
nvidia-smi --query-gpu=name,memory.total,driver_version --format=csv,noheader
```

## Browser probes: stock launch versus automation defaults

The agent-browser core guide was loaded before browser operations. CLI version reported by diagnostics: 0.43.0. A named task session and new, unsigned-in profiles were used; no auto-connect, everyday-profile reuse, extension installation, global flags, registry changes, managed policies, or experimental AI enablement.

### Initial automation launch — limited evidence

Session `slice2-feasibility`, profile under `%LOCALAPPDATA%\Temp\opencode\slice2-nano-clean-20261116`, explicit system Chrome, `--headed --no-webmcp`. On `https://developer.chrome.com`, `LanguageModel` existed but English text `availability()` first exceeded the tool response timeout; a bounded repeat timed out after 10 seconds. `doctor --offline --quick` reported no failed checks.

`chrome://version` exposed automation defaults including `--disable-component-update` and `--disable-background-networking`. These can interfere with model readiness; causation was not established. **Do not interpret this timeout as an unsupported device.** That automation-owned browser was closed. No `--webgpu`, unsafe GPU override, AI flag, or origin-trial token was enabled.

### Minimal system-Chrome launch — positive capability evidence

Obtained the task name using `agent-browser session id --scope worktree --prefix slice2-nano`: `slice2-nano-06cd8c6456c2`. Launched system Chrome separately, then attached only to its dedicated CDP port:

```powershell
$profile = "$env:LOCALAPPDATA\Temp\opencode\slice2-nano-standard-20261116"
Start-Process 'C:\Program Files\Google\Chrome\Application\chrome.exe' -ArgumentList @(
  '--remote-debugging-port=9338', ('--user-data-dir="'+$profile+'"'),
  '--no-first-run', '--no-default-browser-check', 'about:blank')
agent-browser --session slice2-nano-06cd8c6456c2 --cdp 9338 open https://developer.chrome.com/docs/ai/prompt-api
```

`chrome://version` confirmed exactly these launch arguments, plus empty `--flag-switches-begin --flag-switches-end`. No experimental AI flags or origin-trial arguments were present. The system browser used its ordinary component/network behavior, unlike the initial automation launch. This remains a CDP-attached probe, not an unautomated end-user certification.

For each origin, evaluated only feature existence and availability, with no `create()`, `prompt()`, `initializeDeviceModel()` or Firebase calls. The expression used the same explicit English text input/output options throughout:

```javascript
LanguageModel.availability({
  expectedInputs: [{ type: "text", languages: ["en"] }],
  expectedOutputs: [{ type: "text", languages: ["en"] }]
})
```

Wrapped availability in a 10-second `Promise.race` and captured `location.origin`, `isSecureContext`, `typeof globalThis.LanguageModel`, `typeof navigator.ai`, and the count of `meta[http-equiv=origin-trial]`. PowerShell quoting required UTF-8 base64 evaluation:

```powershell
# $js contains the bounded inspection expression, not application code.
agent-browser --session slice2-nano-06cd8c6456c2 eval -b (
  [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($js)))
```

| Actual origin | Secure context | `LanguageModel` | `navigator.ai` | Availability | Trial metadata |
|---|---|---|---|---|---|
| `https://developer.chrome.com` (Prompt API documentation; redirected to `?hl=es-419`) | true | `function` | `undefined` | **`downloadable`**, repeated successfully | 0 origin-trial meta elements; independent HTTP fetch returned no `Origin-Trial` header or matching meta tag |
| `http://127.0.0.1:9339` (empty, locally served probe document) | true | `function` | `undefined` | **`downloadable`** | No trial token/header served; 0 meta elements |

The loopback page was a one-request Python standard-library HTTP server, bound only to 127.0.0.1, returning a constant empty HTML document, with logging suppressed; no files served or source files created. Executed through `@' ... '@ | py -3 -`:

```python
from http.server import BaseHTTPRequestHandler, HTTPServer
class Probe(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-Type', 'text/html')
        self.end_headers()
        self.wfile.write(b'<!doctype html><title>Local capability probe</title>')
    def log_message(self, *args): pass
HTTPServer(('127.0.0.1', 9339), Probe).handle_request()
```

This was an ephemeral probe command, not an application spike or committed implementation. The server exited normally after serving the page. An earlier `py -3 -c` attempt failed from PowerShell quote stripping; its resulting connection-refused/error-page `API absent` observation was **discarded**, not counted as a negative localhost capability result. The successful origin was numeric loopback, not a separately exercised `localhost` hostname. HTTPS evidence is on the official documentation origin, **not ShiftRelay's intended hosted origin**.

`chrome://components` reported **Optimization Guide On DeviceModels Manifest version 1.20261018.2**, updated. This is a manifest version, not model weights, download completion, or a Nano 4 identifier. No update button clicked. `chrome://on-device-internals` redirected to `chrome://debug-webuis-disabled/`; debug pages were not enabled. Therefore no model identity/size was obtained there.

Cleanup: closed both named agent-browser sessions. The separately launched Chrome main process was stopped only when its command line matched the dedicated `slice2-nano-standard-20261116` profile; a subsequent CIM query found zero matching main processes. The one-request loopback server exited with status 0. Isolated profile directories were retained locally; no everyday-profile process or data was targeted.

## Exact Nano 4 proof — separate unresolved blocker

Re-fetched official hackathon rules, HTTP 200 [S1]. Current wording is explicit:

> Web (Chrome): Integrating with Gemini Nano 4 via Firebase AI Logic; The build must support Web applications or Chrome extensions

The rules also require App Check and accept debug tokens. The fetched Chrome Prompt API guide describes **Gemini Nano**, not an exact Nano 4 mapping [S2]. Firebase's fetched hybrid overview/get-started/configuration pages likewise provided no exact Nano 4 compatibility mapping [S3–S5]. Searches for `Nano 4` / `Nano4` in those retrieved pages found none. This bounded investigation is not a claim that no authoritative mapping exists anywhere.

Neither `typeof LanguageModel`, `availability() === "downloadable"`, the manifest version, nor a future `inferenceSource === "ON_DEVICE"` proves Nano 4. No exact local model identifier was observed and no model was downloaded or run. **Compliance cannot currently be established.**

Decision needed from master: obtain an official browser/SDK/model compatibility statement tying this supported Chrome Prompt API configuration to **Gemini Nano 4**, or seek written organizer clarification that the browser-managed model qualifies. If neither is available, report an eligibility blocker and decide whether to obtain a demonstrably compliant device/platform; do not silently rename generic Nano as Nano 4 or downgrade the requirement. No direct user question from this investigation.

## Exact SDK surfaces and privacy consequences

Context7 resolved official Firebase documentation as `/websites/firebase_google`; queried current hybrid modes, initialization and capability references. Direct official pages were also fetched on this date. Installed declarations and implementation were inspected without executing the SDK:

- `getAI(app, { backend: new GoogleAIBackend() })` and `getGenerativeModel(ai, hybridParams)` are the documented web initialization path [S3, S4]. No direct Gemini client or invented local model-name string needed.
- Four `InferenceMode` values: **`ONLY_ON_DEVICE`** (no cloud fallback), **`ONLY_IN_CLOUD`** (no device fallback), **`PREFER_ON_DEVICE`** (may upload to cloud when local unavailable), **`PREFER_IN_CLOUD`** (cloud first, device fallback) [S4]. Only the first is acceptable for private-note extraction. Use a separate cloud-only instance for explicitly approved reconciliation.
- Public initialization is **`GenerativeModel.initializeDeviceModel(onDownloadProgress?)`**, returning `Promise<void>`, on/after actual page interaction and before generation. Await completion; handle download/unavailable/error separately and retain manual work. Docs and installed comments differ on pre-initialization edge behavior; avoid relying on it entirely [S3, S6].
- The browser capability API is **`globalThis.LanguageModel.availability(options)`**, not `navigator.ai`, `navigator.languageModel`, `model.isAvailable()` or an invented Firebase `getOnDeviceModelStatus()`. Relevant states: `unavailable`, `downloadable`, `downloading`, `available`. Pass matching text/language options to availability and creation [S2].
- Firebase reference exposes **`ChromeAdapter.isAvailable(request: GenerateContentRequest): Promise<boolean>`**, but explicitly says adapter methods **should not be called directly by the user** [S7]. Installed `ai-public.d.ts` lines 369–385 confirm this; `GenerativeModel` has a private adapter and no public availability method. Do not design an app around adapter internals.
- Installed `dist/esm/index.esm.js` lines 971–1008 show the adapter consulting the provider's `availability(createOptions)` and mode/download readiness. This is request routing, not an exact-model identity API. Explicitly configure English text-only `onDeviceParams.createOptions`; the probe does not cover other options/modalities.
- Actual response source is **`result.response.inferenceSource`**, `ON_DEVICE` or `IN_CLOUD` [S4]. Record only genuine responses after implementation; source is not model identity. Cloud override belongs in `inCloudParams.model`; docs default to `gemini-3.5-flash-lite` starting SDK 13.0.0, but current free-tier eligibility/quota/model choice still need a real authorized check.
- Firebase's supported local scope is single-turn text/structured output (also limited image inputs), not local chat; desktop Chrome only [S3]. Chrome Android/iOS do not support these foundation-model APIs [S2]. Responsive Android web remains manual/approved-cloud only, not Nano evidence.

The installed skill's web example uses `PREFER_ON_DEVICE` as a generic hybrid pattern. That is **not** permission to adopt cloud fallback for private notes. App Check and model/service setup instructions in that skill were read, not executed; no packages installed and no credentials generated.

## Minimal prerequisites and next evidence

1. Resolve the exact Nano 4 mapping/organizer decision above before claiming eligibility. Browser API exposure alone is now a positive observation, not the remaining identity answer.
2. Independently verify unmetered download conditions, then perform an authorized user-activated model initialization/download on this isolated profile or a documented equivalent. Record model/compatibility evidence and actual ready state; no need for experimental flags based on today's capability result. If flags become necessary, record them as temporary isolated-profile experiments, never general production support.
3. After scanner/application ownership is released, authorize a separate implementation task using the already pinned SDK: memory-only raw input, explicit local-only mode/options, cancellation/stale-output protection, download status, independent output validation and manual fallback. No interface/spec/plan change made here.
4. Separate authorized Firebase web-app/AI Logic/App Check setup from this investigation. Stay Spark/free-tier-only, no billing link or paid backend. Current project existence and emulator success do not provide these missing runtime services. Keep private debug tokens out of source/evidence; verify enforcement rather than assuming it.
5. Run genuine Firebase AI Logic local requests on localhost and the intended HTTPS deployment, record source plus authoritative exact-model proof, and repeat AC13 privacy sentinel checks. A documentation-origin capability check does not establish hosted app Permissions Policy/CSP, attestation, language/options compatibility, model download, latency, quality, or privacy.
6. Separately consent to a bounded allowlisted cloud request; record explicit supported free-tier model/source and verify payload equality with preview. Demonstrate refusal/unavailable/manual paths. No auto-cloud private-note fallback.

## Official sources

All direct URLs below were successfully retrieved on November 16, 2026 unless identified as local inspection. Context7 is supplementary retrieval, not runtime evidence.

- **S1** Official challenge rules: https://firebasehybridaihackathon.devpost.com/rules
- **S2** Chrome Prompt API, current availability/hardware/browser capability: https://developer.chrome.com/docs/ai/prompt-api
- **S3** Firebase web hybrid get-started: https://firebase.google.com/docs/ai-logic/hybrid/web/get-started (retrieved its `.md.txt` representation).
- **S4** Firebase web hybrid configuration: https://firebase.google.com/docs/ai-logic/hybrid/web/configuration-options (retrieved `.md.txt`).
- **S5** Firebase hybrid overview: https://firebase.google.com/docs/ai-logic/hybrid (retrieved `.md.txt`).
- **S6** Public model initialization reference: https://firebase.google.com/docs/reference/js/ai.generativemodel (Context7).
- **S7** Adapter reference and direct-use warning: https://firebase.google.com/docs/reference/js/ai.chromeadapter (Context7); warning independently confirmed in installed declarations.
- Local installed reference: `%USERPROFILE%\.agents\skills\firebase-ai-logic-basics\references\usage_patterns_web.md`; installed SDK evidence: `node_modules/@firebase/ai/dist/ai-public.d.ts` and `dist/esm/index.esm.js`. No local identity paths included in public evidence.

## Unknowns / report to master

**PREGUNTAS_AL_USUARIO (route through master, not asked directly):** Is an authoritative Nano 4 mapping obtainable from the sponsor/organizer, and if not, which demonstrably compliant device/platform should be authorized? Assumption until resolved: exact model wording is mandatory, not interchangeable with generic Gemini Nano.

No generation/download success, inference backend selection, model identity, cloud behavior, deployed-origin support, App Check enforcement or AC13 completion is asserted. No app/package/tests/verification edits, dependency installation, public action or cloud mutation performed. Browser profile artifacts are local probe state only, not submission evidence of a working model.

## Master follow-up: organizer clarification route

Master read https://firebasehybridaihackathon.devpost.com/resources and https://support.google.com/chrome/answer/16961953?hl=en on November16. The resources page links the same generic Web hybrid guide and directs hackathon questions to its linked Discord #hackathon-help with the #BuildHybridAI tag. Chrome Help describes browser-managed models but provides no exact Nano4 mapping. These additional pages do not close the identity blocker.

Draft for the user to send (not sent or posted by an agent):

> For the Web/Chrome category, does Firebase AI Logic using ONLY_ON_DEVICE with Chrome's current browser-managed Prompt API model satisfy the rules' Gemini Nano4 requirement? On Chrome157 the API reports English text as downloadable, but the documented response exposes inference source rather than exact local model identity. Which official version mapping or model-verification evidence should teams include?

Local implementation may proceed as an explicitly unverified generic on-device path; claiming exact-model eligibility may not. No external message was sent and no rules requirement was weakened.

## November 17, 2026 — Official FAQ mapping and isolated Gemma 4 enablement

This dated follow-up supersedes the earlier **need to ask the organizer for the enablement mapping**, not the missing runtime evidence. Earlier November 16 observations remain historical evidence, not Nano 4 tests. Master separately reported a previous local-generation run exposing `nano_v3_gpu_component` version `2025.8.8.1141`; this investigator did not rerun that generation and does **not** relabel it Nano 4.

### Authoritative mapping now available

Independently fetched https://firebasehybridaihackathon.devpost.com/details/faqs (HTTP 200), Tools & Technology:

> How do I enable Gemini Nano 4 in Chrome?
>
> It's available through the Chrome Prompt API. In chrome://flags, search for "Gemma 4 for Built-in AI" and enable it. On-device inference on web only runs in Chrome versions and devices that support Nano.

The sponsor FAQ explicitly maps the required Nano 4 enablement path to the **Gemma 4 for Built-in AI** flag. No further organizer contact is a prerequisite for following that path. It does not mean every unflagged Prompt API invocation, or a v3 component, qualifies.

Current Chrome documentation was queried through Context7 after resolving Chrome for Developers to `/websites/developer_chrome`. Sources returned: https://developer.chrome.com/docs/ai/prompt-api , https://developer.chrome.com/docs/ai/get-started , and https://developer.chrome.com/docs/ai/inform-users-of-model-download . They distinguish `downloadable`, `downloading`, and `available`, require matching language/modality options, and describe user activation before `LanguageModel.create()`. No direct `create()` or prompt was called in this follow-up. Documentation examples are not runtime evidence.

### Isolated environment and actual flag UI

Reloaded the agent-browser core guide before commands. New task session: **`nano4-faq-20261117-06cd8c6456c2`**, obtained with `agent-browser session id --scope worktree --prefix nano4-faq-20261117`. New profile: **`%LOCALAPPDATA%\Temp\opencode\nano4-faq-20261117-independent`**. Confirmed the directory did not already exist and dedicated CDP port **9438** was not listening before launch. No earlier Slice 2/other-agent profile reused; no source-owned or emulator ports used.

Launched system Chrome with the same minimal pattern as the earlier successful probe:

```powershell
$profile = "$env:LOCALAPPDATA\Temp\opencode\nano4-faq-20261117-independent"
Start-Process 'C:\Program Files\Google\Chrome\Application\chrome.exe' -ArgumentList @(
  '--remote-debugging-port=9438', ('--user-data-dir="'+$profile+'"'),
  '--no-first-run', '--no-default-browser-check', 'chrome://flags')
agent-browser --session nano4-faq-20261117-06cd8c6456c2 --cdp 9438 open chrome://flags
```

**Actual system browser is now 157.0.8103.79**, official 64-bit build, cohort Stable, confirmed by both flags UI and `chrome://version`; it is not the earlier .78 build. No update/install operation was initiated by this investigation. The CLI diagnostic still identifies its separate cached .78 browser; that cached browser was not used.

Searched the actual flags UI for `Gemma`. Observed:

- **Name:** `Gemma 4 for Built-in AI`.
- **Exact UI anchor:** `chrome://flags/#gemma4-for-built-in-ai`.
- **Description:** `Enables all built-in AI APIs (Prompt, Summarizer, Writer, etc.) to use the Gemma 4 model. – Mac, Windows, Linux, ChromeOS`.
- Options were `Default` and `Enabled`; initially `Default`.
- Selected **Enabled** for this entry only. `Decisions API` and `Speculative Decoding for Built-in AI`, also returned by the search, remained **Default**. No hardware bypass or other AI feature enabled.

The initial unquoted PowerShell `@e1650` argument was treated as splatting and failed without changing the selection. Quoting the observed ref (`select '@e1650' Enabled`) succeeded. Read only `browser.enabled_labs_experiments` from the new profile's `Local State`: **`gemma4-for-built-in-ai@1`**, the sole persisted experiment. No other Local State content was copied.

Closed the named session and restarted **only this owned profile**, retaining its Local State. The post-restart UI showed **Enabled**, with the relaunch button disabled. `chrome://version` confirmed the minimal command line plus the following browser-generated switches:

```text
--flag-switches-begin
--enable-features=AIApiFoundationalModel:model_version/v4,OptimizationGuideManifestBroker
--flag-switches-end
```

These exact feature names were **observed after the UI selection**, not guessed or manually injected. The enablement is an **experimental isolated-profile configuration**, not stock/default end-user support. The flag's version parameter is configuration evidence, not proof of a generated response.

### Actual availability, broker metadata and UI-only download attempt

On `https://developer.chrome.com/docs/ai/prompt-api` (redirected to `?hl=es-419`), the secure-context English text availability check initially returned **`downloadable`**, with `typeof LanguageModel === 'function'`. Used the same explicit `expectedInputs` and `expectedOutputs` text/English options documented earlier; bounded the check to 10 seconds. No localhost app or probe app was launched.

To inspect the legitimate browser setup UI, visited `chrome://chrome-urls` and clicked **Enable internal debugging pages**, only within the new isolated browser. This enables diagnostic pages, not another AI experiment; the sole persisted labs entry remained `gemma4-for-built-in-ai@1`. Then opened `chrome://on-device-internals` → **Broker State**. No `Tools` → `Execute`, model prompt, or direct inference used.

| Broker observation | Actual value |
|---|---|
| Broker type / manifest | `ManifestBrokerState`; manifest loaded `true`, version-directory `1.20261018.2` |
| Performance class | `Medium` |
| Device capable | `true` |
| VRAM criterion | `true (3935 MiB actual, 3000 MiB required)` |
| Install disk criterion | `true (76321 MiB available, 20480 MiB required)` |
| Retain disk criterion | `true (76321 MiB available, 5120 MiB required)` |
| Requested target asset | **`gemma4_component`, target version `2026.8.7.929`** |
| Target model entry | **`gemma4_gpu_low_tier_model`**, backend label `GPU (fastest inference)` |
| Legacy asset | `nano_v3_gpu_component`, `2025.8.8.1141`, **Not Installed** in this new profile |

The observed broker's current GPU/disk eligibility thresholds differ from the general Chrome documentation cited earlier (strictly >4 GB VRAM, 22 GB free). Record both; do not silently rewrite the official requirements or infer that the CPU route was selected. This manifest **selects a low-tier GPU model entry** and reports the device capable. It still does not prove successful model load/inference on that backend.

The broker UI offered a **Requested** checkbox for **`prompt_api_gemma4`**. Checked only that observed use case. State immediately changed from `Pending Usage` to **`Pending Assets`**, and `gemma4_component` changed from `Not Installed` to **`Foreground Installing`**. Thus a UI-only setup/download request was possible; no application user-click or probe application was needed to start this download.

The component initially remained at 0%. In `chrome://components`, its actual row was **Optimization Guide Manifest Component: gemma4_component**, installed version **`0.0.0.0`**, status `Nueva colección` (new component). Clicked **Check for update** for that row only, identified from its observed DOM/button association; status changed through checking to **`Descargando…` (Downloading)**. No general Chrome update or unrelated component update requested.

Bounded UI waits of 180/300 seconds did not establish installation. Broker progress was subsequently observed as **`2.0 GB / 2.0 GB`**, then **`342.0 MB / 2.3 GB`**, then **`2.3 GB / 2.3 GB`**, then **`25.2 MB / 2.3 GB`**. These are the UI's displayed transfer counters, **not exact byte counts or a sum of unique downloaded bytes**. The counter changes alone do not establish whether there were multiple artifacts, retries, or verification failures; no cause is asserted. The broker error column stayed **`None`**.

**Final observations before cleanup:**

- English text `LanguageModel.availability(...)` returned **`downloading`**, not `available`.
- `gemma4_component`: target **2026.8.7.929**, **Foreground Installing**, **346.2 MB / 2.3 GB**, error **None**.
- `prompt_api_gemma4`: **Pending Assets**; legacy `prompt_api`: Pending Usage.
- `gemma4_gpu_low_tier_model`: folder size **0 MiB** (rounded UI value), no weights path. **Exact installed-weight byte count unavailable.**
- `chrome://components` still reported installed version **0.0.0.0**, Downloading. The nonzero target manifest version is not an installed-component success claim.

The setup attempt demonstrated a real download in progress, **not completed installation/readiness**. It was stopped with the owned browser at the investigation boundary. The new profile and partial state were retained privately, not deleted or handed over as a ready model.

### Updated go/no-go and minimal implementation prerequisites

**Go:** use the sponsor-documented Gemma 4 flag path for an authorized real Firebase AI Logic validation. The previous organizer-mapping question is closed by the official FAQ. This machine's actual broker recognizes the v4 target and marks it device-capable.

**No-go:** claim a ready Nano 4 model, successful Nano 4 generation, hosted-origin compatibility, or AC13 completion. Download completion is still unproven; the prior successful v3 generation remains v3 evidence only. No inference was executed in this follow-up.

Minimal remaining work for the independent implementer/master:

1. In a separately owned profile, follow the exact observed UI flag and restart procedure, or explicitly coordinate ownership before reusing this stopped private profile. Keep the experimental enablement recorded. Do not commandeer another active profile.
2. Complete the Gemma 4 download and verify target asset **2026.8.7.929** (or a newly observed official replacement), installed/ready state, weights metadata and English text **`available`**. Investigate repeated progress-counter resets if they persist; this report contains no established failure cause. No additional flags/hardware bypass are justified by this evidence.
3. Use the existing application user interaction and **Firebase AI Logic `ONLY_ON_DEVICE`**, awaiting `initializeDeviceModel()` before generation. If the UI-only install remains incomplete, this existing user-click path can initialize/monitor the model through the SDK; no separate direct-Prompt-API inference app is needed. Record a genuine response's `inferenceSource === 'ON_DEVICE'` alongside the official FAQ mapping, persisted v4 flag, and current broker/component metadata. Never label a v3 response Nano 4.
4. Repeat on the intended hosted HTTPS app, with enforced App Check and the AC13 privacy sentinel; separately run only explicitly consented cloud inference with its allowlisted payload and real source/model evidence. Existing manual fallback must remain usable. No source/specification/plan changes made here.

Cleanup: closed session **`nano4-faq-20261117-06cd8c6456c2`** and targeted any remaining Chrome main process only when its command line matched **`nano4-faq-20261117-independent`**. Subsequent CIM check: **0 matching owned main processes**. Confirmed Local State still contained only `gemma4-for-built-in-ai@1`. No ordinary browser profile/process, global registry/policy, application/package/test/PLAN/verification/code file, cloud resource, billing setting, commit, push, build, npm task or emulator was touched. Only this ADR was edited in the repository.
