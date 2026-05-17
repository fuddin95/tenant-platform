import { z } from 'zod';
import type { RequestHandler } from 'express';
import { ApplicationStatus, DocumentType } from '@rental-trust/database';
import type { ApplicationService } from '../services/application.service';
import type { PropertyService } from '../services/property.service';
import { asyncHandler } from '../utils/asyncHandler';

const SubmitSchema = z.object({
  applySlug: z.string().min(1),
  allowedDocs: z.array(z.nativeEnum(DocumentType)),
  requiredDocs: z.array(z.nativeEnum(DocumentType)),
  consentGiven: z.literal(true, { errorMap: () => ({ message: 'Consent is required' }) }),
});

const UpdateStatusSchema = z.object({
  status: z.nativeEnum(ApplicationStatus),
});

export type ApplicationHandlers = {
  submit: RequestHandler;
  listByTenant: RequestHandler;
  getById: RequestHandler;
  updateStatus: RequestHandler;
};

export const makeApplicationHandlers = (
  appService: ApplicationService,
  propService: PropertyService,
): ApplicationHandlers => ({
  submit: asyncHandler(async (req, res) => {
    const { applySlug, allowedDocs, requiredDocs, consentGiven: _consent } = SubmitSchema.parse(req.body);
    const property = await propService.getBySlug(applySlug);
    const result = await appService.submit({
      tenantId: req.user.sub,
      propertyId: property.id,
      landlordId: property.landlordId,
      allowedDocs,
      requiredDocs,
    });
    res.status(201).json(result);
  }),

  listByTenant: asyncHandler(async (req, res) => {
    const applications = await appService.listByTenant(req.user.sub);
    res.json(applications);
  }),

  getById: asyncHandler(async (req, res) => {
    const application = await appService.getById(req.params.id, req.user.role);
    res.json(application);
  }),

  updateStatus: asyncHandler(async (req, res) => {
    const { status } = UpdateStatusSchema.parse(req.body);
    const updated = await appService.updateStatus(req.params.id, req.user.sub, status);
    res.json(updated);
  }),
});
