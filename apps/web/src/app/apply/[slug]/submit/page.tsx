import { auth } from '@/auth'
import { db } from '@rental-trust/database'
import { redirect, notFound } from 'next/navigation'
import SubmitForm from './SubmitForm'

type PageParams = {
  readonly params: {
    readonly slug: string
  }
}

const SubmitPage = async ({ params }: PageParams) => {
  const session = await auth()
  if (!session) redirect('/auth/signin')
  if (session.user.role !== 'TENANT') redirect('/auth/signin')

  const property = await db.property.findUnique({
    where: { applySlug: params.slug },
    select: {
      id: true,
      address: true,
      city: true,
      bedrooms: true,
      rent: true,
    },
  })

  if (!property) {
    notFound()
  }

  const formatter = new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
  })
  const formattedRent = formatter.format(Number(property.rent))

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl">
        {/* Header with wordmark */}
        <div className="text-center mb-12">
          <h1 className="font-serif text-4xl font-bold text-fg-1 mb-2">RentalTrust</h1>
        </div>

        {/* Confirmation card */}
        <div className="bg-surface-1 border border-border-1 rounded-lg p-8">
          <h2 className="font-serif text-3xl font-bold text-fg-1 mb-8">Confirm your application</h2>

          {/* Property summary */}
          <div className="bg-bg-1 rounded-lg p-6 mb-8">
            <div className="mb-4">
              <p className="text-fg-3 text-sm mb-1">Property</p>
              <p className="font-serif text-2xl font-bold text-fg-1">{property.address}</p>
            </div>
            <p className="text-fg-2 mb-6">{property.city}</p>
            <p className="text-fg-1">
              {property.bedrooms} {property.bedrooms === 1 ? 'bedroom' : 'bedrooms'} · {formattedRent}
              /mo
            </p>
          </div>

          {/* Confirmation text */}
          <p className="text-fg-2 mb-8">
            By clicking confirm, you are submitting an application for this property.
          </p>

          {/* Form */}
          <SubmitForm propertyId={property.id} />
        </div>
      </div>
    </div>
  )
}

export default SubmitPage
