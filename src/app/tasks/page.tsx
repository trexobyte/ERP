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
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  CheckSquare,
  Kanban,
  List,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Plus,
  Filter,
  User,
  Sparkles,
  Link as LinkIcon,
  X,
  GripVertical,
  Lock,
} from 'lucide-react';
import { hasPermission, hasActionPermission } from '@/lib/permissions';
import { formatLocalDate, toLocalDateKey, getTodayLocalDateKey } from '@/lib/date-utils';

function SortableTaskCard({
  task,
  onCheckboxClick,
}: {
  task: any;
  onCheckboxClick: (task: any) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: { type: 'task', task, status: task.status },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`rounded-lg border border-border bg-background p-3.5 shadow-xs space-y-2 hover:border-[#FF3B00] transition-all cursor-grab active:cursor-grabbing select-none group ${
        isDragging ? 'opacity-25 scale-95 ring-2 ring-[#FF3B00] shadow-xl z-30' : 'opacity-100'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 pointer-events-none">
          <GripVertical className="h-3.5 w-3.5 text-muted-foreground opacity-50 group-hover:opacity-100 shrink-0" />
          <span
            className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
              task.urgency === 'URGENT' ? 'bg-[#FF3B00] text-white' : 'bg-muted text-muted-foreground'
            }`}
          >
            {task.urgency}
          </span>
        </div>
        <div
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={task.status === 'DONE'}
            onChange={() => onCheckboxClick(task)}
            className="h-4 w-4 rounded border-input text-[#FF3B00] cursor-pointer"
          />
        </div>
      </div>

      <h4 className="font-bold text-xs text-foreground group-hover:text-[#FF3B00] transition-colors pointer-events-none line-clamp-2 break-words leading-snug">
        {task.title}
      </h4>

      {task.client && (
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground pointer-events-none min-w-0">
          <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: task.client.color }} />
          <span className="truncate">{task.client.name}</span>
        </div>
      )}

      {task.contentItem && (
        <span className="text-[#FF3B00] text-[10px] flex items-center gap-1 pointer-events-none font-mono truncate">
          <LinkIcon className="h-3 w-3 shrink-0" /> <span className="truncate">Linked to {task.contentItem.type?.replace(/_/g, ' ')}</span>
        </span>
      )}

      <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[10px] text-muted-foreground font-mono pointer-events-none">
        <span>Due {formatLocalDate(task.dueDate)}</span>
        <span className="truncate max-w-[100px] text-right">{task.assignee?.name}</span>
      </div>
    </div>
  );
}

