# Phase 3 Plan: Production Security Hardening & Cache Scalability

## Phase Metadata
- **Phase Number:** 03
- **Phase Name:** Production Security Hardening & Cache Scalability
- **Goal:** Harden application security by strictly gating development auth fallbacks, centralizing environment secrets, providing production HTTP security headers, untracking obsolete SQLite database artifacts, and decoupling the cache layer to support both in-memory and multi-instance serverless Upstash Redis deployments.
- **Target Requirements:** `RB-05`, `QR-03`
- **Execution Strategy:** Tracer-first (lead with Auth Security Hardening & Secret Reconciliation tracer slice verified by unit tests, followed by the decoupled cache layer, environment/database cleanup, and full regression verification).

---

## Tasks Breakdown

### Task 1: Tracer Slice — Production Auth Security Hardening & Secret Reconciliation
- **Objective:** Gate the hardcoded `password123` fallback strictly behind development flags, harmonize `NEXTAUTH_SECRET` across auth and middleware, and verify with automated unit tests.
- **Target Files:**
  - `src/lib/env.ts` (create — centralized environment validation)
  - `src/lib/auth.ts` (refactor — gate fallback password, validate secrets, audit log suspicious fallback attempts)
  - `src/middleware.ts` (refactor — use unified auth secret)
  - `src/lib/__tests__/auth-security.test.ts` (create — unit test suite for auth security)
- **Detailed Steps:**
  1. Create `src/lib/env.ts` exporting:
     - `getAuthSecret()`: Returns `process.env.NEXTAUTH_SECRET`, with strict production check (warns/asserts when missing or default).
     - `isDevPasswordFallbackAllowed()`: Returns true ONLY when `process.env.NODE_ENV !== 'production'` AND `process.env.ALLOW_DEV_PASSWORD_FALLBACK === 'true'`.
     - `getRedisConfig()`: Returns `{ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN }`.
  2. Refactor `src/lib/auth.ts`:
     - Use `getAuthSecret()` for `authOptions.secret`.
     - Replace unconstrained `password123` fallback with `isDevPasswordFallbackAllowed()`.
     - When fallback is disabled and a user attempts `password123`, log a security warning and fail authentication cleanly without updating the database hash.
  3. Refactor `src/middleware.ts`:
     - Use `getAuthSecret()` to ensure token verification secret strictly matches the token signing secret.
  4. Create `src/lib/__tests__/auth-security.test.ts`:
     - Test that fallback is rejected when `NODE_ENV === 'production'`.
     - Test that fallback is rejected when `ALLOW_DEV_PASSWORD_FALLBACK` is false or unset in development.
     - Test that fallback succeeds only when explicitly allowed in development.
     - Test secret resolution and validation.
- **Verification:**
  - Run `npx vitest run src/lib/__tests__/auth-security.test.ts` to confirm 100% test pass rate on the tracer slice.

---

### Task 2: Decoupled Multi-Instance Cache Architecture (Upstash Redis & In-Memory Adapter)
- **Objective:** Centralize and decouple `src/lib/cache.ts` into a pluggable cache engine supporting multi-instance serverless environments (`Upstash Redis` via native REST `fetch`) and local/CI in-memory caching.
- **Target Files:**
  - `src/lib/cache.ts` (refactor — implement `CacheStore`, `MemoryCacheStore`, and `UpstashRedisCacheStore`)
  - `src/lib/__tests__/cache.test.ts` (expand — verify in-memory store, Upstash adapter mocking, and failure resilience)
  - `src/app/api/clients/route.ts` (update — ensure async cache calls are cleanly awaited)
  - `src/app/api/content/route.ts` (update — ensure async cache calls are cleanly awaited)
  - `src/app/api/content/bulk/route.ts` (update — ensure async cache calls are cleanly awaited)
  - `src/app/api/dashboard/route.ts` (update — ensure async cache calls are cleanly awaited)
  - `src/app/api/invoices/route.ts` (update — ensure async cache calls are cleanly awaited)
  - `src/app/api/invoices/payment/route.ts` (update — ensure async cache calls are cleanly awaited)
  - `src/app/api/invoices/[id]/route.ts` (update — ensure async cache calls are cleanly awaited)
  - `src/app/api/roles/route.ts` (update — ensure async cache calls are cleanly awaited)
  - `src/app/api/tasks/route.ts` (update — ensure async cache calls are cleanly awaited)
  - `src/app/api/users/route.ts` (update — ensure async cache calls are cleanly awaited)
