# Phase 4 Plan: Invoice PDF Generation & Shoot Calendar Exports

## Phase Metadata
- **Phase Number:** 04
- **Phase Name:** Invoice PDF Generation & Shoot Calendar Exports
- **Goal:** Deliver professional client-facing branded PDF invoices and calendar synchronization (.ics and Google Calendar) for shoot sessions, fully empowering billing and production workflows.
- **Target Requirements:** `IP-05`, `PC-06`
- **Execution Strategy:** Tracer-first (lead with RFC 5545 iCalendar generator and calendar export API tracer slice, followed by invoice PDF generation engine, UI integrations, and end-to-end verification).

---

## Tasks Breakdown

### Task 1: Tracer Slice — RFC 5545 iCalendar Generator & Calendar Export API (`PC-06`)
- **Objective:** Build a robust, zero-dependency iCalendar RFC 5545 generator supporting single and bulk shoot exports, Google Calendar URL links, and an export API endpoint.
- **Target Files:**
  - `src/lib/ics-generator.ts` (create — RFC 5545 format builder and Google Calendar URL helper)
  - `src/app/api/calendar/export/route.ts` (create — API endpoint returning `text/calendar` attachments)
  - `src/lib/__tests__/ics-generator.test.ts` (create — unit test suite for calendar export)
- **Detailed Steps:**
  1. Create `src/lib/ics-generator.ts` with:
     - `generateIcsEvent(event: ShootCalendarEvent): string`: Emits a single `VEVENT` block with escaped text, Asia/Kathmandu UTC timestamps, UID, location, and description.
     - `generateIcsCalendar(events: ShootCalendarEvent[], calendarName?: string): string`: Wraps events in a valid `VCALENDAR` envelope with `PRODID` and `VERSION:2.0`.
     - `getGoogleCalendarUrl(event: ShootCalendarEvent): string`: Creates direct web intent for Google Calendar.
     - `downloadIcsFile(filename: string, content: string): void`: Client-side browser download helper.
  2. Create `src/app/api/calendar/export/route.ts`:
     - Accepts query parameters `clientId`, `month`, `year`.
     - Queries scheduled shoot items from Prisma database.
     - Formats items into `.ics` format.
     - Returns `Response` with `Content-Type: text/calendar; charset=utf-8` and `Content-Disposition: attachment; filename="trexobyte-shoots.ics"`.
  3. Create `src/lib/__tests__/ics-generator.test.ts`:
     - Test VCALENDAR envelope headers and version compliance.
     - Test VEVENT properties: UID, DTSTAMP, DTSTART, DTEND, SUMMARY, DESCRIPTION, LOCATION.
     - Test newline escaping (`\n` -> `\\n`) and special character handling.
     - Test Google Calendar URL query string format.
- **Verification:**
  - Run `npx vitest run src/lib/__tests__/ics-generator.test.ts` to verify 100% test pass rate.

---

### Task 2: Automated Invoice PDF Engine & Dedicated Preview Modal (`IP-05`)
- **Objective:** Create a branded invoice PDF generator and interactive preview modal equipped with print-to-PDF styles and direct PDF download.
- **Target Files:**
  - `src/lib/invoice-pdf.ts` (create — invoice data model, financial math, and PDF-1.4 stream generator)
  - `src/components/billing/invoice-preview-modal.tsx` (create — A4 invoice preview modal with print stylesheet and download action)
  - `src/app/api/invoices/[id]/pdf/route.ts` (create — API route for invoice PDF data and file download)
  - `src/lib/__tests__/invoice-pdf.test.ts` (create — unit test suite for invoice calculations and PDF headers)
- **Detailed Steps:**
  1. Create `src/lib/invoice-pdf.ts`:
     - `buildInvoiceData(invoice: any)`: Computes subtotal, applied payments, remaining balance, due status, and line items.
     - `generateInvoicePdfDocument(invoiceData: InvoicePdfData): Uint8Array | string`: Generates a standard PDF-1.4 binary stream with TrexoByte brand header, client info, itemized table, and payment receipts.
     - `downloadInvoicePdf(invoice: any): void`: Client-side download handler creating a `.pdf` blob.
  2. Create `src/components/billing/invoice-preview-modal.tsx`:
     - Dark brutalist modal container with backdrop blur.
     - Pixel-perfect white A4 document sheet:
       - TrexoByte vermillion banner and logo mark.
       - Official agency contact, Kathmandu Nepal address, PAN/Tax details.
       - Bill To client information and package tier badge.
       - Invoice metadata: Invoice #, Issue Date, Due Date, Billing Period.
       - Line items table with monthly retainer and service deliverables.
       - Payment history breakdown and outstanding balance in NPR.
       - Bank transfer, eSewa, and Fonepay remittance instructions.
       - Authorized signature block.
     - Actions: "Print / Save as PDF" (`window.print()`) and "Download PDF".
     - Print media CSS (`@media print`) hiding navigation, modals, and backgrounds so only the invoice prints.
  3. Create `src/app/api/invoices/[id]/pdf/route.ts`:
     - Fetches invoice and client relations with resilient database retry.
     - Generates PDF attachment with `Content-Type: application/pdf`.
  4. Create `src/lib/__tests__/invoice-pdf.test.ts`:
     - Test subtotal, payments sum, and outstanding balance arithmetic in NPR.
     - Test PDF binary header (`%PDF-1.4`) and trailer syntax.
     - Test handling of partial payments and fully settled invoices.
