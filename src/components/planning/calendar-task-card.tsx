'use client';

import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CheckSquare, GripVertical } from 'lucide-react';

interface CalendarTaskCardProps {
  task: any;
  onClick: () => void;
  isDragInProgress?: boolean;
  idPrefix?: string;
}

export function CalendarTaskCard({
  task,
  onClick,
  isDragInProgress,
  idPrefix,
}: CalendarTaskCardProps) {
  const draggableId = idPrefix ? `${idPrefix}-task-${task.id}` : `task-${task.id}`;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: draggableId,
    data: { type: 'task', task, id: task.id, entityType: 'task' },
  });

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDragging) return;
    onClick();
  };

  const bgColor =
    task.urgency === 'URGENT'
      ? '#FF3B00'
      : task.client?.color || '#3B82F6';

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={handleClick}
      className={`group/task flex items-center justify-between gap-1 rounded px-2 py-1 text-[9.5px] font-semibold transition-all select-none shadow-2xs ${
        isDragging
          ? 'opacity-20 scale-95 cursor-grabbing'
          : 'opacity-100 cursor-grab active:cursor-grabbing hover:brightness-110 active:scale-[0.98]'
      } ${isDragInProgress && !isDragging ? 'pointer-events-none' : ''}`}
      style={{
        backgroundColor: bgColor,
        color: '#FFFFFF',
        touchAction: isDragging ? 'none' : 'manipulation',
      }}
      title={`Task: ${task.title} (${task.urgency}) - Due today. Hold to reschedule.`}
    >
      <div className="flex items-center gap-1 min-w-0 flex-1 pointer-events-none">
        <GripVertical className="h-2.5 w-2.5 shrink-0 opacity-70 group-hover/task:opacity-100" />
        <CheckSquare className="h-3 w-3 shrink-0 opacity-90" />
        <span className="truncate leading-tight">{task.title}</span>
      </div>
      <span className="text-[7.5px] uppercase px-1 rounded-xs bg-black/30 font-mono shrink-0 pointer-events-none">
        {task.urgency}
      </span>
    </div>
  );
}
