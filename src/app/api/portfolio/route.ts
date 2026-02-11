import { createClient } from '@/lib/supabase/server';
import { SupabaseRepo } from '@/lib/data/supabase-repo';
import { fetchMidPrices } from '@/lib/hyperliquid';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const repo = new SupabaseRepo(supabase, user.id);
  const [riskSettings, trades] = await Promise.all([
    repo.getRiskSettings(),
    repo.getTrades(),
  ]);

  const openTrades = trades.filter((t) => t.outcome === 'Open');
  let unrealizedPnl: number | null = null;

  if (riskSettings.test_mode && openTrades.length > 0) {
    try {
      const mids = await fetchMidPrices();
      unrealizedPnl = 0;
      for (const t of openTrades) {
        const mid = mids[t.symbol];
        if (mid) {
          unrealizedPnl += t.direction === 'Long'
            ? (mid - t.entry_price) * t.quantity
            : (t.entry_price - mid) * t.quantity;
        }
      }
    } catch {
      unrealizedPnl = null;
    }
  }

  const accountValue = riskSettings.test_mode
    ? riskSettings.portfolio_value
    : null;

  return Response.json({
    nickname: riskSettings.nickname,
    test_mode: riskSettings.test_mode,
    accountValue,
    unrealizedPnl,
  });
}
