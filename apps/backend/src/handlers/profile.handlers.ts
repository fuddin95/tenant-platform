import { z } from 'zod';
import type { RequestHandler } from 'express';
import type { ProfileService } from '../services/profile.service';
import { asyncHandler } from '../utils/asyncHandler';

const AddReferenceSchema = z.object({
  name: z.string().min(1),
  relationship: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional(),
});

export type ProfileHandlers = {
  get: RequestHandler;
  addReference: RequestHandler;
  removeReference: RequestHandler;
};

export const makeProfileHandlers = (service: ProfileService): ProfileHandlers => ({
  get: asyncHandler(async (req, res) => {
    const profile = await service.getOrCreate(req.user.sub);
    res.json(profile);
  }),

  addReference: asyncHandler(async (req, res) => {
    const data = AddReferenceSchema.parse(req.body);
    const reference = await service.addReference(req.user.sub, data);
    res.status(201).json(reference);
  }),

  removeReference: asyncHandler(async (req, res) => {
    await service.removeReference(req.user.sub, req.params.id);
    res.status(204).send();
  }),
});
