# =============================================================================
# Nexa Web — Multi-stage production Dockerfile
# Build context: repo root (run from monorepo root with -f apps/web/Dockerfile)
# =============================================================================

# ---- Stage 1: Build ---------------------------------------------------------
FROM node:22-alpine AS build

# pnpm is included in modern Node images via corepack
RUN corepack enable && corepack prepare pnpm@10.33.2 --activate

WORKDIR /app

# Copy workspace config first (better layer caching)
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./

# Copy package.json files
COPY packages/shared/package.json packages/shared/package.json
COPY apps/web/package.json apps/web/package.json

# Install all dependencies (including devDependencies for build)
RUN pnpm install --frozen-lockfile

# Copy source code for shared + web
COPY packages/shared/ packages/shared/
COPY apps/web/ apps/web/

# Build @nexa/shared first
RUN pnpm --filter @nexa/shared run build

# Build the Vite Web App
# Note: In production, we might want to inject VITE_* environment variables at build-time.
# For now we use default placeholders or the values in the root .env / CI.
ARG VITE_API_BASE_URL=/api
ARG VITE_GOOGLE_MAPS_KEY=""
ARG VITE_STRIPE_PUBLISHABLE_KEY=""

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_GOOGLE_MAPS_KEY=$VITE_GOOGLE_MAPS_KEY
ENV VITE_STRIPE_PUBLISHABLE_KEY=$VITE_STRIPE_PUBLISHABLE_KEY

RUN pnpm --filter @nexa/web run build

# ---- Stage 2: Production runtime (Nginx) ------------------------------------
FROM nginx:alpine AS production

# Copy custom Nginx configuration for single page application routing
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

# Copy static assets from build stage
COPY --from=build /app/apps/web/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
