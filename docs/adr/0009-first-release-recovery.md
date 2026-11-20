# ADR 0009 — First-release recovery reference and deny-all containment candidate

Date: November 20, 2026. Status: **Decision recorded. The containment candidate is reviewer-approved for
semantics and local emulator proof only; it is not deployed, no recovery drill was run, and no restore is
tested or claimed.**

Scope: documentation only. This ADR is a Phase 8 decision artifact: it adds this file and nothing else. No
Rules, source, config, cloud resource, billing state, stage directory or sealed artifact was changed, and
nothing was committed, deployed or pushed. Local operational docs elsewhere in the worktree were left as
found.

## Context

- Reviewed, CI-green code release: `00c2b2ed78b1f43b01da430d7cca14699757d077` (`00c2b2e`).
- Prepared sealed QA stage (separate artifact-preparation session, not modified here):
  `C:\Users\acer\AppData\Local\Temp\opencode\shiftrelay-stage-qa-20261119-221754`
  (8 files: `dist/`, `firebase.json`, `firestore.indexes.json`, `firestore.rules`).
- Live Firestore Rules state at read-only preflight (November 20, 2026): **0 releases, 0 rulesets.** The live
  posture is the built-in closed default because Rules were never deployed. No previous ruleset exists, so no
  rollback target exists either.
- The repository `firestore.rules` at `00c2b2e` is the **reviewed proposal**, not live behaviour and not a
  backup. The only copy made during the preflight lived under temp storage and would not survive cleanup, which
  is why the byte-exact candidate is embedded here.
- Reviewer approval reference: session `ses_e0908dad0ffe2MIBCEN4qxxnC8` approved this candidate's semantics and
  its local emulator test proof. That approval does not authorize deployment.

## Decision

1. Keep the durable, byte-exact copy of the emergency deny-all containment candidate in this ADR, under the
   canonical extraction convention below.
2. Treat it strictly as **containment of client access**, not as a restore, not as a prior release, and not as
   evidence about what the hosted app does.
3. Any actual recovery is a **new Rules release**, and returning to application behaviour means deploying the
   reviewed application Rules again. No state of the never-deployed project can be "restored".

## Artifact identity

| Artifact | Bytes | SHA-256 | Status |
|---|---|---|---|
| Reviewed application Rules, repository (LF) | 18915 | `0b877ada93d38d0377c2c98695bbdafd1ff1b6c2138109201e7c25de482976d9` | Proposed source at `00c2b2e`; not live, never deployed |
| Reviewed application Rules, sealed stage (CRLF) | 19354 | `2aa81ebf67ef22b2680c0fca286f2e4506a264341177efd276e74f357adc0c91` | Prepared stage copy; content-identical to the row above after CRLF→LF normalization (verified); not deployed |
| Emergency deny-all containment candidate | 690 | `a217d884210709d68d3616ca9999465f2419bdd865724c195c462e4cc3763dd9` | Authored November 20, 2026; reviewer-approved semantics + emulator proof; not deployed |

### Canonical extraction convention

The candidate is the text of the fenced block labelled `firestore-rules` below. Extract it as: everything
between the opening fence line and the next line that is exactly three backticks; each block line is terminated
by a single LF, so the extracted byte sequence ends with exactly one LF and is 690 bytes. Equivalently:
`split the file on the two fence lines, take the middle section, and ensure it ends with one LF`.

Byte-exact copy (sha256 `a217d884210709d68d3616ca9999465f2419bdd865724c195c462e4cc3763dd9`, 690 bytes):

