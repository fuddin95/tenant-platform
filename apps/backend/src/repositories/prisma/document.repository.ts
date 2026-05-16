import type { PrismaClient } from '@rental-trust/database';
import type { IDocumentRepository } from '../interfaces/IDocumentRepository';

export const makeDocumentRepository = (db: PrismaClient): IDocumentRepository => ({
  findById: (id) => db.document.findUnique({ where: { id } }),

  findByProfileId: (profileId) =>
    db.document.findMany({ where: { profileId, replacedAt: null } }),
});
