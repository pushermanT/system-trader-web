'use client';

import { useState, useEffect } from 'react';
import { Trade, TradeRuleCompliance } from '@/lib/types';
import { formatCurrency, calcWinRate, calcTotalPnl } from '@/lib/utils';
import { useData } from '@/lib/data/data-context';
import StatsCards from '@/components/stats-cards';
import RuleCompliance from '@/components/rule-compliance';

export default function StatsPage() {
  const { repo } = useData();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [compliance, setCompliance] = useState<TradeRuleCompliance[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    const data = await repo.getTradesWithCompliance();
    setTrades(data.trades);
    setCompliance(data.compliance);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  if (loading) return <div className="text-gray-500">Loading...</div>;

  const strategyMap = new Map<string, Trade[]>();
  trades.forEach((t) => {
    const key = t.strategy_name;
    const list = strategyMap.get(key) ?? [];
    list.push(t);
    strategyMap.set(key, list);
  });

  const strategyStats = Array.from(strategyMap.entries()).map(([name, trades]) => ({
    name,
    tradeCount: trades.length,
    winRate: calcWinRate(trades),
    totalPnl: calcTotalPnl(trades.filter((t) => t.outcome !== 'Open')),
  })).sort((a, b) => b.totalPnl - a.totalPnl);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Stats</h2>

      <StatsCards trades={trades} compliance={compliance} />

      <div>
        <h3 className="mb-3 text-lg font-semibold">Strategy Performance</h3>
        {strategyStats.length === 0 ? (
          <p className="text-sm text-gray-500">No trades yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-800 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-3 py-2">Strategy</th>
                  <th className="px-3 py-2">Trades</th>
                  <th className="px-3 py-2">Win Rate</th>
                  <th className="px-3 py-2">Total P&L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {strategyStats.map((s) => (
                  <tr key={s.name}>
                    <td className="px-3 py-2 text-gray-300">{s.name}</td>
                    <td className="px-3 py-2 text-gray-400">{s.tradeCount}</td>
                    <td className="px-3 py-2 text-gray-400">{s.winRate.toFixed(1)}%</td>
                    <td className={`px-3 py-2 font-medium ${
                      s.totalPnl > 0 ? 'text-green-400' : s.totalPnl < 0 ? 'text-red-400' : 'text-gray-400'
                    }`}>
                      {formatCurrency(s.totalPnl)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <h3 className="mb-3 text-lg font-semibold">Rule Compliance</h3>
        <RuleCompliance compliance={compliance} />
      </div>
    </div>
  );
}
