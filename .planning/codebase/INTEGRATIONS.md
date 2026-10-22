# Integrations & External Systems — TrexoByte ERP

## 1. PostgreSQL Database & Connection Pooling
- **Engine:** PostgreSQL (configured for Neon Serverless / Supabase)
- **Primary Connection:** `DATABASE_URL` via PgBouncer connection pooler
- **Direct Connection:** `DIRECT_URL` for migration scripts
- **Custom Resilience Layer (`src/lib/prisma.ts`):**
  - Robust URL parsing via `sanitizeDbUrl()`
  - Trims quotes and handles bracketed passwords in raw connection strings
  - Auto-injects `connection_limit=2&pool_timeout=20` to prevent connection exhaustion under serverless scaling
  - Re-uses client across hot-reloads via `globalThis.prisma`
- **Query Retry Loop:** Critical API routes (such as auth and invoices) wrap database calls with 3-tier exponential backoff retries to absorb transient pool disconnects.

## 2. NextAuth Authentication & Session Management
- **Endpoint:** `/api/auth/[...nextauth]`
- **Credentials Provider:** Custom credential verification in `src/lib/auth.ts`:
  - Case-insensitive email normalization (`ketan@trexobyte.com` or `ketan`)
  - Retried database lookup for user record
  - Bcrypt validation with agency development fallback (`password123`) which auto-heals corrupted password hashes
  - Injects full role permissions and assigned client IDs into JWT token and session object
- **Middleware Guard:** `src/middleware.ts` intercepts all requests outside of `/login`, `/api/auth`, and static assets.

## 3. Media & Avatar Storage
- **Seeded Avatars & Logos:** Hosted externally via Unsplash CDN with optimized format and quality query parameters (`auto=format&fit=crop&w=250&q=80`).
- **Custom User Avatars:**
  - Base64 / data-URI uploads supported via user profile modals.
  - Dedicated `/api/users/[id]/avatar` proxy endpoint serves image buffers to avoid bloating JWT cookies and session payloads with heavy data URLs.

## 4. In-Process Caching System (`src/lib/cache.ts`)
- **Storage:** Node.js process-level `globalThis.__apiCache = Map<string, CacheEntry<any>>`
- **Cache Invalidation:**
  - `setCached(key, data, ttlSeconds)`: caches successful non-empty payloads (default 30s)
  - `invalidateCache(prefix)`: invalidates entity caches upon mutations (e.g., `invalidateCache('content')`, `invalidateCache('tasks')`, `invalidateCache('dashboard')`)
  - `clearAllCache()`: manual global purge

## 5. Soft Delete Persistence Layer (`src/lib/deleted-clients.ts`)
- **Mechanism:** In addition to database column `Client.deletedAt`, a shared memory `deletedClientIds` `Set<string>` guarantees instant removal of deleted clients across dashboard, calendar, and task queries before database query caches propagate.
