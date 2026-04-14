import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  PortfolioPosition,
  RuleViolation,
  TradeData,
  UserRule,
} from './types';

const CRYPTO_ASSETS = new Set([
  'BTC', 'ETH', 'SOL', 'XRP', 'DOGE', 'ADA', 'AVAX', 'DOT', 'MATIC', 'LINK',
  'LTC', 'BCH', 'ATOM', 'NEAR', 'OP', 'ARB', 'INJ', 'TIA', 'SUI', 'APT',
  'TRX', 'SHIB', 'PEPE', 'UNI', 'AAVE',
]);

function isCryptoAsset(asset: string | undefined): boolean {
  if (!asset) return false;
  return CRYPTO_ASSETS.has(asset.trim().toUpperCase());
}

function computeStopDistancePct(data: TradeData): number | null {
  if (data.stop_distance_pct !== undefined) return data.stop_distance_pct;
  if (!data.entry_price || !data.stop_loss) return null;
  const diff = Math.abs(data.entry_price - data.stop_loss);
  if (data.entry_price <= 0) return null;
  return (diff / data.entry_price) * 100;
}

function totalCryptoAllocation(
  portfolio: PortfolioPosition[],
  excludeAsset?: string
): number {
  return portfolio
    .filter((p) => isCryptoAsset(p.asset) && p.asset !== excludeAsset)
    .reduce((sum, p) => sum + (p.current_allocation_pct ?? 0), 0);
}

export interface ValidationResult {
  passed: boolean;
  violations: RuleViolation[];
  rulesChecked: number;
  warnings: string[];
}

export async function validateTrade(
  userId: string,
  tradeData: TradeData,
  supabase: SupabaseClient
): Promise<ValidationResult> {
  const violations: RuleViolation[] = [];
  const warnings: string[] = [];

  const [{ data: rulesData }, { data: portfolioData }] = await Promise.all([
    supabase
      .from('user_rules')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true),
    supabase
      .from('portfolio')
      .select('*')
      .eq('user_id', userId),
  ]);

  const rules: UserRule[] = (rulesData as UserRule[] | null) ?? [];
  const portfolio: PortfolioPosition[] = (portfolioData as PortfolioPosition[] | null) ?? [];

  for (const rule of rules) {
    switch (rule.rule_type) {
      case 'position_size': {
        const maxPct = Number(rule.rule_params?.max_allocation_pct);
        if (
          Number.isFinite(maxPct) &&
          typeof tradeData.position_size_pct === 'number' &&
          tradeData.position_size_pct > maxPct
        ) {
          violations.push({
            rule_id: rule.id,
            rule_type: rule.rule_type,
            rule_text: rule.rule_text,
            rule_created_at: rule.created_at,
            violation_description: `Position size ${tradeData.position_size_pct}% exceeds your maximum of ${maxPct}%`,
            current_value: `${tradeData.position_size_pct}%`,
            rule_limit: `${maxPct}%`,
          });
        }
        break;
      }
      case 'stop_loss': {
        const maxStopPct = Number(rule.rule_params?.max_stop_distance_pct);
        const stopDistancePct = computeStopDistancePct(tradeData);
        if (!Number.isFinite(maxStopPct)) break;
        if (stopDistancePct === null || tradeData.stop_loss == null) {
          violations.push({
            rule_id: rule.id,
            rule_type: rule.rule_type,
            rule_text: rule.rule_text,
            rule_created_at: rule.created_at,
            violation_description: 'No stop loss set on this trade',
            current_value: 'missing',
            rule_limit: `${maxStopPct}%`,
          });
        } else if (stopDistancePct > maxStopPct) {
          violations.push({
            rule_id: rule.id,
            rule_type: rule.rule_type,
            rule_text: rule.rule_text,
            rule_created_at: rule.created_at,
            violation_description: `Stop loss distance ${stopDistancePct.toFixed(1)}% exceeds your maximum of ${maxStopPct}%`,
            current_value: `${stopDistancePct.toFixed(1)}%`,
            rule_limit: `${maxStopPct}%`,
          });
        }
        break;
      }
      case 'asset_allocation': {
        const maxCryptoPct = Number(rule.rule_params?.max_crypto_pct);
        if (!Number.isFinite(maxCryptoPct)) break;
        if (!isCryptoAsset(tradeData.asset) || typeof tradeData.position_size_pct !== 'number') break;
        const existing = totalCryptoAllocation(portfolio, tradeData.asset);
        const proposedTotal = existing + tradeData.position_size_pct;
        if (proposedTotal > maxCryptoPct) {
          violations.push({
            rule_id: rule.id,
            rule_type: rule.rule_type,
            rule_text: rule.rule_text,
            rule_created_at: rule.created_at,
            violation_description: `Total crypto allocation ${proposedTotal.toFixed(1)}% would exceed your maximum of ${maxCryptoPct}%`,
            current_value: `${proposedTotal.toFixed(1)}%`,
            rule_limit: `${maxCryptoPct}%`,
          });
        }
        break;
      }
      case 'custom':
      case 'entry_logic':
        warnings.push(
          `Custom rule "${rule.rule_text}" requires manual review — not automatically enforced`
        );
        break;
    }
  }

  return {
    passed: violations.length === 0,
    violations,
    rulesChecked: rules.length,
    warnings,
  };
}

export function buildTradeSummary(
  tradeData: TradeData,
  passed: boolean
): {
  risk_reward_ratio: number;
  estimated_loss_at_stop: number | null;
  estimated_gain_at_tp: number | null;
  portfolio_impact: string;
} {
  let riskReward = 0;
  if (
    typeof tradeData.entry_price === 'number' &&
    typeof tradeData.stop_loss === 'number' &&
    typeof tradeData.take_profit === 'number' &&
    tradeData.direction
  ) {
    const risk = Math.abs(tradeData.entry_price - tradeData.stop_loss);
    const reward =
      tradeData.direction === 'long'
        ? tradeData.take_profit - tradeData.entry_price
        : tradeData.entry_price - tradeData.take_profit;
    if (risk > 0) riskReward = reward / risk;
  }

  let estLoss: number | null = null;
  let estGain: number | null = null;
  if (
    typeof tradeData.position_size_usd === 'number' &&
    typeof tradeData.entry_price === 'number'
  ) {
    if (typeof tradeData.stop_loss === 'number') {
      const stopPct =
        Math.abs(tradeData.entry_price - tradeData.stop_loss) / tradeData.entry_price;
      estLoss = -tradeData.position_size_usd * stopPct;
    }
    if (typeof tradeData.take_profit === 'number') {
      const tpPct =
        Math.abs(tradeData.take_profit - tradeData.entry_price) / tradeData.entry_price;
      estGain = tradeData.position_size_usd * tpPct;
    }
  }

  const portfolioImpact =
    typeof tradeData.position_size_pct === 'number'
      ? `${tradeData.position_size_pct}% of portfolio`
      : 'Portfolio % unknown';

  return {
    risk_reward_ratio: riskReward,
    estimated_loss_at_stop: estLoss,
    estimated_gain_at_tp: estGain,
    portfolio_impact: passed ? portfolioImpact : portfolioImpact,
  };
}
