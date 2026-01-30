import { Trade } from './types';

export interface PnlDataPoint {
  time: string;
  value: number;
}

export function buildCumulativePnlSeries(trades: Trade[]): PnlDataPoint[] {
  const closed = trades.filter(
    (t): t is Trade & { exit_date: string; pnl: number } =>
      t.exit_date !== null && t.pnl !== null && t.outcome !== 'Open'
  );

  closed.sort(
    (a, b) => new Date(a.exit_date).getTime() - new Date(b.exit_date).getTime()
  );

  // Aggregate same-day trades (lightweight-charts requires unique timestamps)
  const dailyMap = new Map<string, number>();
  for (const t of closed) {
    const day = t.exit_date.slice(0, 10); // YYYY-MM-DD
    dailyMap.set(day, (dailyMap.get(day) ?? 0) + t.pnl);
  }

  let cumulative = 0;
  const series: PnlDataPoint[] = [];
  for (const [day, pnl] of dailyMap) {
    cumulative += pnl;
    series.push({ time: day, value: cumulative });
  }

  return series;
}
