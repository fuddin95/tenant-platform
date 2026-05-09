import type { Request, Response, NextFunction } from 'express';
import { makeRequireAuth } from '../middleware/requireAuth';
import { requireRole } from '../middleware/requireRole';
import { makeJwtService } from '../utils/jwt';
import { UnauthorizedError, ForbiddenError } from '../types/errors';

const SECRET = 'test-secret-at-least-32-chars-long!!';
const jwtService = makeJwtService(SECRET);

const mockNext = jest.fn() as jest.MockedFunction<NextFunction>;
const mockRes = {} as Response;

const makeReq = (overrides: Partial<Request> = {}): Request =>
  ({ cookies: {}, ...overrides }) as unknown as Request;

beforeEach(() => mockNext.mockClear());

describe('requireAuth', () => {
  const requireAuth = makeRequireAuth(jwtService);

  it('attaches user and calls next for valid cookie', () => {
    const token = jwtService.sign({ sub: 'u1', role: 'TENANT', email: 'a@b.com' });
    const req = makeReq({ cookies: { token } });
    requireAuth(req, mockRes, mockNext);
    expect((req as unknown as { user: unknown }).user).toMatchObject({ sub: 'u1', role: 'TENANT' });
    expect(mockNext).toHaveBeenCalledWith();
  });

  it('calls next with UnauthorizedError when cookie missing', () => {
    requireAuth(makeReq(), mockRes, mockNext);
    expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  it('calls next with UnauthorizedError for invalid token', () => {
    const req = makeReq({ cookies: { token: 'bad.token.here' } });
    requireAuth(req, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });
});

describe('requireRole', () => {
  it('calls next() when role matches', () => {
    const req = makeReq();
    (req as unknown as { user: unknown }).user = { sub: 'u1', role: 'LANDLORD', email: 'a@b.com' };
    requireRole('LANDLORD')(req, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalledWith();
  });

  it('calls next with ForbiddenError when role does not match', () => {
    const req = makeReq();
    (req as unknown as { user: unknown }).user = { sub: 'u1', role: 'TENANT', email: 'a@b.com' };
    requireRole('LANDLORD')(req, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalledWith(expect.any(ForbiddenError));
  });
});
