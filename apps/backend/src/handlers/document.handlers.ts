import { z } from 'zod';
import { DocumentType } from '@rental-trust/database';
import type { RequestHandler } from 'express';
import type { DocumentService } from '../services/document.service';
import { asyncHandler } from '../utils/asyncHandler';
import { ValidationError } from '../types/errors';

// Allowed MIME types for document uploads — allowlist per TEN-67
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'application/pdf'] as const;

const UploadUrlSchema = z.object({
  type: z.nativeEnum(DocumentType),
  fileName: z.string().min(1),
  mimeType: z.enum(ALLOWED_MIME_TYPES),
  sizeBytes: z.number().int().positive(),
});

const GetViewUrlQuerySchema = z.object({
  grantId: z.string().min(1),
});

export type DocumentHandlers = {
  getUploadUrl: RequestHandler;
  getViewUrl: RequestHandler;
};

export const makeDocumentHandlers = (service: DocumentService): DocumentHandlers => ({
  getUploadUrl: asyncHandler(async (req, res) => {
    const input = UploadUrlSchema.parse(req.body);
    const result = await service.getUploadUrl(
      req.user.sub,
      input.type,
      input.fileName,
      input.mimeType,
      input.sizeBytes,
    );
    res.json(result);
  }),

  getViewUrl: asyncHandler(async (req, res) => {
    const query = GetViewUrlQuerySchema.safeParse(req.query);
    if (!query.success) {
      throw new ValidationError('grantId query parameter is required');
    }
    const result = await service.getViewUrl(req.params.documentId, query.data.grantId, req.user.sub);
    res.json(result);
  }),
});
