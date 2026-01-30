-- SystemTrader Database Schema
-- Run this in the Supabase SQL Editor

-- Strategies table
CREATE TABLE strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Rules table
CREATE TABLE rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id UUID REFERENCES strategies ON DELETE CASCADE,
  text TEXT NOT NULL,
  "order" INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Trades table
CREATE TABLE trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  strategy_id UUID REFERENCES strategies ON DELETE SET NULL,
  strategy_name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  direction TEXT CHECK (direction IN ('Long', 'Short')),
  entry_price DOUBLE PRECISION NOT NULL,
  exit_price DOUBLE PRECISION,
  quantity DOUBLE PRECISION NOT NULL,
  outcome TEXT CHECK (outcome IN ('Win', 'Loss', 'Breakeven', 'Open')),
  pnl DOUBLE PRECISION,
  notes TEXT DEFAULT '',
  entry_date TIMESTAMPTZ NOT NULL,
  exit_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Rule compliance per trade
CREATE TABLE trade_rule_compliance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id UUID REFERENCES trades ON DELETE CASCADE,
  rule_id UUID,
  rule_text TEXT NOT NULL,
  followed BOOLEAN DEFAULT false
);

-- Subscriptions table
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL UNIQUE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  status TEXT DEFAULT 'free',
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_strategies_user_id ON strategies(user_id);
CREATE INDEX idx_trades_user_id ON trades(user_id);
CREATE INDEX idx_trades_strategy_id ON trades(strategy_id);
CREATE INDEX idx_rules_strategy_id ON rules(strategy_id);
CREATE INDEX idx_trade_rule_compliance_trade_id ON trade_rule_compliance(trade_id);
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);

-- Row Level Security
ALTER TABLE strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_rule_compliance ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Strategies policies
CREATE POLICY "Users can view their own strategies"
  ON strategies FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own strategies"
  ON strategies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own strategies"
  ON strategies FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own strategies"
  ON strategies FOR DELETE
  USING (auth.uid() = user_id);

-- Rules policies (access via strategy ownership)
CREATE POLICY "Users can view rules for their strategies"
  ON rules FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM strategies WHERE strategies.id = rules.strategy_id AND strategies.user_id = auth.uid()
  ));

CREATE POLICY "Users can create rules for their strategies"
  ON rules FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM strategies WHERE strategies.id = rules.strategy_id AND strategies.user_id = auth.uid()
  ));

CREATE POLICY "Users can update rules for their strategies"
  ON rules FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM strategies WHERE strategies.id = rules.strategy_id AND strategies.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete rules for their strategies"
  ON rules FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM strategies WHERE strategies.id = rules.strategy_id AND strategies.user_id = auth.uid()
  ));

-- Trades policies
CREATE POLICY "Users can view their own trades"
  ON trades FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own trades"
  ON trades FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trades"
  ON trades FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trades"
  ON trades FOR DELETE
  USING (auth.uid() = user_id);

-- Trade rule compliance policies (access via trade ownership)
CREATE POLICY "Users can view compliance for their trades"
  ON trade_rule_compliance FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM trades WHERE trades.id = trade_rule_compliance.trade_id AND trades.user_id = auth.uid()
  ));

CREATE POLICY "Users can create compliance for their trades"
  ON trade_rule_compliance FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM trades WHERE trades.id = trade_rule_compliance.trade_id AND trades.user_id = auth.uid()
  ));

CREATE POLICY "Users can update compliance for their trades"
  ON trade_rule_compliance FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM trades WHERE trades.id = trade_rule_compliance.trade_id AND trades.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete compliance for their trades"
  ON trade_rule_compliance FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM trades WHERE trades.id = trade_rule_compliance.trade_id AND trades.user_id = auth.uid()
  ));

-- Subscriptions policies
CREATE POLICY "Users can view their own subscription"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own subscription"
  ON subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription"
  ON subscriptions FOR UPDATE
  USING (auth.uid() = user_id);
