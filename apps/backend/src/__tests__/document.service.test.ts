import { makeDocumentService } from '../services/document.service';
import { ForbiddenError } from '../types/errors';
import type { IProfileRepository } from '../repositories/interfaces/IProfileRepository';
import type { IGrantRepository, GrantWithContext } from '../repositories/interfaces/IGrantRepository';
import type { IAuditRepository } from '../repositories/interfaces/IAuditRepository';
import type { IDocumentRepository } from '../repositories/interfaces/IDocumentRepository';
import type { S3Service } from '../utils/s3';
import type { Document } from '@rental-trust/database';

const TENANT_ID = 'tenant-1';
const LANDLORD_ID = 'landlord-1';
const PROFILE_ID = 'profile-1';
const DOCUMENT_ID = 'doc-1';
const GRANT_ID = 'grant-1';

const baseDocument: Document = {
  id: DOCUMENT_ID,
  profileId: PROFILE_ID,
  type: 'GOVERNMENT_ID',
  storageKey: 'tenants/tenant-1/uuid/passport.pdf',
  fileName: 'passport.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 512000,
  replacedAt: null,
  uploadedAt: new Date(),
};

const activeGrant: GrantWithContext = {
  id: GRANT_ID,
  applicationId: 'app-1',
  grantedAt: new Date(),
  expiresAt: new Date(Date.now() + 3600 * 1000),
  revokedAt: null,
  revokedBy: null,
  allowedDocs: ['GOVERNMENT_ID'],
  application: {
    tenantId: TENANT_ID,
    property: { landlordId: LANDLORD_ID, address: '123 Main St', city: 'Toronto' },
  },
};

