# Demo recording plan (<= 3 minutes)

Status: plan only. No video, screenshot set, voice track or caption file exists. Nothing in this plan
was recorded, and no model call, task write or deployment was made to prepare it. Times below are
estimates that allow for real UI waits; they are not measured footage.

Scope: the required English, real-runtime demo for the Firebase #BuildHybridAI 2026 submission. Upload and
publication are separate approvals. This file does not clear a demo asset for publication; that review
remains future.

## 1. Story spine and what the video may claim

The required spine: a private shift note is captured and reviewed, shared as exact fields, accepted by a
named owner, and resolved, with the history visible. Reopening is optional and appears only if it fits.

Two AI paths appear, each only if the runtime that day actually produces the output on screen:

- local drafting, on `ONLY_ON_DEVICE`, shown only from a real approved capture with its provenance
  recorded;
- cloud reconciliation, optional and separately consented, shown only from a real approved capture.

Known correction to the earlier outline in `docs/PUBLISH.md` section 10. The one hosted consented cloud
request observed on November 23, 2026 returned a brief with zero suggestions
(`docs/verification.md` section 20). That is an inspected report, not footage. So no video may present a
duplicate or contradiction suggestion, a confirm or a dismiss from that run, and the script never promises
one. If a future run does return a suggestion, that is a new observation and needs its own record.

Not claimed anywhere in this video: Gemini Nano 4 identity as an independent fact, WCAG conformance,
a privacy pass, request latency, quota, coverage, or any comparison with another tool. Product usefulness
is unvalidated, so no impact, timing or competitive claim is made. See section 7.

## 2. Preconditions

Hard stops, from security and honesty. If one fails, stop and record the blocker.

1. Runtime and source are resolved at capture, not assumed. The hosted origin
   `https://shiftrelay-hybridai-2026.web.app` serves Hosting release `1795146753235000`, built from
   `00c2b2e`; verify it still serves that release before naming it. `71d0871` is the last reviewed
   candidate for a local run, so a build from it is produced and checked at capture time. Label each shot
   with the runtime actually on screen, and never claim the served build equals `71d0871`.
2. Demo-asset approval is separate and comes after capture. Recording a candidate does not clear it for
   publication.
3. Synthetic data only: the synthetic venue, two synthetic members, synthetic task text. No real names,
   phone numbers, addresses, shift rosters or message screenshots.
4. Credentials and identity stay out of frame. Sign in before recording starts, or type the password with
   the field masked and the autofill popup dismissed. No email address, user ID, password or token on
   screen, in captions, or in a window title.
5. Never capture a network panel, console, HAR, storage inspector, `.env` file, private config path, the
   App Check debug token or the reserved config endpoint. Raw capture can expose credentials even when
   nothing visible looks sensitive.
6. Actual output source for every claim on screen. Any new live cloud call must be explicitly scoped by
   master for that session. An earlier run, this script or the standing autonomy does not grant it. When
   it is included, use the shipped one-request consent path.
7. Local model availability is checked in the same session as the local shot. If it reports downloadable,
   unavailable or failing, take the hold point in section 6.

Recommended capture choices, not contracts: a clean desktop without a bookmarks bar, chat windows,
notifications or personal avatars; a window size and zoom that keep UI text readable at phone size, where
1080p is a convenient default; and no date on screen you would not publish.

## 3. Narration script

Planned delivery at roughly 150 words per minute. No voice track or video exists. The required rows total
310 words, reproducible with the command in section 8. The one optional inset row allowed is not part of
that total: N9b is 13 words (about 5.2 s of speech) and N10b is 16 words (about 6.4 s).

N1. "ShiftRelay takes a private shift note and turns it into tasks someone has accepted."

N2. "This is a handover at a community venue. The outgoing volunteer writes rough notes about what the
next shift needs. The incoming volunteer has to know exactly what they now own."

N3. "Two AI paths, kept apart. Drafting runs on this device. A cloud comparison happens only when a person
approves one exact packet, as a separate decision."

