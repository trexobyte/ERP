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

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick();
  };

  const bgColor = item.isPersonal
    ? '#8B5CF6'
    : item.client?.color || '#FF3B00';

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={handleClick}
      className={`rounded-lg px-2 py-1.5 text-[10px] font-semibold text-white shadow-xs border border-black/20 group/card w-full flex flex-col gap-0.5 select-none transition-all duration-150 ${
        isDragging
          ? 'opacity-20 scale-95 cursor-grabbing'
          : 'opacity-100 cursor-grab active:cursor-grabbing hover:brightness-110 active:scale-[0.98]'
      } ${isDragInProgress && !isDragging ? 'pointer-events-none' : ''}`}
      style={{
        backgroundColor: bgColor,
        touchAction: 'manipulation',
      }}
      title={`${item.title} (${item.type}) - Hold to drag`}
    >
      <div className="flex items-center justify-between gap-1 w-full pointer-events-none">
        <div className="flex items-center gap-1 min-w-0 flex-1">
          <GripVertical className="h-3 w-3 shrink-0 opacity-60 group-hover/card:opacity-100" />
          <span className="font-extrabold truncate leading-tight">
            {item.isPersonal ? `🔒 ${item.title}` : item.title}
          </span>
        </div>
        <span className="text-[8px] uppercase px-1 rounded-xs bg-black/30 font-mono shrink-0 leading-tight">
          {item.isPersonal ? 'PERSONAL' : item.type?.replace(/_/g, ' ')}
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
