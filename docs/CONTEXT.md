# RentalTrust — Agent Context Document

> **Last Updated:** 2026-04-25  
> **Project Stage:** MVP Scaffold — infrastructure complete, web app initialization in progress  
> **Read This First:** Start with the mission statement, then constitution rules, then tech stack.

---

## 1. Mission Statement

**RentalTrust** is a rental application management platform with two sides:
- **Landlords** get a dashboard to create property listings, send apply links, and review applicant profiles — without chasing documents over email.
- **Tenants** get a portable verified profile they fill once and reuse for every application, with full control over who sees it.

**One sentence:** A platform where landlords manage rental applications in one place and tenants share verified documents without emailing anyone their passport.

---

## 2. Core Objects — Only Three Exist at MVP

| Object | Owned By | Purpose |
|--------|----------|---------|
| **Property** | Landlord | A listing that generates a public apply link (`applySlug`) |
| **Application** | Tenant | A request to rent a specific property |
| **Profile** | Tenant | A portable vault of verified documents (Government ID, proof of income, references, etc.) |

**Design Principle:** If a feature does not map cleanly to one of these three objects, it does not exist at MVP.

---

## 3. Platform Constitution — 9 Unbreakable Rules

These rules are non-negotiable. Every PR must pass constitution review before merge. Violations block deployment.

| # | Rule | Engineering Implication | Key Constraint |
|---|------|------------------------|----|
| **1** | **Tenants own their data** | Landlords have zero write access to tenant records. No exceptions. | `Profile`, `Document`, `TenantReference` are tenant-only write |
| **2** | **Sharing ≠ Copying** | Raw S3 keys never reach the client. Pre-signed URLs only, max 1hr expiry. | Always generate signed URLs server-side; never expose `storageKey` to client |
| **3** | **Explicit, granular, logged consent** | Every access event writes an `AuditEvent` row. No event = no access. | Before any document view/access, write `AuditEvent` with `eventType`, `actorId`, `actorType`, `metadata` |
| **4** | **Revocation is immediate and absolute** | When a tenant revokes access, the landlord's link dies instantly. Backend-enforced. | Every API route must check `AccessGrant.revokedAt IS NULL` and `AccessGrant.expiresAt > now()` |
| **5** | **Facts only, no interpretation** | No scores, ratings, or predictive fields. Ever. | No `riskScore`, `rating`, `recommendation` fields in schema |
| **6** | **Full tenant visibility** | Tenants can see everything about themselves. No hidden landlord notes. | `Application.status` is NOT shown to tenant (internal only). `AuditEvent`, `AccessGrant` ARE shown to tenant |
| **7** | **Disputes are recorded, not resolved** | Disputed records get `status: DISPUTED`. Both versions preserved. | Schema supports dispute recording; platform does not judge |
| **8** | **Time-bound by default** | `AccessGrant.expiresAt` is always set. Null expiry is invalid. | When creating `AccessGrant`, `expiresAt` is mandatory; typically 7 days from now |
| **9** | **Mandatory source attribution** | Every recorded fact has `reportedBy` (actorId + actorType). Corrections append a new record. | `AuditEvent.actorId` and `AuditEvent.actorType` mandatory on all events |

### Before Writing Any Code, Ask:
> *Does this respect tenant ownership, explicit consent, and factual neutrality? Does it verify access server-side before exposing data?*
> If no → do not build it.

---

## 4. Database Schema — Canonical Reference

All types are in `packages/database/src/index.ts` (Prisma re-exports).

### Core Objects

**Landlord**
- `id`: unique identifier (CUID)
- `email`: unique, indexed
- `name`, `role` (INDEPENDENT_LANDLORD | INDEPENDENT_AGENT), `city`, `phone`
- Relations: `properties` (one-to-many)

**Tenant**
- `id`: unique identifier (CUID)
- `email`: unique, indexed
- `name`
- Relations: `profile` (one-to-one), `applications` (one-to-many)

