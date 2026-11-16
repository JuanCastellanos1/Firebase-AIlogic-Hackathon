# Phase 1 — Seven actionable hybrid-AI concepts

Status: **ShiftRelay selected by the user.** Remaining Phase 1–3 framing is recorded in `docs/spec.md`, `docs/PLAN.md`, and root `CONSTRAINTS.md`; Gate A remains pending diagram evidence. Implementation is not authorized. Written November 16, 2026. Original comparison skills: brainstorming and idea-refine; interview steps are deferred to master under the delegation rules.

Selection update: use the React/TypeScript/Vite/Firebase direction in `docs/adr/0001-shiftrelay-stack.md`. Default Android delivery is responsive web, not a promised native build. Hardware, exact Nano 4 compatibility, hosted enablement, access/budget, and representative-user validation remain owned checkpoints in the specification. The comparison, recommendation, and questions below are retained as **pre-selection history**, not current authorization or unresolved concept selection.

## Decision frame

**How might we turn a messy real-world situation into a completed, verifiable action while keeping private working context on the user's device?**

The product must be web-first, use Firebase AI Logic at runtime with App Check, and have a credible Android path. The official cutoff is **November 30, 2026, 14:00 Pacific**, not a floating 15-day allowance. Working hours, team size, budget, credentials, and available devices are unknown. Complexity below describes relative scope, not a delivery promise. Preserve effort for testing, hosting, a public licensed repository, and a public demo of at most three minutes; access must remain available through December 16 [R1].

All audiences, pain intensity, differentiation, and outcome targets below are **hypotheses**, not validated research. These are distinct workflow bets, not claims of established novelty. No competitor or patent search was conducted.

## Technical evidence and common product boundary

Current official documentation retrieved through Context7 supports these statements:

- Web on-device inference uses Chrome's Prompt API. The documented baseline is Firebase JavaScript SDK v12.5.0+ and **Chrome Desktop 139+**; a browser version alone does not prove that a particular machine can run the model [T1].
- The documentation exposes on-device-only, cloud-only, and preference/fallback modes. Preference for local inference is **not a privacy guarantee** because fallback can transmit input [T1, T2]. No API syntax or package version is selected here.
- The retrieved web documentation lists local limitations including audio/video/PDF input, multi-turn chat, and tool use. Some image input is documented, but no concept depends on image recognition, OCR, voice, local tools, or local chat [T1].
- Native Android on-device inference is documented for Firebase AI Logic SDK v17.10.0+ on specific devices, through ML Kit's beta Prompt API. This is not evidence that an Android browser or WebView supports the desktop-local path [T3].
- The rules summary names Gemini Nano 4 as a platform requirement [R1]. The retrieved technical excerpts do not establish the exact model available on our hardware. Master must reconcile current challenge requirements, model identity, access, and actual hardware before feasibility approval. Documentation availability is not runtime evidence.

**Common proposed behavior, not yet implemented:** all seven concepts use short, single-turn **text** tasks. Local AI turns private notes into editable structured drafts. A separate cloud request sees only an explicitly reviewed, approved task packet and performs a wider comparison or synthesis. Rules and user confirmation—not AI—control dates, quantities, approvals, assignments, and completion. AI must never silently execute an external action.

**Consent and unsupported-local contract:** private capture uses a strictly local inference path, not a prefer-local fallback. If unavailable, downloading, failing, or unsupported, explain the state and offer manual structured entry. An optional cloud alternative requires a new, explicit review of exactly what will leave the device; declining must preserve the manual workflow. Redaction is editable assistance, never a guarantee. Consent to cloud inference is separate from consent to store or share data. Private originals are not sent to cloud storage, analytics, or diagnostic logs; only approved shared fields may be synchronized. Do not advertise whole-device secrecy or offline readiness without testing caches, downloads, storage, and network behavior.

**Why hybrid rather than a decorative badge:** the central design separates repeated, private capture from an intentional shared-data synthesis step. Local-only loses the cloud comparison step; cloud-only requires disclosure of private working context or manual structuring. If a concept's cloud task can be replaced by a tiny deterministic rule with equivalent value, use the rule and reconsider that concept's hackathon fit. Model quality and this division of value remain hypotheses to test.

**Android path for every concept:** keep a responsive, touch-friendly text workflow and portable domain records. Mobile web may offer manual entry plus separately consented cloud inference; do not promise mobile-local inference. A future native Android client could reuse record formats and workflow semantics, but needs separate SDK integration, hardware testing, and privacy validation. No native build or Android-category eligibility is promised.

