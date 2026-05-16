'use server'

import { z } from 'zod'
import { db } from '@rental-trust/database'
import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'

const AddReferenceSchema = z.object({
  profileId: z.string().min(1, 'profileId is required'),
  name: z.string().min(1, 'Name is required'),
  relationship: z.string().min(1, 'Relationship is required'),
  email: z.string().email('Invalid email address').optional(),
  phone: z.string().optional(),
})

export type AddReferenceState = { error: string } | { success: true } | null

export async function addReferenceAction(
  _prev: AddReferenceState,
  formData: FormData
): Promise<AddReferenceState> {
  const session = await auth()
  if (!session) return { error: 'Not authenticated.' }
  if (session.user.role !== 'TENANT') return { error: 'Only tenants can add references.' }

  const rawEmail = formData.get('email')
  const rawPhone = formData.get('phone')

  const parsed = AddReferenceSchema.safeParse({
    profileId: formData.get('profileId'),
    name: formData.get('name'),
    relationship: formData.get('relationship'),
    email: rawEmail && rawEmail !== '' ? rawEmail : undefined,
    phone: rawPhone && rawPhone !== '' ? rawPhone : undefined,
  })

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Invalid input.' }
  }

  const { profileId, name, relationship, email, phone } = parsed.data

  const profile = await db.profile.findUnique({
    where: { id: profileId },
    select: { tenantId: true },
  })
  if (!profile || profile.tenantId !== session.user.userId) {
    return { error: 'Profile not found.' }
  }

  await db.tenantReference.create({
    data: {
      profileId,
      name,
      relationship,
      email: email ?? null,
      phone: phone ?? null,
    },
  })

  revalidatePath('/profile')
  return { success: true }
}
