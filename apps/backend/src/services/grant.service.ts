import type { AccessGrant, DocumentType } from '@rental-trust/database';
import type { IGrantRepository, GrantSummary } from '../repositories/interfaces/IGrantRepository';
import type { IAuditRepository } from '../repositories/interfaces/IAuditRepository';
import type { IApplicationRepository } from '../repositories/interfaces/IApplicationRepository';
import { ForbiddenError, NotFoundError, ValidationError, ConflictError } from '../types/errors';

export type CreateGrantInput = {
  allowedDocs: DocumentType[];
  expiresAt: Date;
};

export type GrantService = {
  list: (tenantId: string) => Promise<GrantSummary[]>;
  create: (tenantId: string, applicationId: string, data: CreateGrantInput) => Promise<AccessGrant>;
  revoke: (tenantId: string, grantId: string) => Promise<void>;
};

export const makeGrantService = (
  grantRepo: IGrantRepository,
  auditRepo: IAuditRepository,
  appRepo: IApplicationRepository,
): GrantService => ({
  list: (tenantId) => grantRepo.findByTenant(tenantId),

  create: async (tenantId, applicationId, data) => {
    const app = await appRepo.findById(applicationId);
    if (!app || app.tenantId !== tenantId) {
      throw new ForbiddenError('Application does not belong to tenant');
    }

    if (data.expiresAt <= new Date()) {
      throw new ValidationError('expiresAt must be in the future');
    }

    const grant = await grantRepo.create({
      applicationId,
      expiresAt: data.expiresAt,
      allowedDocs: data.allowedDocs,
    });

    await auditRepo.create({
      accessGrantId: grant.id,
      eventType: 'ACCESS_GRANTED',
      actorId: tenantId,
      actorType: 'TENANT',
      metadata: { allowedDocs: data.allowedDocs },
    });

    return grant;
  },

  revoke: async (tenantId, grantId) => {
    const grant = await grantRepo.findById(grantId);
    if (!grant) throw new NotFoundError('Grant not found');

    if (grant.application.tenantId !== tenantId) {
      throw new ForbiddenError('Grant does not belong to tenant');
    }

    if (grant.revokedAt !== null) {
      throw new ConflictError('Grant already revoked');
    }

    await grantRepo.revoke(grantId, tenantId);

    await auditRepo.create({
      accessGrantId: grantId,
      eventType: 'ACCESS_REVOKED',
      actorId: tenantId,
      actorType: 'TENANT',
      metadata: { grantId },
    });
  },
});
