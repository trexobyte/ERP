# Technical Concerns, Fragilities & Tech Debt — TrexoByte ERP

## 1. Monolithic Client-Side Page Components
- **Issue:** Several primary route pages contain over 1,000 to 1,800 lines of code in a single file:
  - `src/app/planning/page.tsx` (65 KB)
  - `src/app/users/page.tsx` (53 KB)
  - `src/app/clients/page.tsx` (47 KB)
  - `src/app/tasks/page.tsx` (31 KB)
  - `src/app/billing/page.tsx` (30 KB)
- **Impact:** High cognitive load, difficulty testing UI components in isolation, and increased risk of merge conflicts or accidental regressions when editing sub-features (e.g., modals, tables, or filters).
- **Remediation:** Refactor monolithic pages into modular subcomponents located in dedicated feature directories (e.g., `src/components/planning/`, `src/components/users/`).

## 2. Process-Level In-Memory Cache in Serverless Deployments
- **Issue:** `src/lib/cache.ts` stores cached API responses in `globalThis.__apiCache`.
- **Impact:** In modern serverless environments (e.g., Vercel, AWS Lambda), multiple runtime lambdas run in isolated memory spaces. Cache invalidation on one lambda does not invalidate cached entries on another lambda, leading to potential data inconsistency between users until TTL expires.
- **Remediation:** For production multi-instance scale, replace in-process memory cache with Redis / Upstash KV or Next.js `unstable_cache` with tag-based revalidation (`revalidateTag`).

## 3. Agency Password Fallback Mechanism
- **Issue:** `src/lib/auth.ts` has a hardcoded agency fallback:
  ```typescript
  if (lowerTrimmed === 'password123' || rawPassword === 'password123') {
    isValid = true;
    // Auto-heals the user password in DB to new bcrypt hash
  }
  ```
- **Impact:** Useful for local testing and rapid team onboarding, but presents a severe security vulnerability if retained in a production environment with public internet access.
- **Remediation:** Gate this auto-heal behavior behind `process.env.NODE_ENV !== 'production'` and remove before exposing to production clients.

## 4. Absence of Automated Testing
- **Issue:** There is zero test coverage (no test runner, no unit/integration/E2E test files).
- **Impact:** Any schema modification or refactoring of core business utilities (`date-utils.ts`, `permissions.ts`, `undo/route.ts`) relies solely on manual smoke testing.
- **Remediation:** Establish a Vitest test suite targeting core utilities and API route contracts.

## 5. Dual Database Artifacts in Repository
- **Issue:** `prisma/dev.db` (SQLite) is committed in the repository, while `prisma/schema.prisma` specifies `provider = "postgresql"` connecting to Neon/Supabase.
- **Impact:** Can confuse contributors about whether local development should run against local SQLite or remote PostgreSQL.
- **Remediation:** Add `*.db` to `.gitignore` and document standard local setup instructions using docker-compose or remote development DB credentials.
