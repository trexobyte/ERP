'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useImpersonation } from '@/components/providers';
import { hasPermission } from '@/lib/permissions';
import {
  LayoutDashboard,
  Calendar,
  Kanban,
  CheckSquare,
  Menu,
} from 'lucide-react';

export function MobileBottomNav() {
  const pathname = usePathname();
  const { effectivePermissions, toggleMobileMenu } = useImpersonation();

  const canViewDashboard = hasPermission(effectivePermissions, 'dashboard', 'view');
  const canViewCalendar = hasPermission(effectivePermissions, 'calendar', 'view');
  const canViewTracker = hasPermission(effectivePermissions, 'tracker', 'view');
  const canViewTasks = hasPermission(effectivePermissions, 'tasks', 'view');

  const navItems = [
    {
      label: 'Dashboard',
      href: '/',
      icon: LayoutDashboard,
      allowed: canViewDashboard,
      active: pathname === '/',
    },
    {
      label: 'Calendar',
      href: '/planning',
      icon: Calendar,
      allowed: canViewCalendar,
      active: pathname.startsWith('/planning'),
    },
    {
      label: 'Tracker',
      href: '/tracker',
      icon: Kanban,
      allowed: canViewTracker,
      active: pathname.startsWith('/tracker'),
    },
    {
      label: 'Tasks',
      href: '/tasks',
      icon: CheckSquare,
      allowed: canViewTasks,
      active: pathname.startsWith('/tasks'),
    },
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border md:hidden shadow-lg pb-[env(safe-area-inset-bottom,0px)]"
    >
      <div className="grid grid-cols-5 items-center h-14 sm:h-16 px-1">
        {navItems.map((item) => {
          if (!item.allowed) {
            return (
              <div
                key={item.label}
                className="flex flex-col items-center justify-center opacity-30 select-none py-1"
              >
                <item.icon className="h-5 w-5 text-muted-foreground" />
                <span className="text-[10px] font-medium text-muted-foreground mt-0.5">
                  {item.label}
                </span>
              </div>
            );
          }

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 rounded-lg transition-all relative ${
                item.active
                  ? 'text-[#FF3B00] font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <item.icon className={`h-5 w-5 ${item.active ? 'scale-110' : ''} transition-transform`} />
              <span className="text-[10px] font-medium tracking-tight mt-0.5 leading-none">
                {item.label}
              </span>
              {item.active && (
                <span className="absolute top-1 right-1/4 h-1.5 w-1.5 rounded-full bg-[#FF3B00]" />
              )}
            </Link>
          );
        })}

        {/* More Menu Trigger (Opens Sidebar Drawer) */}
        <button
          type="button"
          onClick={toggleMobileMenu}
          className="flex flex-col items-center justify-center py-1 text-muted-foreground hover:text-foreground transition-all cursor-pointer"
          title="More ERP modules (Clients, Billing, Users, Reports)"
          aria-label="Open More Modules"
        >
          <Menu className="h-5 w-5" />
          <span className="text-[10px] font-medium tracking-tight mt-0.5 leading-none">
            More
          </span>
        </button>
      </div>
    </nav>
  );
}
