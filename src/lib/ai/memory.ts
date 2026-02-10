import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { MemoryRepo } from '@/lib/data/memory-repo';
import { Memory, SessionSummary } from '@/lib/data/types';

const memoryModel = google('gemini-2.0-flash');

const extractionSchema = z.object({
  memories: z.array(
    z.object({
      content: z.string(),
      category: z.enum(['pattern', 'preference', 'lesson', 'fact', 'goal']),
    })
  ),
});

const summarySchema = z.object({
  summary: z.string(),
  topics: z.array(z.string()),
});

export async function extractAndSaveMemories(
  repo: MemoryRepo,
  userId: string,
  userMessage: string,
  assistantMessage: string,
  sessionId: string | null,
  existingMemories: Memory[]
): Promise<void> {
  try {
    const existingList = existingMemories
      .map((m) => `- [${m.category}] ${m.content}`)
      .join('\n') || 'None yet.';

    const { object } = await generateObject({
      model: memoryModel,
      schema: extractionSchema,
      prompt: `You are a memory extraction system for a trading AI. Given this conversation exchange, extract 0-3 key facts about the user worth remembering across sessions.

Existing memories (do NOT duplicate these):
${existingList}

User said: ${userMessage}
AI responded: ${assistantMessage}

Only extract genuinely new, user-specific information. Return empty array if nothing worth remembering.`,
    });

    for (const mem of object.memories.slice(0, 3)) {
      await repo.saveMemory(mem.content, mem.category, sessionId ?? undefined);
    }
  } catch (err) {
    console.error('[memory] extraction failed:', err);
  }
}

export async function summarizeSession(
  repo: MemoryRepo,
  sessionId: string,
  messages: { role: string; content: string }[]
): Promise<void> {
  if (messages.length < 4) return;

  try {
    const transcript = messages
      .slice(-20)
      .map((m) => `${m.role}: ${m.content}`)
      .join('\n');

    const { object } = await generateObject({
      model: memoryModel,
      schema: summarySchema,
      prompt: `Summarize this trading AI conversation in 2-3 sentences. Extract 1-3 topic tags.

${transcript}`,
    });

    await repo.upsertSessionSummary(
      sessionId,
      object.summary,
      object.topics,
      messages.length
    );
  } catch (err) {
    console.error('[memory] session summary failed:', err);
  }
}

export function formatMemoriesForPrompt(memories: Memory[]): string {
  if (memories.length === 0) return '';
  const lines = memories.map((m) => {
    const date = new Date(m.created_at).toISOString().slice(0, 10);
    return `- [${m.category}] ${m.content} (${date})`;
  });
  return `\n## Memories\n${lines.join('\n')}\n`;
}

export function formatSummariesForPrompt(summaries: SessionSummary[]): string {
  if (summaries.length === 0) return '';
  const lines = summaries.map((s) => {
    const date = new Date(s.created_at).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    return `- [${date}] ${s.summary}`;
  });
  return `\n## Recent Conversations\n${lines.join('\n')}\n`;
}
