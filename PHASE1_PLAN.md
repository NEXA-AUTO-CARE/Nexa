# NEXA — Phase 1 Build Plan (Weeks 1–6)

## Context

**Why this plan exists.** The Nexa monorepo is a fresh pnpm scaffold (NestJS starter + React/Vite starter + a one-file shared package). The PRD at [docs/NEXA_MVP_PRD.docx](docs/NEXA_MVP_PRD.docx) defines a Phase 1 MVP for a car-detailing marketplace launching in Aberdeen, Scotland. Phase 1 must deliver the full transaction loop end-to-end so the team can validate three hypotheses: customer demand, vendor supply, and unit economics.

**What "done" looks like.** A customer can sign up, verify by OTP, register a vehicle, book a wash with a geocoded address, pay through Stripe, get matched to a vendor by an admin, receive before/after photos when the vendor completes the job, and leave a 1–5 star review. Notifications fire at every lifecycle event over email + SMS.

**Stack (locked in).**
- Backend: NestJS 11 + TypeORM + Postgres 16 (Docker locally, AWS RDS in prod)
- Frontend: React 19 + Vite 8 + React Router + TanStack Query + Tailwind
- Auth: JWT access (15min) + refresh token (30d, HTTP-only cookie)
- Payments: Stripe (manual capture + Transfers for vendor payout)
- Notifications: Twilio SMS + nodemailer SMTP
- Maps: Google Maps Places + Geocoding
- Photos: AWS S3 in prod, MinIO in Docker for dev (same S3 SDK)
- Contracts: All DTOs/enums in `@nexa/shared`

**Three architectural decisions baked in.**
1. **OTP-first, Twilio later** — Sprints 1–4 log OTPs to console so we ship auth without Twilio creds. Sprint 5 swaps in real delivery.
2. **Mock pay, then Stripe** — Sprint 3 ships the full booking flow with a mock pay endpoint. Sprint 4 replaces it with real PaymentIntents + webhook capture.
3. **`@nexa/shared` is the contract** — Every enum and DTO lives there; both apps import from it. Pays off in every sprint.

---

## Domain entities (all six built in Sprint 1)

| Table | Key columns |
|---|---|
| `users` | user_id (uuid), email/phone (unique nullable), password_hash, role (customer\|vendor\|admin), display_name, otp_verified |
| `vehicles` | vehicle_id, owner_id→users, registration_number, make, model, vehicle_type (car\|van\|suv\|other), colour |
| `bookings` | booking_id, user_id→users, vehicle_id→vehicles, vendor_id→users (nullable), service_type (basic\|full\|premium), booking_time, service_address, lat/lng, price (decimal GBP), status |
| `payments` | payment_id, booking_id→bookings (UNIQUE), stripe_payment_intent_id, amount, platform_fee, vendor_payout, status (pending\|captured\|refunded), paid_out_at |
| `job_photos` | photo_id, booking_id, vendor_id, photo_type (before\|after), storage_url (S3 key), confirmed_at |
| `reviews` | review_id, booking_id (UNIQUE → one per booking), user_id, vendor_id, rating (1–5), comment |

**Booking status machine:** `BOOKED → ACCEPTED → IN_PROGRESS → COMPLETED` with `→ CANCELLED` allowed before completion.

---

## Sprint 1 — Foundations (Week 1)

**Critical files:** [docker-compose.yml](docker-compose.yml), [apps/api/src/data-source.ts](apps/api/src/data-source.ts), [apps/api/src/database/entities/](apps/api/src/database/entities/), [apps/api/src/database/migrations/](apps/api/src/database/migrations/), [packages/shared/src/index.ts](packages/shared/src/index.ts).

**Install:**
```
pnpm add -F @nexa/api @nestjs/typeorm typeorm pg @nestjs/config class-validator class-transformer
pnpm add -DF @nexa/api @types/pg
```

**Shared additions:** `enums/` (UserRole, VehicleType, ServiceType, BookingStatus, PaymentStatus, PhotoType), `types/api-response.ts`, barrel export.

### 1.1 — Docker Compose (Postgres 16 + MinIO)
- Files: [docker-compose.yml](docker-compose.yml), [.env.example](.env.example), update [.gitignore](.gitignore) (add `.env`).
- `postgres:16-alpine` on 5432; `minio/minio` on 9000/9001 with `nexa-photos` bucket bootstrapped via a `minio-setup` one-shot service running `mc mb`. Named volumes `nexa_pg_data`, `nexa_minio_data`.
- **Verify:** `docker compose up -d && docker compose ps` shows healthy; `psql postgresql://nexa:nexa@localhost:5432/nexa -c '\l'` connects.

