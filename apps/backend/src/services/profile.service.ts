import type { IProfileRepository, ProfileWithDocs, CreateReferenceData } from '../repositories/interfaces/IProfileRepository';
import type { TenantReference } from '@rental-trust/database';
import { NotFoundError, ForbiddenError } from '../types/errors';

const REFERENCE_LIMIT = 3;

export type ProfileService = {
  getOrCreate(tenantId: string): Promise<ProfileWithDocs>;
  addReference(tenantId: string, data: Omit<CreateReferenceData, 'profileId'>): Promise<TenantReference>;
  removeReference(tenantId: string, referenceId: string): Promise<void>;
};

export const makeProfileService = (repo: IProfileRepository): ProfileService => ({
  getOrCreate: async (tenantId) => {
    const existing = await repo.findByTenantId(tenantId);
    if (existing) return existing;
    await repo.create(tenantId);
    const created = await repo.findByTenantId(tenantId);
    if (!created) throw new NotFoundError('Profile not found after creation');
    return created;
  },

  addReference: async (tenantId, data) => {
    const profile = await repo.findByTenantId(tenantId);
    if (!profile) throw new NotFoundError('Profile not found');

    const count = await repo.countReferences(profile.id);
    if (count >= REFERENCE_LIMIT) {
      throw new ForbiddenError(`Reference limit of ${REFERENCE_LIMIT} reached`);
    }

    return repo.addReference({ profileId: profile.id, ...data });
  },

  removeReference: async (tenantId, referenceId) => {
    const profile = await repo.findByTenantId(tenantId);
    if (!profile) throw new NotFoundError('Profile not found');

    const reference = await repo.findReferenceById(referenceId);
    if (!reference || reference.profileId !== profile.id) throw new ForbiddenError('Access denied');

    await repo.deleteReference(referenceId);
  },
});
