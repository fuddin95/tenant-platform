# CLAUDE.md — RentalTrust Agent Context

> **Read this before writing a single line of code.**
> This file is the source of truth for all AI coding agents (Cursor, Claude Code).
> Every decision here traces back to `RentalTrust_ProductMaster.md`.

---

## What We Are Building

A rental application management platform with two sides:
- **Landlords** get a dashboard to create listings, send apply links, and review applicants — without chasing documents over email.
- **Tenants** get a portable verified profile they fill once and reuse for every application, with full control over who sees it.

**One sentence:** A platform where landlords manage rental applications in one place and tenants share verified documents without emailing anyone their passport.

---

## Three Core Objects — Nothing Else Exists at MVP

| Object | Owner | Purpose |
|--------|-------|---------|
| `Property` | Landlord | A listing that generates a unique public apply link |
| `Application` | Tenant | A request to rent a specific property |
| `Profile` | Tenant | A portable vault of verified documents |

If a feature does not map cleanly to one of these three objects, it does not exist at MVP.

---

## Platform Constitution — Every Rule Is a Hard Constraint

These are not guidelines. Every PR is reviewed against these rules. Violations block merge.

| # | Rule | Engineering Implication |
|---|------|------------------------|
| 1 | **Tenants own their data** | Landlords have zero write access to tenant records. No exceptions. |
| 2 | **Sharing ≠ Copying** | Raw S3 keys never reach the client. Pre-signed URLs only, max 1hr expiry. |
| 3 | **Explicit, granular, logged consent** | Every access event writes an `AuditEvent` row. No event = no access. |
| 4 | **Revocation is immediate and absolute** | `AccessGrant.revokedAt` checked server-side on every request. UI-only revocation is a bug. |
| 5 | **Facts only, no interpretation** | No scores, ratings, or predictive fields in schema or UI. |
| 6 | **Full tenant visibility** | No hidden landlord notes. No internal-only flags. Tenants can see everything about themselves. |
| 7 | **Disputes are recorded, not resolved** | Disputed records get `status: DISPUTED`. Both versions preserved. Platform does not judge. |
| 8 | **Time-bound by default** | `AccessGrant.expiresAt` is always set. Null expiry is invalid. |
| 9 | **Mandatory source attribution** | Every recorded fact has a `reportedBy` (actorId + actorType). Corrections append a new record with `correctedFrom` reference; original is never deleted. |

### Before writing any code, ask:
> *Does this respect tenant ownership, explicit consent, and factual neutrality?*
> If no → do not build it.

---

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | Next.js 14, App Router, TypeScript strict | SSR for secure doc rendering, no raw URLs to client |
| Database | PostgreSQL via Prisma ORM | Strong typing, migrations, relational integrity |
| Storage | AWS S3 `ca-central-1` | PIPEDA — Canadian data residency, non-negotiable |
| Auth | NextAuth.js v5 | Session-based, two roles: LANDLORD / TENANT |
| Styling | Tailwind CSS | |
| Email/Notifications | Resend | In-app only at MVP, email post-MVP |
| Encryption | AWS KMS + S3 SSE-KMS | Keys never co-located with data |

---

## Database Schema — Core Entities

These are the canonical shapes. Do not add fields without updating this file.

```
Landlord      → has many Property
Property      → has one ApplyLink (slug), has many Application, belongs to Landlord
Tenant        → has one Profile
Profile       → has many Document, has many Reference
Application   → belongs to Tenant, belongs to Property, has many AccessGrant
AccessGrant   → belongs to Application, has many AuditEvent
AuditEvent    → append-only, belongs to AccessGrant (NEVER update or delete)
```

### AccessGrant state machine:
```
ACTIVE (revokedAt IS NULL AND expiresAt > now())
  → EXPIRED  (expiresAt <= now(), system sets)
  → REVOKED  (tenant sets revokedAt, instant, backend-enforced)
```

---

## Critical Technical Rules

