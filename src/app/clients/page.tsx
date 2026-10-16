'use client';

import React, { useState, useEffect } from 'react';
import { useImpersonation } from '@/components/providers';
import {
  Building2,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  MessageSquare,
  Users,
  Receipt,
  Sparkles,
  ChevronRight,
  Send,
  X,
  Edit2,
  Trash2,
} from 'lucide-react';

export default function ClientsPage() {
  const { effectiveRoleName, refreshTrigger, triggerRefresh, cachedClients, cachedUsers } = useImpersonation();
  const isSuperAdmin = effectiveRoleName === 'Super Admin';
  const [clients, setClients] = useState<any[]>(cachedClients || []);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [clientToDelete, setClientToDelete] = useState<any | null>(null);
  const [users, setUsers] = useState<any[]>(cachedUsers || []);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Add Client Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState('#FF3B00');
  const [servicePackage, setServicePackage] = useState('Social & Growth');
  const [packageTier, setPackageTier] = useState('Standard');
  const [status, setStatus] = useState('ACTIVE');
  const [monthlyRetainer, setMonthlyRetainer] = useState('100000');
  const [billingCycleDay, setBillingCycleDay] = useState('1');
  const [assignedUserIds, setAssignedUserIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Edit Client Modal State
  const [editingClient, setEditingClient] = useState<any | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('#FF3B00');
  const [editServicePackage, setEditServicePackage] = useState('Social & Growth');
  const [editPackageTier, setEditPackageTier] = useState('Standard');
  const [editStatus, setEditStatus] = useState('ACTIVE');
  const [editMonthlyRetainer, setEditMonthlyRetainer] = useState('100000');
  const [editBillingCycleDay, setEditBillingCycleDay] = useState('1');
  const [editAssignedUserIds, setEditAssignedUserIds] = useState<string[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingClient, setDeletingClient] = useState(false);

  // Detail Client Drawer/Modal
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'content' | 'billing' | 'comms'>('content');
  const [commNote, setCommNote] = useState('');

  // Listen to Escape key to close modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showAddModal) setShowAddModal(false);
        if (editingClient) setEditingClient(null);
        if (selectedClient) setSelectedClient(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAddModal, editingClient, selectedClient]);

  useEffect(() => {
    if (cachedClients && cachedClients.length > 0 && clients.length === 0) {
      setClients(cachedClients);
    }
  }, [cachedClients, clients.length]);

  useEffect(() => {
    if (cachedUsers && cachedUsers.length > 0 && users.length === 0) {
      setUsers(cachedUsers);
    }
  }, [cachedUsers, users.length]);

  const fetchClients = () => {
    setClients((prev) => {
      if (prev.length === 0) setLoading(true);
      return prev;
    });
    fetch('/api/clients', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setClients(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch clients:', err);
        setLoading(false);
      });

    fetch('/api/users', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setUsers(data);
      })
      .catch((err) => console.error('Failed to fetch users:', err));
  };

  useEffect(() => {
    fetchClients();
  }, [refreshTrigger]);

  // ESC key listener for modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showAddModal) setShowAddModal(false);
        if (selectedClient) setSelectedClient(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAddModal, selectedClient]);

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please enter a valid Client Business Name.');
      return;
    }
    setSubmitting(true);

    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          color,
          servicePackage,
          packageTier,
          status,
          monthlyRetainer,
          billingCycleDay,
          assignedUserIds,
        }),
      });

      if (res.ok) {
        const created = await res.json();
        setClients((prev) => [created, ...prev.filter((c) => c.id !== created.id)]);
        setShowAddModal(false);
        setName('');
        setSearch('');
        setStatusFilter('');
        setAssignedUserIds([]);
        fetchClients();
        triggerRefresh();
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(errorData.error || 'Failed to create client account. Please try again.');
      }
    } catch (err) {
      console.error('Create client failed:', err);
      alert('An unexpected error occurred while creating the client account.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEditClient = (client: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingClient(client);
    setEditName(client.name || '');
    setEditColor(client.color || '#FF3B00');
    setEditServicePackage(client.servicePackage || 'Social & Growth');
    setEditPackageTier(client.packageTier || 'Standard');
    setEditStatus(client.status || 'ACTIVE');
    setEditMonthlyRetainer(client.monthlyRetainer?.toString() || '100000');
    setEditBillingCycleDay(client.billingCycleDay?.toString() || '1');
    setEditAssignedUserIds(
      client.assignedTeam?.map((ast: any) => ast.userId || ast.user?.id).filter(Boolean) || []
    );
  };

  const handleSaveClientEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient || !editName.trim()) return;
    setSavingEdit(true);

    try {
      const res = await fetch(`/api/clients/${editingClient.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          color: editColor,
          servicePackage: editServicePackage,
          packageTier: editPackageTier,
          status: editStatus,
          monthlyRetainer: editMonthlyRetainer,
          billingCycleDay: editBillingCycleDay,
          assignedUserIds: editAssignedUserIds,
        }),
      });

      if (res.ok) {
        setEditingClient(null);
        setSelectedClient(null);
        fetchClients();
        triggerRefresh();
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || 'Failed to update client account.');
      }
    } catch (err) {
      console.error('Update client failed:', err);
      alert('An unexpected error occurred while updating the client account.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleRequestDelete = (client: any, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (!client) return;
    setClientToDelete(client);
  };

  const confirmDeleteClient = async () => {
    if (!clientToDelete) return;
    const targetClient = clientToDelete;
    setDeletingClient(true);
    setDeletedIds((prev) => [...prev, targetClient.id]);
    setClients((prev) => prev.filter((c) => c.id !== targetClient.id));
    setEditingClient(null);
    setSelectedClient(null);
    setClientToDelete(null);

    try {
      const res = await fetch(`/api/clients/${targetClient.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        fetchClients();
        triggerRefresh();
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || 'Failed to delete client account.');
      }
    } catch (err) {
      console.error('Delete client failed:', err);
      alert('An unexpected error occurred while deleting the client account.');
    } finally {
      setDeletingClient(false);
    }
  };

  const handleOpenClientDetails = async (client: any) => {
    try {
      const res = await fetch(`/api/clients/${client.id}`);
      const detailed = await res.json();
      setSelectedClient(detailed);
    } catch (e) {
      setSelectedClient(client);
    }
  };

  const filteredClients = clients.filter((c) => {
    if (deletedIds.includes(c.id)) return false;
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !statusFilter || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header & Action Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            CLIENT ACCOUNTS <Building2 className="h-5 w-5 text-[#FF3B00]" />
          </h1>
          <p className="text-xs text-muted-foreground font-mono">
            Active Retainers, Assigned Team Leads, Comms Log & Account Performance
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 rounded-md bg-[#FF3B00] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#e03400] transition-all clicky-btn"
        >
          <Plus className="h-4 w-4 stroke-[3]" /> Add Client Account
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-card p-3 rounded-xl border border-border">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by client name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-input bg-background pl-9 pr-4 py-1.5 text-xs outline-hidden focus:border-[#FF3B00]"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium outline-hidden focus:border-[#FF3B00]"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active Clients</option>
          <option value="PROSPECT">Prospects</option>
          <option value="PAUSED">Paused</option>
          <option value="CHURNED">Churned</option>
        </select>
      </div>

      {/* Client Cards Grid */}
      {loading && clients.length === 0 ? (
        <div className="py-20 text-center text-xs font-mono text-muted-foreground">Loading Client Roster...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredClients.map((client) => (
            <div
              key={client.id}
              onClick={() => handleOpenClientDetails(client)}
              className="rounded-xl border border-border bg-card p-5 shadow-xs hover:border-[#FF3B00] transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-10 w-10 rounded-xl flex items-center justify-center font-black text-white text-base shadow-sm group-hover:scale-105 transition-transform"
                      style={{ backgroundColor: client.color }}
                    >
                      {client.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-foreground line-clamp-1 group-hover:text-[#FF3B00] transition-colors">
                        {client.name}
                      </h3>
                      <span className="text-[10px] font-mono text-muted-foreground">{client.servicePackage}</span>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                      client.status === 'ACTIVE'
                        ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                        : client.status === 'PROSPECT'
                        ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                        : 'bg-zinc-700/20 text-zinc-400'
                    }`}
                  >
                    {client.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 my-4 p-2.5 rounded-lg bg-muted/40 border border-border/50 text-xs font-mono">
                  <div>
                    <span className="text-muted-foreground text-[10px] block">Retainer (NPR):</span>
                    <span className="font-bold text-foreground">
                      {isSuperAdmin ? `NPR ${client.monthlyRetainer.toLocaleString()}` : '••••••'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[10px] block">Package Tier:</span>
                    <span className="font-bold text-[#FF3B00]">{client.packageTier}</span>
                  </div>
                </div>

                {/* Assigned Team Avatars */}
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                  <span className="font-mono text-[11px]">Assigned Team:</span>
                  <div className="flex -space-x-2">
                    {client.assignedTeam?.map((ast: any, i: number) => (
                      <img
                        key={i}
                        src={
                          ast.user?.avatar ||
                          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
                        }
                        title={ast.user?.name}
                        alt="Avatar"
                        className="h-6 w-6 rounded-full border-2 border-card object-cover"
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs font-mono text-[#FF3B00] font-bold">
                <span className="flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  View Profile <ChevronRight className="h-4 w-4" />
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={(e) => handleOpenEditClient(client, e)}
                    className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    title="Edit Client"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleRequestDelete(client, e)}
                    className="p-1.5 rounded-md text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500 transition-colors"
                    title="Delete Client"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE CLIENT MODAL */}
      {showAddModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddModal(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-200"
        >
          <div className="w-full max-w-lg bg-card border-2 border-border shadow-2xl rounded-xl p-5 sm:p-6 space-y-4 max-h-[92vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-border pb-3 shrink-0">
              <h2 className="font-extrabold text-base tracking-tight text-foreground flex items-center gap-2">
                <Building2 className="h-5 w-5 text-[#FF3B00]" /> Add New Client Account
              </h2>
              <button onClick={() => setShowAddModal(false)} className="p-1 rounded text-muted-foreground hover:bg-muted cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateClient} className="flex-1 overflow-y-auto space-y-4 text-xs pr-1 flex flex-col">
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

              <div className="grid grid-cols-3 gap-3">
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
                    <option value="Ads & Performance">Ads & Performance</option>
                    <option value="Content Production">Content Production</option>
                    <option value="Brand Strategy">Brand Strategy</option>
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
                    <option value="Enterprise">Enterprise</option>
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

              <div className="sticky bottom-0 bg-card border-t border-border pt-3 pb-1 flex justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 font-semibold rounded-md border border-input hover:bg-muted cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 font-bold rounded-md bg-[#FF3B00] text-white hover:bg-[#e03400] clicky-btn cursor-pointer"
                >
                  {submitting ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT CLIENT MODAL */}
      {editingClient && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingClient(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-200"
        >
          <div className="w-full max-w-lg bg-card border-2 border-border shadow-2xl rounded-xl p-5 sm:p-6 space-y-4 max-h-[92vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-border pb-3 shrink-0">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Edit2 className="h-5 w-5 text-[#FF3B00]" /> Edit Client Account
              </h2>
              <button
                onClick={() => setEditingClient(null)}
                className="p-1 rounded text-muted-foreground hover:bg-muted cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveClientEdit} className="flex-1 overflow-y-auto space-y-4 text-xs pr-1 flex flex-col">
              <div className="space-y-4 flex-1">
              <div>
                <label className="block font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Client Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kathmandu Coffee Co."
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-[#FF3B00] outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Brand Color Code
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={editColor}
                      onChange={(e) => setEditColor(e.target.value)}
                      className="h-9 w-12 rounded border border-input p-0.5 bg-background cursor-pointer"
                    />
                    <input
                      type="text"
                      value={editColor}
                      onChange={(e) => setEditColor(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-[#FF3B00] outline-hidden font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Account Status
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-[#FF3B00] outline-hidden"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="PAUSED">PAUSED</option>
                    <option value="OFFBOARDED">OFFBOARDED</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Service Package
                  </label>
                  <select
                    value={editServicePackage}
                    onChange={(e) => setEditServicePackage(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-[#FF3B00] outline-hidden"
                  >
                    <option value="Social & Growth">Social & Growth</option>
                    <option value="Production & Films">Production & Films</option>
                    <option value="Full 360 Marketing">Full 360 Marketing</option>
                    <option value="PR & Influencer">PR & Influencer</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Package Tier
                  </label>
                  <select
                    value={editPackageTier}
                    onChange={(e) => setEditPackageTier(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-[#FF3B00] outline-hidden"
                  >
                    <option value="Starter">Starter</option>
                    <option value="Standard">Standard</option>
                    <option value="Premium VIP">Premium VIP</option>
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
                    value={editMonthlyRetainer}
                    onChange={(e) => setEditMonthlyRetainer(e.target.value)}
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
                    value={editBillingCycleDay}
                    onChange={(e) => setEditBillingCycleDay(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-[#FF3B00] outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Assign Team Members
                </label>
                <div className="grid grid-cols-2 gap-2 border border-border p-2 rounded-md max-h-32 overflow-y-auto">
                  {users.map((u) => (
                    <label key={u.id} className="flex items-center gap-2 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={editAssignedUserIds.includes(u.id)}
                        onChange={(e) => {
                          if (e.target.checked) setEditAssignedUserIds([...editAssignedUserIds, u.id]);
                          else setEditAssignedUserIds(editAssignedUserIds.filter((id) => id !== u.id));
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
                <button
                  type="button"
                  onClick={() => handleRequestDelete(editingClient)}
                  disabled={deletingClient}
                  className="px-3 py-1.5 text-xs font-bold rounded-md bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 flex items-center gap-1 transition-all cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete Client</span>
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingClient(null)}
                    className="px-4 py-2 font-semibold rounded-md border border-input hover:bg-muted cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingEdit}
                    className="px-5 py-2 font-bold rounded-md bg-[#FF3B00] text-white hover:bg-[#e03400] clicky-btn cursor-pointer"
                  >
                    {savingEdit ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      {selectedClient && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedClient(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-200"
        >
          <div className="w-full max-w-3xl bg-card border-2 border-border shadow-2xl rounded-xl p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-start border-b border-border pb-4">
              <div className="flex items-center gap-4">
                <div
                  className="h-12 w-12 rounded-xl flex items-center justify-center font-black text-white text-xl shadow-md"
                  style={{ backgroundColor: selectedClient.color }}
                >
                  {selectedClient.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-xl font-black text-foreground">{selectedClient.name}</h2>
                  <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground mt-0.5">
                    <span>{selectedClient.servicePackage}</span>
                    <span>•</span>
                    <span className="font-bold text-[#FF3B00]">
                      {isSuperAdmin ? `NPR ${selectedClient.monthlyRetainer?.toLocaleString()}/mo` : '••••••'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenEditClient(selectedClient)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border bg-muted/40 hover:bg-muted font-bold text-xs text-foreground transition-all"
                  title="Edit Client"
                >
                  <Edit2 className="h-4 w-4 text-[#FF3B00]" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => handleRequestDelete(selectedClient)}
                  disabled={deletingClient}
                  className="p-1.5 rounded-lg border border-rose-500/20 text-rose-500 hover:bg-rose-500/10 transition-all"
                  title="Delete Client"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setSelectedClient(null)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Profile Navigation Tabs */}
            <div className="flex border-b border-border gap-2">
              <button
                onClick={() => setActiveTab('content')}
                className={`pb-2 px-3 text-xs font-bold transition-all border-b-2 ${
                  activeTab === 'content'
                    ? 'border-[#FF3B00] text-[#FF3B00]'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Content History ({selectedClient.contentItems?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('billing')}
                className={`pb-2 px-3 text-xs font-bold transition-all border-b-2 ${
                  activeTab === 'billing'
                    ? 'border-[#FF3B00] text-[#FF3B00]'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Billing History ({selectedClient.invoices?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('comms')}
                className={`pb-2 px-3 text-xs font-bold transition-all border-b-2 ${
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
                  {selectedClient.contentItems?.map((item: any) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-lg border border-border bg-muted/20 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-foreground block">{item.title}</span>
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {item.type} • {item.platform} • Scheduled {new Date(item.scheduledDate).toLocaleDateString()}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FF3B00]/10 text-[#FF3B00]">
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 2: Billing History */}
            {activeTab === 'billing' && (
              <div className="space-y-3">
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {selectedClient.invoices?.map((inv: any) => (
                    <div
                      key={inv.id}
                      className="p-3 rounded-lg border border-border bg-muted/20 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-foreground block">{inv.invoiceNumber}</span>
                        <span className="text-[10px] font-mono text-muted-foreground">
                          Period: {inv.billingPeriod} • Amount: NPR {inv.amount.toLocaleString()}
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
                  ))}
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
                        if (!commNote) return;
                        setCommNote('');
                        alert('Feedback note logged to Client Log!');
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded bg-[#FF3B00] text-white font-bold text-xs"
                    >
                      <Send className="h-3.5 w-3.5" /> Log Feedback
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CUSTOM IN-APP DELETE CONFIRMATION MODAL */}
      {clientToDelete && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setClientToDelete(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-200"
        >
          <div className="w-full max-w-md bg-card border-2 border-border shadow-2xl rounded-xl p-6 space-y-4 text-card-foreground">
            <div className="flex items-center gap-3 border-b border-border pb-3">
              <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
                <Trash2 className="h-6 w-6" />
              </div>
              <div>
                <h2 className="font-extrabold text-base text-foreground">Delete Client Account</h2>
                <p className="text-xs text-muted-foreground">This action will delete the account from your roster.</p>
              </div>
            </div>

            <p className="text-xs text-foreground leading-relaxed">
              Are you sure you want to permanently delete <strong className="text-rose-500 font-bold">{clientToDelete.name}</strong>?
            </p>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setClientToDelete(null)}
                className="px-4 py-2 text-xs font-semibold rounded-md border border-input hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteClient}
                disabled={deletingClient}
                className="px-5 py-2 text-xs font-bold rounded-md bg-rose-500 text-white hover:bg-rose-600 clicky-btn flex items-center gap-1.5 transition-all shadow-xs"
              >
                <Trash2 className="h-4 w-4" />
                <span>{deletingClient ? 'Deleting...' : 'Delete Account'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
