# Testing Posture & Strategy — TrexoByte ERP

## Current Testing State
- **Automated Test Runners:** None currently configured (no Jest, Vitest, Cypress, or Playwright in `package.json`).
- **Test Scripts in `package.json`:**
  - `dev`: `node --max-http-header-size=1048576 node_modules/next/dist/bin/next dev`
  - `build`: `prisma generate && next build`
  - `lint`: `eslint`
  - `seed`: `prisma db seed`
- **Static Analysis & Linting:**
  - TypeScript compiler (`tsc --noEmit` via build) verifies type adherence.
  - ESLint 9 (`eslint.config.mjs` with `eslint-config-next`) checks formatting and Next.js best practices.

## Identified Testing Gaps

| Area | Current Risk | Recommended Strategy |
|---|---|---|
| **Date Utilities (`src/lib/date-utils.ts`)** | High (Critical for scheduling & shoots in Asia/Kathmandu UTC+5:45) | Unit tests verifying zero-shift parsing across midnight and UTC boundary dates |
| **RBAC Matrix (`src/lib/permissions.ts`)** | High (Security & data privacy between roles) | Unit tests verifying hierarchy checks (`none` through `full`) and edge cases |
| **Undo / Rollback Engine (`/api/activity-log/undo`)** | Medium (Potential state corruption on rollbacks) | Integration tests executing CREATE -> UPDATE -> UNDO and CREATE -> DELETE -> RESTORE |
| **API Endpoints (`/api/clients`, `/api/content`, `/api/tasks`)** | Medium (Regression on database queries and caching) | Integration tests verifying CRUD, filtering, and cache invalidation |
| **Kanban & Drag-and-Drop (`src/app/tracker/page.tsx`)** | Low/Medium (UI state divergence) | Component or E2E tests for dnd-kit drop handling |

## Proposed Testing Roadmap
1. **Phase 1: Setup Vitest:** Add `vitest` for lightning-fast TypeScript unit tests targeting `src/lib/` utilities.
2. **Phase 2: API Route Integration Tests:** Mock Prisma Client or execute against a temporary test database to validate endpoint status codes and payload structures.
3. **Phase 3: Playwright E2E Testing:** Add headless browser tests covering login, role impersonation, task creation, and calendar drag-and-drop.
