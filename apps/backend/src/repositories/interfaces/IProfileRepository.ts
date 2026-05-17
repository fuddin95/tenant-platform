import type { Profile, Document, TenantReference } from '@rental-trust/database';

export type ProfileWithDocs = Profile & {
  documents: Document[];
  references: TenantReference[];
};

export interface IProfileRepository {
  findByTenantId(tenantId: string): Promise<ProfileWithDocs | null>;
  create(tenantId: string): Promise<Profile>;
  updateCompletion(profileId: string, percent: number): Promise<void>;
}
