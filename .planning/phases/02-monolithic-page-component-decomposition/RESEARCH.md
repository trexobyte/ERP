# Phase 2 Research: Monolithic Page Component Decomposition

## 1. Problem Statement & Scope
In TrexoByte ERP, three primary route pages represent over 160 KB of code and 3,800 lines across single client-side files:
- `src/app/planning/page.tsx` (1,546 lines, 65.5 KB)
- `src/app/users/page.tsx` (1,207 lines, 52.9 KB)
- `src/app/clients/page.tsx` (1,055 lines, 47.4 KB)

### Identified Fragilities in Monolithic Pages
1. **Excessive Re-renders:** A state update in an edit modal (such as typing in a title input) triggers re-renders across the entire calendar grid, drag-and-drop context, and filter states.
2. **Coupled Business Logic:** Data fetching, form state validation, keyboard listeners (e.g. `Escape` keys), and drag-and-drop collision algorithms are bundled directly into the view layout.
3. **High Regression Risk:** Modifying an avatar upload or role permission selector poses risks of breaking the user table or client assignment dropdowns.
4. **Maintenance Friction:** Code editors and AI tooling face large token contexts and diffing costs on single-file edits.

**Requirements Targeted:**
- `QR-02`: Refactor monolithic page components into modular component directories.

---

## 2. Target Component Architecture

### 2.1 Planning Module (`src/components/planning/`)
The planning page is a drag-and-drop calendar powered by `@dnd-kit/core` and `date-fns` with Asia/Kathmandu date utilities.
- **`droppable-pool-area.tsx`**: Renders the unscheduled items pool with droppable zone, planned count, and empty state.
- **`calendar-grid.tsx`**: Renders the month/week calendar grid with droppable day cells, today markers, and day headers.
- **`calendar-item-card.tsx`**: Individual draggable card for shoots, reels, posts, carousels with status badges, client color indicators, and click handlers.
- **`content-detail-modal.tsx`**: Modal for creating/editing content details, platform selection, scheduling dates, client feedback notes, and approval outcomes.
- **`planning-filter-bar.tsx`**: Filter strip with client picker, content type selector, personal items toggle, and month navigation controls.

### 2.2 Users & RBAC Module (`src/components/users/`)
- **`users-table.tsx`**: Tabular presentation of active team members, department badges, role chips, assigned clients, and edit/delete actions.
- **`role-matrix-editor.tsx`**: Tabular editor displaying all roles against the 8 system modules (`dashboard`, `calendar`, `clients`, `tracker`, `tasks`, `billing`, `reports`, `users`) with `none/view/edit/full` radio selectors.
- **`user-form-modal.tsx`**: Modal handling user creation and user profile editing (name, email, department, role, assigned clients, avatar upload).
- **`delete-user-modal.tsx`**: Confirmation modal with warning prompt.
- **`role-builder-modal.tsx`**: Modal to define and persist a new custom role with custom permission settings.

### 2.3 Clients Module (`src/components/clients/`)
- **`client-card.tsx`**: Agency client card displaying retainer amount in NPR, package tier badge, brand color accent, team member avatars, and quick actions.
- **`client-form-modal.tsx`**: Modal for creating and editing clients (name, brand color, service package, tier, retainer, billing cycle day, team assignments).
- **`client-detail-drawer.tsx`**: Slide-over or modal with sub-tabs for client content history, invoices, and communication notes.
- **`delete-client-modal.tsx`**: Confirmation modal warning about soft-delete and undo availability.

---

## 3. Refactoring Strategy & Invariants
1. **Zero Breaking Changes:** Props and state contracts must remain 100% backward-compatible.
2. **Preserve Brutalist Aesthetics:** Retain all Tailwind v4 tokens, `#FF3B00` Vermillion accents, and `.clicky-btn` classes.
3. **Preserve Date Safety:** All date manipulation inside refactored planning components must continue using `src/lib/date-utils.ts`.
4. **Preserve RBAC and Impersonation:** Subcomponents must seamlessly inherit effective permissions and live role impersonation from `useImpersonation()`.
5. **Verification Pipeline:**
   - Execute `npm test` after each module refactor to ensure no regressions.
   - Execute `npm run build` after each module refactor to ensure clean TypeScript compilation.
