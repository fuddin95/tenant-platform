# Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Express backend with functional architecture — factory functions, DI composition root, repository/service/handler layers, 25 REST endpoints, JWT httpOnly cookie auth, and S3 document handling.

**Architecture:** Routes → Handlers → Services → Repositories → Prisma. Each layer depends only on interfaces. DI wiring in `index.ts` (composition root) only. No classes — factory functions everywhere.

**Tech Stack:** Express 4, Prisma (`@rental-trust/database`), `jsonwebtoken`, `bcryptjs`, `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, `zod`, `cookie-parser`, `cors`, `supertest` (tests).

**Spec:** `docs/superpowers/specs/2026-04-29-backend-architecture-design.md`

**Prerequisite branches to merge before starting:**
- `feature/TEN-7-backend-scaffolding` — Express scaffold, error types, access-guard, codecs
- `feature/TEN-38-database-seed-script` — includes Prisma migration baseline

---

## Phase A — Foundation

---

### Task 1: Merge prerequisites + install dependencies + schema migration

**Files:**
- Modify: `packages/database/prisma/schema.prisma` — add `passwordHash` to Landlord + Tenant
- Modify: `apps/backend/package.json` — add new dependencies

- [ ] **Step 1: Merge prerequisite branches**

```bash
git checkout main
git merge feature/TEN-7-backend-scaffolding
git merge feature/TEN-38-database-seed-script
git checkout -b feature/backend-implementation
```

- [ ] **Step 2: Install new backend dependencies**

```bash
cd apps/backend
npm install jsonwebtoken bcryptjs @aws-sdk/client-s3 @aws-sdk/s3-request-presigner cookie-parser cors
npm install -D @types/jsonwebtoken @types/bcryptjs @types/cookie-parser @types/cors supertest @types/supertest
cd ../..
```

- [ ] **Step 3: Add `passwordHash` to Prisma schema**

In `packages/database/prisma/schema.prisma`, add `passwordHash String` to both models:

```prisma
model Landlord {
  id           String       @id @default(cuid())
  email        String       @unique
  name         String
  passwordHash String
  role         LandlordRole @default(INDEPENDENT_LANDLORD)
  city         String?
  phone        String?
  properties   Property[]
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt

  @@index([email])
}