### 1.2 — Shared package: enums + base types
- Files: [packages/shared/src/enums/](packages/shared/src/enums/) (one file per enum), [packages/shared/src/types/api-response.ts](packages/shared/src/types/api-response.ts), rewrite [packages/shared/src/index.ts](packages/shared/src/index.ts) as barrel.
- TS string enums (`CUSTOMER='customer'`) so values map 1:1 to Postgres enum types.
- **Verify:** `pnpm -F @nexa/api exec tsc --noEmit` and `pnpm -F @nexa/web exec tsc --noEmit` succeed importing `import { UserRole } from '@nexa/shared'`.

### 1.3 — ConfigModule + typed env
- Files: [apps/api/src/config/configuration.ts](apps/api/src/config/configuration.ts), [apps/api/src/config/env.validation.ts](apps/api/src/config/env.validation.ts), modify [apps/api/src/app.module.ts](apps/api/src/app.module.ts), [apps/api/.env.example](apps/api/.env.example).
- `class-validator`-based schema. Keys: `DATABASE_URL`, `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET`, `JWT_ACCESS_TTL`/`JWT_REFRESH_TTL`, `S3_ENDPOINT`/`S3_BUCKET`/`S3_KEY`/`S3_SECRET`, `STRIPE_SECRET`/`STRIPE_WEBHOOK_SECRET`, `TWILIO_SID`/`TWILIO_TOKEN`/`TWILIO_FROM`, `GOOGLE_MAPS_KEY`, `WEB_ORIGIN`.
- **Verify:** `pnpm -F @nexa/api start:dev` boots; missing `DATABASE_URL` throws on startup.

### 1.4 — TypeORM data source + 6 entities
- Files: [apps/api/src/data-source.ts](apps/api/src/data-source.ts), [apps/api/src/database/database.module.ts](apps/api/src/database/database.module.ts), six entity files in [apps/api/src/database/entities/](apps/api/src/database/entities/).
- UUID PKs, `@Index({ unique: true })` on `users.email` and `users.phone_number` (both nullable), `decimal(10,2)` for money, Postgres `enum` columns, `synchronize: false` always.
- **Verify:** `pnpm -F @nexa/api exec tsc --noEmit` clean.

### 1.5 — Initial migration + npm scripts
- Files: [apps/api/src/database/migrations/1700000000000-Init.ts](apps/api/src/database/migrations/1700000000000-Init.ts), update [apps/api/package.json](apps/api/package.json) with `db:migrate`, `db:migrate:revert`, `db:migration:generate`, `db:migration:create` wrapping `typeorm-ts-node-commonjs migration:*` against `src/data-source.ts`.
- FKs: `ON DELETE CASCADE` for vehicles→users and bookings→vehicles; `ON DELETE SET NULL` for `bookings.vendor_id`. Unique on `payments.booking_id` and `reviews.booking_id`.
- **Verify:** `pnpm -F @nexa/api db:migrate` exits 0; `\dt` shows 6 tables + `migrations`.

---

## Sprint 2 — Auth + Users (Week 2)

**Critical files:** [apps/api/src/modules/auth/](apps/api/src/modules/auth/), [apps/api/src/common/guards/](apps/api/src/common/guards/), [apps/web/src/lib/api-client.ts](apps/web/src/lib/api-client.ts), [apps/web/src/contexts/AuthContext.tsx](apps/web/src/contexts/AuthContext.tsx).

**Install:**
```
pnpm add -F @nexa/api @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt cookie-parser
pnpm add -DF @nexa/api @types/passport-jwt @types/bcrypt @types/cookie-parser
pnpm add -F @nexa/web react-router-dom @tanstack/react-query axios tailwindcss @tailwindcss/vite zod react-hook-form @hookform/resolvers
```

**Shared additions:** `dto/auth/` (signup, verify-otp, set-password, login, refresh, auth-response), `types/public-user.ts`.

### 2.1 — Users module
- Files: [apps/api/src/modules/users/](apps/api/src/modules/users/) (module, service, controller, update DTO).
- Endpoints: `GET /users/me` (JWT), `PATCH /users/me`. Service: `findByEmailOrPhone`, `createOtpPending`, `setPassword`, `markOtpVerified`.
- **Verify:** After 2.4, `curl -H "Authorization: Bearer $T" .../users/me` returns user JSON.

