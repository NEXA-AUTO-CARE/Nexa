# NEXA

Mobile-first marketplace connecting private vehicle owners with professional car-detailing vendors. MVP launches in **Aberdeen, Scotland**.

A customer signs up → registers a vehicle → books a wash at a chosen address and time → pays via Stripe → an admin assigns a vendor → the vendor uploads before/after photos and completes the job → the customer leaves a 1–5★ review. Email + SMS notifications fire at every lifecycle event.

Full product spec: [docs/NEXA_MVP_PRD.docx](docs/NEXA_MVP_PRD.docx). Phase 1 build plan: [PHASE1_PLAN.md](PHASE1_PLAN.md).

---

## Tech Stack

| Layer | Choice |
|---|---|
| Backend | NestJS 11 + TypeORM + Postgres 16 |
| Frontend | React 19 + Vite 8 + React Router + TanStack Query + Tailwind v4 |
| Auth | JWT access (15min) + opaque refresh token (30d, HTTP-only cookie, SHA-256 hashed in DB) |
| Payments | Stripe (manual capture + Transfers for vendor payout) — *Sprint 4* |
| Notifications | Twilio SMS + nodemailer SMTP — *Sprint 5* |
| Maps | Google Maps Places + Geocoding — *Sprint 3* |
| Photo storage | AWS S3 in prod, MinIO in Docker for local dev — *Sprint 5* |
| Monorepo | pnpm workspaces |
| Shared contracts | `@nexa/shared` — DTOs, enums, types — compiled to `dist/` |

---

## Monorepo Layout

```
Nexa/
├── apps/
│   ├── api/        @nexa/api  — NestJS REST API
│   └── web/        @nexa/web  — React + Vite SPA
├── packages/
│   └── shared/     @nexa/shared — DTOs, enums, types (compiled to dist/)
├── docs/           Product spec
├── docker-compose.yml  Postgres 16 + MinIO + bucket bootstrap
├── PHASE1_PLAN.md  Detailed 6-sprint build plan
└── .env.example    Copy to `.env`
```

---

## Prerequisites

- **Node.js 22+**
- **pnpm 10+** (`npm i -g pnpm`)
- **PostgreSQL 13+** — either:
  - run `docker compose up -d postgres` (uses `postgres:16-alpine`), **or**
  - point `DATABASE_URL` at any existing Postgres instance (e.g. TimescaleDB)
- **Docker** (optional, only for MinIO photo storage in Sprint 5)
- **Stripe CLI** (optional, only for Sprint 4 webhook testing)

---

## First-time Setup

```sh
# 1. Install dependencies for all workspace packages
pnpm install

# 2. Copy env template and edit values (DATABASE_URL, JWT secrets, etc.)
cp .env.example .env

# 3. Build the shared contracts package (must come before running api/web)
pnpm -F @nexa/shared build

# 4. Apply database migrations
pnpm -F @nexa/api db:migrate

# 5. Start everything in dev mode (shared watcher + api + web)
pnpm dev
```

The web app runs on http://localhost:5173 and proxies `/api/*` → `http://localhost:3000`.

---

## Day-to-day Commands

| Command | What it does |
|---|---|
| `pnpm dev` | Build shared + start api/web/shared in parallel watch mode |
| `pnpm dev:api` | Same, but only shared watcher + api |
| `pnpm dev:web` | Same, but only shared watcher + web |
| `pnpm build` | Production build of every workspace package |
| `pnpm -F @nexa/shared build` | Recompile shared (required after editing `packages/shared/src/`) |
| `pnpm -F @nexa/api db:migrate` | Apply pending TypeORM migrations |
| `pnpm -F @nexa/api db:migrate:revert` | Roll back the most recent migration |
| `pnpm -F @nexa/api db:migration:generate src/database/migrations/<Name>` | Auto-generate a migration from entity diffs |
| `pnpm -F @nexa/api start:dev` | Run only the API in watch mode |
| `pnpm -F @nexa/web dev` | Run only the web app |

