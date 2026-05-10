import type { PrismaClient, DocumentType } from '@rental-trust/database';
import type {
  IProfileRepository,
  CreateDocumentData,
  CreateReferenceData,
  ProfileWithDocs,
} from '../interfaces/IProfileRepository';

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

  addDocument: (data: CreateDocumentData) => db.document.create({ data }),

  findDocumentById: (id) => db.document.findUnique({ where: { id } }),

  softDeleteDocument: async (id): Promise<void> => {
    await db.document.update({ where: { id }, data: { replacedAt: new Date() } });
  },

  findActiveDocTypes: async (profileId): Promise<DocumentType[]> => {
    const docs = await db.document.findMany({
      where: { profileId, replacedAt: null },
      select: { type: true },
      distinct: ['type'],
    });
    return docs.map((d) => d.type);
  },

  countReferences: (profileId) => db.tenantReference.count({ where: { profileId } }),

  addReference: (data: CreateReferenceData) => db.tenantReference.create({ data }),

  findReferenceById: (id) => db.tenantReference.findUnique({ where: { id } }),

  deleteReference: async (id): Promise<void> => {
    await db.tenantReference.delete({ where: { id } });
  },
});
