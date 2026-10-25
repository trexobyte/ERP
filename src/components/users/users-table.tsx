'use client';

import React from 'react';
import { Edit2, Trash2, ShieldCheck, Shield } from 'lucide-react';
import { countActivePermissions } from '@/lib/permissions';

interface UsersTableProps {
  users: any[];
  loading: boolean;
  onEditUser: (user: any) => void;
  onEditPermissions?: (user: any) => void;
  onRequestDeleteUser: (user: any) => void;
  isSuperAdmin?: boolean;
}

export function UsersTable({
  users,
  loading,
  onEditUser,
  onEditPermissions,
  onRequestDeleteUser,
  isSuperAdmin = true,
}: UsersTableProps) {
  return (
    <div className="space-y-3">
      {/* 1. MOBILE RESPONSIVE CARDS (< md screens) */}
      <div className="block md:hidden space-y-3">
        {users.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground font-mono">
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="h-4 w-4 border-2 border-[#FF3B00] border-t-transparent rounded-full animate-spin" />
                <span>Loading team member accounts...</span>
              </div>
            ) : (
              <span>No team member accounts found. Tap "+ Add User" above to create one.</span>
            )}
          </div>
        ) : (
          users.map((u) => {
            const stats = countActivePermissions(u.permissions);

            return (
              <div
                key={u.id}
                className="rounded-xl border border-border bg-card p-3.5 shadow-2xs space-y-3"
              >
                {/* Header: User Avatar, Name & Active Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={
                        u.avatar ||
                        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
                      }
                      alt={u.name}
                      className="h-10 w-10 rounded-full object-cover border border-border shrink-0"
                    />
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm text-foreground truncate">{u.name}</h4>
                      <p className="text-[11px] font-mono text-muted-foreground truncate">{u.email}</p>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 ${
                      u.active
                        ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                        : 'bg-rose-500/15 text-rose-500'
                    }`}
                  >
                    {u.active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {/* Details Grid: Role, Department, Permissions */}
                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-border/50">
                  <div>
                    <span className="text-[10px] font-mono text-muted-foreground block uppercase">Role</span>
                    <span className="font-bold text-[#FF3B00] truncate block">{u.role?.name || 'Viewer'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-muted-foreground block uppercase">Department</span>
                    <span className="font-semibold text-foreground truncate block">{u.department}</span>
                  </div>
                </div>

                {/* Custom Permissions Badge Button */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => (onEditPermissions ? onEditPermissions(u) : onEditUser(u))}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border bg-muted/40 hover:bg-muted text-xs font-mono font-bold transition-colors cursor-pointer"
                    title="Click to view or edit individual permissions"
                  >
                    <Shield className="h-3.5 w-3.5 text-[#FF3B00]" />
                    <span>{stats.enabled}/{stats.total} Permissions Active</span>
                  </button>

                  <span className="text-[10px] font-mono text-muted-foreground">
                    Joined {new Date(u.dateJoined).toLocaleDateString()}
                  </span>
                </div>

                {/* Assigned Clients */}
                {u.assignedClients?.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {u.assignedClients.map((a: any) => (
                      <span
                        key={a.client?.id}
                        className="px-1.5 py-0.5 rounded text-[9px] font-bold text-white truncate max-w-[120px]"
                        style={{ backgroundColor: a.client?.color || '#FF3B00' }}
                      >
                        {a.client?.name}
                      </span>
                    ))}
                  </div>
                )}

                {/* Action Buttons Row */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
                  <button
                    type="button"
                    onClick={() => (onEditPermissions ? onEditPermissions(u) : onEditUser(u))}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border bg-muted/50 hover:bg-[#FF3B00]/10 hover:text-[#FF3B00] text-xs font-bold transition-colors cursor-pointer"
                  >
                    <ShieldCheck className="h-4 w-4 text-[#FF3B00]" />
                    <span>Permissions</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onEditUser(u)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border bg-muted/50 hover:bg-muted text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    <span>Edit</span>
                  </button>
                  {isSuperAdmin && (
                    <button
                      type="button"
                      onClick={() => onRequestDeleteUser(u)}
                      className="p-2 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Delete User"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 2. DESKTOP TABLE (Visible on md+ screens) */}
      <div className="hidden md:block rounded-xl border border-border bg-card overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-muted text-muted-foreground uppercase text-[10px] font-mono border-b border-border">
            <tr>
              <th className="p-3">User</th>
              <th className="p-3">Department</th>
              <th className="p-3">Assigned Role</th>
              <th className="p-3">Custom Permissions</th>
              <th className="p-3">Assigned Clients</th>
              <th className="p-3">Status</th>
              <th className="p-3">Date Joined</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-muted-foreground font-mono">
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 border-2 border-[#FF3B00] border-t-transparent rounded-full animate-spin" />
                      <span>Loading team member accounts...</span>
                    </div>
                  ) : (
                    <span>No team member accounts found. Click "+ Add User" above to create one.</span>
                  )}
                </td>
              </tr>
            ) : (
              users.map((u) => {
                const stats = countActivePermissions(u.permissions);

                return (
                  <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={
                            u.avatar ||
                            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
                          }
                          alt={u.name}
                          className="h-8 w-8 rounded-full object-cover border border-border shrink-0"
                        />
                        <div className="min-w-0">
                          <span className="font-bold text-foreground block truncate">{u.name}</span>
                          <span className="text-[10px] font-mono text-muted-foreground truncate block">
                            {u.email}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="font-mono px-2 py-0.5 rounded bg-muted font-semibold text-foreground">
                        {u.department}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-[#FF3B00]">{u.role?.name || 'Viewer'}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => (onEditPermissions ? onEditPermissions(u) : onEditUser(u))}
                          className="flex items-center gap-1 px-2 py-0.5 rounded-full border border-border/80 bg-background hover:bg-muted text-[10px] font-mono font-bold transition-colors cursor-pointer group"
                          title="Click to view or edit individual permissions"
                        >
                          <Shield className="h-3 w-3 text-[#FF3B00] group-hover:scale-110 transition-transform" />
                          <span>
                            {stats.enabled}/{stats.total} Active
                          </span>
                        </button>
                      </div>
                    </td>
                    <td className="p-3 font-mono text-muted-foreground">
                      {u.assignedClients?.length > 0 ? (
                        <span className="flex flex-wrap gap-1">
                          {u.assignedClients.map((a: any) => (
                            <span
                              key={a.client?.id}
                              className="px-1.5 py-0.5 rounded text-[9px] font-bold text-white"
                              style={{ backgroundColor: a.client?.color || '#FF3B00' }}
                            >
                              {a.client?.name?.slice(0, 10)}
                            </span>
                          ))}
                        </span>
                      ) : (
                        <span>All / Global</span>
                      )}
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          u.active
                            ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                            : 'bg-rose-500/15 text-rose-500'
                        }`}
                      >
                        {u.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-muted-foreground">
                      {new Date(u.dateJoined).toLocaleDateString()}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => (onEditPermissions ? onEditPermissions(u) : onEditUser(u))}
                          className="p-1.5 rounded-md text-muted-foreground hover:bg-[#FF3B00]/10 hover:text-[#FF3B00] transition-colors cursor-pointer"
                          title="Configure Individual Permissions"
                        >
                          <ShieldCheck className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onEditUser(u)}
                          className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                          title="Edit User Profile & Role"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        {isSuperAdmin && (
                          <button
                            type="button"
                            onClick={() => onRequestDeleteUser(u)}
                            className="p-1.5 rounded-md text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500 transition-colors cursor-pointer"
                            title="Delete User Account"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
