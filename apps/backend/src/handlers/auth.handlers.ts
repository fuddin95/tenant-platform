import { z } from 'zod';
import type { RequestHandler } from 'express';
import type { AuthService } from '../services/auth.service';
import { asyncHandler } from '../utils/asyncHandler';

const RegisterSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(8),
  role: z.enum(['LANDLORD', 'TENANT']),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const COOKIE_NAME = 'token';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

const cookieOpts = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: COOKIE_MAX_AGE,
};

export type AuthHandlers = {
  register: RequestHandler;
  login: RequestHandler;
  logout: RequestHandler;
  me: RequestHandler;
};

export const makeAuthHandlers = (service: AuthService): AuthHandlers => ({
  register: asyncHandler(async (req, res) => {
    const input = RegisterSchema.parse(req.body);
    const { token, user } = await service.register(input);
    res.cookie(COOKIE_NAME, token, cookieOpts).status(201).json(user);
  }),

  login: asyncHandler(async (req, res) => {
    const input = LoginSchema.parse(req.body);
    const { token, user } = await service.login(input);
    res.cookie(COOKIE_NAME, token, cookieOpts).json(user);
  }),

  logout: (_req, res) => {
    res.clearCookie(COOKIE_NAME).status(204).end();
  },

  me: asyncHandler(async (req, res) => {
    const user = await service.getMe(req.user.sub, req.user.role);
    res.json(user);
  }),
});
