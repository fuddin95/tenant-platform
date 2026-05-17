import type { RequestHandler } from 'express';
import { createApp } from './server';
import { env } from './utils/env';
import { db } from './db/client';
import { makeJwtService } from './utils/jwt';
import { makeS3Service } from './utils/s3';

// ── Repositories ─────────────────────────────────────────────────────────────
import { makeLandlordRepository } from './repositories/prisma/landlord.repository';
import { makeTenantRepository } from './repositories/prisma/tenant.repository';
import { makeProfileRepository } from './repositories/prisma/profile.repository';
import { makePropertyRepository } from './repositories/prisma/property.repository';
import { makeApplicationRepository } from './repositories/prisma/application.repository';
import { makeGrantRepository } from './repositories/prisma/grant.repository';
import { makeAuditRepository } from './repositories/prisma/audit.repository';
import { makeNotificationRepository } from './repositories/prisma/notification.repository';
import { makeDocumentRepository } from './repositories/prisma/document.repository';
import { makeReferenceRepository } from './repositories/prisma/reference.repository';

// ── Services ──────────────────────────────────────────────────────────────────
import { makeAuthService } from './services/auth.service';
import { makePropertyService } from './services/property.service';
import { makeApplicationService } from './services/application.service';
import { makeGrantService } from './services/grant.service';
import { makeDocumentService } from './services/document.service';
import { makeProfileService } from './services/profile.service';
import { makeNotificationService } from './services/notification.service';

// ── Handlers ──────────────────────────────────────────────────────────────────
import { makeAuthHandlers } from './handlers/auth.handlers';
import { makePropertyHandlers } from './handlers/property.handlers';
import { makeApplicationHandlers } from './handlers/application.handlers';
import { makeGrantHandlers } from './handlers/grant.handlers';
import { makeDocumentHandlers } from './handlers/document.handlers';
import { makeProfileHandlers } from './handlers/profile.handlers';
import { makeNotificationHandlers } from './handlers/notification.handlers';

// ── Routers ───────────────────────────────────────────────────────────────────
import { makeAuthRouter } from './routes/auth';
import { makePropertyRouter } from './routes/properties';
import { makeApplicationRouter } from './routes/applications';
import { makeGrantRouter } from './routes/grants';
import { makeDocumentRouter } from './routes/documents';
import { makeProfileRouter } from './routes/profile';
import { makeNotificationRouter } from './routes/notifications';

// ── Middleware ────────────────────────────────────────────────────────────────
import { makeRequireAuth } from './middleware/requireAuth';
import { requireRole } from './middleware/requireRole';

// ── Wire up ───────────────────────────────────────────────────────────────────

const jwt = makeJwtService(env.JWT_SECRET);
const s3 = makeS3Service({
  region: env.AWS_REGION,
  bucket: env.AWS_S3_BUCKET,
  kmsKeyId: env.AWS_KMS_KEY_ID,
});

const landlordRepo = makeLandlordRepository(db);
const tenantRepo = makeTenantRepository(db);
const profileRepo = makeProfileRepository(db);
const propRepo = makePropertyRepository(db);
const appRepo = makeApplicationRepository(db);
const grantRepo = makeGrantRepository(db);
const auditRepo = makeAuditRepository(db);
const notifRepo = makeNotificationRepository(db);
const documentRepo = makeDocumentRepository(db);
const referenceRepo = makeReferenceRepository(db);

const authService = makeAuthService(landlordRepo, tenantRepo, profileRepo, jwt);
const propertyService = makePropertyService(propRepo, appRepo);
const appService = makeApplicationService(appRepo, grantRepo, auditRepo, notifRepo, propRepo);
const grantService = makeGrantService(grantRepo, auditRepo, db);
const documentService = makeDocumentService(profileRepo, documentRepo, grantRepo, auditRepo, s3);
const profileService = makeProfileService(profileRepo, referenceRepo);
const notifService = makeNotificationService(notifRepo);

const requireAuth = makeRequireAuth(jwt);

const withTenantAuth: RequestHandler = (req, res, next) =>
  requireAuth(req, res, (err?: unknown) => {
    if (err) return next(err);
    requireRole('TENANT')(req, res, next);
  });

const withLandlordAuth: RequestHandler = (req, res, next) =>
  requireAuth(req, res, (err?: unknown) => {
    if (err) return next(err);
    requireRole('LANDLORD')(req, res, next);
  });

const authRouter = makeAuthRouter(makeAuthHandlers(authService), requireAuth);
const propertyRouter = makePropertyRouter(makePropertyHandlers(propertyService), withLandlordAuth);
const appRouter = makeApplicationRouter(
  makeApplicationHandlers(appService, propertyService),
  requireAuth,
  withTenantAuth,
  withLandlordAuth,
);
const grantRouter = makeGrantRouter(makeGrantHandlers(grantService), withTenantAuth);
const documentRouter = makeDocumentRouter(makeDocumentHandlers(documentService), withTenantAuth, withLandlordAuth);
const profileRouter = makeProfileRouter(makeProfileHandlers(profileService), withTenantAuth);
const notifRouter = makeNotificationRouter(makeNotificationHandlers(notifService), requireAuth);

const app = createApp([
  { path: '/api/auth', router: authRouter },
  { path: '/api/properties', router: propertyRouter },
  { path: '/api/applications', router: appRouter },
  { path: '/api', router: grantRouter },
  { path: '/api/documents', router: documentRouter },
  { path: '/api/profile', router: profileRouter },
  { path: '/api/notifications', router: notifRouter },
]);

app.listen(env.PORT, () => {
  console.warn(`Backend listening on port ${env.PORT}`);
});
