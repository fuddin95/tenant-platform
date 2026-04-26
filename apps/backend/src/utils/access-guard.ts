import { ForbiddenError } from '../types/errors';

type Grant = {
  revokedAt: Date | null;
  expiresAt: Date;
};

export const checkGrantActive = <T extends Grant>(grant: T): T => {
  if (grant.revokedAt) throw new ForbiddenError('Access has been revoked');
  if (grant.expiresAt <= new Date()) throw new ForbiddenError('Access has expired');
  return grant;
};
