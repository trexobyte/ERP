# Requirements Specification — TrexoByte ERP

## Status Legend
- `[x]` Implemented & Active in Codebase
- `[ ]` Planned / Stabilization Requirement

---

## 1. Executive Operations Dashboard (OD)
- [x] **OD-01:** High-level operational metrics: active clients, monthly retainer totals (NPR), overdue invoices count, and urgent tasks count.
- [x] **OD-02:** Interactive filtering across Dashboard data by client, department, assignee, and content type.
- [x] **OD-03:** Visual workload and content distribution charts using Recharts.
- [x] **OD-04:** Upcoming shoot schedules preview with date, client color indicators, and direct quick-add integration.

---

## 2. Planning & Calendar System (PC)
- [x] **PC-01:** Grid-based calendar view supporting month and week views.
- [x] **PC-02:** Support for diverse content types: SHOOT, REEL, STATIC_POST, CAROUSEL, STORY, AD_CREATIVE, and PERSONAL.
- [x] **PC-03:** Content item approval lifecycle: PLANNED, SHOT, EDITED, CLIENT_APPROVAL, SCHEDULED, PUBLISHED.
- [x] **PC-04:** Zero-shift timezone handling for Asia/Kathmandu (UTC+5:45) ensuring calendar dates remain consistent across client and server.
- [x] **PC-05:** Client feedback notes and approval outcome recording (APPROVED, DECLINED, REVISION_REQUESTED).
- [ ] **PC-06:** Calendar ICS export or Google Calendar sync integration for scheduled shoots.

---

## 3. Production Content Tracker (PT)
- [x] **PT-01:** Kanban pipeline board grouping items across production stages.
- [x] **PT-02:** Drag-and-drop status transitions using `@dnd-kit`.
- [x] **PT-03:** Personal vs Client-assigned item segregation with privacy filters.
- [x] **PT-04:** Automatic audit snapshot generation upon any card movement or field update.

---

## 4. Task & Urgency Management (TM)
- [x] **TM-01:** Task creation with title, description, due date, urgency level (URGENT, HIGH, MEDIUM, LOW), and status (TO_DO, IN_PROGRESS, DONE).
- [x] **TM-02:** Direct relational association between tasks, clients, and content items.
- [x] **TM-03:** Multi-view switching: Kanban board vs structured table list.
- [x] **TM-04:** Urgency badges and fast inline status toggle.

---

## 5. Client Portfolio & Retainers (CR)
- [x] **CR-01:** Client management with logo URL, brand color hex, service package, package tier, and monthly retainer fee in NPR.
- [x] **CR-02:** Configurable billing cycle day (1–31) per client.
- [x] **CR-03:** Assigned team member allocation per client account.
- [x] **CR-04:** Non-destructive soft-delete (`deletedAt`) with instant memory sync and rollback capability.

---

## 6. Billing, Invoicing & Payments (IP)
- [x] **IP-01:** Unique invoice numbering, issue date, due date, billing period, and NPR currency handling.
- [x] **IP-02:** Invoice lifecycle management: DRAFT, SENT, PAID, OVERDUE.
- [x] **IP-03:** Payment receipt recording with partial payment tracking and recording staff attribution.
- [x] **IP-04:** Resilient database connection retries (3 attempts) on invoice transactions.
- [ ] **IP-05:** Automated PDF invoice generation with TrexoByte brand header.

---

## 7. User Access, Roles & Impersonation (RB)
- [x] **RB-01:** NextAuth credentials authentication with JWT sessions.
- [x] **RB-02:** Preset roles: Super Admin, Manager, SMM, Content/Shoot Manager, Ads Manager, Client Communication, Billing.
- [x] **RB-03:** Granular module permissions (`none`, `view`, `edit`, `full`) across 8 operational modules.
- [x] **RB-04:** Live role impersonation dropdown in the UI shell for Super Admins to test permissions without session loss.
- [ ] **RB-05:** Remove hardcoded development password fallback (`password123`) before production release.

---

## 8. Audit Trail & Rollback Engine (AT)
- [x] **AT-01:** Automated `ActivityLog` entries for create, update, and delete actions.
- [x] **AT-02:** Field-level JSON change tracking (`changes`) and full state snapshots (`previousState`).
- [x] **AT-03:** Single-click undo/restore endpoint (`/api/activity-log/undo`) for client restorations and field reverts.
- [x] **AT-04:** Dedicated Audit History modal in header displaying chronological operational logs.

---

## 9. Quality, Reliability & Codebase Health (QR)
- [x] **QR-01:** Setup automated test runner (Vitest) for `src/lib/` utilities (`date-utils`, `permissions`, `cache`, `deleted-clients`) and audit rollback verification.
- [x] **QR-02:** Refactor monolithic page components (`planning/page.tsx`, `users/page.tsx`, `clients/page.tsx`) into modular component directories.
- [ ] **QR-03:** Centralize and decouple in-memory cache to support multi-instance / serverless deployments (Redis / Upstash).