N4. "I sign in as a synthetic outgoing member, then type the note here. The app keeps it in page memory,
and only reviewed fields get shared."

N5. "Local drafting is optional. The model is set up only when I ask for it, and it reports on-device
output."

N6. "The drafts come back as proposals, not verified copy. I check the facts, remove a private aside, and
rewrite anything that is off."

N7. "Then I check the exact fields that will be shared, and share. The server confirms the open tasks and
clears the note from this tab."

N8. "The incoming member sees only the shared fields. Accepting makes them the named owner, at the next
version."

N9. "The incoming owner resolves it with a note. The resolution and its history stay on the task."

N9b, optional inset. "Reopening keeps the same owner and leaves the earlier resolution in the history."

N10. "Cloud reconciliation is separate. This preview is the exact packet: published fields only, no note
text. The checkbox approves one request, and nothing is written until I confirm."

N10b, optional inset, only if that result is filmed. "This run returned a brief with zero suggestions, so
there is nothing to confirm or dismiss."

N11. "Local drafting stays optional. With no model set up, the same form still works by hand, and nothing
is uploaded."

N12. "The commit and verifier report on screen are the record. Local drafting is proven locally, and one
hosted consented cloud exchange was observed. The served model behind that call is unknown, full release
validation is open, and accessibility coverage is partial. Whether this helps a real venue is
unvalidated."

N13. "The hosted build is running. Accepting a task is the action that matters."

## 4. Shot list

Times are estimates that include UI waits, not measured footage. Two quantities are kept apart: spoken
duration is a word-count estimate (310 words ÷ 150 wpm × 60 = 124.0 s), and total row duration is the
sum of the rows below. Each row already contains its speech plus its holds, so speech is never added to
a row sum again.

Exact arithmetic from the rows, at most one optional row:

- required rows only, cloud shot included: 8+23+20+11+16+14+10+20+12+22+8 = 164 s = 2:44 (all
  thirteen rows would be 180 s; minus the two 8 s optional rows). Of the 164 s, an estimated 124.0 s is
  speech and 40.0 s is holds and waits (164.0 − 124.0).
- one optional row: 164 + 8 = 172 s = 2:52. N9b's 5.2 s and N10b's 6.4 s of speech are already inside
  that 8 s row; do not add them again.
- cloud shot cut (no call scoped for the session): remove the 20 s N10 row, and N10b is unusable
  without it, so 164 − 20 = 144 s = 2:24, or 152 s = 2:32 with N9b.

Cut only by deleting a row, never by shortening a claim. The speech figures are estimates and are not
additive with the row sums.

The table is the base case: required rows only, cloud shot included, 2:44. An optional row is inserted
at the marked point, adds its 8 s and shifts every later row 8 s, giving 2:52.

| Time (est.) | Shot | Narration | Hold or cut |
|---|---|---|---|
| 0:00-0:08 | Title card, own text only | N1 | Hold the card 2 s before the first word |
| 0:08-0:31 | Signed-out screen; own split card naming the two paths | N2, N3 | Required; N2 and N3 stay in every case |
| 0:31-0:51 | Already signed in; type the synthetic note, request local drafting, wait for the real result | N4, N5 | Speed up typing at most 1.5x; never cut a form half-filled. Hold on the drafting state while it runs, capped by its real duration |
| 0:51-1:02 | Drafted cards as proposals: check a fact, remove the private aside | N6 | If the result is a refusal, say so and take the manual path |
| 1:02-1:18 | Show `Review exact shared fields`, share, show the server confirmation status | N7 | Required; the review fields and the share stay |
| 1:18-1:32 | Sign out, sign in as incoming, accept, show version and owner | N8 | Required; keep |
| 1:32-1:42 | Resolve with a synthetic note, show the recorded history | N9 | Required; keep |
| insert at 1:42 | Optional: reopen, show that the owner is unchanged | N9b | Optional inset; at most one optional row; drop it before cutting the accept or the resolve row |
| 1:42-2:02 | `Cloud reconciliation`, `Preview exact cloud packet`, approval checkbox, one send, the response on screen | N10 | Cut this whole shot if no call is scoped for the session, and rebalance the captions |
| insert at 2:02 | Optional: the response that is actually on camera | N10b | Only if the cloud shot is kept and the filmed response is a brief with zero suggestions; otherwise say the real outcome in N10 |
| 2:02-2:14 | Manual fields in use with local drafting left off, or the real unavailable state if that is what renders | N11 | Keep: it shows the manual path needs no model. Never stage a mock here |
| 2:14-2:36 | Evidence card | N12 | Keep: it carries the limits |
| 2:36-2:44 | Hosted URL and an accept action | N13 | Last frame is the real CTA |

