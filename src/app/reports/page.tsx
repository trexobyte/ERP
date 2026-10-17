'use client';

import React, { useState, useEffect } from 'react';
import { useImpersonation } from '@/components/providers';
import {
  FileBarChart,
  Download,
  Building2,
  Calendar,
  CheckCircle2,
  TrendingUp,
  FileText,
  Sparkles,
  Printer,
} from 'lucide-react';
import { getTodayLocalDateKey, formatLocalDate } from '@/lib/date-utils';

export default function ReportsPage() {
  const { refreshTrigger, cachedClients, cachedContent, cachedInvoices } = useImpersonation();
  const [clients, setClients] = useState<any[]>(cachedClients || []);
  const [selectedClientId, setSelectedClientId] = useState('all');
  const [reportMonth, setReportMonth] = useState(() => getTodayLocalDateKey().slice(0, 7));
  const [contentItems, setContentItems] = useState<any[]>(() => (cachedContent && cachedContent.length > 0 ? cachedContent : []));
  const [invoices, setInvoices] = useState<any[]>(() => (cachedInvoices && cachedInvoices.length > 0 ? cachedInvoices : []));
  const [loading, setLoading] = useState(() => !cachedContent || cachedContent.length === 0);

  useEffect(() => {
    if (cachedClients && cachedClients.length > 0 && clients.length === 0) {
      setClients(cachedClients);
    }
  }, [cachedClients, clients.length]);

  useEffect(() => {
    fetch('/api/clients')
      .then(async (res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setClients(data);
        }
      })
      .catch((err) => console.error('Failed to fetch clients:', err));
  }, []);

  useEffect(() => {
    if (contentItems.length === 0 && invoices.length === 0) {
      setLoading(true);
    }

    const contentUrl = selectedClientId === 'all' || !selectedClientId ? '/api/content' : `/api/content?clientId=${selectedClientId}`;
    const invoicesUrl = selectedClientId === 'all' || !selectedClientId ? '/api/invoices' : `/api/invoices?clientId=${selectedClientId}`;

    fetch(contentUrl)
      .then(async (res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (Array.isArray(data) && (data.length > 0 || selectedClientId !== 'all')) setContentItems(data);
      })
      .catch((err) => console.error('Failed to fetch content:', err));

    fetch(invoicesUrl)
      .then(async (res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (Array.isArray(data) && (data.length > 0 || selectedClientId !== 'all')) setInvoices(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch invoices:', err);
        setLoading(false);
      });
  }, [selectedClientId, refreshTrigger]);

  const isAllAccounts = selectedClientId === 'all' || !selectedClientId;

  const client = isAllAccounts
    ? {
        name: 'All Client Accounts (Agency Overview)',
        color: '#FF3B00',
        servicePackage: 'Agency-Wide Deliverables & Retainer Performance',
      }
    : clients.find((c) => c.id === selectedClientId) || {
        name: 'All Client Accounts (Agency Overview)',
        color: '#FF3B00',
        servicePackage: 'Agency-Wide Deliverables & Retainer Performance',
      };

  const totalPlanned = contentItems.length;
  const completed = contentItems.filter((i) => i.status === 'PUBLISHED' || i.status === 'SCHEDULED').length;
  const pending = totalPlanned - completed;
  const completionRate = totalPlanned > 0 ? Math.round((completed / totalPlanned) * 100) : 0;

  // Platform breakdown
  const platforms = {
    INSTAGRAM: contentItems.filter((i) => i.platform === 'INSTAGRAM').length,
    FACEBOOK: contentItems.filter((i) => i.platform === 'FACEBOOK').length,
    TIKTOK: contentItems.filter((i) => i.platform === 'TIKTOK').length,
    YOUTUBE: contentItems.filter((i) => i.platform === 'YOUTUBE').length,
    LINKEDIN: contentItems.filter((i) => i.platform === 'LINKEDIN').length,
  };

  const exportClientReportCSV = () => {
    const headers = isAllAccounts
      ? ['Client Account', 'Deliverable Title', 'Format', 'Platform', 'Scheduled Date', 'Status', 'Approval']
      : ['Client', 'Deliverable Title', 'Format', 'Platform', 'Scheduled Date', 'Status', 'Approval'];

    const rows = contentItems.map((item) => [
      `"${item.client?.name || client?.name || ''}"`,
      `"${item.title.replace(/"/g, '""')}"`,
      item.type,
      item.platform,
      item.scheduledDate ? formatLocalDate(item.scheduledDate) : 'Unscheduled',
      item.status,
      item.approvalOutcome || 'None',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `TrexoByte_Report_${isAllAccounts ? 'All_Accounts' : client?.name}_${reportMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header & Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4 print:hidden">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            REPORTS & ANALYTICS <FileBarChart className="h-5 w-5 text-[#FF3B00]" />
          </h1>
          <p className="text-xs text-muted-foreground font-mono">
            Client Monthly Deliverable Audits & Executive PDF/CSV Performance Export
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={exportClientReportCSV}
            className="flex items-center gap-1.5 rounded-md border border-input bg-card px-3 py-2 text-xs font-bold hover:bg-muted transition-colors"
          >
            <Download className="h-4 w-4 text-[#FF3B00]" /> Export CSV
          </button>
          <button
            onClick={handlePrintReport}
            className="flex items-center gap-1.5 rounded-md bg-[#FF3B00] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#e03400] transition-all clicky-btn"
          >
            <Printer className="h-4 w-4" /> Print / Save PDF
          </button>
        </div>
      </div>

      {/* Selectors Bar */}
      <div className="flex flex-wrap items-center gap-4 bg-card p-4 rounded-xl border border-border print:hidden">
        <div>
          <label className="block text-[10px] font-mono font-bold uppercase text-muted-foreground mb-1">
            Select Client Account
          </label>
          <select
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-xs font-bold outline-hidden focus:border-[#FF3B00]"
          >
            <option value="all">🌟 All Client Accounts (Agency Overview)</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-mono font-bold uppercase text-muted-foreground mb-1">
            Report Month
          </label>
          <input
            type="month"
            value={reportMonth}
            onChange={(e) => setReportMonth(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-xs font-bold outline-hidden focus:border-[#FF3B00]"
          />
        </div>
      </div>

      {/* PRINTABLE EXECUTIVE REPORT PREVIEW CARD */}
      <div className="rounded-2xl border-2 border-border bg-card p-8 shadow-xl space-y-8 print:border-none print:shadow-none print:p-0">
        {/* Report Branded Header */}
        <div className="flex justify-between items-start border-b-2 border-border pb-6">
          <div className="flex items-center gap-4">
            <div
              className="h-12 w-12 rounded-xl flex items-center justify-center font-black text-white text-xl shadow-md"
              style={{ backgroundColor: client?.color || '#FF3B00' }}
            >
              {isAllAccounts ? 'ALL' : client?.name?.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <span className="text-xs font-mono font-bold text-[#FF3B00] uppercase tracking-wider block">
                MONTHLY PERFORMANCE REPORT
              </span>
              <h2 className="text-2xl font-black text-foreground">{client?.name}</h2>
              <span className="text-xs text-muted-foreground font-mono">
                TrexoByte Digital Agency Kathmandu • Period: {reportMonth}
              </span>
            </div>
          </div>

          <div className="text-right text-xs font-mono">
            <div className="font-extrabold text-[#FF3B00] text-sm">TREXOBYTE ERP</div>
            <div className="text-muted-foreground">Kathmandu, Nepal</div>
            <div className="text-muted-foreground">Issued: {new Date().toLocaleDateString()}</div>
          </div>
        </div>

        {/* Deliverables Summary Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-muted/40 border border-border text-center">
            <span className="text-[10px] font-mono font-bold uppercase text-muted-foreground block">
              Planned Deliverables
            </span>
            <span className="text-3xl font-black text-foreground">{totalPlanned}</span>
          </div>
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center">
            <span className="text-[10px] font-mono font-bold uppercase text-emerald-500 block">
              Completed & Published
            </span>
            <span className="text-3xl font-black text-emerald-500">{completed}</span>
          </div>
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-center">
            <span className="text-[10px] font-mono font-bold uppercase text-amber-500 block">
              In Production / Approval
            </span>
            <span className="text-3xl font-black text-amber-500">{pending}</span>
          </div>
          <div className="p-4 rounded-xl bg-[#FF3B00]/10 border border-[#FF3B00]/30 text-center">
            <span className="text-[10px] font-mono font-bold uppercase text-[#FF3B00] block">
              Completion Rate
            </span>
            <span className="text-3xl font-black text-[#FF3B00]">{completionRate}%</span>
          </div>
        </div>

        {/* Platform Breakdown */}
        <div>
          <h3 className="font-extrabold text-sm text-foreground uppercase tracking-wider mb-3 font-mono">
            Platform Distribution Breakdown
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs font-mono">
            {Object.entries(platforms).map(([platform, count]) => (
              <div key={platform} className="p-3 rounded-lg border border-border bg-background flex flex-col justify-between">
                <span className="text-muted-foreground text-[10px]">{platform}</span>
                <span className="text-lg font-bold text-foreground mt-1">{count} Items</span>
              </div>
            ))}
          </div>
        </div>

        {/* Content Items Detail Audit Table */}
        <div>
          <h3 className="font-extrabold text-sm text-foreground uppercase tracking-wider mb-3 font-mono">
            Detailed Content & Shoot Audit
          </h3>
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted text-muted-foreground uppercase text-[10px] font-mono border-b border-border">
                <tr>
                  {isAllAccounts && <th className="p-3">Client Account</th>}
                  <th className="p-3">Deliverable Title</th>
                  <th className="p-3">Format</th>
                  <th className="p-3">Platform</th>
                  <th className="p-3">Scheduled Date</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Client Approval Log</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {contentItems.map((item) => (
                  <tr key={item.id}>
                    {isAllAccounts && (
                      <td className="p-3 font-mono">
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase inline-block"
                          style={{ backgroundColor: item.client?.color || '#FF3B00' }}
                        >
                          {item.client?.name || 'Client'}
                        </span>
                      </td>
                    )}
                    <td className="p-3 font-bold text-foreground">{item.title}</td>
                    <td className="p-3 font-mono text-muted-foreground">{item.type}</td>
                    <td className="p-3 font-mono">{item.platform}</td>
                    <td className="p-3 font-mono">{item.scheduledDate ? formatLocalDate(item.scheduledDate) : 'Unscheduled'}</td>
                    <td className="p-3 font-extrabold text-[#FF3B00]">{item.status}</td>
                    <td className="p-3">
                      {item.approvalOutcome ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-500">
                          {item.approvalOutcome}
                        </span>
                      ) : (
                        <span className="text-muted-foreground italic">None</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-6 border-t border-border flex justify-between items-center text-xs font-mono text-muted-foreground">
          <span>Prepared by TrexoByte Growth Agency Kathmandu</span>
          <span>Verified & Signed by Account Manager</span>
        </div>
      </div>
    </div>
  );
}
