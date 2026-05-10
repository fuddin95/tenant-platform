import bcrypt from 'bcryptjs';
import { makeAuthService } from '../services/auth.service';
import { UnauthorizedError } from '../types/errors';
import type { ILandlordRepository } from '../repositories/interfaces/ILandlordRepository';
import type { ITenantRepository } from '../repositories/interfaces/ITenantRepository';
import type { IProfileRepository } from '../repositories/interfaces/IProfileRepository';
import type { JwtService } from '../utils/jwt';
import type { Landlord, Tenant } from '@rental-trust/database';

describe('makeAuthService', () => {
  const PASS = 'secret123';
  let authService: ReturnType<typeof makeAuthService>;
  let mockLandlordRepo: jest.Mocked<ILandlordRepository>;
  let mockTenantRepo: jest.Mocked<ITenantRepository>;
  let mockJwt: jest.Mocked<JwtService>;
  const mockProfileCreate = jest.fn();
  let landlord: Landlord;
  let tenant: Tenant;

  beforeAll(async () => {
    const passwordHash = await bcrypt.hash(PASS, 12);
    landlord = {
      id: 'landlord-1',
      email: 'landlord@example.com',
      name: 'Test Landlord',
      passwordHash,
      role: 'INDEPENDENT_LANDLORD',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    tenant = {
      id: 'tenant-1',
      email: 'tenant@example.com',
      name: 'Test Tenant',
      passwordHash,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });

  beforeEach(() => {
    mockLandlordRepo = {
      findByEmail: jest.fn().mockResolvedValue(null),
      findById: jest.fn(),
      create: jest.fn(),
    };
    mockTenantRepo = {
      findByEmail: jest.fn().mockResolvedValue(null),
      findById: jest.fn(),
      create: jest.fn(),
    };
    mockJwt = {
      sign: jest.fn().mockReturnValue('signed-token'),
      verify: jest.fn(),
    };
    mockProfileCreate.mockReset().mockResolvedValue({ id: 'profile-1', tenantId: tenant?.id });

    authService = makeAuthService(
      mockLandlordRepo,
      mockTenantRepo,
      { create: mockProfileCreate } as unknown as IProfileRepository,
      mockJwt,
    );
  });

  it('registers a landlord and returns a signed JWT', async () => {
    mockLandlordRepo.create.mockResolvedValue(landlord);

    const token = await authService.register({
      email: landlord.email,
      name: landlord.name,
      password: PASS,
      role: 'LANDLORD',
    });

    expect(token).toBe('signed-token');
    expect(mockLandlordRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ email: landlord.email, name: landlord.name }),
    );
    expect(mockJwt.sign).toHaveBeenCalledWith(
      expect.objectContaining({ sub: landlord.id, role: 'LANDLORD', email: landlord.email }),
    );
    expect(mockProfileCreate).not.toHaveBeenCalled();
  });

  it('registers a tenant, creates a profile shell, and returns a signed JWT', async () => {
    mockTenantRepo.create.mockResolvedValue(tenant);

    const token = await authService.register({
      email: tenant.email,
      name: tenant.name,
      password: PASS,
      role: 'TENANT',
    });

    expect(token).toBe('signed-token');
    expect(mockTenantRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ email: tenant.email, name: tenant.name }),
    );
    expect(mockProfileCreate).toHaveBeenCalledWith(tenant.id);
    expect(mockJwt.sign).toHaveBeenCalledWith(
      expect.objectContaining({ sub: tenant.id, role: 'TENANT', email: tenant.email }),
    );
  });

  it('throws when registering with an already-used email', async () => {
    mockLandlordRepo.findByEmail.mockResolvedValue(landlord);

    await expect(
      authService.register({ email: landlord.email, name: 'Dup', password: PASS, role: 'LANDLORD' }),
    ).rejects.toThrow('already');
  });

  it('logs in a valid user and returns a signed JWT', async () => {
    mockLandlordRepo.findByEmail.mockResolvedValue(landlord);

    const token = await authService.login({ email: landlord.email, password: PASS });

    expect(token).toBe('signed-token');
    expect(mockJwt.sign).toHaveBeenCalledWith(
      expect.objectContaining({ sub: landlord.id, role: 'LANDLORD' }),
    );
  });

  it('throws UnauthorizedError when password is wrong', async () => {
    mockLandlordRepo.findByEmail.mockResolvedValue(landlord);

    await expect(
      authService.login({ email: landlord.email, password: 'wrong-password' }),
    ).rejects.toThrow(UnauthorizedError);
  });

  it('throws UnauthorizedError when email is not registered', async () => {
    await expect(
      authService.login({ email: 'nobody@example.com', password: PASS }),
    ).rejects.toThrow(UnauthorizedError);
  });
});
