# Rental Trust — Product Master Document
### Version 1.0 | MVP Scope Locked

> **One sentence:** A platform where landlords manage rental applications in one place and tenants share verified documents without emailing anyone their passport.

---

## Table of Contents

1. [What We Are Building](#1-what-we-are-building)
2. [Platform Constitution](#2-platform-constitution)
3. [What We Are NOT Building](#3-what-we-are-not-building)
4. [What We Must Never Do](#4-what-we-must-never-do)
5. [Core Mental Model](#5-core-mental-model)
6. [Feature List — Landlord Perspective](#6-feature-list--landlord-perspective)
7. [Feature List — Tenant Perspective](#7-feature-list--tenant-perspective)
8. [Monetization Model](#8-monetization-model)
9. [MVP Scope Boundary](#9-mvp-scope-boundary)
10. [Technical Constraints](#10-technical-constraints)
11. [Decision Log](#11-decision-log)

---

## 1. What We Are Building

Rental Trust is a **rental application management platform** with two sides:

- **Landlords and independent agents** get a dashboard to create property listings, send apply links, and review applicant profile cards in one aggregated view — without chasing documents over email.
- **Tenants** get a portable verified profile they fill once and use for every rental application, with full control over who sees it and the ability to revoke access at any time.

### The Three Core Objects

Everything in the platform maps to exactly three objects. Nothing else exists at MVP.

| Object | Owned By | Purpose |
|--------|----------|---------|
| **Property** | Landlord | A listing that generates a public apply link |
| **Application** | Tenant | A request to rent a specific property |
| **Profile** | Tenant | A portable vault of verified documents |

### The Core Flow

```
Landlord registers
  → Creates a Property
    → Gets a public Apply Link
      → Shares link anywhere (Kijiji, Facebook, WhatsApp, email)
        → Tenant opens link
          → Fills Profile (once, reusable)
            → Submits Application
              → Landlord sees Profile Card in dashboard
                → Platform pings tenant for any missing docs
                  → Landlord reviews, selects, moves on
```

---

## 2. Platform Constitution

> These rules are non-negotiable. Every feature, every screen, every line of code must comply. If a feature violates any rule below, it does not ship.

### Rule 1 — Tenants Own Their Data
Tenants upload their own documents. Landlords cannot upload, modify, or create data on behalf of a tenant. Tenant data is never reused, reshared, or transferred without explicit tenant action.

**Allowed:** Tenant uploads documents. Tenant initiates sharing.
**Forbidden:** Landlord-uploaded tenant documents. Automatic resharing.

---

### Rule 2 — Sharing ≠ Copying
A landlord viewing a tenant's profile sees a controlled, permissioned view. They do not receive a copy of the file. No PDFs are emailed. No permanent downloads are distributed by default.

**Allowed:** In-platform secure viewing. Watermarked static records for legal compliance (signed leases only).
**Forbidden:** Emailing PDFs of tenant documents. Permanent public download links.

---

### Rule 3 — Explicit, Granular, Logged Consent
Every access event is recorded. The log must capture: who requested access, what data was accessed, when access began, when it expires, and who revoked it.

**Allowed:** Time-bound access with clear expiry. Tenant-initiated sharing.
**Forbidden:** Blanket permissions. Assumed or implicit consent.

---

### Rule 4 — Revocation Is Immediate and Absolute
When a tenant revokes access, the landlord's link to their live data dies instantly. No delay. No partial access. Token invalidation is backend-enforced, not UI-only.

**Exception:** A signed lease generates a Static Legal Record (watermarked PDF) for the landlord's tax and legal files. This record is permanent for the landlord and is not subject to revocation — it is a legal document, not live tenant data.

**Forbidden:** UI-only revocation. Delayed or partial removal. Caching that outlives revocation.

---

### Rule 5 — Facts Only, No Interpretation
The platform records verifiable events. It does not score, rate, label, or predict tenant behaviour.

**Allowed:** Payment recorded as on-time or late. Verification events. Lease start and end dates.
**Forbidden:** Risk scores. Ratings like "bad tenant." Predictive language. Algorithmic screening.

---

### Rule 6 — Full Tenant Visibility
Nothing about a tenant exists on the platform without their ability to see it. Tenants can view all data associated with their profile, all access logs, and all landlord-reported events.

**Forbidden:** Hidden landlord notes. Internal-only flags. Anonymous data entries.

---

### Rule 7 — Disputes Are Recorded, Not Resolved
If a tenant disputes a landlord-reported fact, the platform marks the record as "Disputed" and preserves both versions. The platform does not arbitrate.

**Forbidden:** Deleting contested records. Platform-side judgments on who is right.

---

### Rule 8 — Time-Bound by Default
All access permissions expire automatically. Tenants control how much history they share and for how long.

**Forbidden:** Permanent negative records. Unlimited default access.

---
### Rule 9 — Mandatory Source Attribution and Correction
Every recorded fact must clearly state its source. The originator of a fact may correct a factual error — the original record is struck-through but remains visible in the audit trail, and the correction is appended with a timestamp.

**Allowed:** "Reported by Landlord on Oct 12." "Corrected by Landlord on Oct 14." Tenant-initiated dispute on a landlord-reported fact.
**Forbidden:** Anonymous or unattributed facts. Tenant editing a landlord-submitted record directly (tenant must Dispute, not Edit). Deleting the original record even after correction.

---


### The Guiding Question
Before any feature ships, ask:

> **Does this respect tenant ownership, explicit consent, and factual neutrality?**

If the answer is no, the feature does not ship.

---

## 3. What We Are NOT Building

These items are explicitly out of scope for MVP. They may exist in future phases but must not be designed for, architected around, or discussed with users as planned features until MVP is validated.

| Out of Scope | Reason |
|---|---|
| Property manager multi-client dashboard | Phase 2+ — requires different auth model |
| Tenant reputation scores or ratings | Violates Constitution Rule 5 |
| Credit bureau integration | Regulated — requires legal clearance first |
| Bank balance / Open Banking (Plaid, Flinks) | Phase 2+ — compliance overhead too high for MVP |
| Identity document OCR / AI verification | Phase 2+ — infrastructure cost, not day-one feature |
| Rental listing / property discovery | We are not a marketplace. We do not list units. |
| Messaging or chat between landlord and tenant | Out of scope — use existing channels |
| Mobile native app (iOS / Android) | Web-first MVP, mobile-responsive |
| Tenant squatter / rental history blacklist | Legally sensitive — requires lawyer sign-off before building |
| TREB or MLS integration | Requires board approval — long lead time |
| Landlord property ownership verification | Phase 1B — Ontario Land Registry query, post-MVP |
| Multi-language support | Post-MVP |
| API for third-party integrations | Post-MVP |

---

## 4. What We Must Never Do

These are hard stops. No user request, investor suggestion, or growth tactic justifies crossing these lines.

- **Never sell tenant data** — not anonymized, not aggregated, not to advertisers, not to data brokers.
- **Never decide who gets housing** — we record facts, we do not screen or recommend tenants to landlords.
- **Never hide information from a tenant about their own profile** — full visibility is non-negotiable.
- **Never build a "bad tenant" database** — this is a consumer reporting product in disguise and is legally regulated in Canada under PIPEDA and provincial consumer protection legislation.
- **Never store sensitive documents in plain text or unencrypted** — all documents are encrypted at rest.
- **Never allow a landlord to upload documents on behalf of a tenant** — this breaks data ownership and opens fraud vectors.
- **Never implement UI-only revocation** — if the backend still serves the data after a UI revoke, we have broken the constitution.
- **Never use tenant data to train ML models** without explicit, separate, informed consent.
- **Never email a PDF of a tenant's identity documents** — ever, under any circumstance.

---

## 5. Core Mental Model

### Objects and Relationships

```
LANDLORD
  └── creates → PROPERTY (1 or many)
                  └── generates → APPLY LINK (public URL)
                                    └── received by → TENANT
                                                        └── creates/fills → PROFILE (portable, once)
                                                                              └── submits → APPLICATION
                                                                                            └── appears in → LANDLORD DASHBOARD
```

### Profile Card Logic (Landlord Dashboard)

When 10 people apply to Property A, the landlord sees 10 profile cards. Each card shows:

- Tenant name and photo (if uploaded)
- Completion indicator: which required docs are present vs missing
- Verification badges: ID verified, Income verified, References provided
- Application submitted date
- One-click to open full profile detail

If required documents are missing, the platform automatically sends a nudge to the tenant: *"Your application to [Property Name] is incomplete. Please add: [Pay Stubs, Reference Letter]."* No manual chasing by the landlord.

### Access Model

```
Tenant grants access → Landlord gets time-limited view
Tenant revokes access → Landlord view dies instantly
Lease signed → Static Legal Record created for landlord (permanent, not revocable)
```

---

## 6. Feature List — Landlord Perspective

### 6.1 Registration and Onboarding
- [ ] Register as Landlord (email + password)
- [ ] Email verification on signup
- [ ] Select role: Independent Landlord or Independent Agent
- [ ] Basic profile: name, contact, city

### 6.2 Property Management
- [ ] Create a Property listing (address, unit number, rent amount, bedrooms)
- [ ] Set required documents for applicants (configurable per property): ID, proof of income, pay stubs, employment letter, reference contacts
- [ ] Generate a unique public Apply Link per property
- [ ] Copy Apply Link to clipboard (one click)
- [ ] View all properties in a list
- [ ] Mark a property as Filled / Inactive (hides from new applications)

### 6.3 Applicant Dashboard
- [ ] View all applications per property as profile cards
- [ ] Profile card shows: name, photo, completion status, application date, verification badges
- [ ] Filter applications by: completion status, application date
- [ ] Click a card to open full applicant detail view
- [ ] Full detail view shows: all uploaded documents (view only, no download), income summary, references, notes tenant added
- [ ] See which required documents are missing per applicant
- [ ] Mark an applicant as: Reviewing / Shortlisted / Declined (internal only, not shown to tenant)

### 6.4 Document Request Automation
- [ ] Automatic ping to tenant when required documents are missing (triggered on application submit)
- [ ] Manual "Request missing documents" button per applicant
- [ ] Landlord sees timestamp of last reminder sent

### 6.5 Access and Legal
- [ ] View access log per applicant (when access was granted, what was viewed)
- [ ] Access expires automatically after lease decision or configurable timeout
- [ ] Signed lease generates a Static Legal Record (watermarked PDF download, permanent)

---

## 7. Feature List — Tenant Perspective

### 7.1 Registration and Onboarding
- [ ] Two entry points: (A) receives Apply Link → prompted to register/login, (B) visits platform directly → selects "I am a Tenant"
- [ ] Register with email + password
- [ ] Email verification on signup

### 7.2 Profile (The Vault)
- [ ] Upload and store documents once, reuse across applications:
  - [ ] Government-issued ID (passport, driver's licence)
  - [ ] Proof of income (employment letter, offer letter)
  - [ ] Pay stubs (last 2–3 months)
  - [ ] Reference contacts (name, relationship, phone/email)
  - [ ] Credit report (self-uploaded PDF)
- [ ] Edit or replace any document at any time
- [ ] Profile completion indicator (percentage complete)

### 7.3 Applying to a Property
- [ ] Open Apply Link → see property details (address, rent, landlord name)
- [ ] One-click apply if profile is complete
- [ ] Prompted to fill missing required documents before submitting
- [ ] Confirm which documents are being shared before submitting (explicit consent screen)
- [ ] View all active applications and their status

### 7.4 Access Control
- [ ] See which landlords currently have access to the profile
- [ ] See what each landlord can view (document-level granularity)
- [ ] See when access expires per landlord
- [ ] Revoke access from any landlord at any time (one tap)
- [ ] View full access log: who accessed what and when

### 7.5 Notifications
- [ ] Receive nudge when required documents are missing for an active application
- [ ] Receive notification when a landlord views the profile
- [ ] Receive notification when access is expiring soon

---

## 8. Monetization Model

### Launch Pricing (Months 1–3: Validation Phase)

| Tier | Price | Limit | Purpose |
|------|-------|-------|---------|
| Free | $0 | 5 applications reviewed per property | Remove friction, get landlords on platform |

### Growth Pricing (Month 4+)

| Tier | Price | Limit |
|------|-------|-------|
| Free | $0 | 5 applications reviewed per property, 1 active property |
| Pro | $19/month | Unlimited applications, unlimited properties |

### Pricing Rules
- No credit card required for free tier
- Free tier is permanent (not a trial) — landlords can always use it within the limit
- No per-application fees at launch — simplicity over optimization
- Tenants are always free — they are the supply side, never charge supply

### Out of Scope for Now
- Property manager enterprise plan
- Per-application billing
- Annual discount
- Referral program

---

## 9. MVP Scope Boundary

### In MVP
- Landlord registration and property creation
- Public apply link generation
- Tenant profile (document vault)
- Application submission flow
- Landlord applicant dashboard with profile cards
- Completion status and missing document nudge
- Access control and revocation
- Free tier (5 applications per property)

### Not In MVP (Hard Line)
- Payment / billing system (validate free tier first)
- Identity verification API (tenant self-certifies at MVP)
- Open Banking / income verification API
- Landlord property ownership verification
- Mobile app
- Email notifications (in-app only at MVP)
- Admin panel

---

## 10. Technical Constraints

These are non-negotiable technical requirements that flow directly from the constitution.

- **Revocation is backend-enforced.** Access tokens are invalidated server-side. No client-side caching of document content beyond the active session.
- **Documents are encrypted at rest.** AES-256 minimum. Keys are not stored alongside data.
- **Access tokens are time-limited by default.** JWTs with short expiry. Refresh requires re-consent.
- **No permanent download links for tenant documents.** Pre-signed URLs with maximum 1-hour expiry for in-session viewing.
- **All consent events are logged with timestamps.** Immutable audit trail. Cannot be deleted by landlord or tenant.
- **Document viewing is rendered server-side or via secure iframe.** Raw file URLs are never exposed to the landlord's browser.
- **PIPEDA compliance required from day one.** Privacy policy, data residency in Canada, clear consent language.

---

## 11. Decision Log

A record of key decisions made and why, so they are not re-litigated.

| Decision | Chosen | Rejected | Reason |
|----------|--------|----------|--------|
| Primary customer | Landlords pay | Tenants pay | Landlords have operational pain, tenants have fear — pain converts |
| Cold start strategy | Landlord posts public link → tenants follow | Tenant registers first | Eliminates chicken-and-egg, landlord does acquisition automatically |
| Apply link type | Public by default | Private only | Maximum distribution with zero landlord effort |
| Pricing model | Flat $19/month after 5 free | Per-application billing | Simplicity wins at launch |
| Lead feature | Application management dashboard | Landlord verification / fraud detection | Broader pain, both sides benefit immediately |
| Tenant pricing | Always free | Freemium or paid | Tenants are supply — never charge supply at MVP |
| Property manager tier | Phase 2+ | MVP | Requires different auth model, unknown demand |
| Reputation/history feature | Phase 3 | MVP | Legally sensitive, requires PIPEDA/consumer reporting legal review |
| Mobile app | Post-MVP | Day one | Web-first is faster to validate |
| Billing at launch | No — validate free first | Yes — charge from day one | 5 free applications removes all friction for first 30 days |

---

*Last updated: MVP lock — Version 1.1 | Rule 9 (Source Attribution) ported from Constitution v2*
*Every feature addition or removal must be recorded in the Decision Log with a reason.*
