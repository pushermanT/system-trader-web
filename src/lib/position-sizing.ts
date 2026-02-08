import { Trade } from './types';

export function maxRiskDollars(portfolioValue: number, maxRiskPct: number): number {
  return portfolioValue * (maxRiskPct / 100);
}

export function riskAsPercentOfPortfolio(risk: number, portfolioValue: number): number {
  if (portfolioValue <= 0) return 0;
  return (risk / portfolioValue) * 100;
}

export interface SymbolConcentration {
  symbol: string;
  exposure: number;
  pct: number;
  exceeds: boolean;
}

export function symbolConcentrations(
  trades: Trade[],
  portfolioValue: number,
  maxPct: number | null,
): SymbolConcentration[] {
  const openTrades = trades.filter((t) => t.outcome === 'Open');
  const bySymbol = new Map<string, number>();

  for (const t of openTrades) {
    const exposure = t.entry_price * t.quantity;
    bySymbol.set(t.symbol, (bySymbol.get(t.symbol) ?? 0) + exposure);
  }

  return [...bySymbol.entries()]
    .map(([symbol, exposure]) => {
      const pct = portfolioValue > 0 ? (exposure / portfolioValue) * 100 : 0;
      return { symbol, exposure, pct, exceeds: maxPct !== null && pct > maxPct };
    })
    .sort((a, b) => b.pct - a.pct);
}

export function aggregateOpenRisk(trades: Trade[]): number {
  return trades
    .filter((t) => t.outcome === 'Open' && t.stop_loss_price !== null)
    .reduce((sum, t) => sum + Math.abs(t.entry_price - t.stop_loss_price!) * t.quantity, 0);
}