---

## Environment Variables

See [.env.example](.env.example) for the full list. Key ones:

- `DATABASE_URL` — Postgres connection string. SSL params (e.g. `?sslmode=require`) are auto-stripped and replaced with `rejectUnauthorized: false` in dev to handle self-signed certs.
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` — at least 32 chars each.
- `WEB_ORIGIN` — allowed CORS origin (default `http://localhost:5173`).
- `OTP_DEV_LOG=true` — print OTP codes to API stdout instead of sending SMS (replaced by Twilio in Sprint 5).
- `MOCK_PAYMENTS=true` — accept the Sprint 3 mock-pay endpoint even after Stripe is wired (Sprint 4).
- `VITE_API_BASE_URL=/api` — keep relative to use the Vite dev-proxy.

---

## Auth Flow

The full signup/login pipeline is implemented in Sprint 2.

1. **`POST /api/auth/signup`** — `{ identifier, role, displayName }`
   - `identifier` is email **or** phone (E.164 style)
   - Creates a pending user (`otpVerified: false`, no password) and dispatches an OTP
   - In dev, OTP is logged to API stdout: `[OTP] alice@example.com -> 482917`
2. **`POST /api/auth/verify-otp`** — `{ identifier, code }` → `{ setupToken }` (5-minute JWT)
3. **`POST /api/auth/set-password`** — `{ setupToken, password }` → `{ accessToken, user }` and sets `nexa_rt` cookie
4. **`POST /api/auth/login`** — `{ identifier, password }` → same response shape
5. **`POST /api/auth/refresh`** — reads `nexa_rt` cookie, rotates refresh, issues new access
6. **`POST /api/auth/logout`** — revokes refresh token, clears cookie

Every other route is JWT-protected by default via a global `JwtAuthGuard`. Use `@Public()` to opt out and `@Roles(UserRole.ADMIN)` to require a role.

---

## Domain Model

Six tables defined in [apps/api/src/database/entities/](apps/api/src/database/entities/):

| Table | Purpose |
|---|---|
| `users` | customers / vendors / admins, OTP-verified, optional password |
| `vehicles` | per-customer "garage" |
| `bookings` | service request with status (`booked → accepted → in_progress → completed`, plus `cancelled`) |
| `payments` | Stripe PaymentIntent + amounts + payout state |
| `job_photos` | before/after S3 keys |
| `reviews` | one per booking, 1–5★ + optional comment |

Plus auth-only tables: `otp_codes`, `refresh_tokens`.

---

## Sprint Status

| Sprint | Theme | Status |
|---|---|---|
| 1 | Foundations: Docker, env, TypeORM, 6 entities, init migration | ✅ Complete |
| 2 | Auth: signup/OTP/JWT/refresh, Users module, web auth shell | ✅ Complete |
| 3 | Vehicles + Bookings + mock pay (with Google Maps autocomplete) | ⏳ Next |
| 4 | Real Stripe (PaymentIntents, webhooks, refunds, vendor payouts) | ⏳ |
| 5 | Vendor flow + S3 photo uploads + Twilio (SMS + email) | ⏳ |
| 6 | Reviews + Admin dashboard + seed script + CI | ⏳ |

See [PHASE1_PLAN.md](PHASE1_PLAN.md) for the task-level breakdown.

---

## Manual Smoke Test (current state)

After `pnpm dev`:

1. Visit http://localhost:5173/signup
2. Enter an email or phone, name, choose Customer or Vendor
3. Watch the API console — it prints the OTP
4. Verify the code → set a password → land on `/garage` with a logged-in placeholder
5. Refresh the browser — silent refresh keeps you logged in
6. Click **Log out** — cookie cleared, redirected to `/login`

API health check (no auth): `curl http://localhost:3000/` → `Hello World!`
Authenticated probe: `curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/users/me`

---

## License

UNLICENSED — internal Nexa project.
