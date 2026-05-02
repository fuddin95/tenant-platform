# Backend Architecture Design
**Date:** 2026-04-29  
**Status:** Approved  
**Author:** Fahad + Claude  
**Scope:** Express backend (`apps/backend`) — auth, REST API, S3, middleware

---

## 1. Architectural Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| API layer | Separate Express backend (`apps/backend`) | Single source of truth for auth, business logic, S3; Next.js is a thin rendering client |
| Auth strategy | Express owns JWT end-to-end | Remove NextAuth from `apps/web`; Express handles register/login/logout |
| Token transport | httpOnly cookie | `Set-Cookie: token=...; HttpOnly; Secure; SameSite=Strict` — token never accessible to JS, XSS-safe |
| S3 / document operations | Express only | All presigned URL generation, access-guard checks, and AuditEvent writes live in Express; never in Next.js |
| Internal organisation | Domain modules (flat) | `routes/auth.ts`, `routes/properties.ts`, etc. Shallow nesting where semantically justified |
| Design paradigm | Functional + SOLID + DI | Factory functions, currying, composition root, repository/service layers |

---

## 2. Strict Coding Guidelines (Non-Negotiable)

These extend the rules in `CLAUDE.md` and apply specifically to `apps/backend`.

### 2.1 No Classes — Factory Functions Only
```typescript
// ✅ CORRECT
const makePropertyService = (repo: IPropertyRepository): PropertyService => ({
  listByLandlord: (landlordId) => repo.findByLandlord(landlordId),
  create: (data) => repo.create(data),
});

// ❌ WRONG
class PropertyService {
  constructor(private repo: IPropertyRepository) {}
}
```

### 2.2 Dependency Injection at Composition Root Only
All wiring happens in `src/index.ts`. Nothing is ever imported and instantiated inside a module — dependencies are always passed as parameters.

```typescript
// ✅ CORRECT — index.ts
const propertyRepo = makePropertyRepository(db);
const propertyService = makePropertyService(propertyRepo);

// ❌ WRONG — inside property.service.ts
import { db } from '../db/client'; // Never do this
```

### 2.3 Curried Middleware
```typescript
// requireRole is curried — partial application of role returns a Middleware
const requireRole = (role: Role) =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (req.user?.role !== role) return void next(new ForbiddenError('Insufficient role'));
    next();
  };

// Route guard helpers compose middleware
const withLandlordAuth = (...handlers: Handler[]) =>
  [requireAuth, requireRole('LANDLORD'), ...handlers];

const withTenantAuth = (...handlers: Handler[]) =>
  [requireAuth, requireRole('TENANT'), ...handlers];
```

### 2.4 Handler Factories — Zero Business Logic
Handlers are factories injected with a service. They only handle HTTP concerns (parse request, call service, send response). Business logic lives exclusively in services.

```typescript
// ✅ CORRECT
const makeCreateProperty = (service: PropertyService) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = CreatePropertyCodec.parse(req.body);
      const property = await service.create(req.user.id, data);
      res.status(201).json(property);
    } catch (err) {
      next(err);
    }
  };
```

### 2.5 Services Depend on Interfaces Only
Services import nothing from `db/` or `repositories/prisma/`. They receive repository interfaces as parameters.

### 2.6 Repositories Contain No Business Logic
Only Prisma queries. No validation, no constitution checks, no conditionals beyond query filters.

### 2.7 IAuditRepository — Append-Only Enforced at Interface Level
```typescript
interface IAuditRepository {
  create(data: CreateAuditEventData): Promise<AuditEvent>;
  // No update(). No delete(). Enforced by interface, not convention.
}
```

### 2.8 Error Handling
- Use `fp-ts Either` for recoverable errors within service logic.
- Throw `AppError` subclasses (`ForbiddenError`, `NotFoundError`, `ValidationError`) for unrecoverable errors.
- `errorHandler` middleware catches all `AppError` throws and maps to HTTP responses.
- Never expose raw Prisma errors or S3 errors to the client.

### 2.9 Testability Contract
Every layer must be unit-testable in isolation:
- **Repositories:** inject a mock `PrismaClient`, assert query calls
- **Services:** inject mock repositories satisfying the interface, assert business logic
- **Handlers:** inject mock services, assert HTTP status codes and response shapes
- **Middleware:** pure functions, invoke directly with mock `req/res/next`

---

## 3. File Structure

