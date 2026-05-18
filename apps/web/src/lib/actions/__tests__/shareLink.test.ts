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

function makeCreateFormData(overrides: Record<string, string | readonly string[]> = {}): FormData {
  const fd = new FormData()
  fd.append('recipientEmail', overrides.recipientEmail as string ?? 'landlord@example.com')
  fd.append('recipientName', overrides.recipientName as string ?? 'John Landlord')
  fd.append('relation', overrides.relation as string ?? 'Potential landlord')
  const facts = (overrides.allowedFacts as readonly string[]) ?? ['IDENTITY']
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
