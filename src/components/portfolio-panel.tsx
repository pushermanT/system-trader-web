'use client';

import { Trade } from '@/lib/types';
import { RiskSettings } from '@/lib/data/types';
import { CircuitBreakerStatus } from '@/lib/risk';
import { formatCurrency } from '@/lib/utils';
import { PnlDataPoint } from '@/lib/chart-utils';

interface PortfolioPanelProps {
  accountValue: number | null;
  dailyPnl: number;
  totalPnl: number;
  unrealizedPnl: number | null;
  trades: Trade[];
  riskSettings: RiskSettings;
  lossStreak: number;
  cbStatus: CircuitBreakerStatus;
  winRate: string;
  closedTradeCount: number;
  pnlData: PnlDataPoint[];
  onShowRiskSettings: () => void;
}

function MiniEquityCurve({ data }: { data: PnlDataPoint[] }) {
  if (data.length < 2) {
    return (
      <div className="h-12 flex items-center justify-center text-gray-600 text-[10px] font-mono tracking-wider">
        {data.length === 0 ? 'NO CLOSED TRADES' : '1 DATA POINT'}
      </div>
    );
  }

  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 200;
  const h = 40;
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / range) * (h - 4) - 2;
      return `${x},${y}`;
    })
    .join(' ');

  const endColor = values[values.length - 1] >= 0 ? '#4ec9b0' : '#f44747';

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-12" preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke={endColor} strokeWidth="1.5" />
    </svg>
  );
}

function MetricRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex justify-between items-center px-1">
      <span className="text-[10px] text-gray-500">{label}</span>
      <span className="text-[11px]" style={{ color }}>{value}</span>
    </div>
  );
}

function cbBarColor(pct: number, tripped: boolean): string {
  if (tripped) return '#f44747';
  if (pct >= 80) return '#dcdcaa';
  return '#4ec9b0';
}

