'use client';

import { Trade, TradeRuleCompliance } from '@/lib/types';
import { formatCurrency, calcWinRate, calcTotalPnl, calcAvgPnl } from '@/lib/utils';

interface StatsCardsProps {
  trades: Trade[];
  compliance: TradeRuleCompliance[];
}

export default function StatsCards({ trades, compliance }: StatsCardsProps) {
  const closedTrades = trades.filter((t) => t.outcome !== 'Open');
  const totalPnl = calcTotalPnl(closedTrades);
  const winRate = calcWinRate(trades);
  const avgPnl = calcAvgPnl(trades);

  const totalCompliance = compliance.length;
  const followedCount = compliance.filter((c) => c.followed).length;
  const complianceRate = totalCompliance > 0 ? (followedCount / totalCompliance) * 100 : 0;

  function pnlColor(val: number): string {
    if (val > 0) return '#4ec9b0';
    if (val < 0) return '#f44747';
    return '#555';
  }

  const cards = [
    { label: 'TOTAL P&L', value: formatCurrency(totalPnl), color: pnlColor(totalPnl) },
    { label: 'WIN RATE', value: `${winRate.toFixed(1)}%`, color: winRate >= 50 ? '#dcdcaa' : '#f44747' },
    { label: 'AVG P&L', value: formatCurrency(avgPnl), color: pnlColor(avgPnl) },
    { label: 'COMPLIANCE', value: `${complianceRate.toFixed(1)}%`, color: complianceRate >= 80 ? '#4ec9b0' : complianceRate >= 50 ? '#dcdcaa' : '#f44747' },
    { label: 'TOTAL TRADES', value: trades.length.toString(), color: '#e0e0e0' },
    { label: 'OPEN', value: trades.filter((t) => t.outcome === 'Open').length.toString(), color: '#569cd6' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 font-mono">
      {cards.map((card) => (
        <div
          key={card.label}
          className="px-4 py-3"
          style={{ borderRight: '1px solid #222', borderBottom: '1px solid #222' }}
        >
          <p className="text-[11px] text-gray-500 uppercase tracking-wider">{card.label}</p>
          <p className="mt-1 text-lg font-bold" style={{ color: card.color }}>{card.value}</p>
        </div>
      ))}
    </div>
  );
}
