import request from 'supertest';
import { makeGrantHandlers } from '../handlers/grant.handlers';
import { makeGrantRouter } from '../routes/grants';
import { createApp } from '../server';
import { NotFoundError } from '../types/errors';
import type { GrantService } from '../services/grant.service';
import type { RequestHandler } from 'express';
import type { AccessGrant } from '@rental-trust/database';
import type { GrantSummary } from '../repositories/interfaces/IGrantRepository';

const TENANT_ID = 'tenant-1';
const APP_ID = 'app-1';
const GRANT_ID = 'grant-1';

const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();

const grantSummaries: GrantSummary[] = [
  {
    id: GRANT_ID,
    landlordName: 'Test Landlord',
    propertyAddress: '123 Main St',
    grantedAt: new Date(),
    expiresAt: new Date(futureDate),
    allowedDocs: ['GOVERNMENT_ID'],
    status: 'ACTIVE',
  },
];

const createdGrant: AccessGrant = {
  id: GRANT_ID,
  applicationId: APP_ID,
  allowedDocs: ['GOVERNMENT_ID'],
  expiresAt: new Date(futureDate),
  grantedAt: new Date(),
  revokedAt: null,
  revokedBy: null,
};

const makeApp = (service: jest.Mocked<GrantService>, withTenantAuth: RequestHandler) => {
  const handlers = makeGrantHandlers(service as unknown as GrantService);
  const grantRouter = makeGrantRouter(handlers, withTenantAuth);
  return createApp([{ path: '/api', router: grantRouter }]);
};

describe('grant handlers', () => {
  let mockService: jest.Mocked<GrantService>;
  let mockWithTenantAuth: jest.MockedFunction<RequestHandler>;

  beforeEach(() => {
    mockService = {
      list: jest.fn(),
      create: jest.fn(),
      revoke: jest.fn(),
    };
    mockWithTenantAuth = jest.fn((req, _res, next) => {
      req.user = { sub: TENANT_ID, role: 'TENANT', email: 'tenant@test.com' };
      next();
    }) as jest.MockedFunction<RequestHandler>;
  });

  describe('GET /api/grants', () => {
    it('returns 200 with grants array for tenant', async () => {
      mockService.list.mockResolvedValue(grantSummaries);

      const res = await request(makeApp(mockService, mockWithTenantAuth))
        .get('/api/grants');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toMatchObject({ id: GRANT_ID, landlordName: 'Test Landlord' });
      expect(mockService.list).toHaveBeenCalledWith(TENANT_ID);
    });
  });

  describe('POST /api/applications/:applicationId/grants', () => {
    const validBody = {
      allowedDocs: ['GOVERNMENT_ID'],
      expiresAt: futureDate,
    };

    it('returns 201 with created grant for valid body', async () => {
      mockService.create.mockResolvedValue(createdGrant);

      const res = await request(makeApp(mockService, mockWithTenantAuth))
        .post(`/api/applications/${APP_ID}/grants`)
        .send(validBody);

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ id: GRANT_ID, applicationId: APP_ID });
      expect(mockService.create).toHaveBeenCalledWith(
        TENANT_ID,
        APP_ID,
        expect.objectContaining({ allowedDocs: ['GOVERNMENT_ID'] }),
      );
    });

    it('returns 400 when body is missing required fields', async () => {
      const res = await request(makeApp(mockService, mockWithTenantAuth))
        .post(`/api/applications/${APP_ID}/grants`)
        .send({});

      expect(res.status).toBe(400);
      expect(mockService.create).not.toHaveBeenCalled();
    });

    it('returns 400 when expiresAt is not a valid datetime', async () => {
      const res = await request(makeApp(mockService, mockWithTenantAuth))
        .post(`/api/applications/${APP_ID}/grants`)
        .send({ allowedDocs: ['GOVERNMENT_ID'], expiresAt: 'not-a-date' });

      expect(res.status).toBe(400);
      expect(mockService.create).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /api/applications/:applicationId/grants/:grantId', () => {
    it('returns 204 when grant is successfully revoked', async () => {
      mockService.revoke.mockResolvedValue(undefined);

      const res = await request(makeApp(mockService, mockWithTenantAuth))
        .delete(`/api/applications/${APP_ID}/grants/${GRANT_ID}`);

      expect(res.status).toBe(204);
      expect(mockService.revoke).toHaveBeenCalledWith(TENANT_ID, GRANT_ID);
    });

    it('returns 404 when service throws NotFoundError', async () => {
      mockService.revoke.mockRejectedValue(new NotFoundError('Grant not found'));

      const res = await request(makeApp(mockService, mockWithTenantAuth))
        .delete(`/api/applications/${APP_ID}/grants/${GRANT_ID}`);

      expect(res.status).toBe(404);
    });
  });
});
