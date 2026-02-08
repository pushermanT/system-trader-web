export interface Strategy {
  id: string;
  user_id: string;
  name: string;
  description: string;
  is_active: boolean;
  max_loss_threshold: number | null;
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
  stop_loss_price: number | null;
  max_loss: number | null;
  quantity: number;
  outcome: 'Win' | 'Loss' | 'Breakeven' | 'Open';
  pnl: number | null;
  notes: string;
  autopsy: string | null;
  pre_entry_emotion: string | null;
  entry_date: string;
  exit_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface TradeAutopsy {
  original_stop: string;
  moved_stop: boolean;
  why_moved: string;
  emotional_state: string;
  lesson: string;
  category: 'moved_stop' | 'no_stop' | 'averaged_down' | 'emotional' | 'ignored_rules' | 'other';
}

export interface TradeRuleCompliance {
  id: string;
  trade_id: string;
  rule_id: string | null;
  rule_text: string;
  followed: boolean;
}

