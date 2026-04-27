import { PrismaClient } from '@prisma/client';

// ─────────────────────────────────────────────
// Seed data shapes — plain types, no Prisma namespace
// ─────────────────────────────────────────────

type DocumentType = 'GOVERNMENT_ID' | 'PROOF_OF_INCOME' | 'PAY_STUB' | 'EMPLOYMENT_LETTER' | 'REFERENCE_CONTACT' | 'CREDIT_REPORT';

export type SeedData = {
  landlord: { id: string; email: string; name: string; role: 'INDEPENDENT_LANDLORD'; city: string; phone: string };
  property: {
    id: string; landlordId: string; address: string; unitNumber: string;
    city: string; rent: number; bedrooms: number; applySlug: string;
    status: 'ACTIVE'; requiredDocs: DocumentType[];
  };
  tenant: { id: string; email: string; name: string };
  profile: { id: string; tenantId: string; completionPercent: number };
  documents: Array<{
    id: string; profileId: string; type: DocumentType;
    storageKey: string; fileName: string; mimeType: string; sizeBytes: number;
  }>;
  application: { id: string; tenantId: string; propertyId: string; status: 'PENDING' };
  accessGrant: {
    id: string; applicationId: string; expiresAt: Date;
    revokedAt: null; allowedDocs: Array<'GOVERNMENT_ID'>;
  };
  auditEvent: {
    id: string; accessGrantId: string; eventType: 'ACCESS_GRANTED';
    actorId: string; actorType: 'LANDLORD'; metadata: Record<string, string>; occurredAt: Date;
  };
};

// ─────────────────────────────────────────────
// Pure data builder — no DB calls, fully testable
// ─────────────────────────────────────────────

export const buildSeedData = (): SeedData => {
  const landlordId = 'seed-landlord-1';
  const propertyId = 'seed-property-1';
  const tenantId = 'seed-tenant-1';
  const profileId = 'seed-profile-1';
  const applicationId = 'seed-application-1';
  const grantId = 'seed-grant-1';

  return {
    landlord: {
      id: landlordId,
      email: 'dev-landlord@example.com',
      name: 'Dev Landlord',
      role: 'INDEPENDENT_LANDLORD',
      city: 'Toronto',
      phone: '416-555-0100',
    },
    property: {
      id: propertyId,
      landlordId,
      address: '100 King St W',
      unitNumber: '2501',
      city: 'Toronto',
      rent: 2200,
      bedrooms: 2,
      applySlug: 'dev-apply-slug',
      status: 'ACTIVE',
      requiredDocs: ['GOVERNMENT_ID', 'PROOF_OF_INCOME'],
    },
    tenant: { id: tenantId, email: 'dev-tenant@example.com', name: 'Dev Tenant' },
    profile: { id: profileId, tenantId, completionPercent: 80 },
    documents: [
      {
        id: 'seed-doc-gov-1',
        profileId,
        type: 'GOVERNMENT_ID',
        storageKey: 'dev/seed/gov-id.pdf',
        fileName: 'government-id.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 102400,
      },
      {
        id: 'seed-doc-income-1',
        profileId,
        type: 'PROOF_OF_INCOME',
        storageKey: 'dev/seed/proof-of-income.pdf',
        fileName: 'proof-of-income.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 81920,
      },
    ],
    application: { id: applicationId, tenantId, propertyId, status: 'PENDING' },
    accessGrant: {
      id: grantId,
      applicationId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      revokedAt: null,
      allowedDocs: ['GOVERNMENT_ID'],
    },
    auditEvent: {
      id: 'seed-audit-1',
      accessGrantId: grantId,
      eventType: 'ACCESS_GRANTED',
      actorId: landlordId,
      actorType: 'LANDLORD',
      metadata: { trigger: 'seed' },
      occurredAt: new Date(),
    },
  };
};

// ─────────────────────────────────────────────
// DB runner — idempotent upserts, thin wrapper
// ─────────────────────────────────────────────

export const executeSeed = async (db: PrismaClient): Promise<void> => {
  const d = buildSeedData();

  await db.landlord.upsert({ where: { id: d.landlord.id }, update: {}, create: d.landlord });
  await db.property.upsert({ where: { id: d.property.id }, update: {}, create: d.property });
  await db.tenant.upsert({ where: { id: d.tenant.id }, update: {}, create: d.tenant });
  await db.profile.upsert({ where: { id: d.profile.id }, update: {}, create: d.profile });

  for (const doc of d.documents) {
    await db.document.upsert({ where: { id: doc.id }, update: {}, create: doc });
  }

  await db.application.upsert({ where: { id: d.application.id }, update: {}, create: d.application });
  await db.accessGrant.upsert({ where: { id: d.accessGrant.id }, update: {}, create: d.accessGrant });
  // AuditEvent is append-only — only create if it doesn't exist (Constitution Rule 3)
  await db.auditEvent.upsert({ where: { id: d.auditEvent.id }, update: {}, create: d.auditEvent });
};

// Entry point — only runs when executed directly, not when imported by tests
if (require.main === module) {
  const run = async (): Promise<void> => {
    const db = new PrismaClient();
    try {
      await executeSeed(db);
      console.warn('Seed complete.');
    } finally {
      await db.$disconnect();
    }
  };

  run().catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
}
