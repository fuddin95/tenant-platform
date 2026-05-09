import type { RequestHandler } from 'express';
import type { Role } from '../types/express';
import { ForbiddenError } from '../types/errors';

export const requireRole =
  (role: Role): RequestHandler =>
  (req, _res, next) => {
    if (req.user?.role !== role) return void next(new ForbiddenError('Insufficient permissions'));
    next();
  };
