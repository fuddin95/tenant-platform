# TEN-108 Share Link Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add standalone share links — Prisma models, server actions, public route, and audit trail — so tenants can share fact-level profile access without being tied to an application.

**Architecture:** Two new models (`ShareLink`, `ShareLinkEvent`) alongside the unchanged `AccessGrant`/`AuditEvent` pair. Raw UUID token in URL, SHA-256 hash in DB. Server actions follow the existing `'use server'` + Zod + `auth()` pattern. Public route `/v/[token]` is a Server Component with rate limiting and security headers in middleware.

**Tech Stack:** Prisma ORM, Next.js 14 App Router, TypeScript strict, Zod, Node.js `crypto` (built-in), Jest + ts-jest

**Worktree:** `/Users/user/Desktop/tenant-platform/.claude/worktrees/feature+ten-108-fe-share-06`

**Spec:** `docs/superpowers/specs/2026-05-17-ten-108-share-link-backend-design.md`

---

## File Map

| Action | Path | Responsibility |
|--------|------|---------------|
| Modify | `packages/database/prisma/schema.prisma` | Add `FactCategory`, `ShareLinkStatus`, `ShareLinkEventType` enums; `ShareLink`, `ShareLinkEvent` models; `shareLinks` relation on `Tenant` |
| Create | `apps/web/src/lib/factResolver.ts` | Pure `resolveFactsToDocTypes(facts) → DocumentType[]` utility |
| Create | `apps/web/src/lib/__tests__/factResolver.test.ts` | Unit tests for fact resolver |
| Create | `apps/web/src/lib/actions/shareLink.ts` | `createShareLinkAction`, `revokeShareLinkAction` server actions |
| Create | `apps/web/src/lib/actions/__tests__/shareLink.test.ts` | Tests for both server actions |
| Create | `apps/web/src/app/v/[token]/validateToken.ts` | Pure async `validateShareToken(token, ip)` — extracted for testability |
| Create | `apps/web/src/app/v/__tests__/validateToken.test.ts` | Tests for token validation logic |
| Create | `apps/web/src/app/v/[token]/page.tsx` | Public Server Component — calls validateShareToken, renders state |
| Modify | `apps/web/src/middleware.ts` | Add `/v/:path*` to matcher; rate limit + security headers for `/v/*` |

---

## Task 1: Update Prisma Schema and Run Migration

**Files:**
- Modify: `packages/database/prisma/schema.prisma`

- [ ] **Step 1: Add `shareLinks` relation to the `Tenant` model**

In `packages/database/prisma/schema.prisma`, find the `Tenant` model and add the relation field before `createdAt`:

```prisma
model Tenant {
  id           String        @id @default(cuid())
  email        String        @unique
  name         String
  passwordHash String?
  profile      Profile?
  applications Application[]
  shareLinks   ShareLink[]   // ← add this line
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt

  @@index([email])
}
```

- [ ] **Step 2: Add the three new enums**

Append to the enums section at the bottom of `packages/database/prisma/schema.prisma` (after the existing `NotificationType` enum):

```prisma
enum FactCategory {
  IDENTITY       // → GOVERNMENT_ID
  INCOME         // → PROOF_OF_INCOME, PAY_STUB, EMPLOYMENT_LETTER
  RENTAL_HISTORY // → placeholder, no DocumentType maps here yet
  REFERENCES     // → REFERENCE_CONTACT
  CREDIT         // → CREDIT_REPORT
}

enum ShareLinkStatus {
  ACTIVE
  REVOKED
  EXPIRED
}

enum ShareLinkEventType {
  LINK_CREATED
  LINK_VIEWED
  LINK_REVOKED
  LINK_EXPIRED
}
```

- [ ] **Step 3: Add the two new models**

Append after the `Notification` model (before the enums section) in `packages/database/prisma/schema.prisma`:

```prisma
// ─────────────────────────────────────────────
// SHARE LINKS — standalone tenant-to-recipient sharing
// Not tied to an Application. Constitution Rules 2, 3, 4, 8.
// ─────────────────────────────────────────────

model ShareLink {
  id             String          @id @default(cuid())
  tenantId       String
  tenant         Tenant          @relation(fields: [tenantId], references: [id], onDelete: Restrict)
  recipientEmail String
  recipientName  String
  relation       String          // free-text, max 100 chars, Zod-validated in action
  allowedFacts   FactCategory[]
  // Constitution Rule 2: raw token NEVER stored — only SHA-256 hash
  // Raw token travels in the URL only; hashing protects against DB compromise
  tokenHash      String          @unique
  status         ShareLinkStatus @default(ACTIVE)
  expiresAt      DateTime        // always set, never null (Rule 8)
  viewedAt       DateTime?       // set on first view only, idempotent on repeat visits
  revokedAt      DateTime?       // instant revocation (Rule 4)
  createdAt      DateTime        @default(now())
  events         ShareLinkEvent[]

  @@index([tenantId])
  @@index([tokenHash])
}

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
```

- [ ] **Step 4: Run the migration**

