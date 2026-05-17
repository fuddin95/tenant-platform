import { makePropertyService } from '../services/property.service';
import { ForbiddenError, NotFoundError } from '../types/errors';
import type { IPropertyRepository, PropertyWithCount, PublicProperty } from '../repositories/interfaces/IPropertyRepository';
import type { IApplicationRepository, ApplicationCard } from '../repositories/interfaces/IApplicationRepository';
import type { Property } from '@rental-trust/database';

describe('makePropertyService', () => {
  let mockPropRepo: jest.Mocked<IPropertyRepository>;
  let mockAppRepo: jest.Mocked<IApplicationRepository>;
  let service: ReturnType<typeof makePropertyService>;

  const landlordId = 'landlord-1';
  const otherLandlordId = 'landlord-2';

  const baseProperty: Property = {
    id: 'prop-1',
    landlordId,
    address: '123 Main St',
    unitNumber: null,
    city: 'Toronto',
    rent: 2000 as unknown as Property['rent'],
    bedrooms: 2,
    requiredDocs: ['GOVERNMENT_ID', 'PROOF_OF_INCOME'] as Property['requiredDocs'],
    applySlug: 'main-st-abc123',
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const propertyWithCount: PropertyWithCount = { ...baseProperty, applicationCount: 3 };

  const publicProperty: PublicProperty = {
    id:         baseProperty.id,
    landlordId: baseProperty.landlordId,
    address:    baseProperty.address,
    city:       baseProperty.city,
    rent:       2000,
    bedrooms:   baseProperty.bedrooms,
    landlordName: 'Test Landlord',
    requiredDocs: baseProperty.requiredDocs,
  };

  const applicationCards: ApplicationCard[] = [
    {
      id: 'app-1',
      tenantName: 'Test Tenant',
      submittedAt: new Date(),
      status: 'PENDING',
      profileCompletion: 80,
      missingDocs: ['CREDIT_REPORT'],
    },
  ];

  beforeEach(() => {
    mockPropRepo = {
      findByLandlord: jest.fn(),
      findById: jest.fn(),
      findBySlug: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
    mockAppRepo = {
      findByTenant: jest.fn(),
      findById: jest.fn(),
      findByProperty: jest.fn(),
      create: jest.fn(),
      updateStatus: jest.fn(),
      existsByTenantAndProperty: jest.fn(),
    };

    service = makePropertyService(mockPropRepo, mockAppRepo);
  });

  it('list returns all properties for the landlord with applicationCount', async () => {
    mockPropRepo.findByLandlord.mockResolvedValue([propertyWithCount]);

    const result = await service.list(landlordId);

    expect(mockPropRepo.findByLandlord).toHaveBeenCalledWith(landlordId);
    expect(result).toEqual([propertyWithCount]);
  });

  it('create delegates to repo and returns the new property', async () => {
    mockPropRepo.create.mockResolvedValue(baseProperty);
    const data = { address: '123 Main St', city: 'Toronto', rent: 2000, bedrooms: 2, requiredDocs: [] as Property['requiredDocs'] };

    const result = await service.create(landlordId, data);

    expect(mockPropRepo.create).toHaveBeenCalledWith(landlordId, data);
    expect(result).toEqual(baseProperty);
  });

  it('getById throws ForbiddenError when requestor is not the property owner', async () => {
    mockPropRepo.findById.mockResolvedValue(baseProperty);

    await expect(service.getById(baseProperty.id, otherLandlordId)).rejects.toThrow(ForbiddenError);
  });

  it('getById returns the property when landlord owns it', async () => {
    mockPropRepo.findById.mockResolvedValue(baseProperty);

    const result = await service.getById(baseProperty.id, landlordId);

    expect(result).toEqual(baseProperty);
  });

  it('update throws ForbiddenError when requestor is not the property owner', async () => {
    mockPropRepo.findById.mockResolvedValue(baseProperty);

    await expect(service.update(baseProperty.id, otherLandlordId, { rent: 2500 })).rejects.toThrow(ForbiddenError);
    expect(mockPropRepo.update).not.toHaveBeenCalled();
  });

  it('getApplications throws ForbiddenError when requestor is not the property owner', async () => {
    mockPropRepo.findById.mockResolvedValue(baseProperty);

    await expect(service.getApplications(baseProperty.id, otherLandlordId)).rejects.toThrow(ForbiddenError);
    expect(mockAppRepo.findByProperty).not.toHaveBeenCalled();
  });

  it('getApplications returns application cards when landlord owns the property', async () => {
    mockPropRepo.findById.mockResolvedValue(baseProperty);
    mockAppRepo.findByProperty.mockResolvedValue(applicationCards);

    const result = await service.getApplications(baseProperty.id, landlordId);

    expect(mockAppRepo.findByProperty).toHaveBeenCalledWith(baseProperty.id);
    expect(result).toEqual(applicationCards);
  });

  it('getBySlug returns public property shape without auth check', async () => {
    mockPropRepo.findBySlug.mockResolvedValue(publicProperty);

    const result = await service.getBySlug(baseProperty.applySlug);

    expect(mockPropRepo.findBySlug).toHaveBeenCalledWith(baseProperty.applySlug);
    expect(result).toEqual(publicProperty);
  });

  it('getBySlug throws NotFoundError when slug does not exist', async () => {
    mockPropRepo.findBySlug.mockResolvedValue(null);

    await expect(service.getBySlug('nonexistent-slug')).rejects.toThrow(NotFoundError);
  });
});
