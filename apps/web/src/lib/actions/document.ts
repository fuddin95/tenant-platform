'use server'

import { z } from 'zod'
import { randomBytes } from 'crypto'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { db } from '@rental-trust/database'
import { auth } from '@/auth'

// ── Zod schema ────────────────────────────────────────────────────────────────

const DocumentTypeEnum = z.enum([
  'GOVERNMENT_ID',
  'PROOF_OF_INCOME',
  'PAY_STUB',
  'EMPLOYMENT_LETTER',
  'REFERENCE_CONTACT',
  'CREDIT_REPORT',
])

const RequestUploadSchema = z.object({
  type: DocumentTypeEnum,
  fileName: z.string().min(1, 'fileName is required'),
  mimeType: z.string().min(1, 'mimeType is required'),
  sizeBytes: z.number().int().positive('sizeBytes must be positive'),
})

type RequestUploadInput = z.infer<typeof RequestUploadSchema>

type UploadSuccessResult = { readonly uploadUrl: string; readonly documentId: string }
type UploadErrorResult = { readonly error: string }
type RequestUploadResult = UploadSuccessResult | UploadErrorResult

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

// ── Server Action ─────────────────────────────────────────────────────────────

/**
 * Validates the tenant session, generates a pre-signed S3 PUT URL,
 * and creates a Document record. Returns { uploadUrl, documentId } on
 * success, or { error } on failure. storageKey is NEVER returned to
 * the client (Constitution Rule 2).
 */
export async function requestUploadAction(
  input: RequestUploadInput
): Promise<RequestUploadResult> {
  // 1. Verify session
  const session = await auth()
  if (!session) {
    return { error: 'Not authenticated.' }
  }
  if (session.user.role !== 'TENANT') {
    return { error: 'Only tenants can upload documents.' }
  }

  const tenantId = session.user.userId
  if (!tenantId) {
    return { error: 'Not authenticated.' }
  }

  // 2. Validate input with Zod
  const parsed = RequestUploadSchema.safeParse(input)
  if (!parsed.success) {
    const message = parsed.error.errors[0]?.message ?? 'Invalid input.'
    return { error: message }
  }

  const { type, fileName, mimeType, sizeBytes } = parsed.data

  // 3. Validate file size
  if (sizeBytes > MAX_FILE_SIZE) {
    return { error: 'File exceeds 10 MB limit.' }
  }

  // 4. Get or create Profile for this tenant
  const profile = await db.profile.upsert({
    where: { tenantId },
    create: { tenantId },
    update: {},
  })

  // 5. Generate storage key — never returned to client
  const randomHex16 = randomBytes(8).toString('hex')
  const storageKey = `tenants/${tenantId}/${randomHex16}/${fileName}`

  // 6. Generate pre-signed S3 PUT URL with 15-minute expiry and SSE-KMS
  const s3 = new S3Client({
    region: process.env.AWS_REGION!,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  })
  const command = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET!,
    Key: storageKey,
    ContentType: mimeType,
    ServerSideEncryption: 'aws:kms',
    SSEKMSKeyId: process.env.AWS_KMS_KEY_ID,
  })
  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 900 })

  // 7. Create Document record in Prisma
  const document = await db.document.create({
    data: {
      profileId: profile.id,
      type,
      storageKey,
      fileName,
      mimeType,
      sizeBytes,
    },
  })

  // 8. Return only uploadUrl + documentId — storageKey stays server-side
  return { uploadUrl, documentId: document.id }
}
