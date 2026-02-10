import { Strategy, Rule, Trade, TradeRuleCompliance, ChatSession } from '@/lib/types';
import { DataRepo, TradeInput, RiskSettings } from './types';

const KEYS = {
  strategies: 'st_strategies',
  rules: 'st_rules',
  trades: 'st_trades',
  compliance: 'st_compliance',
};

function read<T>(key: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch {
    return [];
  }
}

function write<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data));
}

export class LocalStorageRepo implements DataRepo {
  async getStrategies(): Promise<(Strategy & { rules: Rule[] })[]> {
    const strategies = read<Strategy>(KEYS.strategies);
    const rules = read<Rule>(KEYS.rules);
    return strategies
      .map((s) => ({ ...s, rules: rules.filter((r) => r.strategy_id === s.id) }))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async createStrategy(data: { name: string; description: string; rules: string[]; max_loss_threshold?: number | null }): Promise<Strategy | null> {
    const strategies = read<Strategy>(KEYS.strategies);
    const now = new Date().toISOString();
    const strategy: Strategy = {
      id: crypto.randomUUID(),
      user_id: 'local',
      name: data.name,
      description: data.description,
      is_active: true,
      max_loss_threshold: data.max_loss_threshold ?? null,
      created_at: now,
      updated_at: now,
    };
    strategies.push(strategy);
    write(KEYS.strategies, strategies);

    if (data.rules.length > 0) {
      const rules = read<Rule>(KEYS.rules);
      data.rules.forEach((text, i) => {
        rules.push({
          id: crypto.randomUUID(),
          strategy_id: strategy.id,
          text,
          order: i,
          created_at: now,
        });
      });
      write(KEYS.rules, rules);
    }

    return strategy;
  }

  async updateStrategy(id: string, data: { name: string; description: string; rules: string[]; max_loss_threshold?: number | null }): Promise<void> {
    const strategies = read<Strategy>(KEYS.strategies);
    const idx = strategies.findIndex((s) => s.id === id);
    if (idx === -1) return;

    strategies[idx] = {
      ...strategies[idx],
      name: data.name,
      description: data.description,
      max_loss_threshold: data.max_loss_threshold ?? strategies[idx].max_loss_threshold,
      updated_at: new Date().toISOString(),
    };
    write(KEYS.strategies, strategies);

    // Replace rules
    const allRules = read<Rule>(KEYS.rules).filter((r) => r.strategy_id !== id);
    const now = new Date().toISOString();
    data.rules.forEach((text, i) => {
      allRules.push({
        id: crypto.randomUUID(),
        strategy_id: id,
        text,
        order: i,
        created_at: now,
      });
    });
    write(KEYS.rules, allRules);
  }

  async toggleStrategyActive(id: string, currentlyActive: boolean): Promise<void> {
    const strategies = read<Strategy>(KEYS.strategies);
    const idx = strategies.findIndex((s) => s.id === id);
    if (idx === -1) return;
    strategies[idx].is_active = !currentlyActive;
    write(KEYS.strategies, strategies);
  }

  async deleteStrategy(id: string): Promise<void> {
    write(KEYS.strategies, read<Strategy>(KEYS.strategies).filter((s) => s.id !== id));
    write(KEYS.rules, read<Rule>(KEYS.rules).filter((r) => r.strategy_id !== id));
  }

  async getTrades(): Promise<Trade[]> {
    return read<Trade>(KEYS.trades).sort(
      (a, b) => new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime()
    );
  }

  async createTrade(data: TradeInput): Promise<Trade | null> {
    const trades = read<Trade>(KEYS.trades);
    const now = new Date().toISOString();
    const { compliance, ...rest } = data;

    const trade: Trade = {
      id: crypto.randomUUID(),
      user_id: 'local',
      ...rest,
      notes: rest.notes ?? '',
      created_at: now,
      updated_at: now,
    };
    trades.push(trade);
    write(KEYS.trades, trades);

    if (compliance.length > 0) {
      const allCompliance = read<TradeRuleCompliance>(KEYS.compliance);
      compliance.forEach((c) => {
        allCompliance.push({
          id: crypto.randomUUID(),
          trade_id: trade.id,
          rule_id: c.rule_id,
          rule_text: c.rule_text,
          followed: c.followed,
        });
      });
      write(KEYS.compliance, allCompliance);
    }

    return trade;
  }

  async updateTrade(id: string, data: TradeInput): Promise<void> {
    const trades = read<Trade>(KEYS.trades);
    const idx = trades.findIndex((t) => t.id === id);
    if (idx === -1) return;

    const { compliance, ...rest } = data;
    trades[idx] = {
      ...trades[idx],
      ...rest,
      updated_at: new Date().toISOString(),
    };
    write(KEYS.trades, trades);

    // Replace compliance
    const allCompliance = read<TradeRuleCompliance>(KEYS.compliance).filter((c) => c.trade_id !== id);
    compliance.forEach((c) => {
      allCompliance.push({
        id: crypto.randomUUID(),
        trade_id: id,
        rule_id: c.rule_id,
        rule_text: c.rule_text,
        followed: c.followed,
      });
    });
    write(KEYS.compliance, allCompliance);
  }

  async deleteTrade(id: string): Promise<void> {
    write(KEYS.trades, read<Trade>(KEYS.trades).filter((t) => t.id !== id));
    write(KEYS.compliance, read<TradeRuleCompliance>(KEYS.compliance).filter((c) => c.trade_id !== id));
  }

  async bulkCreateTrades(inputs: TradeInput[]): Promise<void> {
    for (const data of inputs) {
      await this.createTrade(data);
    }
  }

  async getTradesWithCompliance(): Promise<{ trades: Trade[]; compliance: TradeRuleCompliance[] }> {
    return {
      trades: read<Trade>(KEYS.trades),
      compliance: read<TradeRuleCompliance>(KEYS.compliance),
    };
  }

  async getRiskSettings(): Promise<RiskSettings> {
    try {
      const raw = localStorage.getItem('st_risk_settings');
      if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return { daily_loss_limit: null, weekly_loss_limit: null, portfolio_value: null, max_risk_per_trade_pct: null, max_symbol_concentration_pct: null, nickname: null };
  }

  async saveRiskSettings(settings: RiskSettings): Promise<void> {
    localStorage.setItem('st_risk_settings', JSON.stringify(settings));
  }

  async getReferralCode(): Promise<string | null> {
    return null;
  }

  async setReferralCode(): Promise<{ success: boolean; error?: string }> {
    return { success: false, error: 'Sign up to use referral codes' };
  }

  async checkReferralCodeAvailable(): Promise<boolean> {
    return true;
  }

  async getReferralCount(): Promise<number> {
    return 0;
  }

  async saveNickname(): Promise<void> {}

  async getChatSessions(): Promise<ChatSession[]> {
    return [];
  }

  async createChatSession(): Promise<ChatSession | null> {
    return null;
  }

  async updateSessionTitle(): Promise<void> {}
  async deleteChatSession(): Promise<void> {}

  async getChatMessages(): Promise<{ role: string; content: string }[]> {
    return [];
  }

  async saveChatMessage(): Promise<void> {}

  async getTraderProfile(): Promise<string> {
    return '';
  }

  async updateTraderProfile(): Promise<void> {}

  isAnonymous(): boolean {
    return true;
  }
}
