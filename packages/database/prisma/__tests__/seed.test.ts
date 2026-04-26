import { buildSeedData } from '../seed';

describe('buildSeedData', () => {
  const data = buildSeedData();

  describe('landlord', () => {
    it('has a fixed id for idempotency', () => {
      expect(data.landlord.id).toBe('seed-landlord-1');
    });

    it('has a valid email', () => {
      expect(data.landlord.email).toContain('@');
    });
  });

  describe('property', () => {
    it('belongs to the seed landlord', () => {
      expect(data.property.landlordId).toBe(data.landlord.id);
    });

    it('has a unique applySlug', () => {
      expect(data.property.applySlug).toBeTruthy();
    });

    it('requires GOVERNMENT_ID and PROOF_OF_INCOME', () => {
      expect(data.property.requiredDocs).toContain('GOVERNMENT_ID');
      expect(data.property.requiredDocs).toContain('PROOF_OF_INCOME');
    });
  });

  describe('tenant and profile', () => {
    it('tenant has a fixed id for idempotency', () => {
      expect(data.tenant.id).toBe('seed-tenant-1');
    });

    it('profile belongs to the seed tenant', () => {
      expect(data.profile.tenantId).toBe(data.tenant.id);
    });
  });

  describe('documents', () => {
    it('creates exactly 2 documents', () => {
      expect(data.documents).toHaveLength(2);
    });

    it('documents use fake storageKeys (not real S3 paths)', () => {
      data.documents.forEach((doc) => {
        expect(doc.storageKey).toMatch(/^dev\/seed\//);
      });
    });

    it('covers GOVERNMENT_ID and PROOF_OF_INCOME', () => {
      const types = data.documents.map((d) => d.type);
      expect(types).toContain('GOVERNMENT_ID');
      expect(types).toContain('PROOF_OF_INCOME');
    });
  });

  describe('application', () => {
    it('links to the seed tenant and property', () => {
      expect(data.application.tenantId).toBe(data.tenant.id);
      expect(data.application.propertyId).toBe(data.property.id);
    });

    it('starts as PENDING', () => {
      expect(data.application.status).toBe('PENDING');
    });
  });

  describe('accessGrant (Constitution Rules 4 and 8)', () => {
    it('expiresAt is always set — null expiry is invalid', () => {
      expect(data.accessGrant.expiresAt).toBeDefined();
      expect(data.accessGrant.expiresAt).not.toBeNull();
    });

    it('expiresAt is in the future', () => {
      expect(data.accessGrant.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('revokedAt is null — grant starts active', () => {
      expect(data.accessGrant.revokedAt).toBeNull();
    });

    it('allows GOVERNMENT_ID', () => {
      expect(data.accessGrant.allowedDocs).toContain('GOVERNMENT_ID');
    });
  });

  describe('auditEvent (Constitution Rule 3)', () => {
    it('is ACCESS_GRANTED type', () => {
      expect(data.auditEvent.eventType).toBe('ACCESS_GRANTED');
    });

    it('has actorType LANDLORD', () => {
      expect(data.auditEvent.actorType).toBe('LANDLORD');
    });

    it('has no updatedAt field — AuditEvent is append-only', () => {
      expect(data.auditEvent).not.toHaveProperty('updatedAt');
    });
  });
});
