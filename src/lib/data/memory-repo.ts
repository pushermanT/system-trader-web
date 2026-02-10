import { SupabaseClient } from '@supabase/supabase-js';
import { Memory, SessionSummary } from './types';

const MAX_MEMORIES = 100;

export class MemoryRepo {
  constructor(
    private supabase: SupabaseClient,
    private userId: string
  ) {}

  async getMemories(limit = 100): Promise<Memory[]> {
    const { data } = await this.supabase
      .from('memories')
      .select('*')
      .eq('user_id', this.userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    return data ?? [];
  }

  async saveMemory(
    content: string,
    category: string,
    sourceSessionId?: string
  ): Promise<Memory | null> {
    const { data, error } = await this.supabase
      .from('memories')
      .insert({
        user_id: this.userId,
        content,
        category,
        source_session_id: sourceSessionId ?? null,
      })
      .select()
      .single();
    if (error) return null;

    // Enforce cap
    const count = await this.getMemoryCount();
    if (count > MAX_MEMORIES) {
      await this.deleteOldestMemories(MAX_MEMORIES);
    }

    return data;
  }

  async deleteMemory(id: string): Promise<void> {
    await this.supabase
      .from('memories')
      .delete()
      .eq('id', id)
      .eq('user_id', this.userId);
  }

  async getMemoryCount(): Promise<number> {
    const { count } = await this.supabase
      .from('memories')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', this.userId);
    return count ?? 0;
  }

  async deleteOldestMemories(keepCount: number): Promise<void> {
    const { data: toKeep } = await this.supabase
      .from('memories')
      .select('id')
      .eq('user_id', this.userId)
      .order('created_at', { ascending: false })
      .limit(keepCount);

    if (!toKeep || toKeep.length === 0) return;
    const keepIds = toKeep.map((m) => m.id);

    await this.supabase
      .from('memories')
      .delete()
      .eq('user_id', this.userId)
      .not('id', 'in', `(${keepIds.join(',')})`);
  }

  async getSessionSummaries(limit = 5): Promise<SessionSummary[]> {
    const { data } = await this.supabase
      .from('session_summaries')
      .select('*')
      .eq('user_id', this.userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    return data ?? [];
  }

  async upsertSessionSummary(
    sessionId: string,
    summary: string,
    topics: string[],
    messageCount: number
  ): Promise<void> {
    await this.supabase
      .from('session_summaries')
      .upsert(
        {
          session_id: sessionId,
          user_id: this.userId,
          summary,
          topics,
          message_count: messageCount,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'session_id' }
      );
  }

  async searchConversations(
    query: string,
    limit = 5
  ): Promise<{ type: string; content: string; created_at: string }[]> {
    const pattern = `%${query}%`;

    const [messagesRes, summariesRes] = await Promise.all([
      this.supabase
        .from('chat_messages')
        .select('content, created_at')
        .eq('user_id', this.userId)
        .ilike('content', pattern)
        .order('created_at', { ascending: false })
        .limit(limit),
      this.supabase
        .from('session_summaries')
        .select('summary, created_at')
        .eq('user_id', this.userId)
        .ilike('summary', pattern)
        .order('created_at', { ascending: false })
        .limit(limit),
    ]);

    const results: { type: string; content: string; created_at: string }[] = [];

    for (const msg of messagesRes.data ?? []) {
      results.push({ type: 'message', content: msg.content, created_at: msg.created_at });
    }
    for (const s of summariesRes.data ?? []) {
      results.push({ type: 'summary', content: s.summary, created_at: s.created_at });
    }

    results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return results.slice(0, limit);
  }
}
