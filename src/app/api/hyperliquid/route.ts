import { NextResponse } from 'next/server';
import { fetchAllFills, fillsToTrades } from '@/lib/hyperliquid';

export async function POST(req: Request) {
  const { address } = await req.json();

  if (!address || typeof address !== 'string' || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 });
  }

  try {
    const fills = await fetchAllFills(address);
    const { trades, stats } = fillsToTrades(fills);
    return NextResponse.json({ trades, stats });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
