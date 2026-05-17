import type { PrismaClient } from '@rental-trust/database';
import type { IProfileRepository, ProfileWithDocs } from '../interfaces/IProfileRepository';

export const makeProfileRepository = (db: PrismaClient): IProfileRepository => ({
  findByTenantId: (tenantId): Promise<ProfileWithDocs | null> =>
    db.profile.findUnique({
      where: { tenantId },
      include: {
        documents: { where: { replacedAt: null } },
        references: true,
      },
    }),

  create: (tenantId) => db.profile.create({ data: { tenantId, completionPercent: 0 } }),

  updateCompletion: async (profileId, percent): Promise<void> => {
    await db.profile.update({ where: { id: profileId }, data: { completionPercent: percent } });
  },
});
