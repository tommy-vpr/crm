# Cultivated CRM

Custom CRM built for Cultivated Agency.

## Tech Stack

- **Monorepo:** Turborepo + pnpm workspaces
- **Frontend:** Next.js 15 (App Router), React 19, TanStack Query, Zustand
- **Backend:** Next.js API routes (Node.js runtime, not Edge)
- **Database:** PostgreSQL (Prisma ORM, Supabase-ready with `directUrl`)
- **Real-time:** Ably pub/sub (CDN client + raw REST server — no SDK bundling)
- **Background Jobs:** BullMQ + Redis (DLQ, exponential backoff, idempotency)
- **Auth:** NextAuth v5 (Google OAuth, PrismaAdapter)
- **UI:** Tailwind CSS + custom components
- **Deployment:** Vercel (web) + Fly.io (worker)

## Project Structure

```
cultivated-crm/
├── apps/
│   ├── web/                        # Next.js web application
│   │   ├── .env.local              # ← Web env vars (create from .env.example)
│   │   └── src/
│   │       ├── app/
│   │       │   ├── (auth)/         # Login page
│   │       │   ├── (dashboard)/    # Protected pages
│   │       │   └── api/            # API routes (all runtime = "nodejs")
│   │       ├── components/         # UI (layout, forms, cards, primitives)
│   │       ├── hooks/              # React Query + custom hooks
│   │       ├── services/           # API client fetch functions
│   │       ├── lib/                # Core: auth, events, ably, rate-limit
│   │       └── stores/             # Zustand (UI state only)
│   │
│   └── worker/                     # BullMQ background workers
│       ├── .env                    # ← Worker env vars (create from .env.example)
│       ├── Dockerfile / fly.toml   # Fly.io deployment
│       └── src/
│           ├── env.ts              # Env loader (worker .env → root fallback)
│           ├── queues/index.ts     # Queues, DLQ, backoff, idempotency
│           └── workers/            # automation, notification, email
│
├── packages/
│   ├── db/                         # Prisma schema + client
│   └── shared/                     # Types, Zod schemas, RBAC, encryption
│
├── .github/workflows/ci.yml       # CI: type check → build → migrate deploy
├── docs/PRODUCTION.md              # Production deployment guide
└── .nvmrc                          # Node 20
```

## Getting Started

### Prerequisites

- **Node.js 20.x** (use `nvm use` — `.nvmrc` included)
- **pnpm >= 9**
- **PostgreSQL** (local, Neon, or Supabase)
- **Redis** (local via Docker, or Railway/Upstash)

### Setup

```bash
# 1. Clone and install
git clone <repo-url>
cd cultivated-crm
nvm use
pnpm install

# 2. Environment variables — EACH APP HAS ITS OWN ENV FILE
#    Root .env is NOT automatically shared between apps.

# Web app:
cp apps/web/.env.example apps/web/.env.local
# → Fill in DATABASE_URL, NEXTAUTH_SECRET, GOOGLE_CLIENT_ID, etc.

# Worker (only needed if running background jobs):
cp apps/worker/.env.example apps/worker/.env
# → Fill in DATABASE_URL, REDIS_QUEUE_URL, ABLY_API_KEY

# 3. Generate NEXTAUTH_SECRET
openssl rand -base64 32
# Paste into apps/web/.env.local as NEXTAUTH_SECRET=<value>

# 4. Setup database
pnpm db:generate        # Generate Prisma client
pnpm db:push            # Push schema to database
pnpm db:seed            # Seed with sample data (optional)

# 5. Apply search indexes (optional)
psql $DATABASE_URL -f packages/db/prisma/migrations/001_search_indexes.sql

# 6. Start development
pnpm dev                # Starts web (port 3000) + worker
```

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create OAuth 2.0 Client ID (Web application)
3. Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
4. Copy Client ID + Secret into `apps/web/.env.local`

### Ably Setup

- **Server** (`ABLY_API_KEY`): Full key — used by `events.ts` via raw REST fetch
- **Client** (`NEXT_PUBLIC_ABLY_API_KEY`): Use a **subscribe-only** restricted key. Never expose a full API key to the browser. Create a restricted key in the Ably dashboard with subscribe-only capabilities.

### Commands

| Command | Description |
|---|---|
| `pnpm dev` | Start all apps in dev mode |
| `pnpm build` | Production build |
| `pnpm db:generate` | Regenerate Prisma client |
| `pnpm db:push` | Push schema (dev only) |
| `pnpm db:seed` | Seed sample data |
| `pnpm db:studio` | Open Prisma Studio |
| `pnpm db:migrate:dev` | Create a migration |
| `pnpm db:migrate:deploy` | Apply migrations (production) |

### Development URLs

- **Web app:** http://localhost:3000
- **Health check:** http://localhost:3000/api/health
- **Prisma Studio:** http://localhost:5555

## Security

- Security headers (CSP, X-Frame-Options, HSTS, etc.) via middleware
- CORS enforcement with origin whitelist
- Rate limiting on all API routes (sliding window, per-user/IP)
- Body size limits (1 MB default, 413 on oversized)
- RBAC permission checks on every endpoint
- `export const runtime = "nodejs"` on all 22 API routes

## Production

See `docs/PRODUCTION.md` for Vercel + Fly.io + Supabase + Redis deployment guide.
