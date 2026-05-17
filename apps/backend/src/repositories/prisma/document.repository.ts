import type { PrismaClient, DocumentType } from '@rental-trust/database';
import type { IDocumentRepository, CreateDocumentData } from '../interfaces/IDocumentRepository';

export const makeDocumentRepository = (db: PrismaClient): IDocumentRepository => ({
  findById: (id) => db.document.findUnique({ where: { id } }),

  findByProfileId: (profileId) =>
    db.document.findMany({ where: { profileId, replacedAt: null } }),

  addDocument: (data: CreateDocumentData) => db.document.create({ data }),

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
});
