# Technology Stack — TrexoByte ERP

## Core Architecture & Runtimes
- **Runtime:** Node.js (with custom startup flag `--max-http-header-size=1048576` configured in `package.json` dev script)
- **Framework:** Next.js `16.3.6` (App Router)
- **UI Engine:** React `19.2.8` / React DOM `19.2.8`
- **Language:** TypeScript `5.x` (`tsconfig.json` target `ES2017`, `moduleResolution: "bundler"`, `strict: true`, path alias `@/* -> ./src/*`)

## Styling & Design System
- **CSS Framework:** Tailwind CSS `^4.0.0` with `@tailwindcss/postcss`
- **PostCSS Configuration:** `postcss.config.mjs`
- **Design Aesthetic:** Dark-mode-first brutalist dashboard theme (`globals.css`)
  - Primary Accent: Vermillion `#FF3B00` (`--color-vermillion`, `--color-primary`)
  - Background: Carbon `#09090B` / Card `#121215` / Border `#27272A`
  - Button Micro-Interactions: `.clicky-btn` with 2px hard drop-shadows and tactile active state
  - Monospace Accents: Status badges, date chips, and numerical identifiers
- **Icons:** `lucide-react` `^1.48.0`
- **Data Visualization:** `recharts` `^3.10.1` (BarChart, LineChart, PieChart, ResponsiveContainer)
- **Class Merging Utilities:** `clsx` `^2.1.1`, `tailwind-merge` `^3.7.0`, `class-variance-authority` `^0.7.1`

## Data Layer & Persistence
- **ORM:** Prisma Client `^5.22.0` / Prisma CLI `^5.22.0`
- **Database Engine:** PostgreSQL (Neon / Supabase cloud-hosted connection)
  - Connection Pool URL: `DATABASE_URL` (with PgBouncer support and connection limits `connection_limit=2&pool_timeout=20`)
  - Direct URL: `DIRECT_URL` for schema migrations and introspection
  - Custom URL Sanitizer: `src/lib/prisma.ts` handles quote stripping, bracket removal, URI encoding, and query param tuning
- **Database Seeder:** `ts-node prisma/seed.ts` providing realistic agency accounts, clients, content items, tasks, invoices, and activity logs

## Authentication & Security
- **Auth Provider:** NextAuth `^4.24.15`
- **Session Strategy:** JSON Web Token (`jwt`) with custom payload containing `department`, `roleId`, `roleName`, `permissions`, and `assignedClientIds`
- **Password Hashing:** `bcryptjs` `^3.0.3` (10 salt rounds)
- **Route Guard:** `src/middleware.ts` leveraging `withAuth` to protect internal operational routes (`/`, `/clients`, `/planning`, `/tracker`, `/tasks`, `/billing`, `/users`, `/reports`)

## Operational & Workflow Utilities
- **Drag-and-Drop:** `@dnd-kit/core` `^6.3.1`, `@dnd-kit/sortable` `^10.0.0`, `@dnd-kit/utilities` `^3.2.2` (used in production tracker Kanban)
- **Date Utilities:** `date-fns` `^4.4.0` augmented by custom `src/lib/date-utils.ts` for strict Asia/Kathmandu (UTC+5:45) calendar day consistency
- **In-Memory Caching:** `src/lib/cache.ts` global Node.js process cache with TTL expiry and prefix-based cache invalidation
