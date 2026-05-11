import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from './types/errors';

export const requestLogger = (req: Request, _res: Response, next: NextFunction): void => {
  console.warn(`${req.method} ${req.path}`);
  next();
};

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({ error: 'Validation error', issues: err.issues });
    return;
  }
  // Never expose internal errors to the client
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
};
