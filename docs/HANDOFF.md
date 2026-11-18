# ShiftRelay — closure handoff (November 18, 2026)

## Stage and gates

User confirmed explicit safe closure: stop development, save work in a local WIP commit, write this handoff, and do not push/deploy/merge/delete. The branch and all work are preserved.

- **Gate A:** passed (real Mermaid render evidence).
- **Gate B:** implemented — three slices built; contracts, fixtures and tests coupled. Full verifier passed 16/16 checks at the last quiet run.
- **Gate C:** **not approved** — no independent reviewer verdict has been recorded.
- **Gate D:** **not approved** — no final QA deployment, hosted validation, PR merge or submission.

The product is functionally implemented and heavily tested locally, but it is **not submitted and not release-complete**.

## Git state

- Branch: `feat/hackathon-ideation` (not deleted).
- Local history (newest first): `2fd7fc5` `chore: wip shiftrelay` (45 files) → `b0910d3` `ci: verify Windows build and security gates` → `6cbfded` `feat: reconcile reviewed tasks with cloud consent` → `92379f9` `feat: add private on-device draft suggestions` → `b41b0a4` `feat: add verified manual handover workflow` → `538ed9f` `docs: establish ShiftRelay requirements` (root).
- Remote: `feat/hackathon-ideation` = `b0910d3`; `main` = `538ed9f`; `bootstrap/shiftrelay-requirements` = `538ed9f`. Default branch restored to `main`; repository is public. No PR, merge, tag or release was created.
- **The WIP commit `2fd7fc5` was NOT pushed.** Everything after `b0910d3` is local-only.
- Real GitHub Actions run `44222898293` for `b0910d3` completed with `conclusion: success` (verified via REST). That run covers only the pre-WIP source plus CI; it does **not** validate the WIP code.

## Artifacts

Product and contract: `src/`, `firestore.rules`, `firebase.json`, `docs/INTERFACES.md`, `docs/ARCHITECTURE.md`, `docs/spec.md`, `docs/PLAN.md`, `tests/`, `e2e/`.
Evidence: `docs/verification.md`, `.git/opencode/evidence.json`, `.git/opencode/secret-scan.json`, `.git/opencode/diagram-check.json`.
Decisions: `docs/adr/0001` stack, `0002` on-device feasibility, `0003` cloud setup, `0004` production App Check, `0006` Nano 4 runtime proof, `0007` App Check enforcement, `0008` Android QA.
Delivery: `docs/PUBLISH.md` (runbook, submission draft, demo shot list), `README.md`, `.github/workflows/verification.yml`, scripts `release_prep.py`, `check_dist.py`, `dev_live_local.py`, `firebase_safe.py`, `scan_secrets.py`, `verificar.py`.
Operational: `docs/_project.md`, `docs/_presupuesto.md`, `AGENTS.md`, `CONSTRAINTS.md`, `summary.md`.

## Decisions

- **Reviewer model: `opencode-go/qwen3.8-flash` (Qwen 3.8 Flash), not Claude Haiku.** Set this model explicitly on every reviewer/re-review delegation. Catalog was checked: no `qwen 3.8 flash` under the current provider; exact active ID is under `opencode-go`.
- English-only throughout. Free-tier/Spark only; never enable billing or accept new legal terms. Responsive Android web scope, not a native app.
- Three explicit runtime modes with no fallback: `emulator` (default), `live-local`, `hostedQA`. Real config lives outside the repo; no API key, debug token or QA password in source or `dist`.
- Security: emulator CLI runs through `scripts/firebase_safe.py` with a minimal child environment (raw Firebase CLI can dump host credentials into debug logs). Pinned Gitleaks scans the whole tree including ignored/untracked files, with no allowlist.
- App Check is **ENFORCED** for `firebaseml.googleapis.com`: valid token 200, missing/garbage token 401. The exposed localhost debug token was revoked and replaced.
- Nano 4 is proven locally via the sponsor-documented `Gemma 4 for Built-in AI` flag and genuine Firebase AI Logic `ONLY_ON_DEVICE` generation. Prior v3 evidence is not relabeled.
- Bugs fixed with regressions: 64→83-character derived activity IDs; observation target validated with `getAfter`; whole-`import.meta.env` bundling leak; shared `getAI()` option conflict; public-site-key classification proven by exact-literal isolation; CI UTF-8 env.

## Open questions / residual blockers

1. **Independent review verdict (Gate C)** has not been recorded. Required before any release.
2. **Hosted QA not executed**: Rules/Hosting not deployed; `/__/firebase/init.json` under the modular SDK is unproven (undeployed origin returned 404); in-browser reCAPTCHA attestation and App Check rejection not observed on the hosted build.
3. **Accessibility/manual checks**: screen reader, 200% zoom and physical Android touch not done. The isolated Android 17/emulator Chrome 149 AVD is ready (network fixed, first-run completed, signed out, reporting off) but is an x86_64 emulator, not physical hardware.
4. **AC15 usefulness** with two representative coordinators not validated. No impact claims.
5. **Demo video / YouTube / hackathon submission** require explicit user action; only a shot list and English submission draft exist. Judge credential delivery channel undecided.
6. **Production Rules call-budget caching** for five-card publication is emulator-only evidence, not production proof.

## Exact next step

From `2fd7fc5` on a clean tree: run the full verifier, regenerate evidence **after** the commit, write `.git/opencode/review.sha` and the review patch, then dispatch an independent reviewer **with `model=opencode-go/qwen3.8-flash`**. Fix/re-review all blockers; only then use the already-approved gated QA path (`scripts/release_prep.py build` then `stage`) and deploy reviewed Rules/indexes and Hosting with a minimal child environment. Verify hosted config, App Check and the AI paths empirically, close Gate C/D, then merge and prepare the submission with the user.

## Commands

```powershell
git status --short
git branch --show-current
Get-Content package.json
py -3 scripts/verificar.py --report .git/opencode/evidence.json
npm run scan:secrets
npm run build:qa
py -3 scripts/release_prep.py stage --project shiftrelay-hybridai-2026
```

No credentials in chat, source or logs. Never use unwrapped `firebase emulators:*` with an inherited environment. No push of the WIP commit was performed.

## Suggested skills

`verification-before-completion` for every gate claim; `code-review-and-quality` for the reviewer; `agent-browser` core guide before browser commands; relevant installed Firebase AI/Auth/Firestore/Rules/Hosting skills per task; `shipping-and-launch` for final delivery. Maximum three skills per artifact. No Firebase MCP configured.
