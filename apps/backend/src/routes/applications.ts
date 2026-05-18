import { Router } from 'express';
import type { RequestHandler } from 'express';
import type { ApplicationHandlers } from '../handlers/application.handlers';

export const makeApplicationRouter = (
  handlers: ApplicationHandlers,
  requireAuth: RequestHandler,
  withTenantAuth: RequestHandler,
  withLandlordAuth: RequestHandler,
): Router => {
  const router = Router();

  router.use(requireAuth);

  router.post('/', withTenantAuth, handlers.submit);
  router.get('/mine', withTenantAuth, handlers.listByTenant);
  router.get('/:id', handlers.getApplication);
  router.patch('/:id/status', withLandlordAuth, handlers.updateStatus);

  return router;
};
