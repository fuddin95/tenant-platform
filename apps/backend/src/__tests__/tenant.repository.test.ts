import { makeTenantRepository } from '../repositories/prisma/tenant.repository';
import type { PrismaClient, Tenant } from '@rental-trust/database';

const tenant: Tenant = {
  id: 't1',
  email: 'tenant@example.com',
  name: 'Test Tenant',
  passwordHash: '$2b$12$hash',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockDb = {
  tenant: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
} as unknown as PrismaClient;

const repo = makeTenantRepository(mockDb);

beforeEach(() => jest.clearAllMocks());

describe('makeTenantRepository', () => {
  describe('findByEmail', () => {
    it('queries by email', async () => {
      (mockDb.tenant.findUnique as jest.Mock).mockResolvedValue(tenant);
      const result = await repo.findByEmail('tenant@example.com');
      expect(mockDb.tenant.findUnique).toHaveBeenCalledWith({ where: { email: 'tenant@example.com' } });
      expect(result).toEqual(tenant);
    });

    it('returns null when not found', async () => {
      (mockDb.tenant.findUnique as jest.Mock).mockResolvedValue(null);
      expect(await repo.findByEmail('nobody@example.com')).toBeNull();
    });
  });

  describe('findById', () => {
    it('queries by id', async () => {
      (mockDb.tenant.findUnique as jest.Mock).mockResolvedValue(tenant);
      const result = await repo.findById('t1');
      expect(mockDb.tenant.findUnique).toHaveBeenCalledWith({ where: { id: 't1' } });
      expect(result).toEqual(tenant);
    });

    it('returns null when not found', async () => {
      (mockDb.tenant.findUnique as jest.Mock).mockResolvedValue(null);
      expect(await repo.findById('missing')).toBeNull();
    });
  });

  describe('create', () => {
    it('creates a tenant with all fields', async () => {
      (mockDb.tenant.create as jest.Mock).mockResolvedValue(tenant);
      const data = {
        email: 'tenant@example.com',
        name: 'Test Tenant',
        passwordHash: '$2b$12$hash',
      };
      const result = await repo.create(data);
      expect(mockDb.tenant.create).toHaveBeenCalledWith({ data });
      expect(result).toEqual(tenant);
    });
  });
});
