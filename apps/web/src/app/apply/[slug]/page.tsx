import { db } from '@rental-trust/database';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Button from '@/components/ui/Button';

type PageParams = {
  readonly params: {
    readonly slug: string;
  };
};

const ApplyPage = async ({ params }: PageParams) => {
  const property = await db.property.findUnique({
    where: { applySlug: params.slug },
    select: {
      id: true,
      address: true,
      city: true,
      bedrooms: true,
      rent: true,
      status: true,
      applySlug: true,
    },
  });

  if (!property) {
    notFound();
  }

  const isActive = property.status === 'ACTIVE';

  const formatter = new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
  });
  const formattedRent = formatter.format(Number(property.rent));

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl">
        {/* Header with wordmark */}
        <div className="text-center mb-12">
          <h1 className="font-serif text-4xl font-bold text-fg-1 mb-2">RentalTrust</h1>
        </div>

        {/* Property card */}
        <div className="bg-surface-1 border border-border-1 rounded-lg p-8">
          {/* Address */}
          <h2 className="font-serif text-3xl font-bold text-fg-1 mb-1">{property.address}</h2>

          {/* City */}
          <p className="text-fg-2 mb-6">{property.city}</p>

          {/* Details row */}
          <p className="text-fg-1 mb-8">
            {property.bedrooms} {property.bedrooms === 1 ? 'bedroom' : 'bedrooms'} · {formattedRent}/mo
          </p>

          {/* Apply section */}
          {isActive ? (
            <div className="space-y-4">
              <Link href={`/apply/${params.slug}/submit`} className="block">
                <Button variant="primary" className="w-full">
                  Apply for this property
                </Button>
              </Link>
              <p className="text-center text-fg-3 text-sm">
                You&apos;ll need to sign in to complete your application.
              </p>
            </div>
          ) : (
            <div className="bg-bg-2 border border-border-1 rounded-md p-4">
              <p className="text-fg-2">
                This property is no longer accepting applications.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApplyPage;
