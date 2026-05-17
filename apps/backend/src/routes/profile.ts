import { Router } from 'express';
import type { RequestHandler } from 'express';
import type { ProfileHandlers } from '../handlers/profile.handlers';

export const makeProfileRouter = (
  handlers: ProfileHandlers,
  withTenantAuth: RequestHandler,
): Router => {
  const router = Router();

  router.use(withTenantAuth);

  router.get('/', handlers.get);
  router.post('/references', handlers.addReference);
  router.delete('/references/:id', handlers.removeReference);

  return router;
};
