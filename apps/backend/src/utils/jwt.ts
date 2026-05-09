import jwt from 'jsonwebtoken';
import type { JwtPayload } from '../types/express';

export type JwtService = {
  sign: (payload: JwtPayload) => string;
  verify: (token: string) => JwtPayload;
};

export const makeJwtService = (secret: string): JwtService => ({
  sign: (payload) => jwt.sign(payload, secret, { expiresIn: '7d' }),
  verify: (token) => jwt.verify(token, secret) as JwtPayload,
});
