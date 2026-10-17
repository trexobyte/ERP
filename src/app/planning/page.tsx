'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useImpersonation } from '@/components/providers';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  isSameDay,
  addMonths,
  subMonths,
} from 'date-fns';
import {
  DndContext,
  closestCenter,
  pointerWithin,
  rectIntersection,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  Calendar as CalendarIcon,
  Wand2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Copy,
  Check,
  Filter,
  User,
  Eye,
  EyeOff,
  Video,
  Camera,
  Image as ImageIcon,
  Sparkles,
  GripVertical,
  X,
  CheckSquare,
} from 'lucide-react';
import {
  toLocalDateKey,
  parseLocalDateKey,
  getTodayLocalDateKey,
  toDatabaseDateString,
} from '@/lib/date-utils';

function DroppablePoolArea({
  items,
  onItemClick,
  isDragInProgress,
}: {
  items: any[];
  onItemClick: (item: any) => void;
  isDragInProgress?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'pool',
    data: { type: 'pool' },
  });

  return (
    <div
      ref={setNodeRef}
      id="pool"
      className={`p-4 rounded-xl border transition-all min-h-[140px] flex flex-col justify-between ${
        isOver
          ? 'border-[#FF3B00] bg-[#FF3B00]/15 ring-2 ring-[#FF3B00] shadow-lg'
          : 'border-border bg-card shadow-xs'
      }`}
    >
      <div className="flex items-center justify-between mb-3 pointer-events-none">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[#FF3B00]" />
          <h3 className="font-extrabold text-sm text-foreground">Planned List & Unscheduled Pool</h3>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#FF3B00]/10 text-[#FF3B00] border border-[#FF3B00]/20">
            {items.length} Planned Tasks
          </span>
        </div>
        <p className="text-[11px] font-mono text-muted-foreground hidden sm:block">
          ⚡ Drag items into calendar days to schedule, or drag back here to unschedule
        </p>
      </div>

      {items.length === 0 ? (
        <div className="py-6 flex-1 flex items-center justify-center text-center text-xs font-mono text-muted-foreground/60 border border-dashed border-border rounded-lg bg-muted/20 pointer-events-none select-none">
          Planned pool is currently empty. Drag scheduled items here from the calendar to unschedule them!
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 max-h-48 overflow-y-auto p-1">
          {items.map((item) => (
            <DraggableContentCard
              key={item.id}
              item={item}
              onClick={() => onItemClick(item)}
              isDragInProgress={isDragInProgress}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DroppableDayCell({
  day,
  dateKey,
  isCurrentDay,
  isCurrentMonth,
  onQuickAdd,
  children,
}: {
  day: Date;
  dateKey: string;
  isCurrentDay: boolean;
  isCurrentMonth: boolean;
  onQuickAdd: () => void;
  children: React.ReactNode;
}) {
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

function DraggableContentCard({
  item,
  onClick,
  isDragInProgress,
}: {
  item: any;
  onClick: () => void;
  isDragInProgress?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: item.id,
    data: { type: 'card', item },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`rounded-lg px-2 py-1 text-[10px] font-semibold text-white shadow-xs cursor-grab active:cursor-grabbing hover:brightness-110 border border-black/20 group/card w-full flex flex-col gap-0.5 select-none transition-opacity ${
        isDragging ? 'opacity-20 scale-95' : 'opacity-100'
      } ${isDragInProgress && !isDragging ? 'pointer-events-none' : ''}`}
      style={{
        backgroundColor: item.isPersonal ? '#8B5CF6' : (item.client?.color || '#FF3B00'),
      }}
    >
      <div className="flex items-center justify-between gap-1 pointer-events-none w-full">
        <div className="flex items-center gap-1 min-w-0 flex-1">
          <GripVertical className="h-3 w-3 opacity-60 group-hover/card:opacity-100 shrink-0" />
          <span className="font-extrabold truncate leading-tight">
            {item.isPersonal ? `🔒 ${item.title}` : item.title}
          </span>
        </div>
        <span className="text-[8px] uppercase px-1 rounded-sm bg-black/30 font-mono shrink-0 leading-tight">
          {item.isPersonal ? 'PERSONAL' : item.type}
        </span>
      </div>
      {item.assignee && (
        <span className="block text-[8.5px] text-white/85 font-mono truncate pointer-events-none pl-4 leading-none">
          {item.assignee.name}
        </span>
      )}
    </div>
  );
}

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

  // Calendar State - always opens in current month
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
  const [editTitle, setEditTitle] = useState('');
  const [editIsPersonal, setEditIsPersonal] = useState(false);
  const [editType, setEditType] = useState('REEL');
  const [editPlatform, setEditPlatform] = useState('INSTAGRAM');
  const [editStatus, setEditStatus] = useState('PLANNED');
  const [editScheduledDate, setEditScheduledDate] = useState('');
  const [editAssigneeId, setEditAssigneeId] = useState('');
  const [editClientId, setEditClientId] = useState('');
  const [editClientFeedbackNotes, setEditClientFeedbackNotes] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingEdit, setDeletingEdit] = useState(false);
  const [toastError, setToastError] = useState<string | null>(null);

  useEffect(() => {
    if (toastError) {
      const timer = setTimeout(() => setToastError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toastError]);

  useEffect(() => {
    if (selectedItem) {
      setEditTitle(selectedItem.title || '');
      setEditIsPersonal(Boolean(selectedItem.isPersonal));
      setEditType(selectedItem.type || 'REEL');
      setEditPlatform(selectedItem.platform || 'INSTAGRAM');
      setEditStatus(selectedItem.status || 'PLANNED');
      setEditScheduledDate(
        selectedItem.scheduledDate
          ? toLocalDateKey(selectedItem.scheduledDate)
          : ''
      );
      setEditAssigneeId(selectedItem.assigneeId || selectedItem.assignee?.id || '');
      setEditClientId(selectedItem.clientId || selectedItem.client?.id || '');
      setEditClientFeedbackNotes(selectedItem.clientFeedbackNotes || '');
    }
  }, [selectedItem]);

  const handleSaveItemEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    setSavingEdit(true);
    try {
      const res = await fetch('/api/content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedItem.id,
          title: editTitle,
          type: editIsPersonal ? 'PERSONAL' : editType,
          platform: editIsPersonal ? 'PERSONAL' : editPlatform,
          status: editStatus,
          scheduledDate: editScheduledDate || null,
          assigneeId: editAssigneeId || null,
          clientId: editIsPersonal ? null : (editClientId || null),
          isPersonal: editIsPersonal,
          clientFeedbackNotes: editClientFeedbackNotes,
        }),
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

  const handleDeleteItem = async () => {
    if (!selectedItem) return;
    if (!confirm(`Are you sure you want to delete "${selectedItem.title}"?`)) return;
    setDeletingEdit(true);
    try {
      const res = await fetch(`/api/content?id=${selectedItem.id}`, {
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

  // Planning Wizard State
  const currentMonthStr = format(new Date(), 'yyyy-MM');
  const [wizardClientId, setWizardClientId] = useState('');
  const [wizardMonth, setWizardMonth] = useState(currentMonthStr);
  const [wizardRows, setWizardRows] = useState<
    {
      type: string;
      platform: string;
      title: string;
      scheduledDate: string;
      assigneeId: string;
      status: string;
    }[]
  >([
    {
      type: 'REEL',
      platform: 'INSTAGRAM',
      title: 'Monthly Spotlight Reel',
      scheduledDate: `${currentMonthStr}-05`,
      assigneeId: '',
      status: 'PLANNED',
    },
    {
      type: 'CAROUSEL',
      platform: 'INSTAGRAM',
      title: 'Top Highlights Carousel',
      scheduledDate: `${currentMonthStr}-12`,
      assigneeId: '',
      status: 'PLANNED',
    },
    {
      type: 'SHOOT',
      platform: 'INSTAGRAM',
      title: 'On-Location Shoot Day',
      scheduledDate: `${currentMonthStr}-18`,
      assigneeId: '',
      status: 'PLANNED',
    },
  ]);
  const [wizardSaving, setWizardSaving] = useState(false);

  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // ESC Key Listener for Item Detail Modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedItem) {
        setSelectedItem(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedItem]);

  useEffect(() => {
    if (cachedClients && cachedClients.length > 0 && clients.length === 0) {
      setClients(cachedClients);
      if (!wizardClientId) setWizardClientId(cachedClients[0].id);
    }
  }, [cachedClients, clients.length, wizardClientId]);

  useEffect(() => {
    if (cachedUsers && cachedUsers.length > 0 && users.length === 0) {
      setUsers(cachedUsers);
    }
  }, [cachedUsers, users.length]);

  // Fetch clients and users for filter dropdowns only on mount or refreshTrigger
  useEffect(() => {
    fetch('/api/clients', { cache: 'no-store' })
      .then(async (res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setClients(data);
          if (!wizardClientId) setWizardClientId(data[0].id);
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

  // Active drag item for DragOverlay
  const [activeDragItem, setActiveDragItem] = useState<any | null>(null);

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
    // That prevents unwanted snaps to arbitrary cells (like Sep 27/28)
    return [];
  };

  const getItemDateString = (scheduledDate: any) => {
    return toLocalDateKey(scheduledDate);
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

  // Template pre-fill helper
  const applyTemplate = (templateType: string) => {
    const ym = wizardMonth || format(new Date(), 'yyyy-MM');
    if (templateType === 'standard') {
      setWizardRows([
        { type: 'SHOOT', platform: 'INSTAGRAM', title: 'Monthly Shoot Day', scheduledDate: `${ym}-02`, assigneeId: '', status: 'PLANNED' },
        { type: 'REEL', platform: 'INSTAGRAM', title: 'Behind the Scenes Reel 1', scheduledDate: `${ym}-05`, assigneeId: '', status: 'PLANNED' },
        { type: 'CAROUSEL', platform: 'INSTAGRAM', title: 'Product Showcase Carousel', scheduledDate: `${ym}-08`, assigneeId: '', status: 'PLANNED' },
        { type: 'REEL', platform: 'INSTAGRAM', title: 'Trending Sound Reel 2', scheduledDate: `${ym}-12`, assigneeId: '', status: 'PLANNED' },
        { type: 'STATIC_POST', platform: 'FACEBOOK', title: 'Customer Review Graphic', scheduledDate: `${ym}-15`, assigneeId: '', status: 'PLANNED' },
        { type: 'REEL', platform: 'TIKTOK', title: 'Viral Challenge Short', scheduledDate: `${ym}-19`, assigneeId: '', status: 'PLANNED' },
        { type: 'CAROUSEL', platform: 'LINKEDIN', title: 'Industry Insights Carousel', scheduledDate: `${ym}-22`, assigneeId: '', status: 'PLANNED' },
        { type: 'REEL', platform: 'INSTAGRAM', title: 'Offer Promo Reel 4', scheduledDate: `${ym}-26`, assigneeId: '', status: 'PLANNED' },
        { type: 'AD_CREATIVE', platform: 'FACEBOOK', title: 'Monthly Retargeting Ad', scheduledDate: `${ym}-29`, assigneeId: '', status: 'PLANNED' },
      ]);
    } else if (templateType === 'heavy-reels') {
      setWizardRows([
        { type: 'SHOOT', platform: 'INSTAGRAM', title: 'Video Production Day', scheduledDate: `${ym}-03`, assigneeId: '', status: 'PLANNED' },
        { type: 'REEL', platform: 'INSTAGRAM', title: 'Reel 1: High Energy Edit', scheduledDate: `${ym}-06`, assigneeId: '', status: 'PLANNED' },
        { type: 'REEL', platform: 'INSTAGRAM', title: 'Reel 2: Tutorial / How-To', scheduledDate: `${ym}-10`, assigneeId: '', status: 'PLANNED' },
        { type: 'REEL', platform: 'TIKTOK', title: 'Reel 3: Comedy / Relatable', scheduledDate: `${ym}-14`, assigneeId: '', status: 'PLANNED' },
        { type: 'REEL', platform: 'INSTAGRAM', title: 'Reel 4: Client Testimonial', scheduledDate: `${ym}-18`, assigneeId: '', status: 'PLANNED' },
        { type: 'REEL', platform: 'YOUTUBE', title: 'Reel 5: Cinematic Short', scheduledDate: `${ym}-24`, assigneeId: '', status: 'PLANNED' },
      ]);
    }
  };

  const handleWizardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetClientId = wizardClientId || (clients.length > 0 ? clients[0].id : '');
    if (!targetClientId) {
      alert('Please select or create an Agency Client Account first.');
      return;
    }
    if (wizardRows.length === 0) {
      alert('Please add at least one deliverable row.');
      return;
    }
    setWizardSaving(true);

    try {
      const res = await fetch('/api/content/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: targetClientId,
          items: wizardRows,
        }),
      });

      if (res.ok) {
        setWizardSaving(false);
        setActiveTab('calendar');
        triggerRefresh();
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(errorData.error || 'Failed to bulk create content items.');
        setWizardSaving(false);
      }
    } catch (err: any) {
      console.error('Wizard save failed:', err);
      alert(err?.message || 'Wizard save failed.');
      setWizardSaving(false);
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
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              activeTab === 'calendar'
                ? 'bg-[#FF3B00] text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <CalendarIcon className="h-4 w-4" /> Calendar View
          </button>
          <button
            onClick={() => setActiveTab('wizard')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
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
          {/* Calendar Bar & Legend */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-card p-4 rounded-xl border border-border">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  className="rounded-md border border-border p-1.5 text-foreground hover:bg-muted"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  className="rounded-md border border-border p-1.5 text-foreground hover:bg-muted"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <h2 className="text-lg font-black tracking-tight text-foreground uppercase">
                {format(currentMonth, 'MMMM yyyy')}
              </h2>
              <button
                onClick={() => setCurrentMonth(new Date())}
                className="text-xs font-mono text-[#FF3B00] hover:underline ml-2"
              >
                Today
              </button>
            </div>

            {/* Quick Toggles */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-mono text-muted-foreground bg-[#FF3B00]/10 text-[#FF3B00] px-2.5 py-1 rounded border border-[#FF3B00]/20 font-semibold flex items-center gap-1">
                ⚡ Drag & Drop to Reschedule
              </span>

              <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={myItemsOnly}
                  onChange={(e) => setMyItemsOnly(e.target.checked)}
                  className="rounded border-input text-[#FF3B00] focus:ring-[#FF3B00]"
                />
                <User className="h-3.5 w-3.5 text-[#FF3B00]" /> My Items Only
              </label>

              <button
                onClick={() => openQuickAdd('content')}
                className="flex items-center gap-1.5 rounded-md bg-[#FF3B00] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#e03400] transition-all clicky-btn"
                title="Add a Content Post/Deliverable"
              >
                <Plus className="h-4 w-4 stroke-[3]" /> Add Content
              </button>
            </div>
          </div>

          {/* Client Legend Toggle */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/40 p-3 rounded-lg border border-border/60">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-mono text-muted-foreground uppercase font-bold mr-2">
                Toggle Client Legend:
              </span>
              {clients.map((c) => {
                const isHidden = hiddenClients.includes(c.id);
                return (
                  <button
                    key={c.id}
                    onClick={() => toggleHideClient(c.id)}
                    className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-all border ${
                      isHidden
                        ? 'bg-transparent text-muted-foreground border-border line-through opacity-50'
                        : 'bg-card text-foreground border-border shadow-2xs'
                    }`}
                  >
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                    <span>{c.name}</span>
                    {isHidden ? (
                      <EyeOff className="h-3 w-3 text-muted-foreground" />
                    ) : (
                      <Eye className="h-3 w-3 text-[#FF3B00]" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-1.5 shrink-0 border-l border-border/60 pl-3">
              <button
                type="button"
                onClick={selectAllClients}
                className="px-2.5 py-1 rounded-md text-xs font-bold bg-[#FF3B00]/10 text-[#FF3B00] hover:bg-[#FF3B00] hover:text-white transition-all border border-[#FF3B00]/30 flex items-center gap-1 clicky-btn"
                title="Show all clients on calendar"
              >
                <Eye className="h-3.5 w-3.5" /> Select All
              </button>
              <button
                type="button"
                onClick={unselectAllClients}
                className="px-2.5 py-1 rounded-md text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-all border border-border flex items-center gap-1 clicky-btn"
                title="Hide all clients on calendar"
              >
                <EyeOff className="h-3.5 w-3.5" /> Unselect All
              </button>
            </div>
          </div>

          {/* Month Calendar Grid with DnD Context */}
          <DndContext
            sensors={sensors}
            collisionDetection={customCollisionDetection}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            {/* Planned List & Unscheduled Pool Drop Zone */}
            <DroppablePoolArea
              items={filteredContent.filter(
                (item) => !item.scheduledDate
              )}
              onItemClick={setSelectedItem}
              isDragInProgress={Boolean(activeDragItem)}
            />

            <div className="overflow-x-auto rounded-xl border border-border shadow-sm scrollbar-thin">
              <div className="grid grid-cols-7 gap-px bg-border min-w-[700px]">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                  <div key={d} className="bg-muted p-2 text-center text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {d}
                  </div>
                ))}

                {daysInCalendar.map((day) => {
                  const dateKey = toLocalDateKey(day);
                  const isCurrentMonth = isSameMonth(day, currentMonth);
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
                      (!selectedClientFilter || task.clientId === selectedClientFilter || task.client?.id === selectedClientFilter) &&
                      (!task.clientId || !hiddenClients.includes(task.clientId))
                  );

                  const isCurrentDay = isToday(day);

                  return (
                    <DroppableDayCell
                      key={dateKey}
                      day={day}
                      dateKey={dateKey}
                      isCurrentDay={isCurrentDay}
                      isCurrentMonth={isCurrentMonth}
                      onQuickAdd={() => openQuickAdd('content', dateKey)}
                    >
                      {/* Scheduled Content Items */}
                      {dayItems.map((item) => (
                        <DraggableContentCard
                          key={item.id}
                          item={item}
                          onClick={() => setSelectedItem(item)}
                          isDragInProgress={Boolean(activeDragItem)}
                        />
                      ))}

                      {/* Action Tasks Due On This Date */}
                      {dayTasks.map((task) => (
                        <div
                          key={task.id}
                          className="group/task flex items-center justify-between gap-1 rounded px-1.5 py-0.5 text-[9.5px] font-semibold transition-all cursor-pointer shadow-2xs hover:scale-102 select-none"
                          style={{
                            backgroundColor: task.urgency === 'URGENT' ? '#FF3B00' : (task.client?.color || '#3B82F6'),
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

            <DragOverlay dropAnimation={null}>
              {activeDragItem ? (
                <div
                  className="rounded-lg px-2 py-0.5 text-[10px] font-semibold text-white shadow-2xl ring-2 ring-white scale-105 pointer-events-none w-fit max-w-full flex flex-col gap-0.5 cursor-grabbing"
                  style={{ backgroundColor: activeDragItem.isPersonal ? '#8B5CF6' : (activeDragItem.client?.color || '#FF3B00') }}
                >
                  <div className="flex items-center gap-1 max-w-full">
                    <GripVertical className="h-2.5 w-2.5 opacity-80 shrink-0" />
                    <span className="font-extrabold truncate max-w-[120px] leading-tight">
                      {activeDragItem.isPersonal ? `🔒 ${activeDragItem.title}` : activeDragItem.title}
                    </span>
                    <span className="text-[8px] uppercase px-1 rounded-sm bg-black/30 font-mono shrink-0 leading-tight">
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

      {/* VIEW B: PLANNING WIZARD (BULK FAST CREATION) */}
      {activeTab === 'wizard' && (
        <div className="space-y-6 bg-card p-6 rounded-xl border border-border shadow-md">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-4">
            <div>
              <h2 className="text-lg font-black tracking-tight text-foreground flex items-center gap-2">
                FAST MONTHLY CONTENT PLANNER <Wand2 className="h-5 w-5 text-[#FF3B00]" />
              </h2>
              <p className="text-xs text-muted-foreground font-mono">
                Build out a client's full month shoot & post deliverable plan in one sitting.
              </p>
            </div>

            {/* Template Presets */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-muted-foreground">Load Template:</span>
              <button
                onClick={() => applyTemplate('standard')}
                className="px-2.5 py-1 text-xs font-semibold rounded bg-muted hover:bg-muted/80 text-foreground border border-border"
              >
                Standard (8 posts + 1 shoot)
              </button>
              <button
                onClick={() => applyTemplate('heavy-reels')}
                className="px-2.5 py-1 text-xs font-semibold rounded bg-muted hover:bg-muted/80 text-foreground border border-border"
              >
                Reel Focus (5 reels + shoot)
              </button>
            </div>
          </div>

          <form onSubmit={handleWizardSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Target Client Account *
                </label>
                <select
                  value={wizardClientId}
                  onChange={(e) => setWizardClientId(e.target.value)}
                  required
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-[#FF3B00] outline-hidden"
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.packageTier})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Planning Month
                </label>
                <input
                  type="month"
                  value={wizardMonth}
                  onChange={(e) => setWizardMonth(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-[#FF3B00] outline-hidden"
                />
              </div>
            </div>

            {/* Fast Table Matrix */}
            <div className="border border-border rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted text-muted-foreground uppercase text-[10px] font-mono border-b border-border">
                  <tr>
                    <th className="p-3">#</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Platform</th>
                    <th className="p-3">Working Title</th>
                    <th className="p-3">Target Date</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Assignee</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {wizardRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-muted/30">
                      <td className="p-3 font-mono font-bold text-muted-foreground">{idx + 1}</td>
                      <td className="p-3">
                        <select
                          value={row.type}
                          onChange={(e) => {
                            const next = [...wizardRows];
                            next[idx].type = e.target.value;
                            setWizardRows(next);
                          }}
                          className="rounded border border-input bg-background px-2 py-1 text-xs outline-hidden"
                        >
                          <option value="REEL">Reel / Short</option>
                          <option value="CAROUSEL">Carousel</option>
                          <option value="STATIC_POST">Static Post</option>
                          <option value="SHOOT">Shoot Day</option>
                          <option value="STORY">Story Series</option>
                          <option value="AD_CREATIVE">Ad Creative</option>
                        </select>
                      </td>
                      <td className="p-3">
                        <select
                          value={row.platform}
                          onChange={(e) => {
                            const next = [...wizardRows];
                            next[idx].platform = e.target.value;
                            setWizardRows(next);
                          }}
                          className="rounded border border-input bg-background px-2 py-1 text-xs outline-hidden"
                        >
                          <option value="INSTAGRAM">Instagram</option>
                          <option value="FACEBOOK">Facebook</option>
                          <option value="TIKTOK">TikTok</option>
                          <option value="YOUTUBE">YouTube</option>
                          <option value="LINKEDIN">LinkedIn</option>
                        </select>
                      </td>
                      <td className="p-3">
                        <input
                          type="text"
                          value={row.title}
                          onChange={(e) => {
                            const next = [...wizardRows];
                            next[idx].title = e.target.value;
                            setWizardRows(next);
                          }}
                          required
                          placeholder="Title / Concept"
                          className="w-full rounded border border-input bg-background px-2 py-1 text-xs outline-hidden focus:border-[#FF3B00]"
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="date"
                          value={row.scheduledDate}
                          onChange={(e) => {
                            const next = [...wizardRows];
                            next[idx].scheduledDate = e.target.value;
                            setWizardRows(next);
                          }}
                          required
                          className="rounded border border-input bg-background px-2 py-1 text-xs outline-hidden focus:border-[#FF3B00]"
                        />
                      </td>
                      <td className="p-3">
                        <select
                          value={row.status || 'PLANNED'}
                          onChange={(e) => {
                            const next = [...wizardRows];
                            next[idx].status = e.target.value;
                            setWizardRows(next);
                          }}
                          className="rounded border border-input bg-background px-2 py-1 text-xs outline-hidden font-bold text-[#FF3B00]"
                        >
                          <option value="PLANNED">1. Planned</option>
                          <option value="SHOT">2. Shot</option>
                          <option value="EDITED">3. Edited</option>
                          <option value="CLIENT_APPROVAL">4. Client Approval</option>
                          <option value="SCHEDULED">5. Scheduled</option>
                          <option value="PUBLISHED">6. Published</option>
                        </select>
                      </td>
                      <td className="p-3">
                        <select
                          value={row.assigneeId}
                          onChange={(e) => {
                            const next = [...wizardRows];
                            next[idx].assigneeId = e.target.value;
                            setWizardRows(next);
                          }}
                          className="rounded border border-input bg-background px-2 py-1 text-xs outline-hidden"
                        >
                          <option value="">Unassigned</option>
                          {users.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-3 text-right space-x-1">
                        <button
                          type="button"
                          onClick={() => {
                            const next = [...wizardRows];
                            next.splice(idx + 1, 0, { ...row, title: `${row.title} (Copy)`, status: row.status || 'PLANNED' });
                            setWizardRows(next);
                          }}
                          className="p-1 rounded text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                          title="Duplicate Row"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const next = wizardRows.filter((_, i) => i !== idx);
                            setWizardRows(next);
                          }}
                          className="p-1 rounded text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                          title="Delete Row"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() =>
                  setWizardRows([
                    ...wizardRows,
                    {
                      type: 'REEL',
                      platform: 'INSTAGRAM',
                      title: '',
                      scheduledDate: getTodayLocalDateKey(),
                      assigneeId: '',
                      status: 'PLANNED',
                    },
                  ])
                }
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-md border border-input bg-background text-xs font-semibold hover:bg-muted cursor-pointer"
              >
                <Plus className="h-4 w-4 text-[#FF3B00]" /> Add New Deliverable Row
              </button>

              <button
                type="submit"
                disabled={wizardSaving}
                className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-md bg-[#FF3B00] text-white font-bold text-xs hover:bg-[#e03400] transition-all shadow-md clicky-btn cursor-pointer"
              >
                {wizardSaving ? 'Bulk Generating Content...' : `Save ${wizardRows.length} Items to Calendar`}
                <Check className="h-4 w-4" />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Item Edit Modal */}
      {selectedItem && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedItem(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-200"
        >
          <div className="w-full max-w-xl bg-card border-2 border-border shadow-2xl rounded-xl p-5 sm:p-6 space-y-4 max-h-[92vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-border pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <span
                  className="px-2.5 py-0.5 rounded text-[10px] font-bold text-white uppercase"
                  style={{
                    backgroundColor: editIsPersonal
                      ? '#8B5CF6'
                      : (clients.find((c) => c.id === editClientId)?.color || '#FF3B00'),
                  }}
                >
                  {editIsPersonal
                    ? '🔒 Personal Item'
                    : (clients.find((c) => c.id === editClientId)?.name || selectedItem.client?.name || 'Client')}
                </span>
                <h3 className="font-extrabold text-base text-foreground">
                  {editIsPersonal ? 'Edit Personal Calendar Item' : 'Edit Content Deliverable'}
                </h3>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="p-1 rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                title="Close (Esc)"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItemEdit} className="flex-1 overflow-y-auto space-y-4 text-xs pr-1 flex flex-col">
              <div className="space-y-4 flex-1">
              <div>
                <label className="block font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Deliverable Title *
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-semibold rounded-md border border-input bg-background focus:outline-hidden focus:ring-2 focus:ring-[#FF3B00]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Target Destination / Client *
                  </label>
                  <select
                    value={editIsPersonal ? '__PERSONAL__' : editClientId}
                    onChange={(e) => {
                      if (e.target.value === '__PERSONAL__') {
                        setEditIsPersonal(true);
                        setEditClientId('');
                      } else {
                        setEditIsPersonal(false);
                        setEditClientId(e.target.value);
                      }
                    }}
                    className={`w-full px-3 py-2 rounded-md border bg-background font-medium focus:outline-hidden focus:ring-2 focus:ring-[#FF3B00] ${
                      editIsPersonal ? 'border-purple-500/50 bg-purple-500/5 text-purple-400 font-bold' : 'border-input'
                    }`}
                  >
                    <option value="__PERSONAL__">🔒 Personal (Only in my calendar)</option>
                    <optgroup label="Agency Client Accounts">
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              </div>

              {editIsPersonal ? (
                <div className="space-y-4 rounded-lg bg-purple-500/10 border border-purple-500/30 p-3.5">
                  <div className="text-xs text-purple-300 font-semibold flex items-center gap-1.5">
                    <span>🔒 Personal / Private Item</span>
                    <span className="text-[10px] font-mono text-purple-300/80">(Only visible in your personal calendar view)</span>
                  </div>
                  <div>
                    <label className="block font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                      Target Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={editScheduledDate}
                      onChange={(e) => setEditScheduledDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-md border border-input bg-background font-medium focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                      Personal Notes / Description <span className="text-[10px] font-mono lowercase text-muted-foreground">(optional)</span>
                    </label>
                    <textarea
                      rows={3}
                      value={editClientFeedbackNotes}
                      onChange={(e) => setEditClientFeedbackNotes(e.target.value)}
                      placeholder="Add private notes, reminders, or details..."
                      className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground font-medium focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                        Assigned Lead
                      </label>
                      <select
                        value={editAssigneeId}
                        onChange={(e) => setEditAssigneeId(e.target.value)}
                        className="w-full px-3 py-2 rounded-md border border-input bg-background font-medium focus:outline-hidden focus:ring-2 focus:ring-[#FF3B00]"
                      >
                        <option value="">Unassigned</option>
                        {users.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name} ({u.department})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                        Format / Content Type
                      </label>
                      <select
                        value={editType}
                        onChange={(e) => setEditType(e.target.value)}
                        className="w-full px-3 py-2 rounded-md border border-input bg-background font-medium focus:outline-hidden focus:ring-2 focus:ring-[#FF3B00]"
                      >
                        <option value="REEL">REEL</option>
                        <option value="CAROUSEL">CAROUSEL</option>
                        <option value="SHOOT">SHOOT</option>
                        <option value="GRAPHIC">GRAPHIC</option>
                        <option value="STORY">STORY</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                        Platform
                      </label>
                      <select
                        value={editPlatform}
                        onChange={(e) => setEditPlatform(e.target.value)}
                        className="w-full px-3 py-2 rounded-md border border-input bg-background font-medium focus:outline-hidden focus:ring-2 focus:ring-[#FF3B00]"
                      >
                        <option value="INSTAGRAM">INSTAGRAM</option>
                        <option value="TIKTOK">TIKTOK</option>
                        <option value="FACEBOOK">FACEBOOK</option>
                        <option value="YOUTUBE">YOUTUBE</option>
                        <option value="LINKEDIN">LINKEDIN</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                        Deliverable Status
                      </label>
                      <select
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value)}
                        className="w-full px-3 py-2 rounded-md border border-input bg-background font-bold text-[#FF3B00] focus:outline-hidden focus:ring-2 focus:ring-[#FF3B00]"
                      >
                        <option value="PLANNED">PLANNED</option>
                        <option value="IN_PRODUCTION">IN_PRODUCTION</option>
                        <option value="EDITED">EDITED</option>
                        <option value="CLIENT_APPROVAL">CLIENT_APPROVAL</option>
                        <option value="APPROVED">APPROVED</option>
                        <option value="PUBLISHED">PUBLISHED</option>
                      </select>
                    </div>

                    <div className="col-span-2">
                      <label className="block font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                        Scheduled Due Date *
                      </label>
                      <input
                        type="date"
                        required
                        value={editScheduledDate}
                        onChange={(e) => setEditScheduledDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-md border border-input bg-background font-medium focus:outline-hidden focus:ring-2 focus:ring-[#FF3B00]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                      Client Feedback Notes / Brief
                    </label>
                    <textarea
                      rows={3}
                      value={editClientFeedbackNotes}
                      onChange={(e) => setEditClientFeedbackNotes(e.target.value)}
                      placeholder="Enter feedback, caption instructions, or client revisions..."
                      className="w-full px-3 py-2 rounded-md border border-amber-500/40 bg-amber-500/5 focus:outline-hidden focus:ring-2 focus:ring-amber-500 text-foreground font-medium"
                    />
                  </div>
                </>
              )}

              </div>

              <div className="sticky bottom-0 bg-card border-t border-border pt-3 mt-auto shrink-0 flex justify-between items-center">
                <button
                  type="button"
                  onClick={handleDeleteItem}
                  disabled={deletingEdit}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-md text-red-500 hover:bg-red-500/10 font-bold transition-colors cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                  {deletingEdit ? 'Deleting...' : 'Delete Deliverable'}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedItem(null)}
                    className="px-4 py-2 rounded-md font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingEdit}
                    className="flex items-center gap-2 px-5 py-2 rounded-md bg-[#FF3B00] text-white font-bold hover:bg-[#e03400] transition-all shadow-md clicky-btn cursor-pointer"
                  >
                    {savingEdit ? 'Saving...' : 'Save Changes'}
                    <Check className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      {toastError && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg bg-red-600 px-4 py-3 text-sm font-semibold text-white shadow-xl animate-in slide-in-from-bottom-5">
          <span>⚠️ {toastError}</span>
          <button
            type="button"
            onClick={() => setToastError(null)}
            className="ml-2 hover:opacity-80 text-white font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
