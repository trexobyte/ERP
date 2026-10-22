'use client';

import React from 'react';
import { Edit2, Trash2 } from 'lucide-react';

interface UsersTableProps {
  users: any[];
  loading: boolean;
  onEditUser: (user: any) => void;
  onRequestDeleteUser: (user: any) => void;
}

export function UsersTable({
  users,
  loading,
  onEditUser,
  onRequestDeleteUser,
}: UsersTableProps) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
      <table className="w-full text-left text-xs">
        <thead className="bg-muted text-muted-foreground uppercase text-[10px] font-mono border-b border-border">
          <tr>
            <th className="p-3">User</th>
            <th className="p-3">Department</th>
            <th className="p-3">Assigned Role</th>
            <th className="p-3">Assigned Clients</th>
            <th className="p-3">Status</th>
            <th className="p-3">Date Joined</th>
            <th className="p-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {users.length === 0 ? (
            <tr>
              <td colSpan={7} className="p-8 text-center text-muted-foreground font-mono">
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
            users.map((u) => (
              <tr key={u.id} className="hover:bg-muted/30">
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={
                        u.avatar ||
                        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
                      }
                      alt={u.name}
                      className="h-8 w-8 rounded-full object-cover border border-border"
                    />
                    <div>
                      <span className="font-bold text-foreground block">{u.name}</span>
                      <span className="text-[10px] font-mono text-muted-foreground">{u.email}</span>
                    </div>
                  </div>
                </td>
                <td className="p-3">
                  <span className="font-mono px-2 py-0.5 rounded bg-muted font-semibold text-foreground">
                    {u.department}
                  </span>
                </td>
                <td className="p-3 font-bold text-[#FF3B00]">{u.role?.name || 'Viewer'}</td>
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
                      onClick={() => onEditUser(u)}
                      className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-[#FF3B00] transition-colors cursor-pointer"
                      title="Edit User Role & Settings"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onRequestDeleteUser(u)}
                      className="p-1.5 rounded-md text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500 transition-colors cursor-pointer"
                      title="Delete User Account"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
