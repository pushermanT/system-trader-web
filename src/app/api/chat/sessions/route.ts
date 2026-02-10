import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SupabaseRepo } from '@/lib/data/supabase-repo';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const repo = new SupabaseRepo(supabase, user.id);
  const sessions = await repo.getChatSessions();
  return NextResponse.json(sessions);
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const repo = new SupabaseRepo(supabase, user.id);
  const session = await repo.createChatSession(body.title || 'New Chat');

  if (!session) return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  return NextResponse.json(session);
}
