import type { Application, ApplicationStatus, DocumentType } from '@rental-trust/database';

export type CreateApplicationData = {
  tenantId: string;
  propertyId: string;
};

export type ApplicationSummary = {
  id: string;
  propertyAddress: string;
  landlordName: string;
  submittedAt: Date;
  grantStatus: 'ACTIVE' | 'EXPIRED' | 'REVOKED';
};

export type ApplicationCard = {
  id: string;
  tenantName: string;
  submittedAt: Date;
  status: ApplicationStatus;
  profileCompletion: number;
  missingDocs: DocumentType[];
};

export interface IApplicationRepository {
  findByTenant(tenantId: string): Promise<ApplicationSummary[]>;
  findById(id: string): Promise<Application | null>;
  findByProperty(propertyId: string): Promise<ApplicationCard[]>;
  create(data: CreateApplicationData): Promise<Application>;
  updateStatus(id: string, status: ApplicationStatus): Promise<Application>;
  existsByTenantAndProperty(tenantId: string, propertyId: string): Promise<boolean>;
}