## Ranked shortlist

Scores are planner judgments from 1–5 (5 is favorable), not measurements. Weights: completed-action impact **25%**, essential hybrid fit **25%**, feasibility under unknown capacity **25%**, three-minute demo clarity **15%**, and plausible differentiation **10%**. Feasibility includes safety, integration burden, and scope. The sponsor's actual four judging criteria are equally weighted; these weights are an internal selection aid, not their scoring formula [R1].

| Rank | Concept | Impact | Hybrid | Feasibility | Demo | Differentiation | Weighted / 5 |
|---|---|---:|---:|---:|---:|---:|---:|
| 1 | ShiftRelay — close the handover loop | 4 | 5 | 4 | 5 | 4 | 4.40 |
| 2 | RepairLoop — finish a repair intake | 4 | 4 | 4 | 5 | 4 | 4.15 |
| 3 | ReturnReady — complete a return packet | 4 | 5 | 3 | 5 | 3 | 4.05 |
| 4 | SurplusRelay — confirm a surplus pickup | 5 | 3 | 3 | 5 | 3 | 3.80 |
| 5 | DrillBack — demonstrate a corrected skill | 3 | 4 | 4 | 4 | 3 | 3.65 |
| 6 | AccessTask — agree an achievable work plan | 4 | 5 | 2 | 3 | 3 | 3.50 |
| 7 | GrantReady — assemble a complete application | 4 | 4 | 2 | 4 | 3 | 3.40 |

The top three cover different jobs: operational accountability, physical repair, and consumer evidence preparation. ShiftRelay leads because shared synthesis and private capture are both central, while the closure state is easy to demonstrate without outside APIs. RepairLoop is the strongest alternative if a concrete physical-world story matters more. ReturnReady has a sharp privacy story, but policy correctness raises delivery risk. Differences are small enough that access to actual users or local-capable hardware can reverse the ranking.

## 1. ShiftRelay — accountable handovers for community venues

- **Audience and problem:** volunteer coordinators and changing shifts at a community venue lose unfinished maintenance and supply tasks in informal messages. Start with non-emergency operations, not clinical or safety-critical handovers.
- **Completed action:** an outgoing volunteer creates an approved handover; an incoming volunteer accepts a named task and records its resolution. Success is a closed responsibility loop, not a generated summary.
- **Local versus cloud:** local AI extracts tasks and missing details from private rough notes without sharing interpersonal commentary. Cloud AI compares approved handovers against current open tasks to propose duplicate merges, contradictory status, and a concise incoming-shift brief. Humans accept merges and assignments; deterministic state prevents double acceptance.
- **Smallest complete MVP:** one venue, two authenticated roles, text capture, editable approved task cards, explicit sharing, suggested cross-handover reconciliation, accept/resolve/reopen states, and an activity record. Shared records require authorization; private notes remain outside them.
- **Compelling demo:** enter synthetic notes including a private aside and a repeated projector fault. Show local extraction, review the exact shared packet, reconcile the duplicate in cloud, then switch role to accept and close the repair. Demonstrate unsupported-local manual entry without uploading the original.
- **Measurable outcome hypothesis:** a newcomer can accept all three actionable items in a seeded handover within two minutes; every open item has an owner or an explicit unassigned state. Compare missed/duplicated items against the same notes without the product, not just summary quality.
- **Complexity:** medium. Two-role authorization, stale updates, and reliable state transitions are the main work; free-text extraction is not the hardest part. No external service is necessary beyond the selected Firebase services.
- **Key risks and cuts:** users may avoid a new handover tool; a private aside can leak through an accepted draft; cloud deduplication can merge unrelated tasks. Require source-linked suggestions and confirmation. Cut chat, calendar integrations, push notifications, multiple venues, scheduling, automatic assignments, and worker scoring. Kill or rerank if two representative coordinators cannot identify a recurring handover failure this closes.

## 2. RepairLoop — turn a broken item into an accepted repair job

