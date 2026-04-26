import { checkGrantActive } from '../utils/access-guard';
import { ForbiddenError } from '../types/errors';

const makeGrant = (overrides: Partial<{ revokedAt: Date | null; expiresAt: Date }> = {}) => ({
  id: 'grant-1',
  applicationId: 'app-1',
  grantedAt: new Date(),
  revokedAt: null,
  expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
  revokedBy: null,
  allowedDocs: [],
  ...overrides,
});

describe('checkGrantActive (Constitution Rules 4 and 8)', () => {
  it('returns the grant when active', () => {
    const grant = makeGrant();
    expect(checkGrantActive(grant)).toBe(grant);
  });

  it('throws ForbiddenError when grant is revoked', () => {
    const grant = makeGrant({ revokedAt: new Date() });
    expect(() => checkGrantActive(grant)).toThrow(ForbiddenError);
    expect(() => checkGrantActive(grant)).toThrow('Access has been revoked');
  });

  it('throws ForbiddenError when grant is expired', () => {
    const grant = makeGrant({ expiresAt: new Date(Date.now() - 1000) });
    expect(() => checkGrantActive(grant)).toThrow(ForbiddenError);
    expect(() => checkGrantActive(grant)).toThrow('Access has expired');
  });

  it('revocation takes precedence over expiry', () => {
    const grant = makeGrant({
      revokedAt: new Date(),
      expiresAt: new Date(Date.now() - 1000),
    });
    expect(() => checkGrantActive(grant)).toThrow('Access has been revoked');
  });
});