```bash
cd /Users/user/Desktop/tenant-platform/.claude/worktrees/feature+ten-108-fe-share-06/packages/database
npx prisma migrate dev --name add_share_link
```

Expected output:
```
✓ Generated Prisma Client
The following migration(s) have been applied:
  migrations/YYYYMMDDHHMMSS_add_share_link/migration.sql
```

If prompted for a migration name, type `add_share_link`.

- [ ] **Step 5: Verify the Prisma client was regenerated**

```bash
cd /Users/user/Desktop/tenant-platform/.claude/worktrees/feature+ten-108-fe-share-06/packages/database
npx prisma generate
```

Expected: `✓ Generated Prisma Client` with no errors.

- [ ] **Step 6: Commit**

```bash
cd /Users/user/Desktop/tenant-platform/.claude/worktrees/feature+ten-108-fe-share-06
git add packages/database/prisma/schema.prisma packages/database/prisma/migrations/
git commit -m "feat(db): add ShareLink and ShareLinkEvent models with FactCategory enum

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 2: Fact Resolver Utility (TDD)

**Files:**
- Create: `apps/web/src/lib/__tests__/factResolver.test.ts`
- Create: `apps/web/src/lib/factResolver.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/lib/__tests__/factResolver.test.ts`:

```typescript
import { resolveFactsToDocTypes } from '../factResolver'

