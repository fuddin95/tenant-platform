import { Router } from 'express';
import type { RequestHandler } from 'express';
import type { GrantHandlers } from '../handlers/grant.handlers';

export const makeGrantRouter = (
  handlers: GrantHandlers,
  withTenantAuth: RequestHandler,
): Router => {
  const router = Router({ mergeParams: true });
  router.use(withTenantAuth);
  router.get('/grants', handlers.list);
  router.post('/applications/:applicationId/grants', handlers.create);
  router.delete('/applications/:applicationId/grants/:grantId', handlers.revoke);
  return router;
};
