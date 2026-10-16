'use client';

import React, { useState, useEffect } from 'react';
import { useImpersonation } from '@/components/providers';
import { hasPermission } from '@/lib/permissions';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  AlertTriangle,
  TrendingUp,
  CheckCircle2,
  Clock,
  Receipt,
  Building2,
  Filter,
  ArrowUpRight,
  Sparkles,
  Zap,
} from 'lucide-react';

export default function DashboardPage() {
  const { effectiveRoleName, effectivePermissions, refreshTrigger, openQuickAdd, cachedDashboard, setCachedDashboard } = useImpersonation();
  const isSuperAdmin = effectiveRoleName === 'Super Admin';
  const [data, setData] = useState<any>(() => cachedDashboard || null);
  const [loading, setLoading] = useState(() => !cachedDashboard);

  // Filters
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedAssignee, setSelectedAssignee] = useState('');
  const [selectedContentType, setSelectedContentType] = useState('');

  const canViewBilling = hasPermission(effectivePermissions, 'billing', 'view');

  useEffect(() => {
    if (cachedDashboard && !data && !selectedClient && !selectedDepartment && !selectedAssignee && !selectedContentType) {
      setData(cachedDashboard);
      setLoading(false);
    }
  }, [cachedDashboard, data, selectedClient, selectedDepartment, selectedAssignee, selectedContentType]);

  const fetchDashboard = () => {
    if (!data) setLoading(true);
    const params = new URLSearchParams();
    if (selectedClient) params.append('clientId', selectedClient);
    if (selectedDepartment) params.append('department', selectedDepartment);
    if (selectedAssignee) params.append('assigneeId', selectedAssignee);
    if (selectedContentType) params.append('contentType', selectedContentType);

    fetch(`/api/dashboard?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((resData) => {
        setData(resData);
        if (!selectedClient && !selectedDepartment && !selectedAssignee && !selectedContentType) {
          setCachedDashboard(resData);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch dashboard data:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchDashboard();
  }, [selectedClient, selectedDepartment, selectedAssignee, selectedContentType, refreshTrigger]);

  if (loading && !data) {
    return (
      <div className="flex h-96 w-full items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#FF3B00] border-t-transparent" />
          <p className="text-xs font-mono text-muted-foreground">Loading Agency Intelligence...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Title & Filters Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            AGENCY DASHBOARD <Zap className="h-5 w-5 text-[#FF3B00]" />
          </h1>
          <p className="text-xs text-muted-foreground font-mono">
            Kathmandu HQ — Client Account Progress, Deliverables & Urgency Stream
          </p>
        </div>

        {/* Global Dashboard Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 text-xs font-semibold text-muted-foreground mr-1">
            <Filter className="h-3.5 w-3.5 text-[#FF3B00]" /> Filters:
          </div>

          <select
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
            className="rounded-md border border-input bg-card px-2.5 py-1 text-xs font-medium text-foreground outline-hidden focus:border-[#FF3B00]"
          >
            <option value="">All Clients</option>
            {(data?.allClients || data?.clientHealthCards)?.map((c: any) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="rounded-md border border-input bg-card px-2.5 py-1 text-xs font-medium text-foreground outline-hidden focus:border-[#FF3B00]"
          >
            <option value="">All Departments</option>
            <option value="Social Media">Social Media</option>
            <option value="Content Production">Content Production</option>
            <option value="Ads">Ads Manager</option>
            <option value="Client Servicing">Client Servicing</option>
          </select>

          <select
            value={selectedContentType}
            onChange={(e) => setSelectedContentType(e.target.value)}
            className="rounded-md border border-input bg-card px-2.5 py-1 text-xs font-medium text-foreground outline-hidden focus:border-[#FF3B00]"
          >
            <option value="">All Types</option>
            <option value="REEL">Reels</option>
            <option value="SHOOT">Shoots</option>
            <option value="CAROUSEL">Carousels</option>
            <option value="STATIC_POST">Static Posts</option>
            <option value="AD_CREATIVE">Ad Creatives</option>
          </select>

          {(selectedClient || selectedDepartment || selectedContentType) && (
            <button
              onClick={() => {
                setSelectedClient('');
                setSelectedDepartment('');
                setSelectedContentType('');
              }}
              className="text-[11px] font-mono text-[#FF3B00] hover:underline px-1"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* BILLING SNAPSHOT WIDGET (Billing Access Only) */}
      {canViewBilling && data?.billingSnapshot && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Revenue Expected
              </span>
              <Receipt className="h-4 w-4 text-[#FF3B00]" />
            </div>
            <div className="mt-2 text-2xl font-black text-foreground">
              NPR {data.billingSnapshot.totalRevenueExpected.toLocaleString()}
            </div>
            <span className="text-[11px] font-mono text-muted-foreground">Across active client retainers</span>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Revenue Collected
              </span>
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="mt-2 text-2xl font-black text-emerald-500">
              NPR {data.billingSnapshot.totalRevenueCollected.toLocaleString()}
            </div>
            <span className="text-[11px] font-mono text-muted-foreground">Cleared in bank accounts</span>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Outstanding Balance
              </span>
              <Clock className="h-4 w-4 text-amber-500" />
            </div>
            <div className="mt-2 text-2xl font-black text-amber-500">
              NPR {data.billingSnapshot.outstandingAmount.toLocaleString()}
            </div>
            <span className="text-[11px] font-mono text-muted-foreground">Pending invoices</span>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Overdue Invoices
              </span>
              <AlertTriangle className="h-4 w-4 text-rose-500" />
            </div>
            <div className="mt-2 text-2xl font-black text-rose-500">
              {data.billingSnapshot.overdueCount} Invoices
            </div>
            <span className="text-[11px] font-mono text-rose-400 font-semibold">Immediate follow-up required</span>
          </div>
        </div>
      )}

      {/* "URGENT RIGHT NOW" WIDGET */}
      <div className="rounded-xl border-2 border-border bg-card p-5 shadow-md">
        <div className="flex items-center justify-between mb-4 border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-[#FF3B00] animate-ping" />
            <h2 className="font-extrabold text-base tracking-tight text-foreground flex items-center gap-2">
              URGENT RIGHT NOW <span className="text-xs font-mono bg-[#FF3B00] text-white px-2 py-0.5 rounded">Action Queue</span>
            </h2>
          </div>
          <button
            onClick={() => openQuickAdd('task')}
            className="text-xs font-bold text-[#FF3B00] hover:underline flex items-center gap-1"
          >
            + New Task
          </button>
        </div>

        {data?.urgentTasks?.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground font-mono">
            🎉 All urgent tasks are clear! No overdue items.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {data?.urgentTasks?.map((task: any) => (
              <div
                key={task.id}
                className={`rounded-lg p-3.5 border transition-all hover:scale-[1.01] ${
                  task.isOverdue
                    ? 'border-rose-500/80 bg-rose-500/10 shadow-xs'
                    : 'border-border bg-muted/30 hover:border-[#FF3B00]'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                      task.urgency === 'URGENT'
                        ? 'bg-[#FF3B00] text-white'
                        : task.urgency === 'HIGH'
                        ? 'bg-amber-500 text-white'
                        : 'bg-zinc-700 text-white'
                    }`}
                  >
                    {task.isOverdue ? 'OVERDUE' : task.urgency}
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    Due {new Date(task.dueDate).toLocaleDateString()}
                  </span>
                </div>

                <h3 className="font-bold text-xs text-foreground line-clamp-2">{task.title}</h3>

                {task.client && (
                  <div className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: task.client.color }}
                    />
                    <span className="truncate">{task.client.name}</span>
                  </div>
                )}

                {task.assignee && (
                  <div className="mt-2 pt-2 border-t border-border/50 flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>Assignee:</span>
                    <span className="font-semibold text-foreground">{task.assignee.name}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CHARTS GRID SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* BAR CHART: Monthly Progress Per Client */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-extrabold text-sm tracking-tight text-foreground">
                MONTHLY DELIVERABLES PER CLIENT
              </h2>
              <p className="text-[11px] text-muted-foreground font-mono">Planned vs. Completed shoots, reels & posts</p>
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.clientProgressChart || []} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    borderColor: 'var(--border)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="Completed" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Planned" fill="#FF3B00" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* DONUT CHART: Content Status Breakdown */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="font-extrabold text-sm tracking-tight text-foreground">
                CONTENT PIPELINE BREAKDOWN
              </h2>
              <p className="text-[11px] text-muted-foreground font-mono">Status distribution of all items</p>
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data?.statusDonutData || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {(data?.statusDonutData || []).map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    borderColor: 'var(--border)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* LINE CHART: Team Output Over Time */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-extrabold text-sm tracking-tight text-foreground">
              TEAM OUTPUT VELOCITY OVER TIME
            </h2>
            <p className="text-[11px] text-muted-foreground font-mono">Completed items per week across team members</p>
          </div>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data?.weeklyOutputData || []} margin={{ top: 10, right: 30, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--card)',
                  borderColor: 'var(--border)',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Line type="monotone" dataKey="Completed" stroke="#FF3B00" strokeWidth={3} dot={{ r: 5 }} />
              <Line type="monotone" dataKey="InProgress" stroke="#3B82F6" strokeWidth={2} strokeDasharray="5 5" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* CLIENT HEALTH CARDS GRID */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-extrabold text-sm tracking-tight text-foreground flex items-center gap-2">
            CLIENT ACCOUNT HEALTH SNAPSHOT <Building2 className="h-4 w-4 text-[#FF3B00]" />
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.clientHealthCards?.map((client: any) => (
            <div
              key={client.id}
              className="rounded-xl border border-border bg-card p-4 shadow-xs hover:border-[#FF3B00] transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="h-9 w-9 rounded-lg flex items-center justify-center font-bold text-white shadow-xs"
                    style={{ backgroundColor: client.color }}
                  >
                    {client.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-foreground line-clamp-1">{client.name}</h3>
                    <span className="text-[10px] font-mono text-muted-foreground">{client.packageTier} Tier</span>
                  </div>
                </div>

                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    client.health === 'on-track'
                      ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                      : client.health === 'behind-schedule'
                      ? 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
                      : 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                  }`}
                >
                  {client.health.replace('-', ' ')}
                </span>
              </div>

              {/* Progress bar */}
              <div className="mt-4 space-y-1.5">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-muted-foreground">Deliverables Progress:</span>
                  <span className="font-bold text-foreground">{client.completionRate}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${client.completionRate}%`,
                      backgroundColor: client.color,
                    }}
                  />
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-border flex justify-between items-center text-xs font-mono text-muted-foreground">
                <span>
                  Retainer: {isSuperAdmin ? `NPR ${client.monthlyRetainer.toLocaleString()}` : '••••••'}
                </span>
                <a
                  href={`/clients?id=${client.id}`}
                  className="text-[#FF3B00] font-bold flex items-center gap-0.5 hover:underline"
                >
                  View <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
