'use server'

import { z } from 'zod'
import { db } from '@rental-trust/database'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'

const CreatePropertySchema = z.object({
  address: z.string().min(1),
  city: z.string().min(1),
  unitNumber: z.string().optional(),
  bedrooms: z.coerce.number().int().min(0).max(20),
  rent: z.coerce.number().positive(),
  status: z.enum(['ACTIVE', 'FILLED', 'INACTIVE']),
})

export async function createPropertyAction(
  _prev: { readonly error: string } | null,
  formData: FormData
): Promise<{ readonly error: string } | null> {
  const session = await auth()
  if (!session) redirect('/auth/signin')

  const parsed = CreatePropertySchema.safeParse({
    address: formData.get('address'),
    city: formData.get('city'),
    unitNumber: formData.get('unitNumber') || undefined,
    bedrooms: formData.get('bedrooms'),
    rent: formData.get('rent'),
    status: formData.get('status'),
  })

  if (!parsed.success) return { error: 'Please check all fields and try again.' }

  const { address, city, unitNumber, bedrooms, rent, status } = parsed.data

  try {
    await db.property.create({
      data: {
        landlordId: session.user.userId,
        address,
        city,
        unitNumber: unitNumber ?? null,
        bedrooms,
        rent,
        status,
      },
    })
  } catch {
    return { error: 'Failed to create property. Please try again.' }
  }

  redirect('/properties')
}
