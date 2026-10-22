'use client';

import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { GripVertical } from 'lucide-react';

interface CalendarItemCardProps {
  item: any;
  onClick: () => void;
  isDragInProgress?: boolean;
}

export function CalendarItemCard({
  item,
  onClick,
  isDragInProgress,
}: CalendarItemCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: item.id,
    data: { type: 'card', item },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`rounded-lg px-2 py-1 text-[10px] font-semibold text-white shadow-xs cursor-grab active:cursor-grabbing hover:brightness-110 border border-black/20 group/card w-full flex flex-col gap-0.5 select-none transition-opacity ${
        isDragging ? 'opacity-20 scale-95' : 'opacity-100'
      } ${isDragInProgress && !isDragging ? 'pointer-events-none' : ''}`}
      style={{
        backgroundColor: item.isPersonal ? '#8B5CF6' : (item.client?.color || '#FF3B00'),
      }}
    >
      <div className="flex items-center justify-between gap-1 pointer-events-none w-full">
        <div className="flex items-center gap-1 min-w-0 flex-1">
          <GripVertical className="h-3 w-3 opacity-60 group-hover/card:opacity-100 shrink-0" />
          <span className="font-extrabold truncate leading-tight">
            {item.isPersonal ? `🔒 ${item.title}` : item.title}
          </span>
        </div>
        <span className="text-[8px] uppercase px-1 rounded-xs bg-black/30 font-mono shrink-0 leading-tight">
          {item.isPersonal ? 'PERSONAL' : item.type}
        </span>
      </div>
      {item.assignee && (
        <span className="block text-[8.5px] text-white/85 font-mono truncate pointer-events-none pl-4 leading-none">
          {item.assignee.name}
        </span>
      )}
    </div>
  );
}
