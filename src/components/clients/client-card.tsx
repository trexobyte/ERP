'use client';

import React from 'react';
import { Building2, ChevronRight, Edit2, Trash2 } from 'lucide-react';

interface ClientCardProps {
  client: any;
  isSuperAdmin: boolean;
  onOpenDetails: (client: any) => void;
  onOpenEdit: (client: any, e: React.MouseEvent) => void;
  onRequestDelete: (client: any, e: React.MouseEvent) => void;
}

export function ClientCard({
  client,
  isSuperAdmin,
  onOpenDetails,
  onOpenEdit,
  onRequestDelete,
}: ClientCardProps) {
  return (
    <div
      onClick={() => onOpenDetails(client)}
      className="rounded-xl border border-border bg-card p-5 shadow-xs hover:border-[#FF3B00] transition-all cursor-pointer group flex flex-col justify-between"
    >
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-xl flex items-center justify-center font-black text-white text-base shadow-sm group-hover:scale-105 transition-transform"
              style={{ backgroundColor: client.color || '#FF3B00' }}
            >
              {(client.name || 'CL').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h3 className="font-bold text-sm text-foreground line-clamp-1 group-hover:text-[#FF3B00] transition-colors">
                {client.name}
              </h3>
              <span className="text-[10px] font-mono text-muted-foreground">
                {client.servicePackage || 'Retainer'}
              </span>
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
            {client.status || 'ACTIVE'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 my-4 p-2.5 rounded-lg bg-muted/40 border border-border/50 text-xs font-mono">
          <div>
            <span className="text-muted-foreground text-[10px] block">Retainer (NPR):</span>
            <span className="font-bold text-foreground">
              {isSuperAdmin ? `NPR ${(Number(client.monthlyRetainer) || 0).toLocaleString()}` : '••••••'}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground text-[10px] block">Package Tier:</span>
            <span className="font-bold text-[#FF3B00]">{client.packageTier || 'Standard'}</span>
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
            onClick={(e) => onOpenEdit(client, e)}
            className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
            title="Edit Client"
          >
            <Edit2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={(e) => onRequestDelete(client, e)}
            className="p-1.5 rounded-md text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500 transition-colors cursor-pointer"
            title="Delete Client"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
