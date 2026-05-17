import { makeGrantService } from '../services/grant.service';
import { ForbiddenError, NotFoundError, ValidationError, ConflictError } from '../types/errors';
import type { IGrantRepository, GrantSummary, GrantWithContext } from '../repositories/interfaces/IGrantRepository';
import type { IAuditRepository } from '../repositories/interfaces/IAuditRepository';
import type { IApplicationRepository } from '../repositories/interfaces/IApplicationRepository';
import type { AccessGrant } from '@rental-trust/database';

const makeMockGrantRepo = (): jest.Mocked<IGrantRepository> => ({
  findByTenant: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  revoke: jest.fn(),
});

const makeMockAuditRepo = (): jest.Mocked<IAuditRepository> => ({
  create: jest.fn(),
});

const makeMockAppRepo = (app?: { id: string; tenantId: string } | null): jest.Mocked<Pick<IApplicationRepository, 'findById'>> => ({
  findById: jest.fn().mockResolvedValue(app ?? null),
});

const TENANT_ID = 'tenant-1';
const OTHER_TENANT_ID = 'tenant-2';
const APP_ID = 'app-1';
const GRANT_ID = 'grant-1';

const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24); // 1 day from now
const pastDate = new Date(Date.now() - 1000 * 60 * 60 * 24);   // 1 day ago

const baseGrant: AccessGrant = {
  id: GRANT_ID,
  applicationId: APP_ID,
  allowedDocs: ['GOVERNMENT_ID'],
  expiresAt: futureDate,
  grantedAt: new Date(),
  revokedAt: null,
  revokedBy: null,
};

const grantWithContext: GrantWithContext = {
  ...baseGrant,
  application: {
    tenantId: TENANT_ID,
    property: { landlordId: 'landlord-1', address: '123 Main St', city: 'Toronto' },
  },
};

const grantSummaries: GrantSummary[] = [
  {
    id: GRANT_ID,
    landlordName: 'Test Landlord',
    propertyAddress: '123 Main St',
    grantedAt: new Date(),
    expiresAt: futureDate,
    allowedDocs: ['GOVERNMENT_ID'],
    status: 'ACTIVE',
  },
];

