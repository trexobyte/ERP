# Coding Standards & Conventions — TrexoByte ERP

## 1. Naming & File Organization
- **App Router Pages:** Follow Next.js App Router conventions: `src/app/<route>/page.tsx` for views and `src/app/api/<route>/route.ts` for endpoints.
- **Dynamic Routes:** Enclosed in brackets: `src/app/api/clients/[id]/route.ts`. Use async params typing:
  ```typescript
  export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    // ...
  }
  ```
- **File Names:** Kebab-case for filenames (`app-shell.tsx`, `quick-add-modal.tsx`, `date-utils.ts`).
- **Component Exports:** Named PascalCase exports for reusable components (`export function Sidebar()`, `export function Header()`), default exports for route pages (`export default function DashboardPage()`).

## 2. Styling & Theme Conventions
- **Tailwind CSS v4:** Uses `@import "tailwindcss";` and `@theme` definitions in `src/app/globals.css`.
- **Brutalist Design Language:**
  - Dark-mode primary (`bg-background` `#09090B`, `card` `#121215`, `border` `#27272A`).
  - Vermillion Brand Accent (`#FF3B00` / `var(--color-vermillion)`).
  - Tactile Buttons: `.clicky-btn` utility class applied across action buttons, generating a 2px offset box shadow that depresses on active click.
  - High density typography with uppercase tracking for status badges (`text-[10px] font-mono uppercase tracking-wider`).

## 3. Date & Timezone Conventions
- **Rule:** Never use native `date.toISOString().split('T')[0]` or `new Date("YYYY-MM-DD")` directly for date logic, as local browsers and server environments will shift dates back or forward by a day due to UTC vs Asia/Kathmandu (UTC+5:45) offsets.
- **Enforcement:** Always use methods from `src/lib/date-utils.ts`:
  - `toLocalDateKey(date)`: formats string or Date object to `YYYY-MM-DD` using local calendar values.
  - `parseLocalDateKey(str)`: parses `YYYY-MM-DD` into a local Date set to noon (12:00:00) to avoid midnight edge cases.
  - `toDatabaseDateString(date)`: converts any local date to UTC noon (`T12:00:00.000Z`) for database persistence.

## 4. Permission & RBAC Conventions
- Permissions are represented as a JSON map stored on the `Role.permissions` column.
- Evaluation must always use `hasPermission(permissions, module, requiredLevel)` from `src/lib/permissions.ts`.
- Hierarchy: `none` (0) < `view` (1) < `edit` (2) < `full` (3).
- Guard both the frontend (hiding/disabling controls or redirecting) and the backend API routes (returning 403 Forbidden).

## 5. Mutation & Audit Log Conventions
- Whenever modifying or deleting entities (`ContentItem`, `Task`, `Invoice`, `Client`, `User`), capture the current record snapshot beforehand as JSON.
- Store the snapshot in `ActivityLog.previousState` with action type (`UPDATE`, `DELETE`), allowing the `/api/activity-log/undo` route to reverse the operation.
- Always execute `invalidateCache()` with relevant entity prefixes (`content`, `tasks`, `dashboard`, `clients`, `invoices`, `users`) after every database write.

## 6. API Route Standards
- Always set `export const dynamic = 'force-dynamic';` on Next.js route handlers that interact with dynamic database queries.
- Validate authentication via `getServerSession(authOptions)` before processing requests.
- Return consistent error JSON structures: `{ error: string }` with appropriate HTTP status codes (401, 403, 404, 500).
