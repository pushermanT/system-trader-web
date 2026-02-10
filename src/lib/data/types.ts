import { Strategy, Rule, Trade, TradeRuleCompliance, ChatSession } from '@/lib/types';

export interface Memory {
  id: string;
  user_id: string;
  content: string;
  category: 'pattern' | 'preference' | 'lesson' | 'fact' | 'goal' | 'general';
  source_session_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface SessionSummary {
  id: string;
  session_id: string;
  user_id: string;
  summary: string;
  topics: string[];
  message_count: number;
  created_at: string;
  updated_at: string;
}

export interface TradeInput {
  strategy_id: string | null;
  strategy_name: string;
  symbol: string;
  direction: 'Long' | 'Short';
  entry_price: number;
  exit_price: number | null;
  stop_loss_price: number | null;
  take_profit_price: number | null;
  max_loss: number | null;
  quantity: number;
  outcome: 'Win' | 'Loss' | 'Breakeven' | 'Open';
  pnl: number | null;
  notes: string;
  autopsy: string | null;
  pre_entry_emotion: string | null;
  entry_date: string;
  exit_date: string | null;
  compliance: { rule_id: string | null; rule_text: string; followed: boolean }[];
}

export interface RiskSettings {
  daily_loss_limit: number | null;
  weekly_loss_limit: number | null;
  portfolio_value: number | null;
  max_risk_per_trade_pct: number | null;
  max_symbol_concentration_pct: number | null;
  nickname: string | null;
}

export interface DataRepo {
  // Strategies
  getStrategies(): Promise<(Strategy & { rules: Rule[] })[]>;
  createStrategy(data: { name: string; description: string; rules: string[]; max_loss_threshold?: number | null }): Promise<Strategy | null>;
  updateStrategy(id: string, data: { name: string; description: string; rules: string[]; max_loss_threshold?: number | null }): Promise<void>;
  toggleStrategyActive(id: string, currentlyActive: boolean): Promise<void>;
  deleteStrategy(id: string): Promise<void>;

  // Trades
  getTrades(): Promise<Trade[]>;
  createTrade(data: TradeInput): Promise<Trade | null>;
  updateTrade(id: string, data: TradeInput): Promise<void>;
  deleteTrade(id: string): Promise<void>;

  // Bulk
  bulkCreateTrades(trades: TradeInput[]): Promise<void>;

  // Stats
  getTradesWithCompliance(): Promise<{ trades: Trade[]; compliance: TradeRuleCompliance[] }>;

  // Referrals
  getReferralCode(): Promise<string | null>;
  setReferralCode(code: string): Promise<{ success: boolean; error?: string }>;
  checkReferralCodeAvailable(code: string): Promise<boolean>;
  getReferralCount(): Promise<number>;

  // Risk settings
  getRiskSettings(): Promise<RiskSettings>;
  saveRiskSettings(settings: RiskSettings): Promise<void>;

  // Chat sessions
  getChatSessions(): Promise<ChatSession[]>;
  createChatSession(title?: string): Promise<ChatSession | null>;
  updateSessionTitle(id: string, title: string): Promise<void>;
  deleteChatSession(id: string): Promise<void>;

  // Chat messages
  getChatMessages(sessionId: string, limit?: number): Promise<{ role: string; content: string }[]>;
  saveChatMessage(sessionId: string, role: string, content: string, toolCalls?: unknown): Promise<void>;

  // Trader profile
  getTraderProfile(): Promise<string>;
  updateTraderProfile(content: string): Promise<void>;

  // Nickname
  saveNickname(name: string): Promise<void>;

  // Auth info
  isAnonymous(): boolean;
}
