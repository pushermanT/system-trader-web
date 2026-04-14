import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import { STABLE_SYSTEM_PROMPT } from '@/lib/trade-chat/system-prompt';
import {
  buildDynamicContext,
  buildMessageHistory,
  computeNextStep,
  detectDirectionConflict,
  mergeTradeData,
  parseClaudeResponse,
} from '@/lib/trade-chat/conversation-engine';
import {
  buildTradeSummary,
  validateTrade,
} from '@/lib/trade-chat/rule-validator';
import type {
  ApiChatRequest,
  ApiChatResponse,
  ChatMessage,
  ConversationStep,
  PortfolioPosition,
  TradeData,
  UserRule,
} from '@/lib/trade-chat/types';
import { OVERRIDE_COOLDOWN_MS } from '@/lib/trade-chat/constants';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CLAUDE_MODEL = 'claude-sonnet-4-20250514';

const lastRequestByUser = new Map<string, number>();

function rateLimited(userId: string): boolean {
  const now = Date.now();
  const last = lastRequestByUser.get(userId) ?? 0;
  if (now - last < 2000) return true;
  lastRequestByUser.set(userId, now);
  return false;
}

async function callClaude(
  anthropic: Anthropic,
  dynamicContext: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<string> {
  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 500,
    system: [
      {
        type: 'text',
        text: STABLE_SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' },
      },
      {
        type: 'text',
        text: dynamicContext,
      },
    ],
    messages: history,
  });
  const first = response.content[0];
  if (first?.type !== 'text') throw new Error('Unexpected response type from Claude');
  return first.text;
}

function fallbackMessage(step: ConversationStep): string {
  switch (step) {
    case 'what':
      return "Let's start again. What asset are you looking at and which direction — long or short?";
    case 'why':
      return "What's the thesis? What specifically are you seeing that made you want this trade?";
    case 'how_much':
      return "How much of your portfolio do you want to put in this — as a percent?";
    case 'exit_plan':
      return "Where's your stop loss price, and where's your take profit target?";
    case 'rule_check':
      return "Running rule check now.";
    case 'complete':
      return "You're done. Review the summary.";
  }
}

async function getOrCreateConversation(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  conversationId: string | null
) {
  if (conversationId) {
    const { data } = await supabase
      .from('trade_conversations')
      .select('*')
      .eq('id', conversationId)
      .eq('user_id', userId)
      .maybeSingle();
    if (data) return data;
  }
  const { data: created } = await supabase
    .from('trade_conversations')
    .insert({ user_id: userId, status: 'in_progress', current_step: 'what' })
    .select()
    .single();
  return created;
}

