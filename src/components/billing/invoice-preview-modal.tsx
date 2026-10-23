'use client';

import React, { useEffect } from 'react';
import { X, Printer, Download, Building2, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { buildInvoicePdfData, downloadInvoicePdf } from '@/lib/invoice-pdf';

interface InvoicePreviewModalProps {
  invoice: any | null;
  isOpen: boolean;
  onClose: () => void;
}

export function InvoicePreviewModal({ invoice, isOpen, onClose }: InvoicePreviewModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !invoice) return null;

  const data = buildInvoicePdfData(invoice);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    downloadInvoicePdf(invoice);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      {/* Print media styles to ensure only the invoice document prints */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-invoice-container,
          #printable-invoice-container * {
            visibility: visible !important;
          }
          #printable-invoice-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 20mm !important;
            background: white !important;
            color: black !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="relative w-full max-w-4xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Modal Action Bar (Hidden during print) */}
        <div className="no-print flex items-center justify-between p-4 bg-zinc-950/80 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FF3B00] text-white font-black text-sm shadow-md shadow-[#FF3B00]/20">
              TB
            </div>
            <div>
              <h3 className="text-sm font-extrabold tracking-tight text-white flex items-center gap-2">
                Invoice Document Preview
                <span className="font-mono text-xs text-[#FF3B00] bg-[#FF3B00]/15 px-2 py-0.5 rounded border border-[#FF3B00]/30">
                  {data.invoiceNumber}
                </span>
              </h3>
              <p className="text-[11px] text-zinc-400">
                Client: <span className="text-zinc-200 font-bold">{data.client.name}</span> • Period: {data.billingPeriod}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-800/80 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 transition-colors clicky-btn cursor-pointer"
              title="Print document or save to PDF via system print dialog"
            >
              <Printer className="h-3.5 w-3.5 text-zinc-300" />
              <span>Print / Save PDF</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FF3B00] hover:bg-[#e03400] text-xs font-bold text-white transition-colors shadow-md shadow-[#FF3B00]/20 clicky-btn cursor-pointer"
              title="Direct programmatic PDF download"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer ml-1"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Sheet Container */}
        <div className="p-4 sm:p-8 max-h-[80vh] overflow-y-auto bg-zinc-950/40">
          <div
            id="printable-invoice-container"
            className="w-full max-w-3xl mx-auto bg-white text-zinc-900 rounded-xl p-8 sm:p-10 shadow-xl border border-zinc-200 space-y-8 font-sans"
          >
            {/* Top Brand Accent Bar */}
            <div className="h-2 w-full bg-[#FF3B00] rounded-t-sm -mt-8 -mx-8 sm:-mt-10 sm:-mx-10 mb-6" />

            {/* Header: Agency Details vs Invoice Details */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b border-zinc-200 pb-6">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#FF3B00] text-white font-black text-lg shadow-sm">
                    TB
                  </div>
                  <div>
                    <h1 className="text-xl font-black tracking-tight text-zinc-900">
                      {data.agency.name.toUpperCase()}
                    </h1>
                    <p className="text-[11px] font-medium text-zinc-500">
                      {data.agency.tagline}
                    </p>
                  </div>
                </div>
                <div className="text-xs text-zinc-600 pt-2 space-y-0.5">
                  <p>{data.agency.address}, {data.agency.city}, {data.agency.country}</p>
                  <p className="font-mono text-[11px]">
                    <span className="font-semibold text-zinc-700">PAN Registration:</span> {data.agency.panNumber}
                  </p>
                  <p>
                    <span className="font-semibold text-zinc-700">Billing Support:</span> {data.agency.email} • {data.agency.phone}
                  </p>
                </div>
              </div>

              <div className="text-left sm:text-right space-y-1.5">
                <span className="inline-block text-2xl font-black text-[#FF3B00] tracking-tight">
                  INVOICE
                </span>
                <p className="font-mono font-bold text-sm text-zinc-900">{data.invoiceNumber}</p>
                
                <div className="pt-1">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-extrabold tracking-wider uppercase ${
                      data.status === 'PAID'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : data.status === 'OVERDUE'
                        ? 'bg-rose-100 text-rose-800 border border-rose-300'
                        : 'bg-amber-100 text-amber-800 border border-amber-300'
                    }`}
                  >
                    {data.status === 'PAID' && <CheckCircle2 className="h-3 w-3" />}
                    {data.status === 'OVERDUE' && <AlertTriangle className="h-3 w-3" />}
                    {data.status !== 'PAID' && data.status !== 'OVERDUE' && <Clock className="h-3 w-3" />}
                    {data.status}
                  </span>
                </div>

                <div className="text-xs text-zinc-600 pt-2 space-y-0.5 font-mono">
                  <p><span className="text-zinc-500">Issue Date:</span> <span className="font-bold text-zinc-800">{data.issueDate}</span></p>
                  <p><span className="text-zinc-500">Payment Due:</span> <span className="font-bold text-zinc-800">{data.dueDate}</span></p>
                  <p><span className="text-zinc-500">Period:</span> {data.billingPeriod}</p>
                </div>
              </div>
            </div>

            {/* Bill To Section */}
            <div className="bg-zinc-50 p-4 rounded-lg border border-zinc-200">
              <span className="block text-[10px] font-mono uppercase tracking-wider font-bold text-zinc-500 mb-1">
                Billed To Client:
              </span>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-extrabold text-zinc-900 flex items-center gap-2">
                    <span
                      className="inline-block h-3 w-3 rounded-full"
                      style={{ backgroundColor: data.client.color || '#FF3B00' }}
                    />
                    {data.client.name}
                  </h2>
                  <p className="text-xs text-zinc-600 mt-0.5">
                    Agency Package: <span className="font-semibold text-zinc-800">{data.client.servicePackage}</span>
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-2.5 py-1 rounded bg-zinc-200/80 text-[11px] font-bold text-zinc-800 uppercase font-mono">
                    {data.client.packageTier} Tier
                  </span>
                  <p className="text-[11px] text-zinc-500 mt-0.5 font-mono">
                    Billing Cycle: Day {data.client.billingCycleDay || 1} of month
                  </p>
                </div>
              </div>
            </div>

            {/* Itemized Line Items Table */}
            <div>
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-zinc-300 text-zinc-600 uppercase text-[10px] font-mono">
                    <th className="py-2.5 px-3">Description & Scope</th>
                    <th className="py-2.5 px-3 text-center">Service Period</th>
                    <th className="py-2.5 px-3 text-right">Amount (NPR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {data.lineItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-zinc-50/50">
                      <td className="py-3 px-3 font-semibold text-zinc-800">{item.description}</td>
                      <td className="py-3 px-3 text-center font-mono text-zinc-600">{item.period || '-'}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-zinc-900">
                        NPR {item.amount.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Calculation Totals Breakdown */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-t border-zinc-200 pt-4">
              <div className="text-xs text-zinc-500 max-w-sm space-y-1">
                <p className="font-bold text-zinc-700 uppercase tracking-wider text-[10px] font-mono">
                  Terms & Conditions:
                </p>
                <p>
                  Payment is due within 14 calendar days of issue date. Retainer coverage covers digital media
                  assets, creative direction, and campaign management as specified in the client SLA agreement.
                </p>
              </div>

              <div className="w-full sm:w-72 space-y-2 text-xs">
                <div className="flex justify-between text-zinc-600 font-mono">
                  <span>Subtotal:</span>
                  <span className="font-semibold text-zinc-800">NPR {data.subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-zinc-600 font-mono">
                  <span>Tax (0% / Exempt):</span>
                  <span className="font-semibold text-zinc-800">NPR 0</span>
                </div>
                <div className="flex justify-between text-zinc-600 font-mono">
                  <span>Payments Received:</span>
                  <span className="font-semibold text-emerald-600">
                    - NPR {data.paidAmount.toLocaleString()}
                  </span>
                </div>

                <div className="border-t-2 border-zinc-300 pt-2">
                  <div className="flex justify-between items-center p-2.5 rounded bg-orange-50 border border-orange-200">
                    <span className="font-black text-xs text-[#FF3B00] uppercase font-mono">
                      Balance Due:
                    </span>
                    <span className="font-mono font-black text-base text-[#FF3B00]">
                      NPR {data.balanceDue.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Remittance & Settlement Details */}
            <div className="rounded-lg border border-zinc-200 bg-zinc-50/80 p-4 space-y-2">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-zinc-800 font-mono flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-[#FF3B00]" />
                Remittance & Settlement Instructions:
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-zinc-600 font-mono">
                <div>
                  <p className="text-[10px] uppercase text-zinc-400">Direct Bank Wire</p>
                  <p className="font-bold text-zinc-800">{data.agency.bankName}</p>
                  <p>A/C: <span className="font-bold text-zinc-900">{data.agency.accountNumber}</span></p>
                  <p>Name: {data.agency.accountName}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-zinc-400">Digital Settlement (Nepal)</p>
                  <p><span className="font-bold text-emerald-600">eSewa ID:</span> {data.agency.esewaId}</p>
                  <p><span className="font-bold text-red-600">Fonepay Merchant:</span> {data.agency.fonepayMerchant}</p>
                  <p className="text-[11px] text-zinc-500 mt-1">Please mention invoice # in payment remarks.</p>
                </div>
              </div>
            </div>

            {/* Payment Receipts History (if any) */}
            {data.payments.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 font-mono">
                  Recorded Payment Receipts ({data.payments.length}):
                </h4>
                <div className="divide-y divide-zinc-200 border border-zinc-200 rounded-lg overflow-hidden text-xs font-mono">
                  {data.payments.map((p, idx) => (
                    <div key={idx} className="p-2.5 flex items-center justify-between bg-zinc-50/40">
                      <div>
                        <span className="font-bold text-emerald-700">
                          + NPR {p.amountReceived.toLocaleString()}
                        </span>
                        <span className="text-[11px] text-zinc-500 ml-2">
                          via {p.paymentMethod || 'Bank Transfer'}
                        </span>
                      </div>
                      <span className="text-[11px] text-zinc-500">
                        {p.paymentDate ? new Date(p.paymentDate).toLocaleDateString() : ''} (by {p.recordedBy})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer & Signature Stamp */}
            <div className="border-t border-zinc-200 pt-6 flex flex-col sm:flex-row justify-between items-end gap-4 text-xs text-zinc-500">
              <div>
                <p className="font-bold text-zinc-700">TrexoByte Technologies Pvt. Ltd.</p>
                <p className="text-[11px]">Kathmandu, Nepal • This is an official computer-generated document.</p>
              </div>

              <div className="text-center sm:text-right">
                <div className="h-10 border-b border-zinc-400 w-44 mb-1 mx-auto sm:ml-auto" />
                <span className="text-[10px] font-mono uppercase tracking-wider font-semibold text-zinc-600">
                  Authorized Signatory
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
