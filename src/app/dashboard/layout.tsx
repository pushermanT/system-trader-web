'use client';

import { useState } from 'react';
import Sidebar from '@/components/sidebar';
import { DataProvider } from '@/lib/data/data-context';
import { useIsMobile } from '@/hooks/use-is-mobile';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <DataProvider>
      <div className="flex h-screen">
        {/* Desktop sidebar */}
        {!isMobile && <Sidebar />}

        {/* Mobile menu button */}
        {isMobile && (
          <button
            onClick={() => setDrawerOpen(true)}
            className="fixed top-2 right-2 z-40 w-9 h-9 flex items-center justify-center rounded font-mono text-sm"
            style={{ background: '#1a1a1a', border: '1px solid #333', color: '#ff8c00' }}
            aria-label="Open menu"
          >
            ⚙
          </button>
        )}

        {/* Mobile drawer overlay */}
        {isMobile && drawerOpen && (
          <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/60"
              onClick={() => setDrawerOpen(false)}
            />
            {/* Drawer */}
            <div className="relative w-48 h-full" style={{ background: '#0a0a0a' }}>
              <Sidebar onNavigate={() => setDrawerOpen(false)} />
            </div>
          </div>
        )}

        <main className="flex-1 overflow-y-auto" style={{ background: '#111' }}>
          <div>{children}</div>
        </main>
      </div>
    </DataProvider>
  );
}
