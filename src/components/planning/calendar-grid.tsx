'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { format, isSameMonth, isToday } from 'date-fns';
import { useDroppable } from '@dnd-kit/core';
import { CheckSquare, Plus } from 'lucide-react';
import { toLocalDateKey } from '@/lib/date-utils';
import { CalendarItemCard } from './calendar-item-card';

interface DroppableDayCellProps {
  day: Date;
  dateKey: string;
  isCurrentDay: boolean;
  isCurrentMonth: boolean;
  onQuickAdd: () => void;
  children: React.ReactNode;
}

export function DroppableDayCell({
  day,
  dateKey,
  isCurrentDay,
  isCurrentMonth,
  onQuickAdd,
  children,
}: DroppableDayCellProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: dateKey,
    data: { type: 'day', date: dateKey },
  });

  return (
    <div
      ref={setNodeRef}
      data-date={dateKey}
      className={`min-h-32 p-2 transition-colors relative flex flex-col justify-between group ${
        isOver ? 'ring-2 ring-[#FF3B00] bg-[#FF3B00]/20 z-20 shadow-lg' : ''
      } ${
        isCurrentMonth ? 'bg-card' : 'bg-muted/30 text-muted-foreground/50'
      }`}
    >
      <div className="flex justify-between items-center mb-1">
        <span
          className={`text-xs font-bold h-6 w-6 rounded-full flex items-center justify-center ${
            isCurrentDay
              ? 'bg-[#FF3B00] text-white'
              : isCurrentMonth
              ? 'text-foreground/80 font-mono'
              : 'text-muted-foreground/40 font-mono'
          }`}
        >
          {format(day, 'd')}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onQuickAdd();
          }}
          className="opacity-0 group-hover:opacity-100 text-[#FF3B00] hover:scale-110 transition-all cursor-pointer"
          title="Quick Add on this date"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-1.5 flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}

interface CalendarGridProps {
  daysInCalendar: Date[];
  currentMonth: Date;
  filteredContent: any[];
  actionTasks: any[];
  selectedClientFilter: string;
  hiddenClients: string[];
  activeDragItem: any | null;
  onItemClick: (item: any) => void;
  onQuickAddOnDate: (dateKey: string) => void;
}

export function CalendarGrid({
  daysInCalendar,
  currentMonth,
  filteredContent,
  actionTasks,
  selectedClientFilter,
  hiddenClients,
  activeDragItem,
  onItemClick,
  onQuickAddOnDate,
}: CalendarGridProps) {
  const router = useRouter();

  return (
    <div className="overflow-x-auto rounded-xl border border-border shadow-xs scrollbar-thin">
      <div className="grid grid-cols-7 gap-px bg-border min-w-[700px]">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div
            key={d}
            className="bg-muted p-2 text-center text-xs font-bold uppercase tracking-wider text-muted-foreground"
          >
            {d}
          </div>
        ))}

        {daysInCalendar.map((day) => {
          const dateKey = toLocalDateKey(day);
          const isCurrentMonthDate = isSameMonth(day, currentMonth);
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

          const isCurrentDay = isToday(day);

          return (
            <DroppableDayCell
              key={dateKey}
              day={day}
              dateKey={dateKey}
              isCurrentDay={isCurrentDay}
              isCurrentMonth={isCurrentMonthDate}
              onQuickAdd={() => onQuickAddOnDate(dateKey)}
            >
              {/* Scheduled Content Items */}
              {dayItems.map((item) => (
                <CalendarItemCard
                  key={item.id}
                  item={item}
                  onClick={() => onItemClick(item)}
                  isDragInProgress={Boolean(activeDragItem)}
                />
              ))}

              {/* Action Tasks Due On This Date */}
              {dayTasks.map((task) => (
                <div
                  key={task.id}
                  className="group/task flex items-center justify-between gap-1 rounded px-1.5 py-0.5 text-[9.5px] font-semibold transition-all cursor-pointer shadow-2xs hover:scale-102 select-none"
                  style={{
                    backgroundColor:
                      task.urgency === 'URGENT'
                        ? '#FF3B00'
                        : task.client?.color || '#3B82F6',
                    color: '#FFFFFF',
                  }}
                  title={`Action Task: ${task.title} (${task.urgency}) - Due today`}
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push('/tasks');
                  }}
                >
                  <div className="flex items-center gap-1 min-w-0 flex-1">
                    <CheckSquare className="h-2.5 w-2.5 shrink-0 opacity-80" />
                    <span className="truncate leading-tight">{task.title}</span>
                  </div>
                  <span className="text-[7.5px] uppercase px-1 rounded-xs bg-black/30 font-mono shrink-0">
                    {task.urgency}
                  </span>
                </div>
              ))}
            </DroppableDayCell>
          );
        })}
      </div>
    </div>
  );
}
