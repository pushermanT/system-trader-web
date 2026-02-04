'use client';

import { useState, useEffect } from 'react';
import { Trade, TradeRuleCompliance } from '@/lib/types';
import { formatCurrency, calcWinRate, calcTotalPnl } from '@/lib/utils';
import { useData } from '@/lib/data/data-context';
import StatsCards from '@/components/stats-cards';
import RuleCompliance from '@/components/rule-compliance';
import CalendarHeatmap from '@/components/calendar-heatmap';
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
      <div className="flex items-center justify-center h-full font-mono text-xs text-gray-600 tracking-wider">
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
        className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-1.5 font-mono text-[13px] border-b"
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
              <p className="text-gray-600 text-xs font-mono px-1 py-4">No trades yet.</p>
            ) : (
              <table className="w-full text-[13px] font-mono">
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

      </div>
    </div>
  );
}
