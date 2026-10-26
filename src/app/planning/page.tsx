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
  MeasuringStrategy,
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

  // Active recent update trackers to prevent background refetches from overwriting recent drag-and-drop operations with stale data
  const recentContentUpdatesRef = React.useRef<Map<string, { dateKey: string | null; status?: string; timestamp: number }>>(new Map());
  const recentTaskUpdatesRef = React.useRef<Map<string, { dateKey: string; timestamp: number }>>(new Map());
  const contentFetchSeqRef = React.useRef(0);
  const taskFetchSeqRef = React.useRef(0);

  // DnD Sensors: MouseSensor for desktop, TouchSensor with delay to allow smooth scrolling on mobile
  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 8,
    },
  });

  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 220,
      tolerance: 15,
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
    const seq = ++contentFetchSeqRef.current;
    const params = new URLSearchParams();
    if (selectedClientFilter) params.append('clientId', selectedClientFilter);
    if (myItemsOnly) params.append('myItemsOnly', 'true');

    fetch(`/api/content?${params.toString()}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    })
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
        if (seq !== contentFetchSeqRef.current) return;
        if (Array.isArray(data)) {
          const hasFilters = Boolean(selectedClientFilter || myItemsOnly);
          if (data.length > 0 || hasFilters) {
            setContentItems(() => {
              const reconciled = data.map((serverItem) => {
                const recent = recentContentUpdatesRef.current.get(serverItem.id);
                if (recent && Date.now() - recent.timestamp < 15000) {
                  if (recent.dateKey === null) {
                    if (serverItem.scheduledDate !== null) {
                      return { ...serverItem, scheduledDate: null, status: recent.status || 'PLANNED' };
                    } else {
                      recentContentUpdatesRef.current.delete(serverItem.id);
                    }
                  } else if (toLocalDateKey(serverItem.scheduledDate) !== recent.dateKey) {
                    return { ...serverItem, scheduledDate: recent.dateKey, status: recent.status || serverItem.status };
                  } else {
                    recentContentUpdatesRef.current.delete(serverItem.id);
                  }
                }
                return serverItem;
              });
              if (!hasFilters) {
                setCachedContent(reconciled);
                if (typeof window !== 'undefined') {
                  try {
                    sessionStorage.setItem('trexo_cache_content', JSON.stringify(reconciled));
                  } catch {}
                }
              }
              return reconciled;
            });
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
    const seq = ++taskFetchSeqRef.current;
    fetch('/api/tasks', {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    })
      .then(async (res) => {
        if (!res.ok) {
          if (retryCount < 2) setTimeout(() => fetchActionTasks(retryCount + 1), 600);
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (seq !== taskFetchSeqRef.current) return;
        if (Array.isArray(data) && data.length > 0) {
          setActionTasks(() => {
            const reconciled = data.map((serverTask) => {
              const recent = recentTaskUpdatesRef.current.get(serverTask.id);
              if (recent && Date.now() - recent.timestamp < 15000) {
                if (toLocalDateKey(serverTask.dueDate) !== recent.dateKey) {
                  return { ...serverTask, dueDate: recent.dateKey };
                } else {
                  recentTaskUpdatesRef.current.delete(serverTask.id);
                }
              }
              return serverTask;
            });
            setCachedTasks(reconciled);
            if (typeof window !== 'undefined') {
              try {
                sessionStorage.setItem('trexo_cache_tasks', JSON.stringify(reconciled));
              } catch {}
            }
            return reconciled;
          });
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
    // 1. In browser environments, check element physically under pointer coordinates
    // Immune to scroll desynchronization across auto-scrolling columns
    if (typeof document !== 'undefined' && args.pointerCoordinates) {
      const { x, y } = args.pointerCoordinates;
      const elem = document.elementFromPoint(x, y);
      if (elem) {
        // Direct pool target
        const poolEl = elem.closest('#pool, [data-droppable-id="pool"]');
        if (poolEl) {
          const poolContainer = args.droppableContainers.find((c: any) => c.id === 'pool');
          if (poolContainer) return [{ id: 'pool', data: poolContainer.data }];
        }

        // Direct date target (column or cell)
        const dayEl = elem.closest('[data-droppable-id], [data-date]');
        if (dayEl) {
          const droppableId = dayEl.getAttribute('data-droppable-id');
          const dateKey = dayEl.getAttribute('data-date');

          if (droppableId) {
            const container = args.droppableContainers.find((c: any) => c.id === droppableId);
            if (container) return [{ id: container.id, data: container.data }];
          }
          if (dateKey) {
            const container = args.droppableContainers.find(
              (c: any) => c.data?.current?.date === dateKey || String(c.id).endsWith(dateKey)
            );
            if (container) return [{ id: container.id, data: container.data }];
          }
        }
      }

      // If between borders, check live bounding rectangles of droppable containers
      for (const container of args.droppableContainers) {
        const node = container.node?.current;
        if (!node) continue;
        const rect = node.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue; // ignore hidden elements (e.g. mobile vs desktop)
        if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
          return [{ id: container.id, data: container.data }];
        }
      }
    }

    // Fallback for headless tests or outside bounds
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) {
      return pointerCollisions;
    }
    const rectCollisions = rectIntersection(args);
    if (rectCollisions.length > 0) {
      return rectCollisions;
    }
    return [];
  };

  const handleDragStart = (event: DragStartEvent) => {
    const activeData = event.active.data.current;
    const activeIdStr = String(event.active.id);

    // Identify strictly by entityType or type in data, or specific prefix pattern
    const isTask =
      activeData?.entityType === 'task' ||
      activeData?.type === 'task' ||
      activeData?.task !== undefined ||
      /^(?:(?:desktop|mobile|agenda|week|threeday)-)?task-/.test(activeIdStr);

    if (isTask) {
      const rawTaskId =
        activeData?.task?.id ||
        activeData?.id ||
        activeIdStr.replace(/^(?:desktop|mobile|agenda|week|threeday)-task-/, '').replace(/^task-/, '');
      const task = actionTasks.find((t) => t.id === rawTaskId) || activeData?.task;
      if (task) {
        setActiveDragItem({
          ...task,
          id: task.id,
          __isTask: true,
        });
      }
    } else {
      const rawContentId =
        activeData?.item?.id ||
        activeData?.id ||
        activeIdStr.replace(/^(?:desktop|mobile|agenda|week|threeday)-content-/, '').replace(/^content-/, '');
      const item = contentItems.find((i) => i.id === rawContentId) || activeData?.item;
      if (item) {
        setActiveDragItem({
          ...item,
          id: item.id,
          __isTask: false,
        });
      }
    }
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(40);
      } catch {}
    }
  };

  const handleRescheduleContent = async (itemId: string, newDateKey: string | null) => {
    if (!canEditCalendar) {
      setToastError('You do not have permission to edit or reschedule calendar deliverables.');
      return;
    }
    const activeItem = contentItems.find((i) => i.id === itemId);
    if (!activeItem) {
      console.warn(`Content item ${itemId} not found in contentItems`);
      return;
    }

    const currentKey = activeItem.scheduledDate ? toLocalDateKey(activeItem.scheduledDate) : null;
    if (currentKey === newDateKey) {
      return;
    }

    const previousScheduledDate = activeItem.scheduledDate;
    const previousStatus = activeItem.status;

    const nextStatus = newDateKey === null
      ? 'PLANNED'
      : activeItem.status === 'PLANNED'
      ? 'SCHEDULED'
      : (activeItem.status || 'SCHEDULED');

    // Register active recent update to prevent background refetches from overwriting with stale data
    recentContentUpdatesRef.current.set(itemId, {
      dateKey: newDateKey,
      status: nextStatus,
      timestamp: Date.now(),
    });

    // Single-record isolated optimistic update
    setContentItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, scheduledDate: newDateKey, status: nextStatus }
          : item
      )
    );

    try {
      const res = await fetch('/api/content', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
        body: JSON.stringify({
          id: itemId,
          scheduledDate: newDateKey,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        recentContentUpdatesRef.current.delete(itemId);
        // Roll back ONLY the affected item without affecting neighbors
        setContentItems((prev) =>
          prev.map((item) =>
            item.id === itemId
              ? { ...item, scheduledDate: previousScheduledDate, status: previousStatus }
              : item
          )
        );
        setToastError(errData.error || `Failed to reschedule item (${res.status})`);
        return;
      }

      const updatedItem = await res.json();
      setContentItems((prev) => {
        const next = prev.map((item) => (item.id === itemId ? { ...item, ...updatedItem } : item));
        setCachedContent(next);
        if (typeof window !== 'undefined') {
          try {
            sessionStorage.setItem('trexo_cache_content', JSON.stringify(next));
          } catch {}
        }
        return next;
      });

      // Broadcast to other tabs without self-refetching
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        try {
          const syncChan = new BroadcastChannel('trexobyte_realtime_sync');
          syncChan.postMessage({ type: 'REFRESH', timestamp: Date.now() });
          syncChan.close();
        } catch {}
      }
    } catch (err: any) {
      console.error('Reschedule API error:', err);
      recentContentUpdatesRef.current.delete(itemId);
      // Roll back ONLY the affected item
      setContentItems((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? { ...item, scheduledDate: previousScheduledDate, status: previousStatus }
            : item
        )
      );
      setToastError(err?.message || 'Failed to reschedule item');
    }
  };

  const handleRescheduleTask = async (taskId: string, newDateKey: string) => {
    if (!canEditCalendar) {
      setToastError('You do not have permission to reschedule calendar tasks.');
      return;
    }
    const existingTask = actionTasks.find((t) => t.id === taskId);
    if (!existingTask) {
      console.warn(`Task ${taskId} not found in actionTasks`);
      return;
    }

    const currentKey = existingTask.dueDate ? toLocalDateKey(existingTask.dueDate) : null;
    if (currentKey === newDateKey) {
      return;
    }

    const previousDueDate = existingTask.dueDate;

    // Register active recent update to prevent background refetches from overwriting with stale data
    recentTaskUpdatesRef.current.set(taskId, {
      dateKey: newDateKey,
      timestamp: Date.now(),
    });

    // Single-record isolated optimistic update
    setActionTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, dueDate: newDateKey }
          : t
      )
    );

    try {
      const res = await fetch('/api/tasks', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
        body: JSON.stringify({
          id: taskId,
          dueDate: newDateKey,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        recentTaskUpdatesRef.current.delete(taskId);
        // Roll back ONLY the affected task without affecting neighbors
        setActionTasks((prev) =>
          prev.map((t) =>
            t.id === taskId
              ? { ...t, dueDate: previousDueDate }
              : t
          )
        );
        setToastError(errData.error || `Failed to reschedule task (${res.status})`);
        return;
      }

      const updatedTask = await res.json();
      setActionTasks((prev) => {
        const next = prev.map((t) => (t.id === taskId ? { ...t, ...updatedTask } : t));
        setCachedTasks(next);
        if (typeof window !== 'undefined') {
          try {
            sessionStorage.setItem('trexo_cache_tasks', JSON.stringify(next));
          } catch {}
        }
        return next;
      });

      // Broadcast to other tabs without self-refetching
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        try {
          const syncChan = new BroadcastChannel('trexobyte_realtime_sync');
          syncChan.postMessage({ type: 'REFRESH', timestamp: Date.now() });
          syncChan.close();
        } catch {}
      }
    } catch (err: any) {
      console.error('Task reschedule API error:', err);
      recentTaskUpdatesRef.current.delete(taskId);
      // Roll back ONLY the affected task
      setActionTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? { ...t, dueDate: previousDueDate }
            : t
        )
      );
      setToastError(err?.message || 'Failed to reschedule task');
    }
  };

  const extractTargetDateKey = (over: any): string | null => {
    if (!over) return null;
    const targetId = String(over.id);
    const targetData = over.data?.current;

    // Direct date field on data
    if (targetData?.date) {
      return toLocalDateKey(targetData.date);
    }
    // Dropped on a day cell or column
    if (targetData?.type === 'day' && targetData.date) {
      return toLocalDateKey(targetData.date);
    }
    // Dropped directly on another task card
    if (targetData?.type === 'task' && targetData.task?.dueDate) {
      return toLocalDateKey(targetData.task.dueDate);
    }
    // Dropped directly on another content deliverable card
    if ((targetData?.type === 'card' || targetData?.type === 'content') && targetData.item?.scheduledDate) {
      return toLocalDateKey(targetData.item.scheduledDate);
    }
    // Match YYYY-MM-DD pattern in targetId (e.g., 'week-day-2026-10-25', 'mobile-day-2026-10-25', '2026-10-25')
    const match = targetId.match(/\b\d{4}-\d{2}-\d{2}\b/);
    if (match) {
      return match[0];
    }
    return null;
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

    const targetId = String(over.id);
    const targetData = over.data?.current;
    const activeData = active.data?.current;
    const activeIdStr = String(active.id);

    const isPoolTarget =
      targetId === 'pool' ||
      targetId === 'unscheduled-pool' ||
      targetData?.type === 'pool' ||
      ((targetData?.type === 'card' || targetData?.type === 'content') && !targetData?.item?.scheduledDate);

    const targetDateKey = extractTargetDateKey(over);

    // Identify strictly whether the dragged item is a Task or a Content Deliverable
    const isTask =
      activeData?.entityType === 'task' ||
      activeData?.type === 'task' ||
      activeData?.task !== undefined ||
      /^(?:(?:desktop|mobile|agenda|week|threeday)-)?task-/.test(activeIdStr);

    // Case A: Action Tasks
    if (isTask) {
      const rawTaskId =
        activeData?.task?.id ||
        activeData?.id ||
        activeIdStr.replace(/^(?:desktop|mobile|agenda|week|threeday)-task-/, '').replace(/^task-/, '');

      if (isPoolTarget) {
        setToastError('Tasks require a due date and cannot be unscheduled to the unassigned pool.');
        return;
      }

      if (!targetDateKey) return;
      await handleRescheduleTask(rawTaskId, targetDateKey);
      return;
    }

    // Case B: Content Items & Deliverables
    const rawContentId =
      activeData?.item?.id ||
      activeData?.id ||
      activeIdStr.replace(/^(?:desktop|mobile|agenda|week|threeday)-content-/, '').replace(/^content-/, '');

    if (isPoolTarget) {
      await handleRescheduleContent(rawContentId, null);
      return;
    }

    if (!targetDateKey) return;
    await handleRescheduleContent(rawContentId, targetDateKey);
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
            measuring={{
              droppable: {
                strategy: MeasuringStrategy.Always,
              },
            }}
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
                onRescheduleContent={handleRescheduleContent}
                onRescheduleTask={handleRescheduleTask}
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
                activeDragItem.__isTask ? (
                  <div
                    className="rounded px-2.5 py-1.5 text-[10px] font-bold text-white shadow-2xl border-2 border-white/60 flex items-center justify-between gap-2 select-none pointer-events-none opacity-95 scale-105 min-w-[140px]"
                    style={{
                      backgroundColor:
                        activeDragItem.urgency === 'URGENT'
                          ? '#FF3B00'
                          : activeDragItem.client?.color || '#3B82F6',
                    }}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="truncate">{activeDragItem.title}</span>
                    </div>
                    <span className="text-[8px] uppercase px-1 rounded-xs bg-black/40 font-mono shrink-0">
                      {activeDragItem.urgency}
                    </span>
                  </div>
                ) : (
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
                )
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
