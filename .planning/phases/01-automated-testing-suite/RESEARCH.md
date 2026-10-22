# Phase 1 Research: Automated Testing Suite & Contract Verification

## 1. Objective & Scope
The objective of Phase 1 is to establish an automated testing infrastructure for TrexoByte ERP and create regression test suites covering the core business logic, date utilities, permissions, cache, and the audit undo engine.

**Requirements Targeted:**
- `QR-01`: Setup automated test runner (Vitest) for `src/lib/` utilities (`date-utils`, `permissions`, `cache`, `deleted-clients`) and API route rollback verification.

---

## 2. Technical Stack Selection for Testing

### Runner: Vitest
- **Why Vitest over Jest:**
  - Native TypeScript 5 and ESM support without requiring `ts-jest` or complex Babel transforms.
  - Extremely fast execution with worker threads and instant HMR watch mode.
  - Native compatibility with Vite and path alias mapping (`@/* -> ./src/*`).
  - Zero config conflicts with Next.js 16 App Router bundling.
- **Dependencies Required:**
  - `vitest` (devDependency)
  - `vite-tsconfig-paths` (optional, or resolve `alias` directly in `vitest.config.ts`)

---

## 3. Test Suite Targets & Specifications

### 3.1 Date Utilities (`src/lib/__tests__/date-utils.test.ts`)
- **Problem Space:** Nepal operates in `Asia/Kathmandu` (UTC+5:45) without daylight saving. UTC midnight (`00:00:00Z`) corresponds to `05:45:00` local time. Naive `.toISOString().split('T')[0]` shifts dates backwards by 1 day when run in Western timezones, and shifts forwards when run in UTC before 05:45.
- **Functions to Test:**
  - `toLocalDateKey(date)`:
    - Pure `YYYY-MM-DD` strings (e.g. `'2026-10-22'`) should return unmodified.
    - ISO timestamps with `T` (e.g. `'2026-10-22T00:00:00.000Z'`).
    - Date objects across month boundaries, leap years, and year-ends.
    - Null, undefined, and empty string handling.
  - `parseLocalDateKey(str)`:
    - Returns Date set to local noon (12:00:00) to provide buffer against midnight/DST shifts.
    - Validates year, month (0-indexed adjustment), day.
  - `toDatabaseDateString(date)`:
    - Converts any input date to UTC noon ISO (`YYYY-MM-DDT12:00:00.000Z`).
    - Returns `null` on empty or invalid inputs.
  - `getTodayLocalDateKey()`:
    - Returns `YYYY-MM-DD` matching the system local date.
  - `formatLocalDate(date, locale, options)`:
    - Matches formatted output without day-off drift.

### 3.2 Permission System (`src/lib/__tests__/permissions.test.ts`)
- **Problem Space:** TrexoByte ERP enforces role-based module security across 8 modules. A flaw in permission evaluation could grant unauthorized access to billing data or admin features.
- **Functions to Test:**
  - `parsePermissions(jsonString)`:
    - Valid JSON strings (`'{"billing":"full","clients":"view"}'`).
    - Empty, null, undefined, and corrupted JSON strings (must gracefully return `{}`).
  - `hasPermission(permissions, module, requiredLevel)`:
    - Stringified JSON vs object map inputs.
    - Hierarchy verification:
      - `none` (0) denies `view`, `edit`, `full`.
      - `view` (1) satisfies `view`, denies `edit`, `full`.
      - `edit` (2) satisfies `view` and `edit`, denies `full`.
      - `full` (3) satisfies `view`, `edit`, and `full`.
    - Unspecified module defaults to `none`.

### 3.3 In-Process Cache (`src/lib/__tests__/cache.test.ts`)
- **Functions to Test:**
  - `setCached(key, data, ttlSeconds)` and `getCached(key)`.
  - Empty array prevention: verify that `setCached('key', [])` does NOT cache, allowing immediate retry.
  - Expiry: verify that expired entries return `null` and are purged from memory.
  - `invalidateCache(prefix)`: verify prefix-based mass invalidation (e.g., `'content'` invalidates `'content:client1'`, `'content:status'`, etc.).
  - `clearAllCache()`: clears the entire cache map.

### 3.4 Deleted Clients Synchronization (`src/lib/__tests__/deleted-clients.test.ts`)
- **Functions to Test:**
  - `markClientDeleted(id)` adds to global Set.
  - `isClientDeleted(id)` returns true for marked clients, false otherwise.
  - `unmarkClientDeleted(id)` restores client in Set.

### 3.5 Audit Undo Logic (`src/app/api/activity-log/undo/__tests__/undo.test.ts`)
- **Functions to Test (Mocked Prisma):**
  - Validation: 401 if unauthenticated, 400 if missing `logId`, 404 if log not found, 400 if no `previousState`.
  - Client RESTORE: verifies soft-delete undo (`deletedAt: null`).
  - Client UNDO: verifies restoring field values from `previousState` JSON.

---

## 4. Verification & Pass Criteria
1. `npm run test` executes all test suites via `vitest run` and passes with 0 errors.
2. Zero external network or database connections required during test execution (pure unit tests and mocked Prisma).
3. Fast execution time (< 3 seconds total).
