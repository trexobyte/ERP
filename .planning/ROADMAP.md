# Project Roadmap — TrexoByte ERP

## Milestones Summary
- **Milestone v1.0 (Completed — Brownfield Baseline):** Core agency operations, dashboard, calendar, production tracker, client retainers, billing/payments, RBAC with live impersonation, and audit rollback engine.
- **Milestone v1.1 (Upcoming — Stabilization & Architecture):** Automated testing harness, monolithic component decomposition, and production security hardening.
- **Milestone v1.2 (Future — Client & External Integrations):** PDF invoice generation, calendar export sync, and client portal preview.

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
- **Status:** Planned

### Phase 2: Monolithic Page Component Decomposition
- **Goal:** Break down monolithic client components (>40KB each) into clean, reusable subcomponents.
- **Focus Areas:**
  - Refactor `src/app/planning/page.tsx` (65KB) into modular calendar components (`CalendarGrid`, `ShootCard`, `ApprovalModal`, `FilterBar`).
  - Refactor `src/app/users/page.tsx` (53KB) into `UserTable`, `RoleMatrixEditor`, `UserModal`.
  - Refactor `src/app/clients/page.tsx` (47KB) into `ClientGrid`, `ClientDetailModal`, `PackageBadge`.
- **Requirements Covered:** QR-02
- **Status:** Planned

### Phase 3: Production Security Hardening & Cache Scalability
- **Goal:** Prepare the platform for secure multi-tenant production hosting.
- **Focus Areas:**
  - Secure `src/lib/auth.ts`: Gate the agency fallback password (`password123`) strictly behind non-production flags.
  - Evaluate shared cache layer (Upstash Redis or Next.js tag-based revalidation) to ensure cache coherence across multi-instance serverless deployments.
  - Clean up database artifacts (`prisma/dev.db`) and solidify environment configuration.
- **Requirements Covered:** RB-05, QR-03
- **Status:** Planned

### Phase 4: Invoice PDF Generation & Shoot Calendar Exports
- **Goal:** Enhance agency client communications with automated documentation.
- **Focus Areas:**
  - Generate branded PDF invoices for clients with TrexoByte logo and billing details.
  - Export scheduled shoot sessions into standard `.ics` / Google Calendar formats.
- **Requirements Covered:** IP-05, PC-06
- **Status:** Planned
