import type {
  ChatMessage,
  ConversationStep,
  PortfolioPosition,
  TradeData,
  UserRule,
} from './types';
import { advanceStepsIfFilled, STEP_CONFIG } from './constants';

export interface BuildPromptArgs {
  currentStep: ConversationStep;
  tradeData: TradeData;
  userRules: UserRule[];
  portfolio: PortfolioPosition[];
}

export function buildDynamicContext(args: BuildPromptArgs): string {
  const { currentStep, tradeData, userRules, portfolio } = args;

  const portfolioSummary =
    portfolio.length === 0
      ? 'Portfolio data is not available. Skip allocation-based context.'
      : portfolio
          .map(
            (p) =>
              `- ${p.asset}: ${p.quantity} units${
                p.current_allocation_pct != null
                  ? ` (${p.current_allocation_pct}% of portfolio)`
                  : ''
              }`
          )
          .join('\n');

  const rulesSummary =
    userRules.length === 0
      ? 'No rules configured. Warn the user they are flying without a safety net.'
      : userRules
          .map(
            (r) =>
              `- [${r.rule_type}] "${r.rule_text}" (written ${new Date(
                r.created_at
              ).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })})`
          )
          .join('\n');

  return `CURRENT STEP: ${currentStep}

ACCUMULATED TRADE DATA SO FAR:
${JSON.stringify(tradeData, null, 2)}

USER'S TRADING RULES:
${rulesSummary}

CURRENT PORTFOLIO:
${portfolioSummary}`;
}

export function buildMessageHistory(
  messageHistory: ChatMessage[],
  latestUserMessage: string
): Array<{ role: 'user' | 'assistant'; content: string }> {
  const filtered = messageHistory.filter(
    (m) => m.role === 'user' || m.role === 'ai'
  );
  const result = filtered.map((m) => ({
    role: m.role === 'ai' ? ('assistant' as const) : ('user' as const),
    content: m.content,
  }));
  if (
    result.length === 0 ||
    result[result.length - 1].role !== 'user' ||
    result[result.length - 1].content !== latestUserMessage
  ) {
    result.push({ role: 'user', content: latestUserMessage });
  }
  return result;
}

export interface ClaudeRawResponse {
  message: string;
  extracted_data?: Partial<TradeData>;
  step_complete?: boolean;
  flags?: string[];
}

export function parseClaudeResponse(raw: string): ClaudeRawResponse | null {
  let text = raw.trim();
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  }
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
    return null;
  }
  const jsonSlice = text.slice(firstBrace, lastBrace + 1);
  try {
    const parsed = JSON.parse(jsonSlice);
    if (typeof parsed !== 'object' || parsed === null) return null;
    if (typeof parsed.message !== 'string') return null;
    return parsed as ClaudeRawResponse;
  } catch {
    return null;
  }
}

export function mergeTradeData(
  current: TradeData,
  extracted: Partial<TradeData> | undefined
): TradeData {
  if (!extracted) return current;
  const merged: TradeData = { ...current };
  const keys: (keyof TradeData)[] = [
    'asset',
    'direction',
    'thesis',
    'trigger',
    'position_size_pct',
    'position_size_usd',
    'entry_price',
    'stop_loss',
    'take_profit',
  ];
  for (const key of keys) {
    const value = extracted[key];
    if (value === undefined || value === null) continue;
    if (key === 'asset' && typeof value === 'string') {
      merged.asset = value.trim().toUpperCase();
    } else if (key === 'direction' && typeof value === 'string') {
      const lower = value.toLowerCase();
      if (lower === 'long' || lower === 'short') merged.direction = lower;
    } else if (
      typeof value === 'number' &&
      Number.isFinite(value) &&
      value >= 0 &&
      (key === 'position_size_pct' ||
        key === 'position_size_usd' ||
        key === 'entry_price' ||
        key === 'stop_loss' ||
        key === 'take_profit')
    ) {
      merged[key] = value;
    } else if (
      typeof value === 'string' &&
      (key === 'thesis' || key === 'trigger')
    ) {
      merged[key] = value.trim();
    }
  }

  if (
    typeof merged.entry_price === 'number' &&
    typeof merged.stop_loss === 'number' &&
    merged.entry_price > 0
  ) {
    merged.stop_distance_pct =
      (Math.abs(merged.entry_price - merged.stop_loss) / merged.entry_price) * 100;
  }

  if (
    typeof merged.entry_price === 'number' &&
    typeof merged.stop_loss === 'number' &&
    typeof merged.take_profit === 'number' &&
    merged.direction
  ) {
    const risk = Math.abs(merged.entry_price - merged.stop_loss);
    const reward =
      merged.direction === 'long'
        ? merged.take_profit - merged.entry_price
        : merged.entry_price - merged.take_profit;
    if (risk > 0) merged.risk_reward_ratio = reward / risk;
  }

  return merged;
}

export function computeNextStep(
  currentStep: ConversationStep,
  tradeData: TradeData,
  claudeSaysComplete: boolean | undefined
): ConversationStep {
  const autoAdvanced = advanceStepsIfFilled(currentStep, tradeData);
  if (autoAdvanced !== currentStep) return autoAdvanced;
  if (claudeSaysComplete && STEP_CONFIG[currentStep].validation(tradeData)) {
    return advanceStepsIfFilled(currentStep, tradeData);
  }
  return currentStep;
}

export function detectDirectionConflict(data: TradeData): string | null {
  if (
    typeof data.entry_price !== 'number' ||
    typeof data.stop_loss !== 'number' ||
    !data.direction
  )
    return null;
  if (data.direction === 'long' && data.stop_loss >= data.entry_price) {
    return `Your stop is at or above your entry on a long. That would trigger immediately. Where do you want your downside protection?`;
  }
  if (data.direction === 'short' && data.stop_loss <= data.entry_price) {
    return `Your stop is at or below your entry on a short. That would trigger immediately. Where do you want your downside protection?`;
  }
  if (
    typeof data.take_profit === 'number' &&
    data.direction === 'long' &&
    data.take_profit <= data.entry_price
  ) {
    return `Your take profit is at or below your entry on a long. That's not a profit target. What price are you actually targeting?`;
  }
  if (
    typeof data.take_profit === 'number' &&
    data.direction === 'short' &&
    data.take_profit >= data.entry_price
  ) {
    return `Your take profit is at or above your entry on a short. That's not a profit target. What price are you actually targeting?`;
  }
  return null;
}
