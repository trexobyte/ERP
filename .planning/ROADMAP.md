# Project Roadmap — TrexoByte ERP

## Milestones Summary
- **Milestone v1.0 (Completed — Brownfield Baseline):** Core agency operations, dashboard, calendar, production tracker, client retainers, billing/payments, RBAC with live impersonation, and audit rollback engine.
- **Milestone v1.1 (Completed — Stabilization & Architecture):** Automated testing harness, monolithic component decomposition, and production security hardening (Phases 1, 2, 3).
- **Milestone v1.2 (Completed — Client & External Integrations):** Automated branded PDF invoice generation, RFC 5545 iCalendar & Google Calendar sync (Phase 4).

---

## Phase Breakdown

### Phase 1: Automated Testing Suite & Contract Verification
- **Goal:** Introduce automated unit and integration tests to protect core business logic against regressions.
- **Focus Areas:**
  - Setup `vitest` with TypeScript support and fast runner scripts.
  - Unit test `src/lib/date-utils.ts` (Asia/Kathmandu UTC+5:45 timezone immunity, zero-shift formatting, noon UTC persistence).
  - Unit test `src/lib/permissions.ts` (RBAC permission evaluation and hierarchy boundaries).
  - Integration test `src/app/api/activity-log/undo/route.ts` (Snapshot restoration and soft-delete undo).
- **Requirements Covered:** QR-01
- **Status:** Completed (41 tests passing across 5 test suites)

### Phase 2: Monolithic Page Component Decomposition
- **Goal:** Break down monolithic client components (>40KB each) into clean, reusable subcomponents.
- **Focus Areas:**
  - Refactor `src/app/planning/page.tsx` (65KB) into modular calendar components (`CalendarGrid`, `CalendarItemCard`, `DroppablePoolArea`, `ContentDetailModal`, `PlanningFilterBar`, `PlanningWizard`).
  - Refactor `src/app/users/page.tsx` (53KB) into `UsersTable`, `RoleMatrixEditor`, `UserFormModal`, `RoleBuilderModal`, `DeleteUserModal`.
  - Refactor `src/app/clients/page.tsx` (47KB) into `ClientCard`, `ClientFormModal`, `ClientDetailDrawer`, `DeleteClientModal`.
- **Requirements Covered:** QR-02
- **Status:** Completed (15 subcomponents extracted, >2,560 lines decomposed, 0 build/test regressions)

### Phase 3: Production Security Hardening & Cache Scalability
- **Goal:** Prepare the platform for secure multi-tenant production hosting.
- **Focus Areas:**
  - Secure `src/lib/auth.ts`: Gate the agency fallback password (`password123`) strictly behind non-production flags.
  - Evaluate shared cache layer (Upstash Redis or Next.js tag-based revalidation) to ensure cache coherence across multi-instance serverless deployments.
  - Clean up database artifacts (`prisma/dev.db`) and solidify environment configuration.
- **Requirements Covered:** RB-05, QR-03
- **Status:** Completed (Auth fallback gated behind dev flags, NextAuth secret unified, zero-dependency Upstash Redis REST cache adapter implemented, legacy SQLite artifacts untracked, production security headers added, 60/60 tests passing)

### Phase 4: Invoice PDF Generation & Shoot Calendar Exports
- **Goal:** Enhance agency client communications with automated documentation.
- **Focus Areas:**
  - Generate branded PDF invoices for clients with TrexoByte logo and billing details.
  - Export scheduled shoot sessions into standard `.ics` / Google Calendar formats.
- **Requirements Covered:** IP-05, PC-06
- **Status:** Completed (Branded PDF invoice generation, RFC 5545 iCalendar & Google Calendar sync, preview modal, print stylesheet, 75/75 tests passing)
