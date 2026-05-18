import { createHash } from 'crypto'
import { db } from '@rental-trust/database'
import type { FactCategory } from '@rental-trust/database'

export type TokenValidationResult =
  | {
      readonly status: 'valid'
      readonly shareLink: {
        readonly id:             string
        readonly recipientName:  string
        readonly recipientEmail: string
        readonly allowedFacts:   readonly FactCategory[]
        readonly expiresAt:      Date
        readonly viewedAt:       Date | null
      }
    }
  | { readonly status: 'not_found' }
  | { readonly status: 'revoked' }
  | { readonly status: 'expired' }

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
