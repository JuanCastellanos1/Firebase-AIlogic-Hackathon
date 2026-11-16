# #BuildHybridAI 2026 — Official Rules Summary

Source: https://firebasehybridaihackathon.devpost.com/rules
Sponsor: Google LLC. Administrator: Devpost, Inc.
Total prize pool: **$30,000 USD**

---

## 1. What the hackathon is

A skill contest where Google publishes specific challenges and participants build a solution to one of them. Solutions are evaluated by judges against published criteria; prizes go to the highest scores.

By submitting an entry you accept the Official Rules — they form a binding legal agreement with Google.

---

## 2. Eligibility

You must:

1. Be above the age of majority in your country/state/province (at least 20 in Taiwan) at time of entry.
2. **Not** be a resident of, or an organization domiciled in: Brazil, Quebec, Crimea, Russia, Italy, Syria, Sudan, Belarus, Cuba, Iran, North Korea, or any country designated by the US Treasury's OFAC.
3. Not be a person/entity under US export controls or sanctions.
4. Have Internet access as of November 11, 2026.

Also ineligible: employees, interns, contractors, office-holders of Google, Devpost, or any organization involved in designing/producing/promoting/running the contest, plus their parent/subsidiary/affiliate companies, directors, officers, employees, ad & promotion agencies, representatives, agents — and their immediate family and household members.

