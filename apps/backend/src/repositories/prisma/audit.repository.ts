import type { PrismaClient } from '@rental-trust/database';
import type { IAuditRepository, CreateAuditEventData } from '../interfaces/IAuditRepository';

// Append-only — no update, no delete. Constitution Rule 3.
export const makeAuditRepository = (db: PrismaClient): IAuditRepository => ({
  create: (data: CreateAuditEventData) => db.auditEvent.create({ data }),
});
