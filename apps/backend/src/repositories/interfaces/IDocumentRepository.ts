import type { Document, DocumentType } from '@rental-trust/database';

export type CreateDocumentData = {
  profileId: string;
  type: DocumentType;
  storageKey: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
};

export interface IDocumentRepository {
  findById(id: string): Promise<Document | null>;
  findByProfileId(profileId: string): Promise<Document[]>;
  addDocument(data: CreateDocumentData): Promise<Document>;
  softDeleteDocument(id: string): Promise<void>;
  findActiveDocTypes(profileId: string): Promise<DocumentType[]>;
}