```
apps/backend/src/
├── index.ts                         # composition root — all DI wiring
├── server.ts                        # express factory, accepts composed routes
│
├── middleware/
│   ├── requireAuth.ts               # (config: JwtConfig) => Middleware
│   ├── requireRole.ts               # (role: Role) => Middleware  [curried]
│   ├── requestLogger.ts             # Middleware (pure)
│   └── errorHandler.ts              # ErrorMiddleware (pure)
│
├── routes/
│   ├── index.ts                     # compose all domain routers
│   ├── auth.ts                      # (deps: AuthDeps) => Router
│   ├── properties.ts                # (deps: PropertyDeps) => Router
│   ├── applications.ts              # (deps: ApplicationDeps) => Router
│   ├── profile.ts                   # (deps: ProfileDeps) => Router
│   ├── grants.ts                    # (deps: GrantDeps) => Router
│   ├── documents.ts                 # (deps: DocumentDeps) => Router
│   └── notifications.ts             # (deps: NotificationDeps) => Router
│
├── handlers/                        # pure handler factories
│   ├── auth.handlers.ts             # makeAuthHandlers(service) => { register, login, logout, me }
│   ├── property.handlers.ts         # makePropertyHandlers(service) => { list, create, get, patch }
│   ├── application.handlers.ts
│   ├── profile.handlers.ts
│   ├── grant.handlers.ts
│   ├── document.handlers.ts
│   └── notification.handlers.ts
│
├── services/                        # business logic — depends on interfaces only
│   ├── auth.service.ts              # makeAuthService(landlordRepo, tenantRepo, jwt)
│   ├── property.service.ts          # makePropertyService(repo)
│   ├── application.service.ts       # makeApplicationService(appRepo, grantRepo, auditRepo, notifRepo)
│   ├── profile.service.ts           # makeProfileService(profileRepo, s3)
│   ├── grant.service.ts             # makeGrantService(grantRepo, auditRepo)
│   ├── document.service.ts          # makeDocumentService(profileRepo, grantRepo, auditRepo, s3)
│   └── notification.service.ts      # makeNotificationService(notifRepo)
│
├── repositories/
│   ├── interfaces/                  # abstractions — services depend on these, never Prisma
│   │   ├── ILandlordRepository.ts
│   │   ├── ITenantRepository.ts
│   │   ├── IPropertyRepository.ts
│   │   ├── IApplicationRepository.ts
│   │   ├── IProfileRepository.ts
│   │   ├── IGrantRepository.ts
│   │   ├── IAuditRepository.ts      # create() only — no update/delete
│   │   └── INotificationRepository.ts
│   └── prisma/                      # concrete Prisma implementations
│       ├── landlord.repository.ts   # makeLandlordRepository(db) => ILandlordRepository
│       ├── tenant.repository.ts
│       ├── property.repository.ts
│       ├── application.repository.ts
│       ├── profile.repository.ts
│       ├── grant.repository.ts
│       ├── audit.repository.ts
│       └── notification.repository.ts
│
├── db/
│   └── client.ts                    # Prisma singleton (existing)
│
├── codecs/
│   └── index.ts                     # io-ts request validators
│
├── types/
│   ├── errors.ts                    # AppError hierarchy (existing)
│   ├── express.d.ts                 # req.user: { id: string; role: Role; email: string }
│   └── services.ts                  # return type interfaces for all services
│
└── utils/
    ├── access-guard.ts              # checkGrantActive(grant) — pure function (existing)
    ├── compose.ts                   # pipe, compose helpers
    └── jwt.ts                       # makeJwtService(secret) => { sign, verify }
```

---

## 4. Composition Root Pattern (`index.ts`)

```typescript
const db = getPrismaClient();
const jwt = makeJwtService(env.JWT_SECRET);
const s3  = makeS3Service({ region: env.AWS_REGION, bucket: env.AWS_S3_BUCKET, kmsKeyId: env.AWS_KMS_KEY_ID });

// Repositories
const landlordRepo    = makeLandlordRepository(db);
const tenantRepo      = makeTenantRepository(db);
const propertyRepo    = makePropertyRepository(db);
const applicationRepo = makeApplicationRepository(db);
const profileRepo     = makeProfileRepository(db);
const grantRepo       = makeGrantRepository(db);
const auditRepo       = makeAuditRepository(db);       // create-only
const notifRepo       = makeNotificationRepository(db);

// Services
const authService    = makeAuthService(landlordRepo, tenantRepo, jwt);
const propService    = makePropertyService(propertyRepo);
const appService     = makeApplicationService(applicationRepo, grantRepo, auditRepo, notifRepo);
const profileService = makeProfileService(profileRepo, s3);
const grantService   = makeGrantService(grantRepo, auditRepo);
const docService     = makeDocumentService(profileRepo, grantRepo, auditRepo, s3);
const notifService   = makeNotificationService(notifRepo);

// App
const app = createServer([
  makeAuthRoutes({ authService }),
  makePropertyRoutes({ propService }),
  makeApplicationRoutes({ appService }),
  makeProfileRoutes({ profileService }),
  makeGrantRoutes({ grantService }),
  makeDocumentRoutes({ docService }),
  makeNotificationRoutes({ notifService }),
]);

app.listen(env.PORT);
```

