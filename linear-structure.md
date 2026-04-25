# RentalTrust — Linear Ticket Structure
> Import this into your Linear workspace. Each Epic maps directly to a ProductMaster section.
> Ticket IDs will be assigned by Linear. Use `LIN-XXX` format in branch names and PR titles.

---

## How to Set Up Linear

1. Create a new **Team**: `RentalTrust`
2. Create a new **Project**: `MVP v1`
3. Create the Epics below (use Linear's "Epic" feature or label `epic`)
4. Create tickets under each Epic — copy the acceptance criteria directly
5. Enable **GitHub integration** in Linear settings → paste your repo URL → auto-close tickets on PR merge

---

## Epic 1 — Auth & Registration
**Goal:** Both user types can register, verify email, and land on the correct dashboard.

| Ticket | Title | Priority |
|--------|-------|----------|
| LIN-001 | Landlord registration (email + password) | P0 |
| LIN-002 | Tenant registration (email + password) | P0 |
| LIN-003 | Email verification flow (both roles) | P0 |
| LIN-004 | Role selection on signup (Independent Landlord / Agent) | P1 |
| LIN-005 | Session management — NextAuth v5 setup with LANDLORD/TENANT roles | P0 |
| LIN-006 | Protected route middleware (redirect unauthenticated users) | P0 |

---

## Epic 2 — Property Management (Landlord)
**Goal:** Landlord can create a property, configure required docs, and get a shareable apply link.

| Ticket | Title | Priority |
|--------|-------|----------|
| LIN-010 | Create property form (address, unit, rent, bedrooms) | P0 |
| LIN-011 | Configure required documents per property (checkbox list) | P0 |
| LIN-012 | Generate unique `applySlug` on property creation | P0 |
| LIN-013 | Copy apply link to clipboard (one click) | P0 |
| LIN-014 | Property list view (all landlord properties) | P0 |
| LIN-015 | Mark property as Filled / Inactive | P1 |
| LIN-016 | Edit property details | P1 |

---

## Epic 3 — Tenant Profile / The Vault
**Goal:** Tenant fills their profile once and it is reusable across all applications.

| Ticket | Title | Priority |
|--------|-------|----------|
| LIN-020 | Profile shell creation on tenant registration | P0 |
| LIN-021 | Document upload — Government ID | P0 |
| LIN-022 | Document upload — Proof of Income / Employment Letter | P0 |
| LIN-023 | Document upload — Pay Stubs (up to 3) | P0 |
| LIN-024 | Document upload — Credit Report (self-uploaded PDF) | P1 |
| LIN-025 | Reference contacts form (name, relationship, phone/email) | P1 |
| LIN-026 | Profile completion percentage indicator | P1 |
| LIN-027 | Replace / update any document at any time | P1 |
| LIN-028 | S3 upload flow — presigned upload URL, client-side upload, server-side confirmation | P0 |
| LIN-029 | Document encryption at rest (SSE-KMS on S3) | P0 |

---

## Epic 4 — Apply Link → Application Flow
**Goal:** Tenant opens an apply link, sees property details, consents, and submits application.

| Ticket | Title | Priority |
|--------|-------|----------|
| LIN-030 | Public apply link page (property details + landlord name) | P0 |
| LIN-031 | Prompt unauthenticated tenant to register/login | P0 |
| LIN-032 | Explicit consent screen — show exactly which docs will be shared | P0 |
| LIN-033 | One-click apply (if profile complete) | P0 |
| LIN-034 | Block submission if required docs missing — show what's missing | P0 |
| LIN-035 | Create `Application` + `AccessGrant` on submission | P0 |
| LIN-036 | Tenant: view all active applications and their status | P1 |
| LIN-037 | Prevent duplicate applications (one per tenant per property) | P0 |

---

## Epic 5 — Applicant Dashboard (Landlord)
**Goal:** Landlord sees all applicants as profile cards, can filter and view full detail.

| Ticket | Title | Priority |
|--------|-------|----------|
| LIN-040 | Applicant dashboard — profile cards per property | P0 |
| LIN-041 | Profile card: name, photo, completion status, submission date, verification badges | P0 |
| LIN-042 | Filter applications by: completion status, date | P1 |
| LIN-043 | Full applicant detail view (view-only, no download) | P0 |
| LIN-044 | Document viewer — pre-signed URL, sandboxed iframe, 1hr expiry | P0 |
| LIN-045 | Internal status: mark applicant as Reviewing / Shortlisted / Declined | P1 |
| LIN-046 | Show which required documents are missing per applicant | P0 |
| LIN-047 | Manual "Request missing documents" button | P1 |
| LIN-048 | Timestamp of last reminder sent | P1 |

---

## Epic 6 — Access Control & Audit Log
**Goal:** Revocation is instant and backend-enforced. Every access event is logged.

| Ticket | Title | Priority |
|--------|-------|----------|
| LIN-050 | `requireActiveGrant()` server-side guard (reusable utility) | P0 |
| LIN-051 | Tenant: view all landlords with active access | P0 |
| LIN-052 | Tenant: revoke access — instant backend invalidation | P0 |
| LIN-053 | Tenant: view access log (who accessed what, when) | P1 |
| LIN-054 | Auto-expire `AccessGrant` via background job (cron) | P0 |
| LIN-055 | `AuditEvent` write on every document view | P0 |
| LIN-056 | `AuditEvent` write on grant + revocation events | P0 |
| LIN-057 | Tenant: see per-landlord document-level access detail | P1 |

---

## Epic 7 — Notifications (In-App Only at MVP)
**Goal:** Tenants get nudged for missing docs. Both parties notified of key events.

| Ticket | Title | Priority |
|--------|-------|----------|
| LIN-060 | Auto-nudge tenant on application submit if docs missing | P0 |
| LIN-061 | Notification: landlord viewed profile | P1 |
| LIN-062 | Notification: access expiring soon (48hr warning) | P1 |
| LIN-063 | Notification bell / indicator in UI | P1 |
| LIN-064 | Mark notifications as read | P2 |

---

## Epic 8 — Infrastructure & Security Foundations
**Goal:** All constitution technical constraints are enforced before any user-facing feature ships.

| Ticket | Title | Priority |
|--------|-------|----------|
| LIN-070 | Prisma schema — initial migration | P0 |
| LIN-071 | S3 client setup — ca-central-1, SSE-KMS, no public bucket | P0 |
| LIN-072 | Pre-signed URL generation utility (max 1hr, server-side only) | P0 |
| LIN-073 | Environment variable validation on startup (fail fast if missing) | P0 |
| LIN-074 | Error boundary — never expose raw DB/S3 errors to client | P0 |
| LIN-075 | Security headers — CSP, X-Frame-Options, no-sniff | P0 |
| LIN-076 | CI pipeline — TypeScript, lint, test, build on every PR | P0 |

---

## Recommended Sprint Order

**Sprint 1 — Foundation (Epic 8 + Epic 1)**
LIN-070 through LIN-076, LIN-001 through LIN-006
*Nothing ships until infrastructure is solid.*

**Sprint 2 — Core Objects (Epic 2 + Epic 3)**
LIN-010 through LIN-016, LIN-020 through LIN-029
*Property exists. Tenant vault works.*

**Sprint 3 — The Flow (Epic 4)**
LIN-030 through LIN-037
*Apply link → profile → application works end to end.*

**Sprint 4 — Landlord Dashboard (Epic 5)**
LIN-040 through LIN-048
*Landlord can actually review applicants.*

**Sprint 5 — Access Control (Epic 6 + Epic 7)**
LIN-050 through LIN-064
*Revocation works. Audit log complete. Constitution fully enforced.*

---

*Sync this file with Linear whenever tickets are added or scope changes.*
*All new tickets must reference a ProductMaster section in their description.*
