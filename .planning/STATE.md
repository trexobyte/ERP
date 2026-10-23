# Project State — TrexoByte ERP

## Current Status
- **Current Milestone:** Milestone v1.2 Client & External Integrations (Completed)
- **Active Phase:** Phase 4 — Invoice PDF Generation & Shoot Calendar Exports
- **Status:** Phase 4 Completed (All 31 requirements satisfied across Milestones v1.0, v1.1, and v1.2)
- **Last Action:** Executed Phase 4 with RFC 5545 calendar export, Google Calendar sync, automated branded invoice PDF generator, interactive preview modal, and 75/75 passing tests.

## Project Metrics
- **Total Codebase Files Mapped:** 45+ application source files across 8 core operational modules
- **Total Requirements Tracked:** 31/31 requirements satisfied (100% active/verified)
- **Roadmap Phases:** 4/4 phases completed across Milestones v1.0, v1.1, and v1.2
- **Automated Tests:** 75 tests passing (100% pass rate) across 8 test suites
- **Page Decompositions:** 3 monolithic page components decomposed (>2,560 lines moved to dedicated subcomponents)

## Key Decisions & Locked Architectural Context
- **Testing Engine:** Vitest configured with path alias (`@/* -> ./src/*`) and `vitest run` npm script.
- **Framework & Runtime:** Next.js 16.3.6 App Router, React 19.2.8, TypeScript 5, Tailwind CSS v4.
- **Security & Auth:** Unified environment validator `src/lib/env.ts`, `password123` fallback strictly blocked in production and gated by `ALLOW_DEV_PASSWORD_FALLBACK === 'true'`. NextAuth secret reconciled.
- **Cache Architecture:** Decoupled `CacheStore` supporting zero-dependency Upstash Redis REST protocol (over native `fetch`) for multi-instance serverless deployments, with automatic in-memory fallback for local dev and CI.
- **Calendar & Sync Engine:** Zero-dependency RFC 5545 iCalendar builder (`src/lib/ics-generator.ts`) with ISO 8601 formatting, CRLF envelopes, and Google Calendar web intents.
- **PDF Generation Engine:** Zero-dependency PDF-1.4 binary engine (`src/lib/invoice-pdf.ts`) and CSS `@media print` A4 template (`src/components/billing/invoice-preview-modal.tsx`) eliminating bloated native dependencies.
- **Component Architecture:** Feature-scoped subcomponents under `src/components/{feature}/` with lean page orchestrators.
- **Timezone Invariant:** All dates must strictly utilize `src/lib/date-utils.ts` to prevent Asia/Kathmandu (UTC+5:45) calendar day shifts.
- **Rollback Engine:** Entity updates and deletions must capture previous state in `ActivityLog` to preserve single-click undo capability.
- **Styling Standard:** Brutalist dark theme with `#FF3B00` Vermillion accent and `.clicky-btn` tactile interactions.

## Next Recommended Action
- Run `/gsd-verify-work` or milestone summary to conclude Milestone v1.2.
