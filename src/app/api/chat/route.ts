import { streamText, tool } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { createClient } from '@/lib/supabase/server';
import { loadUserContext } from '@/lib/ai/context';
import { createTools } from '@/lib/ai/tool-handlers';
import { buildSystemPrompt } from '@/lib/ai/system-prompt';
import { SupabaseRepo } from '@/lib/data/supabase-repo';
import { MemoryRepo } from '@/lib/data/memory-repo';
import { extractAndSaveMemories, summarizeSession } from '@/lib/ai/memory';
import { searchConversationsSchema } from '@/lib/ai/tools';

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const { messages, sessionId } = await req.json();
  const repo = new SupabaseRepo(supabase, user.id);
  const memRepo = new MemoryRepo(supabase, user.id);
  const activeSessionId = sessionId || null;

  // Load context + memories in parallel
  const [ctx, memories, sessionSummaries] = await Promise.all([
    loadUserContext(user.id),
    memRepo.getMemories(),
    memRepo.getSessionSummaries(5),
  ]);

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
    memories,
    sessionSummaries,
  });

  const result = streamText({
    model: anthropic('claude-sonnet-4-5-20250929'),
    system: systemPrompt,
    messages,
    tools: {
      ...createTools(ctx),
      search_conversations: tool({
        description: 'Search past conversations and session summaries for relevant context',
        inputSchema: searchConversationsSchema,
        execute: async (params) => {
          const results = await memRepo.searchConversations(params.query, params.limit);
          return { results, count: results.length };
        },
      }),
    },
    onFinish: async ({ text }) => {
      if (text && activeSessionId) {
        await repo.saveChatMessage(activeSessionId, 'assistant', text);
      }

      // Fire-and-forget: extract memories + summarize session
      const userContent = lastUserMsg?.role === 'user' ? lastUserMsg.content : null;
      if (userContent && text && activeSessionId) {
        extractAndSaveMemories(
          memRepo, user.id, userContent, text, activeSessionId, memories
        ).catch((err) => console.error('[memory] bg extraction error:', err));

        const allMessages = await repo.getChatMessages(activeSessionId, 50);
        if (allMessages.length >= 4) {
          summarizeSession(memRepo, activeSessionId, allMessages)
            .catch((err) => console.error('[memory] bg summary error:', err));
        }
      }
    },
  });

  return result.toUIMessageStreamResponse();
}
