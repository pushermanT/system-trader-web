import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SupabaseRepo } from '@/lib/data/supabase-repo';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { title } = await req.json();
  if (!title) return NextResponse.json({ error: 'Title required' }, { status: 400 });

  const repo = new SupabaseRepo(supabase, user.id);
  await repo.updateSessionTitle(id, title);
  return NextResponse.json({ success: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const repo = new SupabaseRepo(supabase, user.id);
  await repo.deleteChatSession(id);
  return NextResponse.json({ success: true });
}
