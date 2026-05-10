import { Router } from 'express';
import type { RequestHandler } from 'express';
import type { AuthHandlers } from '../handlers/auth.handlers';

export const makeAuthRouter = (
  handlers: AuthHandlers,
  requireAuth: RequestHandler,
): Router => {
  const router = Router();
  router.post('/register', handlers.register);
  router.post('/login', handlers.login);
  router.post('/logout', requireAuth, handlers.logout);
  router.get('/me', requireAuth, handlers.me);
  return router;
};
