import { Trade } from './types';

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfWeek(date: Date): Date {
  const d = startOfDay(date);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1)); // Monday start
  return d;
}

function closedLosses(trades: Trade[], since: Date): number {
  return trades
    .filter((t) => t.outcome !== 'Open' && t.pnl !== null && t.pnl < 0 && new Date(t.exit_date ?? t.entry_date) >= since)
    .reduce((sum, t) => sum + Math.abs(t.pnl!), 0);
}

export function dailyLoss(trades: Trade[]): number {
  return closedLosses(trades, startOfDay(new Date()));
}

export function weeklyLoss(trades: Trade[]): number {
  return closedLosses(trades, startOfWeek(new Date()));
}

export interface CircuitBreakerStatus {
  dailyLoss: number;
  weeklyLoss: number;
  dailyTripped: boolean;
  weeklyTripped: boolean;
  tripped: boolean;
}

export function checkCircuitBreaker(
  trades: Trade[],
  dailyLimit: number | null,
  weeklyLimit: number | null,
): CircuitBreakerStatus {
  const dLoss = dailyLoss(trades);
  const wLoss = weeklyLoss(trades);
  const dailyTripped = dailyLimit !== null && dLoss >= dailyLimit;
  const weeklyTripped = weeklyLimit !== null && wLoss >= weeklyLimit;
  return {
    dailyLoss: dLoss,
    weeklyLoss: wLoss,
    dailyTripped,
    weeklyTripped,
    tripped: dailyTripped || weeklyTripped,
  };
}
