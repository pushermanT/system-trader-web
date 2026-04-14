import type { ConversationStep, TradeData } from './types';

export const TRADE_CHAT_ROUTE = '/trade-chat';

export const STEP_ORDER: ConversationStep[] = [
  'what',
  'why',
  'how_much',
  'exit_plan',
  'rule_check',
];

export const STEP_LABELS: Record<ConversationStep, string> = {
  what: 'WHAT',
  why: 'WHY',
  how_much: 'SIZE',
  exit_plan: 'EXITS',
  rule_check: 'RULES',
  complete: 'DONE',
};

export const STEP_CONFIG: Record<
  ConversationStep,
  {
    required_fields: readonly (keyof TradeData)[];
    validation: (data: TradeData) => boolean;
  }
> = {
  what: {
    required_fields: ['asset', 'direction'],
    validation: (data) => !!data.asset && !!data.direction,
  },
  why: {
    required_fields: ['thesis'],
    validation: (data) => !!data.thesis && data.thesis.trim().length > 10,
  },
  how_much: {
    required_fields: ['position_size_pct'],
    validation: (data) =>
      typeof data.position_size_pct === 'number' && data.position_size_pct > 0,
  },
  exit_plan: {
    required_fields: ['stop_loss', 'take_profit'],
    validation: (data) =>
      typeof data.stop_loss === 'number' &&
      typeof data.take_profit === 'number' &&
      data.stop_loss > 0 &&
      data.take_profit > 0,
  },
  rule_check: {
    required_fields: [],
    validation: () => true,
  },
  complete: {
    required_fields: [],
    validation: () => true,
  },
};

export const AI_OPENER = "What are you thinking?";

export const OVERRIDE_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export const DESIGN = {
  bg: '#000000',
  text_primary: '#FFFFFF',
  text_secondary: '#888888',
  text_muted: '#555555',
  ai_message_color: '#FFFFFF',
  user_message_color: '#AAAAAA',
  accent_green: '#00FF88',
  accent_red: '#FF4444',
  accent_amber: '#FFAA00',
  card_bg: '#111111',
  card_bg_inner: '#0A0A0A',
  card_border: '#222222',
  input_bg: '#0A0A0A',
  input_border: '#333333',
  transition_duration: '200ms',
} as const;

export function nextStep(step: ConversationStep): ConversationStep {
  const idx = STEP_ORDER.indexOf(step);
  if (idx < 0 || idx >= STEP_ORDER.length - 1) return 'complete';
  return STEP_ORDER[idx + 1];
}

export function advanceStepsIfFilled(
  currentStep: ConversationStep,
  data: TradeData
): ConversationStep {
  let step = currentStep;
  while (step !== 'complete' && step !== 'rule_check') {
    if (STEP_CONFIG[step].validation(data)) {
      step = nextStep(step);
    } else {
      break;
    }
  }
  return step;
}
