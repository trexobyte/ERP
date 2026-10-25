'use client';

import React, { useRef, useState } from 'react';
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
  const { attributes, listeners, setNodeRef, isDragging, setActivatorNodeRef } = useDraggable({
    id: item.id,
    data: { type: 'card', item },
  });

  const [isLongPressing, setIsLongPressing] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const didLongPress = useRef(false);

  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    setIsLongPressing(false);
    didLongPress.current = false;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    didLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      setIsLongPressing(true);
      didLongPress.current = true;
      // Haptic feedback if available
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(30);
      }
    }, 420);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPos.current) return;
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStartPos.current.x);
    const dy = Math.abs(touch.clientY - touchStartPos.current.y);
    // Cancel long press if user is scrolling
    if (dx > 8 || dy > 8) {
      cancelLongPress();
    }
  };

  const handleTouchEnd = () => {
    cancelLongPress();
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (didLongPress.current) {
      didLongPress.current = false;
      return;
    }
    onClick();
  };

  return (
    <div
      ref={setNodeRef}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={cancelLongPress}
      className={`rounded-lg px-2 py-1.5 text-[10px] font-semibold text-white shadow-xs border border-black/20 group/card w-full flex flex-col gap-0.5 select-none transition-all duration-150 ${
        isDragging
          ? 'opacity-20 scale-95 cursor-grabbing'
          : isLongPressing
          ? 'scale-105 brightness-125 shadow-lg cursor-grabbing ring-2 ring-white/60 z-20'
          : 'opacity-100 cursor-grab active:cursor-grabbing hover:brightness-110'
      } ${isDragInProgress && !isDragging ? 'pointer-events-none' : ''}`}
      style={{
        backgroundColor: item.isPersonal ? '#8B5CF6' : (item.client?.color || '#FF3B00'),
      }}
    >
      <div className="flex items-center justify-between gap-1 w-full" ref={setActivatorNodeRef} {...(isLongPressing ? listeners : {})} {...attributes}>
        <div className="flex items-center gap-1 min-w-0 flex-1 pointer-events-none">
          <GripVertical className={`h-3 w-3 shrink-0 transition-opacity ${
            isLongPressing ? 'opacity-100' : 'opacity-60 group-hover/card:opacity-100'
          }`} />
          <span className="font-extrabold truncate leading-tight">
            {item.isPersonal ? `🔒 ${item.title}` : item.title}
          </span>
        </div>
        <span className="text-[8px] uppercase px-1 rounded-xs bg-black/30 font-mono shrink-0 leading-tight pointer-events-none">
          {item.isPersonal ? 'PERSONAL' : item.type}
        </span>
      </div>
      {item.assignee && (
        <span className="block text-[8.5px] text-white/85 font-mono truncate pointer-events-none pl-4 leading-none">
          {item.assignee.name}
        </span>
      )}
      {isLongPressing && (
        <span className="text-[8px] text-white/90 font-bold text-center mt-0.5 animate-pulse pointer-events-none">
          Hold to drag…
        </span>
      )}
    </div>
  );
}