---

## 5. Schema Migration Required

The current Prisma schema (`packages/database/prisma/schema.prisma`) has no auth fields. The following migration is needed before auth can be implemented:

```prisma
model Landlord {
  // ... existing fields ...
  passwordHash String   // bcrypt hash — never returned to client
}

model Tenant {
  // ... existing fields ...
  passwordHash String   // bcrypt hash — never returned to client
}
```

This is a non-breaking additive migration. Existing rows will need to have `passwordHash` set (seed script or migration default).

---

## 6. Next.js Frontend Changes Required

| File | Action |
|------|--------|
| `apps/web/src/lib/auth.ts` | Remove — NextAuth config no longer used |
| `apps/web/src/auth.ts` | Remove — NextAuth session export no longer used |
| `apps/web/src/middleware.ts` | Replace role-guard logic with cookie-presence check only |
| `apps/web/src/lib/api.ts` | Rewrite — centralized fetch with `credentials: 'include'` |
| `apps/web/src/lib/actions/auth.ts` | Replace NextAuth sign-in with `POST /api/auth/login` call |

---

## 7. API Endpoint Map

### 7.1 Auth — `/api/auth`

All routes public except `GET /api/auth/me`.

| Method | Path | Auth | Request Body | Response |
|--------|------|------|-------------|----------|
| `POST` | `/api/auth/register` | public | `{ email, password, name, role: LANDLORD\|TENANT, landlordRole? }` | `{ id, email, name, role }` + sets httpOnly cookie |
| `POST` | `/api/auth/login` | public | `{ email, password }` | `{ id, email, name, role }` + sets httpOnly cookie |
| `POST` | `/api/auth/logout` | requireAuth | — | `204` + clears cookie |
| `GET` | `/api/auth/me` | requireAuth | — | `{ id, email, name, role }` |

**Side effects on `POST /api/auth/register`:**
- Creates `Landlord` or `Tenant` row with bcrypt `passwordHash`
- If `role === TENANT`: auto-creates `Profile` shell (`completionPercent: 0`)
- `passwordHash` is never returned in any response

---

### 7.2 Properties — `/api/properties`

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| `GET` | `/api/properties` | LANDLORD | Returns own properties only — filtered by `landlordId === req.user.id` |
| `POST` | `/api/properties` | LANDLORD | `applySlug` auto-generated server-side — never accepted from client |
| `GET` | `/api/properties/:id` | LANDLORD | Guard: `property.landlordId === req.user.id` |
| `PATCH` | `/api/properties/:id` | LANDLORD | Guard: same ownership check |
| `GET` | `/api/properties/:id/applications` | LANDLORD | Returns `ApplicationCard[]` with internal `status` |
| `GET` | `/api/apply/:slug` | **public** | Public-safe fields only — no `landlordId`, no internal status |

**Response shapes:**
```typescript
// PropertyCard
{ id, address, unitNumber, city, rent, bedrooms, status, applySlug, applicationCount, createdAt }

// ApplicationCard (landlord view — internal status visible)
{ id, tenantName, submittedAt, status, profileCompletion, missingDocs: DocumentType[] }

// Public apply page
{ address, city, rent, bedrooms, landlordName, requiredDocs: DocumentType[] }
```

---

### 7.3 Applications — `/api/applications`

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| `POST` | `/api/applications` | TENANT | `consentGiven: true` required (codec-enforced) |
| `GET` | `/api/applications` | TENANT | Own applications only — internal `status` omitted |
| `GET` | `/api/applications/:id` | TENANT or LANDLORD | Response shape differs by role (Constitution Rule 6) |
| `PATCH` | `/api/applications/:id/status` | LANDLORD | Internal status only — never sent to tenant |

**On `POST /api/applications` — full side-effect chain:**
1. Validate `consentGiven === true` (io-ts `ConsentTrue` brand)
2. Guard: one application per tenant per property (unique constraint)
3. Create `Application` (`status: PENDING`)
4. Create `AccessGrant` (`expiresAt: now + 7 days`, `allowedDocs` from request body)
5. Write `AuditEvent`: `APPLICATION_SUBMITTED`
6. Write `AuditEvent`: `ACCESS_GRANTED`
7. Create `Notification` (`APPLICATION_RECEIVED`) → landlord
8. If any `property.requiredDocs` missing from tenant profile → create `Notification` (`MISSING_DOCUMENTS`) → tenant

