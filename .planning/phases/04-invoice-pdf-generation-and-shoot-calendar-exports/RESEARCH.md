# Phase 4 Research: Invoice PDF Generation & Shoot Calendar Exports

## 1. Problem Statement & Operational Needs

TrexoByte is an operational ERP platform for a creative digital agency in Kathmandu, Nepal. Two critical client communication and workflow automation gaps currently exist:

### 1.1 Automated Invoice PDF Generation (`IP-05`)
- **Current State:** Invoices are tracked in PostgreSQL and presented in an admin dashboard table (`/billing`), but agency billing officers and account managers have no way to generate, preview, or export an official, branded client-facing invoice document.
- **Requirements:**
  - Standardized TrexoByte agency branding: Logo, official business address (Kathmandu, Nepal), tax/PAN credentials, contact information (`billing@trexobyte.com`), and bank transfer/eSewa/Fonepay settlement instructions.
  - Client billing information: Business name, package tier, assigned account manager, billing period (e.g. "October 2026").
  - Financial calculations: Line items for monthly retainer and creative deliverables, subtotal, discount, VAT calculation, payments applied, and balance due in Nepalese Rupees (NPR).
  - Double-mode export:
    1. **Pixel-perfect Print & Save to PDF:** Browser print styling (`@media print`) that strips navigation bars, headers, and backgrounds to render a crisp A4 printable invoice directly to PDF.
    2. **Direct PDF Download:** Programmatic PDF generation that delivers a downloadable `.pdf` file with genuine binary headers (`%PDF-1.4`) and formatted text/tables without heavy dependency bloat.

### 1.2 Shoot Session Calendar Exports (`PC-06`)
- **Current State:** Content items of type `SHOOT` (and video/reel productions) are scheduled on the drag-and-drop planning calendar (`/planning`). However, videographers, directors, clients, and models need their shoot appointments synchronized to their mobile phone calendar applications (Google Calendar, Apple Calendar, Outlook).
- **Requirements:**
  - **RFC 5545 iCalendar Standard (`.ics`):** Generate valid `.ics` format specifying event UID, timestamps, start/end dates, summary, detailed shoot agenda/equipment notes, location, and organizer details.
  - **Asia/Kathmandu Timezone Consistency (UTC+5:45):** Date and time values must align with the agency's timezone without unexpected 5h45m shifts.
  - **Dual Export Modes:**
    1. **Single Event Export:** Inside `ContentDetailModal`, offer one-click "Add to Google Calendar" (via direct web URL intent) and "Download .ics".
    2. **Bulk / Filtered Calendar Export:** Inside `PlanningFilterBar` and via `/api/calendar/export`, allow exporting all scheduled shoots for a given month or client.

---

## 2. Technical Evaluation & Dependency Constraints

### 2.1 Dependency Isolation
- A dry-run installation of heavy third-party PDF packages (`jspdf`, `@react-pdf/renderer`) confirmed upstream npm peer conflicts between `@types/node` and `vitest`.
- Adding massive native canvas or webassembly rendering dependencies adds bundle bloat and risks edge/serverless runtime incompatibilities.
- **Architectural Solution:**
  1. Build a zero-dependency, type-safe RFC 5545 iCalendar generator (`src/lib/ics-generator.ts`).
  2. Build a clean, zero-dependency PDF document generator (`src/lib/invoice-pdf.ts`) generating standard PDF-1.4 binary text stream, paired with a print-optimized modal (`InvoicePreviewModal`) utilizing CSS print media directives.

### 2.2 Google Calendar Web Intent Format
The one-click URL format:
```
https://calendar.google.com/calendar/render?action=TEMPLATE&text={TITLE}&dates={START_UTC}/{END_UTC}&details={DESCRIPTION}&location={LOCATION}
```
Timestamps formatted as ISO UTC strings without dashes or colons: `YYYYMMDDTHHmmssZ`.

### 2.3 RFC 5545 `.ics` Structure
```
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//TrexoByte ERP//Shoots Calendar//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:shoot-12345@trexobyte.com
DTSTAMP:20261023T060000Z
DTSTART:20261025T041500Z
DTEND:20261025T071500Z
SUMMARY:TrexoByte Shoot: Sky Park Resort Commercial
DESCRIPTION:Production Shoot for Sky Park Resort...
LOCATION:Kathmandu, Nepal
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR
```

---

## 3. Architecture & Target Component Structure

```
src/
├── lib/
│   ├── ics-generator.ts       # RFC 5545 .ics builder & Google Calendar URL generator
│   ├── invoice-pdf.ts         # Invoice data model, printable HTML & PDF-1.4 stream generator
│   └── __tests__/
│       ├── ics-generator.test.ts # Unit tests for iCalendar RFC compliance
│       └── invoice-pdf.test.ts   # Unit tests for invoice financial math & PDF formatting
├── app/
│   └── api/
│       ├── calendar/
│       │   └── export/
│       │       └── route.ts   # API endpoint returning text/calendar attachment
│       └── invoices/
│           └── [id]/
│               └── pdf/
│                   └── route.ts # API endpoint returning invoice PDF or data
└── components/
    ├── billing/
    │   └── invoice-preview-modal.tsx # Branded printable invoice modal with A4 print CSS
    └── planning/
        ├── content-detail-modal.tsx  # Enhanced with Google Calendar & .ics buttons
        └── planning-filter-bar.tsx   # Enhanced with "Export Shoots (.ics)" button
```

---

## 4. Verification & Testing Strategy
1. **iCalendar RFC 5545 Verification:** Unit test generator against standard ICS parser rules, ensuring correct line endings (`\r\n`), timezone handling, and special character escaping.
2. **Invoice Calculation & Branding Verification:** Unit test financial calculations (subtotals, tax rates, payment receipts) and PDF header structure.
3. **Continuous Build Health:** Run `npm test` (all 60+ tests passing) and `npm run build` (0 compiler warnings/errors).
