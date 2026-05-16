import { makeApplicationService } from '../services/application.service';
import { ConflictError } from '../types/errors';
import type { IApplicationRepository, ApplicationSummary } from '../repositories/interfaces/IApplicationRepository';
import type { IGrantRepository } from '../repositories/interfaces/IGrantRepository';
import type { IAuditRepository } from '../repositories/interfaces/IAuditRepository';
import type { INotificationRepository } from '../repositories/interfaces/INotificationRepository';
import type { Application, AccessGrant, AuditEvent, Notification, DocumentType } from '@rental-trust/database';

describe('makeApplicationService', () => {
  let appRepo: jest.Mocked<IApplicationRepository>;
  let grantRepo: jest.Mocked<IGrantRepository>;
  let auditRepo: jest.Mocked<IAuditRepository>;
  let notifRepo: jest.Mocked<INotificationRepository>;
  let service: ReturnType<typeof makeApplicationService>;

  const TENANT_ID = 'tenant-1';
  const PROPERTY_ID = 'prop-1';
  const LANDLORD_ID = 'landlord-1';
  const ALLOWED_DOCS: DocumentType[] = ['GOVERNMENT_ID', 'PROOF_OF_INCOME'];
  const REQUIRED_DOCS: DocumentType[] = ['GOVERNMENT_ID', 'PROOF_OF_INCOME'];

  const mockApplication: Application = {
    id: 'app-1',
    tenantId: TENANT_ID,
    propertyId: PROPERTY_ID,
    status: 'PENDING',
    submittedAt: new Date(),
    updatedAt: new Date(),
  };

  const mockGrant: AccessGrant = {
    id: 'grant-1',
    applicationId: 'app-1',
    grantedAt: new Date(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    revokedAt: null,
    revokedBy: null,
    allowedDocs: ALLOWED_DOCS,
  };

  const summaries: ApplicationSummary[] = [
    {
      id: 'app-1',
      propertyAddress: '123 Main St',
      landlordName: 'Test Landlord',
      submittedAt: new Date(),
      grantStatus: 'ACTIVE',
    },
  ];

  beforeEach(() => {
    appRepo = {
      findByTenant: jest.fn(),
      findById: jest.fn(),
      findByProperty: jest.fn(),
      create: jest.fn(),
      updateStatus: jest.fn(),
      existsByTenantAndProperty: jest.fn(),
    };
    grantRepo = {
      findByTenant: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      revoke: jest.fn(),
    };
    auditRepo = { create: jest.fn() };
    notifRepo = {
      findByRecipient: jest.fn(),
      create: jest.fn(),
      markRead: jest.fn(),
    };

    appRepo.existsByTenantAndProperty.mockResolvedValue(false);
    appRepo.create.mockResolvedValue(mockApplication);
    grantRepo.create.mockResolvedValue(mockGrant);
    auditRepo.create.mockResolvedValue({ id: 'audit-1' } as AuditEvent);
    notifRepo.create.mockResolvedValue({ id: 'notif-1' } as unknown as Notification);

    service = makeApplicationService(appRepo, grantRepo, auditRepo, notifRepo);
  });

  describe('submit', () => {
    it('creates application, grant, 2 audit events, and APPLICATION_RECEIVED notification', async () => {
      const result = await service.submit({
        tenantId: TENANT_ID,
        propertyId: PROPERTY_ID,
        landlordId: LANDLORD_ID,
        allowedDocs: ALLOWED_DOCS,
        requiredDocs: REQUIRED_DOCS,
      });

      expect(result).toEqual({ applicationId: 'app-1', grantId: 'grant-1' });

      expect(appRepo.create).toHaveBeenCalledWith({ tenantId: TENANT_ID, propertyId: PROPERTY_ID });

      expect(grantRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          applicationId: 'app-1',
          allowedDocs: ALLOWED_DOCS,
        }),
      );

      expect(auditRepo.create).toHaveBeenCalledTimes(2);
      expect(auditRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'APPLICATION_SUBMITTED', actorId: TENANT_ID, actorType: 'TENANT' }),
      );
      expect(auditRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'ACCESS_GRANTED', actorId: TENANT_ID, actorType: 'TENANT' }),
      );

      expect(notifRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          applicationId: 'app-1',
          recipientId: LANDLORD_ID,
          recipientType: 'LANDLORD',
          type: 'APPLICATION_RECEIVED',
        }),
      );
    });

    it('throws ConflictError when tenant has already applied to this property', async () => {
      appRepo.existsByTenantAndProperty.mockResolvedValue(true);

      await expect(
        service.submit({
          tenantId: TENANT_ID,
          propertyId: PROPERTY_ID,
          landlordId: LANDLORD_ID,
          allowedDocs: ALLOWED_DOCS,
          requiredDocs: REQUIRED_DOCS,
        }),
      ).rejects.toThrow(ConflictError);

      expect(appRepo.create).not.toHaveBeenCalled();
    });

    it('sends MISSING_DOCUMENTS notification to tenant when allowedDocs does not cover all requiredDocs', async () => {
      const partialDocs: DocumentType[] = ['GOVERNMENT_ID']; // missing PROOF_OF_INCOME

      await service.submit({
        tenantId: TENANT_ID,
        propertyId: PROPERTY_ID,
        landlordId: LANDLORD_ID,
        allowedDocs: partialDocs,
        requiredDocs: REQUIRED_DOCS,
      });

      expect(notifRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientId: TENANT_ID,
          recipientType: 'TENANT',
          type: 'MISSING_DOCUMENTS',
        }),
      );
    });

    it('does not send MISSING_DOCUMENTS notification when allowedDocs covers all requiredDocs', async () => {
      await service.submit({
        tenantId: TENANT_ID,
        propertyId: PROPERTY_ID,
        landlordId: LANDLORD_ID,
        allowedDocs: ALLOWED_DOCS,
        requiredDocs: REQUIRED_DOCS,
      });

      const missingDocsCall = notifRepo.create.mock.calls.find(
        ([data]) => data.type === 'MISSING_DOCUMENTS',
      );
      expect(missingDocsCall).toBeUndefined();
    });
  });

  describe('listByTenant', () => {
    it('returns application summaries and the summary type does not include internal status', async () => {
      appRepo.findByTenant.mockResolvedValue(summaries);

      const result = await service.listByTenant(TENANT_ID);

      expect(appRepo.findByTenant).toHaveBeenCalledWith(TENANT_ID);
      expect(result).toEqual(summaries);
      result.forEach((s) => expect(s).not.toHaveProperty('status'));
    });
  });

  describe('getById', () => {
    it('returns application including status when called with LANDLORD role', async () => {
      appRepo.findById.mockResolvedValue(mockApplication);

      const result = await service.getById('app-1', 'LANDLORD');

      expect(result).toHaveProperty('status');
    });

    it('returns application without status when called with TENANT role', async () => {
      appRepo.findById.mockResolvedValue(mockApplication);

      const result = await service.getById('app-1', 'TENANT');

      expect(result).not.toHaveProperty('status');
    });
  });
});
