import { createClient } from '@/lib/supabase/server';
import { SupabaseRepo } from '@/lib/data/supabase-repo';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const repo = new SupabaseRepo(supabase, user.id);
  const riskSettings = await repo.getRiskSettings();

  return Response.json({ nickname: riskSettings.nickname });
}
