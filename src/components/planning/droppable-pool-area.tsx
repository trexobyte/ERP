'use client';

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Sparkles } from 'lucide-react';
import { CalendarItemCard } from './calendar-item-card';

interface DroppablePoolAreaProps {
  items: any[];
  onItemClick: (item: any) => void;
  isDragInProgress?: boolean;
}

export function DroppablePoolArea({
  items,
  onItemClick,
  isDragInProgress,
}: DroppablePoolAreaProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'pool',
    data: { type: 'pool' },
  });

  return (
    <div
      ref={setNodeRef}
      id="pool"
      data-droppable-id="pool"
      className={`p-4 rounded-xl border transition-all min-h-[140px] flex flex-col justify-between ${
        isOver
          ? 'border-[#FF3B00] bg-[#FF3B00]/15 ring-2 ring-[#FF3B00] shadow-lg'
          : 'border-border bg-card shadow-xs'
      }`}
    >
      <div className="flex items-center justify-between mb-3 pointer-events-none">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[#FF3B00]" />
          <h3 className="font-extrabold text-sm text-foreground">Planned List & Unscheduled Pool</h3>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#FF3B00]/10 text-[#FF3B00] border border-[#FF3B00]/20">
            {items.length} Planned Tasks
          </span>
        </div>
        <p className="text-[11px] font-mono text-muted-foreground hidden sm:block">
          ⚡ Drag items into calendar days to schedule, or drag back here to unschedule
        </p>
      </div>

      {items.length === 0 ? (
        <div className="py-6 flex-1 flex items-center justify-center text-center text-xs font-mono text-muted-foreground/60 border border-dashed border-border rounded-lg bg-muted/20 pointer-events-none select-none">
          Planned pool is currently empty. Drag scheduled items here from the calendar to unschedule them!
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 max-h-48 overflow-y-auto p-1">
          {items.map((item) => (
            <CalendarItemCard
              key={item.id}
              item={item}
              onClick={() => onItemClick(item)}
              isDragInProgress={isDragInProgress}
            />
          ))}
        </div>
      )}
    </div>
  );
}
