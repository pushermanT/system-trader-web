'use client';

import { useCallback, useEffect, useReducer, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import TypingIndicator from './TypingIndicator';
import TradeSummaryCard from './TradeSummaryCard';
import RuleViolationCard from './RuleViolationCard';
import { AI_OPENER, DESIGN, STEP_LABELS, STEP_ORDER } from '@/lib/trade-chat/constants';
import type {
  ApiChatRequest,
  ApiChatResponse,
  CardMetadata,
  ChatMessage as ChatMessageType,
  ConversationState,
  ConversationStep,
  RuleViolation,
  TradeData,
  TradeSummary,
} from '@/lib/trade-chat/types';

function initialState(): ConversationState {
  return {
    id: null,
    step: 'what',
    status: 'in_progress',
    messages: [
      {
        id: 'opener',
        role: 'ai',
        content: AI_OPENER,
        timestamp: new Date().toISOString(),
        metadata: { step: 'what' },
      },
    ],
    tradeData: {},
    violations: [],
    isAiTyping: false,
    error: null,
    overrideRequestedAt: null,
    overrideAvailableAt: null,
  };
}

type Action =
  | { type: 'SEND_USER_MESSAGE'; message: ChatMessageType }
  | { type: 'SET_TYPING'; value: boolean }
  | { type: 'RECEIVE_AI'; message: ChatMessageType; response: ApiChatResponse }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'ENTER_RULE_CHECK'; systemMessage: ChatMessageType }
  | { type: 'SHOW_SUMMARY_CARD'; cardMessage: ChatMessageType; response: ApiChatResponse }
  | { type: 'SHOW_VIOLATION_CARD'; cardMessage: ChatMessageType; response: ApiChatResponse }
  | { type: 'SET_OVERRIDE_TIMES'; requestedAt: string | null; availableAt: string | null }
  | { type: 'REVISE' }
  | { type: 'RESET' };

function reducer(state: ConversationState, action: Action): ConversationState {
  switch (action.type) {
    case 'SEND_USER_MESSAGE':
      return {
        ...state,
        messages: [...state.messages, action.message],
        isAiTyping: true,
        error: null,
      };
    case 'SET_TYPING':
      return { ...state, isAiTyping: action.value };
    case 'RECEIVE_AI': {
      return {
        ...state,
        id: action.response.conversationId,
        step: action.response.step,
        status: action.response.status,
        tradeData: mergeTradeDataClient(state.tradeData, action.response.extractedData),
        messages: [...state.messages, action.message],
        isAiTyping: false,
      };
    }
    case 'SET_ERROR':
      return { ...state, error: action.error, isAiTyping: false };
    case 'ENTER_RULE_CHECK':
      return {
        ...state,
        step: 'rule_check',
        messages: [...state.messages, action.systemMessage],
        isAiTyping: true,
      };
    case 'SHOW_SUMMARY_CARD':
      return {
        ...state,
        id: action.response.conversationId,
        step: 'complete',
        status: 'approved',
        violations: [],
        isAiTyping: false,
        messages: [...state.messages, action.cardMessage],
      };
    case 'SHOW_VIOLATION_CARD':
      return {
        ...state,
        id: action.response.conversationId,
        step: 'complete',
        status: 'blocked',
        violations: action.response.violations ?? [],
        isAiTyping: false,
        messages: [...state.messages, action.cardMessage],
      };
    case 'SET_OVERRIDE_TIMES':
      return {
        ...state,
        overrideRequestedAt: action.requestedAt,
        overrideAvailableAt: action.availableAt,
      };
    case 'REVISE':
      return {
        ...state,
        step: 'how_much',
        status: 'revised',
        violations: [],
        messages: [
          ...state.messages,
          {
            id: crypto.randomUUID(),
            role: 'system',
            content: 'Revising trade — back to position size',
            timestamp: new Date().toISOString(),
          },
          {
            id: crypto.randomUUID(),
            role: 'ai',
            content:
              "OK. Let's reset. Keep the asset and direction — how much do you actually want to put in? Size as a percent of portfolio.",
            timestamp: new Date().toISOString(),
            metadata: { step: 'how_much' },
          },
        ],
        tradeData: {
          asset: state.tradeData.asset,
          direction: state.tradeData.direction,
          thesis: state.tradeData.thesis,
          trigger: state.tradeData.trigger,
        },
      };
    case 'RESET':
      return initialState();
  }
}