- **Audience and problem:** community repair-cafe volunteers receive vague descriptions, then spend the appointment discovering missing basics or unavailable parts.
- **Completed action:** an owner submits a complete reviewed intake, a volunteer accepts a repair session, and the job ends with a recorded repaired/not-repaired outcome and returned-item acknowledgment. The product does not promise that every object can be repaired.
- **Local versus cloud:** local AI converts the owner's private story into symptoms, attempted fixes, and unanswered questions. Cloud AI compares the approved intake with a small, curated workshop capability/parts catalog to suggest clarifying questions and a session preparation card. Catalog facts and volunteer approval control acceptance; AI does not diagnose hazardous equipment.
- **Smallest complete MVP:** one workshop and one low-risk category, such as clothing or simple mechanical household items; text-only intake, approved sharing, curated catalog, volunteer acceptance, preparation checklist, and closure receipt. Slot capacity and stock counts are deterministic.
- **Compelling demo:** a synthetic broken backpack zipper starts as a messy note. The system notices a missing size, the owner supplies it, a volunteer checks available parts and accepts the job, then records replacement and return. Show a case the workshop cannot accept instead of inventing a solution.
- **Measurable outcome hypothesis:** all five seeded intake omissions are either supplied or explicitly marked unknown before acceptance; a volunteer can decide accept/decline without another unstructured message. Track intake completeness and accepted jobs closed, not unsupported landfill or cost savings.
- **Complexity:** medium. Catalog curation, role permissions, and completion are bounded; inventory synchronization and real booking integrations would substantially increase scope.
- **Key risks and cuts:** text may be insufficient; users may expect diagnosis, guaranteed fit, or verified savings. Human inspection remains necessary. Cut electronics, batteries, mains electricity, medical devices, AI repair instructions, image recognition, payments, external bookings, and procurement. Rerank if volunteers say photos or specialist diagnosis are indispensable even for the selected category.

## 3. ReturnReady — prepare and finish a consumer return workflow

- **Audience and problem:** consumers handling a damaged or incorrect online order struggle to reconcile their evidence with a retailer's stated return requirements.
- **Completed action:** the user builds a reviewed return packet, exports a ready-to-send request and checklist, then records submission and resolution. Export is verifiable in-app; actual delivery or refund is not claimed without evidence entered by the user.
- **Local versus cloud:** local AI structures a typed order narrative and replaces identifying details with editable placeholders. Cloud AI compares the approved anonymized case with a user-supplied policy excerpt, points to the relevant source sentences, and asks for missing evidence. Private identifiers are reinserted locally only after the cloud response.
- **Smallest complete MVP:** one damaged/incorrect-item scenario, plain-text policy paste, date/amount confirmation, evidence checklist with manual references rather than uploaded files, reviewed draft export, and submitted/resolved tracking. Store no retailer credentials.
- **Compelling demo:** a synthetic wrong-item delivery has an approaching deadline and a missing order reference. Complete the evidence, show the exact anonymized cloud packet, export the request, and mark submission. Include a policy that does not support the desired return: no fabricated entitlement.
- **Measurable outcome hypothesis:** the exported packet contains every mandatory field in three curated policy fixtures, and no private placeholder value appears in the captured cloud request. The deadline must be confirmed from a cited policy sentence rather than guessed.
- **Complexity:** medium-high. Policy ambiguity, dates, privacy boundary testing, and export quality matter more than the tracker. Initial policy fixtures must be synthetic, clearly labeled, and not presented as current retailer policy.
- **Key risks and cuts:** accidental personal-data leakage, deceptive documents, prompt injection inside pasted policies, and legal overclaiming. Treat pasted text as untrusted data; require verification and state no legal advice or refund guarantee. Cut inbox access, receipt OCR, automatic sending, retailer accounts, chargebacks, legal escalation, and automatic policy discovery. Reject a broad all-retailer assistant for this deadline.

## 4. SurplusRelay — allocate and confirm community surplus pickups

- **Audience and problem:** community gardens with harvest surplus and nearby community-kitchen coordinators lose usable produce when quantities, pickup times, and commitments do not line up.
- **Completed action:** a donor posts an available lot, a recipient reserves a quantity, and both record pickup. A declined or expired reservation releases stock.
- **Local versus cloud:** local AI structures private harvest notes into a proposed lot; cloud AI compares approved lots and recipient requests to suggest a feasible bundle and explain tradeoffs. Deterministic checks control quantities and time windows; AI cannot certify food safety.
- **Smallest complete MVP:** one community, a few explicitly approved participant records, text-only whole-produce lots, reservation/confirmation/release states, manually entered locations and times, and pickup acknowledgment.
- **Compelling demo:** two synthetic donors and two recipients have overlapping availability. Allocate without exceeding stock, then handle a cancellation and complete a replacement pickup.
- **Measurable outcome hypothesis:** zero over-allocation in seeded conflicting reservations; one complete pickup record with reconciled quantities. Claimed food saved requires actual pickup data, not generated estimates.
- **Complexity:** medium-high because multi-party state, cancellations, and adoption are substantial. Cloud matching may be unnecessary for a tiny catalog, weakening hybrid fit.
- **Key risks and cuts:** food safety, location privacy, unreliable pickups, and lack of real participants. Cut perishables needing cold-chain checks, delivery routing, payments, public maps, anonymous access, and automatic safety judgments. Prefer another concept if deterministic filtering solves the entire matching problem.

