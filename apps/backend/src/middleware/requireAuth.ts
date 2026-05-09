import type { RequestHandler } from 'express';
import type { JwtService } from '../utils/jwt';
import { UnauthorizedError } from '../types/errors';

export const makeRequireAuth = (jwtService: JwtService): RequestHandler =>
  (req, _res, next) => {
    const token = (req.cookies as Record<string, string | undefined>)['token'];
    if (!token) return void next(new UnauthorizedError('Authentication required'));
    try {
      req.user = jwtService.verify(token);
      next();
    } catch {
      next(new UnauthorizedError('Invalid or expired token'));
    }
  };
