'use client';

import { Trade, Strategy, Rule, TradeRuleCompliance } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { computeAnalytics } from '@/lib/analytics';

interface PerformancePanelProps {
  trades: Trade[];
  activeStrategies: (Strategy & { rules: Rule[] })[];
  compliance: TradeRuleCompliance[];
}

export default function PerformancePanel({ trades, activeStrategies, compliance }: PerformancePanelProps) {
  const stats = computeAnalytics(trades);

  const complianceByTrade = new Map<string, { total: number; followed: number }>();
  compliance.forEach((c) => {
    const entry = complianceByTrade.get(c.trade_id) ?? { total: 0, followed: 0 };
    entry.total++;
    if (c.followed) entry.followed++;
    complianceByTrade.set(c.trade_id, entry);
  });

  const lossTrades = trades.filter((t) => t.outcome === 'Loss' && t.pnl !== null);
  const compliantLosses = lossTrades.filter((t) => {
    const c = complianceByTrade.get(t.id);
    return c && c.total > 0 && (c.followed / c.total) >= 0.8;
  });
  const nonCompliantLosses = lossTrades.filter((t) => {
    const c = complianceByTrade.get(t.id);
    return c && c.total > 0 && (c.followed / c.total) < 0.8;
  });

  const avgCompliantLoss = compliantLosses.length > 0
    ? compliantLosses.reduce((s, t) => s + (t.pnl ?? 0), 0) / compliantLosses.length : null;
  const avgNonCompliantLoss = nonCompliantLosses.length > 0
    ? nonCompliantLosses.reduce((s, t) => s + (t.pnl ?? 0), 0) / nonCompliantLosses.length : null;

  const overallCompliance = compliance.length > 0
    ? ((compliance.filter((c) => c.followed).length / compliance.length) * 100).toFixed(0) : null;

  return (
    <div className="p-4 font-mono text-[15px] grid grid-cols-2 gap-x-8 gap-y-2.5">
      {overallCompliance !== null && (
        <Stat label="COMPLIANCE" value={`${overallCompliance}%`} color={Number(overallCompliance) >= 80 ? '#4ec9b0' : Number(overallCompliance) >= 50 ? '#dcdcaa' : '#f44747'} />
      )}
      {avgCompliantLoss !== null && avgNonCompliantLoss !== null ? (
        <Stat label="LOSS: COMPLIANT vs NOT" value="" color="">
          <span>
            <span style={{ color: '#dcdcaa' }}>{formatCurrency(avgCompliantLoss)}</span>
            <span className="text-gray-600"> vs </span>
            <span style={{ color: '#f44747' }}>{formatCurrency(avgNonCompliantLoss)}</span>
          </span>
        </Stat>
      ) : overallCompliance !== null ? (
        <Stat label="LOSS CORRELATION" value="—" color="#555" />
      ) : null}
      <Stat label="TOTAL TRADES" value={String(stats.totalTrades)} color="#e0e0e0" />
      <Stat label="OPEN POSITIONS" value={String(stats.openTrades)} color="#569cd6" />
      <Stat label="WIN RATE" value={`${stats.winRate}%`} color="#dcdcaa" />
      <Stat label="WINS / LOSSES" value="" color="">
        <span>
          <span style={{ color: '#4ec9b0' }}>{stats.wins}</span>
          <span className="text-gray-600"> / </span>
          <span style={{ color: '#f44747' }}>{stats.losses}</span>
        </span>
      </Stat>
      <Stat label="TOTAL P&L" value={formatCurrency(stats.totalPnl)} color={stats.totalPnl >= 0 ? '#4ec9b0' : '#f44747'} />
      <Stat label="AVG P&L" value={stats.closedTrades > 0 ? formatCurrency(stats.avgPnl) : '—'} color={stats.avgPnl >= 0 ? '#4ec9b0' : '#f44747'} />
      <Stat label="PROFIT FACTOR" value={stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2)} color="#dcdcaa" />
      <Stat label="EXPECTANCY" value={formatCurrency(stats.expectancy)} color={stats.expectancy >= 0 ? '#4ec9b0' : '#f44747'} />
      <Stat label="SHARPE RATIO" value={stats.sharpeRatio !== null ? stats.sharpeRatio.toFixed(2) : '—'} color="#dcdcaa" />
      <Stat label="MAX DRAWDOWN" value={stats.maxDrawdown !== 0 ? `${formatCurrency(stats.maxDrawdown)} (${stats.maxDrawdownPct.toFixed(1)}%)` : '—'} color="#f44747" />
      <Stat label="BEST TRADE" value={stats.bestTrade !== null ? formatCurrency(stats.bestTrade) : '—'} color="#4ec9b0" />
      <Stat label="WORST TRADE" value={stats.worstTrade !== null ? formatCurrency(stats.worstTrade) : '—'} color="#f44747" />
      <Stat label="WIN STREAK" value={String(stats.longestWinStreak)} color="#4ec9b0" />
      <Stat label="LOSS STREAK" value={String(stats.longestLossStreak)} color="#f44747" />
      <Stat label="ACTIVE STRATEGIES" value={String(activeStrategies.length)} color="#ff8c00" />
      <Stat label="CLOSED TRADES" value={String(stats.closedTrades)} color="#e0e0e0" />
    </div>
  );
}

function Stat({ label, value, color, children }: { label: string; value: string; color: string; children?: React.ReactNode }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      {children ?? <span style={{ color }}>{value}</span>}
    </div>
  );
}
