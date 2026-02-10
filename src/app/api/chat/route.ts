import { streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { createClient } from '@/lib/supabase/server';
import { loadUserContext } from '@/lib/ai/context';
import { createTools } from '@/lib/ai/tool-handlers';
import { buildSystemPrompt } from '@/lib/ai/system-prompt';
import { SupabaseRepo } from '@/lib/data/supabase-repo';

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const { messages, sessionId } = await req.json();
  const ctx = await loadUserContext(user.id);
  const repo = new SupabaseRepo(supabase, user.id);
  const activeSessionId = sessionId || null;

  // Save user message
  const lastUserMsg = messages[messages.length - 1];
  if (lastUserMsg?.role === 'user' && activeSessionId) {
    await repo.saveChatMessage(activeSessionId, 'user', lastUserMsg.content);
  }

  const systemPrompt = buildSystemPrompt({
    strategies: ctx.strategies,
    trades: ctx.trades,
    riskSettings: ctx.riskSettings,
    traderProfile: ctx.traderProfile,
    nickname: ctx.riskSettings.nickname,
  });

  const result = streamText({
    model: anthropic('claude-sonnet-4-5-20250929'),
    system: systemPrompt,
    messages,
    tools: createTools(ctx),
    onFinish: async ({ text }) => {
      if (text && activeSessionId) {
        await repo.saveChatMessage(activeSessionId, 'assistant', text);
      }
    },
  });

  return result.toUIMessageStreamResponse();
}
