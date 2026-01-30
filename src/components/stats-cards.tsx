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

  const cards = [
    {
      label: 'Total P&L',
      value: formatCurrency(totalPnl),
      color: totalPnl >= 0 ? 'text-green-400' : 'text-red-400',
    },
    {
      label: 'Win Rate',
      value: `${winRate.toFixed(1)}%`,
      color: winRate >= 50 ? 'text-green-400' : 'text-yellow-400',
    },
    {
      label: 'Avg P&L',
      value: formatCurrency(avgPnl),
      color: avgPnl >= 0 ? 'text-green-400' : 'text-red-400',
    },
    {
      label: 'Rule Compliance',
      value: `${complianceRate.toFixed(1)}%`,
      color: complianceRate >= 80 ? 'text-green-400' : complianceRate >= 50 ? 'text-yellow-400' : 'text-red-400',
    },
    {
      label: 'Total Trades',
      value: trades.length.toString(),
      color: 'text-white',
    },
    {
      label: 'Open Trades',
      value: trades.filter((t) => t.outcome === 'Open').length.toString(),
      color: 'text-blue-400',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-lg border border-gray-800 bg-gray-900 p-4"
        >
          <p className="text-xs text-gray-400">{card.label}</p>
          <p className={`mt-1 text-xl font-semibold ${card.color}`}>{card.value}</p>
        </div>
      ))}
    </div>
  );
}
