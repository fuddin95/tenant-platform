import { AppError, ForbiddenError, NotFoundError, StorageError, UnauthorizedError, ValidationError } from '../types/errors';

describe('AppError hierarchy', () => {
  it('ForbiddenError has status 403', () => {
    const err = new ForbiddenError('Access denied');
    expect(err.statusCode).toBe(403);
    expect(err.message).toBe('Access denied');
    expect(err).toBeInstanceOf(AppError);
  });

  it('NotFoundError has status 404', () => {
    const err = new NotFoundError('Resource not found');
    expect(err.statusCode).toBe(404);
    expect(err).toBeInstanceOf(AppError);
  });

  it('ValidationError has status 400', () => {
    const err = new ValidationError('Invalid input');
    expect(err.statusCode).toBe(400);
    expect(err).toBeInstanceOf(AppError);
  });

  it('AppError is an instance of Error', () => {
    const err = new ForbiddenError('x');
    expect(err).toBeInstanceOf(Error);
  });

  it('UnauthorizedError has statusCode 401', () => {
    const err = new UnauthorizedError('bad token');
    expect(err.statusCode).toBe(401);
    expect(err.message).toBe('bad token');
    expect(err).toBeInstanceOf(AppError);
  });

  it('StorageError has statusCode 502 and code STORAGE_FAILURE', () => {
    const err = new StorageError('msg');
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(502);
    expect(err.code).toBe('STORAGE_FAILURE');
    expect(err.message).toBe('msg');
  });
});
