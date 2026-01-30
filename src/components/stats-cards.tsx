'use client';

import { useState } from 'react';
import { Trade, TradeRuleCompliance } from '@/lib/types';
import { formatCurrency, calcWinRate, calcTotalPnl, calcAvgPnl } from '@/lib/utils';

interface StatsCardsProps {
  trades: Trade[];
  compliance: TradeRuleCompliance[];
  referralCount?: number;
  referralCode?: string | null;
}

export default function StatsCards({ trades, compliance, referralCount, referralCode }: StatsCardsProps) {
  const [copied, setCopied] = useState(false);
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
    ...(referralCount !== undefined ? [{ label: 'REFERRALS', value: referralCount.toString(), color: '#c586c0' }] : []),
  ];

  const referralLink = referralCode
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/signup?ref=${referralCode}`
    : null;

  function handleCopy() {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 font-mono">
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
      {referralLink && (
        <div className="flex items-center gap-2 px-4 py-2 font-mono text-[12px] border-t" style={{ borderColor: '#222' }}>
          <span className="text-gray-500">REFERRAL LINK:</span>
          <span className="text-gray-400 truncate">{referralLink}</span>
          <button
            onClick={handleCopy}
            className="ml-auto shrink-0 px-2 py-0.5 text-[11px] border rounded hover:bg-white/5 transition-colors"
            style={{ borderColor: '#444', color: copied ? '#4ec9b0' : '#888' }}
          >
            {copied ? 'COPIED' : 'COPY'}
          </button>
        </div>
      )}
    </div>
  );
}
