'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useSession } from 'next-auth/react';
import {
  History,
  RotateCcw,
  X,
  Clock,
  User as UserIcon,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  Edit3,
  ArrowRightCircle,
  Trash2,
  RefreshCw,
  Search,
  Film,
  CheckSquare,
  Building2,
  Receipt,
  Shield,
  Layers,
} from 'lucide-react';
import { useImpersonation } from '@/components/providers';
import { hasActionPermission } from '@/lib/permissions';

interface AuditHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type CategoryType = 'ALL' | 'CONTENT' | 'TASKS' | 'CLIENTS' | 'BILLING' | 'TEAM';

export function AuditHistoryModal({ isOpen, onClose }: AuditHistoryModalProps) {
  const { data: session } = useSession();
  const { effectiveRoleName, effectivePermissions, refreshTrigger, triggerRefresh } = useImpersonation();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [undoingId, setUndoingId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Filters & Search
  const [activeCategory, setActiveCategory] = useState<CategoryType>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const isSuperAdmin =
    effectiveRoleName === 'Super Admin' ||
    (session?.user as any)?.roleName === 'Super Admin';
  const canManageAudit = isSuperAdmin || hasActionPermission(effectivePermissions, 'audit', 'manage');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/activity-log', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setLogs(data);
      }
    } catch (err) {
      console.error('Failed to fetch activity logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && isSuperAdmin) {
      fetchLogs();
    }
  }, [isOpen, isSuperAdmin, refreshTrigger]);

  const handleUndo = async (logId: string) => {
    setUndoingId(logId);
    try {
      const res = await fetch('/api/activity-log/undo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logId }),
      });

      if (res.ok) {
        const result = await res.json();
        alert(result.message || 'Action undone successfully!');
        fetchLogs();
        triggerRefresh();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Failed to undo action.');
      }
    } catch (err) {
      console.error('Undo failed:', err);
      alert('An error occurred while attempting to undo.');
    } finally {
      setUndoingId(null);
    }
  };

  const categoryCounts = useMemo(() => {
    return {
      ALL: logs.length,
      CONTENT: logs.filter((l) => l.entityType === 'ContentItem').length,
      TASKS: logs.filter((l) => l.entityType === 'Task').length,
      CLIENTS: logs.filter((l) => l.entityType === 'Client').length,
      BILLING: logs.filter((l) => l.entityType === 'Invoice' || l.entityType === 'Payment').length,
      TEAM: logs.filter((l) => l.entityType === 'User' || l.entityType === 'Role').length,
    };
  }, [logs]);

  // Filtered and searched logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Category filter
      if (activeCategory === 'CONTENT' && log.entityType !== 'ContentItem') return false;
      if (activeCategory === 'TASKS' && log.entityType !== 'Task') return false;
      if (activeCategory === 'CLIENTS' && log.entityType !== 'Client') return false;
      if (activeCategory === 'BILLING' && log.entityType !== 'Invoice' && log.entityType !== 'Payment') return false;
      if (activeCategory === 'TEAM' && log.entityType !== 'User' && log.entityType !== 'Role') return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const userName = (log.user?.name || '').toLowerCase();
        const details = (log.details || '').toLowerCase();
        const entity = (log.entityType || '').toLowerCase();
        const action = (log.action || '').toLowerCase();
        if (!userName.includes(q) && !details.includes(q) && !entity.includes(q) && !action.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [logs, activeCategory, searchQuery]);

  if (!isOpen || !mounted) return null;

  if (!isSuperAdmin) {
    const restrictedContent = (
      <div
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200"
      >
        <div className="w-full max-w-md bg-card border-2 border-border shadow-2xl rounded-2xl p-6 text-center space-y-4">
          <div className="p-3 rounded-full bg-[#FF3B00]/15 text-[#FF3B00] w-14 h-14 mx-auto flex items-center justify-center">
            <Shield className="h-7 w-7" />
          </div>
          <div>
            <h3 className="text-lg font-black text-foreground">Super Admin Access Required</h3>
            <p className="text-xs text-muted-foreground mt-1">
              The changes and audit log is exclusively accessible to Super Admins.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 text-xs font-bold rounded-lg bg-[#FF3B00] text-white hover:bg-[#e03400] transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    );
    return createPortal(restrictedContent, document.body);
  }

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'CREATE':
        return {
          icon: <PlusCircle className="h-3 w-3" />,
          label: 'Created',
          className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
        };
      case 'UPDATE':
        return {
          icon: <Edit3 className="h-3 w-3" />,
          label: 'Updated',
          className: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
        };
      case 'STATUS_CHANGE':
        return {
          icon: <ArrowRightCircle className="h-3 w-3" />,
          label: 'Status Changed',
          className: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
        };
      case 'APPROVAL':
        return {
          icon: <CheckCircle2 className="h-3 w-3" />,
          label: 'Approval Log',
          className: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
        };
      case 'DELETE':
        return {
          icon: <Trash2 className="h-3 w-3" />,
          label: 'Deleted',
          className: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
        };
      case 'RESTORE':
      case 'UNDO':
        return {
          icon: <RotateCcw className="h-3 w-3" />,
          label: 'Undone / Restored',
          className: 'bg-teal-500/15 text-teal-400 border-teal-500/30',
        };
      default:
        return {
          icon: <History className="h-3 w-3" />,
          label: action,
          className: 'bg-muted text-muted-foreground border-border',
        };
    }
  };

  const getEntityIcon = (entityType: string) => {
    switch (entityType) {
      case 'ContentItem':
        return <Film className="h-3 w-3 text-cyan-400" />;
      case 'Task':
        return <CheckSquare className="h-3 w-3 text-yellow-400" />;
      case 'Client':
        return <Building2 className="h-3 w-3 text-[#FF3B00]" />;
      case 'Invoice':
        return <Receipt className="h-3 w-3 text-emerald-400" />;
      case 'User':
        return <UserIcon className="h-3 w-3 text-purple-400" />;
      case 'Role':
        return <Shield className="h-3 w-3 text-orange-400" />;
      default:
        return <Layers className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const categories: { key: CategoryType; label: string; icon: string; count: number }[] = [
    { key: 'ALL', label: 'All', icon: '⚡', count: categoryCounts.ALL },
    { key: 'CONTENT', label: 'Content & Shoots', icon: '🎬', count: categoryCounts.CONTENT },
    { key: 'TASKS', label: 'Tasks', icon: '📋', count: categoryCounts.TASKS },
    { key: 'CLIENTS', label: 'Clients', icon: '🏢', count: categoryCounts.CLIENTS },
    { key: 'BILLING', label: 'Invoices & Billing', icon: '💳', count: categoryCounts.BILLING },
    { key: 'TEAM', label: 'Team & Roles', icon: '👥', count: categoryCounts.TEAM },
  ];

  const modalBody = (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-200 overflow-y-auto"
    >
      <div className="relative w-full max-w-5xl bg-card border-2 border-border shadow-2xl rounded-2xl overflow-hidden max-h-[92dvh] flex flex-col text-card-foreground my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-muted/40 px-3.5 sm:px-6 py-3 sm:py-4 flex-shrink-0 gap-2">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="p-2 sm:p-2.5 rounded-xl bg-[#FF3B00]/15 text-[#FF3B00] border border-[#FF3B00]/30 shadow-inner shrink-0">
              <History className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h2 className="text-sm sm:text-lg font-black tracking-tight text-foreground truncate">
                  Changes Log
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-mono font-bold bg-[#FF3B00]/10 text-[#FF3B00] border border-[#FF3B00]/20">
                  {logs.length} Events
                </span>
                <span className="px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-mono font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  Super Admin
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground font-mono mt-0.5 truncate">
                Audit trail & instant rollback version history
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchLogs}
              disabled={loading}
              className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              title="Refresh log stream"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-[#FF3B00]' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              title="Close modal (Esc)"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Toolbar: Discrete Category Filters & Search Bar */}
        <div className="p-4 border-b border-border bg-card flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 flex-shrink-0">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 text-xs">
            {categories.map((cat) => {
              const isActive = activeCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  onClick={() => setActiveCategory(cat.key)}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 border ${
                    isActive
                      ? 'bg-[#FF3B00] text-white border-[#FF3B00] shadow-xs'
                      : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                      isActive ? 'bg-black/20 text-white' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {cat.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative min-w-[220px]">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by action, user, or note..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-input bg-background focus:border-[#FF3B00] outline-hidden"
            />
          </div>
        </div>

        {/* Content Stream */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {loading && logs.length === 0 ? (
            <div className="py-20 text-center space-y-2">
              <RefreshCw className="h-6 w-6 animate-spin text-[#FF3B00] mx-auto" />
              <p className="text-xs text-muted-foreground font-mono">Loading real-time audit history...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-20 text-center space-y-2 border border-dashed border-border rounded-xl bg-muted/20">
              <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto opacity-40" />
              <p className="text-sm font-bold text-foreground">No matching audit events found</p>
              <p className="text-xs text-muted-foreground font-mono">
                {searchQuery ? 'Try clearing your search query filter' : 'No changes recorded in this category yet'}
              </p>
            </div>
          ) : (
            filteredLogs.map((log) => {
              const badge = getActionBadge(log.action);
              const entityIcon = getEntityIcon(log.entityType);
              const hasUndo = Boolean(log.previousState);
              const isDelete = log.action === 'DELETE';

              let diffs: { field: string; oldVal: string; newVal: string }[] = [];
              if (log.changes) {
                try {
                  diffs = JSON.parse(log.changes);
                } catch (e) {}
              }

              return (
                <div
                  key={log.id}
                  className="rounded-xl border border-border bg-card p-4 transition-all hover:border-[#FF3B00]/40 hover:shadow-md space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    {/* User and metadata header */}
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-secondary border border-border flex items-center justify-center font-bold text-foreground text-xs flex-shrink-0 overflow-hidden shadow-xs">
                        {log.user?.avatar ? (
                          <img
                            src={log.user.avatar}
                            alt={log.user.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="font-mono text-xs">
                            {log.user?.name ? log.user.name.slice(0, 2).toUpperCase() : 'SYS'}
                          </span>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-foreground">
                            {log.user?.name || 'System Administrator'}
                          </span>
                          {log.user?.department && (
                            <span className="text-[10px] font-mono text-muted-foreground px-1.5 py-0.2 rounded bg-muted">
                              {log.user.department}
                            </span>
                          )}
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${badge.className}`}
                          >
                            {badge.icon}
                            {badge.label}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-muted text-muted-foreground border border-border">
                            {entityIcon}
                            {log.entityType || 'General'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Timestamp & Undo button */}
                    <div className="flex items-center gap-3 self-end sm:self-center">
                      <span className="text-[11px] font-mono text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        {new Date(log.createdAt).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>

                      {canManageAudit && hasUndo && log.action !== 'UNDO' && log.action !== 'RESTORE' && (
                        <button
                          onClick={() => handleUndo(log.id)}
                          disabled={undoingId === log.id}
                          className={`flex items-center gap-1 px-3 py-1 rounded-md text-xs font-bold border transition-all cursor-pointer clicky-btn ${
                            isDelete
                              ? 'bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white border-emerald-500/30'
                              : 'bg-[#FF3B00]/10 hover:bg-[#FF3B00] text-[#FF3B00] hover:text-white border-[#FF3B00]/30'
                          }`}
                          title={isDelete ? 'Restore this deleted record back' : 'Revert this change back to earlier version'}
                        >
                          <RotateCcw className={`h-3 w-3 ${undoingId === log.id ? 'animate-spin' : ''}`} />
                          <span>{undoingId === log.id ? 'Restoring...' : isDelete ? 'Restore Record' : 'Undo'}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Change Detail Text */}
                  <div className="text-xs text-foreground font-medium pl-1 sm:pl-12">
                    <p className="bg-muted/30 p-2.5 rounded-lg border border-border/50 text-xs font-mono">
                      {log.details}
                    </p>

                    {/* Inline Field Diffs */}
                    {diffs.length > 0 && (
                      <div className="mt-2 space-y-1 p-2.5 rounded-lg bg-background border border-border text-[11px] font-mono">
                        <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block mb-1">
                          Detected Property Changes:
                        </span>
                        {diffs.map((d, idx) => (
                          <div key={idx} className="flex items-center gap-2 flex-wrap text-muted-foreground">
                            <span className="font-bold text-foreground">{d.field}:</span>
                            <span className="line-through text-rose-400 bg-rose-500/10 px-1 rounded">{d.oldVal}</span>
                            <span>→</span>
                            <span className="font-bold text-emerald-400 bg-emerald-500/10 px-1 rounded">{d.newVal}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border bg-muted/20 flex items-center justify-between text-xs text-muted-foreground flex-shrink-0">
          <span className="font-mono text-[11px]">
            Displaying {filteredLogs.length} of {logs.length} logged changes
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 font-bold rounded-lg border border-input bg-background hover:bg-muted transition-colors cursor-pointer"
          >
            Close History
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalBody, document.body);
}
