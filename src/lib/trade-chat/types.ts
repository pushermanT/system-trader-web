export type ConversationStep =
  | 'what'
  | 'why'
  | 'how_much'
  | 'exit_plan'
  | 'rule_check'
  | 'complete';

export type ConversationStatus =
  | 'in_progress'
  | 'approved'
  | 'blocked'
  | 'revised'
  | 'overridden'
  | 'abandoned';

export type MessageRole = 'ai' | 'user' | 'system';

export type TradeDirection = 'long' | 'short';

export type UserRuleType =
  | 'position_size'
  | 'stop_loss'
  | 'asset_allocation'
  | 'entry_logic'
  | 'custom';

export interface UserRule {
  id: string;
  user_id: string;
  rule_type: UserRuleType;
  rule_text: string;
  rule_params: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface PortfolioPosition {
  id: string;
  user_id: string;
  asset: string;
  quantity: number;
  avg_entry_price: number | null;
  current_allocation_pct: number | null;
  updated_at: string;
}

export interface TradeData {
  asset?: string;
  direction?: TradeDirection;
  thesis?: string;
  trigger?: string;
  position_size_pct?: number;
  position_size_usd?: number;
  entry_price?: number;
  stop_loss?: number;
  take_profit?: number;
  stop_distance_pct?: number;
  risk_reward_ratio?: number;
}

export interface TradeSummary {
  trade: TradeData;
  rules_passed: boolean;
  risk_reward_ratio: number;
  estimated_loss_at_stop: number | null;
  estimated_gain_at_tp: number | null;
  portfolio_impact: string;
}

export interface RuleViolation {
  rule_id: string;
  rule_type: UserRuleType;
  rule_text: string;
  rule_created_at: string;
  violation_description: string;
  current_value: string;
  rule_limit: string;
}

export interface CardMetadata {
  isCard: true;
  cardType: 'summary' | 'violation';
  cardData: TradeSummary | RuleViolation[];
}

export interface StepMetadata {
  step: ConversationStep;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: string;
  metadata?: StepMetadata | CardMetadata;
}

export interface ConversationState {
  id: string | null;
  step: ConversationStep;
  status: ConversationStatus;
  messages: ChatMessage[];
  tradeData: TradeData;
  violations: RuleViolation[];
  isAiTyping: boolean;
  error: string | null;
  overrideRequestedAt: string | null;
  overrideAvailableAt: string | null;
}

export interface ApiChatRequest {
  conversationId: string | null;
  userMessage: string;
  currentStep: ConversationStep;
  tradeData: TradeData;
  messages: ChatMessage[];
}

export interface ApiChatResponse {
  conversationId: string;
  aiMessage: string;
  extractedData: Partial<TradeData>;
  step: ConversationStep;
  stepComplete: boolean;
  status: ConversationStatus;
  flags?: string[];
  violations?: RuleViolation[];
  summary?: TradeSummary;
  overrideRequestedAt?: string | null;
  overrideAvailableAt?: string | null;
}

export interface ApiErrorResponse {
  error: string;
  code?: string;
}
