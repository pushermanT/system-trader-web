-- Trade Chat Migration
-- Adds user_rules, portfolio, trade_conversations tables
-- Run this in the Supabase SQL Editor AFTER migration.sql

-- User's trading rules (user-scoped, separate from strategy-scoped `rules` table)
CREATE TABLE IF NOT EXISTS user_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('position_size', 'stop_loss', 'asset_allocation', 'entry_logic', 'custom')),
  rule_text TEXT NOT NULL,
  rule_params JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Portfolio positions (snapshot state for allocation validation)
CREATE TABLE IF NOT EXISTS portfolio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  asset TEXT NOT NULL,
  quantity DOUBLE PRECISION NOT NULL,
  avg_entry_price DOUBLE PRECISION,
  current_allocation_pct DOUBLE PRECISION,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Trade conversation logs
CREATE TABLE IF NOT EXISTS trade_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'approved', 'blocked', 'revised', 'overridden', 'abandoned')),
  current_step TEXT NOT NULL DEFAULT 'what' CHECK (current_step IN ('what', 'why', 'how_much', 'exit_plan', 'rule_check', 'complete')),
  trade_data JSONB DEFAULT '{}'::jsonb,
  messages JSONB DEFAULT '[]'::jsonb,
  rule_violations JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  override_requested_at TIMESTAMPTZ,
  override_available_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_rules_user_id ON user_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_user_rules_active ON user_rules(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_portfolio_user_id ON portfolio(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_user_asset ON portfolio(user_id, asset);
CREATE INDEX IF NOT EXISTS idx_trade_conversations_user_id ON trade_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_trade_conversations_status ON trade_conversations(user_id, status);

-- Row Level Security
ALTER TABLE user_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_conversations ENABLE ROW LEVEL SECURITY;

-- user_rules policies
CREATE POLICY "Users can view their own rules"
  ON user_rules FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own rules"
  ON user_rules FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own rules"
  ON user_rules FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own rules"
  ON user_rules FOR DELETE
  USING (auth.uid() = user_id);

-- portfolio policies
CREATE POLICY "Users can view their own portfolio"
  ON portfolio FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own portfolio positions"
  ON portfolio FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own portfolio positions"
  ON portfolio FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own portfolio positions"
  ON portfolio FOR DELETE
  USING (auth.uid() = user_id);

-- trade_conversations policies
CREATE POLICY "Users can view their own conversations"
  ON trade_conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own conversations"
  ON trade_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversations"
  ON trade_conversations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversations"
  ON trade_conversations FOR DELETE
  USING (auth.uid() = user_id);

-- Optional: seed demo rules for the currently authenticated user
-- Uncomment and run manually if you want a demo dataset
-- INSERT INTO user_rules (user_id, rule_type, rule_text, rule_params, created_at) VALUES
--   (auth.uid(), 'position_size', 'No single position larger than 15% of portfolio', '{"max_allocation_pct": 15}'::jsonb, '2026-03-03T10:00:00Z'),
--   (auth.uid(), 'stop_loss', 'Every trade must have a stop loss within 10% of entry', '{"max_stop_distance_pct": 10}'::jsonb, '2026-03-03T10:00:00Z'),
--   (auth.uid(), 'entry_logic', 'If price hits TP and reverses, I take profit. I don''t turn a momentum trade into a value trade.', '{"type": "momentum_reversal"}'::jsonb, '2026-03-03T10:00:00Z'),
--   (auth.uid(), 'custom', 'No trading within 1 hour of waking up. Morning brain makes bad decisions.', '{"type": "time_restriction"}'::jsonb, '2026-03-15T10:00:00Z'),
--   (auth.uid(), 'asset_allocation', 'Max 40% crypto exposure in total portfolio', '{"max_crypto_pct": 40}'::jsonb, '2026-02-20T10:00:00Z');
