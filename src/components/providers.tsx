'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { SessionProvider, useSession } from 'next-auth/react';
import { parsePermissions, PermissionsMap, ROLE_PERMISSIONS_PRESETS } from '@/lib/permissions';
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
  cachedRoles: any[];
  setCachedRoles: (data: any[]) => void;
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
  cachedRoles: [],
  setCachedRoles: () => {},
  refreshTrigger: 0,
  triggerRefresh: () => {},
});

export function useImpersonation() {
  return useContext(ImpersonationContext);
}

function AppStateBridge({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [impersonatedRoleName, setImpersonatedRoleName] = useState<string | null>(null);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddType, setQuickAddType] = useState<'content' | 'task' | 'shoot'>('content');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [liveUser, setLiveUser] = useState<{ roleName?: string; permissions?: PermissionsMap } | null>(null);

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

    let lastSync = Date.now();
    const handleFocusOrVisibility = () => {
      const now = Date.now();
      // Throttle focus/visibility refreshes to at most once every 60 seconds
      if (document.visibilityState === 'visible' && now - lastSync > 60000) {
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

  // 3. Live user sync: fetch current permissions and role in real-time
  useEffect(() => {
    if (!session?.user) {
      setLiveUser(null);
      return;
    }

    fetch('/api/users/me')
      .then(async (res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && (data.permissions || data.roleName)) {
          setLiveUser({
            roleName: data.roleName,
            permissions: data.permissions,
          });
        }
      })
      .catch((err) => console.error('Failed to sync live user permissions:', err));
  }, [session, refreshTrigger]);

  const userRole = liveUser?.roleName || (session?.user as any)?.roleName || (session ? 'Super Admin' : 'Guest');
  const rawPerms = (session?.user as any)?.permissions;

  const actualPermissions =
    liveUser?.permissions && Object.keys(liveUser.permissions).length > 0
      ? liveUser.permissions
      : parsePermissions(rawPerms);
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
  const [cachedRoles, setCachedRolesState] = useState<any[]>(() => getStored('roles', []));

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
  const setCachedRoles = (data: any[]) => {
    setCachedRolesState(data);
    setStored('roles', data);
  };

  // Staggered lightweight prefetch for shared globals (clients & users) once session is ready
  useEffect(() => {
    if (!session?.user) return;

    // Fetch shared clients only if not already cached or on explicit refresh
    fetch('/api/clients')
      .then(async (res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setCachedClients(data);
      })
      .catch((err) => console.error('Failed to load shared clients:', err));

    fetch('/api/users')
      .then(async (res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setCachedUsers(data);
      })
      .catch((err) => console.error('Failed to load shared users:', err));
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
        cachedRoles,
        setCachedRoles,
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