- **Detailed Steps:**
  1. Refactor `src/lib/cache.ts`:
     - Define `interface CacheStore { get<T>(key: string): Promise<T | null>; set<T>(key: string, data: T, ttlSeconds: number): Promise<void>; invalidate(prefix: string): Promise<void>; clear(): Promise<void>; }`.
     - Implement `MemoryCacheStore` backed by `globalThis.__apiCache`.
     - Implement `UpstashRedisCacheStore` utilizing standard `fetch` with bearer auth:
       - `GET /get/{key}`
       - `POST /set/{key}/{value}?ex={ttlSeconds}`
       - `GET /keys/{prefix}*` + pipeline deletion for prefix invalidation.
       - Built-in error handling: if Upstash network call fails, log warning and fallback seamlessly to in-memory store.
     - Export unified functions `getCached<T>`, `setCached<T>`, `invalidateCache`, `clearAllCache`.
  2. Audit and update all API routes referencing cache functions to ensure proper `await` execution for distributed storage safety.
  3. Expand `src/lib/__tests__/cache.test.ts` to test:
     - In-memory store operations (get, set, TTL, empty array omission, prefix invalidation).
     - Upstash adapter behavior with mocked fetch (verifying JSON serialization, auth headers, and fallback resilience).
- **Verification:**
  - Run `npx vitest run src/lib/__tests__/cache.test.ts`.

---

### Task 3: Production Environment Solidification, Security Headers & Database Artifact Cleanup
- **Objective:** Clean up legacy SQLite database artifacts from git, add production security headers to `next.config.ts`, gate demo quick-fills, and document environment variables.
- **Target Files:**
  - `prisma/dev.db` (untrack from git index and remove)
  - `prisma/prisma/dev.db` (untrack from git index and remove)
  - `.env.example` (create — comprehensive environment variable documentation)
  - `next.config.ts` (update — add security headers)
  - `src/app/login/page.tsx` (update — gate demo accounts quick-fill behind non-production check)
- **Detailed Steps:**
  1. Untrack binary database files:
     - Run `git rm --cached prisma/dev.db prisma/prisma/dev.db`.
     - Delete local SQLite artifacts from disk.
     - Confirm `.gitignore` prevents future accidental commits of `*.db`.
  2. Create `.env.example` documenting all configuration keys:
     - `DATABASE_URL` (PostgreSQL pooled connection string)
     - `DIRECT_URL` (PostgreSQL direct connection string)
     - `NEXTAUTH_SECRET` (JWT session secret)
     - `NEXTAUTH_URL` (Application host URL)
     - `ALLOW_DEV_PASSWORD_FALLBACK` (Optional development flag, default false)
     - `UPSTASH_REDIS_REST_URL` (Optional serverless distributed cache endpoint)
     - `UPSTASH_REDIS_REST_TOKEN` (Optional serverless distributed cache token)
     - `NEXT_PUBLIC_ENABLE_DEMO_LOGIN` (Optional flag to show quick-fill accounts)
  3. Configure security response headers in `next.config.ts`:
     - `X-Frame-Options: DENY`
     - `X-Content-Type-Options: nosniff`
     - `Referrer-Policy: strict-origin-when-cross-origin`
     - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
  4. In `src/app/login/page.tsx`:
     - Render demo account quick-fill buttons only when `process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_ENABLE_DEMO_LOGIN === 'true'`.
- **Verification:**
  - Run `git status` to verify `prisma/dev.db` is untracked.
  - Run `npm run build` to verify Next.js configuration compiles cleanly.

---

### Task 4: Full System Verification, Regression Testing & Health Gate
- **Objective:** Execute the entire test suite and production build to confirm zero regressions and update project planning state.
- **Detailed Steps:**
  1. Run `npm test` — all existing and new test suites pass.
  2. Run `npm run build` — Next.js production build succeeds with 0 TypeScript/ESLint errors.
  3. Update `.planning/STATE.md` with Phase 3 completion status.
  4. Update `.planning/REQUIREMENTS.md` marking `RB-05` and `QR-03` as completed.
  5. Update `.planning/ROADMAP.md` setting Phase 3 status to Completed.
- **Verification:**
  - All test files green.
  - Production build clean.

---

## Success Criteria Checklist
- [x] Centralized environment validator created at `src/lib/env.ts`.
- [x] Fallback password `password123` in `src/lib/auth.ts` strictly disabled in production and gated by `ALLOW_DEV_PASSWORD_FALLBACK === 'true'`.
- [x] `NEXTAUTH_SECRET` reconciled and unified between `src/lib/auth.ts` and `src/middleware.ts`.
- [x] New unit test suite `src/lib/__tests__/auth-security.test.ts` passing.
- [x] Decoupled cache engine implemented in `src/lib/cache.ts` with zero-dependency Upstash Redis REST adapter and resilient in-memory fallback.
- [x] All 7 API route modules updated to properly await distributed cache calls.
- [x] `src/lib/__tests__/cache.test.ts` expanded and passing 100%.
- [x] Binary SQLite files (`prisma/dev.db` and `prisma/prisma/dev.db`) untracked from git index and removed.
- [x] `.env.example` created with comprehensive variable documentation.
- [x] Security headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`) added to `next.config.ts`.
- [x] Login page demo quick-fill accounts gated behind non-production flags.
- [x] `npm test` passes 100% across all test suites (60/60 tests green).
- [x] `npm run build` succeeds with zero errors (all 16 routes compile cleanly).
- [x] Requirements `RB-05` and `QR-03` marked completed in `.planning/REQUIREMENTS.md`.
