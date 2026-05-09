'use server'

import { z } from 'zod'
import { db } from '@rental-trust/database'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'

const SubmitSchema = z.object({
  propertyId: z.string().min(1),
})

export async function submitApplicationAction(
  _prev: { readonly error: string } | null,
  formData: FormData
): Promise<{ readonly error: string } | null> {
  const session = await auth()
  if (!session) redirect('/auth/signin')
  if (session.user.role !== 'TENANT') return { error: 'Only tenants can apply.' }

  const parsed = SubmitSchema.safeParse({ propertyId: formData.get('propertyId') })
  if (!parsed.success) return { error: 'Invalid request.' }

  try {
    await db.application.create({
      data: {
        tenantId: session.user.userId,
        propertyId: parsed.data.propertyId,
      },
    })
  } catch (err: unknown) {
    // Unique constraint — tenant already applied
    const msg = err instanceof Error ? err.message : ''
    if (msg.includes('Unique constraint')) {
      return { error: 'You have already applied for this property.' }
    }
    return { error: 'Failed to submit application. Please try again.' }
  }

  redirect('/profile')
}
