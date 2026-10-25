'use client';

import React, { useState, useEffect } from 'react';
import { useImpersonation } from '@/components/providers';
import { Building2, Plus, Search, Lock } from 'lucide-react';
import { hasPermission, hasActionPermission } from '@/lib/permissions';
import { ClientCard } from '@/components/clients/client-card';
import { ClientFormModal } from '@/components/clients/client-form-modal';
import { ClientDetailDrawer } from '@/components/clients/client-detail-drawer';
import { DeleteClientModal } from '@/components/clients/delete-client-modal';

export default function ClientsPage() {
  const {
    effectiveRoleName,
    effectivePermissions,
    refreshTrigger,
    triggerRefresh,
    cachedClients,
    setCachedClients,
    cachedUsers,
    setCachedUsers,
  } = useImpersonation();
  const isSuperAdmin = effectiveRoleName === 'Super Admin';
  const canViewClients = hasPermission(effectivePermissions, 'clients', 'view') || isSuperAdmin;
  const canCreateClients = hasActionPermission(effectivePermissions, 'clients', 'create') || isSuperAdmin;
  const canEditClients = hasActionPermission(effectivePermissions, 'clients', 'edit') || isSuperAdmin;
  const canDeleteClients = hasActionPermission(effectivePermissions, 'clients', 'delete') || isSuperAdmin;

  const [clients, setClients] = useState<any[]>(() => {
    if (cachedClients && cachedClients.length > 0) return cachedClients;
    if (typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem('trexo_cache_clients');
        if (stored) return JSON.parse(stored);
      } catch {}
    }
    return [];
  });
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [users, setUsers] = useState<any[]>(cachedUsers || []);
  const [loading, setLoading] = useState(() => !cachedClients || cachedClients.length === 0);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [submittingAdd, setSubmittingAdd] = useState(false);

  const [editingClient, setEditingClient] = useState<any | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [clientToDelete, setClientToDelete] = useState<any | null>(null);
  const [deletingClient, setDeletingClient] = useState(false);

  // Escape key global listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowAddModal(false);
        setEditingClient(null);
        setSelectedClient(null);
        setClientToDelete(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (cachedClients && cachedClients.length > 0) {
      setClients((prev) => (prev.length === 0 ? cachedClients : prev));
    }
  }, [cachedClients]);

  useEffect(() => {
    if (cachedUsers && cachedUsers.length > 0 && users.length === 0) {
      setUsers(cachedUsers);
    }
  }, [cachedUsers, users.length]);

  const fetchClients = (retryCount = 0) => {
    fetch('/api/clients', { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) {
          if (retryCount < 2) setTimeout(() => fetchClients(retryCount + 1), 600);
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data)) {
          if (data.length > 0) {
            setClients(data);
            setCachedClients(data);
            if (typeof window !== 'undefined') {
              try {
                sessionStorage.setItem('trexo_cache_clients', JSON.stringify(data));
              } catch {}
            }
          } else if (clients.length === 0 && retryCount < 2) {
            setTimeout(() => fetchClients(retryCount + 1), 600);
          }
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch clients:', err);
        if (retryCount < 2) setTimeout(() => fetchClients(retryCount + 1), 600);
        else setLoading(false);
      });

    fetch('/api/users', { cache: 'no-store' })
      .then(async (res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setUsers(data);
          setCachedUsers(data);
        }
      })
      .catch((err) => console.error('Failed to fetch users:', err));
  };

  useEffect(() => {
    fetchClients();
  }, [refreshTrigger]);

  const handleCreateClient = async (formData: any) => {
    setSubmittingAdd(true);
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        const created = await res.json();
        setClients((prev) => [created, ...prev.filter((c) => c.id !== created.id)]);
        setShowAddModal(false);
        setSearch('');
        setStatusFilter('');
        fetchClients();
        triggerRefresh();
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(errorData.error || 'Failed to create client account.');
      }
    } catch (err) {
      console.error('Create client failed:', err);
      alert('An unexpected error occurred while creating the client account.');
    } finally {
      setSubmittingAdd(false);
    }
  };

  const handleSaveClientEdit = async (formData: any) => {
    if (!editingClient) return;
    setSavingEdit(true);

    try {
      const res = await fetch(`/api/clients/${editingClient.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
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
    } catch {
      setSelectedClient(client);
    }
  };

  const filteredClients = clients.filter((c) => {
    if (!c || !c.id) return false;
    if (deletedIds.includes(c.id)) return false;
    const clientName = typeof c.name === 'string' ? c.name.toLowerCase() : '';
    const matchesSearch = clientName.includes(search.toLowerCase());
    const matchesStatus = !statusFilter || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (!canViewClients) {
    return (
      <div className="rounded-2xl border border-border bg-card p-12 text-center space-y-4 max-w-md mx-auto my-16 shadow-lg animate-in fade-in">
        <div className="h-14 w-14 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto border border-rose-500/20">
          <Lock className="h-7 w-7" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-black text-foreground">Access Restricted</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Your current account role (<span className="text-[#FF3B00] font-bold">{effectiveRoleName}</span>) does not have permission to view or manage client accounts.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header & Action Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            CLIENT ACCOUNTS <Building2 className="h-5 w-5 text-[#FF3B00]" />
          </h1>
          <p className="text-[11px] sm:text-xs text-muted-foreground font-mono mt-0.5">
            Active Retainers, Assigned Team Leads, Comms Log & Account Performance
          </p>
        </div>

        {canCreateClients && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center gap-1.5 rounded-md bg-[#FF3B00] px-3.5 py-2.5 sm:py-2 text-xs font-bold text-white hover:bg-[#e03400] transition-all clicky-btn w-full sm:w-auto shrink-0 shadow-xs cursor-pointer"
          >
            <Plus className="h-4 w-4 stroke-[3]" /> Add Client Account
          </button>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-2.5 bg-card p-2.5 sm:p-3 rounded-xl border border-border">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by client name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-input bg-background pl-9 pr-4 py-2 sm:py-1.5 text-xs outline-hidden focus:border-[#FF3B00]"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 sm:py-1.5 text-xs font-medium outline-hidden focus:border-[#FF3B00]"
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
        <div className="py-20 text-center text-xs font-mono text-muted-foreground">
          Loading Client Roster...
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="py-16 text-center rounded-xl border border-dashed border-border bg-card/40 p-8 space-y-3">
          <Building2 className="h-10 w-10 text-muted-foreground/40 mx-auto" />
          <h3 className="text-sm font-bold text-foreground">No Client Accounts Found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {search || statusFilter
              ? 'No clients match your filter criteria.'
              : 'No client accounts have been created yet.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filteredClients.map((client) => (
            <ClientCard
              key={client.id}
              client={client}
              isSuperAdmin={isSuperAdmin}
              canEdit={canEditClients}
              canDelete={canDeleteClients}
              onOpenDetails={handleOpenClientDetails}
              onOpenEdit={(cl, e) => {
                e.stopPropagation();
                setEditingClient(cl);
              }}
              onRequestDelete={(cl, e) => {
                e.stopPropagation();
                setClientToDelete(cl);
              }}
            />
          ))}
        </div>
      )}

      {/* CREATE MODAL */}
      <ClientFormModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        users={users}
        onSubmit={handleCreateClient}
        isSubmitting={submittingAdd}
      />

      {/* EDIT MODAL */}
      <ClientFormModal
        isOpen={Boolean(editingClient)}
        onClose={() => setEditingClient(null)}
        client={editingClient}
        users={users}
        onSubmit={handleSaveClientEdit}
        isSubmitting={savingEdit}
        onRequestDelete={(cl) => setClientToDelete(cl)}
      />

      {/* DETAIL DRAWER */}
      <ClientDetailDrawer
        client={selectedClient}
        isOpen={Boolean(selectedClient)}
        onClose={() => setSelectedClient(null)}
        isSuperAdmin={isSuperAdmin}
        canEdit={canEditClients}
        canDelete={canDeleteClients}
        onOpenEdit={(cl) => {
          setSelectedClient(null);
          setEditingClient(cl);
        }}
        onRequestDelete={(cl) => {
          setSelectedClient(null);
          setClientToDelete(cl);
        }}
      />

      {/* DELETE CONFIRMATION MODAL */}
      <DeleteClientModal
        client={clientToDelete}
        isOpen={Boolean(clientToDelete)}
        onClose={() => setClientToDelete(null)}
        onConfirm={confirmDeleteClient}
        isDeleting={deletingClient}
      />
    </div>
  );
}
