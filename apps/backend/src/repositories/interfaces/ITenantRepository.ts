import type { Tenant } from '@rental-trust/database';

export type CreateTenantData = {
  email: string;
  name: string;
  passwordHash: string | null;
};

export interface ITenantRepository {
  findByEmail(email: string): Promise<Tenant | null>;
  findById(id: string): Promise<Tenant | null>;
  create(data: CreateTenantData): Promise<Tenant>;
}