describe('makeGrantService', () => {
  let grantRepo: jest.Mocked<IGrantRepository>;
  let auditRepo: jest.Mocked<IAuditRepository>;

  beforeEach(() => {
    grantRepo = makeMockGrantRepo();
    auditRepo = makeMockAuditRepo();
    auditRepo.create.mockResolvedValue({} as never);
  });

  // --- list ---

  it('list returns grant summaries for tenant', async () => {
    grantRepo.findByTenant.mockResolvedValue(grantSummaries);
    const appRepo = makeMockAppRepo();
    const service = makeGrantService(grantRepo, auditRepo, appRepo as never);

    const result = await service.list(TENANT_ID);

    expect(grantRepo.findByTenant).toHaveBeenCalledWith(TENANT_ID);
    expect(result).toEqual(grantSummaries);
  });

  // --- create ---

  it('create throws ForbiddenError if application does not belong to tenant', async () => {
    const appRepo = makeMockAppRepo({ id: APP_ID, tenantId: OTHER_TENANT_ID });
    const service = makeGrantService(grantRepo, auditRepo, appRepo as never);

    await expect(
      service.create(TENANT_ID, APP_ID, { allowedDocs: ['GOVERNMENT_ID'], expiresAt: futureDate }),
    ).rejects.toThrow(ForbiddenError);
    expect(grantRepo.create).not.toHaveBeenCalled();
  });

  it('create throws ValidationError if expiresAt is in the past', async () => {
    const appRepo = makeMockAppRepo({ id: APP_ID, tenantId: TENANT_ID });
    const service = makeGrantService(grantRepo, auditRepo, appRepo as never);

    await expect(
      service.create(TENANT_ID, APP_ID, { allowedDocs: ['GOVERNMENT_ID'], expiresAt: pastDate }),
    ).rejects.toThrow(ValidationError);
    expect(grantRepo.create).not.toHaveBeenCalled();
  });

  it('create throws ForbiddenError if application is not found', async () => {
    const appRepo = makeMockAppRepo(null);
    const service = makeGrantService(grantRepo, auditRepo, appRepo as never);

    await expect(
      service.create(TENANT_ID, APP_ID, { allowedDocs: ['GOVERNMENT_ID'], expiresAt: futureDate }),
    ).rejects.toThrow(ForbiddenError);
  });

  it('create creates grant and writes ACCESS_GRANTED audit event', async () => {
    const appRepo = makeMockAppRepo({ id: APP_ID, tenantId: TENANT_ID });
    grantRepo.create.mockResolvedValue(baseGrant);
    const service = makeGrantService(grantRepo, auditRepo, appRepo as never);

    const input = { allowedDocs: ['GOVERNMENT_ID'] as AccessGrant['allowedDocs'], expiresAt: futureDate };
    const result = await service.create(TENANT_ID, APP_ID, input);

    expect(grantRepo.create).toHaveBeenCalledWith({
      applicationId: APP_ID,
      expiresAt: futureDate,
      allowedDocs: input.allowedDocs,
    });
    expect(auditRepo.create).toHaveBeenCalledWith({
      accessGrantId: baseGrant.id,
      eventType: 'ACCESS_GRANTED',
      actorId: TENANT_ID,
      actorType: 'TENANT',
      metadata: { allowedDocs: input.allowedDocs },
    });
    expect(result).toEqual(baseGrant);
  });

  // --- revoke ---

  it('revoke throws NotFoundError if grant is not found', async () => {
    grantRepo.findById.mockResolvedValue(null);
    const appRepo = makeMockAppRepo();
    const service = makeGrantService(grantRepo, auditRepo, appRepo as never);

    await expect(service.revoke(TENANT_ID, GRANT_ID)).rejects.toThrow(NotFoundError);
    expect(grantRepo.revoke).not.toHaveBeenCalled();
  });

  it('revoke throws ForbiddenError if tenant does not own the grant', async () => {
    grantRepo.findById.mockResolvedValue({
      ...grantWithContext,
      application: { ...grantWithContext.application, tenantId: OTHER_TENANT_ID },
    });
    const appRepo = makeMockAppRepo();
    const service = makeGrantService(grantRepo, auditRepo, appRepo as never);

    await expect(service.revoke(TENANT_ID, GRANT_ID)).rejects.toThrow(ForbiddenError);
    expect(grantRepo.revoke).not.toHaveBeenCalled();
  });

  it('revoke throws ConflictError if grant is already revoked', async () => {
    grantRepo.findById.mockResolvedValue({
      ...grantWithContext,
      revokedAt: new Date(),
    });
    const appRepo = makeMockAppRepo();
    const service = makeGrantService(grantRepo, auditRepo, appRepo as never);

    await expect(service.revoke(TENANT_ID, GRANT_ID)).rejects.toThrow(ConflictError);
    expect(grantRepo.revoke).not.toHaveBeenCalled();
  });

  it('revoke calls repo revoke and writes ACCESS_REVOKED audit event', async () => {
    grantRepo.findById.mockResolvedValue(grantWithContext);
    grantRepo.revoke.mockResolvedValue(undefined);
    const appRepo = makeMockAppRepo();
    const service = makeGrantService(grantRepo, auditRepo, appRepo as never);

    await service.revoke(TENANT_ID, GRANT_ID);

    expect(grantRepo.revoke).toHaveBeenCalledWith(GRANT_ID, TENANT_ID);
    expect(auditRepo.create).toHaveBeenCalledWith({
      accessGrantId: GRANT_ID,
      eventType: 'ACCESS_REVOKED',
      actorId: TENANT_ID,
      actorType: 'TENANT',
      metadata: { grantId: GRANT_ID },
    });
  });
});
