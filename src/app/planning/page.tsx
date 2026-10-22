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
} from 'date-fns';
import {
  DndContext,
  pointerWithin,
  rectIntersection,
  PointerSensor,
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
} from 'lucide-react';
import { toLocalDateKey } from '@/lib/date-utils';
import { DroppablePoolArea } from '@/components/planning/droppable-pool-area';
import { CalendarGrid } from '@/components/planning/calendar-grid';
import { PlanningFilterBar } from '@/components/planning/planning-filter-bar';
import { ContentDetailModal } from '@/components/planning/content-detail-modal';
import { PlanningWizard } from '@/components/planning/planning-wizard';

export default function PlanningPage() {
  const router = useRouter();
  const {
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

  const [activeTab, setActiveTab] = useState<'calendar' | 'wizard'>('calendar');

  // Calendar State - opens in current month
  const [currentMonth, setCurrentMonth] = useState(new Date());
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

  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

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
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInCalendar = eachDayOfInterval({
    start: startOfWeek(monthStart, { weekStartsOn: 0 }),
    end: endOfWeek(monthEnd, { weekStartsOn: 0 }),
  });

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
          <button
            onClick={() => setActiveTab('wizard')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'wizard'
                ? 'bg-[#FF3B00] text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Wand2 className="h-4 w-4" /> Bulk Planning Wizard
          </button>
        </div>
      </div>

      {/* VIEW A: CALENDAR VIEW */}
      {activeTab === 'calendar' && (
        <div className="space-y-4">
          <PlanningFilterBar
            currentMonth={currentMonth}
            onChangeMonth={setCurrentMonth}
            myItemsOnly={myItemsOnly}
            onToggleMyItemsOnly={setMyItemsOnly}
            clients={clients}
            hiddenClients={hiddenClients}
            onToggleHideClient={toggleHideClient}
            onSelectAllClients={selectAllClients}
            onUnselectAllClients={unselectAllClients}
            onOpenQuickAdd={() => openQuickAdd('content')}
          />

          {/* Month Calendar Grid with DnD Context */}
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

            <CalendarGrid
              daysInCalendar={daysInCalendar}
              currentMonth={currentMonth}
              filteredContent={filteredContent}
              actionTasks={actionTasks}
              selectedClientFilter={selectedClientFilter}
              hiddenClients={hiddenClients}
              activeDragItem={activeDragItem}
              onItemClick={(item) => setSelectedItem(item)}
              onQuickAddOnDate={(dateKey) => openQuickAdd('content', dateKey)}
            />

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
