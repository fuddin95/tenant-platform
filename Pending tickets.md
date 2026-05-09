# Pending Tickets

> **For automatic agents:** Pick the first `PENDING` ticket, set it to `IN_PROGRESS`, execute all steps from the plan, then mark it `DONE` before moving to the next.
> Implementation steps are in: `docs/superpowers/plans/2026-05-09-backend-implementation.md`
> Architecture spec is in: `docs/superpowers/specs/2026-04-29-backend-architecture-design.md`
> **Execute tickets in order — later tickets depend on earlier ones.**

---

## Phase A — Foundation

### TICKET-001 — Merge prerequisites + install dependencies + schema migration
**Status:** DONE  
**Plan section:** Phase A, Task 1  
**Summary:** Merge `feature/TEN-7-backend-scaffolding` and `feature/TEN-38-database-seed-script` into a new `feature/backend-implementation` branch. Install `jsonwebtoken`, `bcryptjs`, `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, `cookie-parser`, `cors` and their types. Add `passwordHash String` to `Landlord` and `Tenant` in Prisma schema. Run migration and regenerate client.  
**Files:** `packages/database/prisma/schema.prisma`, `apps/backend/package.json`  
**Done when:** `npm run db:generate` succeeds and `npx tsc --noEmit` in `apps/backend` passes.

---

### TICKET-002 — Add `UnauthorizedError` + Express type augmentations
**Status:** DONE  
**Plan section:** Phase A, Task 2  
**Summary:** Add `UnauthorizedError` (HTTP 401) to the error hierarchy in `types/errors.ts`. Create `types/express.d.ts` with `Role`, `JwtPayload`, and the `Express.Request.user` augmentation so `req.user` is typed throughout the app.  
**Files:** `apps/backend/src/types/errors.ts`, `apps/backend/src/types/express.d.ts`  
**Done when:** `errors.test.ts` passes including the new `UnauthorizedError` test.

---

### TICKET-003 — Env validation + JWT service + S3 service
**Status:** DONE  
**Plan section:** Phase A, Task 3  
**Summary:** Create `utils/env.ts` (Zod schema validates all required env vars at startup — fails fast if any missing). Create `utils/jwt.ts` (`makeJwtService(secret)` factory returning `{ sign, verify }`). Create `utils/s3.ts` (`makeS3Service(config)` factory returning `{ getPresignedPutUrl, getPresignedGetUrl }` using `@aws-sdk/client-s3` v3 with SSE-KMS).  
**Files:** `apps/backend/src/utils/env.ts`, `apps/backend/src/utils/jwt.ts`, `apps/backend/src/utils/s3.ts`  
**Done when:** `jwt.test.ts` passes (sign/verify round-trip + tamper detection).

---

### TICKET-004 — Repository interfaces (all 8)
**Status:** DONE  
**Plan section:** Phase A, Task 4  
**Summary:** Create all 8 repository interfaces in `repositories/interfaces/`. Each interface defines the exact method signatures services will depend on. `IAuditRepository` exposes `create()` only — no `update`, no `delete` enforced at the interface level.  
**Files:**
- `ILandlordRepository.ts`, `ITenantRepository.ts`
- `IPropertyRepository.ts`, `IApplicationRepository.ts`
- `IProfileRepository.ts`, `IGrantRepository.ts`
- `IAuditRepository.ts`, `INotificationRepository.ts`

**Done when:** `npx tsc --noEmit` in `apps/backend` passes with all interfaces present.

---

### TICKET-005 — `requireAuth` + `requireRole` middleware
**Status:** DONE  
**Plan section:** Phase A, Task 5  
**Summary:** Create `middleware/requireAuth.ts` (`makeRequireAuth(jwtService)` — reads `req.cookies.token`, verifies JWT, attaches `req.user`, calls `next(UnauthorizedError)` if missing/invalid). Create `middleware/requireRole.ts` (`requireRole(role)` — curried, checks `req.user.role`, calls `next(ForbiddenError)` if mismatched).  
**Files:** `apps/backend/src/middleware/requireAuth.ts`, `apps/backend/src/middleware/requireRole.ts`  
**Done when:** `middleware.test.ts` passes — 5 tests covering valid token, missing cookie, invalid token, role match, role mismatch.

---

## Phase B — Prisma Repositories

### TICKET-006 — Landlord + Tenant Prisma repositories
**Status:** PENDING  
**Plan section:** Phase B, Task 6  
**Summary:** Implement `makeLandlordRepository(db)` and `makeTenantRepository(db)` satisfying their interfaces. Methods: `findByEmail`, `findById`, `create`. `passwordHash` is stored but never selected in read responses that return to service layer — select it explicitly only in `findByEmail`/`findById` so auth service can compare it.  
**Files:** `apps/backend/src/repositories/prisma/landlord.repository.ts`, `apps/backend/src/repositories/prisma/tenant.repository.ts`  
**Done when:** Unit tests pass with a mocked `PrismaClient` asserting correct query construction.

---

### TICKET-007 — Property Prisma repository
**Status:** PENDING  
**Plan section:** Phase B, Task 7  
**Summary:** Implement `makePropertyRepository(db)` satisfying `IPropertyRepository`. `findByLandlord` includes `_count: { select: { applications: true } }`. `findBySlug` includes landlord name but excludes landlordId. `create` auto-generates `applySlug` via `cuid()` server-side — never from client input.  
**Files:** `apps/backend/src/repositories/prisma/property.repository.ts`  
**Done when:** Unit tests pass asserting ownership filtering and slug generation.

---

### TICKET-008 — Application Prisma repository
**Status:** PENDING  
**Plan section:** Phase B, Task 8  
**Summary:** Implement `makeApplicationRepository(db)` satisfying `IApplicationRepository`. `findByTenant` returns `ApplicationSummary[]` with computed `grantStatus` (ACTIVE/EXPIRED/REVOKED). `findByProperty` returns `ApplicationCard[]` with `profileCompletion` and `missingDocs`. `existsByTenantAndProperty` checks unique constraint before creation.  
**Files:** `apps/backend/src/repositories/prisma/application.repository.ts`  
**Done when:** Unit tests pass for tenant list, property list, duplicate check.

---

### TICKET-009 — Profile Prisma repository
**Status:** PENDING  
**Plan section:** Phase B, Task 9  
**Summary:** Implement `makeProfileRepository(db)` satisfying `IProfileRepository`. Key methods: `addDocument` (creates `Document` row), `softDeleteDocument` (sets `replacedAt = now()`), `findActiveDocTypes` (returns distinct `type` values where `replacedAt IS NULL`), `updateCompletion` (writes `completionPercent`).  
**Files:** `apps/backend/src/repositories/prisma/profile.repository.ts`  
**Done when:** Unit tests pass for soft-delete, active doc types query.

---

### TICKET-010 — Grant + Audit + Notification Prisma repositories
**Status:** PENDING  
**Plan section:** Phase B, Task 10  
**Summary:** Implement `makeGrantRepository(db)` (findByTenant with computed status, findById with full context, create, revoke). Implement `makeAuditRepository(db)` — `create()` only. Implement `makeNotificationRepository(db)` (findByRecipient, create, markRead). Audit repository must have no `update` or `delete` methods.  
**Files:** `apps/backend/src/repositories/prisma/grant.repository.ts`, `apps/backend/src/repositories/prisma/audit.repository.ts`, `apps/backend/src/repositories/prisma/notification.repository.ts`  
**Done when:** Unit tests pass; audit repository test confirms it has no update/delete methods.

---

## Phase C — Auth Domain

### TICKET-011 — Auth service + tests
**Status:** PENDING  
**Plan section:** Phase C, Task 11  
**Summary:** Implement `makeAuthService(landlordRepo, tenantRepo, profileRepo, jwt)`. `register`: bcrypt hashes password (cost 12), creates Landlord or Tenant row, auto-creates Profile shell if TENANT, returns signed JWT. `login`: checks Landlord table first then Tenant, bcrypt compares, returns signed JWT. `getMe`: looks up user by id+role. Never returns `passwordHash`.  
**Files:** `apps/backend/src/services/auth.service.ts`  
**Done when:** 6 unit tests pass — register landlord, register tenant (creates profile), duplicate email throws, login valid, login wrong password throws `UnauthorizedError`, login unknown email throws `UnauthorizedError`.

---

### TICKET-012 — Auth handlers + routes + server wiring
**Status:** PENDING  
**Plan section:** Phase C, Task 12  
**Summary:** Implement `makeAuthHandlers(service)` returning `{ register, login, logout, me }`. Each handler parses + validates request body (Zod), calls service, sets/clears httpOnly cookie (`token`, `HttpOnly`, `Secure`, `SameSite=strict`, 7-day `maxAge`). Create `routes/auth.ts` mounting the 4 handlers. Update `server.ts` to add `cookieParser()`, `cors({ origin: env.FRONTEND_URL, credentials: true })`, and mount auth router. Wire `requireAuth` into `/me` route only.  
**Files:** `apps/backend/src/handlers/auth.handlers.ts`, `apps/backend/src/routes/auth.ts`, `apps/backend/src/server.ts`  
**Done when:** Handler tests pass using supertest; `POST /api/auth/register` returns `{ id, email, name, role }` and sets cookie; `POST /api/auth/logout` clears cookie.

---

## Phase D — Properties Domain

### TICKET-013 — Property service + tests
**Status:** PENDING  
**Plan section:** Phase D, Task 13  
**Summary:** Implement `makePropertyService(repo)`. `list(landlordId)` returns landlord's properties with `applicationCount`. `create(landlordId, data)` delegates to repo (slug generated in repo). `getById(id, landlordId)` throws `ForbiddenError` if `property.landlordId !== landlordId`. `update(id, landlordId, data)` same ownership check. `getApplications(propertyId, landlordId)` same check then returns `ApplicationCard[]`. `getBySlug(slug)` returns public fields — no auth check.  
**Files:** `apps/backend/src/services/property.service.ts`  
**Done when:** 6 unit tests pass — list filters by landlord, getById ownership check, update ownership check, getBySlug returns public shape.

---

### TICKET-014 — Property handlers + routes
**Status:** PENDING  
**Plan section:** Phase D, Task 14  
**Summary:** Implement `makePropertyHandlers(service)` returning `{ list, create, getById, update, getApplications }`. Validate `POST` body with Zod (`address`, `city`, `rent`, `bedrooms`, `requiredDocs`). Validate `PATCH` body (all fields optional). Create `routes/properties.ts` with `withLandlordAuth` applied to all private routes. Add public `GET /api/apply/:slug` (no auth).  
**Files:** `apps/backend/src/handlers/property.handlers.ts`, `apps/backend/src/routes/properties.ts`  
**Done when:** Supertest tests pass — 6 routes, ownership 403, 404 on missing slug.

---

## Phase E — Applications Domain

### TICKET-015 — Application service + tests
**Status:** PENDING  
**Plan section:** Phase E, Task 15  
**Summary:** Implement `makeApplicationService(appRepo, grantRepo, auditRepo, notifRepo)`. `submit(tenantId, propertyId, allowedDocs)` runs full side-effect chain: duplicate check → create Application → create AccessGrant (expires in 7 days) → write `APPLICATION_SUBMITTED` AuditEvent → write `ACCESS_GRANTED` AuditEvent → create `APPLICATION_RECEIVED` Notification (landlord) → create `MISSING_DOCUMENTS` Notification (tenant) if any required docs absent. `listByTenant(tenantId)` omits internal `status`. `getById` returns role-shaped response.  
**Files:** `apps/backend/src/services/application.service.ts`  
**Done when:** 5 unit tests pass — submit creates all records, submit throws on duplicate, submit creates missing-docs notification when docs absent, tenant list omits status, landlord response includes status.

---

### TICKET-016 — Application handlers + routes
**Status:** PENDING  
**Plan section:** Phase E, Task 16  
**Summary:** Implement `makeApplicationHandlers(appService, propService)` — handler for `POST /api/applications` resolves `applySlug` to `propertyId` via `propService.getBySlug()` before calling `appService.submit()`. Validate request body (io-ts `ConsentTrue` brand for `consentGiven`). Create `routes/applications.ts` — TENANT auth on submit/list, both roles on getById, LANDLORD auth on status update.  
**Files:** `apps/backend/src/handlers/application.handlers.ts`, `apps/backend/src/routes/applications.ts`  
**Done when:** Supertest tests pass — submit returns `{ applicationId, grantId }`, duplicate returns 409, missing consent returns 400.

---

## Phase F — Profile Domain

### TICKET-017 — Profile service + tests
**Status:** PENDING  
**Plan section:** Phase F, Task 17  
**Summary:** Implement `makeProfileService(profileRepo, s3)`. `getByTenantId` returns profile without `storageKey` in documents. `getUploadUrl(tenantId, type, fileName, mimeType, sizeBytes)` generates an S3 key (`profiles/{tenantId}/{type}/{uuid}`), pre-creates Document row, returns `{ uploadUrl, documentId }`. `confirmUpload(documentId, tenantId)` verifies ownership, recalculates and saves `completionPercent`. `deleteDocument(documentId, tenantId)` ownership check then soft-delete + recalculate. `addReference` / `deleteReference` with ownership checks. `computeCompletion` pure function: unique active doc types + `REFERENCE_CONTACT` covered if reference count > 0, out of 6 total types.  
**Files:** `apps/backend/src/services/profile.service.ts`  
**Done when:** 7 unit tests pass — getByTenantId strips storageKey, getUploadUrl returns correct key format, confirmUpload recalculates completion, deleteDocument soft-deletes, completion formula covers 0%/partial/100%.

---

### TICKET-018 — Profile handlers + routes
**Status:** PENDING  
**Plan section:** Phase F, Task 18  
**Summary:** Implement `makeProfileHandlers(service)`. Validate upload-url request (type must be a valid `DocumentType` enum value, mimeType allowlist: `image/jpeg`, `image/png`, `application/pdf`). Create `routes/profile.ts` with `withTenantAuth` on all routes.  
**Files:** `apps/backend/src/handlers/profile.handlers.ts`, `apps/backend/src/routes/profile.ts`  
**Done when:** Supertest tests pass — 6 routes, invalid doc type returns 400, invalid mimeType returns 400.

---

## Phase G — Access Control

### TICKET-019 — Grant service + tests + routes
**Status:** PENDING  
**Plan section:** Phase G, Task 19  
**Summary:** Implement `makeGrantService(grantRepo, auditRepo)`. `listByTenant(tenantId)` returns grants with computed `status` (ACTIVE/EXPIRED/REVOKED). `revoke(grantId, tenantId)` verifies `grant.application.tenantId === tenantId` (throws `ForbiddenError` if not), sets `revokedAt`, writes `ACCESS_REVOKED` AuditEvent. Create `routes/grants.ts` with `withTenantAuth`.  
**Files:** `apps/backend/src/services/grant.service.ts`, `apps/backend/src/handlers/grant.handlers.ts`, `apps/backend/src/routes/grants.ts`  
**Done when:** 3 unit tests pass — list includes status, revoke writes AuditEvent, revoke throws ForbiddenError if wrong tenant.

---

### TICKET-020 — Document service + tests + routes
**Status:** PENDING  
**Plan section:** Phase G, Task 20  
**Summary:** Implement `makeDocumentService(profileRepo, grantRepo, auditRepo, s3)`. `getViewUrl(documentId, grantId, landlordId)` runs the full 7-step constitution guard chain: (1) fetch grant, (2) `checkGrantActive` — throws `ForbiddenError` if revoked or expired, (3) verify `document.type` in `grant.allowedDocs`, (4) verify `grant.application.property.landlordId === landlordId`, (5) generate presigned GET URL (max 1hr), (6) write `DOCUMENT_VIEWED` AuditEvent with `metadata: { documentType }`. Returns `{ url, expiresAt }`.  
**Files:** `apps/backend/src/services/document.service.ts`, `apps/backend/src/handlers/document.handlers.ts`, `apps/backend/src/routes/documents.ts`  
**Done when:** 6 unit tests pass — revoked grant throws, expired grant throws, wrong doc type throws, wrong landlord throws, success returns presigned URL + writes AuditEvent.

---

### TICKET-021 — Notification service + routes
**Status:** PENDING  
**Plan section:** Phase G, Task 21  
**Summary:** Implement `makeNotificationService(notifRepo)`. `listForRecipient(recipientId)` returns notifications filtered to that recipient. `markRead(notificationId, recipientId)` verifies `notification.recipientId === recipientId` (throws `ForbiddenError` if not), then marks read. Create `routes/notifications.ts` with `requireAuth` (both roles can receive notifications).  
**Files:** `apps/backend/src/services/notification.service.ts`, `apps/backend/src/handlers/notification.handlers.ts`, `apps/backend/src/routes/notifications.ts`  
**Done when:** 2 unit tests pass — list filters to recipient, markRead ownership check.

---

## Phase H — Wiring

### TICKET-022 — Composition root + route mounting
**Status:** PENDING  
**Plan section:** Phase H, Task 22  
**Summary:** Rewrite `apps/backend/src/index.ts` as the full DI composition root: instantiate all repositories → services → pass to route factories → mount on app. Update `apps/backend/src/server.ts` to accept an array of routers, add `cookieParser()` and `cors({ origin, credentials: true })` globally. Move `requestLogger` and `errorHandler` from old `middleware.ts` to `middleware/requestLogger.ts` and `middleware/errorHandler.ts`. Wire `makeRequireAuth(jwt)` as an injectable factory passed into routes that need it.  
**Files:** `apps/backend/src/index.ts`, `apps/backend/src/server.ts`, `apps/backend/src/routes/index.ts`, `apps/backend/src/middleware/requestLogger.ts`, `apps/backend/src/middleware/errorHandler.ts`  
**Done when:** `npm run dev` in `apps/backend` starts without errors; `GET /api/health` returns `{ status: "ok" }`; `POST /api/auth/register` works end-to-end.

---

## Phase I — Next.js Frontend Cleanup

### TICKET-023 — Remove NextAuth + rewire Next.js to Express backend
**Status:** PENDING  
**Plan section:** Phase I, Task 23  
**Summary:** Remove NextAuth from `apps/web`. Delete `apps/web/src/lib/auth.ts` and `apps/web/src/auth.ts`. Replace `apps/web/src/middleware.ts` role-guard logic with cookie-presence check only (if `token` cookie absent → redirect to `/auth/signin`). Rewrite `apps/web/src/lib/api.ts` as a `fetch` wrapper with `credentials: 'include'` and base URL pointing to the Express backend. Replace `apps/web/src/lib/actions/auth.ts` NextAuth calls with `POST /api/auth/login` and `POST /api/auth/logout` calls to Express. Uninstall `next-auth` from `apps/web`.  
**Files:** `apps/web/src/middleware.ts`, `apps/web/src/lib/api.ts`, `apps/web/src/lib/actions/auth.ts`  
**Done when:** `npm run typecheck` passes in `apps/web`; signin form posts to Express; signout clears cookie; protected routes redirect unauthenticated users.

---

## Ticket Summary

| Ticket | Phase | Status |
|--------|-------|--------|
| TICKET-001 | A — Foundation | DONE |
| TICKET-002 | A — Foundation | PENDING |
| TICKET-003 | A — Foundation | PENDING |
| TICKET-004 | A — Foundation | PENDING |
| TICKET-005 | A — Foundation | PENDING |
| TICKET-006 | B — Repositories | PENDING |
| TICKET-007 | B — Repositories | PENDING |
| TICKET-008 | B — Repositories | PENDING |
| TICKET-009 | B — Repositories | PENDING |
| TICKET-010 | B — Repositories | PENDING |
| TICKET-011 | C — Auth | PENDING |
| TICKET-012 | C — Auth | PENDING |
| TICKET-013 | D — Properties | PENDING |
| TICKET-014 | D — Properties | PENDING |
| TICKET-015 | E — Applications | PENDING |
| TICKET-016 | E — Applications | PENDING |
| TICKET-017 | F — Profile | PENDING |
| TICKET-018 | F — Profile | PENDING |
| TICKET-019 | G — Access Control | PENDING |
| TICKET-020 | G — Access Control | PENDING |
| TICKET-021 | G — Access Control | PENDING |
| TICKET-022 | H — Wiring | PENDING |
| TICKET-023 | I — Next.js Cleanup | PENDING |
