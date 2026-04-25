import * as t from 'io-ts';

export const PropertyStatusCodec = t.union([
  t.literal('ACTIVE'), t.literal('FILLED'), t.literal('INACTIVE'),
]);

export const PropertyCardCodec = t.type({
  id: t.string,
  address: t.string,
  city: t.string,
  rent: t.number,
  bedrooms: t.number,
  status: PropertyStatusCodec,
  applySlug: t.string,
});
export type PropertyCard = t.TypeOf<typeof PropertyCardCodec>;

export const ApplicationStatusCodec = t.union([
  t.literal('PENDING'), t.literal('REVIEWING'),
  t.literal('SHORTLISTED'), t.literal('DECLINED'),
]);
export type ApplicationStatus = t.TypeOf<typeof ApplicationStatusCodec>;

export const ApplicationSummaryCodec = t.type({
  id: t.string,
  status: ApplicationStatusCodec,
  submittedAt: t.string,
  propertyId: t.string,
});
export type ApplicationSummary = t.TypeOf<typeof ApplicationSummaryCodec>;

export const DocumentTypeCodec = t.union([
  t.literal('GOVERNMENT_ID'), t.literal('PROOF_OF_INCOME'),
  t.literal('PAY_STUB'), t.literal('EMPLOYMENT_LETTER'),
  t.literal('REFERENCE_CONTACT'), t.literal('CREDIT_REPORT'),
]);
export type DocumentType = t.TypeOf<typeof DocumentTypeCodec>;

export const AccessGrantCodec = t.type({
  id: t.string,
  grantedAt: t.string,
  expiresAt: t.string,
  revokedAt: t.union([t.string, t.null]),
  allowedDocs: t.array(DocumentTypeCodec),
});
export type AccessGrant = t.TypeOf<typeof AccessGrantCodec>;
