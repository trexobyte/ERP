# Project Charter — TrexoByte ERP

## Mission & Vision
TrexoByte ERP is an operational ERP platform specifically engineered for **TrexoByte**, a Kathmandu-based digital creative and growth agency. The platform provides unified control over agency retainers, multi-platform content production pipelines, team capacity, client servicing, invoicing in NPR (Nepalese Rupees), and fine-grained role-based access control with snapshot-backed audit undo capabilities.

## Agency Context & Target Audience
- **Headquarters:** Kathmandu, Nepal (operating in Asia/Kathmandu UTC+5:45 timezone)
- **Primary Users:**
  1. **Super Admin / Founders:** Overall agency health, billing totals, financial forecasting, system configuration, role delegation.
  2. **Agency Managers:** Resource allocation, team oversight, review of urgent tasks, cross-client performance.
  3. **Content & Shoot Managers / Videographers:** Planning shoot days, managing scripts/reels/carousels, equipment and production logistics.
  4. **Social Media Managers (SMM):** Publishing schedules, client feedback loops, approvals, calendar coordination.
  5. **Performance Ads Managers:** Ad creative tracking, campaign tasks, performance deliverables.
  6. **Client Servicing & Account Executives:** Client relationship health, scope management, meeting action items.
  7. **Billing & Finance Officers:** Retainer tracking, monthly invoice generation, payment receipts in NPR, overdue tracking.

## Core Functional Modules
1. **Executive Operations Dashboard (`/`):**
   - High-level KPIs: Active clients, monthly revenue in NPR, pending approvals, overdue invoices, urgent tasks.
   - Filterable charts: Content distribution by type/platform, team workload, and upcoming shoot schedules.
2. **Content Planning & Calendar (`/planning`):**
   - Monthly and weekly grid views of shoots, reels, static posts, carousels, and stories.
   - Zero-shift timezone handling for Asia/Kathmandu (UTC+5:45).
   - Approval workflows: PLANNED, SHOT, EDITED, CLIENT_APPROVAL, SCHEDULED, PUBLISHED.
3. **Production Content Tracker (`/tracker`):**
   - Visual Kanban board with `@dnd-kit` drag-and-drop mechanics.
   - Status transitions with automatic previous-state snapshot logging for undo.
4. **Task & Urgency Management (`/tasks`):**
   - Multi-view task lists (Kanban and Table) with priority flags: URGENT, HIGH, MEDIUM, LOW.
   - Relational links to specific clients and content items.
5. **Client Portfolio & Retainers (`/clients`):**
   - Client records with package tiers (Basic, Standard, Premium, Enterprise), monthly retainer fees, and billing cycle days.
   - Assigned team members per client.
   - Non-destructive soft-delete with instant rollback.
6. **Billing, Invoicing & Payments (`/billing`):**
   - Invoices with auto-generated numbering, issue dates, due dates, and statuses (DRAFT, SENT, PAID, OVERDUE).
   - Payment recording with partial payment support and auditor identification.
7. **Reports & Analytics (`/reports`):**
   - Content output velocity, revenue realized vs outstanding, client distribution, and team throughput.
8. **User Directory & RBAC (`/users`):**
   - Custom and preset roles (Super Admin, Manager, SMM, Content Shoot Manager, Ads Manager, Client Communication, Billing).
   - Granular module permissions: `none`, `view`, `edit`, `full`.
   - Real-time role impersonation switcher in the app shell for instant testing.
9. **Audit Trail & Undo System (`/api/activity-log`, modal):**
   - Centralized change logging with field-level diffs and full entity snapshots enabling single-click rollback.

## Technical Foundations
- **Framework:** Next.js 16.3.6 (App Router) + React 19.2.8
- **Language:** TypeScript 5 (Strict Mode)
- **Styling:** Tailwind CSS v4 + Dark Brutalist Design Language with `#FF3B00` Vermillion
- **Database:** Prisma ORM 5.22.0 + PostgreSQL (Neon Serverless with PgBouncer connection tuning)
- **Authentication:** NextAuth 4.24.15 (Credentials Provider + JWT session)
- **Timezone Safety:** Unified local date manipulation via `src/lib/date-utils.ts`
