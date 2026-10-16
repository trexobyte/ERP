'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useImpersonation } from '@/components/providers';
import { hasPermission } from '@/lib/permissions';
import {
  LayoutDashboard,
  Calendar,
  Users2,
  Kanban,
  CheckSquare,
  Receipt,
  ShieldAlert,
  FileBarChart,
  ChevronLeft,
  ChevronRight,
  Zap,
  Building2,
  Camera,
} from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { data: session } = useSession();
  const { effectivePermissions, effectiveRoleName, openProfileModal, refreshTrigger } = useImpersonation();
  const [currentAvatar, setCurrentAvatar] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/users')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const sessionUserId = (session?.user as any)?.id;
          const sessionUserEmail = session?.user?.email;
          const current =
            data.find((u: any) => u.id === sessionUserId) ||
            data.find((u: any) => u.email === sessionUserEmail) ||
            data[0];

          if (current) {
            setCurrentAvatar(current.avatar || null);
            setCurrentUserName(current.name || null);
          }
        }
      })
      .catch(() => {});
  }, [session, refreshTrigger]);

  const navItems = [
    {
      label: 'Dashboard',
      href: '/',
      icon: LayoutDashboard,
      module: 'dashboard',
    },
    {
      label: 'Planning & Calendar',
      href: '/planning',
      icon: Calendar,
      module: 'calendar',
    },
    {
      label: 'Clients & Accounts',
      href: '/clients',
      icon: Building2,
      module: 'clients',
    },
    {
      label: 'Content Tracker',
      href: '/tracker',
      icon: Kanban,
      module: 'tracker',
    },
    {
      label: 'Tasks & Urgency',
      href: '/tasks',
      icon: CheckSquare,
      module: 'tasks',
    },
    {
      label: 'Billing & Invoices',
      href: '/billing',
      icon: Receipt,
      module: 'billing',
    },
    {
      label: 'User & Role Access',
      href: '/users',
      icon: ShieldAlert,
      module: 'users',
    },
    {
      label: 'Reports & Analytics',
      href: '/reports',
      icon: FileBarChart,
      module: 'reports',
    },
  ];

  return (
    <aside
      className={`relative flex flex-col border-r border-border bg-card transition-all duration-300 z-30 select-none ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between border-b border-border px-4">
        {!collapsed ? (
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FF3B00] text-white font-black text-sm tracking-tighter group-hover:scale-105 transition-transform shadow-xs">
              TB
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold tracking-tight text-sm text-foreground flex items-center gap-1">
                TREXOBYTE <span className="text-[10px] uppercase bg-[#FF3B00]/10 text-[#FF3B00] font-mono px-1 rounded">ERP</span>
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">KATHMANDU HQ</span>
            </div>
          </Link>
        ) : (
          <Link href="/" className="mx-auto">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FF3B00] text-white font-black text-base shadow-xs">
              TB
            </div>
          </Link>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Role Badge Indicator */}
      {!collapsed && (
        <div className="mx-3 mt-3 px-3 py-2 rounded-md bg-secondary/60 border border-border/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-3.5 w-3.5 text-[#FF3B00]" />
            <span className="text-xs font-semibold tracking-tight text-foreground truncate max-w-[140px]">
              {effectiveRoleName}
            </span>
          </div>
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        </div>
      )}

      {/* Navigation Items */}
      <nav className="flex-1 space-y-1 p-2 overflow-y-auto">
        {navItems.map((item) => {
          const isAllowed = hasPermission(effectivePermissions, item.module as any, 'view');
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

          if (!isAllowed) return null;

          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-[#FF3B00] text-white font-bold shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              } ${collapsed ? 'justify-center px-0' : ''}`}
              title={collapsed ? item.label : undefined}
            >
              <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-foreground/80'}`} />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Current User Profile & DP Widget */}
      <div className="border-t border-border p-2">
        <button
          onClick={openProfileModal}
          className={`group w-full flex items-center gap-3 p-2 rounded-xl border border-border/60 bg-muted/30 hover:bg-[#FF3B00]/10 hover:border-[#FF3B00]/40 transition-all text-left cursor-pointer ${
            collapsed ? 'justify-center p-1.5' : ''
          }`}
          title="My Profile - Click to Change Display Picture"
        >
          <div className="relative shrink-0">
            <div className="h-8 w-8 rounded-full overflow-hidden border border-[#FF3B00] bg-background">
              <img
                src={
                  currentAvatar ||
                  (session?.user as any)?.avatar ||
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
                }
                alt="Profile"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <Camera className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 border border-background" />
          </div>

          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-foreground truncate group-hover:text-[#FF3B00] transition-colors">
                  {currentUserName || session?.user?.name || 'Ketan Shrestha'}
                </span>
                <Camera className="h-3 w-3 text-muted-foreground group-hover:text-[#FF3B00] transition-colors shrink-0" />
              </div>
              <span className="text-[10px] text-muted-foreground font-mono block truncate">
                Change Picture / DP
              </span>
            </div>
          )}
        </button>
      </div>

      {/* Footer Info */}
      {!collapsed && (
        <div className="border-t border-border/50 px-3 py-2">
          <div className="rounded-lg bg-muted/40 p-2 text-[10px] font-mono text-muted-foreground flex flex-col gap-0.5 border border-border/40">
            <div className="flex justify-between items-center">
              <span>Agency Team:</span>
              <span className="font-bold text-foreground">15+ Active</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Status:</span>
              <span className="text-emerald-500 font-semibold">Online (Kathmandu)</span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
