import type { PrismaClient } from '@rental-trust/database';
import type {
  IGrantRepository,
  CreateGrantData,
  GrantWithContext,
  GrantSummary,
} from '../interfaces/IGrantRepository';

const computeStatus = (grant: {
  revokedAt: Date | null;
  expiresAt: Date;
}): 'ACTIVE' | 'EXPIRED' | 'REVOKED' => {
  if (grant.revokedAt) return 'REVOKED';
  if (grant.expiresAt <= new Date()) return 'EXPIRED';
  return 'ACTIVE';
};

export const makeGrantRepository = (db: PrismaClient): IGrantRepository => ({
  findByTenant: async (tenantId): Promise<GrantSummary[]> => {
    const grants = await db.accessGrant.findMany({
      where: { application: { tenantId } },
      include: {
        application: {
          include: {
            property: { include: { landlord: { select: { name: true } } } },
          },
        },
      },
    });
    return grants.map((g) => ({
      id: g.id,
      landlordName: g.application.property.landlord.name,
      propertyAddress: g.application.property.address,
      grantedAt: g.grantedAt,
      expiresAt: g.expiresAt,
      allowedDocs: g.allowedDocs,
      status: computeStatus(g),
    }));
  },

  findById: (id): Promise<GrantWithContext | null> =>
    db.accessGrant.findUnique({
      where: { id },
      include: {
        application: {
          select: {
            tenantId: true,
            property: { select: { landlordId: true, address: true, city: true } },
          },
        },
      },
    }) as Promise<GrantWithContext | null>,

  create: (data: CreateGrantData) => db.accessGrant.create({ data }),

  revoke: async (id, revokedBy): Promise<void> => {
    await db.accessGrant.update({ where: { id }, data: { revokedAt: new Date(), revokedBy } });
  },
});
