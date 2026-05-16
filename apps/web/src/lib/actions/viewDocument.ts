'use server'

import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { db } from '@rental-trust/database'
import { auth } from '@/auth'

const VIEW_URL_EXPIRY = 3600 // 1 hour — Constitution Rule 2 max

export async function getDocumentViewUrlAction(
  documentId: string,
  grantId: string,
): Promise<{ url: string } | { error: string }> {
  // 1. Verify landlord session
  const session = await auth()
  if (!session) return { error: 'Access denied' }
  if (session.user.role !== 'LANDLORD') return { error: 'Access denied' }

  const landlordId = session.user.userId
  if (!landlordId) return { error: 'Access denied' }

  // 2. Load document
  const document = await db.document.findUnique({ where: { id: documentId } })
  if (!document) return { error: 'Access denied' }

  // 3. Load grant with property ownership info
  const grant = await db.accessGrant.findUnique({
    where: { id: grantId },
    include: { application: { include: { property: true } } },
  })
  if (!grant) return { error: 'Access denied' }

  // 4. Verify landlord owns the property (Constitution Rule 1)
  if (grant.application.property.landlordId !== landlordId) return { error: 'Access denied' }

  // 5. Verify grant is not revoked (Constitution Rule 4)
  if (grant.revokedAt) return { error: 'Access denied' }

  // 6. Verify grant is not expired (Constitution Rule 8)
  if (grant.expiresAt <= new Date()) return { error: 'Access denied' }

  // 7. Verify document type is in granular allowedDocs (Constitution Rule 3)
  if (!grant.allowedDocs.includes(document.type)) return { error: 'Access denied' }

  // 8. Generate pre-signed GET URL — max 1hr (Constitution Rule 2)
  const s3 = new S3Client({
    region: process.env.AWS_REGION!,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  })
  const command = new GetObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET!,
    Key: document.storageKey,
  })
  const url = await getSignedUrl(s3, command, { expiresIn: VIEW_URL_EXPIRY })

  // 9. Write AuditEvent BEFORE returning (Constitution Rule 3)
  await db.auditEvent.create({
    data: {
      accessGrantId: grantId,
      eventType: 'DOCUMENT_VIEWED',
      actorId: landlordId,
      actorType: 'LANDLORD',
      metadata: { documentType: document.type },
    },
  })

  return { url }
}
