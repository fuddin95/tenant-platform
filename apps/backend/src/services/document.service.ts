import { randomBytes } from 'crypto';
import type { IProfileRepository } from '../repositories/interfaces/IProfileRepository';
import type { IDocumentRepository } from '../repositories/interfaces/IDocumentRepository';
import type { IGrantRepository } from '../repositories/interfaces/IGrantRepository';
import type { IAuditRepository } from '../repositories/interfaces/IAuditRepository';
import type { S3Service } from '../utils/s3';
import type { DocumentType } from '@rental-trust/database';
import { ForbiddenError, ValidationError } from '../types/errors';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const UPLOAD_URL_EXPIRY = 900; // 15 minutes
const VIEW_URL_EXPIRY = 3600; // 1 hour (Constitution Rule 2 max)

export type GetUploadUrlResult = {
  uploadUrl: string;
  storageKey: string;
  documentId: string;
};

export type GetViewUrlResult = {
  url: string;
  expiresAt: Date;
};

export type DocumentService = {
  getUploadUrl: (
    tenantId: string,
    type: DocumentType,
    fileName: string,
    mimeType: string,
    sizeBytes: number,
  ) => Promise<GetUploadUrlResult>;
  getViewUrl: (
    documentId: string,
    grantId: string,
    landlordId: string,
  ) => Promise<GetViewUrlResult>;
};

export const makeDocumentService = (
  profileRepo: IProfileRepository,
  documentRepo: IDocumentRepository,
  grantRepo: IGrantRepository,
  auditRepo: IAuditRepository,
  s3: S3Service,
): DocumentService => ({
  getUploadUrl: async (tenantId, type, fileName, mimeType, sizeBytes) => {
    // Validate file size — server-side cap (TEN-67 acceptance criteria)
    if (sizeBytes > MAX_FILE_SIZE) {
      throw new ValidationError(`File size exceeds the 10MB limit`);
    }

    // Resolve the tenant's profile — tenants must have a profile to upload docs
    const profile = await profileRepo.findByTenantId(tenantId);
    if (!profile) {
      throw new ForbiddenError('Profile not found for tenant');
    }

    // Build storage key: tenants/{tenantId}/{uuid}/{fileName}
    // uuid is random hex — never derived from user input
    const uuid = randomBytes(16).toString('hex');
    const storageKey = `tenants/${tenantId}/${uuid}/${fileName}`;

    // Generate pre-signed PUT URL (15 min expiry, SSE-KMS handled in s3 service)
    const uploadUrl = await s3.getPresignedPutUrl(storageKey, mimeType, UPLOAD_URL_EXPIRY);

    // Pre-create Document row so we can return a documentId
    // (same type = new record, not overwrite — per TEN-67 acceptance criteria)
    const document = await profileRepo.addDocument({
      profileId: profile.id,
      type,
      storageKey,
      fileName,
      mimeType,
      sizeBytes,
    });

    return { uploadUrl, storageKey, documentId: document.id };
  },

  getViewUrl: async (documentId, grantId, landlordId) => {
    // Step 1 — load document
    const document = await documentRepo.findById(documentId);
    if (!document) {
      throw new ForbiddenError('Access denied'); // never expose why (TEN-69)
    }

    // Step 2 — load grant
    const grant = await grantRepo.findById(grantId);
    if (!grant) {
      throw new ForbiddenError('Access denied');
    }

    // Step 3 — check grant active: revokedAt must be null (Constitution Rule 4)
    if (grant.revokedAt) {
      throw new ForbiddenError('Access denied');
    }

    // Step 4 — check grant not expired (Constitution Rule 8)
    if (grant.expiresAt <= new Date()) {
      throw new ForbiddenError('Access denied');
    }

    // Step 5 — verify document type is in grant's allowedDocs (Rule 3 — granular consent)
    if (!grant.allowedDocs.includes(document.type)) {
      throw new ForbiddenError('Access denied');
    }

    // Step 6 — verify the requesting landlord owns the property on this grant (Rule 1)
    if (grant.application.property.landlordId !== landlordId) {
      throw new ForbiddenError('Access denied');
    }

    // Step 7 — generate pre-signed GET URL (max 1hr — Constitution Rule 2)
    const expiresAt = new Date(Date.now() + VIEW_URL_EXPIRY * 1000);
    const url = await s3.getPresignedGetUrl(document.storageKey, VIEW_URL_EXPIRY);

    // Step 8 — write AuditEvent BEFORE returning (Constitution Rule 3)
    await auditRepo.create({
      accessGrantId: grantId,
      eventType: 'DOCUMENT_VIEWED',
      actorId: landlordId,
      actorType: 'LANDLORD',
      metadata: { documentType: document.type },
    });

    return { url, expiresAt };
  },
});
