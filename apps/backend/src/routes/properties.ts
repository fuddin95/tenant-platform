import { Router } from 'express';
import type { RequestHandler } from 'express';
import type { PropertyHandlers } from '../handlers/property.handlers';

export const makePropertyRouter = (
  handlers: PropertyHandlers,
  withLandlordAuth: RequestHandler,
): Router => {
  const router = Router();

  router.get('/apply/:slug', handlers.getBySlug);

  router.use(withLandlordAuth);
  router.get('/', handlers.list);
  router.post('/', handlers.create);
  router.get('/:id', handlers.getById);
  router.patch('/:id', handlers.update);
  router.get('/:id/applications', handlers.getApplications);

  return router;
};
