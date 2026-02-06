'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/sidebar';
import { DataProvider } from '@/lib/data/data-context';
import { useIsMobile } from '@/hooks/use-is-mobile';

const mobileNav = [
  { href: '/dashboard', label: 'TERMINAL', exact: true },
  { href: '/dashboard/chart', label: 'CHART' },
  { href: '/dashboard/stats', label: 'STATS' },
  { href: '/dashboard/referrals', label: 'REFERRALS' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();

  return (
    <DataProvider>
      <div className="flex h-screen flex-col">
        <div className="flex flex-1 overflow-hidden">
          {/* Desktop sidebar */}
          {!isMobile && <Sidebar />}

          {/* Mobile: gear button for settings drawer */}
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
              <div className="absolute inset-0 bg-black/60" onClick={() => setDrawerOpen(false)} />
              <div className="relative w-48 h-full" style={{ background: '#0a0a0a' }}>
                <Sidebar onNavigate={() => setDrawerOpen(false)} />
              </div>
            </div>
          )}

          <main className="flex-1 overflow-y-auto" style={{ background: '#111', paddingBottom: isMobile ? 56 : 0 }}>
            <div>{children}</div>
          </main>
        </div>

        {/* Mobile bottom tab bar */}
        {isMobile && (
          <nav
            className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around font-mono text-[14px]"
            style={{ background: '#0a0a0a', borderTop: '1px solid #222', height: 52 }}
          >
            {mobileNav.map((item) => {
              const active = 'exact' in item ? pathname === item.href : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex flex-col items-center justify-center px-4 py-1.5 tracking-wider transition-colors"
                  style={{ color: active ? '#ff8c00' : '#555' }}
                >
                  {item.label}
                  {active && <div className="w-4 h-0.5 mt-1" style={{ background: '#ff8c00' }} />}
                </Link>
              );
            })}
          </nav>
        )}
      </div>
    </DataProvider>
  );
}
