import type { AuditEvent, AuditEventType, ActorType } from '@rental-trust/database';

export type CreateAuditEventData = {
  accessGrantId: string;
  eventType: AuditEventType;
  actorId: string;
  actorType: ActorType;
  metadata?: Record<string, unknown>;
};

// Append-only — no update, no delete exposed at interface level
export interface IAuditRepository {
  create(data: CreateAuditEventData): Promise<AuditEvent>;
}
