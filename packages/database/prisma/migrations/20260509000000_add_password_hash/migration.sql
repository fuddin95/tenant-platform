-- AlterTable
ALTER TABLE "Landlord" ADD COLUMN "passwordHash" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Tenant" ADD COLUMN "passwordHash" TEXT NOT NULL DEFAULT '';

-- Remove defaults after adding columns (prevent empty string as default going forward)
ALTER TABLE "Landlord" ALTER COLUMN "passwordHash" DROP DEFAULT;
ALTER TABLE "Tenant" ALTER COLUMN "passwordHash" DROP DEFAULT;
