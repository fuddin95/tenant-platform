import type { PrismaClient } from '@rental-trust/database';
import type { ILandlordRepository, CreateLandlordData } from '../interfaces/ILandlordRepository';

export const makeLandlordRepository = (db: PrismaClient): ILandlordRepository => ({
  findByEmail: (email) => db.landlord.findUnique({ where: { email } }),
  findById: (id) => db.landlord.findUnique({ where: { id } }),
  create: (data: CreateLandlordData) => db.landlord.create({ data }),
});
