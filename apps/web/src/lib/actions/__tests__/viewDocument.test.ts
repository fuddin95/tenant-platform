/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment */
import { getDocumentViewUrlAction } from '../viewDocument'

jest.mock('@/auth', () => ({
  auth: jest.fn(),
}))

jest.mock('@rental-trust/database', () => ({
  db: {
    document: { findUnique: jest.fn() },
    accessGrant: { findUnique: jest.fn() },
    auditEvent: { create: jest.fn() },
  },
}))

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({})),
  GetObjectCommand: jest.fn().mockImplementation((input: unknown) => ({ input })),
}))

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://s3.example.com/presigned?token=abc'),
}))

jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}))

import { auth } from '@/auth'
import { db } from '@rental-trust/database'

const mockAuth = jest.mocked(auth)
// eslint-disable-next-line @typescript-eslint/unbound-method
const mockDocumentFindUnique = jest.mocked(db.document.findUnique)
// eslint-disable-next-line @typescript-eslint/unbound-method
const mockAccessGrantFindUnique = jest.mocked(db.accessGrant.findUnique)
// eslint-disable-next-line @typescript-eslint/unbound-method
const mockAuditEventCreate = jest.mocked(db.auditEvent.create)

const landlordSession = {
  user: { userId: 'landlord-abc', role: 'LANDLORD' as const, email: 'landlord@example.com' },
  expires: '2099-01-01',
}

const mockDocument = {
  id: 'doc-123',
  profileId: 'profile-xyz',
  type: 'GOVERNMENT_ID' as const,
  storageKey: 'tenants/tenant-1/abc/id.pdf',
  fileName: 'id.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 1024,
  uploadedAt: new Date('2024-01-01'),
  replacedAt: null,
}

const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24)

const mockGrant = {
  id: 'grant-456',
  applicationId: 'app-789',
  grantedAt: new Date('2024-01-01'),
  expiresAt: futureDate,
  revokedAt: null,
  revokedBy: null,
  allowedDocs: ['GOVERNMENT_ID' as const, 'PAY_STUB' as const],
  application: {
    property: { landlordId: 'landlord-abc' },
  },
}

describe('getDocumentViewUrlAction', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any
    ;(mockDocumentFindUnique as jest.MockedFunction<any>).mockResolvedValue(mockDocument)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any
    ;(mockAccessGrantFindUnique as jest.MockedFunction<any>).mockResolvedValue(mockGrant)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any
    ;(mockAuditEventCreate as jest.MockedFunction<any>).mockResolvedValue({ id: 'audit-1' })
  })

  it('returns { error: "Access denied" } when not authenticated', async () => {
    mockAuth.mockResolvedValue(null as never)
    const result = await getDocumentViewUrlAction('doc-123', 'grant-456')
    expect(result).toEqual({ error: 'Access denied' })
  })

  it('returns { error: "Access denied" } when role is not LANDLORD', async () => {
    mockAuth.mockResolvedValue({
      user: { userId: 'tenant-1', role: 'TENANT' as const, email: 'tenant@example.com' },
      expires: '2099-01-01',
    } as never)
    const result = await getDocumentViewUrlAction('doc-123', 'grant-456')
    expect(result).toEqual({ error: 'Access denied' })
  })

  it('returns { error: "Access denied" } when document not found', async () => {
    mockAuth.mockResolvedValue(landlordSession as never)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any
    ;(mockDocumentFindUnique as jest.MockedFunction<any>).mockResolvedValue(null)
    const result = await getDocumentViewUrlAction('doc-123', 'grant-456')
    expect(result).toEqual({ error: 'Access denied' })
  })

  it('returns { error: "Access denied" } when grant not found', async () => {
    mockAuth.mockResolvedValue(landlordSession as never)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any
    ;(mockAccessGrantFindUnique as jest.MockedFunction<any>).mockResolvedValue(null)
    const result = await getDocumentViewUrlAction('doc-123', 'grant-456')
    expect(result).toEqual({ error: 'Access denied' })
  })

  it('returns { error: "Access denied" } when grant property belongs to different landlord', async () => {
    mockAuth.mockResolvedValue(landlordSession as never)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any
    ;(mockAccessGrantFindUnique as jest.MockedFunction<any>).mockResolvedValue({
      ...mockGrant,
      application: { property: { landlordId: 'other-landlord-999' } },
    })
    const result = await getDocumentViewUrlAction('doc-123', 'grant-456')
    expect(result).toEqual({ error: 'Access denied' })
  })

  it('returns { error: "Access denied" } when grant is revoked', async () => {
    mockAuth.mockResolvedValue(landlordSession as never)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any
    ;(mockAccessGrantFindUnique as jest.MockedFunction<any>).mockResolvedValue({ ...mockGrant, revokedAt: new Date('2024-06-01') })
    const result = await getDocumentViewUrlAction('doc-123', 'grant-456')
    expect(result).toEqual({ error: 'Access denied' })
  })

  it('returns { error: "Access denied" } when grant is expired', async () => {
    mockAuth.mockResolvedValue(landlordSession as never)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any
    ;(mockAccessGrantFindUnique as jest.MockedFunction<any>).mockResolvedValue({ ...mockGrant, expiresAt: new Date('2020-01-01') })
    const result = await getDocumentViewUrlAction('doc-123', 'grant-456')
    expect(result).toEqual({ error: 'Access denied' })
  })

  it('returns { error: "Access denied" } when document type not in allowedDocs', async () => {
    mockAuth.mockResolvedValue(landlordSession as never)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any
    ;(mockDocumentFindUnique as jest.MockedFunction<any>).mockResolvedValue({ ...mockDocument, type: 'CREDIT_REPORT' })
    const result = await getDocumentViewUrlAction('doc-123', 'grant-456')
    expect(result).toEqual({ error: 'Access denied' })
  })

  it('returns { url } on happy path without storageKey', async () => {
    mockAuth.mockResolvedValue(landlordSession as never)
    const result = await getDocumentViewUrlAction('doc-123', 'grant-456')
    expect(result).toEqual({ url: 'https://s3.example.com/presigned?token=abc' })
    expect(result).not.toHaveProperty('storageKey')
  })

  it('writes AuditEvent with DOCUMENT_VIEWED on happy path', async () => {
    mockAuth.mockResolvedValue(landlordSession as never)
    await getDocumentViewUrlAction('doc-123', 'grant-456')
    expect(mockAuditEventCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          accessGrantId: 'grant-456',
          eventType: 'DOCUMENT_VIEWED',
          actorId: 'landlord-abc',
          actorType: 'LANDLORD',
        }),
      })
    )
  })
})
