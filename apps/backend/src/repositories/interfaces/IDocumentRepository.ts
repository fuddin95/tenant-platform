import type { Document } from '@rental-trust/database';

export interface IDocumentRepository {
  findById(id: string): Promise<Document | null>;
  findByProfileId(profileId: string): Promise<Document[]>;
}