```firestore-rules
rules_version = '2';
// EMERGENCY RECOVERY CANDIDATE - authored 2026-11-20 for rollback safety. This is NOT a
// previously deployed ruleset and NOT the reviewed proposal in the repository.
// Behaviour: deny every client read and write, which preserves the live closed default
// (the project currently has zero Rules releases and zero rulesets). Admin SDK access is
// unaffected because it bypasses Rules.
// Reviewer approval is required before this is used as a recovery plan; deployment,
// release and restore remain untested and unclaimed.
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

## Semantics and limits

- Restores only the **closed client-access posture**: every client read and write under
  `/databases/{database}/documents/**` is denied, which matches the current built-in default.
- The Admin SDK (and any other Rules-bypassing privileged access) is unaffected, so administrative reads and
  out-of-band provisioning keep working.
- It changes no data: no membership, task, handover or activity document is created, updated or deleted.
- It does not restore a prior ruleset (none exists), does not reproduce the exact deployed state of a project
  that never had one, and does not establish hosted, App Check, hybrid or Nano 4 behaviour.
- Failing closed is the intent. If the app is live, clients stop at the first Rules-checked read.

## Recovery procedure — documented, not executed

1. Create a separate isolated recovery stage **outside** the repository, e.g.
   `C:\Users\acer\AppData\Local\Temp\opencode\shiftrelay-recovery-stage\`, holding only:
   - `EMERGENCY-DENY-ALL.recovery-candidate.firestore.rules` extracted from this ADR by the convention above;
   - `firebase.json` containing `{ "firestore": { "rules": "EMERGENCY-DENY-ALL.recovery-candidate.firestore.rules" } }`.
   Never extract into, deploy from inside, or otherwise modify the sealed QA stage from ADR-era preparation.
2. Verify the extracted file is exactly 690 bytes with SHA-256 `a217d884…63dd9`; stop if not.
3. With the existing authenticated operator session and a minimal child environment (allowlisted OS/runtime
   variables only, no inherited credentials, no debug logging of environment dumps), run from the recovery stage:

   ```powershell
   firebase deploy --only firestore:rules --project shiftrelay-hybridai-2026
   ```

   `--project` is explicit because this repository intentionally has no `.firebaserc`; the official CLI
   documents `deploy --only firestore:rules` and `--project`. A `--config <path>` flag is available if the stage
    config is not the default file.
    Leave any generated `firebase-debug.log` in the disposable recovery stage; never copy,
    stage or commit it with the recovery source or project records.
4. Returning to application behaviour is a second, separately approved deploy of the reviewed application Rules
   (`firestore.rules`, SHA-256 `0b877ada…` as LF; the sealed stage carries the same content as CRLF with
   SHA-256 `2aa81ebf…`), either from that stage or the repository:

   ```powershell
   firebase deploy --only firestore:rules --project shiftrelay-hybridai-2026
   ```

5. Never use `--force`, never accept new legal terms on the user's behalf, never enable billing or create a
   paid resource, and never delete a ruleset or release. Rules releases cannot be rolled back through the CLI
   (official documentation); each recovery step is a new release over the current rules.

## Evidence recorded

- Local validation through the repository's safe wrapper only, emulator-only, demo project, no cloud call:

  ```powershell
  py -3 scripts/firebase_safe.py emulators:exec --project demo-shiftrelay --only firestore "vitest run --config <temp>\vitest.config.mts"
  ```

  Result: `Test Files 1 passed (1)`, `Tests 5 passed (5)`, `Script exited successfully (code 0)`. Assertions:
  unauthenticated read denied, authenticated read denied, authenticated write denied, unauthenticated write
  denied, each asserting the `permission-denied` code, plus a Rules-disabled control proving the denial comes
  from the ruleset rather than a broken path. Tooling already pinned in the repository: vitest, Firestore
  emulator (cached jar), Temurin JDK 21, `@firebase/rules-unit-testing`. Reviewer session
  `ses_e0908dad0ffe2MIBCEN4qxxnC8` accepted this proof.
- Candidate bytes were re-verified against this ADR by extraction on November 20, 2026: 690 bytes and
  SHA-256 `a217d884210709d68d3616ca9999465f2419bdd865724c195c462e4cc3763dd9`, matching the source file exactly.

## Consequences and open items

- Durable: the candidate now survives temp cleanup and is reviewable in version control.
- Open: this ADR authorizes nothing. A live deploy requires explicit user confirmation of the concrete cloud
  action, plus a reviewer-approved recovery plan; the first release cannot restore a never-deployed state, and
  the CRLF/LF difference between stage and repository must be handled by content, not by byte hash alone.
