-- CreateEnum
CREATE TYPE "FactCategory" AS ENUM ('IDENTITY', 'INCOME', 'RENTAL_HISTORY', 'REFERENCES', 'CREDIT');

-- CreateEnum
CREATE TYPE "ShareLinkStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ShareLinkEventType" AS ENUM ('LINK_CREATED', 'LINK_VIEWED', 'LINK_REVOKED', 'LINK_EXPIRED');

-- CreateTable
CREATE TABLE "ShareLink" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "recipientName" TEXT NOT NULL,
    "relation" TEXT NOT NULL,
    "allowedFacts" "FactCategory"[],
    "tokenHash" TEXT NOT NULL,
    "status" "ShareLinkStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "viewedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShareLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShareLinkEvent" (
    "id" TEXT NOT NULL,
    "shareLinkId" TEXT NOT NULL,
    "eventType" "ShareLinkEventType" NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorType" "ActorType" NOT NULL,
    "metadata" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShareLinkEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShareLink_tokenHash_key" ON "ShareLink"("tokenHash");

-- CreateIndex
CREATE INDEX "ShareLink_tenantId_idx" ON "ShareLink"("tenantId");

-- CreateIndex
CREATE INDEX "ShareLink_tokenHash_idx" ON "ShareLink"("tokenHash");

-- CreateIndex
CREATE INDEX "ShareLinkEvent_shareLinkId_idx" ON "ShareLinkEvent"("shareLinkId");

-- CreateIndex
CREATE INDEX "ShareLinkEvent_occurredAt_idx" ON "ShareLinkEvent"("occurredAt");

-- AddForeignKey
ALTER TABLE "ShareLink" ADD CONSTRAINT "ShareLink_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareLinkEvent" ADD CONSTRAINT "ShareLinkEvent_shareLinkId_fkey" FOREIGN KEY ("shareLinkId") REFERENCES "ShareLink"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