describe('makeDocumentService', () => {
  let mockProfileRepo: jest.Mocked<Pick<IProfileRepository, 'findByTenantId' | 'findDocumentById' | 'addDocument' | 'updateCompletion' | 'findActiveDocTypes' | 'countReferences'>>;
  let mockDocumentRepo: jest.Mocked<IDocumentRepository>;
  let mockGrantRepo: jest.Mocked<Pick<IGrantRepository, 'findById'>>;
  let mockAuditRepo: jest.Mocked<IAuditRepository>;
  let mockS3: jest.Mocked<S3Service>;
  let service: ReturnType<typeof makeDocumentService>;

  beforeEach(() => {
    mockProfileRepo = {
      findByTenantId: jest.fn(),
      findDocumentById: jest.fn(),
      addDocument: jest.fn(),
      updateCompletion: jest.fn(),
      findActiveDocTypes: jest.fn(),
      countReferences: jest.fn(),
    };
    mockDocumentRepo = {
      findById: jest.fn(),
      findByProfileId: jest.fn(),
    };
    mockGrantRepo = {
      findById: jest.fn(),
    };
    mockAuditRepo = {
      create: jest.fn(),
    };
    mockS3 = {
      getPresignedPutUrl: jest.fn(),
      getPresignedGetUrl: jest.fn(),
    };

    service = makeDocumentService(
      mockProfileRepo as unknown as IProfileRepository,
      mockDocumentRepo,
      mockGrantRepo as unknown as IGrantRepository,
      mockAuditRepo,
      mockS3,
    );
  });

  // ─── getUploadUrl ──────────────────────────────────────────────────────────

  describe('getUploadUrl', () => {
    beforeEach(() => {
      mockProfileRepo.findByTenantId.mockResolvedValue({
        id: PROFILE_ID,
        tenantId: TENANT_ID,
        completionPercent: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        documents: [],
        references: [],
      });
      mockS3.getPresignedPutUrl.mockResolvedValue('https://s3.example.com/presigned-put');
      mockProfileRepo.addDocument.mockResolvedValue(baseDocument);
    });

    it('returns a presigned PUT URL and documentId', async () => {
      const result = await service.getUploadUrl(TENANT_ID, 'GOVERNMENT_ID', 'passport.pdf', 'application/pdf', 512000);

      expect(result).toMatchObject({
        uploadUrl: 'https://s3.example.com/presigned-put',
        documentId: DOCUMENT_ID,
      });
    });

    it('generates storageKey with tenants/{tenantId}/{uuid}/{fileName} pattern', async () => {
      await service.getUploadUrl(TENANT_ID, 'GOVERNMENT_ID', 'passport.pdf', 'application/pdf', 512000);

      const [key, mimeType, expiresIn] = mockS3.getPresignedPutUrl.mock.calls[0];
      expect(key).toMatch(/^tenants\/tenant-1\/[a-z0-9]+\/passport\.pdf$/);
      expect(mimeType).toBe('application/pdf');
      expect(expiresIn).toBe(900); // 15 minutes
    });

    it('throws ForbiddenError when tenant profile does not exist', async () => {
      mockProfileRepo.findByTenantId.mockResolvedValue(null);

      await expect(
        service.getUploadUrl(TENANT_ID, 'GOVERNMENT_ID', 'passport.pdf', 'application/pdf', 512000),
      ).rejects.toThrow(ForbiddenError);
    });

    it('rejects files larger than 10MB', async () => {
      await expect(
        service.getUploadUrl(TENANT_ID, 'GOVERNMENT_ID', 'huge.pdf', 'application/pdf', 11 * 1024 * 1024),
      ).rejects.toThrow('File size exceeds');
    });
  });

  // ─── getViewUrl ────────────────────────────────────────────────────────────

  describe('getViewUrl', () => {
    beforeEach(() => {
      mockDocumentRepo.findById.mockResolvedValue(baseDocument);
      mockGrantRepo.findById.mockResolvedValue(activeGrant);
      mockS3.getPresignedGetUrl.mockResolvedValue('https://s3.example.com/presigned-get');
      mockAuditRepo.create.mockResolvedValue({
        id: 'audit-1',
        accessGrantId: GRANT_ID,
        eventType: 'DOCUMENT_VIEWED',
        actorId: LANDLORD_ID,
        actorType: 'LANDLORD',
        metadata: { documentType: 'GOVERNMENT_ID' },
        occurredAt: new Date(),
      });
    });

    it('returns presigned GET URL and expiresAt on success', async () => {
      const result = await service.getViewUrl(DOCUMENT_ID, GRANT_ID, LANDLORD_ID);

      expect(result.url).toBe('https://s3.example.com/presigned-get');
      expect(result.expiresAt).toBeInstanceOf(Date);
    });

    it('writes DOCUMENT_VIEWED AuditEvent on successful view', async () => {
      await service.getViewUrl(DOCUMENT_ID, GRANT_ID, LANDLORD_ID);

      expect(mockAuditRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          accessGrantId: GRANT_ID,
          eventType: 'DOCUMENT_VIEWED',
          actorId: LANDLORD_ID,
          actorType: 'LANDLORD',
          metadata: expect.objectContaining({ documentType: 'GOVERNMENT_ID' }),
        }),
      );
    });

    it('throws ForbiddenError when grant is revoked', async () => {
      mockGrantRepo.findById.mockResolvedValue({
        ...activeGrant,
        revokedAt: new Date(),
      });

      await expect(service.getViewUrl(DOCUMENT_ID, GRANT_ID, LANDLORD_ID)).rejects.toThrow(ForbiddenError);
      expect(mockAuditRepo.create).not.toHaveBeenCalled();
    });

    it('throws ForbiddenError when grant is expired', async () => {
      mockGrantRepo.findById.mockResolvedValue({
        ...activeGrant,
        expiresAt: new Date(Date.now() - 1000),
      });

      await expect(service.getViewUrl(DOCUMENT_ID, GRANT_ID, LANDLORD_ID)).rejects.toThrow(ForbiddenError);
      expect(mockAuditRepo.create).not.toHaveBeenCalled();
    });

    it('throws ForbiddenError when document type is not in grant allowedDocs', async () => {
      mockDocumentRepo.findById.mockResolvedValue({
        ...baseDocument,
        type: 'CREDIT_REPORT',
      });

      await expect(service.getViewUrl(DOCUMENT_ID, GRANT_ID, LANDLORD_ID)).rejects.toThrow(ForbiddenError);
      expect(mockAuditRepo.create).not.toHaveBeenCalled();
    });

    it('throws ForbiddenError when landlord does not own the property on the grant', async () => {
      mockGrantRepo.findById.mockResolvedValue({
        ...activeGrant,
        application: {
          ...activeGrant.application,
          property: { landlordId: 'other-landlord', address: '123 Main St', city: 'Toronto' },
        },
      });

      await expect(service.getViewUrl(DOCUMENT_ID, GRANT_ID, LANDLORD_ID)).rejects.toThrow(ForbiddenError);
      expect(mockAuditRepo.create).not.toHaveBeenCalled();
    });

    it('throws ForbiddenError when grant does not exist', async () => {
      mockGrantRepo.findById.mockResolvedValue(null);

      await expect(service.getViewUrl(DOCUMENT_ID, GRANT_ID, LANDLORD_ID)).rejects.toThrow(ForbiddenError);
    });

    it('throws ForbiddenError when document does not exist', async () => {
      mockDocumentRepo.findById.mockResolvedValue(null);

      await expect(service.getViewUrl(DOCUMENT_ID, GRANT_ID, LANDLORD_ID)).rejects.toThrow(ForbiddenError);
    });
  });
});
