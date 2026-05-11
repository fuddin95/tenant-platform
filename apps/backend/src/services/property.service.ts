import type { IPropertyRepository, CreatePropertyData, UpdatePropertyData, PropertyWithCount, PublicProperty } from '../repositories/interfaces/IPropertyRepository';
import type { IApplicationRepository, ApplicationCard } from '../repositories/interfaces/IApplicationRepository';
import type { Property } from '@rental-trust/database';
import { ForbiddenError, NotFoundError } from '../types/errors';

export type PropertyService = {
  list: (landlordId: string) => Promise<PropertyWithCount[]>;
  create: (landlordId: string, data: CreatePropertyData) => Promise<Property>;
  getById: (id: string, landlordId: string) => Promise<Property>;
  update: (id: string, landlordId: string, data: UpdatePropertyData) => Promise<Property>;
  getApplications: (propertyId: string, landlordId: string) => Promise<ApplicationCard[]>;
  getBySlug: (slug: string) => Promise<PublicProperty>;
};

const assertOwner = async (
  propRepo: IPropertyRepository,
  propertyId: string,
  landlordId: string,
): Promise<Property> => {
  const property = await propRepo.findById(propertyId);
  if (!property || property.landlordId !== landlordId) throw new ForbiddenError('Access denied');
  return property;
};

export const makePropertyService = (
  propRepo: IPropertyRepository,
  appRepo: IApplicationRepository,
): PropertyService => ({
  list: (landlordId) => propRepo.findByLandlord(landlordId),

  create: (landlordId, data) => propRepo.create(landlordId, data),

  getById: (id, landlordId) => assertOwner(propRepo, id, landlordId),

  update: async (id, landlordId, data) => {
    await assertOwner(propRepo, id, landlordId);
    return propRepo.update(id, data);
  },

  getApplications: async (propertyId, landlordId) => {
    await assertOwner(propRepo, propertyId, landlordId);
    return appRepo.findByProperty(propertyId);
  },

  getBySlug: async (slug) => {
    const property = await propRepo.findBySlug(slug);
    if (!property) throw new NotFoundError('Property not found');
    return property;
  },
});
