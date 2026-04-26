# Railway Staging Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy `apps/web` (Next.js 14) to Railway staging with a Railway-provisioned PostgreSQL database accessible at a public URL.

**Architecture:** Add `nixpacks.toml` to configure the monorepo build, update `next.config.mjs` to transpile the local TypeScript workspace package, then create a Railway project with a Postgres service via MCP and deploy from local files using `railway up`.

**Tech Stack:** Next.js 14, Turborepo, Prisma 5, Railway (nixpacks builder), PostgreSQL

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `nixpacks.toml` | Create | Tells Railway how to build and start the monorepo |
| `apps/web/next.config.mjs` | Modify | Add `transpilePackages` for `@rental-trust/database` (exports raw TS) |

---

### Task 1: Add `nixpacks.toml`

**Files:**
- Create: `nixpacks.toml` (repo root)

- [ ] **Step 1: Create `nixpacks.toml`**

Create `/Users/user/Desktop/tenant-platform/nixpacks.toml` with:

```toml
[phases.build]
cmds = [
  "npx prisma generate --schema=packages/database/prisma/schema.prisma",
  "npx turbo build --filter=@rental-trust/web"
]

[start]
cmd = "cd apps/web && npm start"
```

- [ ] **Step 2: Verify**

```bash
cat nixpacks.toml
```

Expected: shows both build cmds and the start cmd.

- [ ] **Step 3: Commit**

```bash
git add nixpacks.toml
git commit -m "feat(deploy): add nixpacks.toml for Railway monorepo build"
```

---

### Task 2: Update `next.config.mjs`

**Files:**
- Modify: `apps/web/next.config.mjs`

- [ ] **Step 1: Add `transpilePackages`**

Replace the contents of `apps/web/next.config.mjs` with:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@rental-trust/database'],
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client'],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/next.config.mjs
git commit -m "feat(deploy): transpile @rental-trust/database workspace package"
```

---

### Task 3: Create Railway project and provision Postgres

- [ ] **Step 1: Create Railway project**

Call `mcp__railway-mcp-server__create-project-and-link` with:
- `projectName`: `rental-trust-staging`
- `workspacePath`: `/Users/user/Desktop/tenant-platform`

Expected: project created and linked to the workspace.

- [ ] **Step 2: Add PostgreSQL service**

Call `mcp__railway-mcp-server__deploy-template` with:
- `searchQuery`: `postgres`
- `workspacePath`: `/Users/user/Desktop/tenant-platform`

Select the official Postgres template when prompted. This provisions a managed PostgreSQL instance and makes `DATABASE_URL` available as a Railway variable.

- [ ] **Step 3: Verify services exist**

Call `mcp__railway-mcp-server__list-services` with:
- `workspacePath`: `/Users/user/Desktop/tenant-platform`

Expected: at least one Postgres service listed.

---

### Task 4: Set environment variables

- [ ] **Step 1: Set all required env vars on the web service**

Call `mcp__railway-mcp-server__set-variables` with:
- `workspacePath`: `/Users/user/Desktop/tenant-platform`
- `skipDeploys`: `true`
- `variables`:
  ```
  NEXTAUTH_SECRET=4Hjez6bYHFaS6Gq3lIrFizLXuatTsI3e5Stb8s9nqb8=
  NEXTAUTH_URL=https://placeholder.up.railway.app
  NEXT_PUBLIC_APP_URL=https://placeholder.up.railway.app
  NODE_ENV=production
  ```

Note: `DATABASE_URL` is injected automatically by Railway from the Postgres service — do not set it manually.

---

### Task 5: Deploy and get public domain

- [ ] **Step 1: Trigger first deploy**

Call `mcp__railway-mcp-server__deploy` with:
- `workspacePath`: `/Users/user/Desktop/tenant-platform`
- `ci`: `true`

This uploads local files and streams build logs. The build runs `prisma generate` then `turbo build --filter=@rental-trust/web`.

- [ ] **Step 2: Check build logs for errors**

Call `mcp__railway-mcp-server__get-logs` with:
- `workspacePath`: `/Users/user/Desktop/tenant-platform`
- `logType`: `build`
- `lines`: `50`

Expected: no errors, ends with `Route (app)` table from Next.js build output.

- [ ] **Step 3: Generate public domain**

Call `mcp__railway-mcp-server__generate-domain` with:
- `workspacePath`: `/Users/user/Desktop/tenant-platform`

Note the returned URL (e.g. `rental-trust-staging-web.up.railway.app`).

---

### Task 6: Update URL vars and redeploy

- [ ] **Step 1: Update NEXTAUTH_URL and NEXT_PUBLIC_APP_URL**

Call `mcp__railway-mcp-server__set-variables` with:
- `workspacePath`: `/Users/user/Desktop/tenant-platform`
- `skipDeploys`: `true`
- `variables`:
  ```
  NEXTAUTH_URL=https://<domain-from-task-5-step-3>
  NEXT_PUBLIC_APP_URL=https://<domain-from-task-5-step-3>
  ```

- [ ] **Step 2: Redeploy with correct URLs**

Call `mcp__railway-mcp-server__deploy` with:
- `workspacePath`: `/Users/user/Desktop/tenant-platform`
- `ci`: `true`

- [ ] **Step 3: Verify deployment is running**

Call `mcp__railway-mcp-server__get-logs` with:
- `workspacePath`: `/Users/user/Desktop/tenant-platform`
- `logType`: `deploy`
- `lines`: `20`

Expected: `✓ Ready` or `Listening on port 3000` in logs. Visit the Railway URL in a browser — should see the Next.js app.
