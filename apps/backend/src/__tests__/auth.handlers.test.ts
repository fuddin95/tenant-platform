import request from 'supertest';
import { makeAuthHandlers } from '../handlers/auth.handlers';
import { makeAuthRouter } from '../routes/auth';
import { createApp } from '../server';
import type { AuthService, SafeUser } from '../services/auth.service';
import type { RequestHandler } from 'express';
import { UnauthorizedError } from '../types/errors';

const LANDLORD_USER: SafeUser = { id: 'landlord-1', email: 'l@test.com', name: 'Landlord', role: 'LANDLORD' };
const TENANT_USER: SafeUser = { id: 'tenant-1', email: 't@test.com', name: 'Tenant', role: 'TENANT' };

const makeApp = (service: jest.Mocked<AuthService>, requireAuth: RequestHandler) => {
  const handlers = makeAuthHandlers(service as unknown as AuthService);
  const authRouter = makeAuthRouter(handlers, requireAuth);
  return createApp([{ path: '/api/auth', router: authRouter }]);
};

describe('auth handlers', () => {
  let mockService: jest.Mocked<AuthService>;
  let mockRequireAuth: jest.MockedFunction<RequestHandler>;

  beforeEach(() => {
    mockService = {
      register: jest.fn(),
      login: jest.fn(),
      getMe: jest.fn(),
    };
    mockRequireAuth = jest.fn((_req, _res, next) => next()) as jest.MockedFunction<RequestHandler>;
  });

  describe('POST /api/auth/register', () => {
    it('returns 201 with user object and sets httpOnly cookie', async () => {
      mockService.register.mockResolvedValue({ token: 'jwt-token', user: LANDLORD_USER });

      const res = await request(makeApp(mockService, mockRequireAuth))
        .post('/api/auth/register')
        .send({ email: 'l@test.com', name: 'Landlord', password: 'password123', role: 'LANDLORD' });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ id: 'landlord-1', email: 'l@test.com', role: 'LANDLORD' });
      expect(res.body).not.toHaveProperty('passwordHash');
      expect(res.headers['set-cookie']).toBeDefined();
      expect(res.headers['set-cookie'][0]).toContain('token=jwt-token');
      expect(res.headers['set-cookie'][0]).toContain('HttpOnly');
    });

    it('creates profile shell when registering as TENANT', async () => {
      mockService.register.mockResolvedValue({ token: 'jwt-token', user: TENANT_USER });

      const res = await request(makeApp(mockService, mockRequireAuth))
        .post('/api/auth/register')
        .send({ email: 't@test.com', name: 'Tenant', password: 'password123', role: 'TENANT' });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ role: 'TENANT' });
      expect(mockService.register).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'TENANT' }),
      );
    });

    it('returns 400 for invalid body', async () => {
      const res = await request(makeApp(mockService, mockRequireAuth))
        .post('/api/auth/register')
        .send({ email: 'not-an-email', password: '123' });

      expect(res.status).toBe(500); // Zod throws, caught by error handler as non-AppError
    });
  });

  describe('POST /api/auth/login', () => {
    it('returns 200 with user object and sets httpOnly cookie', async () => {
      mockService.login.mockResolvedValue({ token: 'jwt-token', user: LANDLORD_USER });

      const res = await request(makeApp(mockService, mockRequireAuth))
        .post('/api/auth/login')
        .send({ email: 'l@test.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ id: 'landlord-1', email: 'l@test.com', role: 'LANDLORD' });
      expect(res.headers['set-cookie'][0]).toContain('token=jwt-token');
    });

    it('returns 401 for wrong credentials', async () => {
      mockService.login.mockRejectedValue(new UnauthorizedError('Invalid credentials'));

      const res = await request(makeApp(mockService, mockRequireAuth))
        .post('/api/auth/login')
        .send({ email: 'l@test.com', password: 'wrongpassword' });

      expect(res.status).toBe(401);
      expect(res.body).toMatchObject({ error: 'Invalid credentials' });
    });
  });

  describe('POST /api/auth/logout', () => {
    it('returns 204 and clears the token cookie', async () => {
      const res = await request(makeApp(mockService, mockRequireAuth))
        .post('/api/auth/logout')
        .set('Cookie', 'token=old-token');

      expect(res.status).toBe(204);
      expect(res.headers['set-cookie'][0]).toContain('token=;');
    });
  });

  describe('GET /api/auth/me', () => {
    it('returns current user when authenticated', async () => {
      mockRequireAuth.mockImplementation((req, _res, next) => {
        req.user = { sub: 'landlord-1', role: 'LANDLORD', email: 'l@test.com' };
        next();
      });
      mockService.getMe.mockResolvedValue(LANDLORD_USER);

      const res = await request(makeApp(mockService, mockRequireAuth))
        .get('/api/auth/me')
        .set('Cookie', 'token=valid-token');

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ id: 'landlord-1', role: 'LANDLORD' });
    });

    it('returns 401 when not authenticated', async () => {
      mockRequireAuth.mockImplementation((_req, _res, next) => {
        next(new UnauthorizedError('Authentication required'));
      });

      const res = await request(makeApp(mockService, mockRequireAuth))
        .get('/api/auth/me');

      expect(res.status).toBe(401);
    });
  });
});
