import { createClient } from '@/lib/supabase/server';
import { MemoryRepo } from '@/lib/data/memory-repo';

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const { id } = await params;
  const repo = new MemoryRepo(supabase, user.id);
  await repo.deleteMemory(id);

  return Response.json({ success: true });
}
