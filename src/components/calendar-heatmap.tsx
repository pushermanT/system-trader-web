'use client';

import { useState, useMemo } from 'react';
import { Trade } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

interface CalendarHeatmapProps {
  trades: Trade[];
}

interface DayData {
  date: string;
  pnl: number;
  tradeCount: number;
  best: number;
  worst: number;
}

export default function CalendarHeatmap({ trades }: CalendarHeatmapProps) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; data: DayData } | null>(null);

  const { dayMap, months, monthlyPnl } = useMemo(() => {
    const map = new Map<string, DayData>();

    const closed = trades.filter((t) => t.outcome !== 'Open' && t.exit_date && t.pnl !== null);
    for (const t of closed) {
      const date = t.exit_date!.slice(0, 10);
      const existing = map.get(date);
      if (existing) {
        existing.pnl += t.pnl!;
        existing.tradeCount++;
        existing.best = Math.max(existing.best, t.pnl!);
        existing.worst = Math.min(existing.worst, t.pnl!);
      } else {
        map.set(date, { date, pnl: t.pnl!, tradeCount: 1, best: t.pnl!, worst: t.pnl! });
      }
    }

    // Build 12-month range ending at current month
    const now = new Date();
    const monthsList: { year: number; month: number; label: string }[] = [];
    const monthPnl = new Map<string, number>();

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthsList.push({
        year: d.getFullYear(),
        month: d.getMonth(),
        label: d.toLocaleString('default', { month: 'short' }).toUpperCase(),
      });
      monthPnl.set(key, 0);
    }

    for (const [dateStr, data] of map) {
      const monthKey = dateStr.slice(0, 7);
      if (monthPnl.has(monthKey)) {
        monthPnl.set(monthKey, (monthPnl.get(monthKey) ?? 0) + data.pnl);
      }
    }

    return { dayMap: map, months: monthsList, monthlyPnl: monthPnl };
  }, [trades]);

  function getColor(pnl: number): string {
    if (pnl === 0) return '#222';
    if (pnl > 0) {
      const intensity = Math.min(pnl / 500, 1);
      const g = Math.floor(80 + intensity * 120);
      return `rgb(30, ${g}, 80)`;
    }
    const intensity = Math.min(Math.abs(pnl) / 500, 1);
    const r = Math.floor(80 + intensity * 120);
    return `rgb(${r}, 30, 30)`;
  }

  function getWeeksForMonth(year: number, month: number): (string | null)[][] {
    const weeks: (string | null)[][] = [];
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    let currentWeek: (string | null)[] = new Array(firstDay.getDay()).fill(null);

    for (let d = 1; d <= lastDay.getDate(); d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      currentWeek.push(dateStr);
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) currentWeek.push(null);
      weeks.push(currentWeek);
    }

    return weeks;
  }

  return (
    <div className="p-3 font-mono text-[13px]">
      {/* Heatmap grid */}
      <div className="flex flex-wrap gap-3 mb-4">
        {months.map((m) => {
          const weeks = getWeeksForMonth(m.year, m.month);
          return (
            <div key={`${m.year}-${m.month}`} className="flex-shrink-0">
              <div className="text-gray-500 text-[10px] mb-1 tracking-wider">{m.label}</div>
              <div className="flex flex-col gap-[2px]">
                {weeks.map((week, wi) => (
                  <div key={wi} className="flex gap-[2px]">
                    {week.map((date, di) => {
                      if (!date) return <div key={di} className="w-3 h-3" />;
                      const data = dayMap.get(date);
                      const bg = data ? getColor(data.pnl) : '#161616';
                      return (
                        <div
                          key={di}
                          className="w-3 h-3 cursor-pointer"
                          style={{ background: bg, borderRadius: 1 }}
                          onMouseEnter={(e) => {
                            if (data) {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setTooltip({ x: rect.left, y: rect.bottom + 4, data });
                            }
                          }}
                          onMouseLeave={() => setTooltip(null)}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Monthly summary */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px]" style={{ borderTop: '1px solid #222', paddingTop: 8 }}>
        {months.map((m) => {
          const key = `${m.year}-${String(m.month + 1).padStart(2, '0')}`;
          const pnl = monthlyPnl.get(key) ?? 0;
          return (
            <div key={key} className="flex gap-1">
              <span className="text-gray-600">{m.label}:</span>
              <span style={{ color: pnl > 0 ? '#4ec9b0' : pnl < 0 ? '#f44747' : '#555' }}>
                {formatCurrency(pnl)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 px-3 py-2 text-[13px] font-mono"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            background: '#1a1a1a',
            border: '1px solid #444',
            color: '#ddd',
            pointerEvents: 'none',
          }}
        >
          <div className="text-gray-400">{tooltip.data.date}</div>
          <div>Trades: <span className="text-gray-200">{tooltip.data.tradeCount}</span></div>
          <div>P&L: <span style={{ color: tooltip.data.pnl >= 0 ? '#4ec9b0' : '#f44747' }}>{formatCurrency(tooltip.data.pnl)}</span></div>
          <div>Best: <span style={{ color: '#4ec9b0' }}>{formatCurrency(tooltip.data.best)}</span></div>
          <div>Worst: <span style={{ color: '#f44747' }}>{formatCurrency(tooltip.data.worst)}</span></div>
        </div>
      )}
    </div>
  );
}
