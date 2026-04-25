import type { PropertyCard as PropertyCardType } from '@/types/codecs';

const PropertyCard = ({ property }: { readonly property: PropertyCardType }) => (
  <div className="rounded-lg border border-gray-200 bg-white p-4">
    <p className="font-medium text-gray-900">{property.address}</p>
    <p className="text-sm text-gray-500">
      {property.bedrooms} bed · ${property.rent}/mo
    </p>
  </div>
);

export default PropertyCard;
