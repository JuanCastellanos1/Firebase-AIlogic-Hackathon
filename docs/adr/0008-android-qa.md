# ADR 0008 — Isolated Android emulator QA profile

Status: **harness works for OS/Chrome/touch observation; hosted-app QA still blocked**. Recorded November 17, 2026
by the independent Android validation agent. Scope of this ADR: how the isolated profile is created, launched,
stopped and what it produced. No app, Rules, package, PLAN or verification edits came from this work.

## Decision

A fresh, throwaway AVD named `shiftrelay-qa` lives entirely under
`%TEMP%\android-qa` (`avd\`, `userhome\`, `logs\`, `artifacts\`) and references the already installed,
already licensed system image. Nothing is installed, downloaded, licensed accepted, or configured globally.

- AVD home: `%TEMP%\android-qa\avd`, user/emulator home: `%TEMP%\android-qa\userhome`
  (`ANDROID_AVD_HOME` / `ANDROID_USER_HOME` / `ANDROID_EMULATOR_HOME`). Because `ANDROID_AVD_HOME` is searched
  first, the machine's personal `Pixel_10_Pro` AVD is invisible to these runs: `emulator -list-avds` printed only
  `shiftrelay-qa`, and `adb emu avd path` confirmed
  `C:\Users\acer\AppData\Local\Temp\android-qa\avd\shiftrelay-qa.avd`.
- Image reused read-only: `system-images\android-37.2\google_apis_playstore_ps16k\x86_64`
  (`Pkg.Revision=5`, `SystemImage.TagId=google_apis_playstore,page_size_16kb`). The AVD's `userdata-qemu.img` is
  created fresh from the image on first boot; no userdata was cloned or copied from the personal AVD.
- `cmdline-tools\avdmanager.bat` is absent, so the AVD is a hand-written pair:
  `avd\shiftrelay-qa.ini` (name, path, `target=android-37.2`) and `avd\shiftrelay-qa.avd\config.ini`
  (x86_64, 2 cores, 2048 MiB, 1080x2400@420, software GPU `swiftshader_indirect`, `hw.sdCard=no`,
  audio in/out off, both cameras `none`, `disk.dataPartition.size=4G`, cold boot only, no snapshots).
- Child process environment is an allowlist, not the host block: `SystemRoot`, `windir`, `ComSpec`, `TEMP`/`TMP`,
  `USERPROFILE`, a `PATH` of `System32` only, and the three `ANDROID_*_HOME` variables plus
  `ANDROID_HOME`/`ANDROID_SDK_ROOT`. No host credentials, tokens or proxy variables reach the emulator.
- Serial is always explicit (`-s emulator-5556`, own even port 5556). The app stack's ports 5173/8080/9099 were
  verified listening before launch and were never touched.

## Read-only preflight (measured)

| Item | Result |
|---|---|
| Emulator | 37.1.11.0 (build_id 15917651), not on `PATH` |
| Acceleration | `emulator -accel-check` → `WHPX(10.0.19045) is installed and usable.` (exit 0) |
| Host memory | 16221 MiB total, 5138 MiB free at launch; emulator warns "suggested minimum 16384 MiB" |
| Disk | C: 71.9 GB free; this AVD grew to 4188.7 MB with a 4G data partition |
| Other devices | `adb devices` empty before launch — no other emulator existed to disturb |

## Reusable launch / stop / observe commands

Launcher (Windows PowerShell 5.1 — `Start-Process -Environment` does not exist there, so a
`System.Diagnostics.ProcessStartInfo` with `EnvironmentVariables.Clear()` is used, wrapped in `cmd.exe /c "… > log 2>&1"`
so the emulator outlives the calling shell):

```powershell
$qa = "$env:TEMP\android-qa"; $sdk = "$env:LOCALAPPDATA\Android\Sdk"
powershell -NoProfile -ExecutionPolicy Bypass -File "$qa\start-emulator.ps1"
# emulator args used: -avd shiftrelay-qa -port 5556 -no-snapshot -no-window -no-audio -no-boot-anim
#   -camera-back none -camera-front none -gpu swiftshader_indirect -netdelay none -netspeed full -no-metrics
```

Boot/readiness, screenshots and UI text (all with an explicit serial):

```powershell
$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
& $adb devices
& $adb -s emulator-5556 shell getprop sys.boot_completed      # poll until 1 (measured ~90 s)
& $adb -s emulator-5556 shell "getconf PAGESIZE; getprop ro.build.version.release; getprop ro.build.version.sdk"
& $adb -s emulator-5556 shell "dumpsys package com.android.chrome | grep -m1 versionName"
& $adb -s emulator-5556 shell "input swipe 540 1800 540 900 300"   # touch readiness probe
& $adb -s emulator-5556 shell "uiautomator dump /sdcard/ui.xml >/dev/null 2>&1; cat /sdcard/ui.xml"
cmd /c "`"$adb`" -s emulator-5556 exec-out screencap -p > `"$qa\artifacts\shot.png`""   # binary-safe on PS 5.1
& $adb -s emulator-5556 emu kill                            # graceful stop, userdata preserved
```

Later CDP attach for genuine hosted QA (**not yet exercised** — see blockers): pick a free host port that is not
5173/8080/9099, then
`adb -s emulator-5556 forward tcp:<free> localabstract:chrome_devtools_remote` and read
`http://127.0.0.1:<free>/json`. Never attach to another agent's Chrome profile.

## Evidence observed

- Boot: `sys.boot_completed=1` after ~90 s; `ro.build.version.release=17`, `sdk=37`, security patch
  `2026-08-05`, model `sdk_gphone16k_x86_64`, fingerprint
  `google/sdk_gphone16k_x86_64/emu64xa16k:17/CP41.260828.004.A7/16296984:user/dev-keys`.
- 16 KB page size confirmed in-guest: `getconf PAGESIZE` → `16384`; ABI `x86_64` (`x86_64,arm64-v8a` abilist).
- Display `1080x2400` @ `420` dpi; three `virtio_input_multi_touch_*` devices present with
  `TOUCH | TOUCH_MT`; `input swipe` returned rc 0 — the screen is genuinely tappable, not just rendered.
- Chrome preinstalled, `versionName=149.0.7827.5`, `firstInstallTime` equal to this boot (fresh data).
  `dumpsys account` reported 0 accounts; no Google sign-in exists in this profile.
- Artifacts: `%TEMP%\android-qa\artifacts\home.png` (launcher after boot),
  `chrome-firstrun.png` (ANR overlay), `chrome-firstrun2.png` (Chrome first-run terms screen).

## Blockers (actual, not inferred)

1. **No guest network at all — `netsimd` panics (blocking hosted QA).** Emulator 37.1.11.0 starts its network
   simulator regardless of feature flags; it dies immediately on this Windows host:
   `thread '<unnamed>' panicked at external/netsim+/rust/hostapd-rs/src\hostapd.rs:171:13:
   Failed to generate config file: "/tmp\Temp\hostapd_10852.conf". Error: El sistema no puede encontrar la ruta
   especificada. (os error 3)` (Windows Application log: `netsimd.exe`, `0xc0000409`, repeated ~5x per launch).
   Result in-guest: `ip -4 addr` shows only `lo`, `dumpsys connectivity` → `Active default network: none`, so
   `ping 8.8.8.8` → `Network is unreachable`. Even `10.0.2.2`-style host access is impossible without an
   interface, so no hosted or localhost QA can run on this harness as shipped.
   With the default features the emulator process additionally exited during netsimd startup; with
   `-feature -VirtioWifi,-BluetoothEmulation` the VM booted but netsimd still panicked and no interface appeared.
   Fixing this needs an emulator/SDK update (download) or a host filesystem shim outside this agent's ownership —
   both out of scope, so it is reported instead of worked around.
2. **Chrome first-run legal gate.** `com.android.chrome/…firstrun.FirstRunActivity` shows exactly:
   *"Make Chrome your own"*, *"Sign in to get your bookmarks, passwords, and more on all your devices"*,
   button *"Add account to device"*, link *"Stay signed out"*, and
   *"By continuing, you agree to the Terms of Service. To help improve the app, Chrome sends usage and crash data to
   Google. Manage"*. Both exit paths continue past that agreement, so **no tap was made** and Chrome is left on that
   screen; no first-run flag, `--no-first-run` switch or preference file was used to bypass it.
3. **No deployed QA URL.** Deployment is pending in the main session, so no app flow was exercised (and none was
   faked).

Minor: with software GPU the first boot raised a `System UI isn't responding` ANR; tapping *Wait* (a system dialog,
not a legal prompt) cleared it and the launcher/Chrome rendered normally afterwards.

## Consequences / readiness verdict

The profile is reusable and isolated: it boots, is touch-capable, exposes Android 17/API 37 and Chrome
149.0.7827.5, and leaves its userdata on disk for the next QA attempt. It is **not** ready to exercise the hosted
app: guest networking is dead (netsimd panic) and Chrome sits behind an unaccepted Terms of Service screen. This is
an x86_64 emulator with real mobile Android Chrome — **not** a physical device; no hardware, hardware-acceleration
or real-device claim follows from it.

To unblock, whoever owns the environment must decide between updating the emulator package (a download), an
emulator-side fix for the hostapd path bug, and approving the Chrome ToS acceptance inside this throwaway profile.
After that, the CDP recipe above can drive genuine hosted QA against `localhost`-proxied or deployed HTTPS.

## Addendum — guest networking fixed, Chrome first run accepted (November 17, 2026)

This supersedes the Status line and blockers 1–2 above. Hosted QA is still pending **deployment only**: the harness
now has working guest networking, DNS and HTTPS, and a Chrome instance past its first-run gate.

**Permission used.** The user explicitly authorized, for this disposable `shiftrelay-qa` profile only, accepting
Chrome's first-run Terms of Service through the *Stay signed out* path with the optional usage/crash reporting
switched off. No Google account, no sync, no other terms and no ordinary-AVD data were involved. Every other
legal/billing restriction is unchanged; nothing was deployed, purchased or configured globally.

### Root cause of the "netsimd panic" — reproduced, then fixed

- **Symptom:** `netsimd` aborts with
  `Failed to generate config file: "/tmp\Temp\hostapd_<pid>.conf"`; in-guest only `lo` and
  `Active default network: none`.
- **Actual cause (from netsimd's own stderr, not inferred):** the daemon logs
  `os_utils.rs:45 - No discovery env for LOCALAPPDATA, using /tmp` followed by
  `ini_file.rs:151 - Unable to find netsim ini file: "/tmp\Temp\netsim.ini"`. netsimd derives its discovery and
  temp path from **`LOCALAPPDATA`** and falls back to the Unix `/tmp`; it then appends `\Temp\…`. The launcher's
  cleared allowlist did carry `TEMP`/`TMP` — so "TEMP missing" was *not* the cause — but it did not carry
  `LOCALAPPDATA`, so hostapd was handed a Windows path that cannot exist and the daemon aborted before any
  interface reached the guest.
- **Fix (temp harness only, no SDK/image/tool change):** add `LOCALAPPDATA` to the child-env allowlist, and drop
  the earlier `-feature -VirtioWifi,-BluetoothEmulation` override so the documented emulator defaults apply —
  virtio-wifi is what carries guest networking in this emulator generation, so overriding it off removed the
  transport as well as the panic. Red evidence kept in `artifacts\red-netsimd-stderr.log` and
  `artifacts\red-emulator.log`.

### Green evidence (measured this run)

- netsimd: no "discovery env" warning, no panic; log reports `Successfully initialized netsim WiFi`, a WIFI
  wireless chip, AP `AndroidWifi`, then client association. Boot `sys.boot_completed=1` in ~55 s (previously 216 s
  with the panic and retries).
- Guest interface and default network: `wlan0 10.0.2.16/24` (DHCP), `Active default network: 101`; `lo`, `wlan0`
  and `eth0` are the only interfaces present.
- DNS and HTTPS against the only approved URL, `https://shiftrelay-hybridai-2026.web.app`: name resolves to
  `199.36.158.100`; the document loads over `h2`+TLS with `responseStatus: 404`
  (`PerformanceNavigationTiming` via CDP) and shows Firebase Hosting's "Site Not Found" page — the expected
  undeployed state, not app success. No other host was contacted and no AI/live-auth/membership call was made.
- Chrome first run (`com.android.chrome/…firstrun.FirstRunActivity`, build `149.0.7827.5`): the same
  "Make Chrome your own" screen with the ToS/usage-copy paragraph was read; *Manage* → "Make Chrome better"
  switch became `checked="false"` → *Done*; then *Stay signed out*. Verified afterwards in
  Settings → Google services: "Help improve Chrome's features and performance / Automatically sends usage
  statistics and crash reports to Google" is `checked="false"`, "Make searches and browsing better" is off,
  Settings still offers *Sign in* (not signed in), and `dumpsys account` reports `Accounts: 0`,
  `Active Sessions: 0`. No account was added and no sync exists.
- Mobile browser readiness for later hosted QA: Chrome `149.0.7827.5` (CDP `Browser.getVersion`), page viewport
  412x915 CSS px at `devicePixelRatio 2.625` (1080x2400 physical, `maxTouchPoints 5`, real touch input),
  CDP protocol 1.3, `agent-browser connect 9222` drove the device Chrome successfully, UA
  `… Android 10; K … Chrome/149.0.0.0 Mobile Safari/537.36` (Chrome's reduced UA). This remains an x86_64
  **Android OS emulator**, not a physical device.
- Deviations recorded rather than fought: the emulator raises `hw.ramSize=2048` to 4096 MB on this image
  ("Increasing RAM size to 4096MB", guest `MemTotal` 4007048 kB), and software GPU raised the `System UI isn't
  responding` dialog once, cleared by tapping *Wait* (a system dialog, never a legal prompt).
- Chrome 149 is behind the current stable release that `agent-browser` advertises; updating Chrome or the SDK is
  a download/licence change and was deliberately not attempted.

### Restart / observe commands for actual hosted QA

```powershell
$qa = "$env:TEMP\android-qa"; $adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
powershell -NoProfile -ExecutionPolicy Bypass -File "$qa\start-emulator.ps1"     # log: $qa\logs\emulator.log
& $adb devices                                                                   # expect one emulator-5556
do { Start-Sleep 10; $b = & $adb -s emulator-5556 shell getprop sys.boot_completed } while ("$b".Trim() -ne '1')
& $adb -s emulator-5556 shell "dumpsys connectivity | grep -m1 'Active default network'"   # expect a number, not none
& $adb -s emulator-5556 forward tcp:9222 localabstract:chrome_devtools_remote
agent-browser --session <name> connect 9222      # then snapshot/eval against the device Chrome
& $adb -s emulator-5556 forward --remove tcp:9222
& $adb -s emulator-5556 emu kill                 # userdata preserved; Chrome first run stays completed
```

The profile keeps its signed-out, reporting-off, network-capable state in `%TEMP%\android-qa\avd`; no other device
or profile (including the personal `Pixel_10_Pro` AVD) was started, read or modified, and the app stack's ports
5173/8080/9099 were never used.

### Remaining blockers

1. **Deployment.** The approved QA URL answers Firebase's `Site Not Found` 404, so no app flow, auth, membership
   or AI path can be exercised until the main session deploys and authorizes it.
2. Not exercised on purpose: live auth, Firestore membership, cloud AI, and any ordinary (non-QA) device data.
