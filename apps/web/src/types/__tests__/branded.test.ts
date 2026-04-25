import { TenantId, LandlordId, PropertyId } from '../branded';

describe('branded types', () => {
  it('constructs a valid TenantId', () => {
    const id = TenantId('abc-123');
    expect(id).toBe('abc-123');
  });

  it('throws on empty TenantId', () => {
    expect(() => TenantId('')).toThrow('Invalid TenantId');
  });

  it('constructs a valid LandlordId', () => {
    const id = LandlordId('landlord-1');
    expect(id).toBe('landlord-1');
  });

  it('constructs a valid PropertyId', () => {
    const id = PropertyId('prop-1');
    expect(id).toBe('prop-1');
  });
});
