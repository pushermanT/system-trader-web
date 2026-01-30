'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useData } from '@/lib/data/data-context';

const navItems = [
  { href: '/dashboard', label: 'TERMINAL', exact: true },
  { href: '/dashboard/stats', label: 'STATS' },
  { href: '/dashboard/referrals', label: 'REFERRALS' },
];

interface SidebarProps {
  onNavigate?: () => void;
}

export default function Sidebar({ onNavigate }: SidebarProps = {}) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAnonymous } = useData();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <aside
      className="flex h-screen w-48 flex-col font-mono"
      style={{ background: '#0a0a0a', borderRight: '1px solid #222' }}
    >
      <div className="px-3 py-3" style={{ borderBottom: '1px solid #222' }}>
        <h1 className="text-sm font-bold tracking-widest" style={{ color: '#ff8c00' }}>
          SYSTEM<span className="text-gray-500">TRADER</span>
        </h1>
        <p className="text-[11px] text-gray-600 mt-0.5">v1.0.0</p>
      </div>
      <nav className="flex-1 py-2">
        {navItems.map((item) => {
          const active = 'exact' in item
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="block px-3 py-2 text-[13px] tracking-wider transition-colors"
              style={{
                color: active ? '#ff8c00' : '#666',
                background: active ? '#ff8c0008' : 'transparent',
                borderLeft: active ? '2px solid #ff8c00' : '2px solid transparent',
              }}
              onMouseEnter={(e) => {
                if (!active) e.currentTarget.style.color = '#aaa';
              }}
              onMouseLeave={(e) => {
                if (!active) e.currentTarget.style.color = '#666';
              }}
              onClick={() => onNavigate?.()}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="py-3 px-3" style={{ borderTop: '1px solid #222' }}>
        {isAnonymous ? (
          <div className="space-y-1">
            <Link
              href="/signup"
              className="block w-full px-2 py-1.5 text-center text-[13px] font-bold tracking-wider text-black"
              style={{ background: '#ff8c00' }}
            >
              CREATE ACCOUNT
            </Link>
            <Link
              href="/login"
              className="block w-full px-2 py-1.5 text-center text-[13px] tracking-wider text-gray-500 hover:text-gray-300 transition-colors"
            >
              SIGN IN
            </Link>
          </div>
        ) : (
          <button
            onClick={handleLogout}
            className="w-full text-left text-[13px] tracking-wider text-gray-600 hover:text-gray-300 transition-colors"
          >
            SIGN OUT
          </button>
        )}
      </div>
    </aside>
  );
}
