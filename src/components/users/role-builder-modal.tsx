'use client';

import React, { useState } from 'react';
import { Shield, X } from 'lucide-react';
import { ERP_MODULES_LIST } from './role-matrix-editor';

interface RoleBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (roleName: string, permissionsMatrix: any) => Promise<void>;
  isSubmitting: boolean;
}

export function RoleBuilderModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
}: RoleBuilderModalProps) {
  const [roleName, setRoleName] = useState('');
  const [permissionsMatrix, setPermissionsMatrix] = useState<any>({
    dashboard: 'view',
    calendar: 'edit',
    clients: 'view',
    tracker: 'edit',
    tasks: 'edit',
    billing: 'none',
    reports: 'view',
    users: 'none',
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName.trim()) {
      alert('Please enter a custom role title.');
      return;
    }
    await onSubmit(roleName.trim(), permissionsMatrix);
    setRoleName('');
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-200"
    >
      <div className="w-full max-w-lg bg-card border-2 border-border shadow-2xl rounded-xl p-5 sm:p-6 space-y-4 max-h-[92vh] flex flex-col">
        <div className="flex justify-between items-center border-b border-border pb-3 shrink-0">
          <h2 className="font-extrabold text-sm text-foreground flex items-center gap-2">
            <Shield className="h-4 w-4 text-[#FF3B00]" /> Build Custom Role Permission Matrix
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
                Custom Role Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Lead Motion Graphic Designer"
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-[#FF3B00] outline-hidden font-bold"
              />
            </div>

            <div className="space-y-3 border border-border p-3 rounded-lg bg-muted/20">
              <span className="block font-bold text-foreground">Per-Module Access Matrix:</span>
              {ERP_MODULES_LIST.map((m) => (
                <div key={m.key} className="flex justify-between items-center">
                  <span className="font-semibold text-muted-foreground">{m.label}</span>
                  <select
                    value={permissionsMatrix[m.key] || 'none'}
                    onChange={(e) =>
                      setPermissionsMatrix({
                        ...permissionsMatrix,
                        [m.key]: e.target.value,
                      })
                    }
                    className="rounded border border-input bg-background px-2 py-1 text-xs outline-hidden focus:border-[#FF3B00]"
                  >
                    <option value="none">None</option>
                    <option value="view">View Only</option>
                    <option value="edit">Edit Access</option>
                    <option value="full">Full Admin</option>
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div className="sticky bottom-0 bg-card border-t border-border pt-3 pb-1 flex justify-end gap-2 shrink-0">
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
              className="px-5 py-2 font-bold rounded-md bg-[#FF3B00] text-white hover:bg-[#e03400] clicky-btn disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Saving Role...' : 'Save Custom Role'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
