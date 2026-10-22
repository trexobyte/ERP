'use client';

import React from 'react';
import { format, subMonths, addMonths } from 'date-fns';
import { ChevronLeft, ChevronRight, Eye, EyeOff, Plus, User } from 'lucide-react';

interface PlanningFilterBarProps {
  currentMonth: Date;
  onChangeMonth: (newMonth: Date) => void;
  myItemsOnly: boolean;
  onToggleMyItemsOnly: (val: boolean) => void;
  clients: any[];
  hiddenClients: string[];
  onToggleHideClient: (clientId: string) => void;
  onSelectAllClients: () => void;
  onUnselectAllClients: () => void;
  onOpenQuickAdd: () => void;
}

export function PlanningFilterBar({
  currentMonth,
  onChangeMonth,
  myItemsOnly,
  onToggleMyItemsOnly,
  clients,
  hiddenClients,
  onToggleHideClient,
  onSelectAllClients,
  onUnselectAllClients,
  onOpenQuickAdd,
}: PlanningFilterBarProps) {
  return (
    <div className="space-y-3">
      {/* Calendar Bar & Legend */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-card p-4 rounded-xl border border-border">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button
              onClick={() => onChangeMonth(subMonths(currentMonth, 1))}
              className="rounded-md border border-border p-1.5 text-foreground hover:bg-muted cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => onChangeMonth(addMonths(currentMonth, 1))}
              className="rounded-md border border-border p-1.5 text-foreground hover:bg-muted cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <h2 className="text-lg font-black tracking-tight text-foreground uppercase">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <button
            onClick={() => onChangeMonth(new Date())}
            className="text-xs font-mono text-[#FF3B00] hover:underline ml-2 cursor-pointer"
          >
            Today
          </button>
        </div>

        {/* Quick Toggles */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-mono text-muted-foreground bg-[#FF3B00]/10 text-[#FF3B00] px-2.5 py-1 rounded border border-[#FF3B00]/20 font-semibold flex items-center gap-1">
            ⚡ Drag & Drop to Reschedule
          </span>

          <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={myItemsOnly}
              onChange={(e) => onToggleMyItemsOnly(e.target.checked)}
              className="rounded border-input text-[#FF3B00] focus:ring-[#FF3B00]"
            />
            <User className="h-3.5 w-3.5 text-[#FF3B00]" /> My Items Only
          </label>

          <button
            onClick={onOpenQuickAdd}
            className="flex items-center gap-1.5 rounded-md bg-[#FF3B00] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#e03400] transition-all clicky-btn cursor-pointer"
            title="Add a Content Post/Deliverable"
          >
            <Plus className="h-4 w-4 stroke-[3]" /> Add Content
          </button>
        </div>
      </div>

      {/* Client Legend Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/40 p-3 rounded-lg border border-border/60">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-mono text-muted-foreground uppercase font-bold mr-2">
            Toggle Client Legend:
          </span>
          {clients.map((c) => {
            const isHidden = hiddenClients.includes(c.id);
            return (
              <button
                key={c.id}
                onClick={() => onToggleHideClient(c.id)}
                className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-all border cursor-pointer ${
                  isHidden
                    ? 'bg-transparent text-muted-foreground border-border line-through opacity-50'
                    : 'bg-card text-foreground border-border shadow-2xs'
                }`}
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                <span>{c.name}</span>
                {isHidden ? (
                  <EyeOff className="h-3 w-3 text-muted-foreground" />
                ) : (
                  <Eye className="h-3 w-3 text-[#FF3B00]" />
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5 shrink-0 border-l border-border/60 pl-3">
          <button
            type="button"
            onClick={onSelectAllClients}
            className="px-2.5 py-1 rounded-md text-xs font-bold bg-[#FF3B00]/10 text-[#FF3B00] hover:bg-[#FF3B00] hover:text-white transition-all border border-[#FF3B00]/30 flex items-center gap-1 clicky-btn cursor-pointer"
            title="Show all clients on calendar"
          >
            <Eye className="h-3.5 w-3.5" /> Select All
          </button>
          <button
            type="button"
            onClick={onUnselectAllClients}
            className="px-2.5 py-1 rounded-md text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-all border border-border flex items-center gap-1 clicky-btn cursor-pointer"
            title="Hide all clients on calendar"
          >
            <EyeOff className="h-3.5 w-3.5" /> Unselect All
          </button>
        </div>
      </div>
    </div>
  );
}
