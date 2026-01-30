export interface Strategy {
  id: string;
  user_id: string;
  name: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  rules?: Rule[];
}

export interface Rule {
  id: string;
  strategy_id: string;
  text: string;
  order: number;
  created_at: string;
}

export interface Trade {
  id: string;
  user_id: string;
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
  created_at: string;
  updated_at: string;
}

export interface TradeRuleCompliance {
  id: string;
  trade_id: string;
  rule_id: string | null;
  rule_text: string;
  followed: boolean;
}