Also ineligible: government agency employees, and anyone whose participation creates a real or apparent conflict of interest (at Sponsor/Administrator's sole discretion).

Entering on behalf of an employer/company is binding on both you and the employer; you warrant the entity knows, consents (including to prize receipt), and that participation does not violate internal policies or work-for-hire obligations.

Contest is void where prohibited by law.

---

## 3. Key dates (all Pacific Time)

| Phase | Window |
|---|---|
| Contest / Submission Period | Nov 11, 2026, 1:30 PM PT → Nov 30, 2026, 2:00 PM PT |
| Judging Period | Dec 10, 2026, 9:00 AM PT → Dec 16, 2026, 2:00 PM PT |
| Winners announced | On or around Dec 21, 2026, 12:00 PM PT |

Entrants are responsible for converting to their own time zone.

---

## 4. How to enter

1. Register on the Contest Site (firebasehybridaihackathon.devpost.com) with a free Devpost account. Registration means consent for Google/Devpost to collect and maintain your personal info to run and publicize the contest.
2. Pick one of Google's published challenges.
3. Build a project meeting the Project Requirements (section 6).
4. Submit via the "Enter a Submission" page, completing every required field, before the Submission Period ends.

### Google Account Quota (extra model access)

- Firebase AI Logic and Gemini Nano 4 are usable at no cost on the free tier — no purchase necessary.
- Additional access to billing-required models (e.g. image generation; list at firebase.google.com/docs/ai-logic/models) can be requested via the Quota Form: https://forms.gle/uPcDhaYW3iVo2AYw5
- An approved account is valid for **4 days** from issuance. There are **3 sprints**; a new request window opens each Monday.
- Approved developers get 1 account per entrant, per 1 project, per sprint; may re-apply in later weeks with a fresh project.
- Access is not guaranteed and is at Google's discretion.
- You are responsible for any fees accrued outside the provisioned quota (e.g. if you exceed the 4-day sprint limit).
- Quota request data is processed under Google's Privacy Policy; Google Cloud tools are subject to their own license agreements.

| Sprint | Request by | Account sent |
|---|---|---|
| 1 | Wed, Nov 11, 12:00 AM PT | Thu, Nov 12 |
| 2 | Wed, Nov 18, 10:00 AM PT | Thu, Nov 19 |
| 3 (final) | Wed, Nov 25, 10:00 AM PT | Fri, Nov 27 |

---

## 5. What to build

Build a **Gen AI application using Firebase AI Logic**, together with supported Firebase products such as App Check, Remote Config, Firestore, and Authentication.

Must target **at least one** of these platforms (multi-platform solutions are preferred):

| Platform | Requirement |
|---|---|
| **Web (Chrome)** | Integrate Gemini Nano 4 via Firebase AI Logic. Must support web apps or Chrome extensions. |
| **Android** | Integrate Gemini Nano 4 via Firebase AI Logic. |
| **iOS** | Integrate the Apple Foundation Models API for local execution via Firebase AI Logic. |

**Firebase AI Logic requires App Check.** Debug tokens are accepted.

The core idea (from the event description): on-device models are fast, private, and free — but not available on every device. The Hybrid Inference SDK runs prompts on-device when a local model exists and falls back to the cloud when it does not.

### Project team

- You may enter as an individual, a team, or on behalf of an organization.
- A team must consist only of eligible individuals, and every member must be added as a project member on Devpost.
- Teams/organizations must appoint one authorized Representative to act and submit on their behalf.

### Functionality

- Must install and run consistently on its intended platform, and function as shown in the video and/or described in the text.
- Must support English at minimum. All submission materials must be in English, or include an English translation of the video, text description, testing instructions, and all other materials.

### New vs. existing projects

- Projects must be newly created by the entrant, **or** — if they existed before the Submission Period — significantly updated after the period started.
- Standard dev tools are allowed: frameworks, libraries, starter templates, AI coding assistants.
- Any other pre-existing code or work incorporated must be disclosed.
- Must include a summary of what you built during the submission period.
- If a pre-existing app already has public usage: include a text description of the core value it brings to the new project, and optionally how widely it has been used.

### Third-party integrations

You must be authorized to use any third-party SDKs, APIs, data, or information, and comply with their terms/licenses.

### Testing access

- Provide access to a working project for judging/testing: a website link, functioning demo, or test build.
- If the site is private, include login credentials in the testing instructions.
- The project must be available free of charge and without restriction to the Sponsor, Administrator, and Judges until the Judging Period ends.
- Judges are not required to test the project — they may judge solely on the text description, images, and video.
- **Never include production API keys, live Google Cloud secrets, confidential commercial data, or PII** in the repository, submission form, or testing instructions.
- If the project runs on proprietary/third-party hardware not widely available (other than smartphones, tablets, desktop computers), Sponsor/Administrator may require physical access to the hardware on request.

### Multiple submissions

Allowed, but each must be unique and substantially different from your others, as determined by Sponsor and Devpost in their sole discretion.

### Ownership and IP

- Submission must be your (or your team's/organization's) original work, solely owned by you, with no other party holding any right or interest.
- Must not violate IP or other rights: copyright, trademark, patent, contract, privacy.
- You may hire a third party for technical assistance, provided the submission components are your work product, result from your ideas and creativity, and you own all rights.
- Open source software/hardware may be used if you comply with applicable licenses, and you must build software that enhances and builds on the underlying open source product.
- **Financial or preferential support:** the project must not have been developed, or derived from a project developed, with financial or preferential support from Google or Devpost — including funding/investment for its development, development under contract, or a commercial license from them before the end of the Submission Period. Violations may cause disqualification at Sponsor's sole discretion.

---

## 6. Submission requirements (checklist)

- [ ] Project built with the required developer tools, meeting all Project Requirements.
- [ ] Select at least one platform category. Sponsor/Administrator may reassign a submission to another category if applicable.
- [ ] Text description covering **how you used Firebase AI Logic**, a summary of features and functionality, and the value proposition.
- [ ] For existing apps: a summary of what you built during the submission period; for apps with public usage, a description of the core value the existing app provides to the new project (and optionally usage numbers).
- [ ] **Public code repository URL** on GitHub or GitLab, containing all source code, assets, and instructions needed for the project to work.
  - The repo must demonstrate Firebase AI Logic **used at runtime in the code** — imported and actually called (a library import, app/backend entry point, or a loaded agent/flow/MCP config) — not merely named in the README.
  - Must have an **open source license**; the license file must be detectable and visible at the top of the repo page (About section). Apache is preferred, but any open source license is acceptable.
- [ ] **Demonstration video**:
  - Shows the project functioning on the platform(s) it was built for.
  - **Maximum 3 minutes** — only the first 3 minutes are evaluated if longer.
  - Uploaded and publicly visible on YouTube, with the link on the submission form.
  - In English or with English subtitles.
- [ ] Optionally/strongly encouraged: a hosted project URL (web UI, Chrome extension, mobile app).
- [ ] Optionally/strongly encouraged: use Google IDEs (Antigravity, Android Studio, etc.) — any tool is fine as long as the implementation is Firebase AI Logic.
- [ ] Optionally/strongly encouraged: use coding agents with Firebase agent skills (compatible with Antigravity, Claude, etc.).

### Prohibited content

- Derogatory, offensive, threatening, defamatory, disparaging, libelous, inappropriate, indecent, sexual, profane, tortuous, slanderous, or discriminatory content; anything promoting hatred or harm against any group or person, or otherwise outside the theme and spirit of the contest.
- Unlawful content or anything violating applicable federal, state, or local laws in the country/state/territory where the video was created and in the United States.
- Third-party advertising, slogans, logos, trademarks, or anything implying third-party/commercial sponsorship or endorsement, as determined by Sponsor in its sole discretion.
- Anything violating a third party's publicity, privacy, or intellectual property rights.

---

## 7. Modifications

- **Drafts:** You may save draft submissions on Devpost before the Submission Period ends. After it ends, no changes or alterations to the submission are allowed, though you may keep updating the project in your Devpost portfolio.
- **After the Submission Period:** Sponsor/Devpost may permit changes to add, remove, or replace material that may infringe a third-party mark/right, discloses PII, or is otherwise inappropriate. The modified submission must remain substantively the same.
- Commits pushed to the code repository after the Submission Period ends will **not** be evaluated, except for written-permitted modifications above.

---

## 8. Judging

Sponsor and Administrator have sole right to determine eligibility and judging methodology. The process may use expert panels, peer review, automated AI-driven analysis, or any combination. Judges (Google employees or third parties) may or may not be listed, may change, and judging may run in multiple rounds with multiple panels.

### Stage One — pass/fail
Does the submission include all submission requirements, reasonably address a challenge, and reasonably apply the requirements?

### Stage Two — scored 1–5 per criterion, equally weighted, then averaged

1. **Technological Implementation** — How well is the project built, and how effectively does it use Firebase AI Logic hybrid inference as part of the solution?
2. **Design** — Does it deliver a complete, coherent product experience, not just a technical proof of concept?
3. **Potential Impact** — Does it make a credible, specific case for solving a real problem for a real audience, and does the demonstrated solution address it?
4. **Quality of the Idea** — Is it a creative, non-obvious use of Firebase AI Logic, and does the team show genuine understanding of the problem space?

### Winner selection

- Highest-scoring submission in each category becomes the potential category winner; the highest score across all categories wins the Grand Prize.
- Ties broken by comparing scores criterion-by-criterion in the order listed above; if still tied, judges vote.
- If a potential winner is disqualified, the next-highest score becomes the potential winner.
- A submission can win **one Grand Prize and up to one "Best of" category prize**.
- No entries in a category = no prize awarded for it.
- Judges' determinations are final and binding.

### Winner verification

- Award of a prize is subject to verification of the winner's identity, qualifications, and role in creating the submission.
- No one is a winner until post-competition prize affidavits/required documents are completed and verified — even if announced verbally or on the site.
- Potential winners are notified by email and must respond within **3 business days** of the first attempt, or they are disqualified and an alternate is chosen.
- Required documents (Declaration of Eligibility, Liability and Publicity Release, etc.) must be returned within **10 business days** of attempted notification, or the prize is forfeited and an alternate chosen.

---

## 9. Prizes

| Award | Cash | Extras | Qty |
|---|---|---|---|
| **Grand Prize Winner** | $10,000 | Interview, featured blog post, social media mention | 1 |
| **1st Runner Up** | $7,000 | Featured blog post, social media mention | 1 |
| **2nd Runner Up** | $4,000 | Social media mention | 1 |
| **Best iOS** | $3,000 | Social media mention | 1 |
| **Best Android** | $3,000 | Social media mention | 1 |
| **Best Web/Chrome** | $3,000 | Social media mention | 1 |

### Prize terms

- Cash prizes are paid to the individual winner, the winning team's Representative, or the organization. The Representative allocates the prize among members.
- Paid by mail or electronically **only after** receipt of the completed winner affidavit and required forms; delivered within **60 days** of receipt.
- Non-cash prizes have no cash value (ARV $0 USD) and are not redeemable for cash. ARV may be adjusted by country/jurisdiction.
- Odds depend on the number of eligible entries and entrant skill.
- No transfer, substitution, or cash equivalent, except at Sponsor's sole discretion. Sponsor may substitute a prize of equal or greater value.
- Prizes may carry restrictions/licenses and may require additional hardware, software, service, or maintenance — the winner bears those costs and compliance obligations.
- Contest Entities provide no warranties regarding prizes beyond any standard manufacturer warranty.
- Failure to provide correct information on the required forms may delay delivery, cause disqualification, or forfeit the prize.

---

## 10. Fees and taxes

- Winners (and all team/organization members) bear fees for receiving or using a prize, including wire and currency exchange fees.
- Winners are solely responsible for all federal, state, and local taxes.
- Payments require tax documentation: **IRS Form W-9** for US residents, **Form W-8BEN** for non-US residents (as applicable).
- Prizes are paid net of legally required withholding. Failure to provide tax documentation in time can mean forfeiture and an alternate winner.
- Winners must comply with foreign exchange/banking regulations and report prize receipt to relevant government agencies where required.
- Sponsor/Devpost/prize provider may withhold part of the prize to comply with US or winner-jurisdiction tax laws.

---

## 11. General conditions, IP license, publicity

### General

All federal, state, provincial, and local laws apply. Google may disqualify any entrant it reasonably believes attempted to undermine the contest through cheating, deception, or unfair play, or who annoys, abuses, threatens, or harasses other entrants, Google, or the Judges.

### Intellectual property

- Submissions remain the entrant's intellectual property; the entrant retains all intellectual and industrial property rights (including moral rights) in project materials and videos.
- **As a condition of entry**, the entrant grants Google, its subsidiaries, agents, and partner companies a **perpetual, irrevocable, worldwide, royalty-free, non-exclusive license** to use, reproduce, adapt, modify, publish, distribute, publicly perform, create derivative works from, and publicly display the project(s):
  1. to let Google, affiliates, and Judges evaluate the project for the contest; and
  2. in connection with advertising and promotion — including making screenshots, animations, and video clips available for promotional purposes.
- Generally commercially available software not owned by the entrant and procurable by Google without undue expense is excluded from that license.

### Publicity

By participating, entrants consent to promotion and display of their submission and to use of personal information (name, likeness, photograph, voice, opinions, comments, hometown, country of residence) by Sponsor, Administrator, and third parties acting for them, in any existing or new media worldwide, without further payment, consideration, or right of review, unless prohibited by law.

### Privacy

- Google may collect, store, share, and use PII from registration and the contest (name, mailing address, phone, email) per its Privacy Policy (google.com/policies/privacy), including to administer the contest and verify identity/address/phone for prize qualification.
- Data may be transferred outside the entrant's country, including to the United States, which may not have equivalent privacy laws.
- Refusing mandatory registration data may result in disqualification.
- Access/rectification/deletion requests: Partner-developer-marketing@google.com
- Devpost-collected entrant info is subject to Devpost's Privacy Policy (info.devpost.com/privacy).

### Warranty, indemnity, release

- Entrants warrant the submission is original, they are the sole owner and rights holder, and they have the right to submit and grant all required licenses.
- Entrants must not submit anything infringing third-party proprietary/IP/personal/moral rights (copyright, trademark, patent, trade secret, privacy, publicity, confidentiality) or violating applicable law, and warrant they have all necessary rights and licenses for any data used.
- Entrants indemnify and hold harmless the Contest Entities from claims, losses, damages, costs (including reasonable attorneys' fees) arising from the submission, misrepresentation, non-compliance with the Rules, third-party claims, and acceptance/use of a prize or participation.
- Entrants release Google from liability for Contest Site malfunctions, errors in collection/processing/retention of entry information, and typographical or other errors in printing, offering, or announcing prizes/winners.

### Elimination and internet

- False information about identity, address, phone, email, rights ownership, or non-compliance may result in immediate elimination.
- Contest Entities are not responsible for site malfunction or late, lost, damaged, misdirected, incomplete, illegible, undeliverable, or destroyed submissions due to system/network/hardware/software failures, transmission errors, traffic congestion, etc.

### Right to cancel or modify

If the contest cannot run as planned (virus, bugs, tampering, unauthorized intervention, fraud, technical failures, or anything corrupting administration/security/fairness/integrity), Google may cancel, terminate, modify, or suspend it, and may disqualify anyone who tampers with the submission process or site. Deliberate damage or undermining of the site violates criminal and civil law and may lead to damages claims.

---

## 12. Legal boilerplate

- **Not an offer of employment.** Submitting, winning, or anything in the Rules creates no employment relationship or contract with Google or the Contest Entities. Submission is voluntary, not in confidence or trust, and creates no confidential, fiduciary, agency, or implied-in-fact contract.
- **Governing law:** State of California, USA, excluding conflict-of-law rules. If a provision is invalid, the rest stays in force. To the extent permitted by law, entrants waive rights to litigate, seek injunctive relief, or pursue other judicial recourse.
- **Arbitration:** Exclusive jurisdiction for any dispute is binding arbitration through JAMS under its then-current rules in the San Jose, California area, before one mutually agreed arbitrator. Costs shared equally.
- **Devpost Terms of Service** (info.devpost.com/terms) are incorporated by reference; "Poster" there means "Sponsor" here. If they conflict, the Official Rules control for this contest.
- **Questions:** support@devpost.com

---

## Quick tactical checklist for a winning entry

1. Register on Devpost early; request Google Account Quota by the sprint deadline if you need billing-required models (Sprint 3 closes Wed, Nov 25, 10 AM PT).
2. Build with Firebase AI Logic + App Check, targeting Web/Chrome, Android, or iOS (multi-platform preferred).
3. Make hybrid inference **visible in the running code** — imported and called, not just mentioned.
4. Public GitHub/GitLab repo with an open source license visible in the About section, plus setup instructions.
5. English text description: Firebase AI Logic usage, feature summary, value proposition, and (if applicable) what you built during the period.
6. 3-minute-max public YouTube demo showing the app running on its platform, English or English subtitles.
7. Host a working demo and put credentials in the testing instructions; keep it live, free, and unrestricted through Dec 16, 2026.
8. No production keys, secrets, or PII in the repo or submission.
9. Submit before Nov 30, 2026, 2:00 PM PT — after that, no edits and no new commits are evaluated.
