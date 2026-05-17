import { z } from 'zod';
import type { RequestHandler } from 'express';
import { DocumentType, PropertyStatus } from '@rental-trust/database';
import type { PropertyService } from '../services/property.service';
import { asyncHandler } from '../utils/asyncHandler';

const CreatePropertySchema = z.object({
  address: z.string().min(1),
  unitNumber: z.string().optional(),
  city: z.string().min(1),
  rent: z.number().positive(),
  bedrooms: z.number().int().positive(),
  requiredDocs: z.array(z.nativeEnum(DocumentType)),
});

const UpdatePropertySchema = CreatePropertySchema.partial().extend({
  status: z.nativeEnum(PropertyStatus).optional(),
});

export type PropertyHandlers = {
  list: RequestHandler;
  create: RequestHandler;
  getById: RequestHandler;
  update: RequestHandler;
  getApplications: RequestHandler;
  getBySlug: RequestHandler;
};

export const makePropertyHandlers = (service: PropertyService): PropertyHandlers => ({
  list: asyncHandler(async (req, res) => {
    const properties = await service.list(req.user.sub);
    res.json(properties);
  }),

  create: asyncHandler(async (req, res) => {
    const data = CreatePropertySchema.parse(req.body);
    const property = await service.create(req.user.sub, data);
    res.status(201).json(property);
  }),

  getById: asyncHandler(async (req, res) => {
    const property = await service.getById(req.params.id, req.user.sub);
    res.json(property);
  }),

  update: asyncHandler(async (req, res) => {
    const data = UpdatePropertySchema.parse(req.body);
    const property = await service.update(req.params.id, req.user.sub, data);
    res.json(property);
  }),

  getApplications: asyncHandler(async (req, res) => {
    const cards = await service.getApplications(req.params.id, req.user.sub);
    res.json(cards);
  }),

  getBySlug: asyncHandler(async (req, res) => {
    const { id: _id, landlordId: _lid, ...publicView } = await service.getBySlug(req.params.slug);
    res.json(publicView);
  }),
});
