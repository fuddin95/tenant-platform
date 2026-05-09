import { makeLandlordRepository } from '../repositories/prisma/landlord.repository';
import type { PrismaClient, Landlord } from '@rental-trust/database';

const landlord: Landlord = {
  id: 'l1',
  email: 'landlord@example.com',
  name: 'Test Landlord',
  passwordHash: '$2b$12$hash',
  role: 'INDEPENDENT_LANDLORD',
  city: 'Toronto',
  phone: '416-555-0100',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockDb = {
  landlord: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
} as unknown as PrismaClient;

const repo = makeLandlordRepository(mockDb);

beforeEach(() => jest.clearAllMocks());

describe('makeLandlordRepository', () => {
  describe('findByEmail', () => {
    it('queries by email', async () => {
      (mockDb.landlord.findUnique as jest.Mock).mockResolvedValue(landlord);
      const result = await repo.findByEmail('landlord@example.com');
      expect(mockDb.landlord.findUnique).toHaveBeenCalledWith({ where: { email: 'landlord@example.com' } });
      expect(result).toEqual(landlord);
    });

    it('returns null when not found', async () => {
      (mockDb.landlord.findUnique as jest.Mock).mockResolvedValue(null);
      const result = await repo.findByEmail('nobody@example.com');
      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('queries by id', async () => {
      (mockDb.landlord.findUnique as jest.Mock).mockResolvedValue(landlord);
      const result = await repo.findById('l1');
      expect(mockDb.landlord.findUnique).toHaveBeenCalledWith({ where: { id: 'l1' } });
      expect(result).toEqual(landlord);
    });

    it('returns null when not found', async () => {
      (mockDb.landlord.findUnique as jest.Mock).mockResolvedValue(null);
      expect(await repo.findById('missing')).toBeNull();
    });
  });

  describe('create', () => {
    it('creates a landlord with all fields', async () => {
      (mockDb.landlord.create as jest.Mock).mockResolvedValue(landlord);
      const data = {
        email: 'landlord@example.com',
        name: 'Test Landlord',
        passwordHash: '$2b$12$hash',
        role: 'INDEPENDENT_LANDLORD' as const,
      };
      const result = await repo.create(data);
      expect(mockDb.landlord.create).toHaveBeenCalledWith({ data });
      expect(result).toEqual(landlord);
    });
  });
});
