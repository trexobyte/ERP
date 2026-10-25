'use client';

import React, { useState, useEffect } from 'react';
import { useImpersonation } from '@/components/providers';
import {
  DndContext,
  closestCenter,
  pointerWithin,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
  DragOverlay,
  MeasuringStrategy,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Kanban,
  Table as TableIcon,
  Filter,
  Download,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  MessageSquare,
  Sparkles,
  User,
  Plus,
  GripVertical,
  Lock,
} from 'lucide-react';
import { hasPermission, hasActionPermission } from '@/lib/permissions';
import { formatLocalDate, getTodayLocalDateKey } from '@/lib/date-utils';
import { useHorizontalAutoScroll } from '@/hooks/use-horizontal-auto-scroll';

function SortableTrackerCard({ item, onStatusChange, columns, canEdit }: { item: any; onStatusChange: (id: string, status: string) => void; columns: {id: string; label: string; color: string}[]; canEdit: boolean }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.id,
    data: { type: 'item', item, status: item.status },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  const formattedType = item.type ? item.type.replace(/_/g, ' ') : '';
  const currentCol = columns.find((c) => c.id === item.status);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-lg border border-border bg-card shadow-2xs hover:border-[#FF3B00] transition-all space-y-1 group select-none min-w-0 ${
        isDragging ? 'opacity-25 scale-95 ring-2 ring-[#FF3B00] z-30 shadow-xl' : 'opacity-100'
      }`}
    >
      {/* Drag handle row — only area that triggers drag */}
      <div
        {...listeners}
        {...attributes}
        className="flex items-center gap-1 px-1.5 pt-1.5 sm:px-2 sm:pt-2 cursor-grab active:cursor-grabbing min-w-0"
      >
        <GripVertical className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-muted-foreground opacity-40 group-hover:opacity-100 shrink-0" />
        {/* Top Tag Row: Client Name on Left, Post Format on Right */}
        <div className="flex items-center justify-between gap-1 min-w-0 flex-1">
          <span
            className="px-1 sm:px-1.5 py-0.5 rounded text-[7.5px] sm:text-[8.5px] font-black text-white uppercase truncate max-w-[55px] sm:max-w-[85px] lg:max-w-[110px] shrink min-w-0 shadow-2xs leading-none"
            style={{ backgroundColor: item.client?.color || '#FF3B00' }}
            title={item.client?.name || 'Client'}
          >
            {item.client?.name || 'Client'}
          </span>
          <span className="text-[7px] sm:text-[7.5px] lg:text-[8px] font-mono font-bold text-muted-foreground uppercase shrink-0 px-1 py-0.5 rounded bg-muted/80 border border-border/40 leading-none">
            {formattedType}
          </span>
        </div>
      </div>

      {/* Card Title */}
      <div className="px-1.5 sm:px-2 min-w-0">
        <h4 className="font-bold text-[10px] sm:text-[10.5px] lg:text-[11px] text-foreground group-hover:text-[#FF3B00] transition-colors leading-tight line-clamp-2 break-words min-w-0 select-none">
          {item.title}
        </h4>
      </div>

      {/* Approval Status Badge */}
      {item.approvalOutcome && (
        <div className="flex items-center gap-1 text-[8px] sm:text-[8.5px] font-bold px-1.5 sm:px-2">
          {item.approvalOutcome === 'APPROVED' && (
            <span className="text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-1 py-0.5 rounded flex items-center gap-1 leading-none text-[8px]">
              <CheckCircle2 className="h-2.5 w-2.5 shrink-0" /> Approved
            </span>
          )}
          {item.approvalOutcome === 'REVISION_REQUESTED' && (
            <span className="text-amber-500 bg-amber-500/10 border border-amber-500/20 px-1 py-0.5 rounded flex items-center gap-1 leading-none text-[8px]">
              <AlertTriangle className="h-2.5 w-2.5 shrink-0" /> Revision
            </span>
          )}
        </div>
      )}

      {/* Client Feedback Note */}
      {item.clientFeedbackNotes && (
        <p className="text-[8px] text-muted-foreground bg-muted/60 border border-border/40 p-1 rounded italic line-clamp-2 break-words leading-tight mx-1.5 sm:mx-2">
          "{item.clientFeedbackNotes}"
        </p>
      )}

      {/* Footer: Date, Assignee & Mobile Stage Selector */}
      <div className="px-1.5 sm:px-2 pb-1.5 sm:pb-2 border-t border-border/40 pt-1 space-y-1">
        <div className="flex items-center justify-between text-[8px] sm:text-[9px] text-muted-foreground font-mono gap-1 min-w-0">
          <span className="truncate">
            {item.scheduledDate ? formatLocalDate(item.scheduledDate) : 'Unscheduled'}
          </span>
          {item.assignee && (
            <span className="font-semibold text-foreground shrink-0 bg-muted/80 px-1 py-0.5 rounded text-[7.5px] sm:text-[8.5px] truncate max-w-[45px] sm:max-w-[65px]">
              {item.assignee.name ? item.assignee.name.split(' ')[0] : 'Team'}
            </span>
          )}
        </div>

        {/* Mobile Quick Stage Mover — visible on touch devices, hidden on desktop hover */}
        {canEdit && (
          <div
            className="block lg:hidden"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <select
              value={item.status}
              onChange={(e) => onStatusChange(item.id, e.target.value)}
              className="w-full rounded border border-border bg-background px-1 sm:px-1.5 py-0.5 text-[8.5px] sm:text-[9.5px] font-bold outline-hidden focus:border-[#FF3B00] cursor-pointer"
              style={{ color: currentCol?.color || '#FF3B00' }}
            >
              {columns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}

function DroppableTrackerColumn({
  col,
  count,
  itemIds,
  children,
}: {
  col: { id: string; label: string; color: string };
  count: number;
  itemIds: string[];
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: col.id,
    data: { type: 'column', status: col.id },
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col rounded-xl border transition-all p-1.5 sm:p-2 md:p-2.5 min-h-[440px] md:min-h-[480px] min-w-0 ${
        isOver
          ? 'border-[#FF3B00] bg-[#FF3B00]/15 ring-2 ring-[#FF3B00] shadow-md scale-[1.01]'
          : 'border-border bg-card/70'
      }`}
    >
      <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-border min-w-0 gap-1">
        <span className="font-extrabold text-[10px] sm:text-[11px] lg:text-xs tracking-tight text-foreground flex items-center gap-1 min-w-0 truncate">
          <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full shrink-0" style={{ backgroundColor: col.color }} />
          <span className="truncate">{col.label}</span>
        </span>
        <span className="text-[8.5px] sm:text-[9.5px] font-mono font-bold bg-muted px-1.5 py-0.5 rounded text-muted-foreground shrink-0">
          {count}
        </span>
      </div>

      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
        <div className="space-y-1.5 sm:space-y-2 flex-1 min-w-0">{children}</div>
      </SortableContext>
    </div>
  );
}

