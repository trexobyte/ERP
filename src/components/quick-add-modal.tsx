'use client';

import React, { useState, useEffect } from 'react';
import { useImpersonation } from '@/components/providers';
import { X, Calendar, CheckSquare, Camera, Sparkles, Building2, Lock } from 'lucide-react';

export function QuickAddModal() {
  const {
    quickAddOpen,
    setQuickAddOpen,
    quickAddType,
    quickAddDate,
    triggerRefresh,
    cachedClients,
    cachedUsers,
  } = useImpersonation();
  const [activeTab, setActiveTab] = useState<'content' | 'task' | 'shoot'>('content');
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<any[]>(cachedClients || []);
  const [users, setUsers] = useState<any[]>(cachedUsers || []);

  // Destination mode: 'agency' (shared among all users) or 'personal' (my calendar only)
  const [isPersonal, setIsPersonal] = useState(false);

  // Content & Shoot form
  const [clientId, setClientId] = useState('');
  const [title, setTitle] = useState('');
  const [type, setType] = useState('REEL');
  const [platform, setPlatform] = useState('INSTAGRAM');
  const [status, setStatus] = useState('PLANNED');
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().split('T')[0]);
  const [assigneeId, setAssigneeId] = useState('');
  const [description, setDescription] = useState('');

  // Task form
  const [taskTitle, setTaskTitle] = useState('');
  const [taskUrgency, setTaskUrgency] = useState('HIGH');
  const [taskDueDate, setTaskDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [taskClientId, setTaskClientId] = useState('');
  const [taskAssigneeId, setTaskAssigneeId] = useState('');
  const [taskDescription, setTaskDescription] = useState('');

  useEffect(() => {
    if (quickAddOpen) {
      if (quickAddType) {
        setActiveTab(quickAddType);
      }
      if (quickAddDate) {
        setScheduledDate(quickAddDate);
        setTaskDueDate(quickAddDate);
      } else {
        const todayStr = new Date().toISOString().split('T')[0];
        setScheduledDate(todayStr);
        setTaskDueDate(todayStr);
      }
    }
  }, [quickAddOpen, quickAddType, quickAddDate]);

  useEffect(() => {
    if (cachedClients && cachedClients.length > 0 && clients.length === 0) {
      setClients(cachedClients);
      if (!clientId || clientId === '__PERSONAL__') {
        setClientId(cachedClients[0].id);
      }
    }
  }, [cachedClients, clients.length, clientId]);

  useEffect(() => {
    if (cachedUsers && cachedUsers.length > 0 && users.length === 0) {
      setUsers(cachedUsers);
    }
  }, [cachedUsers, users.length]);

  useEffect(() => {
    if (quickAddOpen) {
      fetch('/api/clients')
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => {
          if (Array.isArray(data) && data.length > 0) {
            setClients(data);
            if (!clientId || clientId === '__PERSONAL__') {
              setClientId(data[0].id);
            }
          }
        })
        .catch((err) => console.error('Failed to fetch clients:', err));

      fetch('/api/users')
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => {
          if (Array.isArray(data)) setUsers(data);
        })
        .catch((err) => console.error('Failed to fetch users:', err));
    }
  }, [quickAddOpen]);

  // ESC Key Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && quickAddOpen) {
        setQuickAddOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [quickAddOpen, setQuickAddOpen]);

  if (!quickAddOpen) return null;

  // Handle personal item submission (just Name, Date, and Description required/optional)
  const handleSubmitPersonal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !title.trim()) {
      alert('Please enter a name/title for your personal calendar task.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: null,
          isPersonal: true,
          type: 'PERSONAL',
          title: title.trim(),
          description: description ? description.trim() : null,
          platform: 'PERSONAL',
          scheduledDate: scheduledDate ? new Date(scheduledDate).toISOString() : new Date().toISOString(),
          status: 'PLANNED',
          assigneeId: null, // API automatically associates with current user
        }),
      });

      if (res.ok) {
        setQuickAddOpen(false);
        setTitle('');
        setDescription('');
        setIsPersonal(false);
        triggerRefresh();
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(errorData.error || 'Failed to add personal item. Please try again.');
      }
    } catch (err: any) {
      console.error('Quick add personal item error:', err);
      alert(err?.message || 'An error occurred while creating personal item.');
    } finally {
      setLoading(false);
    }
  };

  // Handle agency content / shoot item submission
  const handleSubmitAgencyContent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !title.trim()) {
      alert('Please enter a title or concept.');
      return;
    }

    const effectiveClientId = clientId || (clients.length > 0 ? clients[0].id : null);
    if (!effectiveClientId) {
      alert('Please select an Agency Client Account.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: effectiveClientId,
          isPersonal: false,
          type: activeTab === 'shoot' ? 'SHOOT' : type,
          title: title.trim(),
          description: description ? description.trim() : null,
          platform: platform || 'INSTAGRAM',
          scheduledDate: scheduledDate ? new Date(scheduledDate).toISOString() : new Date().toISOString(),
          status: status || 'PLANNED',
          assigneeId: assigneeId || null,
        }),
      });

      if (res.ok) {
        setQuickAddOpen(false);
        setTitle('');
        setDescription('');
        setStatus('PLANNED');
        triggerRefresh();
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(errorData.error || 'Failed to add item. Please try again.');
      }
    } catch (err: any) {
      console.error('Quick add content error:', err);
      alert(err?.message || 'An error occurred while creating item.');
    } finally {
      setLoading(false);
    }
  };

  // Handle agency task submission
  const handleSubmitAgencyTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle || !taskTitle.trim()) {
      alert('Please enter a task title.');
      return;
    }
    setLoading(true);

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: taskTitle.trim(),
          description: taskDescription ? taskDescription.trim() : null,
          urgency: taskUrgency || 'HIGH',
          dueDate: taskDueDate ? new Date(taskDueDate).toISOString() : new Date().toISOString(),
          clientId: taskClientId || null,
          assigneeId: taskAssigneeId || null,
          status: 'TO_DO',
        }),
      });

      if (res.ok) {
        setQuickAddOpen(false);
        setTaskTitle('');
        setTaskDescription('');
        triggerRefresh();
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(errorData.error || 'Failed to create task. Please try again.');
      }
    } catch (err: any) {
      console.error('Quick add task error:', err);
      alert(err?.message || 'An error occurred while creating task.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) setQuickAddOpen(false);
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-200"
    >
      <div className="w-full max-w-xl bg-card border-2 border-border shadow-2xl rounded-xl overflow-hidden text-card-foreground max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-secondary/50 px-5 py-3.5 shrink-0">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-[#FF3B00] animate-pulse" />
            <h2 className="font-bold text-lg tracking-tight flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[#FF3B00]" /> Fast Entry Quick Add
            </h2>
          </div>
          <button
            onClick={() => setQuickAddOpen(false)}
            className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
            title="Close (Esc)"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* TARGET DESTINATION TOGGLE BAR */}
        <div className="p-3 bg-muted/40 border-b border-border shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
              Target Destination:
            </span>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                isPersonal
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                  : 'bg-[#FF3B00]/10 text-[#FF3B00] border border-[#FF3B00]/30'
              }`}
            >
              {isPersonal ? '🔒 My Personal View Only' : '🏢 Shared Agency Calendar'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setIsPersonal(false)}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                !isPersonal
                  ? 'bg-[#FF3B00] text-white border-[#FF3B00] shadow-sm'
                  : 'bg-card text-muted-foreground border-border hover:text-foreground hover:bg-muted'
              }`}
            >
              <Building2 className="h-4 w-4" /> Agency View (Shared)
            </button>
            <button
              type="button"
              onClick={() => setIsPersonal(true)}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                isPersonal
                  ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                  : 'bg-card text-muted-foreground border-border hover:text-foreground hover:bg-muted'
              }`}
            >
              <Lock className="h-4 w-4" /> Personal / Private
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CASE 1: PERSONAL / PRIVATE MODE (Simplified: Name, Date, Description)     */}
        {/* ========================================================================= */}
        {isPersonal ? (
          <form onSubmit={handleSubmitPersonal} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 flex flex-col">
            <div className="space-y-4 flex-1">
            <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/30 text-xs text-purple-300 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <Lock className="h-4 w-4 text-purple-400" /> Personal Task / Reminder Mode
              </p>
              <p className="text-[11px] font-mono text-purple-300/80">
                This item will only appear in <strong>YOUR personal calendar view</strong>. It is completely hidden
                from all other agency team members. Only Name and Date are required!
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Name / Task Title *
              </label>
              <input
                type="text"
                placeholder="e.g., Doctor appointment, gym workout, draft personal contract..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                autoFocus
                className="w-full rounded-md border border-purple-500/40 bg-background px-3 py-2 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-hidden font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Target Date *
              </label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-purple-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Description / Notes <span className="text-[10px] lowercase text-muted-foreground font-mono">(optional)</span>
              </label>
              <textarea
                rows={3}
                placeholder="Add private notes, reminders, or details..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-purple-500 outline-hidden"
              />
            </div>

            </div>

            <div className="sticky bottom-0 bg-card border-t border-border pt-3 pb-1 z-10 flex justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setQuickAddOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-md border border-input hover:bg-muted transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 text-xs font-bold rounded-md bg-purple-600 text-white hover:bg-purple-700 transition-all shadow-md clicky-btn cursor-pointer"
              >
                {loading ? 'Saving...' : 'Save to My Personal Calendar'}
              </button>
            </div>
          </form>
        ) : (
          /* ========================================================================= */
          /* CASE 2: AGENCY VIEW (Shared across team: Content Item / Shoot / Task)    */
          /* ========================================================================= */
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Tab Selection */}
            <div className="flex border-b border-border bg-muted/20 p-1.5 gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('content')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md font-medium text-xs transition-all cursor-pointer ${
                  activeTab === 'content'
                    ? 'bg-[#FF3B00] text-white shadow-xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <Calendar className="h-4 w-4" /> Content Item
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('task')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md font-medium text-xs transition-all cursor-pointer ${
                  activeTab === 'task'
                    ? 'bg-[#FF3B00] text-white shadow-xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <CheckSquare className="h-4 w-4" /> Quick Task
              </button>
            </div>

            {/* Content & Shoot Form */}
            {(activeTab === 'content' || activeTab === 'shoot') && (
              <form onSubmit={handleSubmitAgencyContent} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 flex flex-col">
                <div className="space-y-4 flex-1">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Target Client Account *
                  </label>
                  <select
                    value={clientId || (clients[0]?.id ?? '')}
                    onChange={(e) => setClientId(e.target.value)}
                    required
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-[#FF3B00] focus:ring-1 focus:ring-[#FF3B00] outline-hidden font-medium"
                  >
                    {clients.length === 0 && <option value="">No clients found</option>}
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    {activeTab === 'shoot' ? 'Shoot Title / Location *' : 'Working Title *'}
                  </label>
                  <input
                    type="text"
                    placeholder={activeTab === 'shoot' ? 'e.g., Rooftop Pool Sunset Shoot' : 'e.g., Autumn Festival Promo Reel'}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-[#FF3B00] focus:ring-1 focus:ring-[#FF3B00] outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {activeTab === 'content' && (
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                        Format / Type
                      </label>
                      <select
                        value={type}
                        onChange={(e) => setType(e.target.value)}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-[#FF3B00] outline-hidden font-medium"
                      >
                        <option value="REEL">Reel / Short</option>
                        <option value="CAROUSEL">Carousel Post</option>
                        <option value="STATIC_POST">Static Graphic</option>
                        <option value="STORY">Story Series</option>
                        <option value="AD_CREATIVE">Ad Creative</option>
                        <option value="SHOOT">Shoot Day</option>
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                      Platform
                    </label>
                    <select
                      value={platform}
                      onChange={(e) => setPlatform(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-[#FF3B00] outline-hidden font-medium"
                    >
                      <option value="INSTAGRAM">Instagram</option>
                      <option value="FACEBOOK">Facebook</option>
                      <option value="TIKTOK">TikTok</option>
                      <option value="YOUTUBE">YouTube</option>
                      <option value="LINKEDIN">LinkedIn</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                      Status / Tracker Stage *
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-[#FF3B00] outline-hidden font-bold text-[#FF3B00]"
                    >
                      <option value="PLANNED">1. Planned</option>
                      <option value="SHOT">2. Shot</option>
                      <option value="EDITED">3. Edited</option>
                      <option value="CLIENT_APPROVAL">4. Client Approval</option>
                      <option value="SCHEDULED">5. Scheduled</option>
                      <option value="PUBLISHED">6. Published</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                      Target Date *
                    </label>
                    <input
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      required
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-[#FF3B00] outline-hidden font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Assign Lead Member
                  </label>
                  <select
                    value={assigneeId}
                    onChange={(e) => setAssigneeId(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-[#FF3B00] outline-hidden"
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
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Brief / Notes
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Key concept, script points, or equipment needed..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-[#FF3B00] outline-hidden"
                  />
                </div>

                </div>

                <div className="sticky bottom-0 bg-card border-t border-border pt-3 pb-1 z-10 flex justify-end gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setQuickAddOpen(false)}
                    className="px-4 py-2 text-xs font-semibold rounded-md border border-input hover:bg-muted transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2 text-xs font-bold rounded-md bg-[#FF3B00] text-white hover:bg-[#e03400] transition-all shadow-md clicky-btn cursor-pointer"
                  >
                    {loading ? 'Creating...' : activeTab === 'shoot' ? 'Schedule Shoot' : 'Add Content Item'}
                  </button>
                </div>
              </form>
            )}

            {/* Task Form */}
            {activeTab === 'task' && (
              <form onSubmit={handleSubmitAgencyTask} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 flex flex-col">
                <div className="space-y-4 flex-1">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Task Title *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Export drone clips for Sky Park"
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    required
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-[#FF3B00] outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                      Urgency Level
                    </label>
                    <select
                      value={taskUrgency}
                      onChange={(e) => setTaskUrgency(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-[#FF3B00] outline-hidden"
                    >
                      <option value="URGENT">🔴 Urgent (Immediate Action)</option>
                      <option value="HIGH">🟠 High Urgency</option>
                      <option value="MEDIUM">🟡 Medium Urgency</option>
                      <option value="LOW">⚪ Low Priority</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                      Due Date *
                    </label>
                    <input
                      type="date"
                      value={taskDueDate}
                      onChange={(e) => setTaskDueDate(e.target.value)}
                      required
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-[#FF3B00] outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                      Client (Optional)
                    </label>
                    <select
                      value={taskClientId}
                      onChange={(e) => setTaskClientId(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-[#FF3B00] outline-hidden"
                    >
                      <option value="">Internal Agency Task</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                      Assignee
                    </label>
                    <select
                      value={taskAssigneeId}
                      onChange={(e) => setTaskAssigneeId(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-[#FF3B00] outline-hidden"
                    >
                      <option value="">Unassigned</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.department})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Task Notes / Description <span className="text-[10px] lowercase text-muted-foreground font-mono">(optional)</span>
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Key deliverables, instructions, or checklist..."
                    value={taskDescription}
                    onChange={(e) => setTaskDescription(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-[#FF3B00] outline-hidden"
                  />
                </div>

                </div>

                <div className="sticky bottom-0 bg-card border-t border-border pt-3 pb-1 z-10 flex justify-end gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setQuickAddOpen(false)}
                    className="px-4 py-2 text-xs font-semibold rounded-md border border-input hover:bg-muted transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2 text-xs font-bold rounded-md bg-[#FF3B00] text-white hover:bg-[#e03400] transition-all shadow-md clicky-btn cursor-pointer"
                  >
                    {loading ? 'Creating...' : 'Create Agency Task'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