**Property** (owned by Landlord)
- `id`, `landlordId`, `landlord` (relation, onDelete: Restrict)
- `address`, `unitNumber`, `city`, `rent` (Decimal 10,2), `bedrooms`
- `applySlug`: unique, public URL slug (CUID) — **never expose raw UUID**
- `status`: ACTIVE | FILLED | INACTIVE
- `requiredDocs`: DocumentType[] (array of enums)
- Relations: `applications` (one-to-many), `landlord` (many-to-one)

**Profile** (owned by Tenant)
- `id`, `tenantId` (unique), `tenant` (relation, onDelete: Cascade)
- `completionPercent`: int, default 0
- Relations: `documents` (one-to-many), `references` (one-to-many)

**Document** (belongs to Profile)
- `id`, `profileId`, `type` (DocumentType enum)
- `storageKey`: S3 object key — **NEVER return to client directly**
- `fileName`, `mimeType`, `sizeBytes`
- `uploadedAt`, `replacedAt` (set when tenant replaces with newer version)
- Indexed on `(profileId, type)`

**TenantReference** (belongs to Profile)
- `id`, `profileId`, `name`, `relationship`, `phone`, `email`

**Application** (tenant's request to a property)
- `id`, `tenantId`, `propertyId`, `property` (relation), `tenant` (relation)
- `status`: PENDING | REVIEWING | SHORTLISTED | DECLINED (internal, not shown to tenant)
- Constraint: unique on `(tenantId, propertyId)` — one application per tenant per property
- Relations: `accessGrants` (one-to-many), `notifications` (one-to-many)

### Access Control & Audit

**AccessGrant** (Constitution Rules 2, 3, 4, 8)
- `id`, `applicationId`, `application` (relation, onDelete: Restrict)
- `grantedAt`: DateTime (default now)
- `expiresAt`: DateTime **mandatory, never null** — typically 7 days
- `revokedAt`: DateTime? — null = active, set = revoked instantly
- `revokedBy`: String? (tenantId)
- `allowedDocs`: DocumentType[] (granular per-document consent)
- Relations: `auditEvents` (one-to-many)

**AuditEvent** (append-only, Constitution Rules 3 & 9)
- `id`, `accessGrantId`, `accessGrant` (relation, onDelete: Restrict)
- `eventType`: AuditEventType enum (ACCESS_GRANTED | DOCUMENT_VIEWED | ACCESS_REVOKED | ACCESS_EXPIRED | APPLICATION_SUBMITTED | APPLICATION_STATUS_CHANGED | MISSING_DOCS_NUDGE_SENT)
- `actorId`: String (landlordId, tenantId, or 'system')
- `actorType`: ActorType enum (TENANT | LANDLORD | SYSTEM)
- `metadata`: JSON? (e.g., `{ documentType: 'GOVERNMENT_ID' }`)
- `occurredAt`: DateTime (default now)
- **NO `updatedAt`. Append-only by design. UPDATE and DELETE are forbidden.**
- Indexed on `(accessGrantId)` and `(occurredAt)`

**Notification** (in-app only at MVP)
- `id`, `applicationId`, `application` (relation, onDelete: Cascade)
- `recipientId`: String (tenantId or landlordId)
- `recipientType`: ActorType (TENANT | LANDLORD)
- `type`: NotificationType (MISSING_DOCUMENTS | LANDLORD_VIEWED_PROFILE | ACCESS_EXPIRING_SOON | APPLICATION_RECEIVED)
- `read`: Boolean (default false)
- Indexed on `(recipientId, read)`

### Enums

**LandlordRole:** INDEPENDENT_LANDLORD | INDEPENDENT_AGENT  
**PropertyStatus:** ACTIVE | FILLED | INACTIVE  
**DocumentType:** GOVERNMENT_ID | PROOF_OF_INCOME | PAY_STUB | EMPLOYMENT_LETTER | REFERENCE_CONTACT | CREDIT_REPORT  
**ApplicationStatus:** PENDING | REVIEWING | SHORTLISTED | DECLINED  
**AuditEventType:** ACCESS_GRANTED | DOCUMENT_VIEWED | ACCESS_REVOKED | ACCESS_EXPIRED | APPLICATION_SUBMITTED | APPLICATION_STATUS_CHANGED | MISSING_DOCS_NUDGE_SENT  
**ActorType:** TENANT | LANDLORD | SYSTEM  
**NotificationType:** MISSING_DOCUMENTS | LANDLORD_VIEWED_PROFILE | ACCESS_EXPIRING_SOON | APPLICATION_RECEIVED  

---

## 5. Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| **Framework** | Next.js 14 App Router + TypeScript strict | SSR for secure doc rendering |
| **Database** | PostgreSQL via Prisma ORM | Strong typing, migrations, relational integrity |
| **Storage** | AWS S3 `ca-central-1` | **PIPEDA compliance (Canada data residency)** |
| **Auth** | NextAuth.js v5 | Session-based, two roles: LANDLORD / TENANT |
| **Styling** | Tailwind CSS | |
| **Validation** | Zod | All API route inputs and server action args |
| **Encryption** | AWS KMS + S3 SSE-KMS | Keys never co-located with data |
| **Notifications** | In-app only at MVP | Email post-MVP |
| **Build Tool** | Turbo monorepo | Manages apps/ (web) and packages/ (database) |

---

## 6. Project Structure

```
tenant-platform/
├── CLAUDE.md                              # Agent context (read first!)
├── .cursorrules                           # Cursor-specific conventions
├── RentalTrust_ProductMaster.md           # Product decisions (source of truth)
├── linear-structure.md                    # Linear ticket breakdown
├── .env.example                           # Environment variables template
│
├── apps/
│   └── web/                               # Next.js 14 App Router
│       ├── app/                           # App Router directory (TODO: create routes)
│       │   ├── (landlord)/                # Landlord-authenticated routes
│       │   ├── (tenant)/                  # Tenant-authenticated routes
│       │   ├── api/                       # API routes
│       │   └── apply/[slug]/              # Public apply link (unauthenticated)
│       ├── components/                    # Shared UI (TODO: create components)
│       ├── lib/                           # s3.ts, auth.ts, access-guard.ts, db.ts
│       ├── types/                         # Shared TypeScript types
│       ├── package.json
│       ├── next.config.ts
│       └── tsconfig.json
│
├── packages/
│   └── database/
│       ├── prisma/
│       │   ├── schema.prisma              # **Single source of truth for schema**
│       │   └── migrations/                # Auto-generated (never edit manually)
│       ├── src/
│       │   └── index.ts                   # Prisma singleton + re-exported types
│       ├── package.json
│       └── tsconfig.json
│
├── docs/
│   ├── v2/
│   │   ├── constitution.md                # Expanded constitution details
│   │   ├── business-plan.md               # Business model and metrics
│   │   └── user-journey.md                # User flows (landlord + tenant)
│   └── CONTEXT.md                         # **This file** — agent context
│
└── .github/
    ├── PULL_REQUEST_TEMPLATE.md
    ├── ISSUE_TEMPLATE/
    │   └── feature.yml
    └── workflows/
        └── ci.yml                         # TypeScript + lint + test + build
```

---

## 7. Critical Code Patterns

### Document Access (Constitution Rules 2 & 4)

```typescript
// ✅ CORRECT — always verify access server-side
async function getDocumentUrl(documentId: string, requestingLandlordId: string) {
  const grant = await db.accessGrant.findFirst({
    where: {
      application: { property: { landlordId: requestingLandlordId } },
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: { application: { include: { property: true } } },
  });
  
  if (!grant) throw new ForbiddenError('Access denied or revoked');
  
  const doc = await db.document.findUnique({ where: { id: documentId } });
  if (!doc) throw new NotFoundError('Document not found');
  
  // Generate signed URL server-side only
  return await s3.getSignedUrl('GetObject', {
    Bucket: process.env.AWS_S3_BUCKET,
    Key: doc.storageKey,
    Expires: 3600, // 1 hour max
  });
}

// ❌ WRONG — never do this
return { url: `https://s3.amazonaws.com/${bucket}/${doc.storageKey}` }; // Exposed!
```

### Audit Event Writing (Constitution Rule 3)

```typescript
// ✅ CORRECT — append-only, never update or delete
await db.auditEvent.create({
  data: {
    accessGrantId,
    eventType: 'DOCUMENT_VIEWED',
    actorId: landlordId,
    actorType: 'LANDLORD',
    metadata: { documentType: doc.type },
    occurredAt: new Date(),
  },
});

// ❌ WRONG — never update audit events
// await db.auditEvent.update(...) ❌
// await db.auditEvent.delete(...) ❌
```

### Revocation Guard (Constitution Rule 4)

```typescript
// ✅ CORRECT — check on every request
export async function requireActiveGrant(grantId: string) {
  const grant = await db.accessGrant.findUnique({ where: { id: grantId } });
  if (!grant) throw new ForbiddenError('Grant not found');
  if (grant.revokedAt) throw new ForbiddenError('Access revoked');
  if (grant.expiresAt <= new Date()) throw new ForbiddenError('Access expired');
  return grant;
}

// Call this before serving ANY document to a landlord
const grant = await requireActiveGrant(grantId);
```

### Input Validation (Zod on all boundaries)

```typescript
import { z } from 'zod';

const CreateApplicationSchema = z.object({
  propertyId: z.string().cuid(),
  tenantId: z.string().cuid(),
  // ... more fields
});

export async function createApplication(input: unknown) {
  const data = CreateApplicationSchema.parse(input); // Throws if invalid
  // Now `data` is typed and safe
  return db.application.create({ data });
}
```

---

## 8. Key Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start all apps in dev mode (Turbo) |
| `npm run build` | Build all packages |
| `npm run lint` | ESLint across all packages |
| `npm run typecheck` | TypeScript check across all packages |
| `npm test` | Run tests across all packages |
| `npm run db:push` | Apply Prisma schema to local DB |
| `npm run db:migrate` | Create a new Prisma migration |
| `npm run db:generate` | Regenerate Prisma client |
| `npm run db:studio` | Open Prisma Studio (visual DB browser) |

---

## 9. Development Workflow

```
1. Pick a ticket from Linear (assign to self)
2. Create branch: git checkout -b feature/LIN-XXX-short-description
3. Read the ticket + CLAUDE.md
4. Code the feature (defensive, no repetition, constitution-compliant)
5. Write/update tests
6. Run locally:
   npm run typecheck
   npm run lint
   npm test
7. Push and open PR with title: [LIN-XXX] Short description
8. Complete PR constitution checklist (in PR template)
9. CI runs automatically (TypeScript + lint + test + build)
10. Fahad reviews and approves
11. Squash merge to dev
12. Linear ticket auto-closes
```

---

## 10. Branch & PR Strategy

| Branch | Purpose | Protected |
|--------|---------|-----------|
| `main` | Production-ready | Yes — requires PR + CI pass + 1 approval |
| `dev` | Integration / staging | Yes — requires CI pass |
| `feature/LIN-{id}-{slug}` | Feature work | No |
| `fix/LIN-{id}-{slug}` | Bug fixes | No |

**PR Title Format:** `[LIN-123] Short description`

---

## 11. Current Project State

### ✅ Done
- Database schema finalized (Prisma)
- Environment variable template created
- Repository scaffolded with Turbo monorepo
- Next.js 14 setup (apps/web)
- Packages structure (database package with Prisma)
- CLAUDE.md, CURSORRULES, ProductMaster documentation
- GitHub CI pipeline template
- Linear ticket structure

### 🔧 In Progress
- Web app initialization (routes, components, layouts)
- Authentication setup (NextAuth v5)
- S3 client setup + presigned URL generation
- Database client export from packages/database

### ⏳ Next (Priority Order — Sprint 1)
1. **Infrastructure** (LIN-070–LIN-076)
   - Prisma initial migration
   - S3 client setup (ca-central-1, KMS)
   - Pre-signed URL utility
   - Environment validation
   - Security headers
   - CI pipeline verification

2. **Auth & Registration** (LIN-001–LIN-006)
   - NextAuth v5 setup
   - Landlord registration
   - Tenant registration
   - Email verification
   - Role-based session management
   - Protected route middleware

3. **Property Management** (LIN-010–LIN-016)
   - Property creation form
   - Required docs configuration
   - Apply link generation + copying
   - Property list view

4. **Tenant Profile / Vault** (LIN-020–LIN-029)
   - Profile shell creation
   - Document upload (multiple types)
   - S3 presigned upload flow
   - Reference contacts form
   - Profile completion indicator

---

## 12. What Is NOT in MVP — Do Not Build These

If a ticket asks for any of the following, flag it before coding:

- Open Banking / income verification (Plaid, Flinks)
- Identity document OCR or AI verification
- Mobile native app (iOS/Android)
- Email notifications (in-app only at MVP)
- Billing / payment / Stripe
- Admin panel
- Landlord property ownership verification
- Reputation scores, ratings, or any algorithmic screening
- Multi-language support
- API for third-party integrations
- Messaging or chat
- Rental listing / property discovery (not a marketplace)

---

## 13. Important Environment Variables

```bash
# Database — local PostgreSQL
DATABASE_URL="postgresql://user:password@localhost:5432/rentaltrust"

# NextAuth
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"

# AWS S3 — MUST use ca-central-1 (PIPEDA)
AWS_REGION="ca-central-1"
AWS_S3_BUCKET="rentaltrust-documents-prod"
AWS_ACCESS_KEY_ID=""
AWS_SECRET_ACCESS_KEY=""
AWS_KMS_KEY_ID=""

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

All are mandatory. Missing any will fail startup.

---

## 14. Coding Standards (Non-Negotiable)

- **TypeScript strict mode.** No `any`. No type assertions without an explanatory comment.
- **Zod validation** on all API route inputs and server action arguments.
- **No repetition.** If logic is used more than once, extract it into a shared util. DRY is not optional.
- **Server-side only for documents.** Document operations never run client-side. App Router Server Components + Server Actions only.
- **Error handling.** Never expose raw DB errors or S3 errors to the client. Wrap and log.
- **No magic strings.** Use enums or const objects for status values, document types, event types.
- **Prisma only.** No raw SQL unless absolutely necessary (comment explaining why if used).
- **Named exports.** No default exports except Next.js pages/layouts.
- **Const over let.** Never `var`.
- **Async/await.** No promise chains.

---

## 15. Source of Truth Hierarchy

1. **RentalTrust_ProductMaster.md** — product decisions, MVP scope, constitution
2. **CLAUDE.md** — engineering decisions derived from ProductMaster
3. **packages/database/prisma/schema.prisma** — data model
4. **Linear tickets** — what is being built right now

**Any conflict → ProductMaster wins.**

---

## 16. Contact & Escalation

- **Project Owner:** Fahad
- **Product Master:** fahadu8@gmail.com
- **UI/Design:** Claude Design
- **When in doubt:** Ask Fahad before coding anything that touches data ownership, access control, or the audit trail.

---

## 17. Quick Links

- **Linear Workspace:** [Set up with your team in Linear]
- **GitHub Repo:** https://github.com/fahadu8/rental-trust (once created)
- **Local Dev Setup:** Run `npm install && cp .env.example .env.local && npm run db:push`
- **Prisma Studio:** `npm run db:studio` (visual DB browser)

---

**Last updated by:** Fahad  
**This document syncs with:** CLAUDE.md + ProductMaster v1.0  
**For agents:** Start here, then read CLAUDE.md, then tackle the ticket.
