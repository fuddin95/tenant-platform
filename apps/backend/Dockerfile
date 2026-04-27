FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies (cache layer)
FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/types/package.json ./packages/types/
COPY packages/database/package.json ./packages/database/
RUN npm ci

# Build
FROM deps AS builder
COPY . .
RUN npm run db:generate
RUN npm run build --workspace=apps/backend

# Production image
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 expressjs

COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/apps/backend/package.json ./apps/backend/
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules

USER expressjs
EXPOSE 3001
ENV PORT=3001
CMD ["node", "apps/backend/dist/index.js"]
