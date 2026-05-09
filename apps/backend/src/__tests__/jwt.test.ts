import { makeJwtService } from '../utils/jwt';

const SECRET = 'test-secret-at-least-32-chars-long!!';

describe('makeJwtService', () => {
  const jwt = makeJwtService(SECRET);

  it('sign then verify round-trips payload', () => {
    const payload = { sub: 'user-1', role: 'TENANT' as const, email: 'a@b.com' };
    const token = jwt.sign(payload);
    const decoded = jwt.verify(token);
    expect(decoded.sub).toBe('user-1');
    expect(decoded.role).toBe('TENANT');
    expect(decoded.email).toBe('a@b.com');
  });

  it('verify throws on tampered token', () => {
    const token = jwt.sign({ sub: 'x', role: 'LANDLORD', email: 'x@x.com' });
    expect(() => jwt.verify(token + 'tampered')).toThrow();
  });
});