### 2.2 — OTP service (console delivery)
- Files: [apps/api/src/modules/auth/otp.service.ts](apps/api/src/modules/auth/otp.service.ts), [apps/api/src/database/entities/otp-code.entity.ts](apps/api/src/database/entities/otp-code.entity.ts), migration `1700000000100-AddOtpCodes.ts`.
- `otp_codes`: `id, identifier, code (6 digit), expires_at, consumed_at`. `issue()` writes row + `console.log('[OTP] %s -> %s', identifier, code)`. `verify()` checks unconsumed/unexpired (10 min TTL) and marks consumed.
- **Verify:** Calling `/auth/signup` prints OTP to API stdout.

### 2.3 — Auth endpoints (signup → verify → set-password → login)
- Files: [apps/api/src/modules/auth/](apps/api/src/modules/auth/) (module, service, controller).
- `POST /auth/signup { identifier, role }` → pending user + OTP.
- `POST /auth/verify-otp { identifier, code }` → short-lived setup token.
- `POST /auth/set-password { setupToken, password }` → bcrypt + access/refresh.
- `POST /auth/login { identifier, password }`. Refresh as HTTP-only `Secure SameSite=Lax` cookie `nexa_rt`.
- **Verify:** `curl` chain returns access token; protected route succeeds with it.

### 2.4 — JWT strategy, refresh rotation, role guards
- Files: [apps/api/src/modules/auth/strategies/jwt.strategy.ts](apps/api/src/modules/auth/strategies/jwt.strategy.ts), [apps/api/src/common/guards/](apps/api/src/common/guards/) (jwt-auth, roles), [apps/api/src/common/decorators/](apps/api/src/common/decorators/) (roles, current-user, public). Modify [apps/api/src/main.ts](apps/api/src/main.ts) (cookieParser + CORS for `WEB_ORIGIN` with credentials).
- `POST /auth/refresh` rotates via `refresh_tokens` table (`id, user_id, token_hash, expires_at, revoked_at`); migration `1700000000200-AddRefreshTokens.ts`.
- **Verify:** Hit `@Roles(ADMIN)` stub as customer → 403; as admin → 200.

### 2.5 — Web auth shell
- Files: [apps/web/tailwind.config.ts](apps/web/tailwind.config.ts), [apps/web/postcss.config.js](apps/web/postcss.config.js), [apps/web/src/index.css](apps/web/src/index.css), update [apps/web/vite.config.ts](apps/web/vite.config.ts) (add `@tailwindcss/vite`), [apps/web/src/main.tsx](apps/web/src/main.tsx) (QueryClientProvider + BrowserRouter), [apps/web/src/lib/api-client.ts](apps/web/src/lib/api-client.ts) (axios with `withCredentials`, 401→refresh interceptor), [apps/web/src/contexts/AuthContext.tsx](apps/web/src/contexts/AuthContext.tsx), [apps/web/src/routes/ProtectedRoute.tsx](apps/web/src/routes/ProtectedRoute.tsx), [apps/web/src/pages/](apps/web/src/pages/) (Signup, Otp, SetPassword, Login), update [apps/web/src/App.tsx](apps/web/src/App.tsx) (routes).
- Forms: react-hook-form + zod resolvers using shared DTO types.
- **Verify:** `pnpm dev` → walk signup → read OTP from API console → verify → set password → land on `/garage` placeholder.

---

## Sprint 3 — Vehicles + Bookings + Mock Pay (Week 3)

**Critical files:** [apps/api/src/modules/vehicles/](apps/api/src/modules/vehicles/), [apps/api/src/modules/bookings/](apps/api/src/modules/bookings/), [apps/api/src/modules/payments/payments.service.ts](apps/api/src/modules/payments/payments.service.ts) (mock), [apps/web/src/pages/GaragePage.tsx](apps/web/src/pages/GaragePage.tsx), [apps/web/src/pages/BookingWizard.tsx](apps/web/src/pages/BookingWizard.tsx).

**Install:**
```
pnpm add -F @nexa/web @react-google-maps/api use-places-autocomplete date-fns
```

**Shared additions:** `dto/vehicles/` (create/update/vehicle), `dto/bookings/` (create, booking, update-status), `dto/payments/mock-pay`, `pricing/service-pricing.ts` (`ServiceType → { basePriceGbp, platformFeePct: 0.15 }`).

