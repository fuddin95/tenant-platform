import * as t from 'io-ts';
import { DocumentTypeCodec } from '@rental-trust/types';

// Refinement: string must be non-empty
const NonEmptyString = t.brand(
  t.string,
  (s): s is t.Branded<string, { readonly NonEmpty: unique symbol }> => s.length > 0,
  'NonEmpty'
);

// Refinement: number must be positive
const PositiveNumber = t.brand(
  t.number,
  (n): n is t.Branded<number, { readonly Positive: unique symbol }> => n > 0,
  'Positive'
);

// Refinement: boolean must be true (explicit consent required)
const ConsentTrue = t.brand(
  t.boolean,
  (b): b is t.Branded<boolean, { readonly ConsentGiven: unique symbol }> => b === true,
  'ConsentGiven'
);

export const CreateApplicationCodec = t.type({
  propertyId: NonEmptyString,
  consentGiven: ConsentTrue,
});
export type CreateApplicationInput = t.TypeOf<typeof CreateApplicationCodec>;

export const CreatePropertyCodec = t.type({
  address: NonEmptyString,
  city: NonEmptyString,
  rent: PositiveNumber,
  bedrooms: PositiveNumber,
  requiredDocs: t.array(DocumentTypeCodec),
});
export type CreatePropertyInput = t.TypeOf<typeof CreatePropertyCodec>;
