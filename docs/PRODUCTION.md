# Production deployment (hardened)

Target setup:
- Web: Vercel
- Worker: Fly.io
- DB: Supabase Postgres
- Redis queue: Fly Redis (or any persistent Redis)
- Realtime: Ably

## 1) Database (Supabase)

You need two URLs:
- `DATABASE_URL` = pooled/pgbouncer URL (recommended for app runtime)
- `DIRECT_URL` = direct connection URL (for migrations)

The Prisma datasource uses:
- `url = env("DATABASE_URL")`
- `directUrl = env("DIRECT_URL")`

## 2) Migrations (Prisma)

Local:
- `pnpm db:migrate:dev`

Production:
- Run migrations in CI or a one-off job:
  - `pnpm --filter @cultivated-crm/db db:migrate:deploy`

Avoid using `db:push` in production.

## 3) Web (Vercel)

Set env vars in Vercel for `apps/web`:
- `DATABASE_URL`
- `DIRECT_URL`
- `NEXTAUTH_URL` (your Vercel URL)
- `NEXTAUTH_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `NEXT_PUBLIC_ABLY_API_KEY` (client subscribe key OR token approach)
- (optional) `ABLY_API_KEY` (only if web publishes events)
- (optional) `RESEND_API_KEY`, `EMAIL_FROM`

## 4) Worker (Fly)

From `apps/worker`:

```bash
fly launch --no-deploy
fly secrets set DATABASE_URL=... DIRECT_URL=... REDIS_QUEUE_URL=... ABLY_API_KEY=...
fly deploy
```

## 5) Redis queue

- Use a persistent Redis for BullMQ (`REDIS_QUEUE_URL`)
- Local dev can use Docker:
  - `docker run -d -p 6379:6379 --name redis-dev redis:7`
  - queue url: `redis://localhost:6379/1`

## 6) Runtime safety

All API routes under `apps/web/src/app/api/**/route.ts` are forced to Node runtime:
- `export const runtime = "nodejs";`

This avoids Edge runtime incompatibilities with Prisma.
