import type { Profile, Document, TenantReference, DocumentType } from '@rental-trust/database';

export type CreateDocumentData = {
  profileId: string;
  type: DocumentType;
  storageKey: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
};

export type CreateReferenceData = {
  profileId: string;
  name: string;
  relationship: string;
  phone?: string;
  email?: string;
};

export type ProfileWithDocs = Profile & {
  documents: Document[];
  references: TenantReference[];
};

export interface IProfileRepository {
  findByTenantId(tenantId: string): Promise<ProfileWithDocs | null>;
  create(tenantId: string): Promise<Profile>;
  updateCompletion(profileId: string, percent: number): Promise<void>;
  addDocument(data: CreateDocumentData): Promise<Document>;
  findDocumentById(id: string): Promise<Document | null>;
  softDeleteDocument(id: string): Promise<void>;
  findActiveDocTypes(profileId: string): Promise<DocumentType[]>;
  countReferences(profileId: string): Promise<number>;
  addReference(data: CreateReferenceData): Promise<TenantReference>;
  findReferenceById(id: string): Promise<TenantReference | null>;
  deleteReference(id: string): Promise<void>;
}