## 5. DrillBack — close a vocational practice gap with teach-back

- **Audience and problem:** adult learners in a community digital-skills class often leave a lesson without demonstrating that they can complete the taught task.
- **Completed action:** the learner practices, submits a teach-back, corrects an identified omission, and earns a rubric-based completion record confirmed by the instructor or explicit checklist. Not a high-stakes certification.
- **Local versus cloud:** local AI gives repeated private feedback on a short written explanation. With consent, cloud AI creates a second practice scenario from an approved gap summary and instructor rubric; it does not need the learner's private history. A fixed rubric and instructor review—not model confidence—control completion.
- **Smallest complete MVP:** one instructor-authored module, text practice, editable local gap summary, one cloud-generated retry, reviewed rubric items, and completion record. Example domain: preparing a clear support ticket using synthetic information.
- **Compelling demo:** a learner omits reproduction steps, privately practices, receives a changed scenario, and supplies all required fields on retry.
- **Measurable outcome hypothesis:** seeded learner responses trigger the intended missing rubric item, and the retry demonstrates that item. Count independent rubric completion, not learning gains inferred from one demo.
- **Complexity:** medium; bounded content and one learner role can keep scope small. Testing useful feedback is harder than implementing the screens.
- **Key risks and cuts:** inconsistent feedback, answer leakage, weak cloud necessity, and unvalidated pedagogy. Cut children, exams, voice, coding execution, course marketplaces, broad curricula, and certification claims. Rerank upward only if an instructor supplies a real rubric and agrees the retry is useful.

## 6. AccessTask — negotiate a doable work commitment without disclosing a diagnosis

- **Audience and problem:** adults with fluctuating energy or attention working with a volunteer coordinator need a realistic task arrangement without exposing health details.
- **Completed action:** a person privately translates constraints into a shareable availability/task proposal; a coordinator accepts or counters it, and both close the agreed deliverable.
- **Local versus cloud:** local AI translates private constraints into user-edited operational preferences without needing a diagnosis. Cloud AI compares approved task needs and preferences to propose a bounded agreement and flag conflicts. Humans decide workload and accommodation; AI does not evaluate health or employment suitability.
- **Smallest complete MVP:** one participant/coordinator pair, text-only private drafting, approved preferences, a few task choices, agreement/counterproposal, and completion tracking.
- **Compelling demo:** private context becomes an approved request for two short asynchronous tasks, a coordinator counters one deadline, and the participant accepts and completes the agreement. Show that the private explanation never enters the shared record.
- **Measurable outcome hypothesis:** two roles reach one explicit agreement with deliverable, owner, and deadline while a network capture contains none of the private health narrative.
- **Complexity:** high relative to the deadline: safety framing, consent design, sensitive-data risks, and real-user validation dominate an otherwise small workflow.
- **Key risks and cuts:** preferences may still reveal health information; coercive use or AI-based worker ranking could harm users. Keep disclosure voluntary and reversible before sharing. Cut diagnoses, medical advice, legal accommodation decisions, employer analytics, productivity scoring, and automatic matching. Do not choose without relevant user input and privacy review.

## 7. GrantReady — complete a community microgrant application packet

- **Audience and problem:** small volunteer groups miss microgrant opportunities because narrative, budget, and required evidence are assembled inconsistently.
- **Completed action:** a coordinator fills a source-linked application checklist, resolves budget inconsistencies, exports the complete packet, and records submission. No award or eligibility guarantee.
- **Local versus cloud:** local AI structures private planning notes into approved project facts. Cloud AI compares only approved facts and a pasted call for applications to identify unanswered requirements and propose a coherent draft. Deterministic arithmetic handles budgets; humans verify eligibility.
- **Smallest complete MVP:** one synthetic grant call, one application, manual evidence references, fixed budget table, reviewed gap checks, export, and submitted state.
- **Compelling demo:** a synthetic garden project starts with a missing permission and mismatched totals; the group resolves both and exports a packet with a complete checklist.
- **Measurable outcome hypothesis:** every required item in the fixture has a source-linked answer or explicit unresolved flag; export stays blocked on unresolved mandatory items and incorrect totals.
- **Complexity:** medium-high. Parsing arbitrary forms and real grant rules would exceed the bounded MVP; one template may appear too narrow and reduces differentiation.
- **Key risks and cuts:** invented credentials, confidential budget disclosure, changing calls, and inaccurate eligibility. Cut grant discovery, web scraping, document OCR, grant-portal automation, signatures, and automatic submission. Treat all pasted requirements as untrusted text. Rerank only with a real organizer who can validate this bounded workflow.

