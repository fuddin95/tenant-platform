import * as E from 'fp-ts/Either';
import { PropertyCardCodec, TenantProfileCodec } from '../codecs';

describe('PropertyCardCodec', () => {
  it('decodes a valid property card', () => {
    const raw = { id: '1', address: '123 Main St', rent: 2000, bedrooms: 2, applySlug: 'abc' };
    const result = PropertyCardCodec.decode(raw);
    expect(E.isRight(result)).toBe(true);
  });

  it('rejects a property card missing required fields', () => {
    const raw = { id: '1', address: '123 Main St' };
    const result = PropertyCardCodec.decode(raw);
    expect(E.isLeft(result)).toBe(true);
  });
});

describe('TenantProfileCodec', () => {
  it('decodes a valid profile', () => {
    const raw = {
      id: 'p-1',
      tenantId: 't-1',
      completionPercent: 80,
      documents: [{ id: 'd-1', type: 'GOVERNMENT_ID', uploadedAt: '2026-01-01T00:00:00Z' }],
    };
    const result = TenantProfileCodec.decode(raw);
    expect(E.isRight(result)).toBe(true);
  });

  it('rejects an unknown document type', () => {
    const raw = {
      id: 'p-1',
      tenantId: 't-1',
      completionPercent: 80,
      documents: [{ id: 'd-1', type: 'INVALID_TYPE', uploadedAt: '2026-01-01T00:00:00Z' }],
    };
    const result = TenantProfileCodec.decode(raw);
    expect(E.isLeft(result)).toBe(true);
  });
});