export default function PortfolioPanel({
  accountValue, dailyPnl, totalPnl, unrealizedPnl, trades,
  riskSettings, lossStreak, cbStatus, winRate, closedTradeCount,
  pnlData, onShowRiskSettings,
}: PortfolioPanelProps) {
  const openTrades = trades.filter((t) => t.outcome === 'Open');
  const openCount = openTrades.length;
  const exposure = openTrades.reduce((sum, t) => sum + t.entry_price * t.quantity, 0);
  const exposurePct = accountValue && accountValue > 0 ? (exposure / accountValue) * 100 : 0;
  const available = accountValue !== null ? Math.max(0, accountValue - exposure) : null;

  const exposureColor = exposurePct > 80 ? '#f44747' : exposurePct > 50 ? '#ff8c00' : '#4ec9b0';
  const streakColor = lossStreak >= 5 ? '#f44747' : lossStreak >= 3 ? '#ff8c00' : '#666';

  const dailyPct = riskSettings.daily_loss_limit
    ? Math.min(100, (cbStatus.dailyLoss / riskSettings.daily_loss_limit) * 100)
    : 0;
  const weeklyPct = riskSettings.weekly_loss_limit
    ? Math.min(100, (cbStatus.weeklyLoss / riskSettings.weekly_loss_limit) * 100)
    : 0;

  return (
    <div className="font-mono overflow-y-auto" style={{ maxHeight: '100%' }}>
      {/* Section 1: Account Summary */}
      <div className="p-3 mx-2 mt-2 rounded" style={{ background: '#0d0d0d', border: '1px solid #1a3a4a' }}>
        <div className="text-[20px] font-bold text-white">
          {accountValue !== null ? formatCurrency(accountValue) : '—'}
        </div>
        <div className="text-[13px] mt-0.5">
          <span
            style={{
              color: dailyPnl >= 0 ? '#4ec9b0' : '#f44747',
              textShadow: `0 0 8px ${dailyPnl >= 0 ? '#4ec9b040' : '#f4474740'}`,
            }}
          >
            {dailyPnl >= 0 ? '▲' : '▼'} {dailyPnl >= 0 ? '+' : ''}
            {formatCurrency(dailyPnl)} today
          </span>
        </div>

        <div className="mt-3 p-2 rounded" style={{ background: '#111' }}>
          <div className="text-[10px] text-gray-500 uppercase tracking-wider">Positions</div>
          <div className="text-[13px] text-gray-300">{openCount} open</div>
        </div>

        <div className="mt-3 space-y-1.5">
          {accountValue !== null && exposure > 0 && (
            <MetricRow
              label="Exposure"
              value={`${formatCurrency(exposure)} (${exposurePct.toFixed(0)}%)`}
              color={exposureColor}
            />
          )}
          {unrealizedPnl !== null && (
            <MetricRow
              label="Unrealized"
              value={`${unrealizedPnl >= 0 ? '+' : ''}${formatCurrency(unrealizedPnl)}`}
              color={unrealizedPnl >= 0 ? '#4ec9b0' : '#f44747'}
            />
          )}
          {available !== null && accountValue !== null && (
            <MetricRow label="Available" value={formatCurrency(available)} color="#ccc" />
          )}
          <MetricRow
            label="Total P&L"
            value={`${totalPnl >= 0 ? '+' : ''}${formatCurrency(totalPnl)}`}
            color={totalPnl >= 0 ? '#4ec9b0' : '#f44747'}
          />
        </div>
      </div>

      {/* Section 2: Equity Curve */}
      <div className="px-2 mt-3">
        <div className="text-[10px] text-gray-500 uppercase tracking-wider px-1 mb-1">EQUITY</div>
        <MiniEquityCurve data={pnlData} />
      </div>

      {/* Section 3: Positions */}
      <div className="px-2 mt-3">
        <div className="text-[10px] text-gray-500 uppercase tracking-wider px-1 mb-1">
          POSITIONS ({openCount})
        </div>
        {openCount === 0 ? (
          <div className="text-[11px] text-gray-600 px-1 py-2">No open positions</div>
        ) : (
          <div className="space-y-1">
            {openTrades.map((t) => {
              const risk =
                t.stop_loss_price !== null
                  ? Math.abs(t.entry_price - t.stop_loss_price) * t.quantity
                  : null;
              return (
                <div key={t.id} className="px-2 py-1.5 rounded" style={{ background: '#0d0d0d' }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[12px] text-gray-200 font-medium">{t.symbol}</span>
                      <span
                        className="text-[9px] px-1 py-0.5 rounded font-bold"
                        style={{
                          color: t.direction === 'Long' ? '#4ec9b0' : '#f44747',
                          background: t.direction === 'Long' ? '#4ec9b015' : '#f4474715',
                        }}
                      >
                        {t.direction === 'Long' ? 'LNG' : 'SHT'}
                      </span>
                    </div>
                    {risk !== null && (
                      <span className="text-[10px]" style={{ color: '#f44747' }}>
                        {formatCurrency(risk)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-500">
                    <span>Entry {formatCurrency(t.entry_price)}</span>
                    <span>Qty {t.quantity}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section 4: Risk */}
      <div className="px-2 mt-3 pb-3">
        <div className="flex items-center justify-between px-1 mb-1">
          <span className="text-[10px] text-gray-500 uppercase tracking-wider">RISK</span>
          <button
            onClick={onShowRiskSettings}
            className="text-[9px] text-gray-600 hover:text-gray-400 transition-colors tracking-wider"
          >
            LIMITS
          </button>
        </div>

        {riskSettings.daily_loss_limit !== null && (
          <div className="flex items-center gap-2 px-1 mb-1.5">
            <span className="text-[10px] text-gray-500 w-8">DAY</span>
            <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${dailyPct}%`, background: cbBarColor(dailyPct, cbStatus.dailyTripped) }}
              />
            </div>
            <span className="text-[10px]" style={{ color: cbBarColor(dailyPct, cbStatus.dailyTripped) }}>
              {formatCurrency(cbStatus.dailyLoss)}
            </span>
          </div>
        )}
        {riskSettings.weekly_loss_limit !== null && (
          <div className="flex items-center gap-2 px-1 mb-1.5">
            <span className="text-[10px] text-gray-500 w-8">WEEK</span>
            <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${weeklyPct}%`, background: cbBarColor(weeklyPct, cbStatus.weeklyTripped) }}
              />
            </div>
            <span className="text-[10px]" style={{ color: cbBarColor(weeklyPct, cbStatus.weeklyTripped) }}>
              {formatCurrency(cbStatus.weeklyLoss)}
            </span>
          </div>
        )}

        <div className="space-y-1 mt-2">
          <MetricRow label="Win Rate" value={`${winRate}%`} color="#dcdcaa" />
          <MetricRow label="Closed" value={String(closedTradeCount)} color="#ccc" />
          <MetricRow label="Loss Streak" value={String(lossStreak)} color={streakColor} />
        </div>
      </div>
    </div>
  );
}
