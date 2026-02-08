'use client';

import { formatCurrency } from '@/lib/utils';
import { CircuitBreakerStatus } from '@/lib/risk';

interface CircuitBreakerBarProps {
  status: CircuitBreakerStatus;
  dailyLimit: number | null;
  weeklyLimit: number | null;
}

export default function CircuitBreakerBar({ status, dailyLimit, weeklyLimit }: CircuitBreakerBarProps) {
  if (!dailyLimit && !weeklyLimit) return null;

  const dailyPct = dailyLimit ? Math.min(100, (status.dailyLoss / dailyLimit) * 100) : 0;
  const weeklyPct = weeklyLimit ? Math.min(100, (status.weeklyLoss / weeklyLimit) * 100) : 0;

  function barColor(pct: number, tripped: boolean): string {
    if (tripped) return '#f44747';
    if (pct >= 80) return '#dcdcaa';
    return '#4ec9b0';
  }

  return (
    <div
      className="flex flex-wrap items-center gap-x-6 gap-y-1 px-4 py-1.5 font-mono text-[13px]"
      style={{ background: status.tripped ? '#1a0a0a' : '#0a0a0a', borderBottom: `1px solid ${status.tripped ? '#f44747' : '#222'}` }}
    >
      {status.tripped && (
        <span className="text-red-400 font-bold uppercase tracking-wider text-[14px]">CIRCUIT BREAKER</span>
      )}
      {dailyLimit && (
        <span className="flex items-center gap-2">
          <span className="text-gray-500">DAY:</span>
          <span style={{ color: barColor(dailyPct, status.dailyTripped) }}>
            {formatCurrency(status.dailyLoss)} / {formatCurrency(dailyLimit)}
          </span>
          <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${dailyPct}%`, background: barColor(dailyPct, status.dailyTripped) }} />
          </div>
        </span>
      )}
      {weeklyLimit && (
        <span className="flex items-center gap-2">
          <span className="text-gray-500">WEEK:</span>
          <span style={{ color: barColor(weeklyPct, status.weeklyTripped) }}>
            {formatCurrency(status.weeklyLoss)} / {formatCurrency(weeklyLimit)}
          </span>
          <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${weeklyPct}%`, background: barColor(weeklyPct, status.weeklyTripped) }} />
          </div>
        </span>
      )}
    </div>
  );
}
