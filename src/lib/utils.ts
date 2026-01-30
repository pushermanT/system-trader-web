import { Trade } from './types';

export function calculatePnl(
  direction: 'Long' | 'Short',
  entryPrice: number,
  exitPrice: number,
  quantity: number
): number {
  if (direction === 'Long') {
    return (exitPrice - entryPrice) * quantity;
  }
  return (entryPrice - exitPrice) * quantity;
}

export function determineOutcome(pnl: number): 'Win' | 'Loss' | 'Breakeven' {
  if (pnl > 0) return 'Win';
  if (pnl < 0) return 'Loss';
  return 'Breakeven';
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}

export function calcWinRate(trades: Trade[]): number {
  const closed = trades.filter((t) => t.outcome !== 'Open');
  if (closed.length === 0) return 0;
  const wins = closed.filter((t) => t.outcome === 'Win').length;
  return (wins / closed.length) * 100;
}

export function calcTotalPnl(trades: Trade[]): number {
  return trades.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
}

export function calcAvgPnl(trades: Trade[]): number {
  const closed = trades.filter((t) => t.outcome !== 'Open');
  if (closed.length === 0) return 0;
  return calcTotalPnl(closed) / closed.length;
}
