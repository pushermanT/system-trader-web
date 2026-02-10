import { SupabaseClient } from '@supabase/supabase-js';
import { Strategy, Rule, Trade, TradeRuleCompliance, ChatSession } from '@/lib/types';
import { DataRepo, TradeInput, RiskSettings } from './types';

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

  async createStrategy(data: { name: string; description: string; rules: string[]; max_loss_threshold?: number | null }): Promise<Strategy | null> {
    const { data: strategy, error } = await this.supabase
      .from('strategies')
      .insert({ name: data.name, description: data.description, max_loss_threshold: data.max_loss_threshold ?? null, user_id: this.userId })
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

  async updateStrategy(id: string, data: { name: string; description: string; rules: string[]; max_loss_threshold?: number | null }): Promise<void> {
    await this.supabase
      .from('strategies')
      .update({ name: data.name, description: data.description, max_loss_threshold: data.max_loss_threshold ?? null, updated_at: new Date().toISOString() })
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

  async bulkCreateTrades(inputs: TradeInput[]): Promise<void> {
    const trades = inputs.map(({ compliance, ...data }) => ({
      ...data,
      user_id: this.userId,
    }));
    const batchSize = 50;
    for (let i = 0; i < trades.length; i += batchSize) {
      await this.supabase.from('trades').insert(trades.slice(i, i + batchSize));
    }
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

  async getRiskSettings(): Promise<RiskSettings> {
    const { data } = await this.supabase
      .from('user_profiles')
      .select('daily_loss_limit, weekly_loss_limit, portfolio_value, max_risk_per_trade_pct, max_symbol_concentration_pct')
      .eq('id', this.userId)
      .single();
    return {
      daily_loss_limit: data?.daily_loss_limit ?? null,
      weekly_loss_limit: data?.weekly_loss_limit ?? null,
      portfolio_value: data?.portfolio_value ?? null,
      max_risk_per_trade_pct: data?.max_risk_per_trade_pct ?? null,
      max_symbol_concentration_pct: data?.max_symbol_concentration_pct ?? null,
    };
  }

  async saveRiskSettings(settings: RiskSettings): Promise<void> {
    await this.supabase
      .from('user_profiles')
      .upsert({
        id: this.userId,
        daily_loss_limit: settings.daily_loss_limit,
        weekly_loss_limit: settings.weekly_loss_limit,
        portfolio_value: settings.portfolio_value,
        max_risk_per_trade_pct: settings.max_risk_per_trade_pct,
        max_symbol_concentration_pct: settings.max_symbol_concentration_pct,
      }, { onConflict: 'id' });
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

  async getChatSessions(): Promise<ChatSession[]> {
    const { data } = await this.supabase
      .from('chat_sessions')
      .select('*')
      .eq('user_id', this.userId)
      .order('updated_at', { ascending: false });
    return data ?? [];
  }
  async createChatSession(title = 'New Chat'): Promise<ChatSession | null> {
    const { data, error } = await this.supabase
      .from('chat_sessions')
      .insert({ user_id: this.userId, title })
      .select()
      .single();
    if (error || !data) return null;
    return data;
  }

  async updateSessionTitle(id: string, title: string): Promise<void> {
    await this.supabase
      .from('chat_sessions')
      .update({ title, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', this.userId);
  }

  async deleteChatSession(id: string): Promise<void> {
    await this.supabase
      .from('chat_sessions')
      .delete()
      .eq('id', id)
      .eq('user_id', this.userId);
  }

  async getChatMessages(sessionId: string, limit = 50): Promise<{ role: string; content: string }[]> {
    const { data } = await this.supabase
      .from('chat_messages')
      .select('role, content')
      .eq('session_id', sessionId)
      .eq('user_id', this.userId)
      .order('created_at', { ascending: true })
      .limit(limit);
    return data ?? [];
  }

  async saveChatMessage(sessionId: string, role: string, content: string, toolCalls?: unknown): Promise<void> {
    await this.supabase
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        user_id: this.userId,
        role,
        content,
        tool_calls: toolCalls ?? null,
      });
    await this.supabase
      .from('chat_sessions')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', sessionId);
  }

  async getTraderProfile(): Promise<string> {
    const { data } = await this.supabase
      .from('trader_profiles')
      .select('content')
      .eq('id', this.userId)
      .maybeSingle();
    return data?.content ?? '';
  }

  async updateTraderProfile(content: string): Promise<void> {
    await this.supabase
      .from('trader_profiles')
      .upsert({ id: this.userId, content, updated_at: new Date().toISOString() }, { onConflict: 'id' });
  }

  isAnonymous(): boolean {
    return false;
  }
}
