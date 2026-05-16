/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment */
import { requestUploadAction } from '../document'

jest.mock('@/auth', () => ({
  auth: jest.fn(),
}))

jest.mock('@rental-trust/database', () => ({
  db: {
    profile: { upsert: jest.fn() },
    document: { create: jest.fn() },
  },
}))

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({})),
  PutObjectCommand: jest.fn().mockImplementation((input: unknown) => ({ input })),
}))

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://s3.example.com/presigned'),
}))

jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}))

jest.mock('crypto', () => ({
  randomBytes: jest.fn().mockReturnValue(Buffer.from('abcdef1234567890', 'hex')),
}))

import { auth } from '@/auth'
import { db } from '@rental-trust/database'

const mockAuth = jest.mocked(auth)
// eslint-disable-next-line @typescript-eslint/unbound-method
const mockProfileUpsert = jest.mocked(db.profile.upsert)
// eslint-disable-next-line @typescript-eslint/unbound-method
const mockDocumentCreate = jest.mocked(db.document.create)

const validInput = {
  type: 'GOVERNMENT_ID' as const,
  fileName: 'id.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 1024 * 1024,
}

const tenantSession = {
  user: { userId: 'tenant-123', role: 'TENANT' as const, email: 'tenant@example.com' },
  expires: '2099-01-01',
}

describe('requestUploadAction', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any
    ;(mockProfileUpsert as jest.MockedFunction<any>).mockResolvedValue({ id: 'profile-abc' })
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any
    ;(mockDocumentCreate as jest.MockedFunction<any>).mockResolvedValue({ id: 'doc-xyz' })
  })

  it('returns { error } when session is missing', async () => {
    mockAuth.mockResolvedValue(null as never)
    const result = await requestUploadAction(validInput)
    expect(result).toEqual({ error: 'Not authenticated.' })
  })

  it('returns { error } when role is not TENANT', async () => {
    mockAuth.mockResolvedValue({
      user: { userId: 'landlord-1', role: 'LANDLORD' as const, email: 'landlord@example.com' },
      expires: '2099-01-01',
    } as never)
    const result = await requestUploadAction(validInput)
    expect(result).toEqual({ error: 'Only tenants can upload documents.' })
  })

  it('returns { error } when file exceeds 10 MB', async () => {
    mockAuth.mockResolvedValue(tenantSession as never)
    const result = await requestUploadAction({ ...validInput, sizeBytes: 10 * 1024 * 1024 + 1 })
    expect(result).toEqual({ error: 'File exceeds 10 MB limit.' })
  })

  it('returns { uploadUrl, documentId } on happy path', async () => {
    mockAuth.mockResolvedValue(tenantSession as never)
    const result = await requestUploadAction(validInput)
    expect(result).toEqual({ uploadUrl: 'https://s3.example.com/presigned', documentId: 'doc-xyz' })
  })

  it('never includes storageKey in the return value', async () => {
    mockAuth.mockResolvedValue(tenantSession as never)
    const result = await requestUploadAction(validInput)
    expect(result).not.toHaveProperty('storageKey')
  })

  it('returns { error } when input fails Zod validation', async () => {
    mockAuth.mockResolvedValue(tenantSession as never)
    const result = await requestUploadAction({ type: 'INVALID_TYPE' as never, fileName: '', mimeType: '', sizeBytes: -1 })
    expect(result).toHaveProperty('error')
  })

  it('upserts profile and creates document record on happy path', async () => {
    mockAuth.mockResolvedValue(tenantSession as never)
    await requestUploadAction(validInput)
    expect(mockProfileUpsert).toHaveBeenCalledWith(expect.objectContaining({ where: { tenantId: 'tenant-123' } }))
    expect(mockDocumentCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: 'GOVERNMENT_ID', fileName: 'id.pdf' }) })
    )
  })
})
