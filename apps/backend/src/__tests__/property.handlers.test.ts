import request from 'supertest';
import { makePropertyHandlers } from '../handlers/property.handlers';
import { makePropertyRouter } from '../routes/properties';
import { createApp } from '../server';
import { ForbiddenError, NotFoundError } from '../types/errors';
import type { PropertyService } from '../services/property.service';
import type { RequestHandler } from 'express';
import type { Property } from '@rental-trust/database';
import type { PropertyWithCount, PublicProperty } from '../repositories/interfaces/IPropertyRepository';
import type { ApplicationCard } from '../repositories/interfaces/IApplicationRepository';

const LANDLORD_ID = 'landlord-1';

const baseProperty: Property = {
  id: 'prop-1',
  landlordId: LANDLORD_ID,
  address: '123 Main St',
  unitNumber: null,
  city: 'Toronto',
  rent: 2000 as unknown as Property['rent'],
  bedrooms: 2,
  requiredDocs: ['GOVERNMENT_ID'] as Property['requiredDocs'],
  applySlug: 'main-st-abc123',
  status: 'ACTIVE',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const propertyWithCount: PropertyWithCount = { ...baseProperty, applicationCount: 3 };

const publicProperty: PublicProperty = {
  id: baseProperty.id,
  landlordId: baseProperty.landlordId,
  address: baseProperty.address,
  city: baseProperty.city,
  rent: 2000,
  bedrooms: baseProperty.bedrooms,
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

const makeApp = (service: jest.Mocked<PropertyService>, withLandlordAuth: RequestHandler) => {
  const handlers = makePropertyHandlers(service as unknown as PropertyService);
  const propertiesRouter = makePropertyRouter(handlers, withLandlordAuth);
  return createApp([{ path: '/api/properties', router: propertiesRouter }]);
};

describe('property handlers', () => {
  let mockService: jest.Mocked<PropertyService>;
  let mockWithLandlordAuth: jest.MockedFunction<RequestHandler>;

  beforeEach(() => {
    mockService = {
      list: jest.fn(),
      create: jest.fn(),
      getById: jest.fn(),
      update: jest.fn(),
      getApplications: jest.fn(),
      getBySlug: jest.fn(),
    };
    mockWithLandlordAuth = jest.fn((req, _res, next) => {
      req.user = { sub: LANDLORD_ID, role: 'LANDLORD', email: 'landlord@test.com' };
      next();
    }) as jest.MockedFunction<RequestHandler>;
  });

  describe('GET /api/properties', () => {
    it('returns 200 with landlord properties list', async () => {
      mockService.list.mockResolvedValue([propertyWithCount]);

      const res = await request(makeApp(mockService, mockWithLandlordAuth))
        .get('/api/properties');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toMatchObject({ id: 'prop-1', applicationCount: 3 });
      expect(mockService.list).toHaveBeenCalledWith(LANDLORD_ID);
    });
  });

  describe('POST /api/properties', () => {
    const validBody = {
      address: '456 Oak Ave',
      city: 'Toronto',
      rent: 2500,
      bedrooms: 3,
      requiredDocs: ['GOVERNMENT_ID', 'PROOF_OF_INCOME'],
    };

    it('returns 201 with the created property', async () => {
      mockService.create.mockResolvedValue(baseProperty);

      const res = await request(makeApp(mockService, mockWithLandlordAuth))
        .post('/api/properties')
        .send(validBody);

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ id: 'prop-1', address: '123 Main St' });
      expect(mockService.create).toHaveBeenCalledWith(LANDLORD_ID, expect.objectContaining({ address: '456 Oak Ave' }));
    });

    it('returns 400 when required fields are missing', async () => {
      const res = await request(makeApp(mockService, mockWithLandlordAuth))
        .post('/api/properties')
        .send({ city: 'Toronto' });

      expect(res.status).toBe(400);
      expect(mockService.create).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/properties/:id', () => {
    it('returns 200 with property when landlord owns it', async () => {
      mockService.getById.mockResolvedValue(baseProperty);

      const res = await request(makeApp(mockService, mockWithLandlordAuth))
        .get('/api/properties/prop-1');

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ id: 'prop-1' });
      expect(mockService.getById).toHaveBeenCalledWith('prop-1', LANDLORD_ID);
    });

    it('returns 403 when landlord does not own the property', async () => {
      mockService.getById.mockRejectedValue(new ForbiddenError('Access denied'));

      const res = await request(makeApp(mockService, mockWithLandlordAuth))
        .get('/api/properties/prop-other');

      expect(res.status).toBe(403);
    });
  });

  describe('PATCH /api/properties/:id', () => {
    it('returns 200 with updated property', async () => {
      mockService.update.mockResolvedValue({ ...baseProperty, rent: 2500 as unknown as Property['rent'] });

      const res = await request(makeApp(mockService, mockWithLandlordAuth))
        .patch('/api/properties/prop-1')
        .send({ rent: 2500 });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ id: 'prop-1', rent: 2500 });
      expect(mockService.update).toHaveBeenCalledWith('prop-1', LANDLORD_ID, { rent: 2500 });
    });
  });

  describe('GET /api/properties/:id/applications', () => {
    it('returns 200 with application cards', async () => {
      mockService.getApplications.mockResolvedValue(applicationCards);

      const res = await request(makeApp(mockService, mockWithLandlordAuth))
        .get('/api/properties/prop-1/applications');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toMatchObject({ id: 'app-1', tenantName: 'Test Tenant' });
      expect(mockService.getApplications).toHaveBeenCalledWith('prop-1', LANDLORD_ID);
    });

    it('returns 403 when landlord does not own the property', async () => {
      mockService.getApplications.mockRejectedValue(new ForbiddenError('Access denied'));

      const res = await request(makeApp(mockService, mockWithLandlordAuth))
        .get('/api/properties/prop-other/applications');

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/properties/apply/:slug (public)', () => {
    it('returns 200 with public property shape without auth', async () => {
      mockService.getBySlug.mockResolvedValue(publicProperty);

      const res = await request(makeApp(mockService, mockWithLandlordAuth))
        .get('/api/properties/apply/main-st-abc123');

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        address: '123 Main St',
        landlordName: 'Test Landlord',
      });
      expect(res.body).not.toHaveProperty('landlordId');
      expect(mockWithLandlordAuth).not.toHaveBeenCalled();
    });

    it('returns 404 when slug does not exist', async () => {
      mockService.getBySlug.mockRejectedValue(new NotFoundError('Property not found'));

      const res = await request(makeApp(mockService, mockWithLandlordAuth))
        .get('/api/properties/apply/bad-slug');

      expect(res.status).toBe(404);
    });
  });
});
