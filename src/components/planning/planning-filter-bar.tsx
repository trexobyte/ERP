'use client';

import React from 'react';
import { format, subMonths, addMonths } from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Plus,
  User,
  Calendar as CalendarIcon,
  Grid3X3,
  Columns3,
  CalendarDays,
} from 'lucide-react';

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
  // Google Calendar View Switcher additions
  calendarViewMode?: 'month' | 'week' | '3day';
  onChangeViewMode?: (mode: 'month' | 'week' | '3day') => void;
  currentDateLabel?: string;
  onPrevDate?: () => void;
  onNextDate?: () => void;
  onToday?: () => void;
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
  calendarViewMode = 'month',
  onChangeViewMode,
  currentDateLabel,
  onPrevDate,
  onNextDate,
  onToday,
}: PlanningFilterBarProps) {
  const handleExportMonthShoots = () => {
    const month = currentMonth.getMonth() + 1;
    const year = currentMonth.getFullYear();
    const url = `/api/calendar/export?month=${month}&year=${year}`;
    window.location.href = url;
  };

  const handlePrev = () => {
    if (onPrevDate) {
      onPrevDate();
    } else {
      onChangeMonth(subMonths(currentMonth, 1));
    }
  };

  const handleNext = () => {
    if (onNextDate) {
      onNextDate();
    } else {
      onChangeMonth(addMonths(currentMonth, 1));
    }
  };

  const handleGoToday = () => {
    if (onToday) {
      onToday();
    } else {
      onChangeMonth(new Date());
    }
  };

  const displayDateLabel = currentDateLabel || format(currentMonth, 'MMMM yyyy');

  return (
    <div className="space-y-3">
      {/* Calendar Header Bar & View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-card p-3 sm:p-4 rounded-xl border border-border shadow-2xs">
        {/* Left: Navigation and Date Heading */}
        <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-3 flex-wrap">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrev}
              className="rounded-lg border border-border p-1.5 text-foreground hover:bg-muted transition-colors cursor-pointer"
              title="Previous"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="rounded-lg border border-border p-1.5 text-foreground hover:bg-muted transition-colors cursor-pointer"
              title="Next"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleGoToday}
              className="px-2.5 py-1 text-xs font-mono font-bold text-[#FF3B00] hover:bg-[#FF3B00]/10 rounded-md border border-[#FF3B00]/30 ml-1 transition-colors cursor-pointer"
            >
              Today
            </button>
          </div>

          <h2 className="text-base sm:text-lg font-black tracking-tight text-foreground uppercase truncate">
            {displayDateLabel}
          </h2>
        </div>

        {/* Right: View Switcher (Month, Week, 3 Days) & Quick Actions */}
        <div className="flex items-center justify-between sm:justify-end gap-2 flex-wrap">
          {/* View Switcher Pills */}
          {onChangeViewMode && (
            <div className="flex items-center bg-muted/80 p-0.5 rounded-lg border border-border shrink-0">
              <button
                type="button"
                onClick={() => onChangeViewMode('month')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  calendarViewMode === 'month'
                    ? 'bg-[#FF3B00] text-white shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Google Calendar Month View"
              >
                <Grid3X3 className="h-3.5 w-3.5" />
                <span>Month</span>
              </button>
              <button
                type="button"
                onClick={() => onChangeViewMode('week')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  calendarViewMode === 'week'
                    ? 'bg-[#FF3B00] text-white shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="7-Day Week View"
              >
                <CalendarDays className="h-3.5 w-3.5" />
                <span>Week</span>
              </button>
              <button
                type="button"
                onClick={() => onChangeViewMode('3day')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  calendarViewMode === '3day'
                    ? 'bg-[#FF3B00] text-white shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="3-Day View"
              >
                <Columns3 className="h-3.5 w-3.5" />
                <span>3 Days</span>
              </button>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportMonthShoots}
              className="hidden lg:flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-all clicky-btn cursor-pointer"
              title="Download RFC 5545 iCalendar (.ics) for all scheduled shoots this month"
            >
              <CalendarIcon className="h-3.5 w-3.5 text-[#FF3B00]" />
              <span>Export (.ics)</span>
            </button>

            <button
              type="button"
              onClick={onOpenQuickAdd}
              className="flex items-center gap-1 rounded-md bg-[#FF3B00] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#e03400] transition-all clicky-btn shadow-xs cursor-pointer"
              title="Add a Content Post or Shoot"
            >
              <Plus className="h-3.5 w-3.5 stroke-[3]" /> Add
            </button>
          </div>
        </div>
      </div>

      {/* Filter Options & Client Legend Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-muted/40 p-2.5 sm:p-3 rounded-lg border border-border/60">
        <div className="flex flex-wrap items-center gap-2">
          {/* My Items Only toggle */}
          <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground cursor-pointer select-none bg-card px-2.5 py-1 rounded-md border border-border">
            <input
              type="checkbox"
              checked={myItemsOnly}
              onChange={(e) => onToggleMyItemsOnly(e.target.checked)}
              className="rounded border-input text-[#FF3B00] focus:ring-[#FF3B00]"
            />
            <User className="h-3.5 w-3.5 text-[#FF3B00]" /> My Items
          </label>

          <span className="text-[11px] font-mono text-muted-foreground uppercase font-bold hidden sm:inline ml-1">
            Legend:
          </span>

          {/* Client Badges */}
          {clients.map((c) => {
            const isHidden = hiddenClients.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onToggleHideClient(c.id)}
                className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold transition-all border cursor-pointer ${
                  isHidden
                    ? 'bg-transparent text-muted-foreground border-border line-through opacity-50'
                    : 'bg-card text-foreground border-border shadow-2xs'
                }`}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: c.color }}
                />
                <span className="truncate max-w-[100px]">{c.name}</span>
                {isHidden ? (
                  <EyeOff className="h-3 w-3 text-muted-foreground" />
                ) : (
                  <Eye className="h-3 w-3 text-[#FF3B00]" />
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onSelectAllClients}
            className="px-2 py-0.5 rounded text-[11px] font-bold text-[#FF3B00] hover:bg-[#FF3B00]/10 transition-colors cursor-pointer"
            title="Show all clients on calendar"
          >
            All
          </button>
          <span className="text-muted-foreground text-xs">•</span>
          <button
            type="button"
            onClick={onUnselectAllClients}
            className="px-2 py-0.5 rounded text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title="Hide all clients on calendar"
          >
            None
          </button>
        </div>
      </div>
    </div>
  );
}