function mergeTradeDataClient(
  current: TradeData,
  extracted: Partial<TradeData> | undefined
): TradeData {
  if (!extracted) return current;
  const merged = { ...current };
  for (const key of Object.keys(extracted) as (keyof TradeData)[]) {
    const v = extracted[key];
    if (v === undefined || v === null) continue;
    (merged as Record<string, unknown>)[key] = v;
  }
  return merged;
}

async function callApi(payload: ApiChatRequest | { action: 'request_override'; conversationId: string }): Promise<ApiChatResponse> {
  const res = await fetch('/api/trade-chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message = (body as { error?: string }).error ?? `Request failed: ${res.status}`;
    throw new Error(message);
  }
  return (await res.json()) as ApiChatResponse;
}

export default function TradeChatContainer() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [state.messages.length, state.isAiTyping]);

  const runRuleCheck = useCallback(async () => {
    const snapshot = stateRef.current;
    try {
      const response = await callApi({
        conversationId: snapshot.id,
        userMessage: '',
        currentStep: 'rule_check',
        tradeData: snapshot.tradeData,
        messages: snapshot.messages.filter((m) => !m.metadata || !('isCard' in m.metadata)),
      });
      if (response.status === 'approved' && response.summary) {
        const cardMessage: ChatMessageType = {
          id: crypto.randomUUID(),
          role: 'ai',
          content: 'Trade approved.',
          timestamp: new Date().toISOString(),
          metadata: {
            isCard: true,
            cardType: 'summary',
            cardData: response.summary,
          } as CardMetadata,
        };
        dispatch({ type: 'SHOW_SUMMARY_CARD', cardMessage, response });
      } else {
        const cardMessage: ChatMessageType = {
          id: crypto.randomUUID(),
          role: 'ai',
          content: 'Rules violated.',
          timestamp: new Date().toISOString(),
          metadata: {
            isCard: true,
            cardType: 'violation',
            cardData: response.violations ?? [],
          } as CardMetadata,
        };
        dispatch({ type: 'SHOW_VIOLATION_CARD', cardMessage, response });
      }
    } catch (err) {
      dispatch({
        type: 'SET_ERROR',
        error: err instanceof Error ? err.message : 'Rule check failed',
      });
    }
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      const snapshot = stateRef.current;
      const userMsg: ChatMessageType = {
        id: crypto.randomUUID(),
        role: 'user',
        content: text,
        timestamp: new Date().toISOString(),
      };
      dispatch({ type: 'SEND_USER_MESSAGE', message: userMsg });

      try {
        const response = await callApi({
          conversationId: snapshot.id,
          userMessage: text,
          currentStep: snapshot.step,
          tradeData: snapshot.tradeData,
          messages: snapshot.messages.filter(
            (m) => !m.metadata || !('isCard' in m.metadata)
          ),
        });
        const aiMsg: ChatMessageType = {
          id: crypto.randomUUID(),
          role: 'ai',
          content: response.aiMessage,
          timestamp: new Date().toISOString(),
          metadata: { step: response.step },
        };
        dispatch({ type: 'RECEIVE_AI', message: aiMsg, response });

        if (response.step === 'rule_check') {
          const systemMessage: ChatMessageType = {
            id: crypto.randomUUID(),
            role: 'system',
            content: 'Reviewing your trade against your rules…',
            timestamp: new Date().toISOString(),
          };
          dispatch({ type: 'ENTER_RULE_CHECK', systemMessage });
          setTimeout(() => {
            void runRuleCheck();
          }, 700);
        }
      } catch (err) {
        dispatch({
          type: 'SET_ERROR',
          error: err instanceof Error ? err.message : 'Something went wrong',
        });
      }
    },
    [runRuleCheck]
  );

  const handleRevise = useCallback(() => {
    dispatch({ type: 'REVISE' });
  }, []);

  const handleRequestOverride = useCallback(async () => {
    const snapshot = stateRef.current;
    if (!snapshot.id) return;
    if (snapshot.overrideRequestedAt && snapshot.overrideAvailableAt) {
      const avail = new Date(snapshot.overrideAvailableAt).getTime();
      if (Date.now() >= avail) {
        window.alert(
          'Override approved. In a real execution flow this would place the trade.'
        );
        return;
      }
      return;
    }
    try {
      const response = await callApi({
        action: 'request_override',
        conversationId: snapshot.id,
      });
      dispatch({
        type: 'SET_OVERRIDE_TIMES',
        requestedAt: response.overrideRequestedAt ?? null,
        availableAt: response.overrideAvailableAt ?? null,
      });
    } catch (err) {
      dispatch({
        type: 'SET_ERROR',
        error: err instanceof Error ? err.message : 'Override request failed',
      });
    }
  }, []);

  const handleOverrideExpired = useCallback(() => {
    // Called when the countdown hits zero. No-op for v1; button re-enables.
  }, []);

  const handleExecute = useCallback(() => {
    window.alert(
      'Trade executed. (Demo — actual execution would route to your broker here.)'
    );
    dispatch({ type: 'RESET' });
  }, []);

  const handleSaveToJournal = useCallback(() => {
    window.alert('Saved to journal. (Demo)');
  }, []);

  const handleCancel = useCallback(() => {
    if (window.confirm('Cancel this trade plan? This will clear the conversation.')) {
      dispatch({ type: 'RESET' });
    }
  }, []);

  const handleEditSummary = useCallback(() => {
    dispatch({ type: 'REVISE' });
  }, []);

  const showingCard = state.messages.some(
    (m) => m.metadata && 'isCard' in m.metadata && m.metadata.isCard
  );

  const inputStatus =
    state.step === 'rule_check' ? 'Reviewing your trade…' : undefined;

  return (
    <div
      className="flex flex-col w-full"
      style={{
        background: DESIGN.bg,
        color: DESIGN.text_primary,
        height: '100dvh',
        minHeight: '100dvh',
      }}
    >
      <StepHeader currentStep={state.step} status={state.status} />

      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden"
      >
        <div className="max-w-[720px] mx-auto px-4 pt-6 pb-24">
          <AnimatePresence initial={false}>
            {state.messages.map((m) => {
              if (m.metadata && 'isCard' in m.metadata && m.metadata.isCard) {
                if (m.metadata.cardType === 'summary') {
                  return (
                    <div key={m.id} className="my-6">
                      <TradeSummaryCard
                        summary={m.metadata.cardData as TradeSummary}
                        onExecute={handleExecute}
                        onEdit={handleEditSummary}
                        onSaveToJournal={handleSaveToJournal}
                        onCancel={handleCancel}
                      />
                    </div>
                  );
                }
                return (
                  <div key={m.id} className="my-6">
                    <RuleViolationCard
                      violations={m.metadata.cardData as RuleViolation[]}
                      overrideRequestedAt={state.overrideRequestedAt}
                      overrideAvailableAt={state.overrideAvailableAt}
                      onRevise={handleRevise}
                      onRequestOverride={handleRequestOverride}
                      onOverrideExpired={handleOverrideExpired}
                    />
                  </div>
                );
              }
              return <ChatMessage key={m.id} message={m} />;
            })}
          </AnimatePresence>

          {state.isAiTyping && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <TypingIndicator />
            </motion.div>
          )}

          {state.error && (
            <div
              className="my-4 p-3 text-[13px]"
              style={{
                background: '#200',
                border: `1px solid ${DESIGN.accent_red}`,
                color: DESIGN.accent_red,
                borderRadius: 3,
              }}
            >
              {state.error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {!showingCard && (
        <div className="w-full shrink-0">
          <div className="max-w-[720px] mx-auto">
            <ChatInput
              disabled={state.isAiTyping || state.step === 'rule_check'}
              statusText={inputStatus}
              onSend={sendMessage}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function StepHeader({
  currentStep,
  status,
}: {
  currentStep: ConversationStep;
  status: ConversationState['status'];
}) {
  const visibleSteps = STEP_ORDER;
  return (
    <div
      className="w-full shrink-0 px-4 py-3 flex items-center justify-center gap-1"
      style={{
        background: DESIGN.bg,
        borderBottom: `1px solid ${DESIGN.card_border}`,
      }}
    >
      {visibleSteps.map((s, i) => {
        const idx = STEP_ORDER.indexOf(s);
        const currentIdx = STEP_ORDER.indexOf(
          currentStep === 'complete' ? 'rule_check' : currentStep
        );
        const isActive = s === currentStep;
        const isDone = idx < currentIdx || status === 'approved' || status === 'blocked';
        const color = isActive
          ? DESIGN.text_primary
          : isDone
          ? DESIGN.text_secondary
          : DESIGN.text_muted;
        return (
          <span
            key={s}
            className="flex items-center gap-1"
            style={{
              color,
              fontSize: 11,
              letterSpacing: '0.15em',
              fontFamily: 'var(--font-geist-mono), monospace',
            }}
          >
            <span>{STEP_LABELS[s]}</span>
            {i < visibleSteps.length - 1 && (
              <span
                className="mx-1"
                style={{ color: DESIGN.text_muted }}
                aria-hidden
              >
                ·
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}
