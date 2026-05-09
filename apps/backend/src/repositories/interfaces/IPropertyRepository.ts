import type { Property, PropertyStatus, DocumentType } from '@rental-trust/database';

export type CreatePropertyData = {
  address: string;
  unitNumber?: string;
  city: string;
  rent: number;
  bedrooms: number;
  requiredDocs: DocumentType[];
};

export type UpdatePropertyData = Partial<CreatePropertyData & { status: PropertyStatus }>;

export type PropertyWithCount = Property & { applicationCount: number };

export type PublicProperty = {
  address: string;
  city: string;
  rent: number;
  bedrooms: number;
  landlordName: string;
  requiredDocs: DocumentType[];
};

export interface IPropertyRepository {
  findByLandlord(landlordId: string): Promise<PropertyWithCount[]>;
  findById(id: string): Promise<Property | null>;
  findBySlug(applySlug: string): Promise<PublicProperty | null>;
  create(landlordId: string, data: CreatePropertyData): Promise<Property>;
  update(id: string, data: UpdatePropertyData): Promise<Property>;
}
