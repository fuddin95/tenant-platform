import { z } from 'zod';
import type { RequestHandler } from 'express';
import { DocumentType } from '@rental-trust/database';
import type { GrantService } from '../services/grant.service';
import { asyncHandler } from '../utils/asyncHandler';

const CreateGrantSchema = z.object({
  allowedDocs: z.array(z.nativeEnum(DocumentType)),
  expiresAt: z.string().datetime(),
});

export type GrantHandlers = {
  list: RequestHandler;
  create: RequestHandler;
  revoke: RequestHandler;
};

export const makeGrantHandlers = (service: GrantService): GrantHandlers => ({
  list: asyncHandler(async (req, res) => {
    const grants = await service.list(req.user.sub);
    res.json(grants);
  }),

  create: asyncHandler(async (req, res) => {
    const data = CreateGrantSchema.parse(req.body);
    const grant = await service.create(req.user.sub, req.params.applicationId, {
      allowedDocs: data.allowedDocs,
      expiresAt: new Date(data.expiresAt),
    });
    res.status(201).json(grant);
  }),

  revoke: asyncHandler(async (req, res) => {
    await service.revoke(req.user.sub, req.params.grantId);
    res.status(204).end();
  }),
});
