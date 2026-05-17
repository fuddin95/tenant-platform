'use server'

import { z } from 'zod'
import { db } from '@rental-trust/database'
import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'

const DOC_TYPES = [
  'GOVERNMENT_ID',
  'PROOF_OF_INCOME',
  'PAY_STUB',
  'EMPLOYMENT_LETTER',
  'REFERENCE_CONTACT',
  'CREDIT_REPORT',
] as const

const CreateGrantSchema = z.object({
  applicationId: z.string().min(1),
  allowedDocs: z
    .array(z.enum(DOC_TYPES))
    .min(1, 'Select at least one document type.'),
  expiresAt: z.string().min(1, 'Expiry date is required.'),
})

const RevokeGrantSchema = z.object({
  grantId: z.string().min(1),
})

export type GrantActionState = { readonly error: string } | { readonly success: true } | null

export async function createGrantAction(
  _prev: GrantActionState,
  formData: FormData,
): Promise<GrantActionState> {
  const session = await auth()
  if (!session) return { error: 'Not authenticated.' }
  if (session.user.role !== 'TENANT') return { error: 'Only tenants can share documents.' }

  const tenantId = session.user.userId
  if (!tenantId) return { error: 'Not authenticated.' }

  const parsed = CreateGrantSchema.safeParse({
    applicationId: formData.get('applicationId'),
    allowedDocs: formData.getAll('allowedDocs'),
    expiresAt: formData.get('expiresAt'),
  })
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? 'Invalid input.' }

  const { applicationId, allowedDocs, expiresAt } = parsed.data

  // Parse the date-only string (YYYY-MM-DD) as end-of-day UTC
  const expiryDate = new Date(`${expiresAt}T23:59:59Z`)
  if (isNaN(expiryDate.getTime())) return { error: 'Invalid expiry date.' }
  if (expiryDate <= new Date()) return { error: 'Expiry date must be in the future.' }

  const application = await db.application.findUnique({ where: { id: applicationId } })
  if (!application || application.tenantId !== tenantId) return { error: 'Application not found.' }

  const grant = await db.accessGrant.create({
    data: { applicationId, expiresAt: expiryDate, allowedDocs },
  })

  // Constitution Rule 3: every access event is logged
  await db.auditEvent.create({
    data: {
      accessGrantId: grant.id,
      eventType: 'ACCESS_GRANTED',
      actorId: tenantId,
      actorType: 'TENANT',
      metadata: { allowedDocs },
    },
  })

  revalidatePath('/profile')
  return { success: true }
}

export async function revokeGrantAction(
  _prev: GrantActionState,
  formData: FormData,
): Promise<GrantActionState> {
  const session = await auth()
  if (!session) return { error: 'Not authenticated.' }
  if (session.user.role !== 'TENANT') return { error: 'Only tenants can revoke access.' }

  const tenantId = session.user.userId
  if (!tenantId) return { error: 'Not authenticated.' }

  const parsed = RevokeGrantSchema.safeParse({ grantId: formData.get('grantId') })
  if (!parsed.success) return { error: 'Invalid request.' }

  const { grantId } = parsed.data

  const grant = await db.accessGrant.findUnique({
    where: { id: grantId },
    include: { application: { select: { tenantId: true } } },
  })

  if (!grant) return { error: 'Grant not found.' }
  if (grant.application.tenantId !== tenantId) return { error: 'Access denied.' }
  // Constitution Rule 4: revocation is immediate and absolute
  if (grant.revokedAt !== null) return { error: 'Grant already revoked.' }

  await db.accessGrant.update({
    where: { id: grantId },
    data: { revokedAt: new Date(), revokedBy: tenantId },
  })

  await db.auditEvent.create({
    data: {
      accessGrantId: grantId,
      eventType: 'ACCESS_REVOKED',
      actorId: tenantId,
      actorType: 'TENANT',
      metadata: { grantId },
    },
  })

  revalidatePath('/profile')
  return { success: true }
}
