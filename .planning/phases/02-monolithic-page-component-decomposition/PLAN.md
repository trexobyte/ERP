# Phase 2 Plan: Monolithic Page Component Decomposition

## Phase Metadata
- **Phase Number:** 02
- **Phase Name:** Monolithic Page Component Decomposition
- **Goal:** Break down monolithic client-side page components (>40KB each) across `clients`, `users`, and `planning` into modular, reusable subcomponents in `src/components/`, reducing single-file line counts by >70% while preserving all existing behaviors, brutalist styling, and timezone invariance.
- **Target Requirements:** `QR-02`
- **Execution Strategy:** Tracer-first decomposition (lead with Clients module extraction, followed by Users/RBAC, and Planning calendar).

---

## Tasks Breakdown

### Task 1: Tracer Slice — Clients Module Decomposition
- **Objective:** Extract modals, cards, and detail drawer from `src/app/clients/page.tsx` into `src/components/clients/`.
- **Target Files:**
  - `src/components/clients/client-card.tsx` (create)
  - `src/components/clients/client-form-modal.tsx` (create — unified Add & Edit modal)
  - `src/components/clients/client-detail-drawer.tsx` (create — tabs for content, billing, comms)
  - `src/components/clients/delete-client-modal.tsx` (create)
  - `src/app/clients/page.tsx` (refactor to lean orchestrator < 250 lines)
- **Detailed Steps:**
  1. Create `src/components/clients/client-card.tsx` encapsulating client logo/color avatar, retainer in NPR, package tier badge, assigned team avatar stack, and edit/delete triggers.
  2. Create `src/components/clients/client-form-modal.tsx` handling client form inputs (name, brand color, service package, tier, monthly retainer, billing cycle day, assigned user checkboxes).
  3. Create `src/components/clients/client-detail-drawer.tsx` handling client overview drawer with tabs for scheduled content items, invoices, and communication notes.
  4. Create `src/components/clients/delete-client-modal.tsx` confirming soft-deletion.
  5. Refactor `src/app/clients/page.tsx` to orchestrate state, data fetching (`/api/clients`), and modular component rendering.
- **Verification:**
  - Run `npm run build` and ensure TypeScript compiles with zero errors on the clients route.

---

### Task 2: Users & RBAC Module Decomposition
- **Objective:** Extract user directory, role matrix editor, and user management modals from `src/app/users/page.tsx` into `src/components/users/`.
- **Target Files:**
  - `src/components/users/users-table.tsx` (create)
  - `src/components/users/role-matrix-editor.tsx` (create)
  - `src/components/users/user-form-modal.tsx` (create)
  - `src/components/users/delete-user-modal.tsx` (create)
  - `src/components/users/role-builder-modal.tsx` (create)
  - `src/app/users/page.tsx` (refactor to lean orchestrator < 250 lines)
- **Detailed Steps:**
  1. Create `src/components/users/users-table.tsx` to render the staff list, department pills, active/inactive toggles, assigned client badges, and action buttons.
  2. Create `src/components/users/role-matrix-editor.tsx` rendering the RBAC grid across all 8 modules (`dashboard`, `calendar`, `clients`, `tracker`, `tasks`, `billing`, `reports`, `users`).
  3. Create `src/components/users/user-form-modal.tsx` handling create/edit user form, password auto-fill, and avatar picker.
  4. Create `src/components/users/delete-user-modal.tsx` for user deletion confirmation.
  5. Create `src/components/users/role-builder-modal.tsx` for custom role creation.
  6. Refactor `src/app/users/page.tsx` to handle tab switching (`users` vs `roles`) and state delegation.
- **Verification:**
  - Run `npm run build` to verify clean compilation.

---

### Task 3: Planning & Calendar Module Decomposition
- **Objective:** Modularize `src/app/planning/page.tsx` (65KB, 1,546 lines) into modular calendar components in `src/components/planning/`.
- **Target Files:**
  - `src/components/planning/droppable-pool-area.tsx` (create)
  - `src/components/planning/calendar-grid.tsx` (create)
  - `src/components/planning/calendar-item-card.tsx` (create)
  - `src/components/planning/content-detail-modal.tsx` (create)
  - `src/components/planning/planning-filter-bar.tsx` (create)
  - `src/app/planning/page.tsx` (refactor to lean orchestrator < 350 lines)
- **Detailed Steps:**
  1. Extract `droppable-pool-area.tsx` for unscheduled planned items.
  2. Extract `calendar-item-card.tsx` for draggable item chips with status, client color, platform icons, and click actions.
  3. Extract `calendar-grid.tsx` containing the month/week grid, day cells with drop zones, today indicators, and day numbers.
  4. Extract `content-detail-modal.tsx` for item scheduling, editing, deletion, and client feedback recording.
  5. Extract `planning-filter-bar.tsx` for month/week navigation, client filters, content type selectors, and personal item toggles.
  6. Refactor `src/app/planning/page.tsx` to manage `@dnd-kit` context, drag events (`onDragStart`, `onDragEnd`), API persistence, and local state.
- **Verification:**
  - Run `npm run build` and ensure drag-and-drop, date-fns, and state types compile cleanly.

---

### Task 4: Final Verification & Health Gate
- **Objective:** Verify test runner passes and production build compiles with 0 errors across all routes.
- **Detailed Steps:**
  1. Execute `npm test` (all 41 tests pass).
  2. Execute `npm run build` (all 16 static pages and API routes compile).
  3. Update `.planning/STATE.md` with Phase 2 completion.
  4. Update `.planning/REQUIREMENTS.md` marking `QR-02` as completed.
- **Verification:**
  - All test suites green.
  - Production build clean.

---

## Success Criteria Checklist
- [x] `src/components/clients/` created with 4 modular components (`client-card.tsx`, `client-form-modal.tsx`, `client-detail-drawer.tsx`, `delete-client-modal.tsx`).
- [x] `src/app/clients/page.tsx` reduced from 1,055 lines to 264 lines.
- [x] `src/components/users/` created with 5 modular components (`users-table.tsx`, `role-matrix-editor.tsx`, `user-form-modal.tsx`, `role-builder-modal.tsx`, `delete-user-modal.tsx`).
- [x] `src/app/users/page.tsx` reduced from 1,207 lines to 297 lines.
- [x] `src/components/planning/` created with 6 modular components (`calendar-item-card.tsx`, `droppable-pool-area.tsx`, `calendar-grid.tsx`, `planning-filter-bar.tsx`, `content-detail-modal.tsx`, `planning-wizard.tsx`).
- [x] `src/app/planning/page.tsx` reduced from 1,546 lines to 360 lines.
- [x] `npm test` passes 100% (41/41 tests green).
- [x] `npm run build` succeeds with 0 errors (all 16 routes compile cleanly).
