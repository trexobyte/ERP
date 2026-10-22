# Codebase Directory Structure — TrexoByte ERP

```
trexoERP/
├── .agent/
│   └── rules.md                  # Custom agent execution rules & boundaries
├── .planning/
│   ├── codebase/                 # Evidence-backed codebase map documents
│   │   ├── STACK.md              # Technology stack & dependencies
│   │   ├── INTEGRATIONS.md       # External integrations & data persistence
│   │   ├── ARCHITECTURE.md       # High-level architecture & patterns
│   │   ├── STRUCTURE.md          # Directory & file layout
│   │   ├── CONVENTIONS.md        # Coding standards & styling patterns
│   │   ├── TESTING.md            # Testing posture & coverage review
│   │   └── CONCERNS.md           # Fragilities & technical debt
│   ├── onboarding/
│   │   └── SUMMARY.md            # Onboarding summary & quick reference
│   ├── config.json               # GSD project configuration
│   ├── PROJECT.md                # Project mission & module definitions
│   ├── REQUIREMENTS.md           # Scoped requirements backlog
│   ├── ROADMAP.md                # Phased implementation roadmap
│   └── STATE.md                  # Current workflow & execution state
├── prisma/
│   ├── dev.db                    # SQLite file (fallback / local testing artifact)
│   ├── schema.prisma             # Data models: User, Role, Client, ContentItem, Task, Invoice, Payment, ActivityLog
│   └── seed.ts                   # Comprehensive seed script for roles, staff, clients, tasks & invoices
├── public/                       # Static public assets (favicons, icons)
├── src/
│   ├── app/                      # Next.js App Router root & page endpoints
│   │   ├── api/                  # REST API Route Handlers (force-dynamic)
│   │   │   ├── activity-log/     # GET audit logs, POST /undo rollback
│   │   │   ├── auth/             # [...nextauth] route handler
│   │   │   ├── clients/          # GET / POST clients, [id] GET/PUT/DELETE
│   │   │   ├── content/          # GET / POST / PUT / DELETE content items & /bulk
│   │   │   ├── dashboard/        # GET aggregated operational KPIs & metrics
│   │   │   ├── invoices/         # GET / POST / PUT invoices & /payment recordings
│   │   │   ├── roles/            # GET / POST role definitions & permissions
│   │   │   ├── search/           # GET global omnichannel search
│   │   │   ├── tasks/            # GET / POST / PUT / DELETE operational tasks
│   │   │   └── users/            # GET / POST / PUT / DELETE team accounts & [id]/avatar
│   │   ├── billing/
│   │   │   └── page.tsx          # Billing & invoicing portal with NPR revenue KPIs
│   │   ├── clients/
│   │   │   └── page.tsx          # Client roster, retainer tiers, team allocations & edit modals
│   │   ├── login/
│   │   │   └── page.tsx          # Agency login portal with dark brutalist theme
│   │   ├── planning/
│   │   │   └── page.tsx          # Content planning calendar (shoots, reels, carousels, stories)
│   │   ├── reports/
│   │   │   └── page.tsx          # Agency analytics, content velocity, workload distribution
│   │   ├── tasks/
│   │   │   └── page.tsx          # Task management (Kanban & List views, urgency filtering)
│   │   ├── tracker/
│   │   │   └── page.tsx          # Content production pipeline Kanban (@dnd-kit drag & drop)
│   │   ├── users/
│   │   │   └── page.tsx          # Staff directory, role editor & permission matrix
│   │   ├── globals.css           # Tailwind v4 import, CSS variables, .clicky-btn styling
│   │   ├── layout.tsx            # Root layout with AppProviders and AppShell
│   │   └── page.tsx              # Executive Operations Dashboard
│   ├── components/               # Core UI components & modals
│   │   ├── app-shell.tsx         # Main responsive app layout with sidebar and header
│   │   ├── audit-history-modal.tsx # Visual audit trail modal with undo triggers
│   │   ├── header.tsx            # Topbar with global search, impersonation picker, quick add
│   │   ├── personal-profile-modal.tsx # User profile & avatar upload modal
│   │   ├── providers.tsx         # React Contexts: SessionProvider, ImpersonationContext, cached state
│   │   ├── quick-add-modal.tsx   # Omnipresent fast-entry modal (Content, Task, Shoot)
│   │   └── sidebar.tsx           # Collapsible navigation sidebar with RBAC filtering
│   ├── lib/                      # Core business logic & utilities
│   │   ├── auth.ts               # NextAuth configuration & Credentials provider
│   │   ├── cache.ts              # In-process API response cache
│   │   ├── date-utils.ts         # Asia/Kathmandu zero-shift date formatting & parsing
│   │   ├── deleted-clients.ts    # Soft-deleted client memory synchronization
│   │   ├── permissions.ts        # RBAC permission hierarchy evaluator
│   │   └── prisma.ts             # Prisma Client singleton with connection URL sanitizer
│   └── middleware.ts             # NextAuth route protection middleware
├── AGENTS.md                     # Next.js agent rule definitions
├── CLAUDE.md                     # Reference to AGENTS.md
├── eslint.config.mjs             # ESLint configuration
├── next.config.ts                # Next.js build configuration
├── package.json                  # Project dependencies and npm scripts
├── postcss.config.mjs            # PostCSS configuration for Tailwind v4
└── tsconfig.json                 # TypeScript compiler configuration
```
