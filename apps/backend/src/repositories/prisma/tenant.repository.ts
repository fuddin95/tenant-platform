import type { PrismaClient } from '@rental-trust/database';
import type { ITenantRepository, CreateTenantData } from '../interfaces/ITenantRepository';

export const makeTenantRepository = (db: PrismaClient): ITenantRepository => ({
  findByEmail: (email) => db.tenant.findUnique({ where: { email } }),
  findById: (id) => db.tenant.findUnique({ where: { id } }),
  create: (data: CreateTenantData) => db.tenant.create({ data }),
});
