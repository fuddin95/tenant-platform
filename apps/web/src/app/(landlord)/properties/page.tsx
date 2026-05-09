import { auth } from '@/auth';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import PropertyCard from '@/components/landlord/PropertyCard';
import { db } from '@rental-trust/database';
import { redirect } from 'next/navigation';
import type { PropertyCard as PropertyCardType } from '@/types/codecs';

async function PropertiesPage() {
  const session = await auth();
  if (!session) redirect('/auth/signin');

  // Fetch properties for the logged-in landlord
  const properties = await db.property.findMany({
    where: { landlordId: session.user.userId },
    orderBy: { createdAt: 'desc' },
  });

  // Map Prisma results to PropertyCard type, converting Decimal rent to number
  const cards: readonly PropertyCardType[] = properties.map((p) => ({
    id: p.id,
    address: p.address,
    city: p.city,
    rent: Number(p.rent),
    bedrooms: p.bedrooms,
    status: p.status,
    applySlug: p.applySlug,
  }));

  return (
    <main className="flex-1 bg-bg-1 p-8">
      {/* Header with title and add button */}
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-fg-1">Properties</h1>
        <Link href="/properties/new">
          <Button variant="primary">Add property</Button>
        </Link>
      </div>

      {/* Properties grid or empty state */}
      {cards.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-border-1 bg-surface-1 py-12">
          <p className="text-fg-2">
            No properties yet. Add your first property to get started.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      )}
    </main>
  );
}

export default PropertiesPage;
