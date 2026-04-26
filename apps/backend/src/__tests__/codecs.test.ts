import * as E from 'fp-ts/Either';
import { CreateApplicationCodec, CreatePropertyCodec } from '../codecs';

describe('CreateApplicationCodec', () => {
  const valid = { propertyId: 'prop-1', consentGiven: true };

  it('decodes valid input', () => {
    expect(E.isRight(CreateApplicationCodec.decode(valid))).toBe(true);
  });

  it('rejects missing propertyId', () => {
    expect(E.isLeft(CreateApplicationCodec.decode({ consentGiven: true }))).toBe(true);
  });

  it('rejects consentGiven: false — no consent means no application', () => {
    expect(E.isLeft(CreateApplicationCodec.decode({ propertyId: 'p', consentGiven: false }))).toBe(true);
  });

  it('rejects consentGiven missing', () => {
    expect(E.isLeft(CreateApplicationCodec.decode({ propertyId: 'p' }))).toBe(true);
  });
});

describe('CreatePropertyCodec', () => {
  const valid = {
    address: '100 King St W',
    city: 'Toronto',
    rent: 2200,
    bedrooms: 2,
    requiredDocs: ['GOVERNMENT_ID'],
  };

  it('decodes valid input', () => {
    expect(E.isRight(CreatePropertyCodec.decode(valid))).toBe(true);
  });

  it('rejects negative rent', () => {
    expect(E.isLeft(CreatePropertyCodec.decode({ ...valid, rent: -100 }))).toBe(true);
  });

  it('rejects zero bedrooms', () => {
    expect(E.isLeft(CreatePropertyCodec.decode({ ...valid, bedrooms: 0 }))).toBe(true);
  });

  it('rejects invalid document type', () => {
    expect(E.isLeft(CreatePropertyCodec.decode({ ...valid, requiredDocs: ['PASSPORT'] }))).toBe(true);
  });

  it('rejects missing city', () => {
    const { city: _city, ...withoutCity } = valid;
    expect(E.isLeft(CreatePropertyCodec.decode(withoutCity))).toBe(true);
  });
});
