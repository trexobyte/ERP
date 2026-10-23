import { describe, it, expect } from 'vitest';
import {
  buildInvoicePdfData,
  generateInvoicePdfDocument,
  TREXOBYTE_AGENCY_DETAILS,
} from '@/lib/invoice-pdf';

describe('Invoice PDF Engine & Financial Arithmetic (IP-05)', () => {
  const sampleInvoice = {
    id: 'inv-101',
    invoiceNumber: 'TB-2026-0088',
    amount: 150000,
    issueDate: '2026-10-01T00:00:00.000Z',
    dueDate: '2026-10-15T00:00:00.000Z',
    billingPeriod: 'October 2026',
    status: 'SENT',
    client: {
      id: 'client-1',
      name: 'Sky Park Resort',
      servicePackage: 'Social & Growth Retainer',
      packageTier: 'Premium',
      billingCycleDay: 5,
    },
    payments: [
      {
        id: 'pay-1',
        amountReceived: 60000,
        paymentDate: '2026-10-10T00:00:00.000Z',
        recordedBy: 'Bikash Gurung',
        paymentMethod: 'Bank Transfer',
      },
    ],
  };

  describe('buildInvoicePdfData', () => {
    it('accurately computes subtotal, payments applied, and balance due in NPR', () => {
      const data = buildInvoicePdfData(sampleInvoice);

      expect(data.invoiceNumber).toBe('TB-2026-0088');
      expect(data.subtotal).toBe(150000);
      expect(data.totalAmount).toBe(150000);
      expect(data.paidAmount).toBe(60000);
      expect(data.balanceDue).toBe(90000);
      expect(data.status).toBe('SENT');
      expect(data.client.name).toBe('Sky Park Resort');
      expect(data.payments).toHaveLength(1);
    });

    it('sets balanceDue to 0 when invoice is fully paid', () => {
      const paidInvoice = {
        ...sampleInvoice,
        status: 'PAID',
        payments: [
          {
            id: 'pay-1',
            amountReceived: 150000,
            paymentDate: '2026-10-05T00:00:00.000Z',
            recordedBy: 'Bikash Gurung',
          },
        ],
      };

      const data = buildInvoicePdfData(paidInvoice);
      expect(data.paidAmount).toBe(150000);
      expect(data.balanceDue).toBe(0);
    });

    it('handles invoices with no payments logged', () => {
      const unpaidInvoice = {
        ...sampleInvoice,
        payments: [],
      };

      const data = buildInvoicePdfData(unpaidInvoice);
      expect(data.paidAmount).toBe(0);
      expect(data.balanceDue).toBe(150000);
    });

    it('populates TrexoByte agency official tax and remittance details', () => {
      const data = buildInvoicePdfData(sampleInvoice);
      expect(data.agency.name).toBe(TREXOBYTE_AGENCY_DETAILS.name);
      expect(data.agency.panNumber).toBe(TREXOBYTE_AGENCY_DETAILS.panNumber);
      expect(data.agency.bankName).toBe(TREXOBYTE_AGENCY_DETAILS.bankName);
      expect(data.agency.accountNumber).toBe(TREXOBYTE_AGENCY_DETAILS.accountNumber);
    });
  });

  describe('generateInvoicePdfDocument', () => {
    it('generates a valid PDF-1.4 binary stream with ISO 32000 headers and trailers', () => {
      const data = buildInvoicePdfData(sampleInvoice);
      const pdf = generateInvoicePdfDocument(data);

      expect(pdf.startsWith('%PDF-1.4\n')).toBe(true);
      expect(pdf.trim().endsWith('%%EOF')).toBe(true);
      expect(pdf).toContain('/Type /Catalog');
      expect(pdf).toContain('/Type /Pages');
      expect(pdf).toContain('/Type /Page');
      expect(pdf).toContain('/MediaBox [0 0 595.28 841.89]'); // A4 dimensions
      expect(pdf).toContain('xref\n0 7');
      expect(pdf).toContain('trailer\n<< /Size 7 /Root 1 0 R >>');
    });

    it('embeds invoice number, client details, and balance due in PDF stream', () => {
      const data = buildInvoicePdfData(sampleInvoice);
      const pdf = generateInvoicePdfDocument(data);

      expect(pdf).toContain('TB-2026-0088');
      expect(pdf).toContain('Sky Park Resort');
      expect(pdf).toContain('NPR 90,000');
      expect(pdf).toContain('TREXOBYTE DIGITAL AGENCY');
    });
  });
});
