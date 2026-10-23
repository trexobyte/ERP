/**
 * Branded Invoice PDF Engine for TrexoByte ERP.
 * Builds structured financial models in NPR (Nepalese Rupees) and generates
 * genuine PDF-1.4 document streams with TrexoByte agency branding,
 * line items, payment history, and bank/eSewa remittance details.
 */

import { formatLocalDate } from '@/lib/date-utils';

export interface InvoiceLineItem {
  description: string;
  period?: string;
  amount: number;
}

export interface InvoicePaymentRecord {
  id: string;
  amountReceived: number;
  paymentDate: string | Date;
  recordedBy?: string;
  paymentMethod?: string;
  referenceNotes?: string;
}

export interface InvoicePdfData {
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  billingPeriod: string;
  status: string;
  client: {
    id: string;
    name: string;
    color?: string;
    servicePackage?: string;
    packageTier?: string;
    billingCycleDay?: number;
  };
  agency: {
    name: string;
    tagline: string;
    address: string;
    city: string;
    country: string;
    panNumber: string;
    email: string;
    phone: string;
    bankName: string;
    accountName: string;
    accountNumber: string;
    branch: string;
    fonepayMerchant: string;
    esewaId: string;
  };
  lineItems: InvoiceLineItem[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  paymentNotes?: string;
  payments: InvoicePaymentRecord[];
}

export const TREXOBYTE_AGENCY_DETAILS = {
  name: 'TrexoByte Digital Agency',
  tagline: 'Creative Production, Social Growth & Performance Marketing',
  address: 'Jhamsikhel, Lalitpur (Kathmandu Valley)',
  city: 'Kathmandu',
  country: 'Nepal',
  panNumber: '609845123',
  email: 'billing@trexobyte.com',
  phone: '+977 1 5543210',
  bankName: 'Nabil Bank Limited',
  accountName: 'TrexoByte Technologies Pvt. Ltd.',
  accountNumber: '01200175023901',
  branch: 'Jhamsikhel Branch',
  fonepayMerchant: 'TREXOBYTE-MERCHANT-NP',
  esewaId: '9801234567 (TrexoByte Billing)',
};

/**
 * Builds a structured, validated InvoicePdfData object from database invoice records.
 */
export function buildInvoicePdfData(invoice: any): InvoicePdfData {
  const totalAmount = Number(invoice.amount) || 0;
  const rawPayments = Array.isArray(invoice.payments) ? invoice.payments : [];

  const payments: InvoicePaymentRecord[] = rawPayments.map((p: any) => ({
    id: p.id || Math.random().toString(),
    amountReceived: Number(p.amountReceived) || 0,
    paymentDate: p.paymentDate || new Date(),
    recordedBy: p.recordedBy || 'Finance Officer',
    paymentMethod: p.paymentMethod || 'Bank Transfer',
    referenceNotes: p.notes || p.referenceNotes,
  }));

  const paidAmount = payments.reduce((acc, p) => acc + p.amountReceived, 0);
  const balanceDue = Math.max(0, totalAmount - paidAmount);

  const clientName = invoice.client?.name || 'Valued Client';
  const servicePackage = invoice.client?.servicePackage || 'Social Media & Creative Production';
  const packageTier = invoice.client?.packageTier || 'Standard';

  const lineItems: InvoiceLineItem[] = [
    {
      description: `Monthly Retainer — ${servicePackage} (${packageTier} Tier)`,
      period: invoice.billingPeriod || 'Current Billing Cycle',
      amount: totalAmount,
    },
  ];

  return {
    invoiceNumber: invoice.invoiceNumber || `TB-2026-${Math.floor(Math.random() * 900 + 100)}`,
    issueDate: formatLocalDate(invoice.issueDate) || new Date().toISOString().split('T')[0],
    dueDate: formatLocalDate(invoice.dueDate) || new Date().toISOString().split('T')[0],
    billingPeriod: invoice.billingPeriod || 'Monthly Retainer',
    status: (invoice.status || 'SENT').toUpperCase(),
    client: {
      id: invoice.client?.id || invoice.clientId || '',
      name: clientName,
      color: invoice.client?.color || '#FF3B00',
      servicePackage,
      packageTier,
      billingCycleDay: invoice.client?.billingCycleDay || 1,
    },
    agency: TREXOBYTE_AGENCY_DETAILS,
    lineItems,
    subtotal: totalAmount,
    taxAmount: 0,
    totalAmount,
    paidAmount,
    balanceDue,
    paymentNotes: invoice.paymentNotes,
    payments,
  };
}

/**
 * Escapes characters for PDF string literals.
 */
function escapePdfText(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

/**
 * Generates a valid PDF-1.4 document stream for the invoice.
 * Conforms to ISO 32000-1 specification.
 */
export function generateInvoicePdfDocument(data: InvoicePdfData): string {
  const contentCommands: string[] = [];

  // 1. Draw Vermillion Brand Accent Bar at Top
  // RGB Vermillion: #FF3B00 -> 1.0, 0.231, 0.0
  contentCommands.push('q');
  contentCommands.push('1.0 0.231 0.0 rg'); // Vermillion fill
  contentCommands.push('0 820 595.28 21.89 re');
  contentCommands.push('f');
  contentCommands.push('Q');

  // 2. Header Section
  contentCommands.push('BT');
  contentCommands.push('/F2 20 Tf'); // Helvetica-Bold 20pt
  contentCommands.push('0.05 0.05 0.05 rg');
  contentCommands.push('40 780 Td');
  contentCommands.push(`(${escapePdfText(data.agency.name.toUpperCase())}) Tj`);
  contentCommands.push('ET');

  contentCommands.push('BT');
  contentCommands.push('/F1 9 Tf'); // Helvetica 9pt
  contentCommands.push('0.35 0.35 0.35 rg');
  contentCommands.push('40 765 Td');
  contentCommands.push(`(${escapePdfText(data.agency.tagline)}) Tj`);
  contentCommands.push('T*');
  contentCommands.push(`(${escapePdfText(`${data.agency.address}, ${data.agency.city}, ${data.agency.country}`)}) Tj`);
  contentCommands.push('T*');
  contentCommands.push(`(${escapePdfText(`PAN No: ${data.agency.panNumber}  |  Email: ${data.agency.email}`)}) Tj`);
  contentCommands.push('ET');

  // 3. Invoice Number & Badge on Right
  contentCommands.push('BT');
  contentCommands.push('/F2 16 Tf');
  contentCommands.push('1.0 0.231 0.0 rg');
  contentCommands.push('380 780 Td');
  contentCommands.push(`(INVOICE: ${escapePdfText(data.invoiceNumber)}) Tj`);
  contentCommands.push('ET');

  contentCommands.push('BT');
  contentCommands.push('/F1 9 Tf');
  contentCommands.push('0.2 0.2 0.2 rg');
  contentCommands.push('380 762 Td');
  contentCommands.push(`(Status: ${escapePdfText(data.status)}) Tj`);
  contentCommands.push('T*');
  contentCommands.push(`(Issue Date: ${escapePdfText(data.issueDate)}) Tj`);
  contentCommands.push('T*');
  contentCommands.push(`(Due Date: ${escapePdfText(data.dueDate)}) Tj`);
  contentCommands.push('T*');
  contentCommands.push(`(Billing Period: ${escapePdfText(data.billingPeriod)}) Tj`);
  contentCommands.push('ET');

  // Separator Line
  contentCommands.push('0.85 0.85 0.85 RG');
  contentCommands.push('1 w');
  contentCommands.push('40 705 m 555 705 l S');

  // 4. Bill To Client Box
  contentCommands.push('BT');
  contentCommands.push('/F2 11 Tf');
  contentCommands.push('0.1 0.1 0.1 rg');
  contentCommands.push('40 685 Td');
  contentCommands.push('(BILLED TO:) Tj');
  contentCommands.push('ET');

  contentCommands.push('BT');
  contentCommands.push('/F2 14 Tf');
  contentCommands.push('0.0 0.0 0.0 rg');
  contentCommands.push('40 668 Td');
  contentCommands.push(`(${escapePdfText(data.client.name)}) Tj`);
  contentCommands.push('ET');

  contentCommands.push('BT');
  contentCommands.push('/F1 9 Tf');
  contentCommands.push('0.3 0.3 0.3 rg');
  contentCommands.push('40 652 Td');
  contentCommands.push(`(Retainer Tier: ${escapePdfText(data.client.packageTier || 'Standard')}  |  Package: ${escapePdfText(data.client.servicePackage || 'Digital Growth')}) Tj`);
  contentCommands.push('ET');

  // 5. Line Items Table Header
  contentCommands.push('q');
  contentCommands.push('0.95 0.95 0.95 rg'); // Table header background
  contentCommands.push('40 615 515 22 re f');
  contentCommands.push('Q');

  contentCommands.push('BT');
  contentCommands.push('/F2 9 Tf');
  contentCommands.push('0.2 0.2 0.2 rg');
  contentCommands.push('50 622 Td');
  contentCommands.push('(DESCRIPTION) Tj');
  contentCommands.push('280 0 Td');
  contentCommands.push('(PERIOD) Tj');
  contentCommands.push('120 0 Td');
  contentCommands.push('(AMOUNT (NPR)) Tj');
  contentCommands.push('ET');

  // 6. Line Items Rows
  let currentY = 595;
  for (const item of data.lineItems) {
    contentCommands.push('BT');
    contentCommands.push('/F1 9 Tf');
    contentCommands.push('0.1 0.1 0.1 rg');
    contentCommands.push(`50 ${currentY} Td`);
    contentCommands.push(`(${escapePdfText(item.description)}) Tj`);
    contentCommands.push('280 0 Td');
    contentCommands.push(`(${escapePdfText(item.period || '-')}) Tj`);
    contentCommands.push('120 0 Td');
    contentCommands.push(`(NPR ${item.amount.toLocaleString()}) Tj`);
    contentCommands.push('ET');

    currentY -= 20;
  }

  // Horizontal line below items
  contentCommands.push('0.85 0.85 0.85 RG');
  contentCommands.push(`40 ${currentY + 5} m 555 ${currentY + 5} l S`);

  // 7. Totals Calculation Box
  currentY -= 20;
  contentCommands.push('BT');
  contentCommands.push('/F1 10 Tf');
  contentCommands.push('0.3 0.3 0.3 rg');
  contentCommands.push(`350 ${currentY} Td`);
  contentCommands.push('(Subtotal:) Tj');
  contentCommands.push(`120 0 Td (NPR ${data.subtotal.toLocaleString()}) Tj`);
  contentCommands.push('ET');

  currentY -= 18;
  contentCommands.push('BT');
  contentCommands.push('/F1 10 Tf');
  contentCommands.push('0.3 0.3 0.3 rg');
  contentCommands.push(`350 ${currentY} Td`);
  contentCommands.push('(Payments Applied:) Tj');
  contentCommands.push(`120 0 Td (NPR ${data.paidAmount.toLocaleString()}) Tj`);
  contentCommands.push('ET');

  currentY -= 22;
  // Highlight Total Due Box
  contentCommands.push('q');
  contentCommands.push('0.98 0.93 0.90 rg');
  contentCommands.push(`340 ${currentY - 5} 215 24 re f`);
  contentCommands.push('Q');

  contentCommands.push('BT');
  contentCommands.push('/F2 11 Tf');
  contentCommands.push('1.0 0.231 0.0 rg');
  contentCommands.push(`350 ${currentY} Td`);
  contentCommands.push('(BALANCE DUE:) Tj');
  contentCommands.push(`90 0 Td (NPR ${data.balanceDue.toLocaleString()}) Tj`);
  contentCommands.push('ET');

  // 8. Remittance & Settlement Info
  currentY = 440;
  contentCommands.push('0.85 0.85 0.85 RG');
  contentCommands.push(`40 ${currentY + 15} m 555 ${currentY + 15} l S`);

  contentCommands.push('BT');
  contentCommands.push('/F2 10 Tf');
  contentCommands.push('0.1 0.1 0.1 rg');
  contentCommands.push(`40 ${currentY} Td`);
  contentCommands.push('(PAYMENT & SETTLEMENT INSTRUCTIONS) Tj');
  contentCommands.push('ET');

  contentCommands.push('BT');
  contentCommands.push('/F1 8.5 Tf');
  contentCommands.push('0.25 0.25 0.25 rg');
  contentCommands.push(`40 ${currentY - 16} Td`);
  contentCommands.push(`(${escapePdfText(`Bank: ${data.agency.bankName}  |  Branch: ${data.agency.branch}`)}) Tj`);
  contentCommands.push('T*');
  contentCommands.push(`(${escapePdfText(`Account Name: ${data.agency.accountName}`)}) Tj`);
  contentCommands.push('T*');
  contentCommands.push(`(${escapePdfText(`Account Number: ${data.agency.accountNumber}`)}) Tj`);
  contentCommands.push('T*');
  contentCommands.push(`(${escapePdfText(`eSewa / Fonepay ID: ${data.agency.esewaId}`)}) Tj`);
  contentCommands.push('ET');

  // 9. Payment Receipts History (if any)
  if (data.payments.length > 0) {
    currentY -= 80;
    contentCommands.push('BT');
    contentCommands.push('/F2 9.5 Tf');
    contentCommands.push('0.1 0.1 0.1 rg');
    contentCommands.push(`40 ${currentY} Td`);
    contentCommands.push('(PAYMENT RECEIPTS LOGGED:) Tj');
    contentCommands.push('ET');

    currentY -= 15;
    for (const p of data.payments) {
      contentCommands.push('BT');
      contentCommands.push('/F1 8 Tf');
      contentCommands.push('0.3 0.3 0.3 rg');
      contentCommands.push(`40 ${currentY} Td`);
      contentCommands.push(
        `(${escapePdfText(`- Received NPR ${p.amountReceived.toLocaleString()} on ${formatLocalDate(p.paymentDate)} via ${p.paymentMethod || 'Bank'} (Recorded by ${p.recordedBy})`)}) Tj`
      );
      contentCommands.push('ET');
      currentY -= 12;
    }
  }

  // 10. Footer & Sign-off
  contentCommands.push('BT');
  contentCommands.push('/F1 8 Tf');
  contentCommands.push('0.5 0.5 0.5 rg');
  contentCommands.push('40 50 Td');
  contentCommands.push('(Thank you for partnering with TrexoByte. This is a computer-generated invoice.) Tj');
  contentCommands.push('340 0 Td (Authorized Signatory — TrexoByte ERP) Tj');
  contentCommands.push('ET');

  const contentStream = contentCommands.join('\n');
  const streamLength = Buffer.byteLength(contentStream, 'utf-8');

  // Assemble PDF document objects
  const objects: string[] = [];

  // Object 1: Catalog
  objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj');

  // Object 2: Pages
  objects.push('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj');

  // Object 3: Page (A4 MediaBox: 595.28 x 841.89 pt)
  objects.push(
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>\nendobj'
  );

  // Object 4: Stream Contents
  objects.push(`4 0 obj\n<< /Length ${streamLength} >>\nstream\n${contentStream}\nendstream\nendobj`);

  // Object 5: Font Helvetica
  objects.push('5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj');

  // Object 6: Font Helvetica-Bold
  objects.push('6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj');

  // Calculate Byte Offsets for Cross-Reference Table
  let header = '%PDF-1.4\n';
  let byteOffset = Buffer.byteLength(header, 'utf-8');
  const xrefOffsets: number[] = [0];

  let body = '';
  for (const obj of objects) {
    xrefOffsets.push(byteOffset);
    const objBlock = `${obj}\n`;
    body += objBlock;
    byteOffset += Buffer.byteLength(objBlock, 'utf-8');
  }

  const startXref = byteOffset;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    const offset = xrefOffsets[i].toString().padStart(10, '0');
    xref += `${offset} 00000 n \n`;
  }

  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF\n`;

  return `${header}${body}${xref}${trailer}`;
}

/**
 * Client-side browser download helper for the generated invoice PDF.
 */
export function downloadInvoicePdf(invoice: any): void {
  if (typeof window === 'undefined') return;

  const data = buildInvoicePdfData(invoice);
  const pdfString = generateInvoicePdfDocument(data);
  const blob = new Blob([pdfString], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `invoice-${data.invoiceNumber.toLowerCase()}.pdf`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