## Recommendation, without selecting for the user

**Recommend discussing ShiftRelay first, with RepairLoop as the concrete alternative and ReturnReady as the privacy-first alternative.** ShiftRelay offers the clearest closed loop: private capture → approved shared synthesis → explicit ownership → observed resolution. Its potentially distinctive feature is reconciliation across handovers with private drafting, not another chat interface. Existing task/handover products may already cover this; differentiation needs research.

Choose RepairLoop instead if access to repair volunteers makes intake validation easier, or if users respond better to an object visibly moving through a process. Choose ReturnReady only if the team accepts a narrower policy scope and stronger privacy/correctness testing. None is approved by this document. Do not start specification, scaffolding, or a prototype until master obtains the necessary user authorization.

### Feasibility unknowns and proposed decision evidence

These are follow-up investigations, not work performed or an implementation plan:

1. **Local runtime availability:** master verifies exact challenge/model requirements and access, then an authorized throwaway test runs a short text request on an available intended desktop. Record browser, OS, hardware, model availability/download state, failure behavior, and actual model identity where observable. No hardware means local-demo feasibility remains blocked.
2. **Privacy boundary:** after authorization, inspect network requests for private-only input, local failure, declined consent, and approved cloud input. Pass condition: no private original leaves through inference, persistence, or telemetry. Unsupported-local handling must remain usable manually. No privacy guarantee is established yet.
3. **Useful inference:** compare local extraction and cloud comparison against manual/deterministic baselines on synthetic cases including contradictions and missing fields. Measure factual errors and whether the cloud step improves a user decision. Abandon decorative AI rather than make the workflow more complicated to justify it.
4. **Audience and differentiation:** master arranges at least two short walkthroughs with representative users for the preferred direction and compares their current tools. This is a proposed lightweight signal, not market validation or an assumed resource.
5. **Capacity and portability:** master confirms available hours, team composition, budget, and Android expectations. Review mobile interaction requirements separately from native-local feasibility. Test any claimed Android capability on actual hardware before advertising it.

### Questions for master to relay to the user

Unanswered; continue comparison with the declared conservative assumption of one bounded workflow, text-only input, no paid integration dependency, and no native delivery commitment. This is a scope assumption, **not** an assumption of team size or free-service availability.

- Which of the top three audiences can you actually reach, and which problem do you most want to solve?
- What Chrome desktop and Android devices are available for testing, and can they download/run the required local model?
- How many people and working hours are available before the official cutoff, and what cloud budget/access is authorized?
- Does “portable to Android” mean a responsive mobile workflow with a credible future native port, or a working native Android submission now?
- Is the user comfortable with the reviewed-packet cloud-consent design, including a manual path when local inference is unavailable?

## Sources and evidence limits

- **[R1]** Existing `summary.md`, `docs/_project.md`, and `docs/_presupuesto.md`, read November 16, 2026. Official rules URL recorded there: https://firebasehybridaihackathon.devpost.com/rules . Rules were not independently re-fetched for this shortlist; master should recheck ambiguities before committing to eligibility or model requirements. `AGENTS.md` was also read; `docs/HANDOFF.md` was requested but does not exist.
- **[T1]** Firebase official documentation, *Build hybrid experiences in Web apps with on-device and cloud-hosted models*: https://firebase.google.com/docs/ai-logic/hybrid/web/get-started . Retrieved through Context7 `/websites/firebase_google`, November 16, 2026; covers desktop baseline, inference modes, and local limitations.
- **[T2]** Firebase official documentation, *Configuration options for hybrid inference in Web apps*: https://firebase.google.com/docs/ai-logic/hybrid/web/configuration-options . Same retrieval date/method; distinguishes cloud fallback configuration from local-only behavior. Defaults and SDK versions may change; no default model is pinned here.
- **[T3]** Firebase official documentation, *Build hybrid experiences in Android apps with on-device and cloud-hosted models*: https://firebase.google.com/docs/ai-logic/hybrid/android/get-started . Same retrieval date/method; supports only a conditional native-Android feasibility path, not universal device availability.

No code, scaffold, dependency installation, runtime SDK test, device test, user interview, market search, spec, plan, constraints file, commit, push, or Gate A completion is part of this artifact.
