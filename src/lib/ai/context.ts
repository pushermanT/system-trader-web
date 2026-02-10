import { createClient } from '@/lib/supabase/server';
import { SupabaseRepo } from '@/lib/data/supabase-repo';
import { Strategy, Trade } from '@/lib/types';
import { RiskSettings } from '@/lib/data/types';

export interface UserContext {
  userId: string;
  repo: SupabaseRepo;
  strategies: Strategy[];
  trades: Trade[];
  riskSettings: RiskSettings;
  traderProfile: string;
}

export async function loadUserContext(userId: string): Promise<UserContext> {
  const supabase = await createClient();
  const repo = new SupabaseRepo(supabase, userId);

  const [strategiesRaw, trades, riskSettings, traderProfile] = await Promise.all([
    repo.getStrategies(),
    repo.getTrades(),
    repo.getRiskSettings(),
    repo.getTraderProfile(),
  ]);

  const strategies = strategiesRaw.map(({ rules, ...s }) => s);

  return { userId, repo, strategies, trades, riskSettings, traderProfile };
}

export function filterTrades(
  trades: Trade[],
  opts: { limit?: number; symbol?: string; outcome?: string }
): Trade[] {
  let filtered = trades;
  if (opts.symbol) {
    filtered = filtered.filter((t) => t.symbol.toLowerCase() === opts.symbol!.toLowerCase());
  }
  if (opts.outcome && opts.outcome !== 'All') {
    filtered = filtered.filter((t) => t.outcome === opts.outcome);
  }
  return filtered.slice(0, opts.limit ?? 20);
}
