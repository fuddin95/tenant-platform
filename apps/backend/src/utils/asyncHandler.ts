import type { RequestHandler } from 'express';

export const asyncHandler = (
  fn: (...args: Parameters<RequestHandler>) => Promise<void>,
): RequestHandler =>
  (req, res, next) => void fn(req, res, next).catch(next);
