# Phase 3 Research: Production Security Hardening & Cache Scalability

## 1. Problem Statement & Current Vulnerabilities

As TrexoByte ERP transitions toward multi-tenant production hosting, several brownfield architectural vulnerabilities and operational risks require remediation:

### 1.1 Insecure Development Password Fallback (`RB-05`)
- **Location:** `src/lib/auth.ts` (lines 75–91) and `src/app/api/users/route.ts` (line 77)
- **Vulnerability:** When a password check fails against the database hash, the code checks if the supplied password equals `password123`. If so, it authenticates the user and *overwrites the database bcrypt hash* with `password123`.
- **Production Risk:** An attacker knowing any agency team member's email (e.g. `ketan@trexobyte.com`) can log in with `password123`, gain Super Admin privileges, and overwrite the user's actual password in the database.
- **Requirement:** This fallback must be strictly disabled in production (`process.env.NODE_ENV === 'production'`) and only permitted in non-production environments when an explicit development flag (`process.env.ALLOW_DEV_PASSWORD_FALLBACK === 'true'`) is active.

### 1.2 Secret Key Divergence Between Auth and Middleware
- **Location:** `src/lib/auth.ts` (line 152) vs `src/middleware.ts` (line 7)
- **Vulnerability:**
  - `src/lib/auth.ts` falls back to `'trexobyte-erp-secret-key-kathmandu-2026-secure-jwt'`
  - `src/middleware.ts` falls back to `'kEcdz2zeFok2+ALwhAfsXLE44lMSsJt/K25Ez6tbJOg='`
- **Risk:** If `NEXTAUTH_SECRET` is unset, tokens signed by `auth.ts` cannot be verified by `middleware.ts`, causing random session disconnects. In production, a missing `NEXTAUTH_SECRET` must fail fast rather than falling back to unvetted hardcoded defaults.

### 1.3 Per-Process In-Memory Cache Desynchronization (`QR-03`)
- **Location:** `src/lib/cache.ts`
- **Vulnerability:** In-memory `Map` is bound to a single Node.js runtime process.
- **Production Risk:** In multi-instance serverless deployments (Vercel, AWS Lambda, or container clusters), cache invalidations triggered on one serverless instance (e.g. POST to `/api/content`) do not invalidate cached reads on other instances, resulting in stale data reads across team members.
- **Constraint:** Attempting to install heavy Redis packages via `npm install` triggers peer dependency conflicts with `vitest` and `@types/node`.
- **Solution:** Implement a decoupled cache engine with a native `fetch`-based Upstash Redis REST adapter (zero external dependencies) alongside a high-performance in-memory adapter. When `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are present, the distributed store is used; otherwise, the in-memory store provides seamless local development and fast CI test runs.

### 1.4 Tracked SQLite Database Artifacts in Git
- **Location:** `prisma/dev.db` (126 KB) and `prisma/prisma/dev.db` (593 KB)
- **Vulnerability:** Binary SQLite database files were committed to git history even though the project's active datasource is PostgreSQL (Neon / Supabase).
- **Remediation:** Remove them from the git index (`git rm --cached`), delete from disk, and confirm `.gitignore` entries.

### 1.5 Missing Environment Documentation & Security Headers
- Missing `.env.example` template for onboarding and staging/production deployment.
- `next.config.ts` lacks baseline security HTTP headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`).
- Login screen quick-fill demo buttons should be gated behind non-production flags to avoid exposing staff credentials on public production logins.

---

## 2. Architecture & Design Specifications

### 2.1 Centralized Environment Resolution (`src/lib/env.ts`)
A lightweight environment validation module:
- Validates `NEXTAUTH_SECRET`: In production (`NODE_ENV === 'production'`), validates that a custom, cryptographically secure secret is supplied.
- Exposes `isProduction`, `isDevelopment`, `allowDevPasswordFallback`.
- Exposes Upstash Redis REST configurations (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`).

### 2.2 Auth Fallback Hardening (`src/lib/auth.ts`)
```typescript
const isDevFallbackAllowed =
  process.env.NODE_ENV !== 'production' &&
  process.env.ALLOW_DEV_PASSWORD_FALLBACK === 'true';

if (!isValid && isDevFallbackAllowed) {
  // Allow password123 fallback only in dev
}
```
If an attempt is made with `password123` in production:
- Reject authorization immediately (`return null`).
- Emit a structured security audit warning.
- Do NOT alter or heal database password hashes.

### 2.3 Decoupled Multi-Instance Cache Architecture (`src/lib/cache.ts`)
```
                     ┌────────────────────────┐
                     │   Unified Cache API    │
                     │  getCached, setCached, │
                     │    invalidateCache     │
                     └───────────┬────────────┘
                                 │
                     ┌───────────▼────────────┐
                     │      CacheStore        │
                     │      (Interface)       │
                     └─────┬────────────┬─────┘
                           │            │
            ┌──────────────▼─────┐ ┌────▼─────────────────┐
            │  MemoryCacheStore  │ │ UpstashRedisCache    │
            │  (In-Memory Map)   │ │ (REST API via fetch) │
            └────────────────────┘ └──────────────────────┘
```
1. **`CacheStore` Interface:**
   - `get<T>(key: string): Promise<T | null>`
   - `set<T>(key: string, data: T, ttlSeconds: number): Promise<void>`
   - `invalidate(prefix: string): Promise<void>`
   - `clear(): Promise<void>`

2. **`UpstashRedisCacheStore`:**
   - Uses native `fetch` against `UPSTASH_REDIS_REST_URL` with bearer auth `UPSTASH_REDIS_REST_TOKEN`.
   - Silent error handling with automatic fallback to `MemoryCacheStore` if Upstash network requests timeout or fail.

3. **`MemoryCacheStore`:**
   - Maintains current TTL and empty-array preservation behavior.
   - Synchronous or asynchronous retrieval with zero overhead.

4. **Caller Compatibility:**
   - API routes (`clients`, `content`, `dashboard`, `invoices`, `roles`, `tasks`, `users`) already execute in async route handlers and can cleanly `await` cache calls.

### 2.4 Production Security Headers (`next.config.ts`)
Add standard security response headers:
- `X-Frame-Options: DENY` (prevents clickjacking)
- `X-Content-Type-Options: nosniff` (prevents MIME type sniffing)
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

---

## 3. Verification & Safety Invariants
1. **Test Continuity:** All 41 existing tests in `src/lib/__tests__/` and API test suites must continue passing.
2. **New Security Tests:** Add test coverage verifying:
   - Password fallback is blocked in production mode.
   - Password fallback functions in development mode only when explicitly enabled.
   - Cache store correctly caches, expires, invalidates by prefix, and skips empty arrays across both memory and Upstash adapters.
3. **Build Health:** `npm run build` must compile cleanly with 0 TypeScript errors.
