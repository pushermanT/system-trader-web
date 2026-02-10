import { createClient } from '@/lib/supabase/server';
import { MemoryRepo } from '@/lib/data/memory-repo';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const repo = new MemoryRepo(supabase, user.id);
  const memories = await repo.getMemories();

  return Response.json(memories);
}
