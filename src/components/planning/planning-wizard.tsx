'use client';

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Wand2, Plus, Trash2, Copy, Check } from 'lucide-react';
import { getTodayLocalDateKey } from '@/lib/date-utils';

interface WizardRow {
  type: string;
  platform: string;
  title: string;
  scheduledDate: string;
  assigneeId: string;
  status: string;
}

interface PlanningWizardProps {
  clients: any[];
  users: any[];
  onComplete: () => void;
}

export function PlanningWizard({ clients, users, onComplete }: PlanningWizardProps) {
  const currentMonthStr = format(new Date(), 'yyyy-MM');
  const [wizardClientId, setWizardClientId] = useState(clients[0]?.id || '');
  const [wizardMonth, setWizardMonth] = useState(currentMonthStr);
  const [wizardRows, setWizardRows] = useState<WizardRow[]>([
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

  useEffect(() => {
    if (!wizardClientId && clients.length > 0) {
      setWizardClientId(clients[0].id);
    }
  }, [clients, wizardClientId]);

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
        onComplete();
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

  return (
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
            type="button"
            onClick={() => applyTemplate('standard')}
            className="px-2.5 py-1 text-xs font-semibold rounded bg-muted hover:bg-muted/80 text-foreground border border-border cursor-pointer"
          >
            Standard (8 posts + 1 shoot)
          </button>
          <button
            type="button"
            onClick={() => applyTemplate('heavy-reels')}
            className="px-2.5 py-1 text-xs font-semibold rounded bg-muted hover:bg-muted/80 text-foreground border border-border cursor-pointer"
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
  );
}