### 3.1 — Vehicles CRUD scoped to owner
- Files: [apps/api/src/modules/vehicles/](apps/api/src/modules/vehicles/).
- `POST/GET/GET:id/PATCH/DELETE /vehicles` — JWT + ownership check (throw `ForbiddenException` if `vehicle.owner_id !== currentUser.user_id`). Customer role only.
- **Verify:** `curl -X POST .../vehicles ...` returns 201; `GET /vehicles` lists own only.

### 3.2 — Bookings create/list/get with server-side pricing
- Files: [apps/api/src/modules/bookings/](apps/api/src/modules/bookings/).
- `POST /bookings { vehicleId, serviceType, bookingTime, serviceAddress, latitude, longitude }` → price from `service-pricing.ts`, status `BOOKED`, `vendor_id=null`.
- `GET /bookings` role-filtered (customer: own; vendor: assigned; admin: all). `GET /bookings/:id` same scope check.
- **Verify:** Created booking `price` matches shared pricing table.

### 3.3 — Booking status state machine
- Files: [apps/api/src/modules/bookings/booking-status.machine.ts](apps/api/src/modules/bookings/booking-status.machine.ts), `PATCH /bookings/:id/status`.
- Customer: `BOOKED → CANCELLED`. Admin: any non-COMPLETED → `CANCELLED`. Vendor transitions added in Sprint 5. Reject invalid via `BadRequestException('Illegal transition X → Y')`.
- **Verify:** Customer attempting `→ COMPLETED` → 400.

### 3.4 — Mock payment endpoint
- Files: [apps/api/src/modules/payments/](apps/api/src/modules/payments/).
- `POST /payments/mock-pay { bookingId }` → `payments` row with `stripe_payment_intent_id='mock_<uuid>'`, `status=CAPTURED`, `platform_fee = price*0.15`. Idempotent via unique `booking_id`.
- **Verify:** Second call on same booking → 409.

### 3.5 — Web: Garage + Booking wizard + Maps + mock pay
- Files: [apps/web/src/pages/GaragePage.tsx](apps/web/src/pages/GaragePage.tsx), [apps/web/src/components/VehicleForm.tsx](apps/web/src/components/VehicleForm.tsx), [apps/web/src/pages/BookingWizard.tsx](apps/web/src/pages/BookingWizard.tsx) (steps: vehicle → service → address → time → review), [apps/web/src/components/AddressAutocomplete.tsx](apps/web/src/components/AddressAutocomplete.tsx) (uses `use-places-autocomplete` with `VITE_GOOGLE_MAPS_KEY`), [apps/web/src/pages/CheckoutPage.tsx](apps/web/src/pages/CheckoutPage.tsx) (mock pay button), [apps/web/src/pages/BookingsPage.tsx](apps/web/src/pages/BookingsPage.tsx). Add routes in [App.tsx](apps/web/src/App.tsx).
- TanStack Query keys: `['vehicles']`, `['bookings']`, `['booking', id]`.
- **Verify:** Full path customer → add vehicle → create booking → mock pay → bookings list shows `Booked, Paid`.

---

## Sprint 4 — Real Stripe (Week 4)

**Critical files:** [apps/api/src/modules/payments/stripe.service.ts](apps/api/src/modules/payments/stripe.service.ts), [apps/api/src/modules/payments/stripe-webhook.controller.ts](apps/api/src/modules/payments/stripe-webhook.controller.ts), [apps/web/src/pages/CheckoutPage.tsx](apps/web/src/pages/CheckoutPage.tsx).

**Install:**
```
pnpm add -F @nexa/api stripe
pnpm add -F @nexa/web @stripe/stripe-js @stripe/react-stripe-js
```

**Shared additions:** `dto/payments/` (create-intent, intent-response `{ clientSecret, paymentId }`, refund, payout).

### 4.1 — Stripe service + PaymentIntent endpoint
- Files: [apps/api/src/modules/payments/stripe.service.ts](apps/api/src/modules/payments/stripe.service.ts), modify payments controller/service.
- `POST /payments/create-intent { bookingId }` → Stripe PaymentIntent with `capture_method: 'manual'`, amount in pence, `metadata.bookingId`, persists `payments` row `status=PENDING`, returns `clientSecret`. Keep mock-pay behind `MOCK_PAYMENTS=true` flag for local dev.
- **Verify:** Returns `client_secret` matching `pi_..._secret_...`; visible in Stripe dashboard test mode.