- **Verification:**
  - Run `npx vitest run src/lib/__tests__/invoice-pdf.test.ts`.

---

### Task 3: UI Integration Across Planning Calendar & Billing Directory
- **Objective:** Integrate calendar export triggers into planning components and invoice preview into billing and client views.
- **Target Files:**
  - `src/components/planning/content-detail-modal.tsx` (update — add "Add to Google Calendar" and "Download .ics" for shoot items)
  - `src/components/planning/planning-filter-bar.tsx` (update — add "Export Shoots (.ics)" button)
  - `src/app/billing/page.tsx` (update — add "View / Print Invoice" button in invoice table)
  - `src/components/clients/client-detail-drawer.tsx` (update — add "View Invoice" button in invoices tab)
- **Detailed Steps:**
  1. In `src/components/planning/content-detail-modal.tsx`:
     - When item is of type `SHOOT` (or has `scheduledDate`), render calendar export action buttons.
     - Clicking "Add to Google Calendar" opens Google Calendar in a new tab with pre-filled shoot details.
     - Clicking "Download .ics" triggers client-side `.ics` file download.
  2. In `src/components/planning/planning-filter-bar.tsx`:
     - Add an "Export Shoots (.ics)" button next to the month navigation.
     - Triggers export of all scheduled shoot events for the selected month and active client filters.
  3. In `src/app/billing/page.tsx`:
     - Add an "Invoice / PDF" button on each invoice row.
     - Wire to `InvoicePreviewModal`.
  4. In `src/components/clients/client-detail-drawer.tsx`:
     - Add a "Preview / PDF" action on invoice cards within the billing history tab.
- **Verification:**
  - Run `npm test` and `npm run build` to confirm clean compilation and interaction contracts.

---

### Task 4: Full System Verification, Regression Testing & Health Gate
- **Objective:** Verify all test suites pass, production build completes with 0 errors, and update roadmap state.
- **Detailed Steps:**
  1. Run `npm test` (all 60+ test suites green).
  2. Run `npm run build` (all 16+ routes and API endpoints compile cleanly).
  3. Update `.planning/STATE.md` with Phase 4 completion.
  4. Update `.planning/REQUIREMENTS.md` marking `IP-05` and `PC-06` completed.
  5. Update `.planning/ROADMAP.md` setting Phase 4 status to Completed.
- **Verification:**
  - Zero test regressions.
  - Zero build warnings/errors.

---

## Success Criteria Checklist
- [x] RFC 5545 iCalendar generator created at `src/lib/ics-generator.ts`.
- [x] Calendar export API endpoint created at `src/app/api/calendar/export/route.ts`.
- [x] New unit test suite `src/lib/__tests__/ics-generator.test.ts` passing 100%.
- [x] Invoice PDF generator and data builder created at `src/lib/invoice-pdf.ts`.
- [x] Branded invoice preview modal created at `src/components/billing/invoice-preview-modal.tsx` with print-to-PDF styles and PDF download.
- [x] Invoice PDF API endpoint created at `src/app/api/invoices/[id]/pdf/route.ts`.
- [x] New unit test suite `src/lib/__tests__/invoice-pdf.test.ts` passing 100%.
- [x] "Add to Google Calendar" and "Download .ics" integrated into `ContentDetailModal`.
- [x] "Export Shoots (.ics)" integrated into `PlanningFilterBar`.
- [x] Invoice preview integrated into `BillingPage` and `ClientDetailDrawer`.
- [x] `npm test` passes 100% across all test suites (75/75 tests green).
- [x] `npm run build` succeeds with zero errors (all 18 routes and static pages compile cleanly).
- [x] Requirements `IP-05` and `PC-06` marked completed in `.planning/REQUIREMENTS.md`.