describe('resolveFactsToDocTypes', () => {
  it('maps IDENTITY to GOVERNMENT_ID', () => {
    expect(resolveFactsToDocTypes(['IDENTITY'])).toEqual(['GOVERNMENT_ID'])
  })

  it('maps INCOME to three document types', () => {
    expect(resolveFactsToDocTypes(['INCOME'])).toEqual([
      'PROOF_OF_INCOME',
      'PAY_STUB',
      'EMPLOYMENT_LETTER',
    ])
  })

  it('maps RENTAL_HISTORY to empty array (no DocumentType yet)', () => {
    expect(resolveFactsToDocTypes(['RENTAL_HISTORY'])).toEqual([])
  })

  it('maps REFERENCES to REFERENCE_CONTACT', () => {
    expect(resolveFactsToDocTypes(['REFERENCES'])).toEqual(['REFERENCE_CONTACT'])
  })

  it('maps CREDIT to CREDIT_REPORT', () => {
    expect(resolveFactsToDocTypes(['CREDIT'])).toEqual(['CREDIT_REPORT'])
  })

  it('handles multiple facts and deduplicates overlapping doc types', () => {
    const result = resolveFactsToDocTypes(['IDENTITY', 'CREDIT'])
    expect(result).toEqual(['GOVERNMENT_ID', 'CREDIT_REPORT'])
  })

  it('handles empty array', () => {
    expect(resolveFactsToDocTypes([])).toEqual([])
  })

  it('handles all facts combined', () => {
    const result = resolveFactsToDocTypes([
      'IDENTITY',
      'INCOME',
      'RENTAL_HISTORY',
      'REFERENCES',
      'CREDIT',
    ])
    expect(result).toContain('GOVERNMENT_ID')
    expect(result).toContain('PROOF_OF_INCOME')
    expect(result).toContain('PAY_STUB')
    expect(result).toContain('EMPLOYMENT_LETTER')
    expect(result).toContain('REFERENCE_CONTACT')
    expect(result).toContain('CREDIT_REPORT')
    // No duplicates
    expect(new Set(result).size).toBe(result.length)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/user/Desktop/tenant-platform/.claude/worktrees/feature+ten-108-fe-share-06/apps/web
npx jest src/lib/__tests__/factResolver.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '../factResolver'`

- [ ] **Step 3: Implement the resolver**

Create `apps/web/src/lib/factResolver.ts`:

```typescript
import type { DocumentType, FactCategory } from '@rental-trust/database'

const FACT_TO_DOC_TYPES: Record<FactCategory, DocumentType[]> = {
  IDENTITY:       ['GOVERNMENT_ID'],
  INCOME:         ['PROOF_OF_INCOME', 'PAY_STUB', 'EMPLOYMENT_LETTER'],
  RENTAL_HISTORY: [],
  REFERENCES:     ['REFERENCE_CONTACT'],
  CREDIT:         ['CREDIT_REPORT'],
}

export function resolveFactsToDocTypes(facts: FactCategory[]): DocumentType[] {
  return [...new Set(facts.flatMap(f => FACT_TO_DOC_TYPES[f]))]
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /Users/user/Desktop/tenant-platform/.claude/worktrees/feature+ten-108-fe-share-06/apps/web
npx jest src/lib/__tests__/factResolver.test.ts --no-coverage
```

Expected: PASS — 8 tests, 0 failures

- [ ] **Step 5: Commit**

```bash
cd /Users/user/Desktop/tenant-platform/.claude/worktrees/feature+ten-108-fe-share-06
git add apps/web/src/lib/factResolver.ts apps/web/src/lib/__tests__/factResolver.test.ts
git commit -m "feat: add resolveFactsToDocTypes utility with tests

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 3: Share Link Server Actions (TDD)

**Files:**
- Create: `apps/web/src/lib/actions/__tests__/shareLink.test.ts`
- Create: `apps/web/src/lib/actions/shareLink.ts`

- [ ] **Step 1: Write the failing tests**

Create `apps/web/src/lib/actions/__tests__/shareLink.test.ts`:

```typescript
/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment */
import { createShareLinkAction, revokeShareLinkAction } from '../shareLink'

// Hoisted mocks — must be declared before any imports that use them
jest.mock('crypto', () => ({
  randomUUID: jest.fn().mockReturnValue('test-uuid-1234'),
  createHash: jest.fn().mockReturnValue({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn().mockReturnValue('hashed-test-uuid'),
  }),
}))

jest.mock('@/auth', () => ({
  auth: jest.fn(),
}))

jest.mock('@rental-trust/database', () => ({
  FactCategory: {
    IDENTITY: 'IDENTITY',
    INCOME: 'INCOME',
    RENTAL_HISTORY: 'RENTAL_HISTORY',
    REFERENCES: 'REFERENCES',
    CREDIT: 'CREDIT',
  },
  db: {
    shareLink: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
    },
    shareLinkEvent: { create: jest.fn() },
  },
}))

jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))

import { auth } from '@/auth'
import { db } from '@rental-trust/database'

const mockAuth = jest.mocked(auth)
// eslint-disable-next-line @typescript-eslint/unbound-method
const mockShareLinkCreate = jest.mocked(db.shareLink.create)
// eslint-disable-next-line @typescript-eslint/unbound-method
const mockShareLinkUpdate = jest.mocked(db.shareLink.update)
// eslint-disable-next-line @typescript-eslint/unbound-method
const mockShareLinkFindUnique = jest.mocked(db.shareLink.findUnique)
// eslint-disable-next-line @typescript-eslint/unbound-method
const mockShareLinkEventCreate = jest.mocked(db.shareLinkEvent.create)

const tenantSession = {
  user: { userId: 'tenant-abc', role: 'TENANT' as const, email: 'tenant@example.com' },
  expires: '2099-01-01',
}

const landlordSession = {
  user: { userId: 'landlord-xyz', role: 'LANDLORD' as const, email: 'landlord@example.com' },
  expires: '2099-01-01',
}

function makeCreateFormData(overrides: Record<string, string | string[]> = {}): FormData {
  const fd = new FormData()
  fd.append('recipientEmail', overrides.recipientEmail as string ?? 'landlord@example.com')
  fd.append('recipientName', overrides.recipientName as string ?? 'John Landlord')
  fd.append('relation', overrides.relation as string ?? 'Potential landlord')
  const facts = (overrides.allowedFacts as string[]) ?? ['IDENTITY']
  facts.forEach(f => fd.append('allowedFacts', f))
  fd.append('expiresAt', overrides.expiresAt as string ?? '2099-01-01')
  return fd
}

// ── createShareLinkAction ─────────────────────────────────────────────────────

describe('createShareLinkAction', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(mockShareLinkCreate as jest.MockedFunction<any>).mockResolvedValue({ id: 'sl-123' })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(mockShareLinkEventCreate as jest.MockedFunction<any>).mockResolvedValue({ id: 'sle-1' })
  })

  it('returns { error } when not authenticated', async () => {
    mockAuth.mockResolvedValue(null as never)
    const result = await createShareLinkAction(null, makeCreateFormData())
    expect(result).toEqual({ error: 'Not authenticated.' })
  })

  it('returns { error } when role is LANDLORD', async () => {
    mockAuth.mockResolvedValue(landlordSession as never)
    const result = await createShareLinkAction(null, makeCreateFormData())
    expect(result).toEqual({ error: 'Only tenants can create share links.' })
  })

  it('returns { error } for invalid email', async () => {
    mockAuth.mockResolvedValue(tenantSession as never)
    const result = await createShareLinkAction(null, makeCreateFormData({ recipientEmail: 'not-an-email' }))
    expect(result).toHaveProperty('error')
  })

  it('returns { error } when allowedFacts is empty', async () => {
    mockAuth.mockResolvedValue(tenantSession as never)
    const fd = new FormData()
    fd.append('recipientEmail', 'landlord@example.com')
    fd.append('recipientName', 'John')
    fd.append('relation', 'Landlord')
    fd.append('expiresAt', '2099-01-01')
    // no allowedFacts appended
    const result = await createShareLinkAction(null, fd)
    expect(result).toHaveProperty('error')
  })

  it('returns { error } when expiresAt is in the past', async () => {
    mockAuth.mockResolvedValue(tenantSession as never)
    const result = await createShareLinkAction(null, makeCreateFormData({ expiresAt: '2000-01-01' }))
    expect(result).toHaveProperty('error')
  })

  it('stores tokenHash (not raw token) in DB and returns raw token in link', async () => {
    mockAuth.mockResolvedValue(tenantSession as never)

    const result = await createShareLinkAction(null, makeCreateFormData())

    // DB must receive the hash, never the raw token
    expect(mockShareLinkCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tokenHash: 'hashed-test-uuid' }),
      })
    )
    // The 'token' field must NOT appear in the DB call
    expect(mockShareLinkCreate).not.toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ token: expect.anything() }) })
    )
    // The returned link uses the raw UUID
    expect(result).toMatchObject({ success: true, link: '/v/test-uuid-1234' })
  })

  it('creates a LINK_CREATED audit event with TENANT actor', async () => {
    mockAuth.mockResolvedValue(tenantSession as never)
    await createShareLinkAction(null, makeCreateFormData())
    expect(mockShareLinkEventCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          shareLinkId: 'sl-123',
          eventType: 'LINK_CREATED',
          actorId: 'tenant-abc',
          actorType: 'TENANT',
        }),
      })
    )
  })

  it('returns { success: true, link } on valid input', async () => {
    mockAuth.mockResolvedValue(tenantSession as never)
    const result = await createShareLinkAction(null, makeCreateFormData())
    expect(result).toMatchObject({ success: true, link: '/v/test-uuid-1234' })
  })
})

// ── revokeShareLinkAction ─────────────────────────────────────────────────────

describe('revokeShareLinkAction', () => {
  const mockShareLink = {
    id: 'sl-123',
    tenantId: 'tenant-abc',
    revokedAt: null,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(mockShareLinkFindUnique as jest.MockedFunction<any>).mockResolvedValue(mockShareLink)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(mockShareLinkUpdate as jest.MockedFunction<any>).mockResolvedValue({ ...mockShareLink, revokedAt: new Date() })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(mockShareLinkEventCreate as jest.MockedFunction<any>).mockResolvedValue({ id: 'sle-2' })
  })

  function makeRevokeFormData(id = 'sl-123'): FormData {
    const fd = new FormData()
    fd.append('id', id)
    return fd
  }

  it('returns { error } when not authenticated', async () => {
    mockAuth.mockResolvedValue(null as never)
    const result = await revokeShareLinkAction(null, makeRevokeFormData())
    expect(result).toEqual({ error: 'Not authenticated.' })
  })

  it('returns { error } when role is LANDLORD', async () => {
    mockAuth.mockResolvedValue(landlordSession as never)
    const result = await revokeShareLinkAction(null, makeRevokeFormData())
    expect(result).toEqual({ error: 'Only tenants can revoke share links.' })
  })

  it('returns { error } when share link not found', async () => {
    mockAuth.mockResolvedValue(tenantSession as never)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(mockShareLinkFindUnique as jest.MockedFunction<any>).mockResolvedValue(null)
    const result = await revokeShareLinkAction(null, makeRevokeFormData())
    expect(result).toEqual({ error: 'Share link not found.' })
  })

  it('returns { error } when share link belongs to different tenant', async () => {
    mockAuth.mockResolvedValue(tenantSession as never)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(mockShareLinkFindUnique as jest.MockedFunction<any>).mockResolvedValue({
      ...mockShareLink,
      tenantId: 'other-tenant-999',
    })
    const result = await revokeShareLinkAction(null, makeRevokeFormData())
    expect(result).toEqual({ error: 'Access denied.' })
  })

  it('returns { error } when share link already revoked', async () => {
    mockAuth.mockResolvedValue(tenantSession as never)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(mockShareLinkFindUnique as jest.MockedFunction<any>).mockResolvedValue({
      ...mockShareLink,
      revokedAt: new Date('2024-01-01'),
    })
    const result = await revokeShareLinkAction(null, makeRevokeFormData())
    expect(result).toEqual({ error: 'Share link already revoked.' })
  })

  it('sets revokedAt and status REVOKED in DB', async () => {
    mockAuth.mockResolvedValue(tenantSession as never)
    await revokeShareLinkAction(null, makeRevokeFormData())
    expect(mockShareLinkUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'sl-123' },
        data: expect.objectContaining({ status: 'REVOKED', revokedAt: expect.any(Date) }),
      })
    )
  })

  it('creates a LINK_REVOKED audit event with TENANT actor', async () => {
    mockAuth.mockResolvedValue(tenantSession as never)
    await revokeShareLinkAction(null, makeRevokeFormData())
    expect(mockShareLinkEventCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          shareLinkId: 'sl-123',
          eventType: 'LINK_REVOKED',
          actorId: 'tenant-abc',
          actorType: 'TENANT',
        }),
      })
    )
  })

  it('returns { success: true } on valid revoke', async () => {
    mockAuth.mockResolvedValue(tenantSession as never)
    const result = await revokeShareLinkAction(null, makeRevokeFormData())
    expect(result).toEqual({ success: true })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/user/Desktop/tenant-platform/.claude/worktrees/feature+ten-108-fe-share-06/apps/web
npx jest src/lib/actions/__tests__/shareLink.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '../shareLink'`

- [ ] **Step 3: Implement the server actions**

Create `apps/web/src/lib/actions/shareLink.ts`:

```typescript
'use server'

import { createHash, randomUUID } from 'crypto'
import { z } from 'zod'
import { FactCategory, db } from '@rental-trust/database'
import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'

const FactCategoryEnum = z.nativeEnum(FactCategory)

const CreateShareLinkSchema = z.object({
  recipientEmail: z.string().email('Invalid email address.'),
  recipientName:  z.string().min(1, 'Recipient name is required.').max(200),
  relation:       z.string().min(1, 'Relation is required.').max(100),
  allowedFacts:   z.array(FactCategoryEnum).min(1, 'Select at least one fact category.'),
  expiresAt:      z.string().min(1, 'Expiry date is required.'),
})

const RevokeShareLinkSchema = z.object({
  id: z.string().min(1),
})

export type CreateShareLinkState =
  | { readonly error: string }
  | { readonly success: true; readonly link: string }
  | null

export type RevokeShareLinkState =
  | { readonly error: string }
  | { readonly success: true }
  | null

export async function createShareLinkAction(
  _prev: CreateShareLinkState,
  formData: FormData,
): Promise<CreateShareLinkState> {
  const session = await auth()
  if (!session) return { error: 'Not authenticated.' }
  if (session.user.role !== 'TENANT') return { error: 'Only tenants can create share links.' }

  const tenantId = session.user.userId
  if (!tenantId) return { error: 'Not authenticated.' }

  const parsed = CreateShareLinkSchema.safeParse({
    recipientEmail: formData.get('recipientEmail'),
    recipientName:  formData.get('recipientName'),
    relation:       formData.get('relation'),
    allowedFacts:   formData.getAll('allowedFacts'),
    expiresAt:      formData.get('expiresAt'),
  })
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? 'Invalid input.' }

  const { recipientEmail, recipientName, relation, allowedFacts, expiresAt } = parsed.data

  const expiryDate = new Date(`${expiresAt}T23:59:59Z`)
  if (isNaN(expiryDate.getTime())) return { error: 'Invalid expiry date.' }
  if (expiryDate <= new Date()) return { error: 'Expiry date must be in the future.' }

  // Constitution Rule 2: raw token never stored — only its SHA-256 hash
  const token     = randomUUID()
  const tokenHash = createHash('sha256').update(token).digest('hex')

  const shareLink = await db.shareLink.create({
    data: { tenantId, recipientEmail, recipientName, relation, allowedFacts, tokenHash, expiresAt: expiryDate },
  })

  // Constitution Rule 3: every access event is logged
  await db.shareLinkEvent.create({
    data: {
      shareLinkId: shareLink.id,
      eventType:   'LINK_CREATED',
      actorId:     tenantId,
      actorType:   'TENANT',
      metadata:    { allowedFacts, recipientEmail },
    },
  })

  revalidatePath('/profile')
  return { success: true, link: `/v/${token}` }
}

export async function revokeShareLinkAction(
  _prev: RevokeShareLinkState,
  formData: FormData,
): Promise<RevokeShareLinkState> {
  const session = await auth()
  if (!session) return { error: 'Not authenticated.' }
  if (session.user.role !== 'TENANT') return { error: 'Only tenants can revoke share links.' }

  const tenantId = session.user.userId
  if (!tenantId) return { error: 'Not authenticated.' }

  const parsed = RevokeShareLinkSchema.safeParse({ id: formData.get('id') })
  if (!parsed.success) return { error: 'Invalid request.' }

  const { id } = parsed.data

  const shareLink = await db.shareLink.findUnique({ where: { id } })
  if (!shareLink) return { error: 'Share link not found.' }
  if (shareLink.tenantId !== tenantId) return { error: 'Access denied.' }
  // Constitution Rule 4: revocation is immediate and absolute
  if (shareLink.revokedAt !== null) return { error: 'Share link already revoked.' }

  await db.shareLink.update({
    where: { id },
    data:  { status: 'REVOKED', revokedAt: new Date() },
  })

  await db.shareLinkEvent.create({
    data: {
      shareLinkId: id,
      eventType:   'LINK_REVOKED',
      actorId:     tenantId,
      actorType:   'TENANT',
    },
  })

  revalidatePath('/profile')
  return { success: true }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /Users/user/Desktop/tenant-platform/.claude/worktrees/feature+ten-108-fe-share-06/apps/web
npx jest src/lib/actions/__tests__/shareLink.test.ts --no-coverage
```

Expected: PASS — all tests green, 0 failures

- [ ] **Step 5: Commit**

```bash
cd /Users/user/Desktop/tenant-platform/.claude/worktrees/feature+ten-108-fe-share-06
git add apps/web/src/lib/actions/shareLink.ts apps/web/src/lib/actions/__tests__/shareLink.test.ts
git commit -m "feat: add createShareLink and revokeShareLink server actions with tests

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 4: Token Validation Logic (TDD)

**Files:**
- Create: `apps/web/src/app/v/__tests__/validateToken.test.ts`
- Create: `apps/web/src/app/v/[token]/validateToken.ts`

- [ ] **Step 1: Write the failing tests**

Create the directory first:
```bash
mkdir -p /Users/user/Desktop/tenant-platform/.claude/worktrees/feature+ten-108-fe-share-06/apps/web/src/app/v/__tests__
```

Create `apps/web/src/app/v/__tests__/validateToken.test.ts`:

```typescript
/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment */

jest.mock('crypto', () => ({
  createHash: jest.fn().mockReturnValue({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn().mockReturnValue('hashed-incoming-token'),
  }),
}))

jest.mock('@rental-trust/database', () => ({
  db: {
    shareLink: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    shareLinkEvent: { create: jest.fn() },
  },
}))

import { validateShareToken } from '../[token]/validateToken'
import { db } from '@rental-trust/database'

// eslint-disable-next-line @typescript-eslint/unbound-method
const mockFindUnique = jest.mocked(db.shareLink.findUnique)
// eslint-disable-next-line @typescript-eslint/unbound-method
const mockUpdate = jest.mocked(db.shareLink.update)
// eslint-disable-next-line @typescript-eslint/unbound-method
const mockEventCreate = jest.mocked(db.shareLinkEvent.create)

const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7) // 7 days from now
const pastDate   = new Date(Date.now() - 1000)                      // 1 second ago

const baseShareLink = {
  id:            'sl-abc',
  tenantId:      'tenant-1',
  recipientName: 'Jane Landlord',
  recipientEmail:'jane@example.com',
  relation:      'Potential landlord',
  allowedFacts:  ['IDENTITY', 'CREDIT'],
  tokenHash:     'hashed-incoming-token',
  status:        'ACTIVE' as const,
  expiresAt:     futureDate,
  viewedAt:      null,
  revokedAt:     null,
  createdAt:     new Date(),
}

describe('validateShareToken', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(mockUpdate as jest.MockedFunction<any>).mockResolvedValue({})
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(mockEventCreate as jest.MockedFunction<any>).mockResolvedValue({})
  })

  it('returns { status: "not_found" } when token does not exist in DB', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(mockFindUnique as jest.MockedFunction<any>).mockResolvedValue(null)
    const result = await validateShareToken('any-token', '1.2.3.4')
    expect(result).toEqual({ status: 'not_found' })
  })

  it('returns { status: "revoked" } when revokedAt is set', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(mockFindUnique as jest.MockedFunction<any>).mockResolvedValue({
      ...baseShareLink,
      revokedAt: new Date('2024-01-01'),
    })
    const result = await validateShareToken('any-token', '1.2.3.4')
    expect(result).toEqual({ status: 'revoked' })
  })

  it('returns { status: "expired" } and marks EXPIRED when expiresAt is in the past', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(mockFindUnique as jest.MockedFunction<any>).mockResolvedValue({
      ...baseShareLink,
      expiresAt: pastDate,
      status: 'ACTIVE',
    })
    const result = await validateShareToken('any-token', '1.2.3.4')
    expect(result).toEqual({ status: 'expired' })
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'EXPIRED' }) })
    )
    expect(mockEventCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ eventType: 'LINK_EXPIRED', actorType: 'SYSTEM' }),
      })
    )
  })

  it('does not update DB again when already marked EXPIRED', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(mockFindUnique as jest.MockedFunction<any>).mockResolvedValue({
      ...baseShareLink,
      expiresAt: pastDate,
      status: 'EXPIRED',
    })
    await validateShareToken('any-token', '1.2.3.4')
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('sets viewedAt on first valid visit', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(mockFindUnique as jest.MockedFunction<any>).mockResolvedValue({ ...baseShareLink, viewedAt: null })
    await validateShareToken('any-token', '1.2.3.4')
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'sl-abc' },
        data:  expect.objectContaining({ viewedAt: expect.any(Date) }),
      })
    )
  })

  it('does NOT update viewedAt on repeat visits (idempotent)', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(mockFindUnique as jest.MockedFunction<any>).mockResolvedValue({
      ...baseShareLink,
      viewedAt: new Date('2026-01-01'),
    })
    await validateShareToken('any-token', '1.2.3.4')
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('creates LINK_VIEWED event with anonymous actor and client IP on valid visit', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(mockFindUnique as jest.MockedFunction<any>).mockResolvedValue({ ...baseShareLink })
    await validateShareToken('any-token', '9.8.7.6')
    expect(mockEventCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          shareLinkId: 'sl-abc',
          eventType:   'LINK_VIEWED',
          actorId:     'anonymous',
          actorType:   'SYSTEM',
          metadata:    { ip: '9.8.7.6' },
        }),
      })
    )
  })

  it('returns { status: "valid", shareLink } with correct fields on happy path', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(mockFindUnique as jest.MockedFunction<any>).mockResolvedValue({ ...baseShareLink })
    const result = await validateShareToken('any-token', '1.2.3.4')
    expect(result).toMatchObject({
      status: 'valid',
      shareLink: {
        id:            'sl-abc',
        recipientName: 'Jane Landlord',
        recipientEmail:'jane@example.com',
        allowedFacts:  ['IDENTITY', 'CREDIT'],
        expiresAt:     futureDate,
      },
    })
  })

  it('looks up share link by SHA-256 hash of the incoming token', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(mockFindUnique as jest.MockedFunction<any>).mockResolvedValue(null)
    await validateShareToken('raw-token-value', '1.2.3.4')
    expect(mockFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tokenHash: 'hashed-incoming-token' } })
    )
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/user/Desktop/tenant-platform/.claude/worktrees/feature+ten-108-fe-share-06/apps/web
npx jest src/app/v/__tests__/validateToken.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '../[token]/validateToken'`

- [ ] **Step 3: Implement the validation function**

Create the directory, then `apps/web/src/app/v/[token]/validateToken.ts`:

```bash
mkdir -p /Users/user/Desktop/tenant-platform/.claude/worktrees/feature+ten-108-fe-share-06/apps/web/src/app/v/\[token\]
```

```typescript
import { createHash } from 'crypto'
import { db } from '@rental-trust/database'
import type { FactCategory } from '@rental-trust/database'

