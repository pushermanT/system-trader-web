'use client';

import { Trade, Strategy, Rule } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

interface OpenPositionsProps {
  trades: Trade[];
  strategies: (Strategy & { rules: Rule[] })[];
}

function formatDuration(entryDate: string): string {
  const ms = Date.now() - new Date(entryDate).getTime();
  const hours = Math.floor(ms / 3600000);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h`;
  const mins = Math.floor(ms / 60000);
  return `${mins}m`;
}

function getStatus(
  trade: Trade,
  strategy: (Strategy & { rules: Rule[] }) | undefined,
  avgHoldMs: number
): { label: string; color: string } {
  const risk = trade.stop_loss_price !== null
    ? Math.abs(trade.entry_price - trade.stop_loss_price) * trade.quantity
    : null;
  const threshold = strategy?.max_loss_threshold ?? null;

  if (risk !== null && threshold !== null && risk >= threshold * 0.8) {
    return { label: 'EXIT', color: '#f44747' };
  }

  const holdMs = Date.now() - new Date(trade.entry_date).getTime();
  if (avgHoldMs > 0 && holdMs > avgHoldMs * 1.5) {
    return { label: 'WATCH', color: '#dcdcaa' };
  }

  return { label: 'OK', color: '#4ec9b0' };
}

export default function OpenPositions({ trades, strategies }: OpenPositionsProps) {
  const openTrades = trades.filter((t) => t.outcome === 'Open');

  // Calculate avg hold time from closed trades
  const closedWithExit = trades.filter((t) => t.outcome !== 'Open' && t.exit_date);
  const avgHoldMs = closedWithExit.length > 0
    ? closedWithExit.reduce((s, t) => {
        return s + (new Date(t.exit_date!).getTime() - new Date(t.entry_date).getTime());
      }, 0) / closedWithExit.length
    : 0;

  const totalRisk = openTrades.reduce((sum, t) => {
    if (t.stop_loss_price === null) return sum;
    return sum + Math.abs(t.entry_price - t.stop_loss_price) * t.quantity;
  }, 0);

  const noStopCount = openTrades.filter((t) => t.stop_loss_price === null).length;

  if (openTrades.length === 0) {
    return (
      <div className="p-4 font-mono text-sm text-gray-600 tracking-wider">
        NO OPEN POSITIONS
      </div>
    );
  }

  return (
    <div className="p-2">
      <div className="flex items-center justify-between mb-2 px-1 font-mono text-sm text-gray-500">
        <span>
          TOTAL RISK: <span style={{ color: '#f44747' }}>{formatCurrency(totalRisk)}</span>
          {noStopCount > 0 && (
            <span className="ml-2" style={{ color: '#f44747' }}>({noStopCount} NO STOP)</span>
          )}
        </span>
        <span>{openTrades.length} OPEN</span>
      </div>

      <table className="w-full text-[15px] font-mono">
        <thead>
          <tr className="text-gray-500 border-b border-gray-800">
            <th className="text-left py-1.5 px-2 font-normal">SYM</th>
            <th className="text-center py-1.5 px-2 font-normal">DIR</th>
            <th className="text-right py-1.5 px-2 font-normal">ENTRY</th>
            <th className="text-right py-1.5 px-2 font-normal">STOP</th>
            <th className="text-right py-1.5 px-2 font-normal">RISK ($)</th>
            <th className="text-center py-1.5 px-2 font-normal">TIME</th>
            <th className="text-center py-1.5 px-2 font-normal">STATUS</th>
          </tr>
        </thead>
        <tbody>
          {openTrades.map((t) => {
            const strategy = strategies.find((s) => s.id === t.strategy_id);
            const risk = t.stop_loss_price !== null
              ? Math.abs(t.entry_price - t.stop_loss_price) * t.quantity
              : null;
            const status = getStatus(t, strategy, avgHoldMs);

            return (
              <tr key={t.id} className="border-b border-gray-800/50 hover:bg-white/[0.03] transition-colors">
                <td className="py-2.5 px-2 text-gray-200 font-medium">{t.symbol}</td>
                <td className="text-center py-2.5 px-2">
                  <span style={{ color: t.direction === 'Long' ? '#4ec9b0' : '#f44747' }}>
                    {t.direction === 'Long' ? 'LNG' : 'SHT'}
                  </span>
                </td>
                <td className="text-right py-2.5 px-2 text-gray-300">{formatCurrency(t.entry_price)}</td>
                <td className="text-right py-2.5 px-2 text-gray-300">
                  {t.stop_loss_price !== null ? formatCurrency(t.stop_loss_price) : '—'}
                </td>
                <td className="text-right py-2.5 px-2 font-medium">
                  {risk !== null ? (
                    <span style={{ color: '#f44747' }}>{formatCurrency(risk)}</span>
                  ) : (
                    <span style={{ color: '#f44747' }}>NO STOP</span>
                  )}
                </td>
                <td className="text-center py-2.5 px-2 text-gray-400">{formatDuration(t.entry_date)}</td>
                <td className="text-center py-2.5 px-2">
                  <span
                    className="px-1.5 py-0.5 text-[13px] font-bold rounded"
                    style={{
                      color: status.color,
                      background: `${status.color}15`,
                      border: `1px solid ${status.color}40`,
                    }}
                  >
                    {status.label}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
