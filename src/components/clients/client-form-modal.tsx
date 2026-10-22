'use client';

import React, { useState, useEffect } from 'react';
import { Building2, Edit2, Trash2, X } from 'lucide-react';

interface ClientFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  client?: any | null; // if passed, Edit mode; otherwise Add mode
  users: any[];
  onSubmit: (formData: any) => Promise<void>;
  isSubmitting: boolean;
  onRequestDelete?: (client: any) => void;
}

export function ClientFormModal({
  isOpen,
  onClose,
  client,
  users,
  onSubmit,
  isSubmitting,
  onRequestDelete,
}: ClientFormModalProps) {
  const isEdit = Boolean(client);

  const [name, setName] = useState('');
  const [color, setColor] = useState('#FF3B00');
  const [servicePackage, setServicePackage] = useState('Social & Growth');
  const [packageTier, setPackageTier] = useState('Standard');
  const [status, setStatus] = useState('ACTIVE');
  const [monthlyRetainer, setMonthlyRetainer] = useState('100000');
  const [billingCycleDay, setBillingCycleDay] = useState('1');
  const [assignedUserIds, setAssignedUserIds] = useState<string[]>([]);

  useEffect(() => {
    if (client) {
      setName(client.name || '');
      setColor(client.color || '#FF3B00');
      setServicePackage(client.servicePackage || 'Social & Growth');
      setPackageTier(client.packageTier || 'Standard');
      setStatus(client.status || 'ACTIVE');
      setMonthlyRetainer(client.monthlyRetainer?.toString() || '100000');
      setBillingCycleDay(client.billingCycleDay?.toString() || '1');
      setAssignedUserIds(
        client.assignedTeam?.map((ast: any) => ast.userId || ast.user?.id).filter(Boolean) || []
      );
    } else {
      setName('');
      setColor('#FF3B00');
      setServicePackage('Social & Growth');
      setPackageTier('Standard');
      setStatus('ACTIVE');
      setMonthlyRetainer('100000');
      setBillingCycleDay('1');
      setAssignedUserIds([]);
    }
  }, [client, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please enter a valid Client Business Name.');
      return;
    }
    await onSubmit({
      name: name.trim(),
      color,
      servicePackage,
      packageTier,
      status,
      monthlyRetainer,
      billingCycleDay,
      assignedUserIds,
    });
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-200"
    >
      <div className="w-full max-w-lg bg-card border-2 border-border shadow-2xl rounded-xl p-5 sm:p-6 space-y-4 max-h-[92vh] flex flex-col">
        <div className="flex justify-between items-center border-b border-border pb-3 shrink-0">
          <h2 className="font-extrabold text-base tracking-tight text-foreground flex items-center gap-2">
            {isEdit ? (
              <>
                <Edit2 className="h-5 w-5 text-[#FF3B00]" /> Edit Client Account
              </>
            ) : (
              <>
                <Building2 className="h-5 w-5 text-[#FF3B00]" /> Add New Client Account
              </>
            )}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded text-muted-foreground hover:bg-muted cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 text-xs pr-1 flex flex-col">
          <div className="space-y-4 flex-1">
            <div>
              <label className="block font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Client Business Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Shangri-La Hotel Kathmandu"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-[#FF3B00] outline-hidden"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Brand Accent Color
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="h-8 w-10 rounded border border-input p-0 bg-transparent cursor-pointer"
                  />
                  <input
                    type="text"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-full rounded border border-input bg-background px-2 py-1 text-xs font-mono uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Service Package
                </label>
                <select
                  value={servicePackage}
                  onChange={(e) => setServicePackage(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-2 py-2 text-xs focus:border-[#FF3B00] outline-hidden"
                >
                  <option value="Social & Growth">Social & Growth</option>
                  <option value="Full Stack Growth">Full Stack Growth</option>
                  <option value="Production & Films">Production & Films</option>
                  <option value="Ads & Performance">Ads & Performance</option>
                  <option value="Content Production">Content Production</option>
                  <option value="Brand Strategy">Brand Strategy</option>
                  <option value="Full 360 Marketing">Full 360 Marketing</option>
                  <option value="PR & Influencer">PR & Influencer</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Package Tier
                </label>
                <select
                  value={packageTier}
                  onChange={(e) => setPackageTier(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-2 py-2 text-xs focus:border-[#FF3B00] outline-hidden"
                >
                  <option value="Basic">Basic</option>
                  <option value="Standard">Standard</option>
                  <option value="Premium">Premium</option>
                  <option value="Premium VIP">Premium VIP</option>
                  <option value="Enterprise">Enterprise</option>
                  <option value="Custom Enterprise">Custom Enterprise</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Monthly Retainer (NPR)
                </label>
                <input
                  type="number"
                  value={monthlyRetainer}
                  onChange={(e) => setMonthlyRetainer(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-[#FF3B00] outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Billing Cycle Day
                </label>
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={billingCycleDay}
                  onChange={(e) => setBillingCycleDay(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-[#FF3B00] outline-hidden"
                />
              </div>
            </div>

            {isEdit && (
              <div>
                <label className="block font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Account Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-[#FF3B00] outline-hidden"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="PROSPECT">PROSPECT</option>
                  <option value="PAUSED">PAUSED</option>
                  <option value="CHURNED">CHURNED</option>
                  <option value="OFFBOARDED">OFFBOARDED</option>
                </select>
              </div>
            )}

            <div>
              <label className="block font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Assign Team Members
              </label>
              <div className="grid grid-cols-2 gap-2 border border-border p-2 rounded-md max-h-32 overflow-y-auto">
                {users.map((u) => (
                  <label key={u.id} className="flex items-center gap-2 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={assignedUserIds.includes(u.id)}
                      onChange={(e) => {
                        if (e.target.checked) setAssignedUserIds([...assignedUserIds, u.id]);
                        else setAssignedUserIds(assignedUserIds.filter((id) => id !== u.id));
                      }}
                      className="rounded border-input text-[#FF3B00] focus:ring-[#FF3B00]"
                    />
                    <span>{u.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="sticky bottom-0 bg-card border-t border-border pt-3 pb-1 flex justify-between items-center shrink-0">
            {isEdit && onRequestDelete ? (
              <button
                type="button"
                onClick={() => onRequestDelete(client)}
                className="px-3 py-1.5 text-xs font-bold rounded-md bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 flex items-center gap-1 transition-all cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete Client</span>
              </button>
            ) : (
              <div />
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 font-semibold rounded-md border border-input hover:bg-muted cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 font-bold rounded-md bg-[#FF3B00] text-white hover:bg-[#e03400] clicky-btn cursor-pointer"
              >
                {isSubmitting
                  ? isEdit
                    ? 'Saving...'
                    : 'Creating...'
                  : isEdit
                  ? 'Save Changes'
                  : 'Create Account'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
