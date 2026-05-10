import { makeGrantRepository } from '../repositories/prisma/grant.repository';
import { makeAuditRepository } from '../repositories/prisma/audit.repository';
import { makeNotificationRepository } from '../repositories/prisma/notification.repository';
import type { PrismaClient } from '@rental-trust/database';

const now = new Date();
const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
const past = new Date(Date.now() - 1000);

// ─── Grant repository ───────────────────────────────────────────────────────

const mockGrantDb = {
  accessGrant: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
} as unknown as PrismaClient;

const grantRepo = makeGrantRepository(mockGrantDb);

describe('makeGrantRepository', () => {
  beforeEach(() => jest.clearAllMocks());

  it('findByTenant includes computed status ACTIVE', async () => {
    (mockGrantDb.accessGrant.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'g1',
        revokedAt: null,
        expiresAt: future,
        grantedAt: now,
        allowedDocs: ['GOVERNMENT_ID'],
        application: {
          property: { address: '100 King St', landlord: { name: 'L1' } },
        },
      },
    ]);
    const [result] = await grantRepo.findByTenant('t1');
    expect(result.status).toBe('ACTIVE');
    expect(result.landlordName).toBe('L1');
    expect(result.allowedDocs).toContain('GOVERNMENT_ID');
  });

  it('findByTenant computes REVOKED when revokedAt is set', async () => {
    (mockGrantDb.accessGrant.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'g2',
        revokedAt: now,
        expiresAt: future,
        grantedAt: now,
        allowedDocs: [],
        application: { property: { address: '1 Bay St', landlord: { name: 'L2' } } },
      },
    ]);
    const [result] = await grantRepo.findByTenant('t1');
    expect(result.status).toBe('REVOKED');
  });

  it('revoke sets revokedAt and revokedBy', async () => {
    (mockGrantDb.accessGrant.update as jest.Mock).mockResolvedValue({});
    await grantRepo.revoke('g1', 'tenant-1');
    const call = (mockGrantDb.accessGrant.update as jest.Mock).mock.calls[0][0];
    expect(call.where).toEqual({ id: 'g1' });
    expect(call.data.revokedAt).toBeInstanceOf(Date);
    expect(call.data.revokedBy).toBe('tenant-1');
  });
});

// ─── Audit repository ───────────────────────────────────────────────────────

const mockAuditDb = {
  auditEvent: { create: jest.fn() },
} as unknown as PrismaClient;

const auditRepo = makeAuditRepository(mockAuditDb);

describe('makeAuditRepository', () => {
  beforeEach(() => jest.clearAllMocks());

  it('exposes only create — no update or delete methods', () => {
    expect(typeof auditRepo.create).toBe('function');
    expect(auditRepo).not.toHaveProperty('update');
    expect(auditRepo).not.toHaveProperty('delete');
  });

  it('create delegates to db.auditEvent.create', async () => {
    (mockAuditDb.auditEvent.create as jest.Mock).mockResolvedValue({});
    const data = {
      accessGrantId: 'g1',
      eventType: 'DOCUMENT_VIEWED' as const,
      actorId: 'l1',
      actorType: 'LANDLORD' as const,
    };
    await auditRepo.create(data);
    expect(mockAuditDb.auditEvent.create).toHaveBeenCalledWith({ data });
  });
});

// ─── Notification repository ────────────────────────────────────────────────

const mockNotifDb = {
  notification: {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
} as unknown as PrismaClient;

const notifRepo = makeNotificationRepository(mockNotifDb);

describe('makeNotificationRepository', () => {
  beforeEach(() => jest.clearAllMocks());

  it('findByRecipient filters to recipient', async () => {
    (mockNotifDb.notification.findMany as jest.Mock).mockResolvedValue([]);
    await notifRepo.findByRecipient('r1');
    expect(mockNotifDb.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { recipientId: 'r1' } }),
    );
  });

  it('markRead sets read=true', async () => {
    (mockNotifDb.notification.update as jest.Mock).mockResolvedValue({});
    await notifRepo.markRead('n1');
    expect(mockNotifDb.notification.update).toHaveBeenCalledWith({
      where: { id: 'n1' },
      data: { read: true },
    });
  });
});
