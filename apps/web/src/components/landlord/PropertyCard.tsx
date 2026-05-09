import type { PropertyCard as PropertyCardType } from '@/types/codecs';
import { Badge } from '@/components/ui/Badge';

const PropertyCard = ({ property }: { readonly property: PropertyCardType }) => {
  // Format rent as CAD currency
  const formattedRent = new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
  }).format(property.rent);

  // Map property status to badge variant
  const statusVariant =
    property.status === 'ACTIVE' ? 'success' : 'neutral';

  return (
    <div className="rounded-lg border border-border-1 bg-surface-1 p-4">
      {/* Header with address and status badge */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex-1">
          <p className="font-medium text-fg-1">{property.address}</p>
          <p className="text-sm text-fg-2">{property.city}</p>
        </div>
        <Badge variant={statusVariant}>
          {property.status}
        </Badge>
      </div>

      {/* Property details */}
      <div className="text-sm text-fg-3">
        {property.bedrooms} bed · {formattedRent}/mo
      </div>
    </div>
  );
};

export default PropertyCard;