export async function POST(request: Request) {
  let body: ApiChatRequest & { action?: 'request_override' };
  try {
    body = (await request.json()) as ApiChatRequest & { action?: 'request_override' };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  if (rateLimited(user.id)) {
    return NextResponse.json({ error: 'Too many requests. Slow down.' }, { status: 429 });
  }

  if (body.action === 'request_override') {
    if (!body.conversationId) {
      return NextResponse.json({ error: 'conversationId required' }, { status: 400 });
    }
    const requestedAt = new Date();
    const availableAt = new Date(requestedAt.getTime() + OVERRIDE_COOLDOWN_MS);
    await supabase
      .from('trade_conversations')
      .update({
        override_requested_at: requestedAt.toISOString(),
        override_available_at: availableAt.toISOString(),
      })
      .eq('id', body.conversationId)
      .eq('user_id', user.id);
    return NextResponse.json({
      conversationId: body.conversationId,
      aiMessage: '',
      extractedData: {},
      step: 'rule_check' as ConversationStep,
      stepComplete: false,
      status: 'blocked',
      overrideRequestedAt: requestedAt.toISOString(),
      overrideAvailableAt: availableAt.toISOString(),
    } satisfies ApiChatResponse);
  }

  const conversation = await getOrCreateConversation(
    supabase,
    user.id,
    body.conversationId
  );
  if (!conversation) {
    return NextResponse.json(
      { error: 'Could not load conversation' },
      { status: 500 }
    );
  }

  const [{ data: rulesData }, { data: portfolioData }] = await Promise.all([
    supabase
      .from('user_rules')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true),
    supabase.from('portfolio').select('*').eq('user_id', user.id),
  ]);

  const userRules: UserRule[] = (rulesData as UserRule[] | null) ?? [];
  const portfolio: PortfolioPosition[] = (portfolioData as PortfolioPosition[] | null) ?? [];

  let currentStep: ConversationStep = (body.currentStep ??
    conversation.current_step) as ConversationStep;
  let tradeData: TradeData = { ...(body.tradeData ?? conversation.trade_data ?? {}) };
  const messageHistory: ChatMessage[] = body.messages ?? [];

  if (currentStep === 'rule_check') {
    const result = await validateTrade(user.id, tradeData, supabase);
    const summaryData = buildTradeSummary(tradeData, result.passed);
    const newStatus = result.passed ? 'approved' : 'blocked';
    const nextStepValue: ConversationStep = 'complete';

    await supabase
      .from('trade_conversations')
      .update({
        status: newStatus,
        current_step: nextStepValue,
        trade_data: tradeData,
        rule_violations: result.violations.length > 0 ? result.violations : null,
        completed_at: result.passed ? new Date().toISOString() : null,
      })
      .eq('id', conversation.id);

    return NextResponse.json({
      conversationId: conversation.id,
      aiMessage: '',
      extractedData: {},
      step: nextStepValue,
      stepComplete: true,
      status: newStatus,
      violations: result.violations,
      summary: {
        trade: tradeData,
        rules_passed: result.passed,
        risk_reward_ratio: summaryData.risk_reward_ratio,
        estimated_loss_at_stop: summaryData.estimated_loss_at_stop,
        estimated_gain_at_tp: summaryData.estimated_gain_at_tp,
        portfolio_impact: summaryData.portfolio_impact,
      },
    } satisfies ApiChatResponse);
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY is not configured' },
      { status: 500 }
    );
  }
  const anthropic = new Anthropic({ apiKey });

  const dynamicContext = buildDynamicContext({
    currentStep,
    tradeData,
    userRules,
    portfolio,
  });
  const history = buildMessageHistory(messageHistory, body.userMessage);

  let rawText: string;
  try {
    rawText = await callClaude(anthropic, dynamicContext, history);
  } catch (error) {
    console.error('[trade-chat] Claude API error:', error);
    return NextResponse.json(
      { error: 'AI service unavailable. Try again shortly.' },
      { status: 502 }
    );
  }

  let parsed = parseClaudeResponse(rawText);
  if (!parsed) {
    try {
      rawText = await callClaude(anthropic, dynamicContext, history);
      parsed = parseClaudeResponse(rawText);
    } catch {
      parsed = null;
    }
  }

  let aiMessage = parsed?.message ?? fallbackMessage(currentStep);
  const extractedData = parsed?.extracted_data ?? {};
  tradeData = mergeTradeData(tradeData, extractedData);

  const conflict = detectDirectionConflict(tradeData);
  if (conflict) {
    aiMessage = conflict;
    if (currentStep === 'exit_plan') {
      tradeData.stop_loss = undefined;
    }
  }

  const resolvedStep = computeNextStep(currentStep, tradeData, parsed?.step_complete);
  const stepChanged = resolvedStep !== currentStep;
  currentStep = resolvedStep;

  const userMsg: ChatMessage = {
    id: crypto.randomUUID(),
    role: 'user',
    content: body.userMessage,
    timestamp: new Date().toISOString(),
  };
  const aiMsg: ChatMessage = {
    id: crypto.randomUUID(),
    role: 'ai',
    content: aiMessage,
    timestamp: new Date().toISOString(),
    metadata: { step: currentStep },
  };
  const updatedMessages: ChatMessage[] = [...messageHistory, userMsg, aiMsg];

  await supabase
    .from('trade_conversations')
    .update({
      current_step: currentStep,
      trade_data: tradeData,
      messages: updatedMessages,
      status: 'in_progress',
    })
    .eq('id', conversation.id);

  return NextResponse.json({
    conversationId: conversation.id,
    aiMessage,
    extractedData: extractedData as Partial<TradeData>,
    step: currentStep,
    stepComplete: stepChanged,
    status: 'in_progress',
    flags: parsed?.flags,
  } satisfies ApiChatResponse);
}