export default function ContentTrackerPage() {
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
  } = useImpersonation();

  const isSuperAdmin = effectiveRoleName === 'Super Admin';
  const canViewTracker = hasPermission(effectivePermissions, 'tracker', 'view') || isSuperAdmin;
  const canCreateTracker = hasActionPermission(effectivePermissions, 'tracker', 'create') || isSuperAdmin;
  const canEditTracker = hasActionPermission(effectivePermissions, 'tracker', 'edit') || isSuperAdmin;
  const canDeleteTracker = hasActionPermission(effectivePermissions, 'tracker', 'delete') || isSuperAdmin;

  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
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
  const [clients, setClients] = useState<any[]>(cachedClients || []);
  const [users, setUsers] = useState<any[]>(cachedUsers || []);
  const [loading, setLoading] = useState(() => !cachedContent || cachedContent.length === 0);
  const [activeDragItem, setActiveDragItem] = useState<any | null>(null);

  // Filters
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [mobileStageFilter, setMobileStageFilter] = useState('ALL');
  // Mobile Kanban column sizing mode: '4col' (default, 4 visible columns), '3col', '1col', 'all'
  const [kanbanColumnMode, setKanbanColumnMode] = useState<'4col' | '3col' | '1col' | 'all'>('4col');

  // Fast edge-triggered horizontal auto-scroll when dragging cards across stages (10x faster)
  const boardContainerRef = useHorizontalAutoScroll<HTMLDivElement>({
    isDragging: Boolean(activeDragItem),
    maxSpeed: 70,
    minSpeed: 16,
  });

  // Drag & drop sensors: MouseSensor for instant desktop drag, TouchSensor with delay to allow smooth page scroll
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

  const customCollisionDetection = (args: any) => {
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) {
      const nonSelf = pointerCollisions.filter((c) => c.id !== args.active.id);
      if (nonSelf.length > 0) return nonSelf;
    }
    return closestCenter(args);
  };

  useEffect(() => {
    if (cachedClients && cachedClients.length > 0) {
      setClients((prev) => (prev.length === 0 ? cachedClients : prev));
    }
  }, [cachedClients]);

  useEffect(() => {
    if (cachedUsers && cachedUsers.length > 0 && users.length === 0) {
      setUsers(cachedUsers);
    }
  }, [cachedUsers, users.length]);

  useEffect(() => {
    if (cachedContent && cachedContent.length > 0) {
      setContentItems((prev) => (prev.length === 0 ? cachedContent : prev));
      setLoading(false);
    }
  }, [cachedContent]);

  // Fetch clients and users for filter dropdowns only on mount or refreshTrigger
  useEffect(() => {
    fetch('/api/clients')
      .then(async (res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setClients(data);
      })
      .catch((err) => console.error('Failed to fetch clients:', err));

    fetch('/api/users')
      .then(async (res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setUsers(data);
      })
      .catch((err) => console.error('Failed to fetch users:', err));
  }, [refreshTrigger]);

  const fetchTrackerData = (retryCount = 0) => {
    if (contentItems.length === 0) setLoading(true);

    const params = new URLSearchParams();
    if (selectedClient) params.append('clientId', selectedClient);
    if (selectedType) params.append('type', selectedType);
    if (selectedStatus) params.append('status', selectedStatus);

    fetch(`/api/content?${params.toString()}`)
      .then(async (res) => {
        if (!res.ok) {
          console.warn('/api/content returned non-ok status:', res.status);
          if (retryCount < 2) {
            setTimeout(() => fetchTrackerData(retryCount + 1), 600);
          }
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data)) {
          const hasFilters = Boolean(selectedClient || selectedType || selectedStatus);
          if (data.length > 0 || hasFilters) {
            let savedOrder: string[] = [];
            if (typeof window !== 'undefined') {
              try {
                const raw = localStorage.getItem('tracker_kanban_order');
                if (raw) savedOrder = JSON.parse(raw);
              } catch {}
            }
            if (savedOrder.length > 0) {
              const orderMap = new Map(savedOrder.map((id, idx) => [id, idx]));
              data.sort((a, b) => {
                const idxA = orderMap.has(a.id) ? orderMap.get(a.id)! : 9999;
                const idxB = orderMap.has(b.id) ? orderMap.get(b.id)! : 9999;
                return idxA - idxB;
              });
            }
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
            setTimeout(() => fetchTrackerData(retryCount + 1), 600);
          }
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch content:', err);
        if (retryCount < 2) {
          setTimeout(() => fetchTrackerData(retryCount + 1), 600);
        } else {
          setLoading(false);
        }
      });
  };

  useEffect(() => {
    fetchTrackerData();
  }, [selectedClient, selectedType, selectedStatus, refreshTrigger]);

  const columns = [
    { id: 'PLANNED', label: '1. Planned', color: '#64748B' },
    { id: 'SHOT', label: '2. Shot', color: '#3B82F6' },
    { id: 'EDITED', label: '3. Edited', color: '#8B5CF6' },
    { id: 'CLIENT_APPROVAL', label: '4. Client Approval', color: '#F59E0B' },
    { id: 'SCHEDULED', label: '5. Scheduled', color: '#06B6D4' },
    { id: 'PUBLISHED', label: '6. Published', color: '#10B981' },
  ];

  const updateItemStatus = async (id: string, newStatus: string, approvalOutcome?: string) => {
    if (!canEditTracker) {
      alert('You do not have permission to update tracker deliverables.');
      return;
    }
    try {
      const res = await fetch('/api/content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus, approvalOutcome }),
      });
      if (res.ok) {
        triggerRefresh();
      }
    } catch (e) {
      console.error('Update status failed:', e);
    }
  };

  const [dragStartStatus, setDragStartStatus] = useState<string | null>(null);

  const handleDragStart = (event: DragStartEvent) => {
    const item = contentItems.find((i) => i.id === event.active.id);
    if (item) {
      setActiveDragItem(item);
      setDragStartStatus(item.status);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;
    if (activeId === overId) return;

    const activeItem = contentItems.find((i) => i.id === activeId);
    if (!activeItem) return;

    const overItem = contentItems.find((i) => i.id === overId);
    const validStatuses = columns.map((c) => c.id);

    if (overItem) {
      if (activeItem.status !== overItem.status) {
        setContentItems((prev) => {
          const activeIndex = prev.findIndex((i) => i.id === activeId);
          const overIndex = prev.findIndex((i) => i.id === overId);
          const updated = [...prev];
          updated[activeIndex] = { ...updated[activeIndex], status: overItem.status };
          return arrayMove(updated, activeIndex, overIndex);
        });
      }
    } else if (validStatuses.includes(overId)) {
      if (activeItem.status !== overId) {
        setContentItems((prev) => {
          const activeIndex = prev.findIndex((i) => i.id === activeId);
          const updated = [...prev];
          updated[activeIndex] = { ...updated[activeIndex], status: overId };
          return updated;
        });
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragItem(null);
    if (!over) {
      setDragStartStatus(null);
      return;
    }

    if (!canEditTracker) {
      setDragStartStatus(null);
      alert('You do not have permission to update stages or move deliverables.');
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeIndex = contentItems.findIndex((i) => i.id === activeId);
    const overIndex = contentItems.findIndex((i) => i.id === overId);

    let finalItems = contentItems;
    if (activeIndex !== -1 && overIndex !== -1 && activeIndex !== overIndex) {
      finalItems = arrayMove(contentItems, activeIndex, overIndex);
      setContentItems(finalItems);
    }

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(
          'tracker_kanban_order',
          JSON.stringify(finalItems.map((i) => i.id))
        );
      } catch {}
    }

    const finalItem = finalItems.find((i) => i.id === activeId);
    if (finalItem && dragStartStatus && finalItem.status !== dragStartStatus) {
      updateItemStatus(activeId, finalItem.status);
    }

    setDragStartStatus(null);
  };

  const exportCSV = () => {
    const headers = ['Title', 'Client', 'Type', 'Platform', 'Scheduled Date', 'Status', 'Approval Outcome', 'Assignee'];
    const rows = contentItems.map((item) => [
      `"${item.title.replace(/"/g, '""')}"`,
      `"${item.client?.name || ''}"`,
      item.type,
      item.platform,
      item.scheduledDate ? formatLocalDate(item.scheduledDate) : 'Unscheduled',
      item.status,
      item.approvalOutcome || 'None',
      `"${item.assignee?.name || 'Unassigned'}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `TrexoByte_Content_Tracker_${getTodayLocalDateKey()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!canViewTracker) {
    return (
      <div className="rounded-2xl border border-border bg-card p-12 text-center space-y-4 max-w-md mx-auto my-16 shadow-lg animate-in fade-in">
        <div className="h-14 w-14 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto border border-rose-500/20">
          <Lock className="h-7 w-7" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-black text-foreground">Access Restricted</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Your current account role (<span className="text-[#FF3B00] font-bold">{effectiveRoleName}</span>) does not have permission to view or manage the production tracker.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-300">
      {/* Header & Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            CONTENT TRACKER <Kanban className="h-5 w-5 text-[#FF3B00]" />
          </h1>
          <p className="text-[11px] sm:text-xs text-muted-foreground font-mono mt-0.5">
            Pipeline Kanban Board & Comprehensive Deliverable Data Matrix
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-muted p-1 rounded-lg border border-border">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                viewMode === 'kanban'
                  ? 'bg-[#FF3B00] text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Kanban className="h-4 w-4" /> <span className="hidden xs:inline">Kanban</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                viewMode === 'table'
                  ? 'bg-[#FF3B00] text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <TableIcon className="h-4 w-4" /> <span className="hidden xs:inline">Table</span>
            </button>
          </div>

          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 rounded-md border border-input bg-card px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-bold hover:bg-muted transition-colors shadow-2xs"
          >
            <Download className="h-4 w-4 text-[#FF3B00]" /> <span className="hidden sm:inline">Export</span> CSV
          </button>

          {canCreateTracker && (
            <button
              onClick={() => openQuickAdd('content')}
              className="flex items-center gap-1.5 rounded-md bg-[#FF3B00] px-3 sm:px-3.5 py-1.5 sm:py-2 text-xs font-bold text-white hover:bg-[#e03400] transition-all clicky-btn shadow-xs cursor-pointer"
              title="Add a Content Item"
            >
              <Plus className="h-4 w-4 stroke-[3]" /> Add Content
            </button>
          )}
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 bg-card p-2.5 sm:p-3 rounded-xl border border-border">
        <div className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
          <Filter className="h-3.5 w-3.5 text-[#FF3B00]" /> Filter:
        </div>

        <select
          value={selectedClient}
          onChange={(e) => setSelectedClient(e.target.value)}
          className="rounded-md border border-input bg-background px-2.5 py-1.5 sm:py-1 text-xs font-medium outline-hidden focus:border-[#FF3B00] flex-1 sm:flex-none"
        >
          <option value="">All Clients</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="rounded-md border border-input bg-background px-2.5 py-1.5 sm:py-1 text-xs font-medium outline-hidden focus:border-[#FF3B00] flex-1 sm:flex-none"
        >
          <option value="">All Formats</option>
          <option value="REEL">Reel</option>
          <option value="SHOOT">Shoot Day</option>
          <option value="CAROUSEL">Carousel</option>
          <option value="STATIC_POST">Static Post</option>
          <option value="AD_CREATIVE">Ad Creative</option>
        </select>
      </div>

      {/* Mobile Stage Selector Pill Bar */}
      {viewMode === 'kanban' && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:hidden">
          <button
            type="button"
            onClick={() => setMobileStageFilter('ALL')}
            className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
              mobileStageFilter === 'ALL'
                ? 'bg-[#FF3B00] text-white shadow-xs'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            All Stages ({contentItems.length})
          </button>
          {columns.map((c) => {
            const count = contentItems.filter((i) => i.status === c.id).length;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setMobileStageFilter(c.id)}
                className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  mobileStageFilter === c.id
                    ? 'bg-[#FF3B00] text-white shadow-xs'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                <span>{c.label.split('. ')[1] || c.label}</span>
                <span className="opacity-70 text-[10px]">({count})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* KANBAN VIEW */}
      {viewMode === 'kanban' && (
        <DndContext
          autoScroll={false}
          measuring={{
            droppable: {
              strategy: MeasuringStrategy.Always,
            },
          }}
          sensors={sensors}
          collisionDetection={customCollisionDetection}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          {/* Mobile Kanban Column View Selector */}
          <div className="flex md:hidden items-center justify-between gap-1 bg-muted/60 p-1 rounded-lg border border-border text-[11px] mb-2">
            <span className="text-[10px] font-mono font-bold text-muted-foreground px-1.5 flex items-center gap-1 shrink-0">
              <Kanban className="h-3.5 w-3.5 text-[#FF3B00]" /> Columns:
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setKanbanColumnMode('4col')}
                className={`px-2 py-0.5 rounded font-bold transition-all text-[10.5px] cursor-pointer ${
                  kanbanColumnMode === '4col'
                    ? 'bg-[#FF3B00] text-white shadow-2xs font-black'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Show 4 columns across mobile screen"
              >
                4 cols
              </button>
              <button
                type="button"
                onClick={() => setKanbanColumnMode('3col')}
                className={`px-2 py-0.5 rounded font-bold transition-all text-[10.5px] cursor-pointer ${
                  kanbanColumnMode === '3col'
                    ? 'bg-[#FF3B00] text-white shadow-2xs font-black'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Show 3 wider columns"
              >
                3 cols
              </button>
              <button
                type="button"
                onClick={() => setKanbanColumnMode('1col')}
                className={`px-2 py-0.5 rounded font-bold transition-all text-[10.5px] cursor-pointer ${
                  kanbanColumnMode === '1col'
                    ? 'bg-[#FF3B00] text-white shadow-2xs font-black'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Focus on 1 column"
              >
                1 col
              </button>
              <button
                type="button"
                onClick={() => setKanbanColumnMode('all')}
                className={`px-2 py-0.5 rounded font-bold transition-all text-[10.5px] cursor-pointer ${
                  kanbanColumnMode === 'all'
                    ? 'bg-[#FF3B00] text-white shadow-2xs font-black'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="All columns overview"
              >
                All
              </button>
            </div>
          </div>

          {/* Mobile scroll hint */}
          <p className="md:hidden text-[9.5px] text-muted-foreground/80 font-mono text-center pb-1">
            ← Drag near edges to auto-scroll fast across columns →
          </p>
          <div
            ref={boardContainerRef}
            className="flex overflow-x-auto pb-6 pt-1 select-none scrollbar-thin snap-x md:grid md:grid-cols-6 md:overflow-x-visible gap-1.5 sm:gap-2 lg:gap-2.5"
          >
            {columns
              .filter((col) => mobileStageFilter === 'ALL' || mobileStageFilter === col.id)
              .map((col) => {
                const colItems = contentItems.filter((i) => i.status === col.id);
                const colWidthClass =
                  kanbanColumnMode === '4col'
                    ? 'w-[23.5vw] min-w-[82px] max-w-[125px] sm:w-[23vw] shrink-0 snap-start md:w-auto md:min-w-0 md:max-w-none md:shrink'
                    : kanbanColumnMode === '3col'
                    ? 'w-[31.5vw] min-w-[110px] max-w-[160px] sm:w-[31vw] shrink-0 snap-start md:w-auto md:min-w-0 md:max-w-none md:shrink'
                    : kanbanColumnMode === '1col'
                    ? 'w-[86vw] min-w-[86vw] max-w-[360px] sm:w-[340px] shrink-0 snap-start md:w-auto md:min-w-0 md:max-w-none md:shrink'
                    : 'w-[15.8vw] min-w-[58px] max-w-[85px] sm:w-[16vw] shrink-0 snap-start md:w-auto md:min-w-0 md:max-w-none md:shrink';

                return (
                  <div
                    key={col.id}
                    className={colWidthClass}
                  >
                    <DroppableTrackerColumn
                      col={col}
                      count={colItems.length}
                      itemIds={colItems.map((i) => i.id)}
                    >
                      {colItems.map((item) => (
                        <SortableTrackerCard
                          key={item.id}
                          item={item}
                          onStatusChange={updateItemStatus}
                          columns={columns}
                          canEdit={canEditTracker}
                        />
                      ))}
                      {colItems.length === 0 && (
                        <div className="flex h-20 sm:h-24 items-center justify-center rounded-lg border border-dashed border-border/60 p-1 text-center">
                          <p className="text-[9px] font-semibold text-muted-foreground/50">
                            Drop here
                          </p>
                        </div>
                      )}
                    </DroppableTrackerColumn>
                  </div>
                );
              })}
          </div>

          <DragOverlay>
            {activeDragItem ? (
              <div className="rounded-lg border border-[#FF3B00] bg-card p-2.5 shadow-2xl opacity-95 rotate-2 scale-105 space-y-1.5 pointer-events-none w-[185px]">
                <div className="flex items-center justify-between gap-1 min-w-0">
                  <span
                    className="px-1.5 py-0.5 rounded text-[8.5px] font-black text-white uppercase truncate max-w-[100px]"
                    style={{ backgroundColor: activeDragItem.client?.color || '#FF3B00' }}
                  >
                    {activeDragItem.client?.name || 'Client'}
                  </span>
                  <span className="text-[8px] font-mono font-bold text-muted-foreground uppercase shrink-0 px-1 py-0.5 rounded bg-muted/80">
                    {activeDragItem.type?.replace(/_/g, ' ')}
                  </span>
                </div>
                <h4 className="font-bold text-[11px] text-foreground leading-snug line-clamp-2">{activeDragItem.title}</h4>
                <div className="pt-1.5 border-t border-border/40 flex items-center justify-between text-[9px] text-muted-foreground font-mono">
                  <span>{activeDragItem.scheduledDate ? formatLocalDate(activeDragItem.scheduledDate) : 'Unscheduled'}</span>
                  {activeDragItem.assignee && (
                    <span className="font-semibold text-foreground text-[8.5px]">{activeDragItem.assignee.name.split(' ')[0]}</span>
                  )}
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* TABLE VIEW */}
      {viewMode === 'table' && (
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs min-w-[700px]">
              <thead className="bg-muted text-muted-foreground uppercase text-[10px] font-mono border-b border-border">
                <tr>
                  <th className="p-3">Client</th>
                  <th className="p-3">Format</th>
                  <th className="p-3">Title</th>
                  <th className="p-3">Platform</th>
                  <th className="p-3">Scheduled Date</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Approval Outcome</th>
                  <th className="p-3">Assignee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
              {contentItems.map((item) => (
                <tr key={item.id} className="hover:bg-muted/30">
                  <td className="p-3">
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase inline-block"
                      style={{ backgroundColor: item.client?.color || '#FF3B00' }}
                    >
                      {item.client?.name}
                    </span>
                  </td>
                  <td className="p-3 font-mono font-bold text-foreground">{item.type}</td>
                  <td className="p-3 font-bold text-foreground">{item.title}</td>
                  <td className="p-3 font-mono text-muted-foreground">{item.platform}</td>
                  <td className="p-3 font-mono">{item.scheduledDate ? formatLocalDate(item.scheduledDate) : 'Unscheduled'}</td>
                  <td className="p-3">
                    <select
                      value={item.status}
                      onChange={(e) => updateItemStatus(item.id, e.target.value)}
                      className="rounded border border-input bg-background px-2 py-1 text-xs font-bold text-[#FF3B00] outline-hidden"
                    >
                      {columns.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-3">
                    <select
                      value={item.approvalOutcome || ''}
                      onChange={(e) => updateItemStatus(item.id, item.status, e.target.value)}
                      className="rounded border border-input bg-background px-2 py-1 text-xs font-semibold outline-hidden"
                    >
                      <option value="">Pending / None</option>
                      <option value="APPROVED">APPROVED</option>
                      <option value="REVISION_REQUESTED">REVISION REQUESTED</option>
                      <option value="DECLINED">DECLINED</option>
                    </select>
                  </td>
                  <td className="p-3 font-medium text-foreground">{item.assignee?.name || 'Unassigned'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )}
  </div>
);
}
