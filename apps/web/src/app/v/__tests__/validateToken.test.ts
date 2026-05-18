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
