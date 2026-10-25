'use client';

import React, { useState } from 'react';
import {
  ERP_MODULE_DEFINITIONS,
  ERPModuleKey,
  PermissionAction,
  GranularPermissionsMap,
  getRoleDefaultGranularPermissions,
  countActivePermissions,
} from '@/lib/permissions';
import {
  LayoutDashboard,
  Calendar,
  Building2,
  Kanban,
  CheckSquare,
  Receipt,
  Users2,
  FileBarChart,
  History,
  Check,
  RotateCcw,
  ShieldCheck,
  Search,
  Sparkles,
  Info,
} from 'lucide-react';

interface IndividualPermissionsEditorProps {
  permissions: GranularPermissionsMap;
  onChange: (newPermissions: GranularPermissionsMap) => void;
  selectedRoleName?: string;
  readOnly?: boolean;
}

const MODULE_ICONS: Record<ERPModuleKey, React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  calendar: Calendar,
  clients: Building2,
  tracker: Kanban,
  tasks: CheckSquare,
  billing: Receipt,
  users: Users2,
  reports: FileBarChart,
  audit: History,
};

const ACTION_BADGES: Record<PermissionAction, { label: string; colorClass: string }> = {
  view: { label: 'VIEW', colorClass: 'bg-blue-500/15 text-blue-500 border-blue-500/30' },
  create: { label: 'CREATE', colorClass: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30' },
  edit: { label: 'EDIT', colorClass: 'bg-amber-500/15 text-amber-500 border-amber-500/30' },
  delete: { label: 'DELETE', colorClass: 'bg-rose-500/15 text-rose-500 border-rose-500/30' },
  manage: { label: 'MANAGE', colorClass: 'bg-purple-500/15 text-purple-500 border-purple-500/30' },
};

export function IndividualPermissionsEditor({
  permissions,
  onChange,
  selectedRoleName = 'Social Media Manager',
  readOnly = false,
}: IndividualPermissionsEditorProps) {
  const [filterQuery, setFilterQuery] = useState('');

  const stats = countActivePermissions(permissions);

  const handleToggleAction = (moduleKey: ERPModuleKey, actionKey: PermissionAction) => {
    if (readOnly) return;
    const currentModule = permissions[moduleKey] || {};
    const updatedModule = {
      ...currentModule,
      [actionKey]: !currentModule[actionKey],
    };

    // If granting an active capability (create, edit, delete, manage), automatically ensure view is checked
    if (!currentModule[actionKey] && actionKey !== 'view') {
      updatedModule.view = true;
    }

    // If revoking view, automatically revoke dependent actions
    if (currentModule[actionKey] && actionKey === 'view') {
      for (const act of Object.keys(updatedModule)) {
        updatedModule[act as PermissionAction] = false;
      }
    }

    onChange({
      ...permissions,
      [moduleKey]: updatedModule,
    });
  };

  const handleToggleModuleAll = (moduleKey: ERPModuleKey, enable: boolean) => {
    if (readOnly) return;
    const moduleDef = ERP_MODULE_DEFINITIONS.find((m) => m.key === moduleKey);
    if (!moduleDef) return;

    const updatedModule: Record<string, boolean> = {};
    for (const act of moduleDef.actions) {
      updatedModule[act.key] = enable;
    }

    onChange({
      ...permissions,
      [moduleKey]: updatedModule,
    });
  };

  const handleResetToRoleDefaults = () => {
    if (readOnly) return;
    const defaults = getRoleDefaultGranularPermissions(selectedRoleName);
    onChange(defaults);
  };

  const handleGrantFullAdmin = () => {
    if (readOnly) return;
    const full = getRoleDefaultGranularPermissions('Super Admin');
    onChange(full);
  };

  const handleRevokeAll = () => {
    if (readOnly) return;
    const empty: GranularPermissionsMap = {};
    for (const mod of ERP_MODULE_DEFINITIONS) {
      const emptyMod: Record<string, boolean> = {};
      for (const act of mod.actions) {
        emptyMod[act.key] = false;
      }
      empty[mod.key] = emptyMod;
    }
    onChange(empty);
  };

  const filteredModules = ERP_MODULE_DEFINITIONS.filter((mod) => {
    if (!filterQuery.trim()) return true;
    const q = filterQuery.toLowerCase();
    const matchMod = mod.label.toLowerCase().includes(q) || mod.description.toLowerCase().includes(q);
    const matchAct = mod.actions.some(
      (a) => a.label.toLowerCase().includes(q) || a.description.toLowerCase().includes(q)
    );
    return matchMod || matchAct;
  });

  return (
    <div className="space-y-4">
      {/* Top Banner & Quick Controls */}
      <div className="rounded-xl border border-border bg-muted/30 p-3 sm:p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-foreground flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-[#FF3B00]" />
                Individual Member Permissions
              </span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-[#FF3B00]/10 text-[#FF3B00] font-bold border border-[#FF3B00]/20">
                {stats.enabled} of {stats.total} actions active
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Configure tailored permissions for this specific team member independent of their assigned role title.
            </p>
          </div>

          {!readOnly && (
            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleResetToRoleDefaults}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground transition-colors cursor-pointer"
                title={`Reset all modules to defaults for "${selectedRoleName}"`}
              >
                <RotateCcw className="h-3.5 w-3.5 text-[#FF3B00]" />
                <span className="truncate max-w-[130px]">Default ({selectedRoleName})</span>
              </button>
              <button
                type="button"
                onClick={handleGrantFullAdmin}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-xs font-semibold text-emerald-500 transition-colors cursor-pointer"
                title="Grant full permissions across all modules"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Select All
              </button>
              <button
                type="button"
                onClick={handleRevokeAll}
                className="px-2.5 py-1.5 rounded-md border border-border bg-card hover:bg-muted text-xs font-semibold text-muted-foreground hover:text-rose-500 transition-colors cursor-pointer"
                title="Revoke all actions"
              >
                Clear All
              </button>
            </div>
          )}
        </div>

        {/* Search & Notice */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-1 border-t border-border/60">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search permissions or modules..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-input bg-background focus:border-[#FF3B00] outline-hidden"
            />
          </div>

          <div className="flex items-center gap-1 text-[11px] text-muted-foreground shrink-0 font-mono">
            <Info className="h-3.5 w-3.5 text-[#FF3B00] shrink-0" />
            <span>Effective access strictly follows these settings.</span>
          </div>
        </div>
      </div>

      {readOnly && (
        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs flex items-center gap-2">
          <Info className="h-4 w-4 shrink-0" />
          <span>Only Super Admins can customize individual member permissions. Viewing in read-only mode.</span>
        </div>
      )}

      {/* Module Permission Cards Grid */}
      <div className="space-y-3">
        {filteredModules.map((mod) => {
          const Icon = MODULE_ICONS[mod.key] || ShieldCheck;
          const currentModulePerms = permissions[mod.key] || {};
          const enabledCount = mod.actions.filter((a) => currentModulePerms[a.key]).length;
          const allEnabled = enabledCount === mod.actions.length;
          const noneEnabled = enabledCount === 0;

          return (
            <div
              key={mod.key}
              className="rounded-xl border border-border bg-card shadow-xs transition-all overflow-hidden"
            >
              {/* Card Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 sm:px-4 bg-muted/20 border-b border-border/80">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-7 w-7 rounded-lg bg-[#FF3B00]/10 flex items-center justify-center text-[#FF3B00] shrink-0">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-xs sm:text-sm text-foreground truncate">
                      {mod.label}
                    </h3>
                    <p className="text-[11px] text-muted-foreground truncate hidden sm:block">
                      {mod.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                      allEnabled
                        ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                        : noneEnabled
                        ? 'bg-muted text-muted-foreground border border-border'
                        : 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                    }`}
                  >
                    {enabledCount}/{mod.actions.length} Enabled
                  </span>

                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => handleToggleModuleAll(mod.key, !allEnabled)}
                      className="text-[11px] font-semibold text-[#FF3B00] hover:underline cursor-pointer select-none"
                    >
                      {allEnabled ? 'Revoke All' : 'Grant All'}
                    </button>
                  )}
                </div>
              </div>

              {/* Action Toggles Grid */}
              <div className="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {mod.actions.map((act) => {
                  const isChecked = Boolean(currentModulePerms[act.key]);
                  const badge = ACTION_BADGES[act.key];

                  return (
                    <label
                      key={act.key}
                      onClick={(e) => {
                        e.preventDefault();
                        handleToggleAction(mod.key, act.key);
                      }}
                      className={`flex items-start gap-2.5 p-2.5 rounded-lg border transition-all cursor-pointer select-none ${
                        isChecked
                          ? 'border-[#FF3B00]/40 bg-[#FF3B00]/5 shadow-xs'
                          : 'border-border/80 bg-background/50 hover:bg-muted/30 hover:border-border'
                      } ${readOnly ? 'cursor-default opacity-85' : ''}`}
                    >
                      <div
                        className={`mt-0.5 h-4 w-4 rounded flex items-center justify-center transition-colors shrink-0 ${
                          isChecked
                            ? 'bg-[#FF3B00] text-white'
                            : 'border border-input bg-card'
                        }`}
                      >
                        {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                      </div>

                      <div className="space-y-0.5 flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[9px] font-mono px-1 py-0.2 rounded border font-bold ${badge.colorClass}`}
                          >
                            {badge.label}
                          </span>
                          <span className="font-bold text-xs text-foreground truncate">
                            {act.label}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground leading-tight">
                          {act.description}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
