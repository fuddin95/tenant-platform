import * as t from 'io-ts';

export const PropertyCardCodec = t.type({
  id: t.string,
  address: t.string,
  rent: t.number,
  bedrooms: t.number,
  applySlug: t.string,
});
export type PropertyCard = t.TypeOf<typeof PropertyCardCodec>;

export const ApplicationStatusCodec = t.union([
  t.literal('PENDING'),
  t.literal('REVIEWING'),
  t.literal('SHORTLISTED'),
  t.literal('DECLINED'),
]);
export type ApplicationStatus = t.TypeOf<typeof ApplicationStatusCodec>;

export const ApplicationSummaryCodec = t.type({
  id: t.string,
  tenantId: t.string,
  propertyId: t.string,
  status: ApplicationStatusCodec,
  submittedAt: t.string,
});
export type ApplicationSummary = t.TypeOf<typeof ApplicationSummaryCodec>;

export const DocumentTypeCodec = t.union([
  t.literal('GOVERNMENT_ID'),
  t.literal('PROOF_OF_INCOME'),
  t.literal('EMPLOYMENT_LETTER'),
  t.literal('PAY_STUB'),
  t.literal('CREDIT_REPORT'),
]);
export type DocumentType = t.TypeOf<typeof DocumentTypeCodec>;

export const TenantProfileCodec = t.type({
  id: t.string,
  tenantId: t.string,
  completionPercent: t.number,
  documents: t.array(
    t.type({
      id: t.string,
      type: DocumentTypeCodec,
      uploadedAt: t.string,
    })
  ),
});
export type TenantProfile = t.TypeOf<typeof TenantProfileCodec>;

export const ApiErrorCodec = t.type({
  error: t.string,
});
export type ApiError = t.TypeOf<typeof ApiErrorCodec>;
