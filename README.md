# RentalTrust

> A platform where landlords manage rental applications in one place and tenants share verified documents without emailing anyone their passport.

**Read [`CLAUDE.md`](./CLAUDE.md) before writing any code.**

---

## One-Time Setup

### 1. Create the GitHub Repository
```bash
# In your terminal (after cloning this folder)
cd tenant-platform
git init
git add .
git commit -m "chore: initial scaffold"

# Create repo on GitHub, then push
git remote add origin https://github.com/fahadu8/rental-trust.git
git branch -M main
git push -u origin main

# Create dev branch
git checkout -b dev
git push -u origin dev
```

### 2. Protect Branches (GitHub → Settings → Branches)
- `main`: Require PR, require CI pass, require 1 approval, no direct push
- `dev`: Require CI pass, no direct push

### 3. Connect Linear to GitHub
Linear → Settings → Integrations → GitHub → connect `fahadu8/rental-trust`
This auto-closes Linear tickets when a PR with `[LIN-XXX]` merges.

### 4. Install Dependencies
```bash
# Node >= 20 required. Use nvm to install:
nvm install node --default
node --version   # should show v20+

npm install
```

### 5. Configure Environment
```bash
cp .env.example .env.local
# Fill in all values — see comments in .env.example
```

### 6. Set Up Database
```bash
# Start local Postgres (Docker recommended)
docker run --name rentaltrust-db -e POSTGRES_PASSWORD=dev -p 5432:5432 -d postgres:16

# Run initial migration
npm run db:push
npm run db:generate
```

### 7. Open in Cursor
Open the `tenant-platform` folder in Cursor. The `.cursorrules` file loads automatically — agents will follow project conventions.

---

## Starting the App

### Frontend only (Next.js dev server)
```bash
npm run dev --workspace=apps/web
# → http://localhost:3000
```

### Full stack (frontend + backend + database via Docker)
```bash
docker-compose up
# Frontend → http://localhost:3000
# Backend  → http://localhost:3001
# Postgres → localhost:5432
```

### Check everything is working
```bash
npm run typecheck   # TypeScript — no errors
npm run lint        # ESLint — no warnings
npm test            # Jest — all tests green
```

---

## Daily Development Workflow

```
1. Pick a ticket from Linear (Sprint board)
2. Create branch:
   git checkout dev
   git pull
   git checkout -b feature/LIN-XXX-short-description

3. Open Cursor — agent reads CLAUDE.md + .cursorrules automatically
4. Build the feature
5. Run checks locally:
   npm run typecheck
   npm run lint
   npm test

6. Push and open PR:
   git push -u origin feature/LIN-XXX-short-description
   # Open PR on GitHub — use the PR template
   # Title format: [LIN-123] Short description

7. CI runs automatically (TypeScript + lint + test + build)
8. Fahad reviews and approves
9. Squash merge to dev
10. Linear ticket auto-closes
```

---

## Project Structure

```
rental-trust/
├── CLAUDE.md                    # Agent brain — read before every session
├── .cursorrules                 # Cursor agent rules
├── .env.example                 # Environment variable template
├── linear-structure.md          # Full Linear epic + ticket breakdown
│
├── apps/
│   └── web/                     # Next.js 14 App Router
│       └── src/
│           ├── app/
│           │   ├── (landlord)/  # Landlord-authenticated routes
│           │   ├── (tenant)/    # Tenant-authenticated routes
│           │   ├── api/         # API routes
│           │   └── apply/[slug]/# Public apply link (unauthenticated)
│           ├── components/      # Shared UI components
│           ├── lib/             # api.ts, utils.ts
│           ├── types/           # IO-TS codecs + branded types
│           └── styles/          # Tailwind globals
│
├── packages/
│   └── database/
│       ├── prisma/
│       │   ├── schema.prisma    # The schema — single source of truth
│       │   └── migrations/      # Never edit manually
│       └── src/
│           └── index.ts         # Prisma singleton + re-exported types
│
└── .github/
    ├── PULL_REQUEST_TEMPLATE.md
    ├── ISSUE_TEMPLATE/
    │   └── feature.yml
    └── workflows/
        └── ci.yml               # TypeScript + lint + test + build on every PR
```

---

## Key Commands

| Command | What it does |
|---------|-------------|
| `npm run dev --workspace=apps/web` | Start frontend dev server (port 3000) |
| `docker-compose up` | Start all services (FE + BE + Postgres) |
| `npm run typecheck` | TypeScript check across all packages |
| `npm run lint` | ESLint across all packages |
| `npm test` | Run tests across all packages |
| `npm run db:migrate:dev` | Create a new Prisma migration |
| `npm run db:studio` | Open Prisma Studio (DB browser) |

---

## Source of Truth Hierarchy

1. `RentalTrust_ProductMaster.md` — product decisions, MVP scope, constitution
2. `CLAUDE.md` — engineering decisions derived from the ProductMaster
3. `packages/database/prisma/schema.prisma` — data model
4. Linear tickets — what is being built right now

Any conflict between these → ProductMaster wins.