**Constitution Rule 6 — role-split response on `GET /api/applications/:id`:**
```typescript
// TENANT response — no internal status
{ id, propertyAddress, landlordName, submittedAt, accessGrantStatus: ACTIVE|EXPIRED|REVOKED }

// LANDLORD response — includes internal status
{ id, tenantName, submittedAt, status, profileCompletion, missingDocs: DocumentType[] }
```

---

### 7.4 Profile — `/api/profile`

All routes: `requireAuth + requireRole('TENANT')`.

| Method | Path | Notes |
|--------|------|-------|
| `GET` | `/api/profile` | `storageKey` never in response — only document metadata |
| `POST` | `/api/profile/documents/upload-url` | Returns S3 presigned PUT URL (15 min expiry) + pre-created `documentId` |
| `POST` | `/api/profile/documents/confirm` | Called after S3 PUT; activates document, recalculates `completionPercent` |
| `DELETE` | `/api/profile/documents/:id` | Sets `replacedAt` (soft delete); guard: doc belongs to tenant |
| `POST` | `/api/profile/references` | Adds reference contact |
| `DELETE` | `/api/profile/references/:id` | Guard: reference belongs to tenant |

**Document upload flow (two-step, S3 direct upload):**
```
1. POST /api/profile/documents/upload-url  →  { uploadUrl, documentId }
2. Client PUTs file directly to S3 via uploadUrl
3. POST /api/profile/documents/confirm  { documentId }  →  DocumentMeta
```
S3 key generated server-side only — never client-supplied.

**DocumentMeta response:** `{ id, type, fileName, mimeType, sizeBytes, uploadedAt }` — no `storageKey`.

---

### 7.5 Access Grants — `/api/grants`

All routes: `requireAuth + requireRole('TENANT')`.

| Method | Path | Notes |
|--------|------|-------|
| `GET` | `/api/grants` | Returns all grants with computed `status: ACTIVE\|EXPIRED\|REVOKED` |
| `DELETE` | `/api/grants/:id` | Instant backend revocation — sets `revokedAt`, writes AuditEvent |

**On `DELETE /api/grants/:id` — revocation sequence:**
1. Guard: `grant.application.tenantId === req.user.id`
2. Set `revokedAt = now()`, `revokedBy = req.user.id`
3. Write `AuditEvent`: `ACCESS_REVOKED` (actorId: tenantId, actorType: TENANT)
4. Return `204` — landlord's next document request fails `checkGrantActive` immediately

**Constitution Rule 4:** Revocation is backend-enforced. UI revocation without this backend call is a bug.

---

### 7.6 Documents — `/api/documents`

Landlord-side document viewing with full constitution guard chain.

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| `GET` | `/api/documents/:id/url` | LANDLORD | Full guard chain, then presigned GET URL |

**Guard chain on every call (order is mandatory):**
1. `requireAuth` + `requireRole('LANDLORD')`
2. Fetch `AccessGrant` by `grantId` query param
3. `checkGrantActive(grant)` — `revokedAt IS NULL` AND `expiresAt > now()`
4. Verify `document.type` is in `grant.allowedDocs`
5. Verify `grant.application.property.landlordId === req.user.id`
6. Generate S3 presigned GET URL (max 1hr — never raw S3 key)
7. Write `AuditEvent`: `DOCUMENT_VIEWED` (actorId: landlordId, actorType: LANDLORD, metadata: `{ documentType }`)

**Response:** `{ url: string, expiresAt: string }` — client re-fetches when `expiresAt` passes.

**Constitution Rules 2, 3, 4:** Pre-signed URL only, every view logged, revocation checked server-side before every URL generation.

---

### 7.7 Notifications — `/api/notifications`

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| `GET` | `/api/notifications` | requireAuth | Filtered to `recipientId === req.user.id` |
| `PATCH` | `/api/notifications/:id/read` | requireAuth | Guard: `notification.recipientId === req.user.id` |

---

### 7.8 Endpoint Summary

| Domain | Count | Auth patterns used |
|--------|-------|--------------------|
| Auth | 4 | public, requireAuth |
| Properties | 6 | LANDLORD, public |
| Applications | 4 | TENANT, LANDLORD, both |
| Profile | 6 | TENANT |
| Grants | 2 | TENANT |
| Documents | 1 | LANDLORD + grant chain |
| Notifications | 2 | requireAuth |
| **Total** | **25** | |
