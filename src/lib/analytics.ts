import { Trade } from './types';

export interface AnalyticsResult {
  totalTrades: number;
  openTrades: number;
  closedTrades: number;
  wins: number;
  losses: number;
  winRate: string;
  totalPnl: number;
  avgPnl: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  expectancy: number;
  sharpeRatio: number | null;
  maxDrawdown: number;
  maxDrawdownPct: number;
  bestTrade: number | null;
  worstTrade: number | null;
  longestWinStreak: number;
  longestLossStreak: number;
}

export function computeAnalytics(trades: Trade[]): AnalyticsResult {
  const closed = trades.filter((t) => t.outcome !== 'Open');
  const open = trades.filter((t) => t.outcome === 'Open');
  const pnls = closed.map((t) => t.pnl ?? 0);
  const winTrades = closed.filter((t) => t.outcome === 'Win');
  const lossTrades = closed.filter((t) => t.outcome === 'Loss');

  const totalPnl = pnls.reduce((s, p) => s + p, 0);
  const wins = winTrades.length;
  const losses = lossTrades.length;
  const winRate = closed.length > 0 ? ((wins / closed.length) * 100).toFixed(1) : '0.0';

  const avgPnl = closed.length > 0 ? totalPnl / closed.length : 0;
  const avgWin = wins > 0 ? winTrades.reduce((s, t) => s + (t.pnl ?? 0), 0) / wins : 0;
  const avgLoss = losses > 0 ? Math.abs(lossTrades.reduce((s, t) => s + (t.pnl ?? 0), 0) / losses) : 0;

  const grossProfit = winTrades.reduce((s, t) => s + (t.pnl ?? 0), 0);
  const grossLoss = Math.abs(lossTrades.reduce((s, t) => s + (t.pnl ?? 0), 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? Infinity : 0);

  const winRateNum = closed.length > 0 ? wins / closed.length : 0;
  const expectancy = closed.length > 0
    ? (winRateNum * avgWin) - ((1 - winRateNum) * avgLoss)
    : 0;

  const sharpeRatio = computeSharpe(pnls);
  const { maxDrawdown, maxDrawdownPct } = computeMaxDrawdown(pnls);

  const bestTrade = pnls.length > 0 ? Math.max(...pnls) : null;
  const worstTrade = pnls.length > 0 ? Math.min(...pnls) : null;

  const { longestWinStreak, longestLossStreak } = computeStreaks(closed);

  return {
    totalTrades: trades.length,
    openTrades: open.length,
    closedTrades: closed.length,
    wins,
    losses,
    winRate,
    totalPnl,
    avgPnl,
    avgWin,
    avgLoss,
    profitFactor,
    expectancy,
    sharpeRatio,
    maxDrawdown,
    maxDrawdownPct,
    bestTrade,
    worstTrade,
    longestWinStreak,
    longestLossStreak,
  };
}

function computeSharpe(pnls: number[]): number | null {
  if (pnls.length < 2) return null;
  const mean = pnls.reduce((s, p) => s + p, 0) / pnls.length;
  const variance = pnls.reduce((s, p) => s + (p - mean) ** 2, 0) / (pnls.length - 1);
  const stdDev = Math.sqrt(variance);
  if (stdDev === 0) return null;
  return (mean / stdDev) * Math.sqrt(252);
}

function computeMaxDrawdown(pnls: number[]): { maxDrawdown: number; maxDrawdownPct: number } {
  if (pnls.length === 0) return { maxDrawdown: 0, maxDrawdownPct: 0 };

  let cumulative = 0;
  let peak = 0;
  let maxDD = 0;
  let maxDDPct = 0;

  for (const pnl of pnls) {
    cumulative += pnl;
    if (cumulative > peak) peak = cumulative;
    const dd = peak - cumulative;
    if (dd > maxDD) {
      maxDD = dd;
      maxDDPct = peak > 0 ? (dd / peak) * 100 : 0;
    }
  }

  return { maxDrawdown: maxDD, maxDrawdownPct: maxDDPct };
}

function computeStreaks(closed: Trade[]): { longestWinStreak: number; longestLossStreak: number } {
  let winStreak = 0, lossStreak = 0;
  let maxWin = 0, maxLoss = 0;

  const sorted = [...closed].sort(
    (a, b) => new Date(a.entry_date).getTime() - new Date(b.entry_date).getTime()
  );

  for (const t of sorted) {
    if (t.outcome === 'Win') {
      winStreak++;
      lossStreak = 0;
      if (winStreak > maxWin) maxWin = winStreak;
    } else if (t.outcome === 'Loss') {
      lossStreak++;
      winStreak = 0;
      if (lossStreak > maxLoss) maxLoss = lossStreak;
    } else {
      winStreak = 0;
      lossStreak = 0;
    }
  }

  return { longestWinStreak: maxWin, longestLossStreak: maxLoss };
}
