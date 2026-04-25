import * as E from 'fp-ts/Either';
import * as t from 'io-ts';
import { PropertyCardCodec, TenantProfileCodec } from '@/types/codecs';
import type { PropertyCard, TenantProfile } from '@/types/codecs';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

const decodeResponse = async <A>(
  codec: t.Decoder<unknown, A>,
  url: string
): Promise<A> => {
  const response = await fetch(`${API_URL}${url}`);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  const json: unknown = await response.json();
  const decoded = codec.decode(json);
  if (E.isLeft(decoded)) {
    throw new Error('Unexpected response shape from server');
  }
  return decoded.right;
};

export const fetchProperties = (): Promise<readonly PropertyCard[]> =>
  decodeResponse(t.array(PropertyCardCodec), '/api/properties');

export const fetchTenantProfile = (tenantId: string): Promise<TenantProfile> =>
  decodeResponse(TenantProfileCodec, `/api/tenants/${tenantId}/profile`);
