'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { format, isToday, addDays } from 'date-fns';
import { useDroppable } from '@dnd-kit/core';
import { Plus, CheckSquare, Clock } from 'lucide-react';
import { toLocalDateKey } from '@/lib/date-utils';
import { CalendarItemCard } from './calendar-item-card';
import { CalendarTaskCard } from './calendar-task-card';

interface DroppableThreeDayColumnProps {
  day: Date;
  dateKey: string;
  isCurrentDay: boolean;
  onQuickAdd: () => void;
  children: React.ReactNode;
}

export function DroppableThreeDayColumn({
  day,
  dateKey,
  isCurrentDay,
  onQuickAdd,
  children,
}: DroppableThreeDayColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: dateKey,
    data: { type: 'day', date: dateKey },
  });

  return (
    <div
      ref={setNodeRef}
      data-date={dateKey}
      className={`flex flex-col rounded-xl border transition-all min-h-[460px] min-w-0 ${
        isOver
          ? 'border-[#FF3B00] bg-[#FF3B00]/15 ring-2 ring-[#FF3B00] shadow-md'
          : isCurrentDay
          ? 'border-[#FF3B00]/40 bg-card shadow-xs'
          : 'border-border bg-card'
      }`}
    >
      {/* Column Header */}
      <div className={`p-2 sm:p-2.5 border-b flex items-center justify-between ${
        isCurrentDay ? 'bg-[#FF3B00]/10 border-[#FF3B00]/30' : 'bg-muted/40 border-border'
      }`}>
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <span
            className={`text-xs font-black h-5.5 w-5.5 sm:h-6 sm:w-6 rounded-full flex items-center justify-center shrink-0 ${
              isCurrentDay ? 'bg-[#FF3B00] text-white' : 'bg-muted text-foreground'
            }`}
          >
            {format(day, 'd')}
          </span>
          <div className="min-w-0">
            <span className="block text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-muted-foreground leading-none truncate">
              {format(day, 'EEE')}
            </span>
            <span className="text-[8.5px] sm:text-[9px] font-mono text-muted-foreground/80 leading-none truncate">
              {format(day, 'MMM d')}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onQuickAdd();
          }}
          className="p-1 rounded-md text-[#FF3B00] hover:bg-[#FF3B00]/10 transition-colors cursor-pointer shrink-0"
          title={`Add item on ${format(day, 'MMM d')}`}
        >
          <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </button>
      </div>

      {/* Events List Droppable Body */}
      <div className="p-1.5 sm:p-2 space-y-1.5 sm:space-y-2 flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}

interface CalendarThreeDayViewProps {
  currentDate: Date;
  filteredContent: any[];
  actionTasks: any[];
  selectedClientFilter: string;
  hiddenClients: string[];
  activeDragItem: any | null;
  onItemClick: (item: any) => void;
  onQuickAddOnDate: (dateKey: string) => void;
}

export function CalendarThreeDayView({
  currentDate,
  filteredContent,
  actionTasks,
  selectedClientFilter,
  hiddenClients,
  activeDragItem,
  onItemClick,
  onQuickAddOnDate,
}: CalendarThreeDayViewProps) {
  const router = useRouter();

  // 3 consecutive days starting from currentDate
  const daysInThreeDay = [
    currentDate,
    addDays(currentDate, 1),
    addDays(currentDate, 2),
  ];

  return (
    <div className="space-y-3">
      {/* 3 Columns Grid - Fits cleanly on mobile screens (100% width) */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-3 w-full">
        {daysInThreeDay.map((day) => {
          const dateKey = toLocalDateKey(day);
          const isCurrentDay = isToday(day);

          const dayItems = filteredContent
            .filter(
              (item) =>
                Boolean(item.scheduledDate) &&
                toLocalDateKey(item.scheduledDate) === dateKey
            )
            .sort((a, b) => a.id.localeCompare(b.id));

          const dayTasks = actionTasks.filter(
            (task) =>
              task.dueDate &&
              toLocalDateKey(task.dueDate) === dateKey &&
              (!selectedClientFilter ||
                task.clientId === selectedClientFilter ||
                task.client?.id === selectedClientFilter) &&
              (!task.clientId || !hiddenClients.includes(task.clientId))
          );

          return (
            <DroppableThreeDayColumn
              key={dateKey}
              day={day}
              dateKey={dateKey}
              isCurrentDay={isCurrentDay}
              onQuickAdd={() => onQuickAddOnDate(dateKey)}
            >
              {/* Content Items */}
              {dayItems.map((item) => (
                <CalendarItemCard
                  key={item.id}
                  item={item}
                  onClick={() => onItemClick(item)}
                  isDragInProgress={Boolean(activeDragItem)}
                />
              ))}

              {/* Tasks - Now Fully Draggable! */}
              {dayTasks.map((task) => (
                <CalendarTaskCard
                  key={task.id}
                  task={task}
                  onClick={() => router.push('/tasks')}
                  isDragInProgress={Boolean(activeDragItem)}
                />
              ))}

              {dayItems.length === 0 && dayTasks.length === 0 && (
                <div className="flex flex-col items-center justify-center h-28 border border-dashed border-border/50 rounded-lg text-center p-2 text-muted-foreground/60">
                  <Clock className="h-4 w-4 mb-1 opacity-50" />
                  <span className="text-[9px] sm:text-[10px]">No events</span>
                </div>
              )}
            </DroppableThreeDayColumn>
          );
        })}
      </div>
    </div>
  );
}
