import type { Landlord, LandlordRole } from '@rental-trust/database';

export type CreateLandlordData = {
  email: string;
  name: string;
  passwordHash: string;
  role: LandlordRole;
};

export interface ILandlordRepository {
  findByEmail(email: string): Promise<Landlord | null>;
  findById(id: string): Promise<Landlord | null>;
  create(data: CreateLandlordData): Promise<Landlord>;
}