Cut order if the runtime overruns: the conditional response row (N10b), then the cloud shot (which also
removes N10b), then the reopen. At most one optional row is used in any cut, and the required spine in
section 1 is never cut; N2, N3 and the split card stay in every case.

## 5. Caption and evidence-card cues

Captions are the verbatim English of the narration. Burn them in for the upload, and keep a sidecar copy
for the reviewer. Accessibility basics for this file: at most 42 characters per line, at most 2 lines, each
caption at least 1 s on screen and at least 1.5 s for a short line, no caption crossing a cut mid-word.

Evidence cards are short, own-text, no third-party logos:

| Card | Text | When |
|---|---|---|
| C1 | "Drafting: on this device" / "Cloud: one approved packet, one request" | Under N3, within 0.5 s of the words |
| C2 | "Shared fields only" plus the packet byte count read from the preview | Under N7 and N10; the count is captured from the run, never reused from an earlier one |
| C3 | The outcome that is on screen, for example "Returned: a brief, 0 suggestions" | Under N10, only if the shot is included |
| C4 | "Limits: served model unknown, release validation open, accessibility partial" / "Usefulness: unvalidated" | Under N12 |

Preserve app-owned wording on screen and in captions when quoting the UI: `Review exact shared fields`,
`Share handover`, `Task queue`, `Refresh shared tasks`, `Accept task`, `Resolve task`, `Reopen task`,
`Local drafting (optional)`, `Draft cards with on-device model`, `Use these suggestions`,
`Cloud reconciliation`, `Optional - separately consented`, `Preview exact cloud packet`,
`Exact outgoing packet (not sent yet)`, `I approve exactly this packet and one cloud request`,
`Send one cloud request`, and the mode banner "Live project on Hosting · synthetic data · App Check
reCAPTCHA Enterprise". Change none of these to a paraphrase.

## 6. Hold points and unavailable states

Rehearse these, then show whichever really happens. No mock is ever presented as a real result, and the
labelled test double (its panel prints that it is not a real cloud request) is cut rather than used as
proof.

- Local model not available on the recording machine: keep N11 and the manual path as the shot, drop N5,
  N6 and the drafted cards. The video then shows no local generation, and N12's local sentence goes too.
- Local generation returns a refusal, unusable text or fewer cards: show it, say what happened, and take
  the manual path. Do not re-roll until it looks better and do not splice two runs into one take.
- No call scoped for the session: drop shot 1:42-2:02 and N10 (and N10b, which has no response to show),
  keep the limits in N12, and rebalance captions so no caption describes something off screen.
- The filmed response is an error, a timeout or a brief with no suggestions: show the real state and say
  what came back. N10b is used only when that is what the response shows, and the confirm and dismiss
  controls are not shown at all, because they do not exist for that response.
- Hosted page fails to start or is unavailable: record the real closed state on the local build instead,
  label the runtime on screen, and do not film the hosted URL as working.

## 7. Claim limits carried into the video

- Product usefulness is unvalidated. No impact, time-saving, comparative or competitive statement appears
  in narration, captions or cards.
