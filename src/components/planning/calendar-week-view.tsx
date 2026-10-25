'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { format, isToday, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { useDroppable } from '@dnd-kit/core';
import { Plus, CheckSquare, Clock } from 'lucide-react';
import { toLocalDateKey, formatLocalDate } from '@/lib/date-utils';
import { CalendarItemCard } from './calendar-item-card';
import { CalendarTaskCard } from './calendar-task-card';

interface DroppableWeekDayColumnProps {
  day: Date;
  dateKey: string;
  isCurrentDay: boolean;
  onQuickAdd: () => void;
  children: React.ReactNode;
}

export function DroppableWeekDayColumn({
  day,
  dateKey,
  isCurrentDay,
  onQuickAdd,
  children,
}: DroppableWeekDayColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: dateKey,
    data: { type: 'day', date: dateKey },
  });

  return (
    <div
      ref={setNodeRef}
      data-date={dateKey}
      className={`flex flex-col rounded-xl border transition-all min-h-[460px] ${
        isOver
          ? 'border-[#FF3B00] bg-[#FF3B00]/15 ring-2 ring-[#FF3B00] shadow-md'
          : isCurrentDay
          ? 'border-[#FF3B00]/40 bg-card shadow-xs'
          : 'border-border bg-card'
      }`}
    >
      {/* Column Sticky Header */}
      <div className={`p-2.5 border-b flex items-center justify-between ${
        isCurrentDay ? 'bg-[#FF3B00]/10 border-[#FF3B00]/30' : 'bg-muted/40 border-border'
      }`}>
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`text-xs font-black h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${
              isCurrentDay ? 'bg-[#FF3B00] text-white' : 'bg-muted text-foreground'
            }`}
          >
            {format(day, 'd')}
          </span>
          <div className="min-w-0">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground leading-none">
              {format(day, 'EEE')}
            </span>
            <span className="text-[9px] font-mono text-muted-foreground/80 leading-none">
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
          className="p-1 rounded-md text-[#FF3B00] hover:bg-[#FF3B00]/10 transition-colors cursor-pointer"
          title={`Add item on ${format(day, 'MMM d')}`}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Events List Droppable Body */}
      <div className="p-2 space-y-2 flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}

interface CalendarWeekViewProps {
  currentDate: Date;
  filteredContent: any[];
  actionTasks: any[];
  selectedClientFilter: string;
  hiddenClients: string[];
  activeDragItem: any | null;
  onItemClick: (item: any) => void;
  onQuickAddOnDate: (dateKey: string) => void;
}

export function CalendarWeekView({
  currentDate,
  filteredContent,
  actionTasks,
  selectedClientFilter,
  hiddenClients,
  activeDragItem,
  onItemClick,
  onQuickAddOnDate,
}: CalendarWeekViewProps) {
  const router = useRouter();

  // 7 days of the week containing currentDate (Sunday through Saturday)
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
  const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

  return (
    <div className="space-y-3">
      {/* Mobile horizontal day strip — shows week at a glance, highlights today */}
      <div className="flex md:hidden items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {daysInWeek.map((day) => {
          const key = toLocalDateKey(day);
          const today = isToday(day);
          return (
            <div
              key={key}
              className={`flex flex-col items-center shrink-0 px-2 py-1 rounded-lg text-center transition-all ${
                today
                  ? 'bg-[#FF3B00] text-white shadow-sm'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              <span className="text-[9px] font-mono font-bold uppercase leading-none">{format(day, 'EEE')}</span>
              <span className="text-sm font-black leading-tight">{format(day, 'd')}</span>
            </div>
          );
        })}
        <span className="text-[10px] text-muted-foreground/60 font-mono shrink-0 pl-1">← scroll →</span>
      </div>

      {/* Mobile Horizontal Snap-scroll / Desktop 7-Column Grid */}
      <div className="flex overflow-x-auto pb-4 pt-1 snap-x scrollbar-thin md:grid md:grid-cols-7 gap-2.5">
        {daysInWeek.map((day) => {
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
            <div
              key={dateKey}
              className="w-[76vw] min-w-[76vw] max-w-[280px] shrink-0 snap-start md:w-auto md:min-w-0 md:max-w-none md:shrink"
            >
              <DroppableWeekDayColumn
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
                  <div className="flex flex-col items-center justify-center h-24 border border-dashed border-border/50 rounded-lg text-center p-2 text-muted-foreground/60">
                    <Clock className="h-4 w-4 mb-1 opacity-50" />
                    <span className="text-[10px]">No events</span>
                  </div>
                )}
              </DroppableWeekDayColumn>
            </div>
          );
        })}
      </div>
    </div>
  );
}
