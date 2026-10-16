'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Sidebar } from '@/components/sidebar';
import { Header } from '@/components/header';
import { QuickAddModal } from '@/components/quick-add-modal';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const isLoginPage = pathname === '/login';

  useEffect(() => {
    if (!isLoginPage && status === 'unauthenticated') {
      router.replace('/login');
    }
  }, [isLoginPage, status, router]);

  if (isLoginPage) {
    return <main className="min-h-screen w-full bg-background">{children}</main>;
  }

  if (status === 'loading') {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#FF3B00] border-t-transparent" />
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Loading workspace...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 bg-background relative">
          {children}
          <QuickAddModal />
        </main>
      </div>
    </div>
  );
}
