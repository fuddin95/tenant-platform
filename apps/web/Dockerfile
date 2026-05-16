FROM node:26-alpine AS base
WORKDIR /app

# Install dependencies (cache layer)
FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/types/package.json ./packages/types/
COPY packages/database/package.json ./packages/database/
RUN npm ci

# Generate Prisma client
FROM deps AS builder
COPY . .
RUN npm run db:generate
RUN npm run build --workspace=apps/web

# Production image
FROM node:26-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache openssl && \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/node_modules/.prisma/client/ ./node_modules/.prisma/client/

USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "apps/web/server.js"]
