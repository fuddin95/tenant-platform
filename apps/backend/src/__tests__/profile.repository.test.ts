import { makeProfileRepository } from '../repositories/prisma/profile.repository';
import type { PrismaClient } from '@rental-trust/database';

const mockDb = {
  profile: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
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
});
