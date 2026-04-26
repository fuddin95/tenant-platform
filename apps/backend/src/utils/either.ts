import * as E from 'fp-ts/Either';
import { Response } from 'express';
import { AppError } from '../types/errors';

export const sendEither = <T>(res: Response, either: E.Either<AppError, T>): void => {
  if (E.isLeft(either)) {
    res.status(either.left.statusCode).json({ error: either.left.message });
  } else {
    res.json(either.right);
  }
};
