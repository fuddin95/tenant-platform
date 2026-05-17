import { Router } from 'express';
import type { RequestHandler } from 'express';
import type { NotificationHandlers } from '../handlers/notification.handlers';

export const makeNotificationRouter = (
  handlers: NotificationHandlers,
  requireAuth: RequestHandler,
): Router => {
  const router = Router();

  router.use(requireAuth);
  router.get('/', handlers.list);
  router.patch('/:id/read', handlers.markRead);

  return router;
};
