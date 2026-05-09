import { makeApplicationRepository } from '../repositories/prisma/application.repository';
import type { PrismaClient } from '@rental-trust/database';

const now = new Date();
const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
const past = new Date(Date.now() - 1000);

const mockDb = {
  application: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  property: {
    findUnique: jest.fn(),
  },
} as unknown as PrismaClient;

const repo = makeApplicationRepository(mockDb);

beforeEach(() => jest.clearAllMocks());

describe('makeApplicationRepository', () => {
  describe('findByTenant', () => {
    it('returns ApplicationSummary with ACTIVE grantStatus', async () => {
      (mockDb.application.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'app-1',
          property: {
            address: '100 King St W',
            unitNumber: '2501',
            landlord: { name: 'Dev Landlord' },
          },
          accessGrants: [{ revokedAt: null, expiresAt: future }],
          submittedAt: now,
        },
      ]);
      const result = await repo.findByTenant('t1');
      expect(result[0].grantStatus).toBe('ACTIVE');
      expect(result[0].propertyAddress).toBe('100 King St W, Unit 2501');
      expect(result[0].landlordName).toBe('Dev Landlord');
    });

    it('returns REVOKED when grant has revokedAt set', async () => {
      (mockDb.application.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'app-2',
          property: { address: '1 Bay St', unitNumber: null, landlord: { name: 'L' } },
          accessGrants: [{ revokedAt: now, expiresAt: future }],
          submittedAt: now,
        },
      ]);
      const [result] = await repo.findByTenant('t1');
      expect(result.grantStatus).toBe('REVOKED');
    });

    it('returns EXPIRED when expiresAt is in the past', async () => {
      (mockDb.application.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'app-3',
          property: { address: '2 Front St', unitNumber: null, landlord: { name: 'L' } },
          accessGrants: [{ revokedAt: null, expiresAt: past }],
          submittedAt: now,
        },
      ]);
      const [result] = await repo.findByTenant('t1');
      expect(result.grantStatus).toBe('EXPIRED');
    });
  });

  describe('findByProperty', () => {
    it('computes missingDocs from requiredDocs vs active tenant documents', async () => {
      (mockDb.property.findUnique as jest.Mock).mockResolvedValue({
        requiredDocs: ['GOVERNMENT_ID', 'PROOF_OF_INCOME'],
      });
      (mockDb.application.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'app-1',
          tenant: {
            name: 'Test Tenant',
            profile: {
              completionPercent: 50,
              documents: [{ type: 'GOVERNMENT_ID' }],
            },
          },
          submittedAt: now,
          status: 'PENDING',
        },
      ]);
      const result = await repo.findByProperty('prop-1');
      expect(result[0].missingDocs).toEqual(['PROOF_OF_INCOME']);
      expect(result[0].profileCompletion).toBe(50);
    });

    it('returns empty missingDocs when all required docs present', async () => {
      (mockDb.property.findUnique as jest.Mock).mockResolvedValue({
        requiredDocs: ['GOVERNMENT_ID'],
      });
      (mockDb.application.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'app-1',
          tenant: {
            name: 'Test Tenant',
            profile: { completionPercent: 100, documents: [{ type: 'GOVERNMENT_ID' }] },
          },
          submittedAt: now,
          status: 'PENDING',
        },
      ]);
      const [result] = await repo.findByProperty('prop-1');
      expect(result.missingDocs).toHaveLength(0);
    });
  });

  describe('existsByTenantAndProperty', () => {
    it('returns true when a record exists', async () => {
      (mockDb.application.count as jest.Mock).mockResolvedValue(1);
      expect(await repo.existsByTenantAndProperty('t1', 'p1')).toBe(true);
      expect(mockDb.application.count).toHaveBeenCalledWith({ where: { tenantId: 't1', propertyId: 'p1' } });
    });

    it('returns false when no record exists', async () => {
      (mockDb.application.count as jest.Mock).mockResolvedValue(0);
      expect(await repo.existsByTenantAndProperty('t1', 'p1')).toBe(false);
    });
  });
});