### 4.2 — Stripe webhook handler
- Files: [apps/api/src/modules/payments/stripe-webhook.controller.ts](apps/api/src/modules/payments/stripe-webhook.controller.ts), modify [apps/api/src/main.ts](apps/api/src/main.ts) (raw body for `/webhooks/stripe` only).
- Verify `Stripe-Signature` with `STRIPE_WEBHOOK_SECRET`. Handle `payment_intent.amount_capturable_updated` → auto-capture → `CAPTURED`; `charge.refunded` → `REFUNDED`. Idempotent on `event.id` via `stripe_events` table; migration `1700000000300-AddStripeEvents.ts`.
- **Verify:** `stripe listen --forward-to localhost:3000/webhooks/stripe`; trigger test payment → DB flips to `CAPTURED`.

### 4.3 — Refund endpoint (admin)
- Files: extend payments service/controller.
- `POST /payments/:bookingId/refund` admin-only → `stripe.refunds.create({ payment_intent })`; webhook persists; booking → `CANCELLED`.
- **Verify:** Admin refunds captured booking → Stripe shows refund; booking `CANCELLED`.

### 4.4 — Vendor payout via Stripe Transfers (admin)
- Files: extend payments service/controller; add `users.stripe_account_id` via migration `1700000000400-AddStripeAccountId.ts`.
- `POST /payments/:bookingId/payout` admin-only. Requires booking `COMPLETED` + payment `CAPTURED` + vendor has `stripe_account_id`. Calls `stripe.transfers.create({ amount, destination, transfer_group: bookingId })`, sets `paid_out_at=now()`. Vendor Connect onboarding deferred to Phase 2 — admin pastes `acct_*` into vendor edit form.
- **Verify:** With test Connect account, payout returns 200; Stripe Transfers tab shows it.

### 4.5 — Web: Stripe Elements checkout
- Files: rewrite [apps/web/src/pages/CheckoutPage.tsx](apps/web/src/pages/CheckoutPage.tsx), add [apps/web/src/lib/stripe.ts](apps/web/src/lib/stripe.ts) (`loadStripe(VITE_STRIPE_PUBLISHABLE_KEY)`).
- On mount → `/payments/create-intent` → `<Elements>` with `<PaymentElement />` + submit. On `confirmPayment` success → redirect to `/bookings/:id`.
- **Verify:** Test card `4242 4242 4242 4242` → webhook captures → bookings page shows `Paid`.

---

## Sprint 5 — Vendor Flow + Photos + Twilio (Week 5)

**Critical files:** [apps/api/src/modules/photos/](apps/api/src/modules/photos/), [apps/api/src/modules/notifications/](apps/api/src/modules/notifications/), [apps/web/src/pages/vendor/](apps/web/src/pages/vendor/), [apps/api/src/modules/auth/otp.service.ts](apps/api/src/modules/auth/otp.service.ts) (Twilio swap).

**Install:**
```
pnpm add -F @nexa/api @aws-sdk/client-s3 @aws-sdk/s3-request-presigner twilio nodemailer @nestjs-modules/mailer handlebars
pnpm add -F @nexa/web react-dropzone
```

**Shared additions:** `dto/photos/` (presign-request/response, confirm-upload, photo), `dto/notifications/notification-event.enum.ts`.

### 5.1 — Vendor accept/start/complete endpoints
- Files: extend [apps/api/src/modules/bookings/bookings.service.ts](apps/api/src/modules/bookings/bookings.service.ts) + `booking-status.machine.ts`.
- `POST /bookings/:id/accept` (vendor on `BOOKED` and assigned to them) → `ACCEPTED`.
- `POST /bookings/:id/start` (vendor on `ACCEPTED`) → `IN_PROGRESS`.
- `POST /bookings/:id/complete` (vendor on `IN_PROGRESS`, requires ≥1 BEFORE + ≥1 AFTER photo) → `COMPLETED`.
- **Verify:** Sequence succeeds; complete without photos → 400.

