import { SupabaseClient } from '@supabase/supabase-js';
import { Strategy, Rule, Trade, TradeRuleCompliance } from '@/lib/types';

const KEYS = ['st_strategies', 'st_rules', 'st_trades', 'st_compliance'] as const;

export async function migrateLocalToSupabase(supabase: SupabaseClient, userId: string): Promise<void> {
  const strategies: Strategy[] = JSON.parse(localStorage.getItem('st_strategies') || '[]');
  const rules: Rule[] = JSON.parse(localStorage.getItem('st_rules') || '[]');
  const trades: Trade[] = JSON.parse(localStorage.getItem('st_trades') || '[]');
  const compliance: TradeRuleCompliance[] = JSON.parse(localStorage.getItem('st_compliance') || '[]');

  if (strategies.length === 0 && trades.length === 0) return;

  // Insert strategies
  if (strategies.length > 0) {
    await supabase.from('strategies').upsert(
      strategies.map((s) => ({
        id: s.id,
        user_id: userId,
        name: s.name,
        description: s.description,
        is_active: s.is_active,
        created_at: s.created_at,
        updated_at: s.updated_at,
      }))
    );
  }

  // Insert rules
  if (rules.length > 0) {
    await supabase.from('rules').upsert(
      rules.map((r) => ({
        id: r.id,
        strategy_id: r.strategy_id,
        text: r.text,
        order: r.order,
        created_at: r.created_at,
      }))
    );
  }

  // Insert trades
  if (trades.length > 0) {
    await supabase.from('trades').upsert(
      trades.map((t) => ({
        id: t.id,
        user_id: userId,
        strategy_id: t.strategy_id,
        strategy_name: t.strategy_name,
        symbol: t.symbol,
        direction: t.direction,
        entry_price: t.entry_price,
        exit_price: t.exit_price,
        quantity: t.quantity,
        outcome: t.outcome,
        pnl: t.pnl,
        notes: t.notes,
        entry_date: t.entry_date,
        exit_date: t.exit_date,
        created_at: t.created_at,
        updated_at: t.updated_at,
      }))
    );
  }

  // Insert compliance
  if (compliance.length > 0) {
    await supabase.from('trade_rule_compliance').upsert(
      compliance.map((c) => ({
        id: c.id,
        trade_id: c.trade_id,
        rule_id: c.rule_id,
        rule_text: c.rule_text,
        followed: c.followed,
      }))
    );
  }

  // Clear localStorage
  KEYS.forEach((key) => localStorage.removeItem(key));
}
