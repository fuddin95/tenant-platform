import bcrypt from 'bcryptjs';
import type { ILandlordRepository } from '../repositories/interfaces/ILandlordRepository';
import type { ITenantRepository } from '../repositories/interfaces/ITenantRepository';
import type { IProfileRepository } from '../repositories/interfaces/IProfileRepository';
import type { JwtService } from '../utils/jwt';
import type { Role } from '../types/express';
import { UnauthorizedError, ValidationError } from '../types/errors';

export type RegisterInput = {
  email: string;
  name: string;
  password: string;
  role: Role;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type SafeUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
};

export type AuthResult = { token: string; user: SafeUser };

export type AuthService = {
  register: (input: RegisterInput) => Promise<AuthResult>;
  login: (input: LoginInput) => Promise<AuthResult>;
  getMe: (id: string, role: Role) => Promise<SafeUser>;
};

export const makeAuthService = (
  landlordRepo: ILandlordRepository,
  tenantRepo: ITenantRepository,
  profileRepo: IProfileRepository,
  jwt: JwtService,
): AuthService => ({
  register: async ({ email, name, password, role }) => {
    const [existingLandlord, existingTenant] = await Promise.all([
      landlordRepo.findByEmail(email),
      tenantRepo.findByEmail(email),
    ]);
    if (existingLandlord || existingTenant) {
      throw new ValidationError('Email already registered');
    }

    const passwordHash = await bcrypt.hash(password, 12);

    if (role === 'LANDLORD') {
      const landlord = await landlordRepo.create({
        email,
        name,
        passwordHash,
        role: 'INDEPENDENT_LANDLORD',
      });
      const user: SafeUser = { id: landlord.id, email: landlord.email, name: landlord.name, role: 'LANDLORD' };
      return { token: jwt.sign({ sub: landlord.id, role: 'LANDLORD', email }), user };
    }

    const tenant = await tenantRepo.create({ email, name, passwordHash });
    await profileRepo.create(tenant.id);
    const user: SafeUser = { id: tenant.id, email: tenant.email, name: tenant.name, role: 'TENANT' };
    return { token: jwt.sign({ sub: tenant.id, role: 'TENANT', email }), user };
  },

  login: async ({ email, password }) => {
    const landlord = await landlordRepo.findByEmail(email);
    if (landlord) {
      const valid = await bcrypt.compare(password, landlord.passwordHash);
      if (!valid) throw new UnauthorizedError('Invalid credentials');
      const user: SafeUser = { id: landlord.id, email: landlord.email, name: landlord.name, role: 'LANDLORD' };
      return { token: jwt.sign({ sub: landlord.id, role: 'LANDLORD', email }), user };
    }

    const tenant = await tenantRepo.findByEmail(email);
    if (tenant) {
      const valid = await bcrypt.compare(password, tenant.passwordHash);
      if (!valid) throw new UnauthorizedError('Invalid credentials');
      const user: SafeUser = { id: tenant.id, email: tenant.email, name: tenant.name, role: 'TENANT' };
      return { token: jwt.sign({ sub: tenant.id, role: 'TENANT', email }), user };
    }

    throw new UnauthorizedError('Invalid credentials');
  },

  getMe: async (id, role) => {
    if (role === 'LANDLORD') {
      const landlord = await landlordRepo.findById(id);
      if (!landlord) throw new UnauthorizedError('User not found');
      const { passwordHash: _ph, role: _r, ...rest } = landlord;
      return { ...rest, role: 'LANDLORD' };
    }

    const tenant = await tenantRepo.findById(id);
    if (!tenant) throw new UnauthorizedError('User not found');
    const { passwordHash: _ph, ...rest } = tenant;
    return { ...rest, role: 'TENANT' };
  },
});