model Tenant {
  id           String        @id @default(cuid())
  email        String        @unique
  name         String
  passwordHash String
  profile      Profile?
  applications Application[]
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt

  @@index([email])
}
```

- [ ] **Step 4: Run Prisma migration**

```bash
npm run db:migrate -- --name add_password_hash
```

Expected output: `Your database is now in sync with your schema.`

- [ ] **Step 5: Regenerate Prisma client**

```bash
npm run db:generate
```

- [ ] **Step 6: Commit**

```bash
git add packages/database/prisma/schema.prisma packages/database/prisma/migrations apps/backend/package.json apps/backend/package-lock.json
git commit -m "feat(backend): add passwordHash to schema + install auth/S3 deps"
```

---

### Task 2: Add `UnauthorizedError` + type augmentations

**Files:**
- Modify: `apps/backend/src/types/errors.ts`
- Create: `apps/backend/src/types/express.d.ts`

- [ ] **Step 1: Write test for UnauthorizedError**

```typescript
// apps/backend/src/__tests__/errors.test.ts — add to existing file
it('UnauthorizedError has statusCode 401', () => {
  const err = new UnauthorizedError('bad token');
  expect(err.statusCode).toBe(401);
  expect(err.message).toBe('bad token');
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd apps/backend && npx jest --testPathPattern=errors -t "UnauthorizedError"
```

Expected: FAIL — `UnauthorizedError is not defined`

- [ ] **Step 3: Add `UnauthorizedError` to `apps/backend/src/types/errors.ts`**

```typescript
export abstract class AppError extends Error {
  abstract readonly statusCode: number;
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class UnauthorizedError extends AppError {
  readonly statusCode = 401;
}

export class ForbiddenError extends AppError {
  readonly statusCode = 403;
}

export class NotFoundError extends AppError {
  readonly statusCode = 404;
}

export class ValidationError extends AppError {
  readonly statusCode = 400;
}

export class InternalError extends AppError {
  readonly statusCode = 500;
}
```

- [ ] **Step 4: Create `apps/backend/src/types/express.d.ts`**

```typescript
export type Role = 'LANDLORD' | 'TENANT';

export type JwtPayload = {
  sub: string;
  role: Role;
  email: string;
};

declare global {
  namespace Express {
    interface Request {
      user: JwtPayload;
    }
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd apps/backend && npx jest --testPathPattern=errors
```

Expected: PASS (all errors tests)

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/types/
git commit -m "feat(backend): add UnauthorizedError + express req.user type"
```

---

### Task 3: Env validation + JWT service + S3 service

**Files:**
- Create: `apps/backend/src/utils/env.ts`
- Create: `apps/backend/src/utils/jwt.ts`
- Create: `apps/backend/src/utils/s3.ts`
- Create: `apps/backend/src/__tests__/jwt.test.ts`

- [ ] **Step 1: Write JWT service test**

```typescript
// apps/backend/src/__tests__/jwt.test.ts
import { makeJwtService } from '../utils/jwt';

const SECRET = 'test-secret-at-least-32-chars-long!!';

describe('makeJwtService', () => {
  const jwt = makeJwtService(SECRET);

  it('sign then verify round-trips payload', () => {
    const payload = { sub: 'user-1', role: 'TENANT' as const, email: 'a@b.com' };
    const token = jwt.sign(payload);
    const decoded = jwt.verify(token);
    expect(decoded.sub).toBe('user-1');
    expect(decoded.role).toBe('TENANT');
    expect(decoded.email).toBe('a@b.com');
  });

  it('verify throws on tampered token', () => {
    const token = jwt.sign({ sub: 'x', role: 'LANDLORD', email: 'x@x.com' });
    expect(() => jwt.verify(token + 'tampered')).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd apps/backend && npx jest --testPathPattern=jwt
```

Expected: FAIL — `Cannot find module '../utils/jwt'`

- [ ] **Step 3: Create `apps/backend/src/utils/env.ts`**

```typescript
import { z } from 'zod';

const EnvSchema = z.object({
  PORT: z.string().default('3001'),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  AWS_REGION: z.string().default('ca-central-1'),
  AWS_S3_BUCKET: z.string().min(1),
  AWS_KMS_KEY_ID: z.string().min(1),
  AWS_ACCESS_KEY_ID: z.string().min(1),
  AWS_SECRET_ACCESS_KEY: z.string().min(1),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
});

export const env = EnvSchema.parse(process.env);
```

- [ ] **Step 4: Create `apps/backend/src/utils/jwt.ts`**

```typescript
import jwt from 'jsonwebtoken';
import type { JwtPayload } from '../types/express.d';

export type JwtService = {
  sign: (payload: JwtPayload) => string;
  verify: (token: string) => JwtPayload;
};

export const makeJwtService = (secret: string): JwtService => ({
  sign: (payload) => jwt.sign(payload, secret, { expiresIn: '7d' }),
  verify: (token) => jwt.verify(token, secret) as JwtPayload,
});
```

- [ ] **Step 5: Create `apps/backend/src/utils/s3.ts`**

```typescript
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export type S3Config = {
  region: string;
  bucket: string;
  kmsKeyId: string;
};

export type S3Service = {
  getPresignedPutUrl: (key: string, mimeType: string, expiresIn?: number) => Promise<string>;
  getPresignedGetUrl: (key: string, expiresIn?: number) => Promise<string>;
};

export const makeS3Service = (config: S3Config): S3Service => {
  const client = new S3Client({ region: config.region });
  return {
    getPresignedPutUrl: (key, mimeType, expiresIn = 900) =>
      getSignedUrl(
        client,
        new PutObjectCommand({
          Bucket: config.bucket,
          Key: key,
          ContentType: mimeType,
          ServerSideEncryption: 'aws:kms',
          SSEKMSKeyId: config.kmsKeyId,
        }),
        { expiresIn },
      ),
    getPresignedGetUrl: (key, expiresIn = 3600) =>
      getSignedUrl(
        client,
        new GetObjectCommand({ Bucket: config.bucket, Key: key }),
        { expiresIn },
      ),
  };
};
```

- [ ] **Step 6: Run JWT test to verify it passes**

```bash
cd apps/backend && npx jest --testPathPattern=jwt
```

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add apps/backend/src/utils/
git commit -m "feat(backend): add env validation, JWT service, S3 service"
```

---

### Task 4: Repository interfaces

**Files:**
- Create: `apps/backend/src/repositories/interfaces/ILandlordRepository.ts`
- Create: `apps/backend/src/repositories/interfaces/ITenantRepository.ts`
- Create: `apps/backend/src/repositories/interfaces/IPropertyRepository.ts`
- Create: `apps/backend/src/repositories/interfaces/IApplicationRepository.ts`
- Create: `apps/backend/src/repositories/interfaces/IProfileRepository.ts`
- Create: `apps/backend/src/repositories/interfaces/IGrantRepository.ts`
- Create: `apps/backend/src/repositories/interfaces/IAuditRepository.ts`
- Create: `apps/backend/src/repositories/interfaces/INotificationRepository.ts`

- [ ] **Step 1: Create `ILandlordRepository.ts`**

```typescript
import type { Landlord, LandlordRole } from '@rental-trust/database';

export type CreateLandlordData = {
  email: string;
  name: string;
  passwordHash: string;
  role: LandlordRole;
};

export interface ILandlordRepository {
  findByEmail(email: string): Promise<Landlord | null>;
  findById(id: string): Promise<Landlord | null>;
  create(data: CreateLandlordData): Promise<Landlord>;
}
```

- [ ] **Step 2: Create `ITenantRepository.ts`**

```typescript
import type { Tenant } from '@rental-trust/database';

export type CreateTenantData = {
  email: string;
  name: string;
  passwordHash: string;
};

export interface ITenantRepository {
  findByEmail(email: string): Promise<Tenant | null>;
  findById(id: string): Promise<Tenant | null>;
  create(data: CreateTenantData): Promise<Tenant>;
}
```

- [ ] **Step 3: Create `IPropertyRepository.ts`**

```typescript
import type { Property, PropertyStatus, DocumentType } from '@rental-trust/database';

export type CreatePropertyData = {
  address: string;
  unitNumber?: string;
  city: string;
  rent: number;
  bedrooms: number;
  requiredDocs: DocumentType[];
};

export type UpdatePropertyData = Partial<CreatePropertyData & { status: PropertyStatus }>;

export type PropertyWithCount = Property & { applicationCount: number };

export type PublicProperty = {
  address: string;
  city: string;
  rent: number;
  bedrooms: number;
  landlordName: string;
  requiredDocs: DocumentType[];
};

export interface IPropertyRepository {
  findByLandlord(landlordId: string): Promise<PropertyWithCount[]>;
  findById(id: string): Promise<Property | null>;
  findBySlug(applySlug: string): Promise<PublicProperty | null>;
  create(landlordId: string, data: CreatePropertyData): Promise<Property>;
  update(id: string, data: UpdatePropertyData): Promise<Property>;
}
```

- [ ] **Step 4: Create `IApplicationRepository.ts`**

```typescript
import type { Application, ApplicationStatus, DocumentType } from '@rental-trust/database';

export type CreateApplicationData = {
  tenantId: string;
  propertyId: string;
};

export type ApplicationSummary = {
  id: string;
  propertyAddress: string;
  landlordName: string;
  submittedAt: Date;
  grantStatus: 'ACTIVE' | 'EXPIRED' | 'REVOKED';
};

export type ApplicationCard = {
  id: string;
  tenantName: string;
  submittedAt: Date;
  status: ApplicationStatus;
  profileCompletion: number;
  missingDocs: DocumentType[];
};

export interface IApplicationRepository {
  findByTenant(tenantId: string): Promise<ApplicationSummary[]>;
  findById(id: string): Promise<Application | null>;
  findByProperty(propertyId: string): Promise<ApplicationCard[]>;
  create(data: CreateApplicationData): Promise<Application>;
  updateStatus(id: string, status: ApplicationStatus): Promise<Application>;
  existsByTenantAndProperty(tenantId: string, propertyId: string): Promise<boolean>;
}
```

- [ ] **Step 5: Create `IProfileRepository.ts`**

```typescript
import type { Profile, Document, TenantReference, DocumentType } from '@rental-trust/database';

export type CreateDocumentData = {
  profileId: string;
  type: DocumentType;
  storageKey: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
};

export type CreateReferenceData = {
  profileId: string;
  name: string;
  relationship: string;
  phone?: string;
  email?: string;
};

export type ProfileWithDocs = Profile & {
  documents: Document[];
  references: TenantReference[];
};

export interface IProfileRepository {
  findByTenantId(tenantId: string): Promise<ProfileWithDocs | null>;
  create(tenantId: string): Promise<Profile>;
  updateCompletion(profileId: string, percent: number): Promise<void>;
  addDocument(data: CreateDocumentData): Promise<Document>;
  findDocumentById(id: string): Promise<Document | null>;
  softDeleteDocument(id: string): Promise<void>;
  findActiveDocTypes(profileId: string): Promise<DocumentType[]>;
  countReferences(profileId: string): Promise<number>;
  addReference(data: CreateReferenceData): Promise<TenantReference>;
  findReferenceById(id: string): Promise<TenantReference | null>;
  deleteReference(id: string): Promise<void>;
}
```

- [ ] **Step 6: Create `IGrantRepository.ts`**

```typescript
import type { AccessGrant, DocumentType } from '@rental-trust/database';

export type CreateGrantData = {
  applicationId: string;
  expiresAt: Date;
  allowedDocs: DocumentType[];
};

export type GrantWithContext = AccessGrant & {
  application: {
    tenantId: string;
    property: { landlordId: string; address: string; city: string };
  };
};

export type GrantSummary = {
  id: string;
  landlordName: string;
  propertyAddress: string;
  grantedAt: Date;
  expiresAt: Date;
  allowedDocs: DocumentType[];
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED';
};

export interface IGrantRepository {
  findByTenant(tenantId: string): Promise<GrantSummary[]>;
  findById(id: string): Promise<GrantWithContext | null>;
  create(data: CreateGrantData): Promise<AccessGrant>;
  revoke(id: string, revokedBy: string): Promise<void>;
}
```

- [ ] **Step 7: Create `IAuditRepository.ts`**

```typescript
import type { AuditEvent, AuditEventType, ActorType } from '@rental-trust/database';

export type CreateAuditEventData = {
  accessGrantId: string;
  eventType: AuditEventType;
  actorId: string;
  actorType: ActorType;
  metadata?: Record<string, unknown>;
};

// Append-only — no update, no delete exposed at interface level
export interface IAuditRepository {
  create(data: CreateAuditEventData): Promise<AuditEvent>;
}
```

- [ ] **Step 8: Create `INotificationRepository.ts`**

```typescript
import type { Notification, NotificationType, ActorType } from '@rental-trust/database';

export type CreateNotificationData = {
  applicationId: string;
  recipientId: string;
  recipientType: ActorType;
  type: NotificationType;
};

export interface INotificationRepository {
  findByRecipient(recipientId: string): Promise<Notification[]>;
  create(data: CreateNotificationData): Promise<Notification>;
  markRead(id: string): Promise<void>;
}
```

- [ ] **Step 9: Run typecheck to verify interfaces compile**

```bash
cd apps/backend && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 10: Commit**

```bash
git add apps/backend/src/repositories/interfaces/
git commit -m "feat(backend): add all 8 repository interfaces"
```

---

### Task 5: `requireAuth` + `requireRole` middleware

**Files:**
- Create: `apps/backend/src/middleware/requireAuth.ts`
- Create: `apps/backend/src/middleware/requireRole.ts`
- Create: `apps/backend/src/__tests__/middleware.test.ts`

- [ ] **Step 1: Write failing middleware tests**

```typescript
// apps/backend/src/__tests__/middleware.test.ts
import type { Request, Response, NextFunction } from 'express';
import { makeRequireAuth } from '../middleware/requireAuth';
import { requireRole } from '../middleware/requireRole';
import { makeJwtService } from '../utils/jwt';
import { UnauthorizedError, ForbiddenError } from '../types/errors';

const SECRET = 'test-secret-at-least-32-chars-long!!';
const jwtService = makeJwtService(SECRET);

const mockNext = jest.fn() as jest.MockedFunction<NextFunction>;
const mockRes = {} as Response;

const makeReq = (overrides: Partial<Request> = {}): Request =>
  ({ cookies: {}, ...overrides }) as unknown as Request;

beforeEach(() => mockNext.mockClear());

describe('requireAuth', () => {
  const requireAuth = makeRequireAuth(jwtService);

  it('attaches user and calls next for valid cookie', () => {
    const token = jwtService.sign({ sub: 'u1', role: 'TENANT', email: 'a@b.com' });
    const req = makeReq({ cookies: { token } });
    requireAuth(req, mockRes, mockNext);
    expect((req as unknown as { user: unknown }).user).toMatchObject({ sub: 'u1', role: 'TENANT' });
    expect(mockNext).toHaveBeenCalledWith();
  });

  it('calls next with UnauthorizedError when cookie missing', () => {
    requireAuth(makeReq(), mockRes, mockNext);
    expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  it('calls next with UnauthorizedError for invalid token', () => {
    const req = makeReq({ cookies: { token: 'bad.token.here' } });
    requireAuth(req, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });
});

describe('requireRole', () => {
  it('calls next() when role matches', () => {
    const req = makeReq();
    (req as unknown as { user: unknown }).user = { sub: 'u1', role: 'LANDLORD', email: 'a@b.com' };
    requireRole('LANDLORD')(req, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalledWith();
  });

  it('calls next with ForbiddenError when role does not match', () => {
    const req = makeReq();
    (req as unknown as { user: unknown }).user = { sub: 'u1', role: 'TENANT', email: 'a@b.com' };
    requireRole('LANDLORD')(req, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalledWith(expect.any(ForbiddenError));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd apps/backend && npx jest --testPathPattern=middleware
```

Expected: FAIL — cannot find modules

- [ ] **Step 3: Create `apps/backend/src/middleware/requireAuth.ts`**

```typescript
import type { RequestHandler } from 'express';
import type { JwtService } from '../utils/jwt';
import { UnauthorizedError } from '../types/errors';

export const makeRequireAuth = (jwtService: JwtService): RequestHandler =>
  (req, _res, next) => {
    const token = (req.cookies as Record<string, string | undefined>)['token'];
    if (!token) return void next(new UnauthorizedError('Authentication required'));
    try {
      req.user = jwtService.verify(token);
      next();
    } catch {
      next(new UnauthorizedError('Invalid or expired token'));
    }
  };
```

- [ ] **Step 4: Create `apps/backend/src/middleware/requireRole.ts`**

```typescript
import type { RequestHandler } from 'express';
import type { Role } from '../types/express.d';
import { ForbiddenError } from '../types/errors';

export const requireRole =
  (role: Role): RequestHandler =>
  (req, _res, next) => {
    if (req.user?.role !== role) return void next(new ForbiddenError('Insufficient permissions'));
    next();
  };
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd apps/backend && npx jest --testPathPattern=middleware
```

Expected: PASS (all 5 middleware tests)

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/middleware/ apps/backend/src/__tests__/middleware.test.ts
git commit -m "feat(backend): add requireAuth + requireRole middleware with tests"
```
