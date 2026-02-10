'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useChatSessions } from '@/hooks/use-chat-sessions';
import { useIsMobile } from '@/hooks/use-is-mobile';
import ChatSidebar from './chat-sidebar';

function getTextContent(message: { parts?: Array<{ type: string; text?: string }> }): string {
  if (!message.parts) return '';
  return message.parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text' && !!p.text)
    .map((p) => p.text)
    .join('');
}

export default function ChatContent() {
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hasAutoTitled, setHasAutoTitled] = useState(false);
  const [input, setInput] = useState('');
  const [nickname, setNickname] = useState<string | null | undefined>(undefined);
  const [onboardingTriggered, setOnboardingTriggered] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    sessions, activeSessionId, loading: sessionsLoading,
    setActiveSessionId, createSession, deleteSession, renameSession,
  } = useChatSessions();

  // Fetch nickname to detect new users
  useEffect(() => {
    fetch('/api/portfolio')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => setNickname(data?.nickname ?? null))
      .catch(() => setNickname(null));
  }, []);

  const transport = useMemo(() => new DefaultChatTransport({
    api: '/api/chat',
    body: { sessionId: activeSessionId },
  }), [activeSessionId]);

  const { messages, sendMessage, setMessages, status } = useChat({ transport });

  const isLoading = status === 'streaming' || status === 'submitted';

  // Load history when session changes
  useEffect(() => {
    if (!activeSessionId) { setMessages([]); setHasAutoTitled(false); return; }
    setHasAutoTitled(false);
    fetch(`/api/chat/history?sessionId=${activeSessionId}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setMessages(data.map((m: { role: string; content: string }, i: number) => ({
            id: `hist-${i}`,
            role: m.role as 'user' | 'assistant',
            parts: [{ type: 'text' as const, text: m.content }],
          })));
        }
      })
      .catch(() => setMessages([]));
  }, [activeSessionId, setMessages]);

  // Auto-trigger onboarding for new users (no nickname + no sessions)
  useEffect(() => {
    if (onboardingTriggered || sessionsLoading || nickname === undefined) return;
    if (nickname !== null || sessions.length > 0) return;
    setOnboardingTriggered(true);
    (async () => {
      const session = await createSession();
      if (!session) return;
      setMessages([]);
      setHasAutoTitled(true); // skip auto-titling for [start]
      sendMessage({ text: '[start]' });
    })();
  }, [nickname, sessions, sessionsLoading, onboardingTriggered, createSession, setMessages, sendMessage]);

  // Auto-title after first real user message (skip [start])
  useEffect(() => {
    if (hasAutoTitled || !activeSessionId) return;
    const userMsgs = messages.filter((m) => m.role === 'user');
    const realMsgs = userMsgs.filter((m) => getTextContent(m) !== '[start]');
    if (realMsgs.length === 1) {
      const text = getTextContent(realMsgs[0]);
      const title = text.slice(0, 50) + (text.length > 50 ? '...' : '');
      renameSession(activeSessionId, title);
      setHasAutoTitled(true);
    }
  }, [messages, activeSessionId, hasAutoTitled, renameSession]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleNewChat = useCallback(async () => {
    const session = await createSession();
    if (session) { setMessages([]); setHasAutoTitled(false); setInput(''); }
  }, [createSession, setMessages]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;
    if (!activeSessionId) { const s = await createSession(); if (!s) return; }
    setInput('');
    sendMessage({ text });
  }, [input, isLoading, activeSessionId, createSession, sendMessage]);

  if (sessionsLoading) return (
    <div className="flex items-center justify-center h-full font-mono text-sm text-gray-600">Loading...</div>
  );

  return (
    <div className="flex h-full">
      <ChatSidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelect={setActiveSessionId}
        onNew={handleNewChat}
        onDelete={deleteSession}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isMobile={isMobile}
      />

      <div className="flex-1 flex flex-col h-full" style={{ background: '#111' }}>
        {/* Header */}
        <div
          className="flex items-center gap-3 px-4 py-2 font-mono"
          style={{
            background: 'linear-gradient(180deg, #f7931a22 0%, #f7931a11 100%)',
            borderBottom: '2px solid #f7931a',
          }}
        >
          {isMobile && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-sm mr-1"
              style={{ color: '#f7931a' }}
            >
              |||
            </button>
          )}
          <span className="text-sm font-bold uppercase tracking-widest" style={{ color: '#f7931a' }}>
            AI COACH
          </span>
          <span className="text-[11px]" style={{ color: '#555' }}>
            {activeSessionId ? sessions.find((s) => s.id === activeSessionId)?.title : 'No session'}
          </span>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && !isLoading && !onboardingTriggered && (
            <div className="flex flex-col items-center justify-center h-full text-center font-mono">
              <p className="text-lg mb-2" style={{ color: '#f7931a' }}>SystemTrader AI</p>
              <p className="text-sm text-gray-600 max-w-sm">Ask about your trades, run debriefs, get performance analysis, or log trades via chat.</p>
            </div>)}

          {messages.length === 0 && (isLoading || onboardingTriggered) && (
            <div className="flex flex-col items-center justify-center h-full text-center font-mono">
              <p className="text-sm text-gray-500">Initializing...</p>
            </div>)}

          {messages.map((m) => {
            const text = getTextContent(m);
            if (!text || text === '[start]') return null;
            return (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className="max-w-[80%] px-3 py-2 rounded font-mono text-sm whitespace-pre-wrap"
                  style={{
                    background: m.role === 'user' ? '#f7931a22' : '#1a1a1a',
                    border: m.role === 'user' ? '1px solid #f7931a44' : '1px solid #333',
                    color: m.role === 'user' ? '#f7931a' : '#ccc',
                  }}
                >
                  {text}
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex justify-start">
              <div
                className="px-3 py-2 rounded font-mono text-sm"
                style={{ background: '#1a1a1a', border: '1px solid #333', color: '#555' }}
              >
                Thinking...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-3 flex gap-2" style={{ borderTop: '1px solid #333', background: '#0d0d0d' }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder={activeSessionId ? 'Message your AI coach...' : 'Start a new chat...'}
            className="flex-1 px-3 py-2 font-mono text-sm rounded"
            style={{ background: '#1a1a1a', border: '1px solid #333', color: '#ccc', outline: 'none' }}
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="px-4 py-2 font-mono text-sm font-bold uppercase tracking-wider disabled:opacity-40"
            style={{ background: '#f7931a', color: '#000' }}
          >
            SEND
          </button>
        </div>
      </div>
    </div>
  );
}
