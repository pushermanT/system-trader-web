import { SupabaseClient } from '@supabase/supabase-js';
import { Strategy, Rule, Trade, TradeRuleCompliance } from '@/lib/types';
import { DataRepo, TradeInput } from './types';

export class SupabaseRepo implements DataRepo {
  constructor(
    private supabase: SupabaseClient,
    private userId: string
  ) {}

  async getStrategies(): Promise<(Strategy & { rules: Rule[] })[]> {
    const { data } = await this.supabase
      .from('strategies')
      .select('*, rules(*)')
      .eq('user_id', this.userId)
      .order('created_at', { ascending: false });
    return data ?? [];
  }

  async createStrategy(data: { name: string; description: string; rules: string[] }): Promise<Strategy | null> {
    const { data: strategy, error } = await this.supabase
      .from('strategies')
      .insert({ name: data.name, description: data.description, user_id: this.userId })
      .select()
      .single();

    if (error || !strategy) return null;

    if (data.rules.length > 0) {
      await this.supabase.from('rules').insert(
        data.rules.map((text, i) => ({
          strategy_id: strategy.id,
          text,
          order: i,
        }))
      );
    }

    return strategy;
  }

  async updateStrategy(id: string, data: { name: string; description: string; rules: string[] }): Promise<void> {
    await this.supabase
      .from('strategies')
      .update({ name: data.name, description: data.description, updated_at: new Date().toISOString() })
      .eq('id', id);

    await this.supabase.from('rules').delete().eq('strategy_id', id);

    if (data.rules.length > 0) {
      await this.supabase.from('rules').insert(
        data.rules.map((text, i) => ({
          strategy_id: id,
          text,
          order: i,
        }))
      );
    }
  }

  async toggleStrategyActive(id: string, currentlyActive: boolean): Promise<void> {
    await this.supabase.from('strategies').update({ is_active: !currentlyActive }).eq('id', id);
  }

  async deleteStrategy(id: string): Promise<void> {
    await this.supabase.from('strategies').delete().eq('id', id);
  }

  async getTrades(): Promise<Trade[]> {
    const { data } = await this.supabase
      .from('trades')
      .select('*')
      .eq('user_id', this.userId)
      .order('entry_date', { ascending: false });
    return data ?? [];
  }

  async createTrade(data: TradeInput): Promise<Trade | null> {
    const { compliance, ...tradeData } = data;

    const { data: trade, error } = await this.supabase
      .from('trades')
      .insert({ ...tradeData, user_id: this.userId })
      .select()
      .single();

    if (error || !trade) return null;

    if (compliance.length > 0) {
      await this.supabase.from('trade_rule_compliance').insert(
        compliance.map((c) => ({
          trade_id: trade.id,
          rule_id: c.rule_id,
          rule_text: c.rule_text,
          followed: c.followed,
        }))
      );
    }

    return trade;
  }

  async updateTrade(id: string, data: TradeInput): Promise<void> {
    const { compliance, ...tradeData } = data;

    await this.supabase
      .from('trades')
      .update({ ...tradeData, updated_at: new Date().toISOString() })
      .eq('id', id);

    await this.supabase.from('trade_rule_compliance').delete().eq('trade_id', id);

    if (compliance.length > 0) {
      await this.supabase.from('trade_rule_compliance').insert(
        compliance.map((c) => ({
          trade_id: id,
          rule_id: c.rule_id,
          rule_text: c.rule_text,
          followed: c.followed,
        }))
      );
    }
  }

  async deleteTrade(id: string): Promise<void> {
    await this.supabase.from('trades').delete().eq('id', id);
  }

  async getTradesWithCompliance(): Promise<{ trades: Trade[]; compliance: TradeRuleCompliance[] }> {
    const [tradesRes, complianceRes] = await Promise.all([
      this.supabase.from('trades').select('*').eq('user_id', this.userId),
      this.supabase
        .from('trade_rule_compliance')
        .select('*, trades!inner(user_id)')
        .eq('trades.user_id', this.userId),
    ]);
    return {
      trades: tradesRes.data ?? [],
      compliance: complianceRes.data ?? [],
    };
  }

  async getReferralCode(): Promise<string | null> {
    const { data } = await this.supabase
      .from('user_profiles')
      .select('referral_code')
      .eq('id', this.userId)
      .single();
    return data?.referral_code ?? null;
  }

  async setReferralCode(code: string): Promise<{ success: boolean; error?: string }> {
    const { error } = await this.supabase
      .from('user_profiles')
      .upsert({ id: this.userId, referral_code: code }, { onConflict: 'id' });
    if (error) {
      if (error.code === '23505') return { success: false, error: 'Code already taken' };
      return { success: false, error: error.message };
    }
    return { success: true };
  }

  async checkReferralCodeAvailable(code: string): Promise<boolean> {
    const { data } = await this.supabase
      .from('user_profiles')
      .select('id')
      .eq('referral_code', code)
      .maybeSingle();
    return !data;
  }

  async getReferralCount(): Promise<number> {
    const code = await this.getReferralCode();
    if (!code) return 0;
    const { count } = await this.supabase
      .from('referrals')
      .select('*', { count: 'exact', head: true })
      .eq('referrer_code', code);
    return count ?? 0;
  }

  isAnonymous(): boolean {
    return false;
  }
}
