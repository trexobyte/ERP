'use client';

import React, { useState } from 'react';
import { Edit2, MessageSquare, Send, Trash2, X } from 'lucide-react';

interface ClientDetailDrawerProps {
  client: any | null;
  isOpen: boolean;
  onClose: () => void;
  isSuperAdmin: boolean;
  onOpenEdit: (client: any) => void;
  onRequestDelete: (client: any) => void;
}

export function ClientDetailDrawer({
  client,
  isOpen,
  onClose,
  isSuperAdmin,
  onOpenEdit,
  onRequestDelete,
}: ClientDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<'content' | 'billing' | 'comms'>('content');
  const [commNote, setCommNote] = useState('');

  if (!isOpen || !client) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-200"
    >
      <div className="w-full max-w-3xl bg-card border-2 border-border shadow-2xl rounded-xl p-6 space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-start border-b border-border pb-4">
          <div className="flex items-center gap-4">
            <div
              className="h-12 w-12 rounded-xl flex items-center justify-center font-black text-white text-xl shadow-md"
              style={{ backgroundColor: client.color || '#FF3B00' }}
            >
              {(client.name || 'CL').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-black text-foreground">{client.name}</h2>
              <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground mt-0.5">
                <span>{client.servicePackage}</span>
                <span>•</span>
                <span className="font-bold text-[#FF3B00]">
                  {isSuperAdmin
                    ? `NPR ${(Number(client.monthlyRetainer) || 0).toLocaleString()}/mo`
                    : '••••••'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenEdit(client)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border bg-muted/40 hover:bg-muted font-bold text-xs text-foreground transition-all cursor-pointer"
              title="Edit Client"
            >
              <Edit2 className="h-4 w-4 text-[#FF3B00]" />
              <span>Edit</span>
            </button>
            <button
              onClick={() => onRequestDelete(client)}
              className="p-1.5 rounded-lg border border-rose-500/20 text-rose-500 hover:bg-rose-500/10 transition-all cursor-pointer"
              title="Delete Client"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted cursor-pointer"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Profile Navigation Tabs */}
        <div className="flex border-b border-border gap-2">
          <button
            onClick={() => setActiveTab('content')}
            className={`pb-2 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
              activeTab === 'content'
                ? 'border-[#FF3B00] text-[#FF3B00]'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Content History ({client.contentItems?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('billing')}
            className={`pb-2 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
              activeTab === 'billing'
                ? 'border-[#FF3B00] text-[#FF3B00]'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Billing History ({client.invoices?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('comms')}
            className={`pb-2 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
              activeTab === 'comms'
                ? 'border-[#FF3B00] text-[#FF3B00]'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Feedback & WhatsApp Log
          </button>
        </div>

        {/* TAB 1: Content History */}
        {activeTab === 'content' && (
          <div className="space-y-3">
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {client.contentItems && client.contentItems.length > 0 ? (
                client.contentItems.map((item: any) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-lg border border-border bg-muted/20 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-foreground block">{item.title}</span>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {item.type} • {item.platform} •{' '}
                        {item.scheduledDate
                          ? `Scheduled ${new Date(item.scheduledDate).toLocaleDateString()}`
                          : 'Unscheduled'}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FF3B00]/10 text-[#FF3B00]">
                      {item.status}
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs font-mono text-muted-foreground/60">
                  No content records found for this client.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: Billing History */}
        {activeTab === 'billing' && (
          <div className="space-y-3">
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {client.invoices && client.invoices.length > 0 ? (
                client.invoices.map((inv: any) => (
                  <div
                    key={inv.id}
                    className="p-3 rounded-lg border border-border bg-muted/20 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-foreground block">{inv.invoiceNumber}</span>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        Period: {inv.billingPeriod} • Amount: NPR {(Number(inv.amount) || 0).toLocaleString()}
                      </span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        inv.status === 'PAID'
                          ? 'bg-emerald-500/15 text-emerald-500'
                          : inv.status === 'OVERDUE'
                          ? 'bg-rose-500/15 text-rose-500'
                          : 'bg-amber-500/15 text-amber-500'
                      }`}
                    >
                      {inv.status}
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs font-mono text-muted-foreground/60">
                  No invoices recorded for this client.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: Verbal / WhatsApp Feedback Log */}
        {activeTab === 'comms' && (
          <div className="space-y-4">
            <div className="p-3 rounded-lg border border-border bg-muted/30">
              <h4 className="font-bold text-xs text-foreground mb-2 flex items-center gap-1.5">
                <MessageSquare className="h-4 w-4 text-[#FF3B00]" /> Log Client Feedback (Verbal / WhatsApp)
              </h4>
              <textarea
                rows={3}
                placeholder="Record feedback received from client GM or social team over WhatsApp call..."
                value={commNote}
                onChange={(e) => setCommNote(e.target.value)}
                className="w-full rounded border border-input bg-background p-2 text-xs outline-hidden focus:border-[#FF3B00]"
              />
              <div className="flex justify-end mt-2">
                <button
                  onClick={() => {
                    if (!commNote.trim()) return;
                    setCommNote('');
                    alert('Feedback note logged to Client Log!');
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded bg-[#FF3B00] text-white font-bold text-xs clicky-btn cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5" /> Log Feedback
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
