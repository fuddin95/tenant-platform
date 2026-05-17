import type { TenantReference } from '@rental-trust/database';

export type CreateReferenceData = {
  profileId: string;
  name: string;
  relationship: string;
  phone?: string;
  email?: string;
};

export interface IReferenceRepository {
  countReferences(profileId: string): Promise<number>;
  addReference(data: CreateReferenceData): Promise<TenantReference>;
  findReferenceById(id: string): Promise<TenantReference | null>;
  deleteReference(id: string): Promise<void>;
}
