'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { SessionProvider, useSession } from 'next-auth/react';
import { parsePermissions, PermissionsMap } from '@/lib/permissions';
import { PersonalProfileModal } from '@/components/personal-profile-modal';

interface ImpersonationContextType {
  isImpersonating: boolean;
  impersonatedRoleName: string | null;
  effectiveRoleName: string;
  effectivePermissions: PermissionsMap;
  setImpersonatedRole: (roleName: string | null) => void;
  quickAddOpen: boolean;
  setQuickAddOpen: (open: boolean) => void;
  quickAddType: 'content' | 'task' | 'shoot';
  quickAddDate?: string | null;
  openQuickAdd: (type?: 'content' | 'task' | 'shoot', initialDate?: string) => void;
  profileModalOpen: boolean;
  setProfileModalOpen: (open: boolean) => void;
  openProfileModal: () => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  toggleMobileMenu: () => void;
  cachedClients: any[];
  setCachedClients: (data: any[]) => void;
  cachedUsers: any[];
  setCachedUsers: (data: any[]) => void;
  cachedTasks: any[];
  setCachedTasks: (data: any[]) => void;
  cachedContent: any[];
  setCachedContent: (data: any[]) => void;
  cachedInvoices: any[];
  setCachedInvoices: (data: any[]) => void;
  cachedDashboard: any;
  setCachedDashboard: (data: any) => void;
  refreshTrigger: number;
  triggerRefresh: () => void;
}

const ImpersonationContext = createContext<ImpersonationContextType>({
  isImpersonating: false,
  impersonatedRoleName: null,
  effectiveRoleName: 'Super Admin',
  effectivePermissions: {},
  setImpersonatedRole: () => {},
  quickAddOpen: false,
  setQuickAddOpen: () => {},
  quickAddType: 'content',
  quickAddDate: null,
  openQuickAdd: () => {},
  profileModalOpen: false,
  setProfileModalOpen: () => {},
  openProfileModal: () => {},
  mobileMenuOpen: false,
  setMobileMenuOpen: () => {},
  toggleMobileMenu: () => {},
  cachedClients: [],
  setCachedClients: () => {},
  cachedUsers: [],
  setCachedUsers: () => {},
  cachedTasks: [],
  setCachedTasks: () => {},
  cachedContent: [],
  setCachedContent: () => {},
  cachedInvoices: [],
  setCachedInvoices: () => {},
  cachedDashboard: null,
  setCachedDashboard: () => {},
  refreshTrigger: 0,
  triggerRefresh: () => {},
});

export function useImpersonation() {
  return useContext(ImpersonationContext);
}

const ROLE_PERMISSIONS_PRESETS: Record<string, PermissionsMap> = {
  'Super Admin': {
    dashboard: 'full',
    calendar: 'full',
    clients: 'full',
    tracker: 'full',
    tasks: 'full',
    billing: 'full',
    reports: 'full',
    users: 'full',
  },
  Manager: {
    dashboard: 'full',
    calendar: 'full',
    clients: 'edit',
    tracker: 'full',
    tasks: 'full',
    billing: 'view',
    reports: 'full',
    users: 'view',
  },
  'Social Media Manager': {
    dashboard: 'view',
    calendar: 'edit',
    clients: 'view',
    tracker: 'edit',
    tasks: 'edit',
    billing: 'none',
    reports: 'view',
    users: 'none',
  },
  'Content/Shoot Manager': {
    dashboard: 'view',
    calendar: 'full',
    clients: 'view',
    tracker: 'full',
    tasks: 'full',
    billing: 'none',
    reports: 'view',
    users: 'none',
  },
  'Ads Manager': {
    dashboard: 'view',
    calendar: 'edit',
    clients: 'view',
    tracker: 'edit',
    tasks: 'edit',
    billing: 'none',
    reports: 'view',
    users: 'none',
  },
  'Client Communication': {
    dashboard: 'view',
    calendar: 'view',
    clients: 'edit',
    tracker: 'edit',
    tasks: 'edit',
    billing: 'none',
    reports: 'view',
    users: 'none',
  },
  'Billing/Finance': {
    dashboard: 'view',
    calendar: 'view',
    clients: 'view',
    tracker: 'view',
    tasks: 'view',
    billing: 'full',
    reports: 'full',
    users: 'none',
  },
  Viewer: {
    dashboard: 'view',
    calendar: 'view',
    clients: 'view',
    tracker: 'view',
    tasks: 'view',
    billing: 'none',
    reports: 'none',
    users: 'none',
  },
};

