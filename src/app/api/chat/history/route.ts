import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SupabaseRepo } from '@/lib/data/supabase-repo';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sessionId = req.nextUrl.searchParams.get('sessionId');
  if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 });

  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '50', 10);
  const repo = new SupabaseRepo(supabase, user.id);
  const messages = await repo.getChatMessages(sessionId, limit);
  return NextResponse.json(messages);
}
