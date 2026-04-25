import { PrismaClient } from '@prisma/client';

// Singleton pattern — prevent multiple Prisma instances in development (Next.js hot reload)
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}

// Re-export Prisma types for use across the monorepo
export * from '@prisma/client';
