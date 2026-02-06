'use client';

import { useState, useEffect } from 'react';
import { Trade, TradeRuleCompliance, TradeAutopsy } from '@/lib/types';
import { formatCurrency, calcWinRate, calcTotalPnl } from '@/lib/utils';
import { useData } from '@/lib/data/data-context';
import StatsCards from '@/components/stats-cards';
import RuleCompliance from '@/components/rule-compliance';
import CalendarHeatmap from '@/components/calendar-heatmap';
import LossScatter from '@/components/loss-scatter';
import TerminalPanel from '@/components/terminal-panel';
import { useIsMobile } from '@/hooks/use-is-mobile';

export default function StatsPage() {
  const { repo } = useData();
  const isMobile = useIsMobile();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [compliance, setCompliance] = useState<TradeRuleCompliance[]>([]);
  const [loading, setLoading] = useState(true);
  const [focusedPanel, setFocusedPanel] = useState<string>('overview');

  async function loadData() {
    const data = await repo.getTradesWithCompliance();
    setTrades(data.trades);
    setCompliance(data.compliance);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full font-mono text-sm text-gray-600 tracking-wider">
        LOADING DATA...
      </div>
    );
  }

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

  const closedTrades = trades.filter((t) => t.outcome !== 'Open');
  const totalPnl = calcTotalPnl(closedTrades);
  const winRate = calcWinRate(trades);

  return (
    <div className="relative w-full h-full" style={{ minHeight: 'calc(100vh - 48px)' }}>
      {/* ── Top status bar ── */}
      <div
        className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-1.5 font-mono text-[15px] border-b"
        style={{ background: '#0a0a0a', borderColor: '#222', color: '#888' }}
      >
        <span style={{ color: '#ff8c00' }}>ANALYTICS</span>
        <span>STRATEGIES: <span style={{ color: '#4ec9b0' }}>{strategyStats.length}</span></span>
        <span>CLOSED: <span style={{ color: '#4ec9b0' }}>{closedTrades.length}</span></span>
        <span>W/R: <span style={{ color: '#dcdcaa' }}>{winRate.toFixed(1)}%</span></span>
        <span>P&L: <span style={{ color: totalPnl >= 0 ? '#4ec9b0' : '#f44747' }}>{formatCurrency(totalPnl)}</span></span>
        <span style={{ color: '#555' }}>{new Date().toLocaleDateString()}</span>
      </div>

      {/* ── Panels ── */}
      <div className={isMobile ? 'p-3' : 'relative'} style={isMobile ? undefined : { height: 'calc(100vh - 80px)' }}>

        <TerminalPanel
          title="OVERVIEW"
          defaultPosition={{ x: 16, y: 16 }}
          defaultSize={{ width: 1000, height: 200 }}
          accentColor="#ff8c00"
          zIndex={focusedPanel === 'overview' ? 10 : 1}
          onFocus={() => setFocusedPanel('overview')}
          isMobile={isMobile}
        >
          <StatsCards trades={trades} compliance={compliance} />
        </TerminalPanel>

        <TerminalPanel
          title="CALENDAR"
          defaultPosition={{ x: 16, y: 240 }}
          defaultSize={{ width: 1000, height: 280 }}
          accentColor="#dcdcaa"
          zIndex={focusedPanel === 'calendar' ? 10 : 1}
          onFocus={() => setFocusedPanel('calendar')}
          isMobile={isMobile}
        >
          <CalendarHeatmap trades={trades} />
        </TerminalPanel>

        <TerminalPanel
          title="STRATEGY PERFORMANCE"
          defaultPosition={{ x: 16, y: 550 }}
          defaultSize={{ width: 1000, height: 260 }}
          accentColor="#569cd6"
          zIndex={focusedPanel === 'strategy' ? 10 : 1}
          onFocus={() => setFocusedPanel('strategy')}
          isMobile={isMobile}
        >
          <div className="p-2">
            {strategyStats.length === 0 ? (
              <p className="text-gray-600 text-sm font-mono px-1 py-4">No trades yet.</p>
            ) : (
              <table className="w-full text-[15px] font-mono">
                <thead>
                  <tr className="text-gray-500 border-b border-gray-800">
                    <th className="text-left py-1.5 px-2 font-normal">STRATEGY</th>
                    <th className="text-center py-1.5 px-2 font-normal">TRADES</th>
                    <th className="text-center py-1.5 px-2 font-normal">WIN RATE</th>
                    <th className="text-right py-1.5 px-2 font-normal">TOTAL P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {strategyStats.map((s) => (
                    <tr key={s.name} className="border-b border-gray-800/50 hover:bg-white/[0.03] transition-colors">
                      <td className="py-2.5 px-2 text-gray-200">{s.name}</td>
                      <td className="text-center py-2.5 px-2 text-gray-400">{s.tradeCount}</td>
                      <td className="text-center py-2.5 px-2">
                        <span style={{ color: s.winRate >= 50 ? '#dcdcaa' : '#f44747' }}>
                          {s.winRate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="text-right py-2.5 px-2 font-medium" style={{ color: s.totalPnl > 0 ? '#4ec9b0' : s.totalPnl < 0 ? '#f44747' : '#555' }}>
                        {formatCurrency(s.totalPnl)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </TerminalPanel>

        <TerminalPanel
          title="RULE COMPLIANCE"
          defaultPosition={{ x: 16, y: 840 }}
          defaultSize={{ width: 1000, height: 280 }}
          accentColor="#4ec9b0"
          zIndex={focusedPanel === 'compliance' ? 10 : 1}
          onFocus={() => setFocusedPanel('compliance')}
          isMobile={isMobile}
        >
          <div className="p-3">
            <RuleCompliance compliance={compliance} />
          </div>
        </TerminalPanel>

        <TerminalPanel
          title="LOSS ESCALATION"
          defaultPosition={{ x: 16, y: 1150 }}
          defaultSize={{ width: 1000, height: 300 }}
          accentColor="#f44747"
          zIndex={focusedPanel === 'loss-scatter' ? 10 : 1}
          onFocus={() => setFocusedPanel('loss-scatter')}
          isMobile={isMobile}
        >
          <LossScatter trades={trades} />
        </TerminalPanel>

        <TerminalPanel
          title="BIG LOSS JOURNAL"
          defaultPosition={{ x: 16, y: 1480 }}
          defaultSize={{ width: 1000, height: 300 }}
          accentColor="#f44747"
          zIndex={focusedPanel === 'autopsy' ? 10 : 1}
          onFocus={() => setFocusedPanel('autopsy')}
          isMobile={isMobile}
        >
          <AutopsyJournal trades={trades} />
        </TerminalPanel>

      </div>
    </div>
  );
}

function AutopsyJournal({ trades }: { trades: Trade[] }) {
  const autopsyTrades = trades.filter((t) => t.autopsy);
  const autopsies: { trade: Trade; data: TradeAutopsy }[] = autopsyTrades
    .map((t) => {
      try { return { trade: t, data: JSON.parse(t.autopsy!) as TradeAutopsy }; }
      catch { return null; }
    })
    .filter((x): x is { trade: Trade; data: TradeAutopsy } => x !== null);

  if (autopsies.length === 0) {
    return (
      <div className="p-4 font-mono text-sm text-gray-600 tracking-wider">
        NO AUTOPSY DATA YET. Big losses will trigger an autopsy flow when saved.
      </div>
    );
  }

  // Category distribution
  const catCount = new Map<string, number>();
  autopsies.forEach(({ data }) => {
    catCount.set(data.category, (catCount.get(data.category) ?? 0) + 1);
  });
  const sorted = [...catCount.entries()].sort((a, b) => b[1] - a[1]);
  const maxCount = sorted[0]?.[1] ?? 1;

  const categoryLabels: Record<string, string> = {
    moved_stop: 'Moved Stop', no_stop: 'No Stop', averaged_down: 'Averaged Down',
    emotional: 'Emotional', ignored_rules: 'Ignored Rules', other: 'Other',
  };

  return (
    <div className="p-3 font-mono text-[15px]">
      <div className="mb-3">
        <span className="text-gray-500 text-sm uppercase tracking-wider">Top reasons for big losses:</span>
        <div className="mt-2 space-y-1">
          {sorted.map(([cat, count]) => (
            <div key={cat} className="flex items-center gap-2">
              <span className="text-gray-400 w-28 text-sm">{categoryLabels[cat] ?? cat}</span>
              <div className="flex-1 h-3 bg-gray-800 rounded overflow-hidden">
                <div className="h-full rounded" style={{ width: `${(count / maxCount) * 100}%`, background: '#f44747' }} />
              </div>
              <span className="text-gray-500 text-sm w-6 text-right">{count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-gray-800 pt-2 space-y-2 max-h-[150px] overflow-y-auto">
        {autopsies.map(({ trade, data }) => (
          <div key={trade.id} className="border border-gray-800 rounded p-2 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>{trade.symbol} <span style={{ color: '#f44747' }}>{trade.pnl !== null ? `$${trade.pnl.toFixed(2)}` : ''}</span></span>
              <span>{new Date(trade.entry_date).toLocaleDateString()}</span>
            </div>
            <div className="mt-1 text-gray-400">
              {data.moved_stop && <span className="text-red-400 mr-2">MOVED STOP</span>}
              <span className="text-yellow-400">{data.emotional_state}</span>
              {data.lesson && <span className="text-gray-300 ml-2">&mdash; {data.lesson}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
