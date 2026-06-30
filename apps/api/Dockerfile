# =============================================================================
# Nexa API — Multi-stage production Dockerfile (ARM64)
# Build context: repo root (run from monorepo root with -f apps/api/Dockerfile.arm64)
# =============================================================================

# ---- Stage 1: Install dependencies -----------------------------------------
FROM --platform=linux/arm64 node:22-alpine AS deps

# pnpm is included in modern Node images via corepack
RUN corepack enable && corepack prepare pnpm@10.33.2 --activate

WORKDIR /app

# Copy workspace config first (better layer caching)
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./

# Copy only the package.json files pnpm needs to resolve the workspace graph
COPY packages/shared/package.json packages/shared/package.json
COPY apps/api/package.json apps/api/package.json

# Install all dependencies (including devDependencies for the build stage)
RUN pnpm install --frozen-lockfile

# ---- Stage 2: Build --------------------------------------------------------
FROM --platform=linux/arm64 deps AS build

WORKDIR /app

# Copy source code for shared + api
COPY packages/shared/ packages/shared/
COPY apps/api/ apps/api/

# Build @nexa/shared first (API depends on it at compile time)
RUN pnpm --filter @nexa/shared run build

# Build the NestJS API
RUN pnpm --filter @nexa/api run build

# Prune devDependencies — keep only production deps for the final image
RUN pnpm --filter @nexa/api --prod deploy --legacy /app/pruned

# ---- Stage 3: Production runtime -------------------------------------------
FROM --platform=linux/arm64 node:22-alpine AS production

# Security: run as non-root
RUN apk add --no-cache dumb-init curl

WORKDIR /app

# Copy the pruned production deployment
COPY --from=build /app/pruned/node_modules ./node_modules
COPY --from=build /app/pruned/package.json ./package.json
COPY --from=build /app/apps/api/dist ./dist

# Switch to non-root user (built into node images)
USER node

# NestJS default port
EXPOSE 3000

# Use dumb-init as PID 1 for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
