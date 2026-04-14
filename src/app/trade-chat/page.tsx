import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import TradeChatContainer from '@/components/trade-chat/TradeChatContainer';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Trade Chat · SystemTrader',
  description: 'Structured trade planning conversation',
};

export default async function TradeChatPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/trade-chat');
  }

  return <TradeChatContainer />;
}
