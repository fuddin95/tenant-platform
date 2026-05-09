import type { PrismaClient, DocumentType } from '@rental-trust/database';
import type {
  IApplicationRepository,
  CreateApplicationData,
  ApplicationSummary,
  ApplicationCard,
} from '../interfaces/IApplicationRepository';

const computeGrantStatus = (grant: {
  revokedAt: Date | null;
  expiresAt: Date;
}): 'ACTIVE' | 'EXPIRED' | 'REVOKED' => {
  if (grant.revokedAt) return 'REVOKED';
  if (grant.expiresAt <= new Date()) return 'EXPIRED';
  return 'ACTIVE';
};

export const makeApplicationRepository = (db: PrismaClient): IApplicationRepository => ({
  findByTenant: async (tenantId): Promise<ApplicationSummary[]> => {
    const apps = await db.application.findMany({
      where: { tenantId },
      include: {
        property: { include: { landlord: { select: { name: true } } } },
        accessGrants: { orderBy: { grantedAt: 'desc' }, take: 1 },
      },
    });
    return apps.map((app) => {
      const grant = app.accessGrants[0];
      const unit = app.property.unitNumber ? `, Unit ${app.property.unitNumber}` : '';
      return {
        id: app.id,
        propertyAddress: `${app.property.address}${unit}`,
        landlordName: app.property.landlord.name,
        submittedAt: app.submittedAt,
        grantStatus: grant ? computeGrantStatus(grant) : 'EXPIRED',
      };
    });
  },

  findById: (id) => db.application.findUnique({ where: { id } }),

  findByProperty: async (propertyId): Promise<ApplicationCard[]> => {
    const property = await db.property.findUnique({
      where: { id: propertyId },
      select: { requiredDocs: true },
    });
    const requiredDocs: DocumentType[] = property?.requiredDocs ?? [];

    const apps = await db.application.findMany({
      where: { propertyId },
      include: {
        tenant: {
          include: {
            profile: {
              include: {
                documents: { where: { replacedAt: null }, select: { type: true } },
              },
            },
          },
        },
      },
    });

    return apps.map((app) => {
      const activeDocs = (app.tenant.profile?.documents ?? []).map((d) => d.type);
      const missingDocs = requiredDocs.filter((d) => !activeDocs.includes(d));
      return {
        id: app.id,
        tenantName: app.tenant.name,
        submittedAt: app.submittedAt,
        status: app.status,
        profileCompletion: app.tenant.profile?.completionPercent ?? 0,
        missingDocs,
      };
    });
  },

  create: (data: CreateApplicationData) => db.application.create({ data }),

  updateStatus: (id, status) => db.application.update({ where: { id }, data: { status } }),

  existsByTenantAndProperty: async (tenantId, propertyId): Promise<boolean> => {
    const count = await db.application.count({ where: { tenantId, propertyId } });
    return count > 0;
  },
});
