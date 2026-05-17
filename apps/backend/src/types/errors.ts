export abstract class AppError extends Error {
  abstract readonly statusCode: number;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class UnauthorizedError extends AppError {
  readonly statusCode = 401;
}

export class ForbiddenError extends AppError {
  readonly statusCode = 403;
}

export class NotFoundError extends AppError {
  readonly statusCode = 404;
}

export class ValidationError extends AppError {
  readonly statusCode = 400;
}

export class ConflictError extends AppError {
  readonly statusCode = 409;
}

export class InternalError extends AppError {
  readonly statusCode = 500;
}

export class StorageError extends AppError {
  readonly statusCode = 502;
  readonly code = 'STORAGE_FAILURE';
}
