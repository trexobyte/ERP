# Phase 1 Plan: Automated Testing Suite & Contract Verification

## Phase Metadata
- **Phase Number:** 01
- **Phase Name:** Automated Testing Suite & Contract Verification
- **Goal:** Introduce an automated testing infrastructure (Vitest) with path aliases and create comprehensive unit and integration test suites covering critical utilities (date handling, RBAC permissions, in-memory cache, and audit undo engine).
- **Target Requirements:** `QR-01`
- **Execution Strategy:** Tracer-first (establish runner + first working test slice, then expand to remaining domains).

---

## Tasks Breakdown

### Task 1: Tracer Slice — Vitest Harness & Date Utilities Test
- **Objective:** Configure Vitest with path alias resolution and implement the first comprehensive test suite for `src/lib/date-utils.ts`.
- **Files to Modify/Create:**
  - `vitest.config.ts` (create)
  - `package.json` (add `test` and `test:watch` scripts, add `vitest` devDependency)
  - `src/lib/__tests__/date-utils.test.ts` (create)
- **Detailed Steps:**
  1. Install `vitest` as a devDependency.
  2. Create `vitest.config.ts` with `resolve.alias` mapping `@/*` to `./src/*`, using `node` test environment.
  3. Add scripts to `package.json`:
     ```json
     "test": "vitest run",
     "test:watch": "vitest"
     ```
  4. Write test cases in `src/lib/__tests__/date-utils.test.ts` testing:
     - `toLocalDateKey`: strings, ISO formats with time/offset, Date objects, null/empty.
     - `parseLocalDateKey`: local noon assignment (12:00:00), YYYY-MM-DD parsing.
     - `toDatabaseDateString`: conversion to UTC noon ISO (`T12:00:00.000Z`).
     - `getTodayLocalDateKey`: format and current date validation.
     - `formatLocalDate`: display localization.
- **Verification:**
  - Run `npm test` and verify all date utility tests pass.

---

### Task 2: Core Utility Test Expansion — Permissions, Cache & Deleted Clients
- **Objective:** Secure the authorization matrix, memory cache lifecycle, and soft-delete tracker with regression tests.
- **Files to Create:**
  - `src/lib/__tests__/permissions.test.ts`
  - `src/lib/__tests__/cache.test.ts`
  - `src/lib/__tests__/deleted-clients.test.ts`
- **Detailed Steps:**
  1. Create `src/lib/__tests__/permissions.test.ts`:
     - Test `parsePermissions` with valid JSON, empty input, invalid/corrupted strings.
     - Test `hasPermission` across all levels: `none` (0), `view` (1), `edit` (2), `full` (3).
     - Verify hierarchy: `full` satisfies `edit` and `view`; `view` does NOT satisfy `edit` or `full`.
     - Test fallback behaviors for unassigned modules.
  2. Create `src/lib/__tests__/cache.test.ts`:
     - Test `setCached` and `getCached` storage and retrieval.
     - Verify empty array policy: `setCached('key', [])` does NOT cache.
     - Test TTL expiration behavior.
     - Test `invalidateCache('prefix')` to ensure all keys matching the prefix are purged while unrelated keys remain intact.
     - Test `clearAllCache()`.
  3. Create `src/lib/__tests__/deleted-clients.test.ts`:
     - Test `markClientDeleted`, `isClientDeleted`, and `unmarkClientDeleted`.
- **Verification:**
  - Run `npm test` and verify all tests in `src/lib/__tests__/` pass cleanly.

---

### Task 3: Audit Log & Undo Engine Contract Verification
- **Objective:** Ensure the undo/rollback engine accurately reverses mutations and restores soft-deleted entities.
- **Files to Create:**
  - `src/app/api/activity-log/undo/__tests__/undo.test.ts`
- **Detailed Steps:**
  1. Mock `next-auth` (`getServerSession`) to simulate authenticated Super Admin sessions and unauthenticated requests.
  2. Mock Prisma client (`@/lib/prisma`):
     - `prisma.activityLog.findUnique` returning mock activity logs with `previousState` JSON.
     - `prisma.client.update` tracking restoration of fields or `deletedAt: null`.
     - `prisma.activityLog.create` tracking generation of `RESTORE` or `UNDO` action log.
  3. Test cases:
     - Unauthorized requests return 401.
     - Missing `logId` returns 400.
     - Non-existent log record returns 404.
     - Activity log without `previousState` returns 400.
     - Soft-deleted client undo sets `deletedAt: null` and unmarks memory cache.
     - Updated client undo restores previous fields (`name`, `status`, `monthlyRetainer`, etc.).
- **Verification:**
  - Run `npm test` and verify undo route tests execute and pass without contacting external databases.

---

### Task 4: Final Validation & Health Gate
- **Objective:** Verify test runner performance, ensure TypeScript build clean compilation, and update planning artifacts.
- **Detailed Steps:**
  1. Execute `npm test` (must pass 100% with 0 failures).
  2. Execute `npm run build` (`prisma generate && next build`) to verify that testing configuration does not break Next.js App Router production compilation.
  3. Update `.planning/STATE.md` with completed phase results.
  4. Update `.planning/REQUIREMENTS.md` marking `QR-01` as completed.
- **Verification:**
  - All test suites green.
  - Production build succeeds without errors.

---

## Success Criteria Checklist
- [x] `vitest` installed and configured in `vitest.config.mts` with `@/*` path aliases.
- [x] `npm test` script registered in `package.json`.
- [x] `src/lib/__tests__/date-utils.test.ts` covers all date conversions with 100% pass rate.
- [x] `src/lib/__tests__/permissions.test.ts` validates RBAC hierarchy.
- [x] `src/lib/__tests__/cache.test.ts` verifies TTL, empty-array bypass, and prefix invalidation.
- [x] `src/lib/__tests__/deleted-clients.test.ts` verifies soft-delete synchronization.
- [x] `src/app/api/activity-log/undo/__tests__/undo.test.ts` verifies rollback engine contracts.
- [x] `npm run build` succeeds cleanly.