function DroppableTaskColumn({
  col,
  count,
  taskIds,
  children,
}: {
  col: { key: string; label: string; color: string };
  count: number;
  taskIds: string[];
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: col.key,
    data: { type: 'column', status: col.key },
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col rounded-xl border p-4 min-h-[520px] transition-all ${
        isOver
          ? 'border-[#FF3B00] bg-[#FF3B00]/15 ring-2 ring-[#FF3B00] shadow-md'
          : 'border-border bg-card'
      }`}
    >
      <div className="flex items-center justify-between border-b border-border pb-2 mb-3">
        <span className="font-extrabold text-sm tracking-tight text-foreground flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: col.color }} />
          {col.label}
        </span>
        <span className="text-xs font-mono font-bold bg-muted px-2 py-0.5 rounded text-muted-foreground">
          {count}
        </span>
      </div>

      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div className="space-y-3 flex-1">{children}</div>
      </SortableContext>
    </div>
  );
}

export default function TasksPage() {
  const {
    effectiveRoleName,
    effectivePermissions,
    openQuickAdd,
    refreshTrigger,
    triggerRefresh,
    cachedClients,
    cachedUsers,
    cachedTasks,
    setCachedTasks,
  } = useImpersonation();

  const isSuperAdmin = effectiveRoleName === 'Super Admin';
  const canViewTasks = hasPermission(effectivePermissions, 'tasks', 'view') || isSuperAdmin;
  const canCreateTasks = hasActionPermission(effectivePermissions, 'tasks', 'create') || isSuperAdmin;
  const canEditTasks = hasActionPermission(effectivePermissions, 'tasks', 'edit') || isSuperAdmin;
  const canDeleteTasks = hasActionPermission(effectivePermissions, 'tasks', 'delete') || isSuperAdmin;

  const [viewMode, setViewMode] = useState<'urgency' | 'kanban'>('urgency');
  const [tasks, setTasks] = useState<any[]>(() => {
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
  const [loading, setLoading] = useState(() => !cachedTasks || cachedTasks.length === 0);
  const [activeDragTask, setActiveDragTask] = useState<any | null>(null);

  // Drag & drop sensors: MouseSensor for desktop, TouchSensor with delay to allow smooth page scroll
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

  const customCollisionDetection = (args: any) => {
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) return pointerCollisions;
    return closestCenter(args);
  };

  // Filters
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedAssignee, setSelectedAssignee] = useState('');
  const [selectedUrgency, setSelectedUrgency] = useState('');

  // Complete modal prompt state (for tasks linked to ContentItems)
  const [promptContentItem, setPromptContentItem] = useState<any | null>(null);

  // Listen to Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && promptContentItem) {
        setPromptContentItem(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [promptContentItem]);

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
    if (cachedTasks && cachedTasks.length > 0) {
      setTasks((prev) => (prev.length === 0 ? cachedTasks : prev));
      setLoading(false);
    }
  }, [cachedTasks]);

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

  const fetchTasks = (retryCount = 0) => {
    if (tasks.length === 0) setLoading(true);

    const params = new URLSearchParams();
    if (selectedClient) params.append('clientId', selectedClient);
    if (selectedAssignee) params.append('assigneeId', selectedAssignee);
    if (selectedUrgency) params.append('urgency', selectedUrgency);

    const urgencyRank: Record<string, number> = {
      URGENT: 0,
      HIGH: 1,
      MEDIUM: 2,
      LOW: 3,
    };

    fetch(`/api/tasks?${params.toString()}`)
      .then(async (res) => {
        if (!res.ok) {
          console.warn('/api/tasks returned non-ok status:', res.status);
          if (retryCount < 2) {
            setTimeout(() => fetchTasks(retryCount + 1), 600);
          }
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data)) {
          const hasFilters = Boolean(selectedClient || selectedAssignee || selectedUrgency);
          if (data.length > 0 || hasFilters) {
            let savedOrder: string[] = [];
            if (typeof window !== 'undefined') {
              try {
                const raw = localStorage.getItem('tasks_kanban_order');
                if (raw) savedOrder = JSON.parse(raw);
              } catch {}
            }

            if (savedOrder.length > 0) {
              const orderMap = new Map(savedOrder.map((id, idx) => [id, idx]));
              data.sort((a, b) => {
                const idxA = orderMap.has(a.id) ? orderMap.get(a.id)! : 9999 + (urgencyRank[a.urgency] ?? 99);
                const idxB = orderMap.has(b.id) ? orderMap.get(b.id)! : 9999 + (urgencyRank[b.urgency] ?? 99);
                return idxA - idxB;
              });
            } else {
              // Default ranking strictly by urgency
              data.sort((a, b) => {
                const rankA = urgencyRank[a.urgency] ?? 99;
                const rankB = urgencyRank[b.urgency] ?? 99;
                return rankA - rankB;
              });
            }

            setTasks(data);
            if (!hasFilters) {
              setCachedTasks(data);
              if (typeof window !== 'undefined') {
                try {
                  sessionStorage.setItem('trexo_cache_tasks', JSON.stringify(data));
                } catch {}
              }
            }
          } else if (tasks.length === 0 && retryCount < 2) {
            setTimeout(() => fetchTasks(retryCount + 1), 600);
          }
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch tasks:', err);
        if (retryCount < 2) {
          setTimeout(() => fetchTasks(retryCount + 1), 600);
        } else {
          setLoading(false);
        }
      });
  };

  useEffect(() => {
    fetchTasks();
  }, [selectedClient, selectedAssignee, selectedUrgency, refreshTrigger]);

  const toggleTaskDone = async (task: any, updateContentStatus?: string) => {
    const nextStatus = task.status === 'DONE' ? 'TO_DO' : 'DONE';
    try {
      const res = await fetch('/api/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: task.id,
          status: nextStatus,
          updateContentStatus,
        }),
      });

      if (res.ok) {
        setPromptContentItem(null);
        fetchTasks();
        triggerRefresh();
      }
    } catch (e) {
      console.error('Toggle task status failed:', e);
    }
  };

  const handleCheckboxClick = (task: any) => {
    if (task.status !== 'DONE' && task.contentItem) {
      setPromptContentItem(task);
    } else {
      toggleTaskDone(task);
    }
  };

  const [dragStartStatus, setDragStartStatus] = useState<string | null>(null);

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id);
    if (task) {
      setActiveDragTask(task);
      setDragStartStatus(task.status);
    }
  };

  const updateTaskStatus = async (id: string, newStatus: string) => {
    if (!canEditTasks) {
      alert('You do not have permission to edit or complete tasks.');
      return;
    }
    try {
      const res = await fetch('/api/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      });
      if (res.ok) {
        triggerRefresh();
      }
    } catch (e) {
      console.error('Update task status failed:', e);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;
    if (activeId === overId) return;

    const activeTask = tasks.find((t) => t.id === activeId);
    if (!activeTask) return;

    const overTask = tasks.find((t) => t.id === overId);
    const validStatuses = ['TO_DO', 'IN_PROGRESS', 'DONE'];

    if (overTask) {
      if (activeTask.status !== overTask.status) {
        setTasks((prev) => {
          const activeIndex = prev.findIndex((t) => t.id === activeId);
          const overIndex = prev.findIndex((t) => t.id === overId);
          const updated = [...prev];
          updated[activeIndex] = { ...updated[activeIndex], status: overTask.status };
          return arrayMove(updated, activeIndex, overIndex);
        });
      }
    } else if (validStatuses.includes(overId)) {
      if (activeTask.status !== overId) {
        setTasks((prev) => {
          const activeIndex = prev.findIndex((t) => t.id === activeId);
          const updated = [...prev];
          updated[activeIndex] = { ...updated[activeIndex], status: overId };
          return updated;
        });
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragTask(null);
    if (!over) {
      setDragStartStatus(null);
      return;
    }

    if (!canEditTasks) {
      setDragStartStatus(null);
      alert('You do not have permission to edit or move tasks.');
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeIndex = tasks.findIndex((t) => t.id === activeId);
    const overIndex = tasks.findIndex((t) => t.id === overId);

    let finalTasks = tasks;
    if (activeIndex !== -1 && overIndex !== -1 && activeIndex !== overIndex) {
      finalTasks = arrayMove(tasks, activeIndex, overIndex);
      setTasks(finalTasks);
    }

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(
          'tasks_kanban_order',
          JSON.stringify(finalTasks.map((t) => t.id))
        );
      } catch {}
    }

    const finalTask = finalTasks.find((t) => t.id === activeId);
    if (finalTask && dragStartStatus && finalTask.status !== dragStartStatus) {
      updateTaskStatus(activeId, finalTask.status);
    }

    setDragStartStatus(null);
  };

  const currentDate = new Date();

  const urgencyGroups = [
    { key: 'URGENT', label: '🔴 Urgent Priority', color: '#FF3B00', badgeClass: 'bg-[#FF3B00] text-white' },
    { key: 'HIGH', label: '🟠 High Priority', color: '#F59E0B', badgeClass: 'bg-amber-500 text-white' },
    { key: 'MEDIUM', label: '🟡 Medium Priority', color: '#EAB308', badgeClass: 'bg-yellow-500 text-white' },
    { key: 'LOW', label: '⚪ Low Priority', color: '#64748B', badgeClass: 'bg-slate-600 text-white' },
  ];

  if (!canViewTasks) {
    return (
      <div className="rounded-2xl border border-border bg-card p-12 text-center space-y-4 max-w-md mx-auto my-16 shadow-lg animate-in fade-in">
        <div className="h-14 w-14 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto border border-rose-500/20">
          <Lock className="h-7 w-7" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-black text-foreground">Access Restricted</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Your current account role (<span className="text-[#FF3B00] font-bold">{effectiveRoleName}</span>) does not have permission to view or manage tasks.
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
            TASKS & URGENCY STREAM <CheckSquare className="h-5 w-5 text-[#FF3B00]" />
          </h1>
          <p className="text-[11px] sm:text-xs text-muted-foreground font-mono mt-0.5">
            Fast Quick-Complete Checklist & Cross-Module Deliverable Linkage
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Switcher */}
          <div className="flex items-center gap-1 bg-muted p-1 rounded-lg border border-border">
            <button
              onClick={() => setViewMode('urgency')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                viewMode === 'urgency'
                  ? 'bg-[#FF3B00] text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <List className="h-4 w-4" /> <span className="hidden xs:inline">Urgency</span>
            </button>
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
          </div>

          {canCreateTasks && (
            <button
              onClick={() => openQuickAdd('task')}
              className="flex items-center gap-1.5 rounded-md bg-[#FF3B00] px-3 sm:px-3.5 py-1.5 sm:py-2 text-xs font-bold text-white hover:bg-[#e03400] transition-all clicky-btn shadow-xs cursor-pointer"
            >
              <Plus className="h-4 w-4 stroke-[3]" /> Add Task
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
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
          value={selectedAssignee}
          onChange={(e) => setSelectedAssignee(e.target.value)}
          className="rounded-md border border-input bg-background px-2.5 py-1.5 sm:py-1 text-xs font-medium outline-hidden focus:border-[#FF3B00] flex-1 sm:flex-none"
        >
          <option value="">All Assignees</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </div>

      {/* VIEW A: URGENCY GROUPS VIEW */}
      {viewMode === 'urgency' && (
        <div className="space-y-4 sm:space-y-6">
          {urgencyGroups.every((g) => tasks.filter((t) => t.urgency === g.key).length === 0) && !loading && (
            <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-dashed border-border bg-card p-6">
              <CheckSquare className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-bold text-foreground">No tasks found</p>
              <p className="text-xs text-muted-foreground mt-1">There are no tasks matching your current filters.</p>
            </div>
          )}
          {urgencyGroups.map((group) => {
            const groupTasks = tasks.filter((t) => t.urgency === group.key);
            if (groupTasks.length === 0) return null;

            return (
              <div key={group.key} className="rounded-xl border border-border bg-card p-3.5 sm:p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <span className="font-extrabold text-xs sm:text-sm tracking-tight text-foreground flex items-center gap-2">
                    {group.label}
                    <span className="text-[10px] sm:text-xs font-mono font-bold px-2 py-0.5 rounded bg-muted text-muted-foreground">
                      {groupTasks.length} Tasks
                    </span>
                  </span>
                </div>

                <div className="space-y-2">
                  {groupTasks.map((task) => {
                    const isOverdue = task.status !== 'DONE' && toLocalDateKey(task.dueDate) < getTodayLocalDateKey();

                    return (
                      <div
                        key={task.id}
                        className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-lg border transition-all ${
                          isOverdue
                            ? 'border-rose-500/80 bg-rose-500/10 shadow-xs'
                            : task.status === 'DONE'
                            ? 'border-border bg-muted/20 opacity-60'
                            : 'border-border bg-background hover:border-[#FF3B00]'
                        }`}
                      >
                        <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                          {/* Quick Complete Checkbox */}
                          <input
                            type="checkbox"
                            checked={task.status === 'DONE'}
                            onChange={() => handleCheckboxClick(task)}
                            className="h-4 w-4 mt-0.5 sm:mt-0 rounded border-input text-[#FF3B00] focus:ring-[#FF3B00] cursor-pointer shrink-0"
                          />

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                              <span
                                className={`font-bold text-xs sm:text-[13px] break-words ${
                                  task.status === 'DONE' ? 'line-through text-muted-foreground' : 'text-foreground'
                                }`}
                              >
                                {task.title}
                              </span>

                              {isOverdue && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-rose-500 text-white shrink-0">
                                  Overdue
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[10px] sm:text-[11px] font-mono text-muted-foreground mt-1">
                              {task.client && (
                                <span className="flex items-center gap-1 font-semibold text-foreground">
                                  <span
                                    className="h-2 w-2 rounded-full shrink-0"
                                    style={{ backgroundColor: task.client.color }}
                                  />
                                  <span className="truncate max-w-[120px]">{task.client.name}</span>
                                </span>
                              )}
                              {task.contentItem && (
                                <span className="text-[#FF3B00] flex items-center gap-1">
                                  <LinkIcon className="h-3 w-3 shrink-0" /> Linked to {task.contentItem.type?.replace(/_/g, ' ')}
                                </span>
                              )}
                              <span>Due {formatLocalDate(task.dueDate)}</span>
                            </div>
                          </div>
                        </div>

                        {task.assignee && (
                          <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/30">
                            <span className="text-xs font-semibold text-foreground">{task.assignee.name}</span>
                            <img
                              src={
                                task.assignee.avatar ||
                                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
                              }
                              className="h-6 w-6 rounded-full object-cover border border-border"
                              alt="Avatar"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW B: KANBAN VIEW */}
      {viewMode === 'kanban' && (
        <DndContext
          sensors={sensors}
          collisionDetection={customCollisionDetection}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex md:grid md:grid-cols-3 gap-4 overflow-x-auto pb-6 pt-1 select-none scrollbar-thin snap-x">
            {[
              { key: 'TO_DO', label: 'To Do', color: '#64748B' },
              { key: 'IN_PROGRESS', label: 'In Progress', color: '#3B82F6' },
              { key: 'DONE', label: 'Completed', color: '#10B981' },
            ].map((col) => {
              const colTasks = tasks.filter((t) => t.status === col.key);

              return (
                <div key={col.key} className="w-[85vw] sm:w-[320px] md:w-auto min-w-[85vw] sm:min-w-[320px] md:min-w-0 shrink-0 snap-start">
                  <DroppableTaskColumn
                    col={col}
                    count={colTasks.length}
                    taskIds={colTasks.map((t) => t.id)}
                  >
                    {colTasks.map((task) => (
                      <SortableTaskCard
                        key={task.id}
                        task={task}
                        onCheckboxClick={handleCheckboxClick}
                      />
                    ))}
                    {colTasks.length === 0 && (
                      <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border/60 p-4 text-center">
                        <p className="text-xs font-semibold text-muted-foreground/60">
                          Drop tasks here
                        </p>
                      </div>
                    )}
                  </DroppableTaskColumn>
                </div>
              );
            })}
          </div>

          <DragOverlay>
            {activeDragTask ? (
              <div className="rounded-lg border border-[#FF3B00] bg-background p-3.5 shadow-2xl opacity-95 rotate-1 scale-105 space-y-2 pointer-events-none w-72">
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                      activeDragTask.urgency === 'URGENT' ? 'bg-[#FF3B00] text-white' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {activeDragTask.urgency}
                  </span>
                </div>
                <h4 className="font-bold text-xs text-foreground">{activeDragTask.title}</h4>
                {activeDragTask.client && (
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: activeDragTask.client.color }} />
                    <span>{activeDragTask.client.name}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                  <span>Due {formatLocalDate(activeDragTask.dueDate)}</span>
                  <span>{activeDragTask.assignee?.name}</span>
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* CONTENT ITEM STATUS PROMPT MODAL ON TASK COMPLETE */}
      {promptContentItem && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setPromptContentItem(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-200"
        >
          <div className="w-full max-w-md bg-card border-2 border-border shadow-2xl rounded-xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <h3 className="font-extrabold text-sm text-foreground flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#FF3B00]" /> Linked Deliverable Found!
              </h3>
              <button
                onClick={() => setPromptContentItem(null)}
                className="p-1 rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                title="Close (Esc)"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              This task is linked to <strong className="text-foreground">"{promptContentItem.contentItem?.title}"</strong>.
              Would you like to update its content status now?
            </p>

            <div className="space-y-2">
              <button
                onClick={() => toggleTaskDone(promptContentItem, 'EDITED')}
                className="w-full py-2 px-3 text-xs font-bold rounded bg-purple-600 text-white hover:bg-purple-700 text-left transition-colors"
              >
                Mark Task Done & Update Content Status to EDITED
              </button>
              <button
                onClick={() => toggleTaskDone(promptContentItem, 'CLIENT_APPROVAL')}
                className="w-full py-2 px-3 text-xs font-bold rounded bg-amber-500 text-white hover:bg-amber-600 text-left transition-colors"
              >
                Mark Task Done & Move Content to CLIENT APPROVAL
              </button>
              <button
                onClick={() => toggleTaskDone(promptContentItem)}
                className="w-full py-2 px-3 text-xs font-semibold rounded bg-muted hover:bg-muted/80 text-foreground text-left transition-colors"
              >
                Just Mark Task Done (Keep Content Status Same)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
