import { makeDocumentRepository } from '../repositories/prisma/document.repository';
import type { PrismaClient } from '@rental-trust/database';

const mockDb = {
  document: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
} as unknown as PrismaClient;

const repo = makeDocumentRepository(mockDb);

beforeEach(() => jest.clearAllMocks());

describe('makeDocumentRepository', () => {
  describe('addDocument', () => {
    it('creates a document row', async () => {
      (mockDb.document.create as jest.Mock).mockResolvedValue({});
      const data = {
        profileId: 'prof-1',
        type: 'GOVERNMENT_ID' as const,
        storageKey: 'profiles/t1/gov/uuid',
        fileName: 'id.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1024,
      };
      await repo.addDocument(data);
      expect(mockDb.document.create).toHaveBeenCalledWith({ data });
    });
  });

  describe('softDeleteDocument', () => {
    it('sets replacedAt to current timestamp', async () => {
      (mockDb.document.update as jest.Mock).mockResolvedValue({});
      await repo.softDeleteDocument('doc-1');
      const call = (mockDb.document.update as jest.Mock).mock.calls[0][0];
      expect(call.where).toEqual({ id: 'doc-1' });
      expect(call.data.replacedAt).toBeInstanceOf(Date);
    });
  });

  describe('findActiveDocTypes', () => {
    it('queries distinct active doc types for the profile', async () => {
      (mockDb.document.findMany as jest.Mock).mockResolvedValue([
        { type: 'GOVERNMENT_ID' },
        { type: 'PROOF_OF_INCOME' },
      ]);
      const result = await repo.findActiveDocTypes('prof-1');
      expect(mockDb.document.findMany).toHaveBeenCalledWith({
        where: { profileId: 'prof-1', replacedAt: null },
        select: { type: true },
        distinct: ['type'],
      });
      expect(result).toEqual(['GOVERNMENT_ID', 'PROOF_OF_INCOME']);
    });
  });
});
