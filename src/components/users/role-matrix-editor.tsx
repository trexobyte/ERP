'use client';

import React from 'react';
import { Plus, Shield } from 'lucide-react';

interface RoleMatrixEditorProps {
  roles: any[];
  onOpenRoleBuilder: () => void;
}

export const ERP_MODULES_LIST = [
  { key: 'dashboard', label: 'Main Dashboard' },
  { key: 'calendar', label: 'Planning & Calendar' },
  { key: 'clients', label: 'Clients & Accounts' },
  { key: 'tracker', label: 'Content Tracker' },
  { key: 'tasks', label: 'Tasks Stream' },
  { key: 'billing', label: 'Billing & Invoices' },
  { key: 'reports', label: 'Reports & Analytics' },
  { key: 'users', label: 'User & Role Access' },
];

export function RoleMatrixEditor({ roles, onOpenRoleBuilder }: RoleMatrixEditorProps) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-card p-4 rounded-xl border border-border">
        <div>
          <h2 className="font-extrabold text-sm tracking-tight text-foreground">
            CUSTOM ROLE & PERMISSION MATRIX
          </h2>
          <p className="text-xs text-muted-foreground font-mono">
            Define exact access levels (None, View, Edit, Full) for each ERP module.
          </p>
        </div>
        <button
          onClick={onOpenRoleBuilder}
          className="flex items-center gap-1.5 rounded-md bg-[#FF3B00] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#e03400] clicky-btn cursor-pointer"
        >
          <Plus className="h-4 w-4 stroke-[3]" /> Build Custom Role
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {roles.map((role) => {
          let perms: any = {};
          try {
            perms = typeof role.permissions === 'string' ? JSON.parse(role.permissions) : role.permissions || {};
          } catch {}

          return (
            <div
              key={role.id}
              className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-3 hover:border-[#FF3B00] transition-all"
            >
              <div className="flex items-center justify-between border-b border-border pb-2">
                <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <Shield className="h-4 w-4 text-[#FF3B00]" /> {role.name}
                </h3>
                {role.isCustom && (
                  <span className="text-[10px] font-mono bg-[#FF3B00]/10 text-[#FF3B00] px-2 py-0.5 rounded font-bold">
                    CUSTOM
                  </span>
                )}
              </div>

              <div className="space-y-1.5 text-xs">
                {ERP_MODULES_LIST.map((m) => {
                  const level = perms[m.key] || 'none';
                  return (
                    <div key={m.key} className="flex justify-between items-center font-mono">
                      <span className="text-muted-foreground">{m.label}:</span>
                      <span
                        className={`font-bold uppercase text-[10px] px-1.5 py-0.5 rounded ${
                          level === 'full'
                            ? 'bg-emerald-500/15 text-emerald-500'
                            : level === 'edit'
                            ? 'bg-amber-500/15 text-amber-500'
                            : level === 'view'
                            ? 'bg-blue-500/15 text-blue-500'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {level}
                      </span>
                    </div>
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
