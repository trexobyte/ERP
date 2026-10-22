# Onboarding Summary — TrexoByte ERP

## Executive Overview
The **TrexoByte ERP** brownfield codebase has been fully scanned, analyzed, and onboarded into the GSD planning system. TrexoByte ERP is an agency management platform purpose-built for digital creative agency operations in Kathmandu, Nepal.

## Codebase Map Quick Links
| Document | Purpose | Location |
|---|---|---|
| **Tech Stack** | Languages, runtimes, UI libraries, database & dependencies | [.planning/codebase/STACK.md](file:///c:/Users/Lenovo/Desktop/trexoERP/.planning/codebase/STACK.md) |
| **Integrations** | Database pool, NextAuth, in-memory cache, image assets | [.planning/codebase/INTEGRATIONS.md](file:///c:/Users/Lenovo/Desktop/trexoERP/.planning/codebase/INTEGRATIONS.md) |
| **Architecture** | Client/server boundaries, RBAC, audit rollback engine, timezones | [.planning/codebase/ARCHITECTURE.md](file:///c:/Users/Lenovo/Desktop/trexoERP/.planning/codebase/ARCHITECTURE.md) |
| **Structure** | Complete file & folder hierarchy with module breakdown | [.planning/codebase/STRUCTURE.md](file:///c:/Users/Lenovo/Desktop/trexoERP/.planning/codebase/STRUCTURE.md) |
| **Conventions** | Coding style, brutalist styling, date safety, error handling | [.planning/codebase/CONVENTIONS.md](file:///c:/Users/Lenovo/Desktop/trexoERP/.planning/codebase/CONVENTIONS.md) |
| **Testing** | Analysis of existing test gaps and proposed test architecture | [.planning/codebase/TESTING.md](file:///c:/Users/Lenovo/Desktop/trexoERP/.planning/codebase/TESTING.md) |
| **Concerns** | Technical debt, monolithic components, and security notes | [.planning/codebase/CONCERNS.md](file:///c:/Users/Lenovo/Desktop/trexoERP/.planning/codebase/CONCERNS.md) |

## Core Highlights & Architectural Distinctions
1. **Asia/Kathmandu (UTC+5:45) Timezone Safety:**
   - Agency operations, shoot scheduling, and retainer cycles rely strictly on `src/lib/date-utils.ts` to avoid off-by-one day slippage across UTC boundaries.
2. **Snapshot-Driven Audit & Undo:**
   - Mutations on clients, content, tasks, and users persist snapshot states in `ActivityLog`, allowing immediate rollback via `/api/activity-log/undo`.
3. **Live RBAC Impersonation:**
   - 8 operational modules guarded by hierarchical permissions (`none`, `view`, `edit`, `full`) with live role-switching in the UI header for testing.
4. **Brutalist Dark UI Design:**
   - Custom Tailwind v4 styling with vermillion `#FF3B00` accents, clicky drop-shadow buttons (`.clicky-btn`), and high-density operational data tables.

## GSD Planning Artifacts Created
- [PROJECT.md](file:///c:/Users/Lenovo/Desktop/trexoERP/.planning/PROJECT.md): Project charter, user personas, and module scope.
- [REQUIREMENTS.md](file:///c:/Users/Lenovo/Desktop/trexoERP/.planning/REQUIREMENTS.md): 31 scoped requirements covering active features and future enhancements.
- [ROADMAP.md](file:///c:/Users/Lenovo/Desktop/trexoERP/.planning/ROADMAP.md): 4-phase execution plan starting with automated testing and component modularization.
- [STATE.md](file:///c:/Users/Lenovo/Desktop/trexoERP/.planning/STATE.md): Centralized project state memory.
- [config.json](file:///c:/Users/Lenovo/Desktop/trexoERP/.planning/config.json): GSD workflow configuration.

## Next Steps
To begin execution on the first planned milestone (introducing automated test harness and safety contracts):
```bash
/gsd-plan-phase 1
```