function AppStateBridge({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [impersonatedRoleName, setImpersonatedRoleName] = useState<string | null>(null);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddType, setQuickAddType] = useState<'content' | 'task' | 'shoot'>('content');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const syncChannelRef = React.useRef<BroadcastChannel | null>(null);

  // 1. Instant Same-Device Cross-Tab Broadcast Channel Sync
  useEffect(() => {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const channel = new BroadcastChannel('trexobyte_realtime_sync');
      syncChannelRef.current = channel;

      channel.onmessage = (event) => {
        if (event.data?.type === 'REFRESH') {
          setRefreshTrigger((prev) => prev + 1);
        }
      };

      return () => {
        channel.close();
      };
    }
  }, []);

  const triggerRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
    if (syncChannelRef.current) {
      try {
        syncChannelRef.current.postMessage({ type: 'REFRESH', timestamp: Date.now() });
      } catch (e) {
        // ignore
      }
    }
  };

  // 2. Real-Time Sync Engine: sync when tab regains focus or visibility changes (throttled)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let lastSync = 0;
    const handleFocusOrVisibility = () => {
      const now = Date.now();
      // Throttle focus/visibility refreshes to at most once every 15 seconds
      if (document.visibilityState === 'visible' && now - lastSync > 15000) {
        lastSync = now;
        setRefreshTrigger((prev) => prev + 1);
      }
    };

    window.addEventListener('focus', handleFocusOrVisibility);
    document.addEventListener('visibilitychange', handleFocusOrVisibility);

    return () => {
      window.removeEventListener('focus', handleFocusOrVisibility);
      document.removeEventListener('visibilitychange', handleFocusOrVisibility);
    };
  }, []);

  const userRole = (session?.user as any)?.roleName || (session ? 'Super Admin' : 'Guest');
  const rawPerms = (session?.user as any)?.permissions;

  const actualPermissions = parsePermissions(rawPerms);
  const hasActualPermissions = Object.keys(actualPermissions).length > 0;

  const effectiveRoleName = impersonatedRoleName || userRole;
  const effectivePermissions = impersonatedRoleName
    ? ROLE_PERMISSIONS_PRESETS[impersonatedRoleName] || ROLE_PERMISSIONS_PRESETS['Super Admin']
    : hasActualPermissions
    ? actualPermissions
    : session
    ? ROLE_PERMISSIONS_PRESETS[effectiveRoleName] || ROLE_PERMISSIONS_PRESETS['Super Admin']
    : {};

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Safe session storage helpers for instant 0ms reload
  const getStored = (key: string, defaultValue: any) => {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const item = sessionStorage.getItem(`trexo_cache_${key}`);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  };

  const setStored = (key: string, value: any) => {
    if (typeof window === 'undefined') return;
    try {
      sessionStorage.setItem(`trexo_cache_${key}`, JSON.stringify(value));
    } catch {}
  };

  const [cachedClients, setCachedClientsState] = useState<any[]>(() => getStored('clients', []));
  const [cachedUsers, setCachedUsersState] = useState<any[]>(() => getStored('users', []));
  const [cachedTasks, setCachedTasksState] = useState<any[]>(() => getStored('tasks', []));
  const [cachedContent, setCachedContentState] = useState<any[]>(() => getStored('content', []));
  const [cachedInvoices, setCachedInvoicesState] = useState<any[]>(() => getStored('invoices', []));
  const [cachedDashboard, setCachedDashboardState] = useState<any>(() => getStored('dashboard', null));

  const setCachedClients = (data: any[]) => {
    setCachedClientsState(data);
    setStored('clients', data);
  };
  const setCachedUsers = (data: any[]) => {
    setCachedUsersState(data);
    setStored('users', data);
  };
  const setCachedTasks = (data: any[]) => {
    setCachedTasksState(data);
    setStored('tasks', data);
  };
  const setCachedContent = (data: any[]) => {
    setCachedContentState(data);
    setStored('content', data);
  };
  const setCachedInvoices = (data: any[]) => {
    setCachedInvoicesState(data);
    setStored('invoices', data);
  };
  const setCachedDashboard = (data: any) => {
    setCachedDashboardState(data);
    setStored('dashboard', data);
  };

  // Prefetch and sync all core datasets once when session is ready, and on refreshTrigger
  useEffect(() => {
    if (!session?.user) return;

    fetch('/api/clients')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setCachedClients(data);
      })
      .catch((err) => console.error('Failed to load shared clients:', err));

    fetch('/api/users')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setCachedUsers(data);
      })
      .catch((err) => console.error('Failed to load shared users:', err));

    fetch('/api/tasks')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setCachedTasks(data);
      })
      .catch((err) => console.error('Failed to prefetch tasks:', err));

    fetch('/api/content')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setCachedContent(data);
      })
      .catch((err) => console.error('Failed to prefetch content:', err));

    fetch('/api/invoices')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setCachedInvoices(data);
      })
      .catch((err) => console.error('Failed to prefetch invoices:', err));

    fetch('/api/dashboard')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setCachedDashboard(data);
      })
      .catch((err) => console.error('Failed to prefetch dashboard:', err));
  }, [session, refreshTrigger]);

  const toggleMobileMenu = () => setMobileMenuOpen((prev) => !prev);

  const [quickAddDate, setQuickAddDate] = useState<string | null>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  const openQuickAdd = (type: 'content' | 'task' | 'shoot' = 'content', initialDate?: string) => {
    setQuickAddType(type);
    setQuickAddDate(initialDate || null);
    setQuickAddOpen(true);
  };

  const openProfileModal = () => {
    setProfileModalOpen(true);
  };

  return (
    <ImpersonationContext.Provider
      value={{
        isImpersonating: Boolean(impersonatedRoleName),
        impersonatedRoleName,
        effectiveRoleName,
        effectivePermissions,
        setImpersonatedRole: setImpersonatedRoleName,
        quickAddOpen,
        setQuickAddOpen,
        quickAddType,
        quickAddDate,
        openQuickAdd,
        profileModalOpen,
        setProfileModalOpen,
        openProfileModal,
        mobileMenuOpen,
        setMobileMenuOpen,
        toggleMobileMenu,
        cachedClients,
        setCachedClients,
        cachedUsers,
        setCachedUsers,
        cachedTasks,
        setCachedTasks,
        cachedContent,
        setCachedContent,
        cachedInvoices,
        setCachedInvoices,
        cachedDashboard,
        setCachedDashboard,
        refreshTrigger,
        triggerRefresh,
      }}
    >
      {children}
      <PersonalProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
      />
    </ImpersonationContext.Provider>
  );
}

interface ThemeContextType {
  theme: string;
  setTheme: (theme: string) => void;
  resolvedTheme: string;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  setTheme: () => {},
  resolvedTheme: 'dark',
});

export function useTheme() {
  return useContext(ThemeContext);
}

function CustomThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<string>('dark');

  useEffect(() => {
    const saved = localStorage.getItem('theme') || 'dark';
    setThemeState(saved);
    if (saved === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const setTheme = (newTheme: string) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme: theme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider basePath="/api/auth">
      <CustomThemeProvider>
        <AppStateBridge>{children}</AppStateBridge>
      </CustomThemeProvider>
    </SessionProvider>
  );
}
