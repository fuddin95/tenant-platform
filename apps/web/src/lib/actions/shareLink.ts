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
