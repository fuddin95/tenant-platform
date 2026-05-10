import type { PrismaClient, Prisma } from '@rental-trust/database';
import type { IAuditRepository, CreateAuditEventData } from '../interfaces/IAuditRepository';

// Append-only — no update, no delete. Constitution Rule 3.
export const makeAuditRepository = (db: PrismaClient): IAuditRepository => ({
  create: (data: CreateAuditEventData) =>
    db.auditEvent.create({
      data: {
        ...data,
        // Record<string, unknown> is wider than Prisma's InputJsonValue — cast is safe
        // because audit metadata values are always plain JSON-serializable objects
        metadata: data.metadata as Prisma.InputJsonValue | undefined,
      },
    }),
});