export type TokenValidationResult =
  | {
      status: 'valid'
      shareLink: {
        id:            string
        recipientName: string
        recipientEmail:string
        allowedFacts:  FactCategory[]
        expiresAt:     Date
        viewedAt:      Date | null
      }
    }
  | { status: 'not_found' }
  | { status: 'revoked' }
  | { status: 'expired' }

export async function validateShareToken(
  token:    string,
  clientIp: string,
): Promise<TokenValidationResult> {
  const tokenHash = createHash('sha256').update(token).digest('hex')
  const shareLink = await db.shareLink.findUnique({ where: { tokenHash } })

  if (!shareLink) return { status: 'not_found' }

  if (shareLink.revokedAt !== null) return { status: 'revoked' }

  if (shareLink.expiresAt <= new Date()) {
    if (shareLink.status !== 'EXPIRED') {
      await db.shareLink.update({ where: { id: shareLink.id }, data: { status: 'EXPIRED' } })
      await db.shareLinkEvent.create({
        data: {
          shareLinkId: shareLink.id,
          eventType:   'LINK_EXPIRED',
          actorId:     'system',
          actorType:   'SYSTEM',
        },
      })
    }
    return { status: 'expired' }
  }

  // Set viewedAt on first visit only — idempotent
  if (shareLink.viewedAt === null) {
    await db.shareLink.update({ where: { id: shareLink.id }, data: { viewedAt: new Date() } })
  }

  // actorId 'anonymous' + actorType 'SYSTEM' = system-recorded event with no authenticated actor
  await db.shareLinkEvent.create({
    data: {
      shareLinkId: shareLink.id,
      eventType:   'LINK_VIEWED',
      actorId:     'anonymous',
      actorType:   'SYSTEM',
      metadata:    { ip: clientIp },
    },
  })

  return {
    status: 'valid',
    shareLink: {
      id:            shareLink.id,
      recipientName: shareLink.recipientName,
      recipientEmail:shareLink.recipientEmail,
      allowedFacts:  shareLink.allowedFacts,
      expiresAt:     shareLink.expiresAt,
      viewedAt:      shareLink.viewedAt,
    },
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /Users/user/Desktop/tenant-platform/.claude/worktrees/feature+ten-108-fe-share-06/apps/web
npx jest src/app/v/__tests__/validateToken.test.ts --no-coverage
```

Expected: PASS — all tests green, 0 failures

- [ ] **Step 5: Commit**

```bash
cd /Users/user/Desktop/tenant-platform/.claude/worktrees/feature+ten-108-fe-share-06
git add apps/web/src/app/v/
git commit -m "feat: add validateShareToken with full audit trail and tests

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 5: Public Route Page

**Files:**
- Create: `apps/web/src/app/v/[token]/page.tsx`

- [ ] **Step 1: Create the public route page**

Create `apps/web/src/app/v/[token]/page.tsx`:

```typescript
import { headers } from 'next/headers'
import { validateShareToken } from './validateToken'
import type { FactCategory } from '@rental-trust/database'

const FACT_LABELS: Record<FactCategory, string> = {
  IDENTITY:       'Identity',
  INCOME:         'Income & Employment',
  RENTAL_HISTORY: 'Rental History',
  REFERENCES:     'References',
  CREDIT:         'Credit',
}

export default async function ShareLinkPage({
  params,
}: {
  params: { token: string }
}) {
  const headersList = headers()
  const ip = headersList.get('x-forwarded-for') ?? 'unknown'

  const result = await validateShareToken(params.token, ip)

  // not_found and revoked render identically — prevents oracle attacks
  if (result.status === 'not_found' || result.status === 'revoked') {
    return (
      <main className="flex min-h-screen items-center justify-center p-8">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-semibold text-gray-900">Link not available</h1>
          <p className="mt-2 text-gray-600">
            This share link is not available. It may have been revoked or may never have existed.
          </p>
        </div>
      </main>
    )
  }

  if (result.status === 'expired') {
    return (
      <main className="flex min-h-screen items-center justify-center p-8">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-semibold text-gray-900">Link expired</h1>
          <p className="mt-2 text-gray-600">This share link has expired.</p>
        </div>
      </main>
    )
  }

  const { shareLink } = result

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="max-w-md w-full">
        <h1 className="text-2xl font-semibold text-gray-900">Shared Profile</h1>
        <p className="mt-1 text-gray-600">Shared with {shareLink.recipientName}</p>

        <dl className="mt-6 space-y-3">
          <div>
            <dt className="text-sm font-medium text-gray-500">Shared information</dt>
            <dd className="mt-1 flex flex-wrap gap-2">
              {shareLink.allowedFacts.map(fact => (
                <span
                  key={fact}
                  className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-700"
                >
                  {FACT_LABELS[fact]}
                </span>
              ))}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Access expires</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {shareLink.expiresAt.toLocaleDateString('en-CA', {
                year: 'numeric', month: 'long', day: 'numeric',
              })}
            </dd>
          </div>
        </dl>

        <p className="mt-8 text-sm text-gray-400">Document viewer coming in Epic 7.</p>
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/user/Desktop/tenant-platform/.claude/worktrees/feature+ten-108-fe-share-06/apps/web
npx tsc --noEmit
```

Expected: no errors. If there are errors related to missing Prisma types, re-run `npx prisma generate` in `packages/database` first.

- [ ] **Step 3: Commit**

```bash
cd /Users/user/Desktop/tenant-platform/.claude/worktrees/feature+ten-108-fe-share-06
git add apps/web/src/app/v/\[token\]/page.tsx
git commit -m "feat: add public share link route /v/[token]

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 6: Middleware — Rate Limiting and Security Headers

**Files:**
- Modify: `apps/web/src/middleware.ts`

- [ ] **Step 1: Update the middleware**

Replace the full contents of `apps/web/src/middleware.ts`:

```typescript
import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// In-memory sliding-window rate limiter — MVP only.
// For multi-instance production, replace with Redis (e.g. Upstash).
const rateLimitStore = new Map<string, number[]>()
const RATE_LIMIT_WINDOW_MS = 60_000 // 1 minute
const RATE_LIMIT_MAX       = 20     // requests per window per IP

function isRateLimited(ip: string): boolean {
  const now        = Date.now()
  const timestamps = (rateLimitStore.get(ip) ?? []).filter(t => now - t < RATE_LIMIT_WINDOW_MS)
  if (timestamps.length >= RATE_LIMIT_MAX) return true
  timestamps.push(now)
  rateLimitStore.set(ip, timestamps)
  return false
}

export default auth((req: NextRequest & { readonly auth: { readonly user?: { readonly role?: string } } | null }) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  // Public share link route — rate limited, security headers, no auth check
  if (pathname.startsWith('/v/')) {
    const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
    if (isRateLimited(ip)) {
      return new NextResponse(null, { status: 429 })
    }
    const response = NextResponse.next()
    response.headers.set('Referrer-Policy', 'no-referrer')
    response.headers.set('Cache-Control', 'no-store')
    return response
  }

  if (pathname.startsWith('/dashboard')) {
    if (!session?.user) {
      return NextResponse.redirect(new URL('/auth/signin', req.url))
    }
    if (session.user.role && session.user.role !== 'LANDLORD') {
      return NextResponse.redirect(new URL('/vault', req.url))
    }
  }

  if (pathname.startsWith('/vault')) {
    if (!session?.user) {
      return NextResponse.redirect(new URL('/auth/signin', req.url))
    }
    if (session.user.role && session.user.role !== 'TENANT') {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/dashboard/:path*', '/vault/:path*', '/v/:path*'],
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/user/Desktop/tenant-platform/.claude/worktrees/feature+ten-108-fe-share-06/apps/web
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Run the full test suite to check for regressions**

```bash
cd /Users/user/Desktop/tenant-platform/.claude/worktrees/feature+ten-108-fe-share-06/apps/web
npx jest --no-coverage
```

Expected: all pre-existing tests still pass, plus the new tests from Tasks 2–4.

- [ ] **Step 4: Commit**

```bash
cd /Users/user/Desktop/tenant-platform/.claude/worktrees/feature+ten-108-fe-share-06
git add apps/web/src/middleware.ts
git commit -m "feat: add rate limiting and security headers for /v/* share link route

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Acceptance Criteria Verification

After all tasks complete, verify each item from the Linear ticket:

- [ ] Share link created in DB with all required fields — covered by `createShareLinkAction` (Task 3)
- [ ] Token is UUID v4, unguessable — `crypto.randomUUID()` provides 122-bit entropy (Task 3)
- [ ] `expiresAt` enforced server-side — checked in `validateShareToken` before serving content (Task 4)
- [ ] Revoke is instant — `revokedAt` set in DB, checked on every request before DB lookup returns (Task 3 + 4)
- [ ] Audit entry on creation — `LINK_CREATED` event in `createShareLinkAction` (Task 3)
- [ ] Audit entry on view — `LINK_VIEWED` event in `validateShareToken` with IP (Task 4)
- [ ] Audit entry contains: tenantId, recipientEmail, action, timestamp — metadata field in events (Tasks 3 + 4)