- No "Nano 4" identity claim beyond the sponsor-documented flag mapping already recorded. The only model
  entry recorded is `gemma4_gpu_low_tier_model` (`gemma4-2b-it`), observed once on loopback
  (`docs/adr/0006-nano4-runtime-proof.md`). The hosted local-model evidence is a delegate's inspected
  report, and its Gemma 4 provenance is inherited from that ADR 0006 localhost evidence, not re-measured
  on the hosted origin; no measured AI-host request exists (`docs/PUBLISH.md` §12,
  `docs/verification.md` §17).
- No WCAG, accessibility-pass or privacy-pass claim. Bounded contrast, zoom, touch and reader observations
  exist as separate records and are not summarised as a pass.
- App Check enforcement is proven at the service boundary by probe, not by the single hosted cloud call.
  The video says neither more nor less.
- The private note stays in page memory, and the shared packet carries only `id`, `version`, `title`,
  `detail` and `state`. That is a structural statement about the contract, and it is the strongest
  privacy sentence the video may use.
- No third-party music, logos, stock footage, memes or other third-party assets, and no font file is
  redistributed: the UI uses local system font stacks. Silent UI with English narration and captions is
  acceptable and is the plan.

## 8. Recording and caption QC, run before upload

- [ ] Runtime measured from the final file, not from this plan: at most 3:00, target at or under 2:55.
      Record the number in the handoff.
- [ ] Every shot traces to the section 2 prerequisites, and the runtime is labelled per shot where the
      hosted and local builds differ.
- [ ] UI text readable at phone size, no 1 px hairlines, no downscaled capture, no cursor hidden behind
      a control it is clicking.
- [ ] No personal data, no real names, no email address, no user ID, no token, no password, no console or
      network panel in any frame.
- [ ] No mock or simulated output shown as real; every model result on screen came from the run being
      recorded, in one take.
- [ ] Captions match the spoken words exactly, numbers and proper names included, at most 42 characters
      per line and 2 lines.
- [ ] The judge credential channel is not exposed: no password, sign-in link, invite, chat or message
      window in frame or in the captions or the description.
- [ ] Evidence card states the commit and the report it cites, and the limits list is present.
- [ ] No unsupported usefulness, timing, impact or comparison claim in narration, captions, cards, title
      or description.
- [ ] Asset review recorded, and public upload approved separately, before the file leaves the machine.

Reproduce the word counts behind the timing estimates:

```powershell
py -3 -c "import io,re;q=chr(34);b=io.open('docs/demo/README.md',encoding='utf-8').read().split('## 3. Narration script')[1].split('## 4. Shot list')[0];rows=re.findall('(?ms)^(N[0-9]+[a-z]?)[^'+q+'\n]*'+q+'(.*?)'+q+'(?=\n\n)',b);r=[x for x in rows if x[0][-1].isdigit()];o=[x for x in rows if not x[0][-1].isdigit()];print('required',len(r),sum(len(x[1].split()) for x in r));print('optional',[(x[0],len(x[1].split())) for x in o])"
```

This prints the two numbers the plan uses: the 13 required N-lines totalling 310 words (310 ÷ 150 × 60 =
124.0 s of estimated speech), and N9b/N10b at 13 and 16 words. Those speech estimates are not added to
the row sums in section 4, and no row is summed twice.

## 9. Next exact action

Master may approve this plan and record the demo as a routine local task under the standing autonomy; no
separate human plan-session sign-off is required. The recording session:

1. Resolves the runtime and source on screen, checks local model availability in that session, and writes
   both facts down before recording.
2. Decides whether the cloud inset is included. A new live call is scoped by master for that session
   explicitly; this script does not scope it.
3. Runs the spine once, end to end, without a retry loop, and records the screen.
4. Writes the narration and captions from sections 3 and 5, then runs section 8 and records the measured
   duration and every deviation.
5. Reports the file path, the measured duration, the artifact per shot and the deviations.

Unchanged by that autonomy: the in-product human review, share approval and cloud consent stay human
actions on camera; asset review, publication, legal acceptance, billing, destructive actions and
restricted tool actions keep their own permission. Upload is not part of this step.
