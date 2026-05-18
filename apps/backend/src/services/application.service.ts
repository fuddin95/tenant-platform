import type { Application, DocumentType, ApplicationStatus } from '@rental-trust/database';
import type { IApplicationRepository, ApplicationSummary } from '../repositories/interfaces/IApplicationRepository';
import type { IGrantRepository } from '../repositories/interfaces/IGrantRepository';
import type { IAuditRepository } from '../repositories/interfaces/IAuditRepository';
import type { INotificationRepository } from '../repositories/interfaces/INotificationRepository';
import type { IPropertyRepository } from '../repositories/interfaces/IPropertyRepository';
import { ConflictError, ForbiddenError, NotFoundError } from '../types/errors';

const GRANT_TTL_DAYS = 7;

export type ApplicationLandlordView = Application;
export type ApplicationTenantView = Omit<Application, 'status'>;

export type SubmitInput = {
  tenantId: string;
  propertyId: string;
  landlordId: string;
  allowedDocs: DocumentType[];
  requiredDocs: DocumentType[];
};

export type SubmitResult = { applicationId: string; grantId: string };

export type ApplicationService = {
  submit(input: SubmitInput): Promise<SubmitResult>;
  listByTenant(tenantId: string): Promise<ApplicationSummary[]>;
  getForLandlord(id: string, landlordId: string): Promise<ApplicationLandlordView>;
  getForTenant(id: string, tenantId: string): Promise<ApplicationTenantView>;
  updateStatus(id: string, landlordId: string, status: ApplicationStatus): Promise<Application>;
};

export const makeApplicationService = (
  appRepo: IApplicationRepository,
  grantRepo: IGrantRepository,
  auditRepo: IAuditRepository,
  notifRepo: INotificationRepository,
  propRepo: IPropertyRepository,
): ApplicationService => ({
  submit: async ({ tenantId, propertyId, landlordId, allowedDocs, requiredDocs }) => {
    const exists = await appRepo.existsByTenantAndProperty(tenantId, propertyId);
    if (exists) throw new ConflictError('You have already applied to this property');

    const application = await appRepo.create({ tenantId, propertyId });

    const expiresAt = new Date(Date.now() + GRANT_TTL_DAYS * 24 * 60 * 60 * 1000);
    const grant = await grantRepo.create({ applicationId: application.id, expiresAt, allowedDocs });

    await auditRepo.create({
      accessGrantId: grant.id,
      eventType: 'APPLICATION_SUBMITTED',
      actorId: tenantId,
      actorType: 'TENANT',
    });
    await auditRepo.create({
      accessGrantId: grant.id,
      eventType: 'ACCESS_GRANTED',
      actorId: tenantId,
      actorType: 'TENANT',
    });

    await notifRepo.create({
      applicationId: application.id,
      recipientId: landlordId,
      recipientType: 'LANDLORD',
      type: 'APPLICATION_RECEIVED',
    });

    const hasMissingDocs = requiredDocs.some((doc) => !allowedDocs.includes(doc));
    if (hasMissingDocs) {
      await notifRepo.create({
        applicationId: application.id,
        recipientId: tenantId,
        recipientType: 'TENANT',
        type: 'MISSING_DOCUMENTS',
      });
    }

    return { applicationId: application.id, grantId: grant.id };
  },

  listByTenant: (tenantId) => appRepo.findByTenant(tenantId),

  getForLandlord: async (id, landlordId) => {
    const application = await appRepo.findById(id);
    if (!application) throw new NotFoundError('Application not found');
    const property = await propRepo.findById(application.propertyId);
    if (!property || property.landlordId !== landlordId) throw new ForbiddenError('Access denied');
    return application;
  },

  getForTenant: async (id, tenantId) => {
    const application = await appRepo.findById(id);
    if (!application) throw new NotFoundError('Application not found');
    if (application.tenantId !== tenantId) throw new ForbiddenError('Access denied');
    const { status: _status, ...tenantView } = application;
    return tenantView;
  },

  updateStatus: async (id, landlordId, status) => {
    const application = await appRepo.findById(id);
    if (!application) throw new NotFoundError('Application not found');

    const property = await propRepo.findById(application.propertyId);
    if (!property || property.landlordId !== landlordId) throw new ForbiddenError('Access denied');

    const updated = await appRepo.updateStatus(id, status);
    return updated;
  },
});
