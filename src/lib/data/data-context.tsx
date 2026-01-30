'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import { DataRepo } from './types';
import { LocalStorageRepo } from './local-storage-repo';
import { SupabaseRepo } from './supabase-repo';

interface DataContextValue {
  repo: DataRepo;
  isAnonymous: boolean;
  userId: string | null;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [ctx, setCtx] = useState<DataContextValue | null>(null);

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        setCtx({ repo: new SupabaseRepo(supabase, user.id), isAnonymous: false, userId: user.id });
      } else {
        setCtx({ repo: new LocalStorageRepo(), isAnonymous: true, userId: null });
      }
    }
    init();
  }, []);

  if (!ctx) return <div className="flex h-screen items-center justify-center text-gray-500">Loading...</div>;

  return <DataContext.Provider value={ctx}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
