import type { AccessGrant, DocumentType } from '@rental-trust/database';

export type CreateGrantData = {
  applicationId: string;
  expiresAt: Date;
  allowedDocs: DocumentType[];
};

export type GrantWithContext = AccessGrant & {
  application: {
    tenantId: string;
    property: { landlordId: string; address: string; city: string };
  };
};

export type GrantSummary = {
  id: string;
  landlordName: string;
  propertyAddress: string;
  grantedAt: Date;
  expiresAt: Date;
  allowedDocs: DocumentType[];
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED';
};

export interface IGrantRepository {
  findByTenant(tenantId: string): Promise<GrantSummary[]>;
  findById(id: string): Promise<GrantWithContext | null>;
  create(data: CreateGrantData): Promise<AccessGrant>;
  revoke(id: string, revokedBy: string): Promise<void>;
}
