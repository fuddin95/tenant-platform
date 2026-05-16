import request from 'supertest';
import { makeDocumentHandlers } from '../handlers/document.handlers';
import { makeDocumentRouter } from '../routes/documents';
import { createApp } from '../server';
import { ForbiddenError, ValidationError } from '../types/errors';
import type { DocumentService } from '../services/document.service';
import type { RequestHandler } from 'express';

const TENANT_ID = 'tenant-1';
const LANDLORD_ID = 'landlord-1';
const DOCUMENT_ID = 'doc-1';
const GRANT_ID = 'grant-1';

const makeApp = (
  service: jest.Mocked<DocumentService>,
  withTenantAuth: RequestHandler,
  withLandlordAuth: RequestHandler,
) => {
  const handlers = makeDocumentHandlers(service as unknown as DocumentService);
  const documentsRouter = makeDocumentRouter(handlers, withTenantAuth, withLandlordAuth);
  return createApp([{ path: '/api/documents', router: documentsRouter }]);
};

describe('document handlers', () => {
  let mockService: jest.Mocked<DocumentService>;
  let mockWithTenantAuth: jest.MockedFunction<RequestHandler>;
  let mockWithLandlordAuth: jest.MockedFunction<RequestHandler>;

  beforeEach(() => {
    mockService = {
      getUploadUrl: jest.fn(),
      getViewUrl: jest.fn(),
    };
    mockWithTenantAuth = jest.fn((req, _res, next) => {
      req.user = { sub: TENANT_ID, role: 'TENANT', email: 'tenant@test.com' };
      next();
    }) as jest.MockedFunction<RequestHandler>;

    mockWithLandlordAuth = jest.fn((req, _res, next) => {
      req.user = { sub: LANDLORD_ID, role: 'LANDLORD', email: 'landlord@test.com' };
      next();
    }) as jest.MockedFunction<RequestHandler>;
  });

  // ─── POST /api/documents/upload-url ────────────────────────────────────────

  describe('POST /api/documents/upload-url', () => {
    const validBody = {
      type: 'GOVERNMENT_ID',
      fileName: 'passport.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 512000,
    };

    it('returns 200 with uploadUrl, storageKey, and documentId', async () => {
      mockService.getUploadUrl.mockResolvedValue({
        uploadUrl: 'https://s3.example.com/presigned-put',
        storageKey: 'tenants/tenant-1/abc/passport.pdf',
        documentId: DOCUMENT_ID,
      });

      const res = await request(makeApp(mockService, mockWithTenantAuth, mockWithLandlordAuth))
        .post('/api/documents/upload-url')
        .send(validBody);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        uploadUrl: 'https://s3.example.com/presigned-put',
        storageKey: 'tenants/tenant-1/abc/passport.pdf',
        documentId: DOCUMENT_ID,
      });
      expect(mockService.getUploadUrl).toHaveBeenCalledWith(
        TENANT_ID,
        'GOVERNMENT_ID',
        'passport.pdf',
        'application/pdf',
        512000,
      );
    });

    it('requires TENANT role — withTenantAuth is applied', async () => {
      mockService.getUploadUrl.mockResolvedValue({
        uploadUrl: 'https://s3.example.com/presigned-put',
        storageKey: 'tenants/tenant-1/abc/passport.pdf',
        documentId: DOCUMENT_ID,
      });

      await request(makeApp(mockService, mockWithTenantAuth, mockWithLandlordAuth))
        .post('/api/documents/upload-url')
        .send(validBody);

      expect(mockWithTenantAuth).toHaveBeenCalled();
      expect(mockWithLandlordAuth).not.toHaveBeenCalled();
    });

    it('returns 400 for invalid DocumentType', async () => {
      const res = await request(makeApp(mockService, mockWithTenantAuth, mockWithLandlordAuth))
        .post('/api/documents/upload-url')
        .send({ ...validBody, type: 'INVALID_TYPE' });

      expect(res.status).toBe(400);
      expect(mockService.getUploadUrl).not.toHaveBeenCalled();
    });

    it('returns 400 for invalid mimeType', async () => {
      const res = await request(makeApp(mockService, mockWithTenantAuth, mockWithLandlordAuth))
        .post('/api/documents/upload-url')
        .send({ ...validBody, mimeType: 'text/plain' });

      expect(res.status).toBe(400);
      expect(mockService.getUploadUrl).not.toHaveBeenCalled();
    });

    it('returns 400 when required fields are missing', async () => {
      const res = await request(makeApp(mockService, mockWithTenantAuth, mockWithLandlordAuth))
        .post('/api/documents/upload-url')
        .send({ fileName: 'doc.pdf' });

      expect(res.status).toBe(400);
    });

    it('returns 400 when file is too large (service throws ValidationError)', async () => {
      mockService.getUploadUrl.mockRejectedValue(new ValidationError('File size exceeds the 10MB limit'));

      const res = await request(makeApp(mockService, mockWithTenantAuth, mockWithLandlordAuth))
        .post('/api/documents/upload-url')
        .send({ ...validBody, sizeBytes: 11 * 1024 * 1024 });

      expect(res.status).toBe(400);
    });
  });

  // ─── GET /api/documents/:documentId/url ────────────────────────────────────

  describe('GET /api/documents/:documentId/url', () => {
    it('returns 200 with url and expiresAt', async () => {
      const expiresAt = new Date(Date.now() + 3600 * 1000);
      mockService.getViewUrl.mockResolvedValue({
        url: 'https://s3.example.com/presigned-get',
        expiresAt,
      });

      const res = await request(makeApp(mockService, mockWithTenantAuth, mockWithLandlordAuth))
        .get(`/api/documents/${DOCUMENT_ID}/url`)
        .query({ grantId: GRANT_ID });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ url: 'https://s3.example.com/presigned-get' });
      expect(res.body.expiresAt).toBeDefined();
      expect(mockService.getViewUrl).toHaveBeenCalledWith(DOCUMENT_ID, GRANT_ID, LANDLORD_ID);
    });

    it('requires LANDLORD role — withLandlordAuth is applied', async () => {
      const expiresAt = new Date(Date.now() + 3600 * 1000);
      mockService.getViewUrl.mockResolvedValue({
        url: 'https://s3.example.com/presigned-get',
        expiresAt,
      });

      await request(makeApp(mockService, mockWithTenantAuth, mockWithLandlordAuth))
        .get(`/api/documents/${DOCUMENT_ID}/url`)
        .query({ grantId: GRANT_ID });

      expect(mockWithLandlordAuth).toHaveBeenCalled();
      expect(mockWithTenantAuth).not.toHaveBeenCalled();
    });

    it('returns 400 when grantId query param is missing', async () => {
      const res = await request(makeApp(mockService, mockWithTenantAuth, mockWithLandlordAuth))
        .get(`/api/documents/${DOCUMENT_ID}/url`);

      expect(res.status).toBe(400);
      expect(mockService.getViewUrl).not.toHaveBeenCalled();
    });

    it('returns 403 when grant is revoked', async () => {
      mockService.getViewUrl.mockRejectedValue(new ForbiddenError('Access denied'));

      const res = await request(makeApp(mockService, mockWithTenantAuth, mockWithLandlordAuth))
        .get(`/api/documents/${DOCUMENT_ID}/url`)
        .query({ grantId: GRANT_ID });

      expect(res.status).toBe(403);
    });

    it('returns 403 when grant is expired', async () => {
      mockService.getViewUrl.mockRejectedValue(new ForbiddenError('Access denied'));

      const res = await request(makeApp(mockService, mockWithTenantAuth, mockWithLandlordAuth))
        .get(`/api/documents/${DOCUMENT_ID}/url`)
        .query({ grantId: GRANT_ID });

      expect(res.status).toBe(403);
    });
  });
});
