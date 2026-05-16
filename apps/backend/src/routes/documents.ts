import { Router } from 'express';
import type { RequestHandler } from 'express';
import type { DocumentHandlers } from '../handlers/document.handlers';

export const makeDocumentRouter = (
  handlers: DocumentHandlers,
  withTenantAuth: RequestHandler,
  withLandlordAuth: RequestHandler,
): Router => {
  const router = Router();

  // TEN-67 — tenant uploads: TENANT auth only
  router.post('/upload-url', withTenantAuth, handlers.getUploadUrl);

  // TEN-69 — landlord views document via pre-signed GET URL: LANDLORD auth only
  router.get('/:documentId/url', withLandlordAuth, handlers.getViewUrl);

  return router;
};
