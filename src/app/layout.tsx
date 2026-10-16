import type { Metadata } from 'next';
import './globals.css';
import { AppProviders } from '@/components/providers';
import { AppShell } from '@/components/app-shell';

export const metadata: Metadata = {
  title: 'TREXOBYTE ERP — Kathmandu Agency Operations',
  description: 'Enterprise resource planning for TrexoByte Kathmandu agency',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="bg-background text-foreground antialiased min-h-screen">
        <AppProviders>
          <AppShell>{children}</AppShell>
        </AppProviders>
      </body>
    </html>
  );
}
