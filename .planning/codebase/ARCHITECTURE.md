# Architecture & System Design — TrexoByte ERP

## Overview
TrexoByte ERP is a full-stack Next.js application purpose-built for Kathmandu-based agency operations. It manages client retainers, content shoot and publishing pipelines, team task delegation, invoicing in NPR (Nepalese Rupees), and comprehensive role-based access control with undoable audit tracking.

```
┌─────────────────────────────────────────────────────────────┐
│                       Client Layer                          │
│  - AppShell (Dark Brutalist UI, Vermillion Accent #FF3B00)  │
│  - AppProviders (SessionProvider, ImpersonationContext)     │
│  - Modular Pages: Dashboard, Planning, Tracker, Billing,    │
│    Tasks, Clients, Users, Reports                           │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                     Next.js Edge / Node                     │
│  - Middleware: withAuth route interception                  │
│  - Route Handlers (/api/...): force-dynamic                 │
│  - In-Process Cache Layer (globalThis.__apiCache)           │
│  - Zero-shift Timezone Utilities (Asia/Kathmandu UTC+5:45)  │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                     Data Persistence                        │
│  - Prisma ORM 5.22.0 (Resilient Pool Management)            │
│  - PostgreSQL (Neon Serverless with PgBouncer)              │
│  - ActivityLog with Snapshot-based Undo / Rollback Engine    │
└─────────────────────────────────────────────────────────────┘
```

## Architectural Patterns & Subsystems

### 1. Client / Server Boundary
- **Client Components (`'use client'`):**
  All major interactive pages (`/`, `/planning`, `/tracker`, `/tasks`, `/billing`, `/users`, `/reports`, `/clients`) are client components wrapped inside `AppShell` (`src/components/app-shell.tsx`). They consume `useImpersonation()` for dynamic permission checking, cached datasets, and quick-add actions.
- **Server Route Handlers (`src/app/api/.../route.ts`):**
  Serve as secure REST JSON endpoints. Each handler:
  1. Validates the session with `getServerSession(authOptions)`.
  2. Queries the in-process cache via `getCached()`.
  3. Executes Prisma queries with proper relations, masking sensitive fields (e.g., passwords).
  4. Stores results in cache via `setCached()`.
  5. Upon mutations, records structured entries in `ActivityLog` and executes targeted `invalidateCache()`.

### 2. Role-Based Access Control (RBAC) & Impersonation
- **Hierarchy:** `none` (0) < `view` (1) < `edit` (2) < `full` (3)
- **Controlled Modules:**
  `dashboard`, `calendar`, `clients`, `tracker`, `tasks`, `billing`, `reports`, `users`
- **Dynamic Permission Resolution:**
  Implemented in `src/lib/permissions.ts` via `hasPermission()`.
- **Live Impersonation Engine:**
  In `src/components/providers.tsx`, the `ImpersonationContext` allows Super Admins to toggle between roles (Manager, SMM, Content Shoot Manager, Ads Manager, Billing/Finance, Custom) instantly on the frontend to preview visibility and UI constraints without logging out.

### 3. Audit Logging & Undo/Rollback Architecture
- **Table:** `ActivityLog` in `prisma/schema.prisma`
- **Captured Metadata:**
  - `userId`: Acting user
  - `action`: `CREATE`, `UPDATE`, `DELETE`, `RESTORE`, `UNDO`
  - `entityType`: `ContentItem`, `Task`, `Invoice`, `User`, `Client`
  - `entityId`: Target record ID
  - `details`: Human-readable summary
  - `changes`: JSON array of diffs `[{ field, oldVal, newVal }]`
  - `previousState`: Full JSON snapshot before the update/delete
- **Rollback Engine (`/api/activity-log/undo`):**
  Allows single-click rollback of client edits, soft-deletions, content status transitions, and task changes by parsing `previousState` and restoring records in Prisma.

### 4. Timezone & Calendar Precision
- **Context:** Nepal operates strictly on **Asia/Kathmandu timezone (UTC+5:45)** with no Daylight Saving Time.
- **Problem:** Naive date conversion methods (such as `toISOString().split('T')[0]` or `new Date("YYYY-MM-DD")`) cause 1-day off-by-one shifts when UTC midnight rolls over.
- **Solution:** `src/lib/date-utils.ts` enforces:
  - Local calendar day keys: `toLocalDateKey()` parses string or local getters (`getFullYear()`, `getMonth()`, `getDate()`).
  - UTC Noon normalization: `toDatabaseDateString()` stores dates at `T12:00:00.000Z`, ensuring the exact calendar day remains identical regardless of whether viewed in UTC, Kathmandu, or elsewhere.
