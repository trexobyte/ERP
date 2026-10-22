'use client';

import React from 'react';
import { Trash2 } from 'lucide-react';

interface DeleteUserModalProps {
  user: any | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isDeleting: boolean;
}

export function DeleteUserModal({
  user,
  isOpen,
  onClose,
  onConfirm,
  isDeleting,
}: DeleteUserModalProps) {
  if (!isOpen || !user) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-200"
    >
      <div className="w-full max-w-md bg-card border-2 border-border shadow-2xl rounded-xl p-6 space-y-4 text-card-foreground">
        <div className="flex items-center gap-3 border-b border-border pb-3">
          <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
            <Trash2 className="h-6 w-6" />
          </div>
          <div>
            <h2 className="font-extrabold text-base text-foreground">Delete User Account</h2>
            <p className="text-xs text-muted-foreground">Remove this user from your agency team roster.</p>
          </div>
        </div>

        <p className="text-xs text-foreground leading-relaxed">
          Are you sure you want to delete <strong className="text-rose-500 font-bold">{user.name}</strong> (
          <span className="font-mono text-muted-foreground">{user.email}</span>)?
        </p>

        <div className="flex justify-end gap-2 pt-3 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-md border border-input hover:bg-muted transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-5 py-2 text-xs font-bold rounded-md bg-rose-500 text-white hover:bg-rose-600 clicky-btn flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
          >
            <Trash2 className="h-4 w-4" />
            <span>{isDeleting ? 'Deleting...' : 'Delete User'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
