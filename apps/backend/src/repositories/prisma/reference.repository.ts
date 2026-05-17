import type { PrismaClient } from '@rental-trust/database';
import type { IReferenceRepository, CreateReferenceData } from '../interfaces/IReferenceRepository';

export const makeReferenceRepository = (db: PrismaClient): IReferenceRepository => ({
  countReferences: (profileId) => db.tenantReference.count({ where: { profileId } }),

  addReference: (data: CreateReferenceData) => db.tenantReference.create({ data }),

  findReferenceById: (id) => db.tenantReference.findUnique({ where: { id } }),

  deleteReference: async (id): Promise<void> => {
    await db.tenantReference.delete({ where: { id } });
  },
});
