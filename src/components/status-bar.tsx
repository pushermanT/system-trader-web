'use client';

import { formatCurrency } from '@/lib/utils';
import { CircuitBreakerStatus } from '@/lib/risk';

interface StatusBarProps {
  accountValue: number | null;
  dailyPnl: number;
  totalUnrealizedPnl: number | null;
  openPositionCount: number;
  lossStreak: number;
  cbStatus: CircuitBreakerStatus;
  isMobile: boolean;
}

function formatCompact(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 10_000) return `${sign}$${(abs / 1_000).toFixed(1)}k`;
  return formatCurrency(value);
}

export default function StatusBar({
  accountValue, dailyPnl, totalUnrealizedPnl, openPositionCount,
  lossStreak, cbStatus, isMobile,
}: StatusBarProps) {
  const pnlColor = dailyPnl >= 0 ? '#4ec9b0' : '#f44747';

  return (
    <div
      className="flex items-center justify-between px-4 py-1.5 font-mono text-[13px] border-b"
      style={{ background: '#0a0a0a', borderColor: '#222' }}
    >
      {/* Left: Account Cluster */}
      <div className="flex items-center gap-2">
        <span className="text-gray-200 font-bold text-[15px]">
          {accountValue !== null ? formatCompact(accountValue) : '—'}
        </span>
        <span>
          <span className="text-gray-600">today </span>
          <span style={{ color: pnlColor, textShadow: `0 0 8px ${pnlColor}40` }}>
            {dailyPnl >= 0 ? '+' : ''}{formatCurrency(dailyPnl)}
          </span>
        </span>
      </div>

      {/* Center: Unrealized PnL — hidden on mobile */}
      {!isMobile && totalUnrealizedPnl !== null && openPositionCount > 0 && (
        <span className="text-gray-400">
          <span className="text-gray-600">uPnL </span>
          <span style={{ color: totalUnrealizedPnl >= 0 ? '#4ec9b0' : '#f44747' }}>
            {totalUnrealizedPnl >= 0 ? '+' : ''}{formatCurrency(totalUnrealizedPnl)}
          </span>
        </span>
      )}

      {/* Right: Alert Indicators */}
      <div className="flex items-center gap-3">
        {lossStreak >= 3 && (
          <span
            className="px-1.5 py-0.5 text-[11px] font-bold rounded"
            style={{
              color: lossStreak >= 5 ? '#f44747' : '#ff8c00',
              background: lossStreak >= 5 ? '#f4474715' : '#ff8c0015',
              border: `1px solid ${lossStreak >= 5 ? '#f4474740' : '#ff8c0040'}`,
            }}
          >
            L{lossStreak}
          </span>
        )}
        <span
          style={{
            color: cbStatus.tripped ? '#f44747' : '#4ec9b0',
            fontSize: 10,
            animation: cbStatus.tripped
              ? 'pulse 0.5s ease-in-out infinite alternate'
              : 'pulse 2s ease-in-out infinite',
          }}
          title={`Daily: ${formatCurrency(cbStatus.dailyLoss)} | Weekly: ${formatCurrency(cbStatus.weeklyLoss)}`}
        >●</span>
      </div>
    </div>
  );
}
