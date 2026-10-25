'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useImpersonation } from '@/components/providers';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  subMonths,
  addMonths,
  subWeeks,
  addWeeks,
  subDays,
  addDays,
  format,
  isSameMonth,
} from 'date-fns';
import {
  DndContext,
  pointerWithin,
  rectIntersection,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  Calendar as CalendarIcon,
  Wand2,
  Sparkles,
  Lock,
} from 'lucide-react';
import { hasPermission, hasActionPermission } from '@/lib/permissions';
import { toLocalDateKey } from '@/lib/date-utils';
import { DroppablePoolArea } from '@/components/planning/droppable-pool-area';
import { CalendarGrid } from '@/components/planning/calendar-grid';
import { CalendarWeekView } from '@/components/planning/calendar-week-view';
import { CalendarThreeDayView } from '@/components/planning/calendar-three-day-view';
import { PlanningFilterBar } from '@/components/planning/planning-filter-bar';
import { ContentDetailModal } from '@/components/planning/content-detail-modal';
import { PlanningWizard } from '@/components/planning/planning-wizard';

export default function PlanningPage() {
  const router = useRouter();
  const {
    effectiveRoleName,
    effectivePermissions,
    openQuickAdd,
    refreshTrigger,
    triggerRefresh,
    cachedClients,
    cachedUsers,
    cachedContent,
    setCachedContent,
    cachedTasks,
    setCachedTasks,
  } = useImpersonation();

  const isSuperAdmin = effectiveRoleName === 'Super Admin';
  const canViewCalendar = hasPermission(effectivePermissions, 'calendar', 'view') || isSuperAdmin;
  const canCreateCalendar = hasActionPermission(effectivePermissions, 'calendar', 'create') || isSuperAdmin;
  const canEditCalendar = hasActionPermission(effectivePermissions, 'calendar', 'edit') || isSuperAdmin;
  const canDeleteCalendar = hasActionPermission(effectivePermissions, 'calendar', 'delete') || isSuperAdmin;

  const [activeTab, setActiveTab] = useState<'calendar' | 'wizard'>('calendar');

  // Calendar State & View Modes (Month, Week, 3 Days)
  const [calendarViewMode, setCalendarViewMode] = useState<'month' | 'week' | '3day'>('month');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [contentItems, setContentItems] = useState<any[]>(() => {
    if (cachedContent && cachedContent.length > 0) return cachedContent;
    if (typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem('trexo_cache_content');
        if (stored) return JSON.parse(stored);
      } catch {}
    }
    return [];
  });
  const [actionTasks, setActionTasks] = useState<any[]>(() => {
    if (cachedTasks && cachedTasks.length > 0) return cachedTasks;
    if (typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem('trexo_cache_tasks');
        if (stored) return JSON.parse(stored);
      } catch {}
    }
    return [];
  });
  const [clients, setClients] = useState<any[]>(cachedClients || []);
  const [users, setUsers] = useState<any[]>(cachedUsers || []);
  const [selectedClientFilter, setSelectedClientFilter] = useState('');
  const [myItemsOnly, setMyItemsOnly] = useState(false);
  const [hiddenClients, setHiddenClients] = useState<string[]>([]);

  // Item Detail & Edit Modal state
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingEdit, setDeletingEdit] = useState(false);
  const [toastError, setToastError] = useState<string | null>(null);

  // Active drag item for DragOverlay
  const [activeDragItem, setActiveDragItem] = useState<any | null>(null);

  // DnD Sensors: MouseSensor for desktop, TouchSensor with delay to allow smooth scrolling on mobile
  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 8,
    },
  });

  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 250,
      tolerance: 6,
    },
  });

  const sensors = useSensors(mouseSensor, touchSensor);

  useEffect(() => {
    if (toastError) {
      const timer = setTimeout(() => setToastError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toastError]);

  useEffect(() => {
    if (cachedClients && cachedClients.length > 0 && clients.length === 0) {
      setClients(cachedClients);
    }
  }, [cachedClients, clients.length]);

  useEffect(() => {
    if (cachedUsers && cachedUsers.length > 0 && users.length === 0) {
      setUsers(cachedUsers);
    }
  }, [cachedUsers, users.length]);

  // Fetch clients and users
  useEffect(() => {
    fetch('/api/clients', { cache: 'no-store' })
      .then(async (res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setClients(data);
        }
      })
      .catch((err) => console.error('Failed to fetch clients:', err));

    fetch('/api/users', { cache: 'no-store' })
      .then(async (res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setUsers(data);
      })
      .catch((err) => console.error('Failed to fetch users:', err));
  }, [refreshTrigger]);

  useEffect(() => {
    if (cachedContent && cachedContent.length > 0 && contentItems.length === 0 && !selectedClientFilter && !myItemsOnly) {
      setContentItems(cachedContent);
    }
  }, [cachedContent, contentItems.length, selectedClientFilter, myItemsOnly]);

  const fetchCalendarData = (retryCount = 0) => {
    const params = new URLSearchParams();
    if (selectedClientFilter) params.append('clientId', selectedClientFilter);
    if (myItemsOnly) params.append('myItemsOnly', 'true');

    fetch(`/api/content?${params.toString()}`, { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) {
          console.warn('/api/content returned non-ok status:', res.status);
          if (retryCount < 2) {
            setTimeout(() => fetchCalendarData(retryCount + 1), 600);
          }
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data)) {
          const hasFilters = Boolean(selectedClientFilter || myItemsOnly);
          if (data.length > 0 || hasFilters) {
            setContentItems(data);
            if (!hasFilters) {
              setCachedContent(data);
              if (typeof window !== 'undefined') {
                try {
                  sessionStorage.setItem('trexo_cache_content', JSON.stringify(data));
                } catch {}
              }
            }
          } else if (contentItems.length === 0 && retryCount < 2) {
            setTimeout(() => fetchCalendarData(retryCount + 1), 600);
          }
        }
      })
      .catch((err) => {
        console.error('Failed to fetch content:', err);
        if (retryCount < 2) {
          setTimeout(() => fetchCalendarData(retryCount + 1), 600);
        }
      });
  };

  const fetchActionTasks = (retryCount = 0) => {
    fetch('/api/tasks', { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) {
          if (retryCount < 2) setTimeout(() => fetchActionTasks(retryCount + 1), 600);
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setActionTasks(data);
          setCachedTasks(data);
          if (typeof window !== 'undefined') {
            try {
              sessionStorage.setItem('trexo_cache_tasks', JSON.stringify(data));
            } catch {}
          }
        }
      })
      .catch((err) => {
        console.error('Failed to fetch tasks in planning:', err);
        if (retryCount < 2) setTimeout(() => fetchActionTasks(retryCount + 1), 600);
      });
  };

  useEffect(() => {
    fetchCalendarData();
    fetchActionTasks();
  }, [selectedClientFilter, myItemsOnly, refreshTrigger]);

  const customCollisionDetection = (args: any) => {
    // 1. Direct pointer within container
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) {
      return pointerCollisions;
    }
    // 2. Overlap intersection with closest target (largest overlap area)
    const rectCollisions = rectIntersection(args);
    if (rectCollisions.length > 0) {
      return rectCollisions;
    }
    // 3. If dragging over whitespace/headers/out of bounds, DO NOT fallback to closestCenter.
    return [];
  };

  const handleDragStart = (event: DragStartEvent) => {
    const item = contentItems.find((i) => i.id === event.active.id);
    if (item) setActiveDragItem(item);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragItem(null);

    if (!over) {
      return;
    }

    if (!canEditCalendar) {
      setToastError('You do not have permission to edit or reschedule calendar deliverables.');
      return;
    }

    const itemId = active.id as string;
    const targetId = over.id as string;
    const targetData = over.data?.current;

    const isPoolTarget =
      targetId === 'pool' ||
      targetId === 'unscheduled-pool' ||
      targetData?.type === 'pool' ||
      (targetData?.type === 'card' && !targetData?.item?.scheduledDate);

    const previousItems = [...contentItems];

    if (isPoolTarget) {
      // Optimistically move item to unscheduled pool
      setContentItems((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? { ...item, scheduledDate: null, status: 'PLANNED' }
            : item
        )
      );

      try {
        const res = await fetch('/api/content', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: itemId,
            scheduledDate: null,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          const errMsg = errData.error || `Failed to unschedule task (${res.status})`;
          setContentItems(previousItems);
          setToastError(errMsg);
          return;
        }

        const updatedItem = await res.json();
        setContentItems((prev) =>
          prev.map((item) => (item.id === itemId ? updatedItem : item))
        );
        triggerRefresh();
      } catch (err: any) {
        console.error('Drag unschedule API error:', err);
        setContentItems(previousItems);
        setToastError(err?.message || 'Failed to unschedule task');
      }
      return;
    }

    // Direct read of target date key - never recomputed from index math
    const targetDateKey =
      targetData?.type === 'day'
        ? targetData.date || targetId
        : targetData?.type === 'card'
        ? (targetData.item?.scheduledDate ? toLocalDateKey(targetData.item.scheduledDate) : null)
        : targetId.startsWith('20') && targetId.split('-').length === 3
        ? targetId
        : null;

    if (!targetDateKey) return;

    const activeItem = contentItems.find((i) => i.id === itemId);
    const nextStatus = activeItem?.status === 'PLANNED' ? 'SCHEDULED' : (activeItem?.status || 'SCHEDULED');

    // Optimistically update local state immediately with exact date key (0ms lag)
    setContentItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, scheduledDate: targetDateKey, status: nextStatus }
          : item
      )
    );

    try {
      const res = await fetch('/api/content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: itemId,
          scheduledDate: targetDateKey,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const errMsg = errData.error || `Failed to schedule task (${res.status})`;
        setContentItems(previousItems);
        setToastError(errMsg);
        return;
      }

      const updatedItem = await res.json();
      setContentItems((prev) =>
        prev.map((item) => (item.id === itemId ? updatedItem : item))
      );
      triggerRefresh();
    } catch (err: any) {
      console.error('Drag reschedule API error:', err);
      setContentItems(previousItems);
      setToastError(err?.message || 'Failed to schedule task');
    }
  };

  const handleSaveItemEdit = async (updatedData: any) => {
    setSavingEdit(true);
    try {
      const res = await fetch('/api/content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData),
      });
      if (res.ok) {
        setSelectedItem(null);
        fetchCalendarData();
        triggerRefresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    setDeletingEdit(true);
    try {
      const res = await fetch(`/api/content?id=${itemId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setSelectedItem(null);
        fetchCalendarData();
        triggerRefresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingEdit(false);
    }
  };

  // Calendar dates matrix (Sunday through Saturday alignment)
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInCalendar = eachDayOfInterval({
    start: startOfWeek(monthStart, { weekStartsOn: 0 }),
    end: endOfWeek(monthEnd, { weekStartsOn: 0 }),
  });

  // Date Navigation handlers across all 3 view modes
  const handlePrevDate = () => {
    if (calendarViewMode === 'month') {
      setCurrentDate((prev) => subMonths(prev, 1));
    } else if (calendarViewMode === 'week') {
      setCurrentDate((prev) => subWeeks(prev, 1));
    } else {
      setCurrentDate((prev) => subDays(prev, 3));
    }
  };

  const handleNextDate = () => {
    if (calendarViewMode === 'month') {
      setCurrentDate((prev) => addMonths(prev, 1));
    } else if (calendarViewMode === 'week') {
      setCurrentDate((prev) => addWeeks(prev, 1));
    } else {
      setCurrentDate((prev) => addDays(prev, 3));
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Formatted date label for current view
  let displayDateLabel = format(currentDate, 'MMMM yyyy');
  if (calendarViewMode === 'week') {
    const wStart = startOfWeek(currentDate, { weekStartsOn: 0 });
    const wEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
    displayDateLabel = isSameMonth(wStart, wEnd)
      ? `${format(wStart, 'MMM d')} – ${format(wEnd, 'd, yyyy')}`
      : `${format(wStart, 'MMM d')} – ${format(wEnd, 'MMM d, yyyy')}`;
  } else if (calendarViewMode === '3day') {
    const d3End = addDays(currentDate, 2);
    displayDateLabel = isSameMonth(currentDate, d3End)
      ? `${format(currentDate, 'MMM d')} – ${format(d3End, 'd, yyyy')}`
      : `${format(currentDate, 'MMM d')} – ${format(d3End, 'MMM d, yyyy')}`;
  }

  const toggleHideClient = (cId: string) => {
    if (hiddenClients.includes(cId)) {
      setHiddenClients(hiddenClients.filter((id) => id !== cId));
    } else {
      setHiddenClients([...hiddenClients, cId]);
    }
  };

  const selectAllClients = () => setHiddenClients([]);
  const unselectAllClients = () => setHiddenClients(clients.map((c) => c.id));

  const filteredContent = contentItems.filter(
    (item) => item.isPersonal || !item.clientId || !hiddenClients.includes(item.clientId)
  );

  const unscheduledItems = filteredContent.filter((item) => !item.scheduledDate);

  if (!canViewCalendar) {
    return (
      <div className="rounded-2xl border border-border bg-card p-12 text-center space-y-4 max-w-md mx-auto my-16 shadow-lg animate-in fade-in">
        <div className="h-14 w-14 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto border border-rose-500/20">
          <Lock className="h-7 w-7" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-black text-foreground">Access Restricted</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Your current account role (<span className="text-[#FF3B00] font-bold">{effectiveRoleName}</span>) does not have permission to view or manage content planning.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header with Mode Switcher */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            CONTENT & SHOOT PLANNING <Sparkles className="h-5 w-5 text-[#FF3B00]" />
          </h1>
          <p className="text-xs text-muted-foreground font-mono">
            Interactive Drag & Drop Calendar & Bulk Monthly Planning Wizard
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-2 bg-muted p-1 rounded-lg border border-border">
          <button
            onClick={() => setActiveTab('calendar')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'calendar'
                ? 'bg-[#FF3B00] text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <CalendarIcon className="h-4 w-4" /> Calendar View
          </button>
          {canCreateCalendar && (
            <button
              onClick={() => setActiveTab('wizard')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'wizard'
                  ? 'bg-[#FF3B00] text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Wand2 className="h-4 w-4" /> Planning Wizard
            </button>
          )}
        </div>
      </div>

      {/* VIEW A: CALENDAR VIEW */}
      {activeTab === 'calendar' && (
        <div className="space-y-4">
          <PlanningFilterBar
            currentMonth={currentDate}
            onChangeMonth={setCurrentDate}
            calendarViewMode={calendarViewMode}
            onChangeViewMode={setCalendarViewMode}
            currentDateLabel={displayDateLabel}
            onPrevDate={handlePrevDate}
            onNextDate={handleNextDate}
            onToday={handleToday}
            myItemsOnly={myItemsOnly}
            onToggleMyItemsOnly={setMyItemsOnly}
            clients={clients}
            hiddenClients={hiddenClients}
            onToggleHideClient={toggleHideClient}
            onSelectAllClients={selectAllClients}
            onUnselectAllClients={unselectAllClients}
            onOpenQuickAdd={() => openQuickAdd('content')}
          />

          {/* Calendar Views with DnD Context */}
          <DndContext
            sensors={sensors}
            collisionDetection={customCollisionDetection}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <DroppablePoolArea
              items={unscheduledItems}
              onItemClick={(item) => setSelectedItem(item)}
              isDragInProgress={Boolean(activeDragItem)}
            />

            {/* View 1: Month View (Google Calendar Inspired Compact Mobile Grid + Agenda) */}
            {calendarViewMode === 'month' && (
              <CalendarGrid
                daysInCalendar={daysInCalendar}
                currentMonth={currentDate}
                filteredContent={filteredContent}
                actionTasks={actionTasks}
                selectedClientFilter={selectedClientFilter}
                hiddenClients={hiddenClients}
                activeDragItem={activeDragItem}
                onItemClick={(item) => setSelectedItem(item)}
                onQuickAddOnDate={(dateKey) => openQuickAdd('content', dateKey)}
              />
            )}

            {/* View 2: Week View (7-Day Responsive Columns) */}
            {calendarViewMode === 'week' && (
              <CalendarWeekView
                currentDate={currentDate}
                filteredContent={filteredContent}
                actionTasks={actionTasks}
                selectedClientFilter={selectedClientFilter}
                hiddenClients={hiddenClients}
                activeDragItem={activeDragItem}
                onItemClick={(item) => setSelectedItem(item)}
                onQuickAddOnDate={(dateKey) => openQuickAdd('content', dateKey)}
              />
            )}

            {/* View 3: Three-Day View (3 Consecutive Days Side-by-Side) */}
            {calendarViewMode === '3day' && (
              <CalendarThreeDayView
                currentDate={currentDate}
                filteredContent={filteredContent}
                actionTasks={actionTasks}
                selectedClientFilter={selectedClientFilter}
                hiddenClients={hiddenClients}
                activeDragItem={activeDragItem}
                onItemClick={(item) => setSelectedItem(item)}
                onQuickAddOnDate={(dateKey) => openQuickAdd('content', dateKey)}
              />
            )}

            {/* Draggable Overlay Card for Smooth Drag Feedback */}
            <DragOverlay dropAnimation={null}>
              {activeDragItem ? (
                <div
                  className="rounded-lg px-2 py-1 text-[10px] font-semibold text-white shadow-2xl border-2 border-white/50 w-36 flex flex-col gap-0.5 select-none pointer-events-none opacity-90 scale-105"
                  style={{
                    backgroundColor: activeDragItem.isPersonal
                      ? '#8B5CF6'
                      : (activeDragItem.client?.color || '#FF3B00'),
                  }}
                >
                  <div className="flex items-center justify-between gap-1 pointer-events-none w-full">
                    <span className="font-extrabold truncate leading-tight">
                      {activeDragItem.isPersonal ? `🔒 ${activeDragItem.title}` : activeDragItem.title}
                    </span>
                    <span className="text-[8px] uppercase px-1 rounded-sm bg-black/40 font-mono shrink-0">
                      {activeDragItem.isPersonal ? 'PERSONAL' : activeDragItem.type}
                    </span>
                  </div>
                  {activeDragItem.assignee && (
                    <span className="text-[8.5px] text-white/85 font-mono truncate pl-3.5 leading-none">
                      {activeDragItem.assignee.name}
                    </span>
                  )}
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      )}

      {/* VIEW B: PLANNING WIZARD */}
      {activeTab === 'wizard' && (
        <PlanningWizard
          clients={clients}
          users={users}
          onComplete={() => {
            setActiveTab('calendar');
            triggerRefresh();
          }}
        />
      )}

      {/* Item Edit Modal */}
      <ContentDetailModal
        item={selectedItem}
        isOpen={Boolean(selectedItem)}
        onClose={() => setSelectedItem(null)}
        clients={clients}
        users={users}
        onSave={handleSaveItemEdit}
        onDelete={handleDeleteItem}
        isSaving={savingEdit}
        isDeleting={deletingEdit}
        canEdit={canEditCalendar}
        canDelete={canDeleteCalendar}
      />

      {/* Persistent Error Toast */}
      {toastError && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-red-600 text-white text-xs font-semibold px-4 py-3 rounded-lg shadow-xl border border-red-700 animate-in slide-in-from-bottom-2">
          <span>⚠️ {toastError}</span>
          <button
            onClick={() => setToastError(null)}
            className="text-white/80 hover:text-white font-bold ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
