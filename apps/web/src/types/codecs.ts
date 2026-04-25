export * from '@rental-trust/types';
import * as t from 'io-ts';

// FE-only codecs
export const TenantProfileCodec = t.type({
  id: t.string,
  tenantId: t.string,
  completionPercent: t.number,
  documents: t.array(
    t.type({
      id: t.string,
      type: t.union([
        t.literal('GOVERNMENT_ID'), t.literal('PROOF_OF_INCOME'),
        t.literal('PAY_STUB'), t.literal('EMPLOYMENT_LETTER'),
        t.literal('REFERENCE_CONTACT'), t.literal('CREDIT_REPORT'),
      ]),
      uploadedAt: t.string,
    })
  ),
});
export type TenantProfile = t.TypeOf<typeof TenantProfileCodec>;

export const ApiErrorCodec = t.type({ error: t.string });
export type ApiError = t.TypeOf<typeof ApiErrorCodec>;
