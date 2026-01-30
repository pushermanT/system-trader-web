import { Strategy, Rule, Trade, TradeRuleCompliance } from '@/lib/types';

export interface TradeInput {
  strategy_id: string | null;
  strategy_name: string;
  symbol: string;
  direction: 'Long' | 'Short';
  entry_price: number;
  exit_price: number | null;
  quantity: number;
  outcome: 'Win' | 'Loss' | 'Breakeven' | 'Open';
  pnl: number | null;
  notes: string;
  entry_date: string;
  exit_date: string | null;
  compliance: { rule_id: string | null; rule_text: string; followed: boolean }[];
}

export interface DataRepo {
  // Strategies
  getStrategies(): Promise<(Strategy & { rules: Rule[] })[]>;
  createStrategy(data: { name: string; description: string; rules: string[] }): Promise<Strategy | null>;
  updateStrategy(id: string, data: { name: string; description: string; rules: string[] }): Promise<void>;
  toggleStrategyActive(id: string, currentlyActive: boolean): Promise<void>;
  deleteStrategy(id: string): Promise<void>;

  // Trades
  getTrades(): Promise<Trade[]>;
  createTrade(data: TradeInput): Promise<Trade | null>;
  updateTrade(id: string, data: TradeInput): Promise<void>;
  deleteTrade(id: string): Promise<void>;

  // Stats
  getTradesWithCompliance(): Promise<{ trades: Trade[]; compliance: TradeRuleCompliance[] }>;

  // Referrals
  getReferralCount(): Promise<number>;

  // Auth info
  isAnonymous(): boolean;
}
