'use client';

import React, { useState, useEffect } from 'react';
import { useImpersonation } from '@/components/providers';
import { hasPermission, hasActionPermission } from '@/lib/permissions';
import {
  Receipt,
  Plus,
  Filter,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  CreditCard,
  Building2,
  X,
  Trash2,
  FileText,
  Lock,
} from 'lucide-react';
import { InvoicePreviewModal } from '@/components/billing/invoice-preview-modal';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { getTodayLocalDateKey, toLocalDateKey, formatLocalDate } from '@/lib/date-utils';

export default function BillingPage() {
  const {
    effectiveRoleName,
    effectivePermissions,
    refreshTrigger,
    triggerRefresh,
    cachedClients,
    cachedInvoices,
    setCachedInvoices,
  } = useImpersonation();
  const [invoices, setInvoices] = useState<any[]>(() => (cachedInvoices && cachedInvoices.length > 0 ? cachedInvoices : []));
  const [clients, setClients] = useState<any[]>(cachedClients || []);
  const [loading, setLoading] = useState(() => !cachedInvoices || cachedInvoices.length === 0);

  // Filters
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Create Invoice Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [clientId, setClientId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState(`TB-2026-00${Math.floor(Math.random() * 90 + 10)}`);
  const [amount, setAmount] = useState('150000');
  const [issueDate, setIssueDate] = useState(() => getTodayLocalDateKey());
  const [dueDate, setDueDate] = useState(() => toLocalDateKey(new Date(Date.now() + 14 * 86400000)));
  const [billingPeriod, setBillingPeriod] = useState(() => new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));
  const [paymentNotes, setPaymentNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Record Payment Modal State
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNotesInput, setPaymentNotesInput] = useState('');

  // Delete Invoice Modal State
  const [invoiceToDelete, setInvoiceToDelete] = useState<any | null>(null);
  const [deletingInvoice, setDeletingInvoice] = useState(false);

  // Preview Invoice Modal State
  const [previewInvoice, setPreviewInvoice] = useState<any | null>(null);
  // Listen to Escape key to close modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showCreateModal) setShowCreateModal(false);
        if (selectedInvoice) setSelectedInvoice(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showCreateModal, selectedInvoice]);

  const isSuperAdmin = effectiveRoleName === 'Super Admin';
  const canViewBilling = hasPermission(effectivePermissions, 'billing', 'view') || isSuperAdmin;
  const canCreateInvoice = hasActionPermission(effectivePermissions, 'billing', 'create') || isSuperAdmin;
  const canDeleteInvoice = hasActionPermission(effectivePermissions, 'billing', 'delete') || isSuperAdmin;
  const canManagePayments = hasActionPermission(effectivePermissions, 'billing', 'manage') || isSuperAdmin;

  useEffect(() => {
    if (cachedClients && cachedClients.length > 0 && clients.length === 0) {
      setClients(cachedClients);
      if (!clientId) setClientId(cachedClients[0].id);
    }
  }, [cachedClients, clients.length, clientId]);

  // Fetch clients for filter and invoice creation dropdowns only on mount or refreshTrigger
  useEffect(() => {
    fetch('/api/clients')
      .then(async (res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setClients(data);
          if (!clientId) setClientId(data[0].id);
        }
      })
      .catch((err) => console.error('Failed to fetch clients:', err));
  }, [refreshTrigger]);

  useEffect(() => {
    if (cachedInvoices && cachedInvoices.length > 0 && invoices.length === 0 && !selectedClient && !selectedStatus) {
      setInvoices(cachedInvoices);
      setLoading(false);
    }
  }, [cachedInvoices, invoices.length, selectedClient, selectedStatus]);

  const fetchBillingData = () => {
    if (invoices.length === 0) setLoading(true);

    const params = new URLSearchParams();
    if (selectedClient) params.append('clientId', selectedClient);
    if (selectedStatus) params.append('status', selectedStatus);

    fetch(`/api/invoices?${params.toString()}`)
      .then(async (res) => {
        if (!res.ok) {
          console.warn('/api/invoices returned non-ok status:', res.status);
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data)) {
          const hasFilters = Boolean(selectedClient || selectedStatus);
          if (data.length > 0 || hasFilters) {
            setInvoices(data);
            if (!hasFilters) {
              setCachedInvoices(data);
            }
          }
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch invoices:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchBillingData();
  }, [selectedClient, selectedStatus, refreshTrigger]);

  // ESC key listener for modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showCreateModal) setShowCreateModal(false);
        if (selectedInvoice) setSelectedInvoice(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showCreateModal, selectedInvoice]);

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    const selectedClientId = clientId || (clients.length > 0 ? clients[0].id : '');
    if (!selectedClientId) {
      alert('Please select or create a Client Account first.');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      alert('Please enter a valid invoice amount greater than 0.');
      return;
    }
    setSubmitting(true);

    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: selectedClientId,
          invoiceNumber,
          amount,
          issueDate,
          dueDate,
          status: 'SENT',
          billingPeriod,
          paymentNotes,
        }),
      });

      if (res.ok) {
        const newInv = await res.json();
        setInvoices((prev) => [newInv, ...prev]);
        setShowCreateModal(false);
        setInvoiceNumber(`TB-2026-00${Math.floor(Math.random() * 90 + 10)}`);
        fetchBillingData();
        triggerRefresh();
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(errorData.error || 'Failed to create invoice.');
      }
    } catch (e) {
      console.error('Create invoice error:', e);
      alert('An unexpected error occurred while generating the invoice.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDeleteInvoice = async () => {
    if (!invoiceToDelete) return;
    const target = invoiceToDelete;
    setDeletingInvoice(true);

    try {
      const res = await fetch(`/api/invoices?id=${target.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setInvoices((prev) => prev.filter((i) => i.id !== target.id));
        setInvoiceToDelete(null);
        fetchBillingData();
        triggerRefresh();
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(errorData.error || 'Failed to delete invoice.');
      }
    } catch (e) {
      console.error('Delete invoice error:', e);
      alert('An unexpected error occurred while deleting the invoice.');
    } finally {
      setDeletingInvoice(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice || !paymentAmount || parseFloat(paymentAmount) <= 0) {
      alert('Please enter a valid payment amount received greater than 0.');
      return;
    }

    try {
      const res = await fetch('/api/invoices/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: selectedInvoice.id,
          amountReceived: paymentAmount,
          notes: paymentNotesInput,
        }),
      });

      if (res.ok) {
        setSelectedInvoice(null);
        setPaymentAmount('');
        setPaymentNotesInput('');
        fetchBillingData();
        triggerRefresh();
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(errorData.error || 'Failed to record payment.');
      }
    } catch (e) {
      console.error('Record payment error:', e);
      alert('An unexpected error occurred while recording the payment.');
    }
  };

  // Metrics calculation
  let totalRevenueExpected = 0;
  let totalRevenueCollected = 0;
  let totalOutstanding = 0;

  invoices.forEach((inv) => {
    totalRevenueExpected += inv.amount;
    const paid = inv.payments?.reduce((acc: number, p: any) => acc + p.amountReceived, 0) || 0;
    totalRevenueCollected += paid;
    if (inv.status !== 'PAID') {
      totalOutstanding += inv.amount - paid;
    }
  });

  const chartData = [
    { month: 'August 2026', Expected: 275000, Collected: 275000 },
    { month: 'September 2026', Expected: totalRevenueExpected, Collected: totalRevenueCollected },
  ];

  if (!canViewBilling) {
    return (
      <div className="rounded-2xl border border-border bg-card p-12 text-center space-y-4 max-w-md mx-auto my-16 shadow-lg animate-in fade-in">
        <div className="h-14 w-14 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto border border-rose-500/20">
          <Lock className="h-7 w-7" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-black text-foreground">Access Restricted</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Your current account role (<span className="text-[#FF3B00] font-bold">{effectiveRoleName}</span>) does not have permission to view billing or invoices.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header & Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            BILLING & INVOICES <Receipt className="h-5 w-5 text-[#FF3B00]" />
          </h1>
          <p className="text-xs text-muted-foreground font-mono">
            Client Monthly NPR Retainer Invoicing, Payments & Revenue Summary
          </p>
        </div>

        {canCreateInvoice && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 rounded-md bg-[#FF3B00] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#e03400] transition-all clicky-btn"
          >
            <Plus className="h-4 w-4 stroke-[3]" /> Create Invoice
          </button>
        )}
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Total Revenue Expected
          </span>
          <div className="mt-2 text-2xl font-black text-foreground">
            NPR {totalRevenueExpected.toLocaleString()}
          </div>
          <span className="text-[11px] font-mono text-muted-foreground">Current Billing Cycles</span>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Collected Revenue
          </span>
          <div className="mt-2 text-2xl font-black text-emerald-500">
            NPR {totalRevenueCollected.toLocaleString()}
          </div>
          <span className="text-[11px] font-mono text-emerald-400 font-semibold">Cleared in bank</span>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Outstanding Due
          </span>
          <div className="mt-2 text-2xl font-black text-[#FF3B00]">
            NPR {totalOutstanding.toLocaleString()}
          </div>
          <span className="text-[11px] font-mono text-rose-400 font-semibold">Sent & Overdue invoices</span>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
        <h2 className="font-extrabold text-sm tracking-tight text-foreground mb-4">
          REVENUE SUMMARY (EXPECTED VS COLLECTED)
        </h2>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--card)',
                  borderColor: 'var(--border)',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Bar dataKey="Expected" fill="#64748B" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Collected" fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-card p-3 rounded-xl border border-border">
        <div className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
          <Filter className="h-3.5 w-3.5 text-[#FF3B00]" /> Filter:
        </div>

        <select
          value={selectedClient}
          onChange={(e) => setSelectedClient(e.target.value)}
          className="rounded-md border border-input bg-background px-2.5 py-1 text-xs font-medium outline-hidden focus:border-[#FF3B00]"
        >
          <option value="">All Clients</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="rounded-md border border-input bg-background px-2.5 py-1 text-xs font-medium outline-hidden focus:border-[#FF3B00]"
        >
          <option value="">All Statuses</option>
          <option value="PAID">Paid</option>
          <option value="SENT">Sent</option>
          <option value="OVERDUE">Overdue</option>
          <option value="DRAFT">Draft</option>
        </select>
      </div>

      {/* Invoices Data Table */}
      {/* 1. MOBILE INVOICE CARDS (< md screens) */}
      <div className="block md:hidden space-y-3">
        {invoices.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground font-mono">
            No client billing invoices found. Tap "+ Generate Invoice" above.
          </div>
        ) : (
          invoices.map((inv) => {
            const paidAmount = inv.payments?.reduce((acc: number, p: any) => acc + p.amountReceived, 0) || 0;

            return (
              <div
                key={inv.id}
                className="rounded-xl border border-border bg-card p-3.5 shadow-2xs space-y-3"
              >
                {/* Header: Invoice # and Status */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="font-mono font-bold text-sm text-foreground block truncate">
                      {inv.invoiceNumber}
                    </span>
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase inline-block mt-1"
                      style={{ backgroundColor: inv.client?.color || '#FF3B00' }}
                    >
                      {inv.client?.name}
                    </span>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase shrink-0 ${
                      inv.status === 'PAID'
                        ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                        : inv.status === 'OVERDUE'
                        ? 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
                        : 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                    }`}
                  >
                    {inv.status}
                  </span>
                </div>

                {/* Amount & Period */}
                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-border/50">
                  <div>
                    <span className="text-[10px] font-mono text-muted-foreground block uppercase">Amount Due</span>
                    <span className="font-black text-sm text-foreground block font-mono">
                      NPR {inv.amount.toLocaleString()}
                    </span>
                    {paidAmount > 0 && paidAmount < inv.amount && (
                      <span className="text-[10px] text-amber-500 font-mono block">
                        Paid: NPR {paidAmount.toLocaleString()}
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-muted-foreground block uppercase">Billing Period</span>
                    <span className="font-mono text-xs text-foreground block truncate">
                      {inv.billingPeriod}
                    </span>
                  </div>
                </div>

                {/* Dates */}
                <div className="text-[11px] font-mono text-muted-foreground pt-1">
                  <span>Issued: {formatLocalDate(inv.issueDate)}</span> • <span className="font-semibold text-foreground">Due: {formatLocalDate(inv.dueDate)}</span>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setPreviewInvoice(inv)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-muted/60 text-foreground font-bold text-xs hover:bg-muted transition-colors cursor-pointer"
                    title="View, Print & Download Invoice PDF"
                  >
                    <FileText className="h-3.5 w-3.5 text-[#FF3B00]" />
                    <span>PDF</span>
                  </button>

                  {inv.status !== 'PAID' && canManagePayments && (
                    <button
                      type="button"
                      onClick={() => setSelectedInvoice(inv)}
                      className="px-3 py-1.5 rounded-lg bg-[#FF3B00] text-white font-bold text-xs hover:bg-[#e03400] transition-colors cursor-pointer"
                    >
                      Record Payment
                    </button>
                  )}

                  {canDeleteInvoice && (
                    <button
                      type="button"
                      onClick={() => setInvoiceToDelete(inv)}
                      className="p-2 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Delete Invoice"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 2. DESKTOP INVOICES TABLE (Visible on md+ screens) */}
      <div className="hidden md:block rounded-xl border border-border bg-card overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-muted text-muted-foreground uppercase text-[10px] font-mono border-b border-border">
            <tr>
              <th className="p-3">Invoice #</th>
              <th className="p-3">Client</th>
              <th className="p-3">Billing Period</th>
              <th className="p-3">Amount (NPR)</th>
              <th className="p-3">Issue / Due Date</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {invoices.map((inv) => {
              const paidAmount = inv.payments?.reduce((acc: number, p: any) => acc + p.amountReceived, 0) || 0;

              return (
                <tr key={inv.id} className="hover:bg-muted/30">
                  <td className="p-3 font-mono font-bold text-foreground">{inv.invoiceNumber}</td>
                  <td className="p-3">
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase inline-block"
                      style={{ backgroundColor: inv.client?.color || '#FF3B00' }}
                    >
                      {inv.client?.name}
                    </span>
                  </td>
                  <td className="p-3 font-mono">{inv.billingPeriod}</td>
                  <td className="p-3 font-mono font-bold text-foreground">
                    NPR {inv.amount.toLocaleString()}
                    {paidAmount > 0 && paidAmount < inv.amount && (
                      <span className="block text-[10px] text-amber-500 font-mono">
                        (Paid: NPR {paidAmount.toLocaleString()})
                      </span>
                    )}
                  </td>
                  <td className="p-3 font-mono text-muted-foreground">
                    {formatLocalDate(inv.issueDate)} →{' '}
                    <span className="font-semibold text-foreground">
                      {formatLocalDate(inv.dueDate)}
                    </span>
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                        inv.status === 'PAID'
                          ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                          : inv.status === 'OVERDUE'
                          ? 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
                          : 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                      }`}
                    >
                      {inv.status}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setPreviewInvoice(inv)}
                        className="px-2.5 py-1 rounded border border-border bg-muted/60 text-foreground font-bold text-[11px] hover:bg-muted transition-colors flex items-center gap-1 cursor-pointer"
                        title="View, Print & Download Invoice PDF"
                      >
                        <FileText className="h-3.5 w-3.5 text-[#FF3B00]" />
                        <span>PDF</span>
                      </button>

                      {inv.status !== 'PAID' && canManagePayments && (
                        <button
                          onClick={() => setSelectedInvoice(inv)}
                          className="px-2.5 py-1 rounded bg-[#FF3B00] text-white font-bold text-[11px] hover:bg-[#e03400] transition-colors cursor-pointer"
                        >
                          Record Payment
                        </button>
                      )}
                      {canDeleteInvoice && (
                        <button
                          type="button"
                          onClick={() => setInvoiceToDelete(inv)}
                          className="p-1.5 rounded-md text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500 transition-colors cursor-pointer"
                          title="Delete Invoice"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* CREATE INVOICE MODAL */}
      {showCreateModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCreateModal(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-200"
        >
          <div className="w-full max-w-md bg-card border-2 border-border shadow-2xl rounded-xl p-5 sm:p-6 space-y-4 max-h-[92vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-border pb-3 shrink-0">
              <h2 className="font-extrabold text-sm text-foreground flex items-center gap-2">
                <Receipt className="h-4 w-4 text-[#FF3B00]" /> Generate New Client Invoice
              </h2>
              <button onClick={() => setShowCreateModal(false)} className="p-1 rounded text-muted-foreground hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="flex-1 overflow-y-auto space-y-4 text-xs pr-1 flex flex-col">
              <div className="space-y-4 flex-1">
              <div>
                <label className="block font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Client Account *
                </label>
                <select
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  required
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-[#FF3B00] outline-hidden"
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Invoice Number
                  </label>
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    required
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-[#FF3B00] outline-hidden font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Amount (NPR) *
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-[#FF3B00] outline-hidden font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Issue Date
                  </label>
                  <input
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    required
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-[#FF3B00] outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    required
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-[#FF3B00] outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Billing Period
                </label>
                <input
                  type="text"
                  placeholder="e.g. October 2026"
                  value={billingPeriod}
                  onChange={(e) => setBillingPeriod(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-[#FF3B00] outline-hidden"
                />
              </div>

              </div>

              <div className="sticky bottom-0 bg-card border-t border-border pt-3 pb-1 flex justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 font-semibold rounded-md border border-input hover:bg-muted cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 font-bold rounded-md bg-[#FF3B00] text-white hover:bg-[#e03400] clicky-btn cursor-pointer"
                >
                  {submitting ? 'Creating...' : 'Issue Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECORD PAYMENT MODAL */}
      {selectedInvoice && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedInvoice(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-200"
        >
          <div className="w-full max-w-md bg-card border-2 border-border shadow-2xl rounded-xl p-5 sm:p-6 space-y-4 max-h-[92vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-border pb-3 shrink-0">
              <h2 className="font-extrabold text-sm text-foreground flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-emerald-500" /> Record Payment ({selectedInvoice.invoiceNumber})
              </h2>
              <button onClick={() => setSelectedInvoice(null)} className="p-1 rounded text-muted-foreground hover:bg-muted cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="flex-1 overflow-y-auto space-y-4 text-xs pr-1 flex flex-col">
              <div className="space-y-4 flex-1">
              <div>
                <label className="block font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Amount Received (NPR) *
                </label>
                <input
                  type="number"
                  required
                  placeholder={`Max NPR ${selectedInvoice.amount}`}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-bold text-emerald-500 outline-hidden focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Payment Method / Bank Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. eSewa Corporate / Nabil Bank QR scan"
                  value={paymentNotesInput}
                  onChange={(e) => setPaymentNotesInput(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-hidden focus:border-emerald-500"
                />
              </div>

              </div>

              <div className="sticky bottom-0 bg-card border-t border-border pt-3 pb-1 flex justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedInvoice(null)}
                  className="px-4 py-2 font-semibold rounded-md border border-input hover:bg-muted cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold rounded-md bg-emerald-500 text-white hover:bg-emerald-600 clicky-btn cursor-pointer"
                >
                  Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* DELETE INVOICE CONFIRMATION MODAL */}
      {invoiceToDelete && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setInvoiceToDelete(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-200"
        >
          <div className="w-full max-w-md bg-card border-2 border-border shadow-2xl rounded-xl p-6 space-y-4 text-card-foreground">
            <div className="flex items-center gap-3 border-b border-border pb-3">
              <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
                <Trash2 className="h-6 w-6" />
              </div>
              <div>
                <h2 className="font-extrabold text-base text-foreground">Delete Invoice</h2>
                <p className="text-xs text-muted-foreground">Remove this invoice record from billing.</p>
              </div>
            </div>

            <p className="text-xs text-foreground leading-relaxed">
              Are you sure you want to delete invoice <strong className="text-rose-500 font-bold">{invoiceToDelete.invoiceNumber}</strong> for <strong className="text-foreground">{invoiceToDelete.client?.name}</strong>?
            </p>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setInvoiceToDelete(null)}
                className="px-4 py-2 text-xs font-semibold rounded-md border border-input hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteInvoice}
                disabled={deletingInvoice}
                className="px-5 py-2 text-xs font-bold rounded-md bg-rose-500 text-white hover:bg-rose-600 clicky-btn flex items-center gap-1.5 transition-all shadow-xs"
              >
                <Trash2 className="h-4 w-4" />
                <span>{deletingInvoice ? 'Deleting...' : 'Delete Invoice'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Preview & PDF Modal */}
      <InvoicePreviewModal
        invoice={previewInvoice}
        isOpen={Boolean(previewInvoice)}
        onClose={() => setPreviewInvoice(null)}
      />
    </div>
  );
}
