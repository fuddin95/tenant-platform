import { makeProfileRepository } from '../repositories/prisma/profile.repository';
import type { PrismaClient } from '@rental-trust/database';

const mockDb = {
  profile: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  document: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  },
  tenantReference: {
    count: jest.fn(),
    create: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
  },
} as unknown as PrismaClient;

const repo = makeProfileRepository(mockDb);

beforeEach(() => jest.clearAllMocks());

describe('makeProfileRepository', () => {
  describe('findByTenantId', () => {
    it('queries only active (non-replaced) documents', async () => {
      (mockDb.profile.findUnique as jest.Mock).mockResolvedValue(null);
      await repo.findByTenantId('t1');
      expect(mockDb.profile.findUnique).toHaveBeenCalledWith({
        where: { tenantId: 't1' },
        include: {
          documents: { where: { replacedAt: null } },
          references: true,
        },
      });
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

  describe('updateCompletion', () => {
    it('writes completionPercent to the profile', async () => {
      (mockDb.profile.update as jest.Mock).mockResolvedValue({});
      await repo.updateCompletion('prof-1', 75);
      expect(mockDb.profile.update).toHaveBeenCalledWith({
        where: { id: 'prof-1' },
        data: { completionPercent: 75 },
      });
    });
  });

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
});