### 5.2 — Photos module + S3/MinIO presigned uploads
- Files: [apps/api/src/modules/photos/](apps/api/src/modules/photos/), [apps/api/src/lib/s3.client.ts](apps/api/src/lib/s3.client.ts).
- `POST /photos/presign { bookingId, photoType }` (vendor) → `{ uploadUrl, key, photoId }` (15 min TTL, 10 MB cap, `image/jpeg|png` only). Key: `bookings/{bookingId}/{photoType}/{uuid}.jpg`.
- `POST /photos/confirm { photoId }` flips row from pending to active. Migration `1700000000500-AddJobPhotosPending.ts` adds `confirmed_at`.
- **Verify:** Presign URL accepts `PUT` from `curl --upload-file`; `aws s3 ls --endpoint-url http://localhost:9000` shows object.

### 5.3 — Notifications service (Twilio + email)
- Files: [apps/api/src/modules/notifications/](apps/api/src/modules/notifications/) (module, service, sms.channel, email.channel), [apps/api/src/modules/notifications/templates/](apps/api/src/modules/notifications/templates/) (booking-confirmed, vendor-assigned, job-started, job-completed, review-received, booking-cancelled — `.hbs`).
- `NotificationsService.send(event, payload)` fans out per recipient role. SMS via Twilio `messages.create`; email via nodemailer SMTP (Mailtrap locally). Wire calls into bookings/payments/reviews services. No-op when `NODE_ENV=test`.
- **Verify:** Booking creation triggers Twilio test inbox + Mailtrap inbox.

### 5.4 — Swap OTP delivery to Twilio
- Files: modify [apps/api/src/modules/auth/otp.service.ts](apps/api/src/modules/auth/otp.service.ts).
- Phone identifier → SMS via NotificationsService; email → email channel. Keep `console.log` fallback when `OTP_DEV_LOG=true`. No DTO changes.
- **Verify:** Signup with real phone → SMS in <5s; with `OTP_DEV_LOG=true` console still prints.

### 5.5 — Vendor web pages + photo upload UI
- Files: [apps/web/src/pages/vendor/VendorJobsPage.tsx](apps/web/src/pages/vendor/VendorJobsPage.tsx), [apps/web/src/pages/vendor/VendorJobDetailPage.tsx](apps/web/src/pages/vendor/VendorJobDetailPage.tsx) (Accept/Start/Complete + photo gallery), [apps/web/src/components/PhotoUploader.tsx](apps/web/src/components/PhotoUploader.tsx) (react-dropzone → presign → `PUT` to S3 → confirm). Routes under `/vendor/*` guarded by `RoleRoute roles={[VENDOR]}`.
- Show "Cannot complete: requires before & after photos" when complete is disabled. Use `URL.createObjectURL` for preview.
- **Verify:** Vendor → assigned job → upload before+after → Complete → status flips; customer sees `Completed`.

---

## Sprint 6 — Reviews + Admin + Polish (Week 6)

**Critical files:** [apps/api/src/modules/reviews/](apps/api/src/modules/reviews/), [apps/api/src/modules/admin/](apps/api/src/modules/admin/), [apps/api/src/database/seeds/seed.ts](apps/api/src/database/seeds/seed.ts), [apps/web/src/pages/admin/](apps/web/src/pages/admin/), [README.md](README.md).

**Install:**
```
pnpm add -F @nexa/web @tanstack/react-table lucide-react
```

**Shared additions:** `dto/reviews/` (create, review), `dto/admin/` (assign-vendor, booking-filter).

### 6.1 — Reviews module
- Files: [apps/api/src/modules/reviews/](apps/api/src/modules/reviews/).
- `POST /reviews { bookingId, rating, comment? }` (customer, must own booking, must be `COMPLETED`, unique on `booking_id`). Emits `REVIEW_RECEIVED` to vendor. `GET /vendors/:id/reviews` public, paginated `created_at desc`.
- **Verify:** Submit review on completed booking → 201; second submit → 409.

### 6.2 — Customer review form
- Files: [apps/web/src/components/ReviewForm.tsx](apps/web/src/components/ReviewForm.tsx), modify [apps/web/src/pages/BookingDetailPage.tsx](apps/web/src/pages/BookingDetailPage.tsx).
- Show form only when `status=COMPLETED` + no review. Star picker (1–5) + optional comment. Read-only card after submission.
- **Verify:** Customer with completed booking sees form → submits → page shows submitted review.

