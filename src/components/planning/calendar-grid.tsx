'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { format, isSameMonth, isToday } from 'date-fns';
import { useDroppable } from '@dnd-kit/core';
import { CheckSquare, Plus, Calendar as CalendarIcon, User, ArrowRight, Check } from 'lucide-react';
import { toLocalDateKey, parseLocalDateKey, formatLocalDate } from '@/lib/date-utils';
import { CalendarItemCard } from './calendar-item-card';
import { CalendarTaskCard } from './calendar-task-card';

interface DroppableDayCellProps {
  day: Date;
  dateKey: string;
  isCurrentDay: boolean;
  isCurrentMonth: boolean;
  isSelected?: boolean;
  onQuickAdd: () => void;
  onSelect?: () => void;
  children: React.ReactNode;
}

export function DroppableDayCell({
  day,
  dateKey,
  isCurrentDay,
  isCurrentMonth,
  isSelected,
  onQuickAdd,
  onSelect,
  children,
}: DroppableDayCellProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `desktop-day-${dateKey}`,
    data: { type: 'day', date: dateKey },
  });

  return (
    <div
      ref={setNodeRef}
      data-date={dateKey}
      onClick={onSelect}
      className={`min-h-32 p-2 transition-colors relative flex flex-col justify-between group cursor-pointer ${
        isOver
          ? 'ring-2 ring-[#FF3B00] bg-[#FF3B00]/20 z-20 shadow-lg'
          : isSelected
          ? 'ring-2 ring-[#FF3B00]/70 bg-card z-10'
          : ''
      } ${
        isCurrentMonth ? 'bg-card' : 'bg-muted/30 text-muted-foreground/50'
      }`}
    >
      <div className="flex justify-between items-center mb-1">
        <span
          className={`text-xs font-bold h-6 w-6 rounded-full flex items-center justify-center ${
            isCurrentDay
              ? 'bg-[#FF3B00] text-white shadow-xs'
              : isCurrentMonth
              ? 'text-foreground/80 font-mono'
              : 'text-muted-foreground/40 font-mono'
          }`}
        >
          {format(day, 'd')}
        </span>
        <button
          type="button"
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

/**
 * Mobile-optimized compact day cell for the Google Calendar-style month grid.
 * Displays recognizable short item titles rather than only dots, plus clear +N more badge on busy days.
 */
function MobileDroppableDayCell({
  day,
  dateKey,
  isCurrentDay,
  isCurrentMonth,
  isSelected,
  itemsCount,
  previewItems,
  onSelect,
}: {
  day: Date;
  dateKey: string;
  isCurrentDay: boolean;
  isCurrentMonth: boolean;
  isSelected: boolean;
  itemsCount: number;
  previewItems: Array<{ id: string; title: string; color: string; isTask?: boolean }>;
  onSelect: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `mobile-day-${dateKey}`,
    data: { type: 'day', date: dateKey },
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      data-date={dateKey}
      onClick={onSelect}
      className={`min-h-[58px] sm:min-h-[64px] p-1 rounded-lg flex flex-col items-center justify-between transition-all select-none relative cursor-pointer border ${
        isOver
          ? 'border-[#FF3B00] bg-[#FF3B00]/25 ring-2 ring-[#FF3B00] scale-105 z-20'
          : isSelected
          ? 'border-[#FF3B00] bg-[#FF3B00]/15 ring-2 ring-[#FF3B00] z-10 shadow-xs'
          : isCurrentDay
          ? 'border-[#FF3B00]/50 bg-[#FF3B00]/5'
          : isCurrentMonth
          ? 'border-transparent bg-card hover:bg-muted/50'
          : 'border-transparent bg-muted/20 opacity-40'
      }`}
    >
      {/* Day Number */}
      <span
        className={`text-[11px] sm:text-xs font-bold h-5 w-5 sm:h-5.5 sm:w-5.5 rounded-full flex items-center justify-center ${
          isCurrentDay
            ? 'bg-[#FF3B00] text-white shadow-xs'
            : isSelected
            ? 'font-black text-[#FF3B00]'
            : isCurrentMonth
            ? 'text-foreground'
            : 'text-muted-foreground'
        }`}
      >
        {format(day, 'd')}
      </span>

      {/* Item Previews (Recognizable short title + +N more indicator) */}
      <div className="w-full flex flex-col gap-0.5 min-h-[18px] justify-end overflow-hidden">
        {itemsCount > 0 && (
          <>
            {previewItems.slice(0, 1).map((item) => (
              <div
                key={item.id}
                className="w-full text-[7.5px] sm:text-[8px] font-bold leading-none px-1 py-0.5 rounded truncate text-white shadow-2xs text-left"
                style={{ backgroundColor: item.color }}
                title={item.title}
              >
                {item.isTask ? '✓ ' : ''}{item.title}
              </div>
            ))}
            {itemsCount > 1 && (
              <span className="text-[7px] sm:text-[7.5px] font-mono font-bold text-muted-foreground leading-none text-right pr-0.5">
                +{itemsCount - 1} more
              </span>
            )}
          </>
        )}
      </div>
    </button>
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
  onRescheduleContent?: (id: string, dateKey: string) => Promise<void>;
  onRescheduleTask?: (id: string, dateKey: string) => Promise<void>;
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
  onRescheduleContent,
  onRescheduleTask,
}: CalendarGridProps) {
  const router = useRouter();

  // Active selected date for the Mobile Google Calendar Agenda inspection
  const [selectedDateKey, setSelectedDateKey] = useState<string>(() =>
    toLocalDateKey(new Date())
  );
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  // Parse currently selected date for header formatting
  const selectedDateObj = parseLocalDateKey(selectedDateKey);

  // Items for the currently selected date
  const selectedDayItems = filteredContent
    .filter(
      (item) =>
        Boolean(item.scheduledDate) &&
        toLocalDateKey(item.scheduledDate) === selectedDateKey
    )
    .sort((a, b) => a.id.localeCompare(b.id));

  const selectedDayTasks = actionTasks.filter(
    (task) =>
      task.dueDate &&
      toLocalDateKey(task.dueDate) === selectedDateKey &&
      (!selectedClientFilter ||
        task.clientId === selectedClientFilter ||
        task.client?.id === selectedClientFilter) &&
      (!task.clientId || !hiddenClients.includes(task.clientId))
  );

  const showToast = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(null), 4000);
  };

  return (
    <div className="space-y-4">
      {/* ============================================================== */}
      {/* 1. MOBILE GOOGLE CALENDAR MONTH VIEW (Visible on < md screens) */}
      {/* Fits the ENTIRE month on screen without scrolling weeks!       */}
      {/* ============================================================== */}
      <div className="block md:hidden space-y-3">
        {/* Compact Month Grid Card */}
        <div className="rounded-xl border border-border bg-card p-2 sm:p-3 shadow-xs space-y-1">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <span
                key={i}
                className="text-[10px] font-mono font-bold uppercase text-muted-foreground"
              >
                {d}
              </span>
            ))}
          </div>

          {/* 7-Column Full Month Grid */}
          <div className="grid grid-cols-7 gap-1">
            {daysInCalendar.map((day) => {
              const dateKey = toLocalDateKey(day);
              const isCurrentMonthDate = isSameMonth(day, currentMonth);
              const isCurrentDay = isToday(day);
              const isSelected = selectedDateKey === dateKey;

              const dayItems = filteredContent.filter(
                (item) =>
                  Boolean(item.scheduledDate) &&
                  toLocalDateKey(item.scheduledDate) === dateKey
              );

              const dayTasks = actionTasks.filter(
                (task) =>
                  task.dueDate &&
                  toLocalDateKey(task.dueDate) === dateKey &&
                  (!selectedClientFilter ||
                    task.clientId === selectedClientFilter ||
                    task.client?.id === selectedClientFilter) &&
                  (!task.clientId || !hiddenClients.includes(task.clientId))
              );

              const totalCount = dayItems.length + dayTasks.length;

              const previewItems = [
                ...dayItems.map((item) => ({
                  id: item.id,
                  title: item.title,
                  color: item.isPersonal
                    ? '#8B5CF6'
                    : item.client?.color || '#FF3B00',
                  isTask: false,
                })),
                ...dayTasks.map((task) => ({
                  id: task.id,
                  title: task.title,
                  color: task.urgency === 'URGENT' ? '#FF3B00' : '#3B82F6',
                  isTask: true,
                })),
              ];

              return (
                <MobileDroppableDayCell
                  key={`mobile-cell-${dateKey}`}
                  day={day}
                  dateKey={dateKey}
                  isCurrentDay={isCurrentDay}
                  isCurrentMonth={isCurrentMonthDate}
                  isSelected={isSelected}
                  itemsCount={totalCount}
                  previewItems={previewItems}
                  onSelect={() => setSelectedDateKey(dateKey)}
                />
              );
            })}
          </div>
        </div>

        {/* Selected Date Agenda / Schedule Drawer Panel */}
        <div className="rounded-xl border border-border bg-card p-3 sm:p-4 shadow-sm space-y-3 animate-in fade-in">
          {/* Agenda Header */}
          <div className="flex items-center justify-between border-b border-border pb-2.5">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-[#FF3B00]" />
              <div>
                <h3 className="text-xs sm:text-sm font-extrabold text-foreground">
                  {format(selectedDateObj, 'EEEE, MMMM d, yyyy')}
                </h3>
                <p className="text-[10px] text-muted-foreground font-mono">
                  {selectedDayItems.length} deliverable
                  {selectedDayItems.length === 1 ? '' : 's'}
                  {selectedDayTasks.length > 0 &&
                    `, ${selectedDayTasks.length} task${
                      selectedDayTasks.length === 1 ? '' : 's'
                    }`}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onQuickAddOnDate(selectedDateKey)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-[#FF3B00] text-white text-[11px] font-bold hover:bg-[#e03400] transition-colors shadow-2xs cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5 stroke-[3]" /> Add
            </button>
          </div>

          {/* Feedback Toast */}
          {feedbackToast && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 text-xs font-semibold animate-in fade-in">
              <Check className="h-4 w-4 shrink-0" />
              <span>{feedbackToast}</span>
            </div>
          )}

          {/* Agenda Events List */}
          <div className="space-y-2.5">
            {/* Scheduled Content Deliverables */}
            {selectedDayItems.map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-lg border border-border bg-muted/20 hover:border-[#FF3B00]/40 transition-all space-y-2"
              >
                {/* Drag Item Card */}
                <CalendarItemCard
                  key={`agenda-content-${item.id}`}
                  idPrefix="agenda"
                  item={item}
                  onClick={() => onItemClick(item)}
                  isDragInProgress={Boolean(activeDragItem)}
                />

                {/* Agenda Details & Move-to-Date Action */}
                <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono pt-1 border-t border-border/40">
                  <span className="flex items-center gap-1 truncate max-w-[130px]">
                    <User className="h-3 w-3 shrink-0" />
                    <span className="truncate">{item.assignee?.name || 'Unassigned'}</span>
                  </span>

                  {/* Native Move to Date Picker */}
                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <span className="text-[9.5px] font-bold text-muted-foreground flex items-center gap-1">
                      <CalendarIcon className="h-3 w-3 text-[#FF3B00]" /> Move:
                    </span>
                    <input
                      type="date"
                      defaultValue={selectedDateKey}
                      onChange={async (e) => {
                        const newDate = e.target.value;
                        if (newDate && newDate !== selectedDateKey && onRescheduleContent) {
                          await onRescheduleContent(item.id, newDate);
                          showToast(`Moved deliverable "${item.title}" to ${formatLocalDate(newDate)}`);
                        }
                      }}
                      className="text-[10px] font-mono bg-background border border-border rounded px-1.5 py-0.5 text-foreground cursor-pointer focus:border-[#FF3B00] outline-none"
                      title="Select new date for deliverable"
                    />
                  </div>
                </div>
              </div>
            ))}

            {/* Action Tasks */}
            {selectedDayTasks.map((task) => (
              <div
                key={task.id}
                className="p-3 rounded-lg border border-border bg-muted/20 hover:border-amber-500/40 transition-all space-y-2"
              >
                {/* Drag Task Card */}
                <CalendarTaskCard
                  key={`agenda-task-${task.id}`}
                  idPrefix="agenda"
                  task={task}
                  onClick={() => router.push('/tasks')}
                  isDragInProgress={Boolean(activeDragItem)}
                />

                {/* Agenda Details & Move-to-Date Action */}
                <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono pt-1 border-t border-border/40">
                  <span className="truncate max-w-[130px]">
                    {task.client?.name || 'General'} • {task.assignee?.name || 'Unassigned'}
                  </span>

                  {/* Native Move to Date Picker */}
                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <span className="text-[9.5px] font-bold text-muted-foreground flex items-center gap-1">
                      <CalendarIcon className="h-3 w-3 text-[#FF3B00]" /> Move:
                    </span>
                    <input
                      type="date"
                      defaultValue={selectedDateKey}
                      onChange={async (e) => {
                        const newDate = e.target.value;
                        if (newDate && newDate !== selectedDateKey && onRescheduleTask) {
                          await onRescheduleTask(task.id, newDate);
                          showToast(`Moved task "${task.title}" to ${formatLocalDate(newDate)}`);
                        }
                      }}
                      className="text-[10px] font-mono bg-background border border-border rounded px-1.5 py-0.5 text-foreground cursor-pointer focus:border-[#FF3B00] outline-none"
                      title="Select new due date for task"
                    />
                  </div>
                </div>
              </div>
            ))}

            {/* Empty State */}
            {selectedDayItems.length === 0 && selectedDayTasks.length === 0 && (
              <div className="p-6 text-center rounded-lg border border-dashed border-border/60 space-y-2">
                <p className="text-xs text-muted-foreground">
                  No deliverables or tasks scheduled for this day.
                </p>
                <button
                  type="button"
                  onClick={() => onQuickAddOnDate(selectedDateKey)}
                  className="text-xs font-bold text-[#FF3B00] hover:underline cursor-pointer"
                >
                  + Schedule a Deliverable or Shoot
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. DESKTOP CALENDAR GRID (Visible on md+ screens)               */}
      {/* Preserves full cards inside each cell for desktop users        */}
      {/* ============================================================== */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-border shadow-xs scrollbar-thin">
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
                key={`desktop-cell-${dateKey}`}
                day={day}
                dateKey={dateKey}
                isCurrentDay={isCurrentDay}
                isCurrentMonth={isCurrentMonthDate}
                onQuickAdd={() => onQuickAddOnDate(dateKey)}
              >
                {/* Scheduled Content Items */}
                {dayItems.map((item) => (
                  <CalendarItemCard
                    key={`desktop-content-${item.id}`}
                    idPrefix="desktop"
                    item={item}
                    onClick={() => onItemClick(item)}
                    isDragInProgress={Boolean(activeDragItem)}
                  />
                ))}

                {/* Action Tasks Due On This Date - Now Fully Draggable! */}
                {dayTasks.map((task) => (
                  <CalendarTaskCard
                    key={`desktop-task-${task.id}`}
                    idPrefix="desktop"
                    task={task}
                    onClick={() => router.push('/tasks')}
                    isDragInProgress={Boolean(activeDragItem)}
                  />
                ))}
              </DroppableDayCell>
            );
          })}
        </div>
      </div>
    </div>
  );
}
