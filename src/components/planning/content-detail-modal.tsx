'use client';

import React, { useState, useEffect } from 'react';
import { Check, Trash2, X, Calendar, Download, ExternalLink } from 'lucide-react';
import { toLocalDateKey } from '@/lib/date-utils';
import { generateIcsCalendar, getGoogleCalendarUrl, downloadIcsFile, ShootCalendarEvent } from '@/lib/ics-generator';

interface ContentDetailModalProps {
  item: any | null;
  isOpen: boolean;
  onClose: () => void;
  clients: any[];
  users: any[];
  onSave: (updatedData: any) => Promise<void>;
  onDelete: (itemId: string) => Promise<void>;
  isSaving: boolean;
  isDeleting: boolean;
}

export function ContentDetailModal({
  item,
  isOpen,
  onClose,
  clients,
  users,
  onSave,
  onDelete,
  isSaving,
  isDeleting,
}: ContentDetailModalProps) {
  const [title, setTitle] = useState('');
  const [isPersonal, setIsPersonal] = useState(false);
  const [type, setType] = useState('REEL');
  const [platform, setPlatform] = useState('INSTAGRAM');
  const [status, setStatus] = useState('PLANNED');
  const [scheduledDate, setScheduledDate] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientFeedbackNotes, setClientFeedbackNotes] = useState('');

  useEffect(() => {
    if (item) {
      setTitle(item.title || '');
      setIsPersonal(Boolean(item.isPersonal));
      setType(item.type || 'REEL');
      setPlatform(item.platform || 'INSTAGRAM');
      setStatus(item.status || 'PLANNED');
      setScheduledDate(item.scheduledDate ? toLocalDateKey(item.scheduledDate) : '');
      setAssigneeId(item.assigneeId || item.assignee?.id || '');
      setClientId(item.clientId || item.client?.id || '');
      setClientFeedbackNotes(item.clientFeedbackNotes || '');
    }
  }, [item, isOpen]);

  const handleExportIcs = () => {
    if (!item || !scheduledDate) return;
    const client = clients.find((c) => c.id === clientId) || item.client;
    const assignee = users.find((u) => u.id === assigneeId) || item.assignee;

    const event: ShootCalendarEvent = {
      id: item.id,
      title: title || item.title,
      description: clientFeedbackNotes || item.description,
      clientName: client?.name,
      clientColor: client?.color,
      scheduledDate,
      durationMinutes: 180,
      location: item.location || 'Kathmandu, Nepal',
      assigneeName: assignee?.name,
      assigneeEmail: assignee?.email,
      status,
    };

    const icsContent = generateIcsCalendar([event], `${client?.name || 'TrexoByte'} Shoot`);
    downloadIcsFile(`shoot-${(title || 'session').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.ics`, icsContent);
  };

  const handleGoogleCalendar = () => {
    if (!item || !scheduledDate) return;
    const client = clients.find((c) => c.id === clientId) || item.client;
    const assignee = users.find((u) => u.id === assigneeId) || item.assignee;

    const event: ShootCalendarEvent = {
      id: item.id,
      title: title || item.title,
      description: clientFeedbackNotes || item.description,
      clientName: client?.name,
      scheduledDate,
      durationMinutes: 180,
      location: item.location || 'Kathmandu, Nepal',
      assigneeName: assignee?.name,
      status,
    };

    const url = getGoogleCalendarUrl(event);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (!isOpen || !item) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({
      id: item.id,
      title,
      type: isPersonal ? 'PERSONAL' : type,
      platform: isPersonal ? 'PERSONAL' : platform,
      status,
      scheduledDate: scheduledDate || null,
      assigneeId: assigneeId || null,
      clientId: isPersonal ? null : clientId || null,
      isPersonal,
      clientFeedbackNotes,
    });
  };

  const currentClient = clients.find((c) => c.id === clientId) || item.client;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-200"
    >
      <div className="w-full max-w-xl bg-card border-2 border-border shadow-2xl rounded-xl p-5 sm:p-6 space-y-4 max-h-[92vh] flex flex-col">
        <div className="flex justify-between items-center border-b border-border pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <span
              className="px-2.5 py-0.5 rounded text-[10px] font-bold text-white uppercase"
              style={{
                backgroundColor: isPersonal
                  ? '#8B5CF6'
                  : currentClient?.color || '#FF3B00',
              }}
            >
              {isPersonal
                ? '🔒 Personal Item'
                : currentClient?.name || 'Client'}
            </span>
            <h3 className="font-extrabold text-base text-foreground">
              {isPersonal ? 'Edit Personal Calendar Item' : 'Edit Content Deliverable'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
            title="Close (Esc)"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 text-xs pr-1 flex flex-col">
          <div className="space-y-4 flex-1">
            <div>
              <label className="block font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Deliverable Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 text-sm font-semibold rounded-md border border-input bg-background focus:outline-hidden focus:ring-2 focus:ring-[#FF3B00]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Target Destination / Client *
                </label>
                <select
                  value={isPersonal ? '__PERSONAL__' : clientId}
                  onChange={(e) => {
                    if (e.target.value === '__PERSONAL__') {
                      setIsPersonal(true);
                      setClientId('');
                    } else {
                      setIsPersonal(false);
                      setClientId(e.target.value);
                    }
                  }}
                  className={`w-full px-3 py-2 rounded-md border bg-background font-medium focus:outline-hidden focus:ring-2 focus:ring-[#FF3B00] ${
                    isPersonal ? 'border-purple-500/50 bg-purple-500/5 text-purple-400 font-bold' : 'border-input'
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

            {isPersonal ? (
              <div className="space-y-4 rounded-lg bg-purple-500/10 border border-purple-500/30 p-3.5">
                <div className="text-xs text-purple-300 font-semibold flex items-center gap-1.5">
                  <span>🔒 Personal / Private Item</span>
                  <span className="text-[10px] font-mono text-purple-300/80">
                    (Only visible in your personal calendar view)
                  </span>
                </div>
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Target Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-input bg-background font-medium focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Personal Notes / Description{' '}
                    <span className="text-[10px] font-mono lowercase text-muted-foreground">(optional)</span>
                  </label>
                  <textarea
                    rows={3}
                    value={clientFeedbackNotes}
                    onChange={(e) => setClientFeedbackNotes(e.target.value)}
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
                      value={assigneeId}
                      onChange={(e) => setAssigneeId(e.target.value)}
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
                      value={type}
                      onChange={(e) => setType(e.target.value)}
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
                      value={platform}
                      onChange={(e) => setPlatform(e.target.value)}
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
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
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
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
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
                    value={clientFeedbackNotes}
                    onChange={(e) => setClientFeedbackNotes(e.target.value)}
                    placeholder="Enter feedback, caption instructions, or client revisions..."
                    className="w-full px-3 py-2 rounded-md border border-amber-500/40 bg-amber-500/5 focus:outline-hidden focus:ring-2 focus:ring-amber-500 text-foreground font-medium"
                  />
                </div>

                {/* Calendar Synchronization & ICS Export */}
                {scheduledDate && (
                  <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 font-mono">
                        <Calendar className="h-3.5 w-3.5 text-[#FF3B00]" />
                        Calendar Synchronization (RFC 5545)
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground">Asia/Kathmandu (UTC+5:45)</span>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleGoogleCalendar}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground transition-colors cursor-pointer"
                        title="Open Google Calendar to add this event"
                      >
                        <ExternalLink className="h-3.5 w-3.5 text-blue-500" />
                        <span>Add to Google Calendar</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleExportIcs}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground transition-colors cursor-pointer"
                        title="Download RFC 5545 .ics file for Apple/Outlook/Google Calendar"
                      >
                        <Download className="h-3.5 w-3.5 text-[#FF3B00]" />
                        <span>Download .ics File</span>
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="sticky bottom-0 bg-card border-t border-border pt-3 mt-auto shrink-0 flex justify-between items-center">
            <button
              type="button"
              onClick={() => onDelete(item.id)}
              disabled={isDeleting}
              className="flex items-center gap-1.5 px-3 py-2 rounded-md text-red-500 hover:bg-red-500/10 font-bold transition-colors cursor-pointer"
            >
              <Trash2 className="h-4 w-4" />
              {isDeleting ? 'Deleting...' : 'Delete Deliverable'}
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-md font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 px-5 py-2 rounded-md bg-[#FF3B00] text-white font-bold hover:bg-[#e03400] transition-all shadow-md clicky-btn cursor-pointer"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
                <Check className="h-4 w-4" />
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