### 6.3 — Admin module
- Files: [apps/api/src/modules/admin/](apps/api/src/modules/admin/) (module, admin-bookings, admin-users, admin-vehicles controllers).
- `GET /admin/bookings?status=&vendorId=&from=&to=&q=` paginated.
- `POST /admin/bookings/:id/assign-vendor { vendorId }` → emits `VENDOR_ASSIGNED` to vendor + customer.
- `GET /admin/users?role=`, `GET /admin/vehicles`. All admin-guarded.
- **Verify:** Admin assigns vendor → vendor sees it in `/vendor` list.

### 6.4 — Admin web pages
- Files: [apps/web/src/pages/admin/](apps/web/src/pages/admin/) (AdminLayout, BookingsTable using `@tanstack/react-table` with filter chips, AssignVendorModal, PayoutButton, UsersPage, VehiclesPage). Routes `/admin/*` guarded by `RoleRoute roles={[ADMIN]}`.
- Bookings columns: id (short), customer, vendor, service, scheduled, status, paid, actions. Payout button visible only when `COMPLETED` + `CAPTURED` + not yet paid.
- **Verify:** Admin assigns and triggers payout; UI updates via TanStack Query invalidation.

### 6.5 — Seed script + README + CI
- Files: [apps/api/src/database/seeds/seed.ts](apps/api/src/database/seeds/seed.ts), [apps/api/src/database/seeds/data/](apps/api/src/database/seeds/data/), update [apps/api/package.json](apps/api/package.json) (add `db:seed`), root [README.md](README.md), [.github/workflows/ci.yml](.github/workflows/ci.yml) (lint + typecheck + build both apps; Postgres service container; run migrations).
- Seed: 1 admin (`admin@nexa.test`), 2 vendors, 3 customers, 4 vehicles, 3 sample bookings across statuses (BOOKED unassigned, ACCEPTED, COMPLETED with photos + review). Passwords `Password123!`.
- README documents `docker compose up -d` → `pnpm install` → `pnpm -F @nexa/api db:migrate` → `pnpm -F @nexa/api db:seed` → `pnpm dev` → Stripe CLI usage.
- **Verify:** Fresh clone → follow README → log in as `admin@nexa.test` → see seeded bookings; CI green on PR.

---

## End-to-End Verification

**Goal scenario** (PRD §3): signup → OTP → vehicle → booking → pay → admin assigns → vendor accepts → photos → vendor completes → customer reviews.

| Leg | Sprint | How verified |
|---|---|---|
| Signup + OTP (console) + password + login | 2 | UI walkthrough; OTP from API stdout |
| Add vehicle to garage | 3 | UI + `GET /vehicles` |
| Create booking with geocoded address | 3 | UI + `GET /bookings/:id` shows lat/lng |
| Pay (mock) | 3 | `payments` row CAPTURED |
| Pay (real Stripe + webhook) | 4 | Stripe dashboard + webhook flips DB |
| Admin assigns vendor | 6 | `POST /admin/bookings/:id/assign-vendor` |
| Vendor accept → start | 5 | Vendor UI buttons; status transitions |
| Photo upload (before + after) | 5 | MinIO objects exist; `job_photos` rows |
| Vendor completes (photo guard enforced) | 5 | Status `COMPLETED`; notification fires |
| Customer reviews (1–5 + comment) | 6 | Review row inserted; vendor notified |
| Admin payout via Stripe Transfer | 4 (capability) + 6 (UI) | `paid_out_at` set; Stripe Transfers tab |

**Final acceptance test (end of Sprint 6):** Run seed → log in as customer #1 → create vehicle → book → pay with Stripe test card → log in as admin → assign vendor #1 → log in as vendor #1 → accept → start → upload before+after → complete → log back as customer → submit 5★ review → log in as admin → trigger payout. All six lifecycle notifications observed in Mailtrap + Twilio test logs.

---

## Cross-cutting "always-touched" files

These get extended every sprint — keep them tidy:
- [packages/shared/src/index.ts](packages/shared/src/index.ts) — barrel for every cross-package contract.
- [apps/api/src/app.module.ts](apps/api/src/app.module.ts) — wires every new module as it comes online.
- [apps/api/src/data-source.ts](apps/api/src/data-source.ts) — TypeORM CLI entry; entities + migrations depend on it.
- [apps/api/src/modules/bookings/bookings.service.ts](apps/api/src/modules/bookings/bookings.service.ts) — lifecycle hub: emits notifications, enforces state machine, ties everything together.
- [apps/web/src/App.tsx](apps/web/src/App.tsx) — route table + provider stack (QueryClient, Auth, Router, Stripe Elements lazy-loaded).
