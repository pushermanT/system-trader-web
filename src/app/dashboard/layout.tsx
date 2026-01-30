export const dynamic = 'force-dynamic';

import Sidebar from '@/components/sidebar';
import { DataProvider } from '@/lib/data/data-context';
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DataProvider>
      <div className="flex h-screen">
        <Sidebar />
        <main className="flex-1 overflow-y-auto" style={{ background: '#111' }}>
          <div>{children}</div>
        </main>
      </div>
    </DataProvider>
  );
}
