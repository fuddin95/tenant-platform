# TEN-108 — Backend: Standalone Share Link Generation

**Date:** 2026-05-17  
**Ticket:** [TEN-108](https://linear.app/tenant-platform/issue/TEN-108)  
**Epic:** Epic 6 — Share Flow Modal Redesign  
**Branch:** `fahadu8/ten-108-fe-share-06-backend-standalone-share-link-generation`

---

## Overview

Add a standalone share link system that lets tenants share fact-level access to their profile with a named recipient (e.g. a landlord, property manager) via a public URL. This is decoupled from the existing `Application`/`AccessGrant` flow — a tenant can share their profile with anyone, not just applicants on a specific property.

**Scope of TEN-108:** Prisma schema, migrations, server actions (`createShareLink`, `revokeShareLink`), public route scaffold (`/v/[token]`), and audit logging. The full viewer UI is Epic 7.

---

## Architecture Decision: Approach A — New Models, No Existing Models Modified

- `AccessGrant` stays exactly as-is (coupled to `Application`)
- `AuditEvent` stays exactly as-is (coupled to `AccessGrant`, non-nullable FK)
- Two new models: `ShareLink` + `ShareLinkEvent`
- One new server action file: `apps/web/src/lib/actions/shareLink.ts`
- One new public route: `apps/web/src/app/v/[token]/page.tsx`

Rationale: the two grant types are conceptually different (application-scoped vs. standalone). Keeping them separate avoids nullable FK awkwardness, preserves existing model integrity, and makes each type independently auditable.

---

## Data Model

### New Enum: `FactCategory`

Coarser than `DocumentType` — groups documents into fact-level categories. The viewer route resolves `FactCategory[]` → `DocumentType[]` server-side via a pure utility function.

```prisma
enum FactCategory {
  IDENTITY       // → GOVERNMENT_ID
  INCOME         // → PROOF_OF_INCOME, PAY_STUB, EMPLOYMENT_LETTER
  RENTAL_HISTORY // → (placeholder — no current DocumentType maps here)
  REFERENCES     // → REFERENCE_CONTACT
  CREDIT         // → CREDIT_REPORT
}
```

### New Model: `ShareLink`

```prisma
model ShareLink {
  id             String          @id @default(cuid())
  tenantId       String
  tenant         Tenant          @relation(fields: [tenantId], references: [id], onDelete: Restrict)
  recipientEmail String
  recipientName  String
  relation       String          // free-text, max 100 chars, Zod-validated
  allowedFacts   FactCategory[]
  // Security: raw token is NEVER stored — only its SHA-256 hash
  // Raw token travels in the URL only; hashing protects against DB compromise
  tokenHash      String          @unique
  status         ShareLinkStatus @default(ACTIVE)
  expiresAt      DateTime        // always set, never null (Constitution Rule 8)
  viewedAt       DateTime?       // set on first view only; idempotent on repeat visits
  revokedAt      DateTime?       // set instantly on revocation (Constitution Rule 4)
  createdAt      DateTime        @default(now())
  events         ShareLinkEvent[]

  @@index([tenantId])
  @@index([tokenHash])
}

enum ShareLinkStatus {
  ACTIVE
  REVOKED
  EXPIRED
}
```

### New Model: `ShareLinkEvent`

Append-only audit table for share link activity. Mirrors the shape of `AuditEvent` but uses a non-nullable `shareLinkId` FK — no nullable FK compromise.

```prisma
model ShareLinkEvent {
  id          String             @id @default(cuid())
  shareLinkId String
  shareLink   ShareLink          @relation(fields: [shareLinkId], references: [id], onDelete: Restrict)
  eventType   ShareLinkEventType
  actorId     String             // tenantId, 'system', or 'anonymous' for public views
  actorType   ActorType          // reuses existing enum
  metadata    Json?
  occurredAt  DateTime           @default(now())
  // NO updatedAt — append-only by design (Constitution Rule 3)
  // Never: db.shareLinkEvent.update(...)
  // Never: db.shareLinkEvent.delete(...)

  @@index([shareLinkId])
  @@index([occurredAt])
}

enum ShareLinkEventType {
  LINK_CREATED
  LINK_VIEWED
  LINK_REVOKED
  LINK_EXPIRED
}
```

### Resolver Utility (server-side only)

```typescript
// packages/database/src/factResolver.ts or apps/web/src/lib/factResolver.ts
function resolveFactsToDocTypes(facts: FactCategory[]): DocumentType[] {
  const map: Record<FactCategory, DocumentType[]> = {
    IDENTITY:       ['GOVERNMENT_ID'],
    INCOME:         ['PROOF_OF_INCOME', 'PAY_STUB', 'EMPLOYMENT_LETTER'],
    RENTAL_HISTORY: [],
    REFERENCES:     ['REFERENCE_CONTACT'],
    CREDIT:         ['CREDIT_REPORT'],
  }
  return [...new Set(facts.flatMap(f => map[f]))]
}
```

---

## Server Actions

**File:** `apps/web/src/lib/actions/shareLink.ts`

### `createShareLinkAction`

```
'use server'
Auth guard: session required, role === 'TENANT'
Zod schema:
  - recipientEmail: z.string().email()
  - recipientName:  z.string().min(1).max(200)
  - relation:       z.string().min(1).max(100)
  - allowedFacts:   z.array(z.nativeEnum(FactCategory)).min(1)
  - expiresAt:      z.string() → parsed as YYYY-MM-DDT23:59:59Z, must be future

Token generation:
  const token     = crypto.randomUUID()           // 122 bits entropy, Node 18+ native
  const tokenHash = createHash('sha256').update(token).digest('hex')

DB writes (in order):
  1. db.shareLink.create({ tokenHash, tenantId, recipientEmail, ... })
  2. db.shareLinkEvent.create({ eventType: 'LINK_CREATED', actorId: tenantId, actorType: 'TENANT' })

Returns:
  Success → { link: `/v/${token}` }   ← raw token in path, never stored
  Failure → { error: string }

Side effect: revalidatePath('/profile')
```

### `revokeShareLinkAction`

```
'use server'
Auth guard: session required, role === 'TENANT'
Zod schema:
  - id: z.string().min(1)

Ownership check (server-side): shareLink.tenantId === session.user.userId
Guard: revokedAt === null (already-revoked returns error, not a no-op)

DB writes (in order):
  1. db.shareLink.update({ status: 'REVOKED', revokedAt: new Date() })
  2. db.shareLinkEvent.create({ eventType: 'LINK_REVOKED', actorId: tenantId, actorType: 'TENANT' })

Returns:
  Success → { success: true }
  Failure → { error: string }

Side effect: revalidatePath('/profile')
```

**Return type** (matches existing pattern in `grant.ts`):
```typescript
export type ShareLinkActionState = { readonly error: string } | { readonly success: true } | null
```

---

## Public Route

**File:** `apps/web/src/app/v/[token]/page.tsx`

Server Component. No auth required — publicly accessible via token.

### Token Lookup

```typescript
const tokenHash = createHash('sha256').update(params.token).digest('hex')
const shareLink = await db.shareLink.findUnique({ where: { tokenHash } })
```

### Validation Sequence

| State | Action | Rendered |
|-------|--------|----------|
| Not found | — | Generic "Link not found" (no token echo) |
| `revokedAt !== null` | — | "This link has been revoked" |
| `expiresAt <= now()` | Set `status: EXPIRED` + log `LINK_EXPIRED` event | "This link has expired" |
| Valid | Set `viewedAt = now()` if null; log `LINK_VIEWED` event | Placeholder UI |

Not-found and revoked render identically to prevent oracle attacks (attacker cannot distinguish "wrong token" from "revoked token").

### Audit on Valid View

```typescript
await db.shareLinkEvent.create({
  data: {
    shareLinkId: shareLink.id,
    eventType: 'LINK_VIEWED',
    actorId: 'anonymous',
    actorType: 'SYSTEM',
    // actorId 'anonymous' + actorType 'SYSTEM' = system-recorded event with no authenticated actor
    metadata: { ip: request.headers.get('x-forwarded-for') ?? 'unknown' },
  }
})
```

`viewedAt` is set only once (idempotent — repeat visits do not overwrite).

### Response Headers

```
Referrer-Policy: no-referrer      ← token cannot leak via Referer header to embedded content
Cache-Control: no-store           ← proxy/CDN must not cache token-bearing responses
```

Set via Next.js `headers()` or a dedicated middleware rule.

### Rate Limiting

Middleware on `/v/*`: max 20 requests/minute per IP (sliding window). Returns HTTP 429 before any DB lookup runs. Prevents token enumeration.

### TEN-108 Placeholder UI

Renders: recipient name, `allowedFacts` list (human-readable fact category labels), expiry date. Full document viewer is Epic 7 (TEN-109+).

---

## Route Placement

```
apps/web/src/app/
  v/
    [token]/
      page.tsx        ← new (TEN-108)
  apply/
    [slug]/...
  (tenant)/...
  (landlord)/...
  auth/...
```

No route group — `/v/[token]` is publicly accessible without session.

---

## Security Properties

| Property | Mechanism |
|----------|-----------|
| High-entropy token | UUID v4 — 122 bits, brute force infeasible |
| Token not in DB | Only `SHA-256(token)` stored — DB compromise does not expose live tokens |
| Time-bound | `expiresAt` always set, checked server-side on every request |
| Revocable | `revokedAt` checked server-side, instant effect (Constitution Rule 4) |
| No Referer leakage | `Referrer-Policy: no-referrer` response header |
| No caching | `Cache-Control: no-store` response header |
| Enumeration protection | Rate limit (20 req/min/IP) + identical 404/revoked response |
| No oracle | "Not found" and "revoked" render the same message |
| Audit trail | Every creation, view, revocation, and expiry logged to `ShareLinkEvent` |

---

## Testing

**`apps/web/src/lib/actions/__tests__/shareLink.test.ts`**

`createShareLinkAction`:
- Valid input → creates `ShareLink` record with `tokenHash` (not raw token) + `LINK_CREATED` event
- Raw token is never present in DB
- Invalid email → `{ error }`
- Empty `allowedFacts` → `{ error }`
- Past `expiresAt` → `{ error }`
- Landlord session → `{ error }`
- Unauthenticated → `{ error }`

`revokeShareLinkAction`:
- Valid revoke → sets `revokedAt`, `status: REVOKED`, creates `LINK_REVOKED` event
- Already-revoked → `{ error }`
- Wrong tenant → `{ error }`
- Non-existent id → `{ error }`

**`apps/web/src/app/v/__tests__/tokenRoute.test.ts`** (logic extracted to a pure helper for testability)

- Valid token → returns share link data, sets `viewedAt`, logs `LINK_VIEWED`
- `viewedAt` is idempotent — set only on first valid visit
- Revoked token → revoked state (same render as not-found)
- Expired token → triggers `status: EXPIRED` update, logs `LINK_EXPIRED`
- Unknown token → not-found (same render as revoked — no oracle)

---

## Out of Scope (TEN-108)

- Full document viewer UI (Epic 7)
- Email delivery of the share link (post-MVP)
- Rate limiting implementation detail (Redis vs. in-memory — left to implementer based on infra)
- `RENTAL_HISTORY` fact category document mapping (no `DocumentType` exists yet)
