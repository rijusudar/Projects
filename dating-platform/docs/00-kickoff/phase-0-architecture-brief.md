# Phase 0 — Product & Architecture Kickoff Brief

| | |
|---|---|
| **Status** | Draft v0.1, for review |
| **Date** | 2026-10-07 |
| **Scope** | Planning and specification only. No implementation. |
| **Gate** | Pre-Gate 1 (inception) |
| **Next review** | After the open questions in [Section G](#g-open-questions) are answered |

**Markers used in this document**

- **[ASSUMPTION]**: a working assumption that needs confirmation.
- **[VERIFY]**: an external fact (competitor feature, store policy, regulation) to re-check with a dated source in Phase 1. These change often.
- **[LEGAL]**: needs review by qualified Indian counsel (and foreign counsel before expanding to other countries). Nothing here is legal advice.

---

## A. Executive Architecture Summary

### A.1 The product in one paragraph

We're building a dating app for people who want a relationship, launching first with urban Indian professionals. It's built around four things: stated intent, real identity, conversations that open on something specific in a profile, and recommendations that explain themselves. There's no endless swipe deck. Each person gets a limited, ranked set of full profiles every day and a daily budget of likes. They can attach a short comment to a specific photo or prompt. Nobody shows up in discovery until they pass a selfie liveness check. Every recommendation comes with plain reasons, like *"Both looking for marriage in 1–3 years · both vegetarian · ~4 km away"*. We never show a made-up "87% match". Safety and privacy show up as features people actually see and use.

### A.2 Differentiators (hypotheses to validate in Phase 1)

| # | Differentiator | What it means | Why it should matter |
|---|---|---|---|
| 1 | **Intent with a timeline** | Intent (Marriage / Long-term relationship / Dating with intent / Friendship first / Still figuring it out) plus an optional timeline. Compatible intent is a hard filter, and users re-confirm their intent from time to time. | Intent mismatch is a frequently cited frustration (to confirm in research). A one-time intent tag goes stale, so we re-confirm. |
| 2 | **Verified by default** | You must pass a selfie liveness check that matches your photos before your profile appears in discovery. | Fake profiles and scams are the main trust problem in this category. If the badge is optional, unverified profiles still get into everyone's feed. |
| 3 | **Specific likes** | A like can target one photo or prompt and carry an optional comment. It's free, within the daily budget. | Conversations start with context, and the budget keeps likes meaningful. |
| 4 | **Explainable matching** | We show the facts two people share. Any scores stay internal. | Builds trust and avoids pseudo-scientific percentages. |
| 5 | **Kind close** | One tap ends a conversation with a polite message, so the other person isn't ghosted. | Directly reduces ghosting, a common complaint. Cheap to build. |
| 6 | **Attention fairness** | Ranking limits how often any one profile is shown and accounts for unanswered inbound likes. | Stops likes from piling up on a few profiles, which hurts both the overloaded and the unseen. |
| 7 | **Recipient-controlled safety** | Users choose who can contact them and whether to require verified profiles. No unsolicited media. We nudge users when someone pushes to move off-platform early. | Puts control with the person most exposed to harm. Women-first by design, without being women-only. |

### A.3 Architectural direction (recommended, subject to the gates)

- **A modular monolith for the core domain.** It deploys as one backend with strict module boundaries. Each module owns its own PostgreSQL schema, and modules don't join across each other's tables.
- **Separate runtime processes** from the same codebase: a realtime gateway (WebSocket) for chat and presence, and background workers fed by a transactional outbox.
- **Buy commodity services, build the parts that carry trust.** Buy OTP/SMS, push delivery, liveness, image and text classification, store-billing receipts, email and observability. Build profiles, discovery and ranking, matching, messaging, safety and moderation, and admin.
- **Cross-platform mobile** (provisional: React Native, see E.4) and a React admin web app. Contracts come first: REST described in OpenAPI 3.1, with realtime and domain events in AsyncAPI.
- **Hosted in an Indian cloud region**, with no India-only assumptions built into the data model (phone formats, currency, locale, units, region). That keeps the global option open.
- **Deliberately not in MVP:** microservices, Kafka, Elasticsearch/OpenSearch, ML ranking, end-to-end encryption, multi-region, a consumer web app.

### A.4 How we'll measure success

- **North Star (proposed): weekly mutual conversations.** These are conversations where *both* people send at least *N* messages in a week (N≈5, to be calibrated). It measures what we promise, meaningful conversation, rather than engagement.
- **Guardrails:**
  - Reports per 1,000 conversations
  - Block rate
  - D30 retention for women and gender-minority users
  - Median time to first match for new verified users
  - How concentrated inbound likes are (a Gini-style index)
  - Share of discovery-visible profiles that are verified (target 100%)
  - Response rate to likes
- **Explicitly not optimized:** session length, profiles viewed per day, notification open rate.

### A.5 Assumptions in the brief that we challenge

| The brief says | Our position | Why |
|---|---|---|
| Email login | **Phone OTP is the primary login.** Verified email is for recovery and receipts. Google/Apple sign-in waits for V1.1 as a quick way to log back in. | A phone number limits people to roughly one account each. Email accounts are cheap to farm in bulk. On iOS, any third-party login also requires a privacy-focused login option such as Sign in with Apple [VERIFY]. |
| Admin: *Edit* user | **No free-form edits.** Admins take *scoped moderation actions*: remove a photo or prompt, reset a display name, force re-verification. Each needs a reason code. | Free-form edits enable impersonation and insider abuse, and they corrupt evidence. |
| Admin: Messages | **No browsing.** Admins can see messages only inside a moderation case opened from a report or a high-risk signal. Access is limited to that conversation, time-boxed and audited. | This is the most sensitive data we hold. Access has to be purpose-limited. |
| Admin: Matches | Admins can't browse who matched with whom. They see match data only in the context of a case. | Same reason. |
| Media in chat | **Not in MVP.** In V1.1 it comes back consent-gated, with automatic blurring of explicit images. | Unsolicited explicit images are a major harassment vector. Text-only chat removes a whole class of abuse and moderation cost at launch. |
| Compatibility percentages | **Shared-fact explanations instead.** Scores stay internal. | A percentage implies precision we don't have. |
| Identity verification | **Optional, in V2, after legal review.** | Use of Aadhaar by private entities is legally constrained [LEGAL]. DigiLocker-based consent flows are worth evaluating. |
| "Sprint 6: Safety, Sprint 7: Admin" | **Safety and admin ship in every slice.** | Photos can't go live without a moderation queue. Chat can't go live without block and report. Both app stores require report/block for user-generated content and in-app account deletion [VERIFY current guidelines]. |
| Match expiration | **No hard expiry.** We send soft nudges, and matches with no activity are archived automatically. Archiving can be undone. | Countdown timers create pressure and anxiety, which runs against "human-centered". |
| A separate "Admin Service", "Analytics Service" and "Subscription Service" | **Admin is a separate API surface over domain modules**, plus RBAC and audit. **Analytics is a pipeline**, not a domain service. **Payments and subscriptions are one billing & entitlements module** for MVP. | This avoids services with no domain of their own. |
| Analytics `message_sent` / `message_received` | Events never carry message content. Core events are emitted by the server, which is the source of truth. | Privacy, and the accuracy of the numbers. |

---

## B. Phase Plan

### B.1 Phases at a glance

```text
P0 Inception ─► P1 Research ─► P2 Product ══G1══╦═► P3 UX ════════════════════════G2══╗
                                                ╚═► P4 Architecture ═G3═► P5 Data ═G4═► P6 API ═G5═╣
                     P7 Security, Privacy & Trust (starts in P2, consolidates here) ═G6═╣
                     P8 Admin & Operations (reviewed within G6) ════════════════════════╣
                                                              P9 QA ═G7═► P10 MVP lock ═G8═╝
                                                                                    ║
P11 Foundation ─► P12 Vertical slices ─► P13 Hardening ─► P14 Closed beta ─► P15 Launch ─► P16 Iterate
```

The gates are sequential *decisions*, but the *work* overlaps. UX (P3) and Architecture (P4) run in parallel after Gate 1. Security work starts in P2 and runs through every later phase.

### B.2 Phase detail

| Phase | Objective | Key deliverables | Depends on | Exit criteria |
|---|---|---|---|---|
| **P0 Inception** | Align on vision, constraints and approach | This brief; docs skeleton; ADR and feature-spec templates; gate checklists; RACI; decision log. **Long-lead actions:** engage counsel, start TRAI DLT SMS registration, trademark search, shortlist liveness vendors | — | Open questions answered; counsel engaged; team, budget and timeline assumptions confirmed |
| **P1 Market & user research** | Build an evidence base for the differentiators | `competitive-analysis.md` (matrix + KEEP/IMPROVE/REJECT/CREATE); app-review mining report; 20–30 user interviews; regulatory register v1 (with counsel) | P0 | Each differentiator has evidence for or against it; personas validated or revised |
| **P2 Product definition** → **Gate 1** | Lock what we're building and why | Vision, principles (with their UX and architecture consequences), personas including bad-actor personas, journeys with edge cases, requirements (functional plus NFR v1), metrics, monetization model, community guidelines draft, roadmap v0 | P1 | **G1:** every requirement has an ID, priority, owner and draft acceptance criteria; intent taxonomy and MVP profile fields frozen; launch monetization model chosen |
| **P3 UX specification** → **Gate 2** | Design every MVP journey in full | Information architecture; screen inventory with all states; interaction spec; content design and microcopy; design-system foundations (tokens and core components); clickable prototype of the critical journey; usability tests (5–8 users per key persona); accessibility spec (WCAG 2.2 AA as the target) | G1 | **G2:** every MVP journey and edge case has screens, including empty, loading, error and offline states; usability findings resolved; originality review passed (no trade-dress resemblance to competitors) |
| **P4 System architecture** → **Gate 3** | Justify structure and technology | C4 context and container diagrams; module and service boundaries; ADRs 0002–0017 (see H.2); NFRs with numbers; capacity model from 10K to 10M users; build-vs-buy vendor shortlist; observability, environments and CI/CD outline | G1 (parallel with P3) | **G3:** every major choice has an ADR with the alternatives considered; capacity model shows the MVP architecture reaches ≥1M users, or names the triggers for changing it |
| **P5 Data architecture** → **Gate 4** | Define ownership, privacy and lifecycle for all data | ER model; data-ownership matrix; PII classification; retention and deletion schedule; account-deletion pipeline; indexing strategy; location-privacy model; analytics data model | G3 | **G4:** every entity has an owning module, a classification, a retention rule and defined deletion behaviour; counsel has reviewed retention conflicts |
| **P6 API & event contracts** → **Gate 5** | Stabilize the contracts so client and server work can run in parallel | API standards (versioning, RFC 9457 problem-details errors, cursor pagination, idempotency keys, rate-limit headers); OpenAPI 3.1 for the mobile and admin APIs; AsyncAPI for realtime and domain events; error catalog; mock server; contract-test plan | G4 | **G5:** contracts reviewed by mobile, admin, backend and QA; mocks unblock client work; breaking-change policy agreed |
| **P7 Security, privacy & trust** → **Gate 6** | Prove that abuse, privacy and security risks are controlled | Threat model (STRIDE for security, LINDDUN for privacy); abuse-case catalog; authN/authZ design; key and secret management; risk scoring and moderation workflow; enforcement matrix; incident response; privacy impact assessment; consent and notice design | Starts in P2; consolidates after G5 | **G6:** every abuse case maps to a control and a test; counsel has signed off notices, consent and retention; no high-severity threat left unmitigated |
| **P8 Admin & operations** | Treat the admin dashboard and moderation operations as a product | Admin dashboard spec; RBAC permission matrix; audit model; moderation playbook (SLAs, escalation, reviewer wellbeing); grievance-redressal workflow [LEGAL]; support tooling | P5–P7 | Reviewed within **G6** (admin is a security surface) |
| **P9 QA strategy** → **Gate 7** | Make every requirement objectively testable | Test strategy; Given/When/Then acceptance tests; traceability matrix; device and OS matrix weighted towards mid-range Android; load, security (SAST/DAST/pen test) and accessibility test plans; synthetic test-data strategy (never production PII) | G5, G6 | **G7:** 100% of MVP requirements have objective acceptance criteria and traceability |
| **P10 MVP lock & implementation plan** → **Gate 8** | Remove unnecessary complexity; plan the build | Final MVP / V1.1 / V2 table; vertical-slice backlog; sprint plan sized to the real team; launch criteria; beta plan | G1–G7 | **G8:** each MVP feature justifies itself against a persona and a metric; all gates signed |
| **P11 Foundation** | Build a *walking skeleton* through every layer | App → API → DB → worker → push; CI/CD; environments; observability; auth; feature flags; admin login with RBAC and audit | G8 | Deploy to staging on every merge; contract tests running in CI |
| **P12 Vertical slices** | Build features end to end, with safety and admin included in each slice | Provisional slice order: onboarding + photo moderation → verification → discovery & likes (+ block/report) → matching & messaging (+ chat report, unmatch) → notifications → moderation & grievance tooling → premium → analytics | P11 | Per slice: acceptance tests green, security and accessibility checks pass, admin support exists for the slice |
| **P13 Hardening** | Prove we're ready to launch | Load test at 3× expected beta peak; third-party pen test; privacy review; accessibility audit; failure drills; backup-restore test; store-review readiness | P12 | Launch criteria met |
| **P14 Closed beta** | Validate liquidity and safety in one market | One city, waitlist with gender-balance controls, moderation fully staffed, daily safety review | P13 | Safety metrics under thresholds; liquidity target met (e.g. X% of new verified users match within 7 days); crash-free sessions ≥ 99.5% |
| **P15 Launch → P16 Iterate** | Public launch, then V1.1 and V2 | Launch runbook; post-launch metric reviews | P14 | — |

**Duration indication [ASSUMPTION]:**

- **P0–P10:** roughly 8–12 weeks, with research, UX, architecture and security running in parallel. This assumes one PM, 1–2 designers, one architect, one trust & safety/privacy lead, and part-time counsel.
- **P11–P14:** depends on team size and skills (see question G1). I'll estimate it only once those are known.

---

## C. Competitive Analysis Plan

### C.1 Products in scope

| Tier | Products | Depth | Why |
|---|---|---|---|
| 1 | Aisle, Hinge, Bumble, Tinder, Coffee Meets Bagel | Full teardown | Named in the brief. Together they cover the main design patterns. |
| 2 | TrulyMadly, QuackQuack, Aisle's regional-language sister apps, OkCupid | Focused review | India-specific behaviour and pricing; OkCupid for question-based compatibility |
| 3 | Shaadi.com, Jeevansathi, BharatMatrimony | Focused review | Marriage-intent users (Persona B) compare us against matrimony platforms on verification, profile depth and family involvement |
| 4 | Grindr, Raya, Bumble BFF, event-led or "offline-first" social apps | Pattern review only | Location privacy and LGBTQ+ safety in hostile contexts; curation and waitlists; friendship mode; real-world meeting formats |

### C.2 Method

1. **Desk research.** Sources:
   - Help centres, community guidelines and safety centres
   - App-store listings for India
   - Pricing pages
   - Public filings (Match Group, Bumble Inc., and Info Edge annual reports for Aisle)
   - Transparency reports and press coverage

   Every claim gets a source link and an access date.
2. **Hands-on walkthroughs.** Team members use their own genuine accounts and observe only their own experience. **We will not create fake profiles, scrape, or message real users for research.** That breaks competitor terms and wastes real people's time, which contradicts our own principles.
3. **Voice of the customer.**
   - App-store reviews from Indian storefronts over the last 12 months, sampled per app and coded into a complaint taxonomy: fake profiles, paywalls, no matches, ghosting, safety, pricing, bugs.
   - Public forum discussions, used the same way.
4. **Primary research.**
   - 20–30 interviews across personas A–E, with women and LGBTQ+ users well represented.
   - A short prioritization survey.
5. **Pricing teardown.** Plans, durations, Indian price points, what's free vs paid, payment methods (including UPI).
6. **Safety teardown.** Verification flows, how many taps it takes to report, what blocking actually does, content controls, published enforcement policies.

### C.3 Evaluation rubric

Each product is scored 1–5, with evidence, on these dimensions:

- The dimensions listed in the brief: value proposition, audience, profile, discovery, matching, messaging, safety, verification, monetization, premium, UX strengths and weaknesses
- Five more: **intent clarity**, **trust signals**, **support for good conversations**, **fairness of the free tier**, **India fit**

### C.4 Outputs

1. The matrix requested in the brief: Product | Strength | Weakness | Adopt | Improve | Avoid.
2. A **KEEP / IMPROVE / REJECT / CREATE register.** Every idea in it is traced to a product principle, a persona and an MVP decision.
3. A complaint-taxonomy summary that feeds the requirements and the North Star.

### C.5 Originality guardrails

- We adopt **patterns**, not **expression**. "Comment on a specific profile element" is a generic pattern we can use. Layouts, visual identity, copy, iconography and branded feature names ("Roses", "Notes", "Standouts", "Beeline", etc.) are off-limits.
- Our feature names get a trademark search before they're adopted [LEGAL].
- Before Gate 2, a design review checks for trade-dress similarity.

### C.6 Preliminary hypotheses

These are starting positions to test in Phase 1, not conclusions. Every row is [VERIFY].

| Product | Known for | KEEP | IMPROVE | REJECT |
|---|---|---|---|---|
| Aisle | Intent-first and India-focused; paid messaging before a match; regional-language sister apps | Intent-first positioning; India-relevant profile fields; regional languages as a later direction | Making the first meaningful contact depend on payment: our specific likes with comments are free within the daily budget | — (pending research) |
| Hinge | Prompt-based profiles; likes and comments on specific content; outcome-oriented positioning | Comment on a specific element; prompts; measuring success by real-world outcomes | How "best pick"-style recommendations explain themselves; how much the free tier can see of incoming likes | Paid "stand out" consumables if they create pay-to-be-seen dynamics (evaluate) |
| Bumble | Women-initiate messaging (since relaxed in some form); match-expiry timers; photo verification; blurring of explicit images | Verification badge; blurring explicit images | "Who messages first" becomes a recipient-controlled setting, not a platform rule | Hard countdown expiry |
| Tinder | Liquidity and speed; the swipe deck; safety tools (date sharing, face verification) | Liveness-based face check; sharing date details | — | Infinite swiping, gamified mechanics, aggressive consumable upsells |
| Coffee Meets Bagel | A limited, curated daily batch; virtual currency | A bounded daily set | Liquidity in thin markets (backfill browsing when the curated set runs out) | Virtual currencies (they make pricing opaque) |
| OkCupid | Questions with acceptable answers and importance weights | That mechanism as a future compatibility signal | Show shared answers instead of a percentage | — |
| Matrimony platforms | Family involvement, deep biodata, verification | Selective depth of profile fields for marriage-intent users | — | Caste and horoscope matching (pending question G5) |

---

## D. Proposed MVP Scope (hypothesis)

**MVP purpose:** prove that in **one launch city**, verified people with compatible intent reach **mutual conversations** at a healthy rate, **safely**. Anything not needed to prove that is out.

### D.1 Launch blockers (needed for store approval or legal duty, whatever else is in scope)

These are all [VERIFY] (store policies) and [LEGAL] (law).

- In-app account deletion, plus a web URL for deletion requests (Google Play requires it).
- Report and block wherever users meet other users' content.
- Published community guidelines, privacy notice, terms, and grievance-officer contact details.
- 18+ age gate with abuse signals.
- Moderation of all user-generated content: photos, prompts, comments, messages.

### D.2 Scope table

| Area | Feature | MVP | V1.1 | V2 | Reason |
|---|---|:-:|:-:|:-:|---|
| **Identity** | Phone OTP sign-up/login (SMS; WhatsApp OTP fallback to be evaluated) | ✅ | | | Anti-abuse anchor; the norm in India |
| | Verified email (for recovery and receipts) | ✅ | | | Recovery path independent of the phone number |
| | Google / Apple sign-in | | ✅ | | Convenience only; brings store login requirements with it |
| | Sessions: "log out of all devices" | ✅ | | | Minimum account-takeover response |
| | Full device and session list | | ✅ | | Nice to have |
| | Phone-number change and recovery with a selfie re-check | ✅ | | | Numbers get recycled and SIMs get swapped (see risk R5) |
| **Profile** | Basics: first name, age from DOB, gender identity, who I want to see, approximate location, height, education, profession, languages, diet, drinking, smoking, kids (have/want) | ✅ | | | Core matching inputs |
| | Intent + timeline | ✅ | | | Our main differentiator |
| | Religion (optional field and filter) | ❓ | | | Pending question G5 |
| | 2–6 photos, 3 text prompts, interests (from a curated list), short "about" | ✅ | | | The content that conversations start from |
| | Pause / snooze profile | ✅ | | | Cheap; lets people step away instead of ghosting |
| | Voice and video prompts | | | ✅ | Moderation cost; not needed to prove the core |
| | AI profile and prompt feedback | | | ✅ | Avoid AI until the basics are proven |
| **Verification** | Selfie liveness + face match to photos (required for visibility, pending G6) | ✅ | | | Trust is the product |
| | Re-verification triggers (new photos, new device, risk signals) | ✅ | | | Stops "verify once, then swap photos" |
| | Work email / professional verification | | ✅ | | Valuable to Persona A/E; not core |
| | Government ID verification | | | ✅ | [LEGAL]; minimal storage design required |
| **Discovery** | Bounded daily ranked set, plus "more" within filters until the like budget runs out | ✅ | | | Quality over volume without starving thin markets |
| | Hard filters (age, distance, intent, gender) + a few dealbreakers | ✅ | | | Respect preferences |
| | "Why you're seeing this" (shared facts) | ✅ | | | Explainability from day one; simple rules |
| | Advanced filters (education, height, languages, …) | | ✅ | | Free or premium decided in monetization spec |
| | Values-question compatibility | | ✅ | | Needs content design and enough answers to work |
| | Travel / remote-location mode | | | ✅ | Global expansion feature |
| **Likes & matching** | Like a whole profile or a specific photo/prompt, with an optional comment (≈150 chars, screened before delivery) | ✅ | | | Better first conversations |
| | Pass | ✅ | | | — |
| | Daily like budget (number set by research) | ✅ | | | Makes likes meaningful; curbs spam |
| | Likes inbox (free: one at a time, in order) | ✅ | | | Transparent; no "blurred faces" teasing |
| | Mutual like → match + conversation, created atomically | ✅ | | | Core |
| | Unmatch | ✅ | | | Core safety control |
| | Undo last pass | | ✅ | | Premium candidate |
| | Priority like (premium consumable) | | ✅ | | Revenue; must not become pay-to-be-seen |
| | Auto-archive of inactive matches (can be undone) | | ✅ | | Replaces hard expiry |
| **Messaging** | 1:1 text + emoji, sent/delivered state, push | ✅ | | | Core |
| | Typing indicator | ✅ | | | Cheap once the WebSocket exists; droppable |
| | "Kind close" | ✅ | | | Cheap and differentiating |
| | Safety nudges (phone number or payment requests, links, "investment" talk, early pushes to move off-platform) | ✅ | | | Simple rules; addresses the main scam patterns |
| | Read receipts (user-controlled) | | ✅ | | Needs a privacy setting and research on anxiety effects |
| | Photos / GIFs / voice notes (consent-gated, blurred) | | ✅ | | Harassment vector; needs classifiers |
| | In-app voice/video call | | | ✅ | Safety value (meet virtually first), high cost |
| **Safety** | Block (from anywhere), report (profile, photo, prompt, like comment, message), unmatch | ✅ | | | Launch blocker |
| | Automated checks on photos (nudity, face present, duplicates or stolen images) and text (contact details, slurs, links) | ✅ | | | Volume makes manual-only moderation impossible |
| | Rate limits, velocity rules, device integrity (Play Integrity / App Attest) | ✅ | | | Bots and mass accounts |
| | Rule-based risk score v1 | ✅ | | | Sorts the moderation queues by priority |
| | Safety centre and dating-safety guidance | ✅ | | | Expected by users and stores |
| | Share date plan with a trusted contact | | ✅ | | High value; needs careful design |
| | Incognito (only seen by people I like) | | ✅ | | Privacy control; we lean towards free |
| | Hide from people I know | | | ✅ | [LEGAL]: involves processing non-users' contact data |
| **Notifications** | Push, in-app inbox, transactional email; per-category preferences | ✅ | | | Core |
| | SMS for OTP only | ✅ | | | Cost and DLT constraints |
| | Marketing / lifecycle campaigns (consent-based) | | ✅ | | Not needed to prove the core |
| **Monetization** | One subscription tier via App Store / Play billing | ⚠️ | | | **Off in closed beta, on at public launch**, pending G3 |
| | Consumables (boosts, priority likes) | | ✅ | | After liquidity is proven |
| | Direct UPI / web payments | | | ✅ | [VERIFY] store rules; [LEGAL] |
| **Admin** | SSO + MFA, RBAC, immutable audit log | ✅ | | | Launch blocker |
| | User search and view; suspend / ban / unban with reason codes; remove content; force re-verification | ✅ | | | Core moderation |
| | Moderation queues (photos, reports, failed verification) with case management | ✅ | | | Core moderation |
| | Grievance workflow with SLA timers | ✅ | | | [LEGAL] intermediary obligations |
| | Status of data-rights requests (export, deletion) | ✅ | | | Privacy compliance |
| | Read-only product dashboards | ✅ | | | Use a BI tool, not custom screens |
| | Subscription/refund lookup | ⚠️ | | | Only when payments go live |
| | Admin-managed content for prompts, interests and guidelines; feature flags | ✅ | | | Avoids app releases for content changes |
| **Platform** | iOS + Android; English UI; internationalisation-ready (strings externalised, Unicode names, layouts ready for longer text) | ✅ | | | Global-ready without the cost |
| | Hindi UI | | ✅ | | Validate demand first |
| | Other Indian languages | | | ✅ | — |
| | Consumer web app | | | ❓ | Not planned; re-evaluate after launch |
| | Accessibility at WCAG 2.2 AA level for mobile | ✅ | | | Principle; also a quality signal |
| **AI / ML** | Vendor classifiers for moderation only; rule-based ranking | ✅ | | | No ML required to prove the core |
| | Behaviour-based and ML ranking | | | ✅ | Needs data, fairness audits, governance |

### D.3 Admin roles

The brief's six roles are all specified at Gate 6. At launch, staffing will probably merge some of them:

| Role | MVP? | Scope summary |
|---|---|---|
| Super Admin | ✅ (2 named people, break-glass) | Role management and configuration. Elevated actions require a second approver. |
| Moderation Admin | ✅ | Queues, cases, content removal, suspend/ban (permanent bans need senior moderator approval) |
| Support Admin | ✅ | Account lookup, verification resets, data-rights requests; **no** message access |
| Operations Admin | ✅ (may be merged with Super Admin at first) | Content management, feature flags, prompts and interests |
| Finance Admin | ⚠️ when payments launch | Subscriptions, refunds, reconciliation; no profile or message access |
| Analytics Admin | ✅ | Aggregated dashboards only; no row-level PII |

---

## E. Architecture Options

### E.1 Architecture drivers (what the choice must satisfy)

| ID | Driver |
|---|---|
| D1 | **Trust & safety:** full access to our own data for moderation; evidence preservation; audit trail |
| D2 | **Privacy & regulation:** control over where data lives, retention, deletion and access |
| D3 | **Transactional integrity:** like → match → conversation is atomic, and a **block takes effect everywhere at once** (discovery, likes, chat, notifications) |
| D4 | **Realtime messaging** that holds up on Indian mobile networks |
| D5 | **Geo + multi-attribute candidate queries** with fairness constraints |
| D6 | **Small-team velocity** and low operational load |
| D7 | **Evolvability** to 10M users and to other countries |
| D8 | **Cost efficiency** in a low-ARPU market |

### E.2 Options

**Option A: modular monolith + realtime gateway + managed commodity services (recommended)**

```text
 ┌───────────┐  ┌─────────────┐                    ┌──────────────────┐
 │  iOS app  │  │ Android app │                    │  Admin web (SPA) │
 └─────┬─────┘  └──────┬──────┘                    └────────┬─────────┘
       │  HTTPS (REST) + WSS                                │ HTTPS · SSO + MFA
 ┌─────▼───────────────▼──────────────────┐        ┌────────▼─────────┐
 │ Public edge: CDN · WAF · rate limiting │        │ Admin edge       │
 └─────┬───────────────┬──────────────────┘        │ (zero-trust/VPN) │
       │               │                           └────────┬─────────┘
 ┌─────▼─────────┐ ┌───▼──────────────┐            ┌────────▼─────────┐
 │ Core API      │ │ Realtime gateway │            │ Admin API        │
 │ (public)      │ │ (WebSocket)      │            │ (separate deploy)│
 └─────┬─────────┘ └───┬──────────────┘            └────────┬─────────┘
       └───────────────┴──────────────┬─────────────────────┘
                 ONE CODEBASE, MODULES WITH OWN SCHEMAS
 ┌────────────────────────────────────▼──────────────────────────────────┐
 │ identity · profile · media · verification · discovery · matching ·    │
 │ messaging · notification · safety · moderation · billing/entitlements │
 │ · admin-access (RBAC, audit) · config/CMS                             │
 └───────┬─────────────────────────────────────────────────────┬─────────┘
         │ transactional outbox → managed queue                │
 ┌───────▼──────────────────────────────┐                      │
 │ Workers: media processing · moderation│                     │
 │ · notifications · ranking precompute  │                     │
 │ · deletion pipeline · analytics export│                     │
 └───────┬───────────────────────────────┘                     │
 ┌───────▼─────────────────────────────────────────────────────▼─────────┐
 │ PostgreSQL + PostGIS (schema per module) · Redis · Object storage+CDN │
 │ Analytics warehouse (pseudonymised)                                   │
 └───────────────────────────────────────────────────────────────────────┘
 Vendors behind adapters: SMS/WhatsApp OTP · APNs/FCM · liveness · image/text
 classifiers · store billing · email · crash reporting · observability
```

- **What it is:** one codebase with strict module boundaries, enforced by lint and architecture tests. It runs as several deployables: the public API, the admin API, the realtime gateway and workers.
- **Strengths:**
  - Like → match → conversation and block propagation are ordinary database transactions.
  - Fastest to deliver and lowest operational load.
  - Safe to refactor while the domain is still being learned.
  - Admin is separated at the network and deployment level without becoming a separate domain.
- **Weaknesses:**
  - Needs discipline to keep boundaries clean, enforced with automated checks.
  - One primary database eventually becomes the ceiling. It's fine to roughly 1M users with replicas and partitioning (see E.6).
  - A bad deploy affects everything. Mitigated with canaries and feature flags.

**Option B: microservices and event streaming from day one**

- **What it is:** 10–14 independently deployed services on Kubernetes, each with its own database, using Kafka for events.
- **Strengths:** independent scaling and deployment; fits large organisations.
- **Weaknesses:**
  - Like → match → conversation becomes a saga.
  - Block consistency becomes eventual, which is a safety bug.
  - Needs a platform team, and slows the MVP by months.
  - Boundaries get locked in before we understand the domain.
  - Higher cloud cost. **Rejected for MVP.**

**Option C: assembled from backend-as-a-service (Firebase/Supabase + a third-party chat SDK + an auth vendor)**

- **What it is:** a managed database, auth and realtime layer, with chat bought from a vendor.
- **Strengths:** fastest prototype; managed realtime.
- **Weaknesses:**
  - Complex ranking and geo queries are awkward or need extra services.
  - Moderation access to chat depends on the vendor.
  - Less control over data residency, retention and deletion.
  - Per-MAU pricing is punishing at low ARPU.
  - Migrating chat history later is painful.
  - Admin RBAC and audit must be custom-built anyway. **Rejected as the core.** Bought components are still used *inside* Option A where they're commodity.

| Driver | A: Modular monolith | B: Microservices | C: BaaS-assembled |
|---|---|---|---|
| D1 Trust & safety | ●●● | ●●● | ●○○ |
| D2 Privacy & regulation | ●●● | ●●● | ●○○ |
| D3 Transactional integrity | ●●● | ●○○ | ●●○ |
| D4 Realtime | ●●○ | ●●● | ●●● |
| D5 Geo + ranking | ●●● | ●●● | ●○○ |
| D6 Velocity / ops | ●●● | ●○○ | ●●● (early) / ●○○ (later) |
| D7 Evolvability | ●●○ (planned extraction) | ●●● | ●○○ |
| D8 Cost | ●●● | ●○○ | ●○○ at scale |

### E.3 Recommendation

**Option A.** Each module is extracted into its own service **only when an objective trigger fires**:

| Candidate to extract | Trigger |
|---|---|
| Messaging + realtime gateway | Connection count or message write rate degrades core API SLOs; or messages need a different datastore |
| Discovery & ranking | Candidate-generation latency exceeds the SLO after partitioning and replicas; or ranking needs a separate search/feature store |
| Notifications | Need for independent fan-out scaling or a separate release cadence |
| Any module | A separate team owns it and needs an independent deploy cadence (roughly 20–25+ engineers in total) |

### E.4 Provisional technology direction (decided through ADRs in Phase 4)

**Mobile: React Native (Expo, New Architecture, Hermes). Provisional, pending question G1.**

| Criterion | React Native | Flutter | Native (Swift + Kotlin) |
|---|---|---|---|
| Code sharing with the admin web and backend | High (TypeScript, shared generated API types) | Low (Dart only on mobile) | None |
| UI consistency and performance on mid-range Android | Good with the New Architecture; needs profiling | Very good and consistent | Best |
| Native SDKs (liveness, camera, billing) | Usually available; wrapper maturity varies [VERIFY per vendor] | Usually available; wrapper maturity varies [VERIFY] | First-class |
| Over-the-air updates for JS/content fixes | Yes (within store rules) | Limited | No |
| Hiring pool (India) | Large | Large and growing | Two separate pools |
| Cost for a small team | Lowest | Low | ~1.7–2× |

**Decision rule:** the team's existing skills outweigh marginal technical differences. If the team is mainly Flutter, choose Flutter, since both are fully viable for this product. Native is justified only with separate iOS and Android teams, and that isn't warranted for an MVP.

**Backend: TypeScript on Node.js with a module-oriented framework. Provisional.**

- It suits an I/O-bound modular monolith, shares types with the clients through OpenAPI generation, and has a wide hiring pool.
- **Kotlin + Spring Boot is equally strong** if the team is experienced on the JVM: stricter typing for complex domains and a mature ecosystem.
- **Go** is reserved as an option for an extracted realtime gateway, if connection scale ever demands it.

**Data**

- **PostgreSQL + PostGIS** as the system of record.
- **Redis** for rate limits, OTP throttling, presence and typing state, and feed caches.
- **Object storage + CDN** with private buckets and short-lived signed URLs.
- **No search engine in MVP.** Trigger: candidate queries miss their SLO, or filter complexity outgrows SQL.
- **No Kafka in MVP.** Use a transactional outbox with a managed queue.
- **A pseudonymised analytics warehouse** (vendor chosen in an ADR).

**API**

- **REST + OpenAPI 3.1**, with separate mobile and admin API surfaces.
- **WebSocket** for realtime, with REST sync as the source of truth.
- **AsyncAPI** for documenting events.
- **GraphQL rejected for MVP.** Field-level authorization and per-operation rate limiting are harder, and our screen shapes don't need it.

**Infrastructure**

- One cloud, with the primary region in India.
- Managed container runtime rather than self-managed Kubernetes for MVP.
- Infrastructure as code from day one.
- Separate cloud accounts/projects for production and non-production.

### E.5 Message confidentiality posture (needs its own ADR)

- **Recommendation for MVP:**
  - TLS in transit.
  - Encryption at rest.
  - Application-level encryption of message bodies, with keys only the messaging module and the case-scoped moderation path can use.
  - **Not end-to-end encrypted.**
- **Reasoning:** report-based moderation needs server-side evidence. With E2EE, every abuse investigation depends only on what the reporter chooses to submit, and pattern-based scam detection becomes impossible.
- Revisit for markets where expectations differ, and publish the position clearly in the privacy notice.

### E.6 Capacity envelope (rough; validated in Phase 4)

**Assumptions:** 25% of registered users are daily actives; ~16 messages per daily active user per day; peak traffic is 10× the average.

| Registered users | Daily actives | Messages/day | Peak message writes/s | Implication |
|---|---|---|---|---|
| 10K | 2.5K | ~40K | ~5 | One small instance per process; trivial database |
| 100K | 25K | ~400K | ~50 | 2–3 API instances; primary + one replica |
| 1M | 250K | ~4M | ~500 | Read replicas, a Redis cluster, a time-partitioned messages table; messaging extraction becomes likely |
| 10M | 2.5M | ~40M | ~5K | Messaging and discovery extracted; dedicated ranking/search store; a wide-column store for messages evaluated; multi-region for global |

The conclusion: **nothing up to about 1M users justifies starting with microservices.**

---

## F. Key Architecture Risks

| ID | Risk | Type | L | I | Mitigation | Owner phase |
|---|---|---|:-:|:-:|---|---|
| R1 | **Liquidity and gender imbalance.** Indian dating apps are widely reported to skew heavily male. | Product / market | H | H | Single-city launch; waitlist with gender-balance controls; like budgets; recipient controls; exposure caps; backfill rules; liquidity measured per cohort | P1, P2, P14 |
| R2 | **Fake profiles and scams:** romance and investment scams, sextortion (especially targeting LGBTQ+ users), and inflated-bill scams at date venues | Trust & safety | H | H | Required liveness check; device integrity; velocity rules; off-platform and payment nudges; a library of scam patterns; linking related accounts (device, photo hash, payment); fast takedown | P7 |
| R3 | **Regulatory change and conflicting obligations.** See the breakdown after this table. | Regulatory | M | H | Counsel in P0; regulatory register; design for full DPDP compliance at launch whatever the phase-in date; separate retention vault with legal hold | P0, P5, P7 |
| R4 | **Exposure of highly sensitive data:** sexual orientation, religion, precise location, messages, selfies/biometrics | Security / privacy | M | Very H | Data minimisation; **location fuzzing** (published research has repeatedly shown that precise distance displays allow trilateration: snap to a grid, round distances, never return coordinates); application-level encryption; case-scoped admin access; no retention of biometric templates; pen test | P5, P7 |
| R5 | **Account takeover** through SIM swap or **recycled phone numbers** (operators reassign inactive numbers [VERIFY timelines]) | Security | M | H | Step-up selfie check on a new device; email as a recovery factor; new-login alerts; dedicated number-change flow | P7 |
| R6 | **OTP cost, deliverability and SMS-pumping fraud;** TRAI DLT registration lead time | Ops / cost | H | M | Start DLT registration in P0; two SMS providers with failover; evaluate WhatsApp OTP; rate limits per number, IP and device | P0, P7 |
| R7 | **Realtime and push reliability** on Indian networks; Android OEM battery management that kills background delivery | Architecture | H | M | The server is the source of truth; sync when the app opens; idempotent send with client-generated message IDs; push treated as a hint; test on an OEM device matrix | P4, P9 |
| R8 | **Moderation operations:** cost, 24/7 coverage, Hinglish and regional-language text where off-the-shelf classifiers are weak, reviewer wellbeing | Ops | H | M | Risk-ranked queues; automated triage; evaluate classifiers on code-mixed samples; decide in-house vs outsourced (G8); wellbeing protocols | P7, P8 |
| R9 | **Store billing and pricing constraints** (commissions, India billing-choice rules, UPI mandates) | Business | M | M | Server-side entitlements behind a billing abstraction; check current store rules [VERIFY] | P4 |
| R10 | **Unfair or manipulative ranking:** attention concentration, demographic bias | Product / ethics | M | M | Exposure caps; fairness metrics per cohort; **no attractiveness scoring**; ranking audits before any ML | P4, P5 |
| R11 | **Over-engineering and scope creep** | Delivery | M | H | Gates; the MVP challenge table; objective extraction triggers | All |
| R12 | **Tech choices that don't fit the team's skills** | Delivery | ? | H | Technology ADRs stay provisional until G1 is answered | P4 |
| R13 | **Under-18 users** misstating their age | Safety / legal | M | H | Age gate; under-age signals; an "appears under 18" report category with a priority queue; liveness age estimation as a *signal only* [VERIFY vendor capability, LEGAL on use] | P7 |
| R14 | **Vendor dependence** (liveness, OTP, classifiers) | Architecture | M | M | Adapter/port per vendor; dual vendors for OTP; contractual commitments on data processing and residency | P4 |
| R15 | **Trade-dress and trademark conflict** from drawing inspiration from competitors | Legal | L | M | Originality guardrails (C.5); trademark search | P1, P3 |

**R3 in detail:**

- **DPDP Act 2023 and DPDP Rules 2025.** The rules were notified in November 2025 with a phased timeline. Reported core obligations apply about 18 months later, around our likely launch window [VERIFY][LEGAL].
- **IT Rules 2021 intermediary duties.** These cover a grievance officer and response timelines. Further obligations apply once user counts cross a threshold [LEGAL].
- **CERT-In directions (2022).** Short incident-reporting windows and log retention in India [VERIFY][LEGAL].
- **Retention vs erasure.** Mandated retention after an account closes conflicts with the right to erasure [LEGAL].
- **Aadhaar restrictions** on use by private entities.
- **Store policy changes.**

**Major unknowns:**

- Team size and skills
- Launch city
- Budget per user for vendors (liveness and OTP dominate it)
- Willingness to monetize at launch
- Counsel's position on intermediary classification and retention

---

## G. Open Questions

These are only the questions whose answers change the product or the architecture.

| # | Question | What it decides | My recommendation |
|---|---|---|---|
| G1 | **Team and constraints.** Team size and skills (mobile: RN, Flutter or native; backend: TypeScript, JVM or Go)? In-house or agency? Target launch date and budget envelope, including vendor spend per user? Any existing cloud accounts or credits? | Mobile and backend ADRs; sprint plan; vendor tier; cloud choice | Pick the stack the team already knows well |
| G2 | **Launch geography.** Which city first? Is there an existing community, waitlist or acquisition channel? | Liquidity strategy, ranking cold start, moderation staffing, infra size | One metro, waitlist-gated |
| G3 | **Monetization at launch.** Revenue from public launch, or growth first? | Whether billing and finance admin are in MVP | Free closed beta; one subscription tier at public launch |
| G4 | **Inclusivity.** Support LGBTQ+ and non-binary users from launch? | Data model, matching logic, safety model (extortion risk), copy | **Yes.** Retrofitting is costly and exclusionary. |
| G5 | **Religion / community / caste.** Which fields and filters, if any? | Product principles, data model, sensitive-data handling, brand | Religion as an optional field with an optional filter; **no caste field or filter**; no horoscope matching |
| G6 | **How strict verification is.** Selfie liveness required before the profile is visible, required only before messaging, or an optional badge? | Onboarding conversion vs trust; vendor cost per user | **Required before visibility** |
| G7 | **How far towards matrimony.** "Dating with serious intent", or include matrimony features (family access, biodata, horoscope)? | Positioning, scope, data model, privacy design | Dating with serious intent; consider consent-based family sharing in V2 |
| G8 | **Moderation operations.** In-house or outsourced reviewers? Coverage hours at launch? Which languages in moderation? | Admin tooling, SLAs, classifier choice, cost | In-house senior moderators + an outsourced tier-1 queue; 16h coverage at beta, moving to 24/7 at launch |
| G9 | **Legal readiness.** Is Indian privacy/IT counsel engaged? Is there an Indian legal entity? Who will be the grievance officer? | Gates 4 and 6 can't pass without this | Engage counsel during Phase 0 |
| G10 | **Brand.** Is there a name and brand identity, or is that part of the UX phase? | Design-system start point; trademark search | — |

---

## H. Proposed Documentation Structure

### H.1 Repository layout

This extends the brief's structure. Additions are marked `+`.

```text
dating-platform/
└── docs/
    ├── README.md                          + index, document status, gate status, conventions
    ├── 00-kickoff/
    │   └── phase-0-architecture-brief.md  + this document
    ├── product/
    │   ├── product-vision.md
    │   ├── product-principles.md          + each principle → UX and architecture consequences
    │   ├── competitive-analysis.md
    │   ├── personas.md                    (including bad-actor personas)
    │   ├── user-journeys.md               (including edge cases)
    │   ├── requirements.md                (FR-/NFR- IDs)
    │   ├── metrics.md                     + North Star, guardrails, KPI definitions
    │   ├── monetization.md
    │   ├── mvp-scope.md                   + MVP / V1.1 / V2 table with reasons
    │   ├── roadmap.md
    │   └── glossary.md                    + shared vocabulary (like, match, connection…)
    ├── features/                          + one folder per feature, following the spec chain
    │   └── FEAT-###-<slug>/spec.md          (requirement → stories → AC → UX → ADR → API →
    │                                         data → security → test contract → plan)
    ├── ux/
    │   ├── ux-principles.md
    │   ├── information-architecture.md    +
    │   ├── design-system.md
    │   ├── screen-inventory.md
    │   ├── interaction-specification.md
    │   ├── content-design.md              + voice, tone, microcopy, safety copy
    │   └── accessibility.md               +
    ├── architecture/
    │   ├── system-architecture.md         (C4 context + container)
    │   ├── service-boundaries.md
    │   ├── data-architecture.md
    │   ├── security-architecture.md
    │   ├── threat-model.md                + STRIDE + LINDDUN
    │   ├── matching-engine.md
    │   ├── messaging.md
    │   ├── notifications.md
    │   ├── media-pipeline.md              +
    │   ├── payments-and-entitlements.md   +
    │   ├── analytics-architecture.md      +
    │   ├── non-functional-requirements.md +
    │   ├── observability.md               +
    │   └── environments-and-delivery.md   +
    ├── trust-safety/                      +
    │   ├── community-guidelines.md
    │   ├── abuse-case-catalog.md
    │   ├── risk-scoring.md
    │   ├── enforcement-matrix.md
    │   └── moderation-playbook.md
    ├── compliance/                        +
    │   ├── regulatory-register.md
    │   ├── privacy-impact-assessment.md
    │   ├── data-retention-schedule.md
    │   ├── consent-and-notices.md
    │   └── legal-review-log.md
    ├── api/
    │   ├── api-standards.md               + versioning, errors, pagination, idempotency, rate limits
    │   ├── api-specification.md
    │   ├── error-catalog.md               +
    │   ├── openapi/                       +
    │   │   ├── mobile-api.v1.yaml
    │   │   └── admin-api.v1.yaml
    │   └── asyncapi/                      +
    │       ├── realtime.v1.yaml
    │       └── domain-events.v1.yaml
    ├── admin/
    │   ├── admin-dashboard.md
    │   ├── rbac-matrix.md                 +
    │   └── audit-logging.md               +
    ├── qa/
    │   ├── test-strategy.md
    │   ├── acceptance-tests.md
    │   ├── traceability-matrix.md         +
    │   └── device-matrix.md               +
    ├── decisions/
    │   └── ADR-####-<slug>.md
    ├── gates/                             +
    │   ├── gate-checklists.md
    │   └── gate-<n>-review.md             (sign-off record per gate)
    └── templates/                         +
        ├── adr-template.md
        └── feature-spec-template.md
```

### H.2 Initial ADR backlog

| ADR | Decision | Phase |
|---|---|---|
| 0001 | Record architecture decisions (format, lifecycle, who approves) | P0 |
| 0002 | Modular monolith with extraction triggers | P4 |
| 0003 | Mobile framework | P4 (after G1) |
| 0004 | Backend language and framework | P4 (after G1) |
| 0005 | PostgreSQL + PostGIS as system of record; schema-per-module ownership | P4 |
| 0006 | Realtime transport; build vs buy chat | P4 |
| 0007 | Async processing: transactional outbox + managed queue (no Kafka in MVP) | P4 |
| 0008 | Cloud provider and primary region | P4 (after G1) |
| 0009 | Identity: phone OTP, token/session model, build vs buy auth | P4 / P7 |
| 0010 | Message confidentiality posture (no E2EE in MVP) | P7 |
| 0011 | Liveness / verification vendor and biometric data handling | P7 |
| 0012 | Billing & entitlements (store billing, server-side entitlements) | P4 |
| 0013 | Location privacy model (grid snapping, distance rounding) | P5 |
| 0014 | Analytics pipeline and pseudonymisation | P5 |
| 0015 | API style: REST + OpenAPI 3.1; WebSocket + AsyncAPI | P6 |
| 0016 | Defer search engine; candidate generation in SQL | P4 |
| 0017 | Feature flags and remote configuration | P4 |

### H.3 Documentation conventions (proposed)

- **Every document has a header:** status (`Draft` / `In review` / `Approved` / `Superseded`), owner, gate, last-reviewed date.
- **Requirement IDs:** `FR-<AREA>-###` and `NFR-<AREA>-###` (for example `FR-MATCH-004`). Abuse cases use `AC-ABUSE-###`.
- **Traceability chain:** requirement → user story → acceptance criteria → API operation ID → test ID. It's maintained in `qa/traceability-matrix.md`.
- **Contracts are the source of truth.** Prose in `api-specification.md` explains the OpenAPI/AsyncAPI files and never redefines them.
- **Gate sign-off is recorded** in `gates/` with the reviewers (product, architecture, design, security/privacy, QA, and counsel where relevant) and any conditions.

---

## Next steps (once this brief is reviewed)

1. Answer the open questions in Section G, or confirm the recommendations.
2. Create the documentation skeleton and templates (documentation only, no code).
3. Start Phase 1 research. In parallel, start the Phase 0 long-lead actions: counsel engagement, DLT registration, trademark search, liveness vendor shortlist.
4. Draft `product-vision.md`, `product-principles.md` and `personas.md` for Gate 1.
