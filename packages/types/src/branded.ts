const TenantIdBrand = Symbol('TenantId');
export type TenantId = string & { readonly [TenantIdBrand]: true };
export const TenantId = (id: string): TenantId => {
  if (!id || id.length === 0) throw new Error('Invalid TenantId');
  return id as TenantId;
};

const LandlordIdBrand = Symbol('LandlordId');
export type LandlordId = string & { readonly [LandlordIdBrand]: true };
export const LandlordId = (id: string): LandlordId => {
  if (!id || id.length === 0) throw new Error('Invalid LandlordId');
  return id as LandlordId;
};

const PropertyIdBrand = Symbol('PropertyId');
export type PropertyId = string & { readonly [PropertyIdBrand]: true };
export const PropertyId = (id: string): PropertyId => {
  if (!id || id.length === 0) throw new Error('Invalid PropertyId');
  return id as PropertyId;
};

const ProfileIdBrand = Symbol('ProfileId');
export type ProfileId = string & { readonly [ProfileIdBrand]: true };
export const ProfileId = (id: string): ProfileId => {
  if (!id || id.length === 0) throw new Error('Invalid ProfileId');
  return id as ProfileId;
};

const DocumentIdBrand = Symbol('DocumentId');
export type DocumentId = string & { readonly [DocumentIdBrand]: true };
export const DocumentId = (id: string): DocumentId => {
  if (!id || id.length === 0) throw new Error('Invalid DocumentId');
  return id as DocumentId;
};

const ApplicationIdBrand = Symbol('ApplicationId');
export type ApplicationId = string & { readonly [ApplicationIdBrand]: true };
export const ApplicationId = (id: string): ApplicationId => {
  if (!id || id.length === 0) throw new Error('Invalid ApplicationId');
  return id as ApplicationId;
};

const AccessGrantIdBrand = Symbol('AccessGrantId');
export type AccessGrantId = string & { readonly [AccessGrantIdBrand]: true };
export const AccessGrantId = (id: string): AccessGrantId => {
  if (!id || id.length === 0) throw new Error('Invalid AccessGrantId');
  return id as AccessGrantId;
};