### Document Access (Constitution Rules 2 + 4)
```typescript
// CORRECT — always verify access server-side before generating URL
async function getDocumentUrl(documentId: string, requestingLandlordId: string) {
  const grant = await db.accessGrant.findFirst({
    where: {
      application: { property: { landlordId: requestingLandlordId } },
      revokedAt: null,
      expiresAt: { gt: new Date() },
    }
  });
  if (!grant) throw new ForbiddenError('Access denied or revoked');
  // Generate pre-signed URL — never return the raw S3 key
  return s3.getSignedUrl('getObject', { Bucket, Key: doc.storageKey, Expires: 3600 });
}

// WRONG — never do this
return { url: `https://s3.amazonaws.com/${bucket}/${doc.storageKey}` }; // ❌
```

### Audit Log (Constitution Rule 3)
```typescript
// AuditEvent is append-only. No update. No delete. Ever.
await db.auditEvent.create({
  data: {
    accessGrantId,
    eventType: 'DOCUMENT_VIEWED',
    actorId: landlordId,
    actorType: 'LANDLORD',
    metadata: { documentType: doc.type },
    occurredAt: new Date(),
  }
});
// Never: db.auditEvent.update(...) ❌
// Never: db.auditEvent.delete(...) ❌
```

### Revocation Check (Constitution Rule 4)
```typescript
// Every API route touching tenant documents must run this guard
export async function requireActiveGrant(grantId: string) {
  const grant = await db.accessGrant.findUnique({ where: { id: grantId } });
  if (!grant) throw new ForbiddenError('Grant not found');
  if (grant.revokedAt) throw new ForbiddenError('Access has been revoked');
  if (grant.expiresAt <= new Date()) throw new ForbiddenError('Access has expired');
  return grant;
}
```

---

## Coding Standards

- **TypeScript strict mode.** No `any`. No type assertions without an explanatory comment.
- **Defensive at the boundary.** Validate all inputs at API routes and server actions using Zod.
- **No repetition.** If logic is used more than once, extract it. DRY is not optional.
- **Server-side only for documents.** Document operations never run client-side. App Router Server Components + Server Actions only.
- **Error handling.** Never expose raw DB errors or S3 errors to the client. Wrap and log.
- **No magic strings.** Use enums or const objects for status values, document types, event types.
- **Prisma only.** No raw SQL unless absolutely necessary — comment explaining why if used.

---

## Branch Strategy

| Branch | Purpose | Protected |
|--------|---------|-----------|
| `main` | Production | Yes — requires PR + CI pass + 1 approval |
| `dev` | Integration | Yes — requires CI pass |
| `feature/LIN-{id}-{slug}` | Feature work | No |
| `fix/LIN-{id}-{slug}` | Bug fixes | No |

**Never commit directly to `main` or `dev`.**

---

## PR Rules

1. Every PR title must reference a Linear ticket: `[LIN-123] Short description`
2. Every PR touching access control or documents must complete the Constitution Checklist in the PR template
3. CI must pass before merge (TypeScript, lint, tests)
4. At least 1 approval required
5. Squash merge to `dev`, regular merge `dev` → `main`

---

## What Is NOT in MVP — Do Not Build These

If a ticket asks you to build any of the following, flag it before coding:

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
- Messaging or chat between landlord and tenant
- Rental listing / property discovery (we are not a marketplace)

---

## Linear Ticket → Code Workflow

```
Linear ticket (LIN-XXX) assigned
  → Create branch: git checkout -b feature/LIN-XXX-short-description
    → Read CLAUDE.md + ticket description
      → Code the feature (defensive, no repetition)
        → Write/update tests
          → Open PR with [LIN-XXX] in title
            → Complete PR constitution checklist
              → CI passes
                → Fahad reviews and approves
                  → Squash merge to dev
```

---

*Maintained by: Fahad | Last sync with ProductMaster: v1.1*
*Any change to this file must be reviewed by Fahad — it affects every agent coding session.*
