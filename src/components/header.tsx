'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useImpersonation, useTheme } from '@/components/providers';
import { useRouter } from 'next/navigation';
import {
  Search,
  Sun,
  Moon,
  Plus,
  LogOut,
  UserCheck,
  ChevronDown,
  Sparkles,
  ShieldAlert,
  History,
  Building2,
  Calendar,
  CheckSquare,
  Receipt,
  X,
  User,
  Camera,
  Menu,
} from 'lucide-react';
import { AuditHistoryModal } from '@/components/audit-history-modal';

export function Header() {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const {
    openQuickAdd,
    effectiveRoleName,
    impersonatedRoleName,
    setImpersonatedRole,
    openProfileModal,
    refreshTrigger,
    toggleMobileMenu,
  } = useImpersonation();

  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchResults, setSearchResults] = useState<{
    clients: any[];
    content: any[];
    tasks: any[];
    invoices: any[];
  }>({ clients: [], content: [], tasks: [], invoices: [] });
  const [searching, setSearching] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const roleMenuRef = useRef<HTMLDivElement>(null);

  const rolesList = [
    'Super Admin',
    'Manager',
    'Social Media Manager',
    'Content/Shoot Manager',
    'Ads Manager',
    'Client Communication',
    'Billing/Finance',
    'Viewer',
  ];

  const user = session?.user as any;
  const isSuperAdmin = user?.roleName === 'Super Admin' || user?.roleName === 'Manager';

  const [currentAvatar, setCurrentAvatar] = useState<string | null>(user?.avatar || null);
  const [currentUserName, setCurrentUserName] = useState<string | null>(user?.name || null);

  // Synchronize avatar & name from session
  useEffect(() => {
    const u = session?.user as any;
    if (u) {
      if (u.avatar) setCurrentAvatar(u.avatar);
      if (u.name) setCurrentUserName(u.name);
    }
  }, [session]);

  // Search API fetch effect
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults({ clients: [], content: [], tasks: [], invoices: [] });
      return;
    }

    const timer = setTimeout(() => {
      setSearching(true);
      fetch(`/api/search?q=${encodeURIComponent(searchQuery.trim())}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) setSearchResults(data);
          setSearching(false);
        })
        .catch(() => setSearching(false));
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click outside listener for search popup, user menu, role menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSearchModal(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
      if (roleMenuRef.current && !roleMenuRef.current.contains(e.target as Node)) {
        setShowRoleMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const totalResults =
    searchResults.clients.length +
    searchResults.content.length +
    searchResults.tasks.length +
    searchResults.invoices.length;

  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-border bg-card/90 backdrop-blur-md px-3 sm:px-6 gap-2 sm:gap-4">
      {/* Mobile Hamburger Toggle Button */}
      <button
        type="button"
        onClick={toggleMobileMenu}
        className="p-2 -ml-1 rounded-lg text-foreground hover:bg-muted md:hidden cursor-pointer shrink-0 transition-colors"
        title="Open Navigation Menu"
        aria-label="Open Navigation Menu"
      >
        <Menu className="h-5 w-5 text-foreground" />
      </button>

      {/* Global Search Bar */}
      <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0 max-w-[200px] xs:max-w-xs sm:max-w-md" ref={searchContainerRef}>
        <div className="relative w-full">
          <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 h-3.5 sm:h-4 w-3.5 sm:w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearchModal(true);
            }}
            onFocus={() => setShowSearchModal(true)}
            className="w-full rounded-md border border-input bg-background pl-8 sm:pl-9 pr-7 sm:pr-8 py-1.5 text-xs focus:border-[#FF3B00] focus:ring-1 focus:ring-[#FF3B00] outline-hidden transition-all truncate"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setShowSearchModal(false);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          )}

          {/* Search Dropdown Overlay */}
          {showSearchModal && searchQuery.trim().length >= 2 && (
            <div className="absolute left-0 right-0 top-full mt-2 rounded-xl border border-border bg-card shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 max-h-[80vh] overflow-y-auto">
              {searching ? (
                <div className="p-4 text-center text-xs text-muted-foreground font-mono">
                  Searching agency database...
                </div>
              ) : totalResults === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground font-mono">
                  No matching clients, content, tasks or invoices found for "{searchQuery}".
                </div>
              ) : (
                <div className="p-2 space-y-3 divide-y divide-border/50 text-xs">
                  {/* Clients */}
                  {searchResults.clients.length > 0 && (
                    <div className="pt-1">
                      <div className="px-2 py-1 text-[10px] font-mono font-bold text-muted-foreground uppercase flex items-center gap-1">
                        <Building2 className="h-3 w-3 text-[#FF3B00]" /> Client Accounts ({searchResults.clients.length})
                      </div>
                      <div className="space-y-1 mt-1">
                        {searchResults.clients.map((c) => (
                          <div
                            key={c.id}
                            onClick={() => {
                              router.push('/clients');
                              setShowSearchModal(false);
                            }}
                            className="flex items-center justify-between p-2 rounded-md hover:bg-muted cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                              <span className="font-bold text-foreground">{c.name}</span>
                            </div>
                            <span className="text-[10px] font-mono text-muted-foreground">{c.servicePackage}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Content Items */}
                  {searchResults.content.length > 0 && (
                    <div className="pt-2">
                      <div className="px-2 py-1 text-[10px] font-mono font-bold text-muted-foreground uppercase flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-blue-500" /> Content Deliverables ({searchResults.content.length})
                      </div>
                      <div className="space-y-1 mt-1">
                        {searchResults.content.map((item) => (
                          <div
                            key={item.id}
                            onClick={() => {
                              router.push('/tracker');
                              setShowSearchModal(false);
                            }}
                            className="flex items-center justify-between p-2 rounded-md hover:bg-muted cursor-pointer transition-colors"
                          >
                            <div>
                              <p className="font-bold text-foreground">{item.title}</p>
                              <p className="text-[10px] text-muted-foreground font-mono">
                                {item.client?.name} • {item.platform}
                              </p>
                            </div>
                            <span className="text-[10px] font-mono font-bold text-[#FF3B00] bg-[#FF3B00]/10 px-2 py-0.5 rounded">
                              {item.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tasks */}
                  {searchResults.tasks.length > 0 && (
                    <div className="pt-2">
                      <div className="px-2 py-1 text-[10px] font-mono font-bold text-muted-foreground uppercase flex items-center gap-1">
                        <CheckSquare className="h-3 w-3 text-amber-500" /> Action Tasks ({searchResults.tasks.length})
                      </div>
                      <div className="space-y-1 mt-1">
                        {searchResults.tasks.map((task) => (
                          <div
                            key={task.id}
                            onClick={() => {
                              router.push('/tasks');
                              setShowSearchModal(false);
                            }}
                            className="flex items-center justify-between p-2 rounded-md hover:bg-muted cursor-pointer transition-colors"
                          >
                            <div>
                              <p className="font-bold text-foreground">{task.title}</p>
                              <p className="text-[10px] text-muted-foreground font-mono">
                                {task.client?.name || 'General Task'}
                              </p>
                            </div>
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500">
                              {task.urgency}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Invoices */}
                  {searchResults.invoices.length > 0 && (
                    <div className="pt-2">
                      <div className="px-2 py-1 text-[10px] font-mono font-bold text-muted-foreground uppercase flex items-center gap-1">
                        <Receipt className="h-3 w-3 text-emerald-500" /> Billing Invoices ({searchResults.invoices.length})
                      </div>
                      <div className="space-y-1 mt-1">
                        {searchResults.invoices.map((inv) => (
                          <div
                            key={inv.id}
                            onClick={() => {
                              router.push('/billing');
                              setShowSearchModal(false);
                            }}
                            className="flex items-center justify-between p-2 rounded-md hover:bg-muted cursor-pointer transition-colors"
                          >
                            <div>
                              <p className="font-bold text-foreground">{inv.invoiceNumber} - NPR {inv.amount.toLocaleString()}</p>
                              <p className="text-[10px] text-muted-foreground font-mono">{inv.client?.name} • {inv.billingPeriod}</p>
                            </div>
                            <span className="text-[10px] font-mono font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                              {inv.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Action Bar */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* Role Impersonator Selector */}
        {isSuperAdmin && (
          <div className="relative">
            <button
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              className={`flex items-center gap-1.5 rounded-md px-2 sm:px-2.5 py-1.5 text-xs font-semibold border transition-all ${
                impersonatedRoleName
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-400'
                  : 'bg-muted/50 border-border text-foreground hover:bg-muted'
              }`}
              title="Preview App as different Role"
            >
              <ShieldAlert className="h-3.5 w-3.5 text-[#FF3B00]" />
              <span className="hidden md:inline text-[11px] font-mono">
                {impersonatedRoleName ? `Preview: ${impersonatedRoleName}` : `Role: ${effectiveRoleName}`}
              </span>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </button>

            {showRoleMenu && (
              <div className="absolute right-0 mt-2 w-56 rounded-lg border border-border bg-card shadow-xl py-1 z-50 text-xs animate-in fade-in zoom-in-95">
                <div className="px-3 py-2 border-b border-border font-bold text-muted-foreground flex justify-between items-center">
                  <span>Impersonate Role View</span>
                  {impersonatedRoleName && (
                    <button
                      onClick={() => {
                        setImpersonatedRole(null);
                        setShowRoleMenu(false);
                      }}
                      className="text-[10px] text-[#FF3B00] hover:underline"
                    >
                      Reset
                    </button>
                  )}
                </div>
                {rolesList.map((r) => (
                  <button
                    key={r}
                    onClick={() => {
                      setImpersonatedRole(r === user?.roleName ? null : r);
                      setShowRoleMenu(false);
                    }}
                    className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-muted transition-colors ${
                      effectiveRoleName === r ? 'font-bold text-[#FF3B00] bg-[#FF3B00]/10' : 'text-foreground'
                    }`}
                  >
                    <span>{r}</span>
                    {effectiveRoleName === r && <UserCheck className="h-3.5 w-3.5 text-[#FF3B00]" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Changes Made / Audit History Button - Super Admin Only */}
        {(effectiveRoleName === 'Super Admin' || (session?.user as any)?.roleName === 'Super Admin') && (
          <button
            onClick={() => setShowHistoryModal(true)}
            className="hidden sm:flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-muted hover:border-[#FF3B00]/40 transition-all cursor-pointer"
            title="View Edit History & Changes Made (Super Admin Only)"
          >
            <History className="h-4 w-4 text-[#FF3B00]" />
            <span className="hidden md:inline">Changes Made</span>
          </button>
        )}

        {/* Theme Toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="rounded-md border border-border bg-background p-1.5 sm:p-2 text-foreground hover:bg-muted transition-colors"
          title="Toggle Light/Dark Theme"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-700" />}
        </button>

        {/* Header "+ Add" Trigger (Always visible and clear) */}
        <button
          onClick={() => openQuickAdd('content')}
          className="flex items-center gap-1.5 rounded-md bg-[#FF3B00] px-2.5 sm:px-3 py-1.5 text-xs font-bold text-white hover:bg-[#e03400] transition-all clicky-btn shadow-xs shrink-0 cursor-pointer"
          title="Add New Content Item or Task"
        >
          <Plus className="h-4 w-4 stroke-[3]" />
          <span className="font-bold">Add</span>
        </button>

        {/* User Avatar Menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="group relative flex items-center gap-2 rounded-full border border-border p-0.5 hover:ring-2 hover:ring-[#FF3B00]/50 transition-all cursor-pointer"
            title="Account & Profile Picture (DP)"
          >
            <div className="relative h-8 w-8 rounded-full overflow-hidden">
              <img
                src={
                  currentAvatar ||
                  user?.avatar ||
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
                }
                alt={currentUserName || user?.name || 'User'}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Camera className="h-3.5 w-3.5 text-white" />
              </div>
            </div>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-64 rounded-xl border border-border bg-card shadow-xl py-2 z-50 text-xs animate-in fade-in zoom-in-95">
              <div className="px-3.5 py-2.5 border-b border-border flex items-center gap-3">
                <div className="relative h-10 w-10 rounded-full overflow-hidden border border-[#FF3B00] shrink-0">
                  <img
                    src={
                      currentAvatar ||
                      user?.avatar ||
                      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
                    }
                    alt={currentUserName || user?.name || 'User'}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-foreground text-sm truncate">{currentUserName || user?.name || 'User'}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{user?.email || ''}</p>
                  <span className="inline-block mt-0.5 px-2 py-0.5 rounded bg-[#FF3B00]/10 text-[#FF3B00] font-mono text-[10px] font-bold">
                    {effectiveRoleName}
                  </span>
                </div>
              </div>

              <div className="p-1 space-y-0.5">
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    openProfileModal();
                  }}
                  className="w-full text-left px-3 py-2 text-foreground hover:bg-[#FF3B00]/10 hover:text-[#FF3B00] rounded-lg flex items-center gap-2.5 transition-colors font-bold cursor-pointer"
                >
                  <Camera className="h-4 w-4 text-[#FF3B00]" />
                  <span>Change Profile Picture (DP)</span>
                </button>

                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    openProfileModal();
                  }}
                  className="w-full text-left px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg flex items-center gap-2.5 transition-colors font-medium cursor-pointer"
                >
                  <User className="h-4 w-4" />
                  <span>Account & Password Settings</span>
                </button>
              </div>

              <div className="border-t border-border pt-1 px-1">
                <button
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  className="w-full text-left px-3 py-2 text-rose-500 hover:bg-rose-500/10 rounded-lg flex items-center gap-2.5 transition-colors font-medium cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Log Out</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Audit History & Rollback Modal */}
        <AuditHistoryModal
          isOpen={showHistoryModal}
          onClose={() => setShowHistoryModal(false)}
        />
      </div>
    </header>
  );
}
