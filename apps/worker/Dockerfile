FROM node:20-slim AS base
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

# Copy workspace config
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml turbo.json ./

# Copy package.jsons for dependency resolution
COPY packages/db/package.json ./packages/db/package.json
COPY packages/shared/package.json ./packages/shared/package.json
COPY apps/worker/package.json ./apps/worker/package.json

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source
COPY packages/ ./packages/
COPY apps/worker/ ./apps/worker/

# Generate Prisma client
RUN pnpm --filter @cultivated-crm/db db:generate

# Build
RUN pnpm --filter @cultivated-crm/worker build

CMD ["node", "apps/worker/dist/index.js"]
