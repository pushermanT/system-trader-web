import { TradeInput } from '@/lib/data/types';

const HL_API = 'https://api.hyperliquid.xyz/info';
const PAGE_SIZE = 500;
const MAX_FILLS = 10000;

export interface HyperliquidFill {
  coin: string;
  px: string;
  sz: string;
  side: string;
  time: number;
  dir: string;
  closedPnl: string;
  fee: string;
  startPosition: string;
}

export async function fetchAllFills(address: string): Promise<HyperliquidFill[]> {
  const fills: HyperliquidFill[] = [];
  let startTime = 0;

  while (fills.length < MAX_FILLS) {
    const body = {
      type: 'userFillsByTime',
      user: address,
      startTime,
      aggregateByTime: false,
    };
    const res = await fetch(HL_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Hyperliquid API error: ${res.status}`);
    const page: HyperliquidFill[] = await res.json();
    if (page.length === 0) break;
    fills.push(...page);
    if (page.length < PAGE_SIZE) break;
    startTime = page[page.length - 1].time + 1;
  }

  return fills;
}

interface Accumulator {
  direction: 'Long' | 'Short';
  totalSize: number;
  weightedEntrySum: number;
  firstEntryTime: number;
}

export function fillsToTrades(fills: HyperliquidFill[]): { trades: TradeInput[]; stats: { totalFills: number; coins: number } } {
  const trades: TradeInput[] = [];
  const accumulators = new Map<string, Accumulator>();
  const coins = new Set<string>();

  const sorted = [...fills].sort((a, b) => a.time - b.time);

  for (const fill of sorted) {
    coins.add(fill.coin);
    const sz = parseFloat(fill.sz);
    const px = parseFloat(fill.px);
    const closedPnl = parseFloat(fill.closedPnl);
    const isOpen = fill.dir === 'Open Long' || fill.dir === 'Open Short';
    const isClose = fill.dir === 'Close Long' || fill.dir === 'Close Short';

    if (isOpen) {
      const direction: 'Long' | 'Short' = fill.dir === 'Open Long' ? 'Long' : 'Short';
      const acc = accumulators.get(fill.coin);
      if (acc) {
        acc.weightedEntrySum += px * sz;
        acc.totalSize += sz;
      } else {
        accumulators.set(fill.coin, {
          direction,
          totalSize: sz,
          weightedEntrySum: px * sz,
          firstEntryTime: fill.time,
        });
      }
    } else if (isClose) {
      const acc = accumulators.get(fill.coin);
      const direction = acc?.direction ?? (fill.dir === 'Close Long' ? 'Long' : 'Short');
      const entryPrice = acc ? acc.weightedEntrySum / acc.totalSize : px;
      const entryTime = acc?.firstEntryTime ?? fill.time;

      trades.push(buildTrade(fill.coin, direction, entryPrice, px, sz, closedPnl, entryTime, fill.time));

      if (acc) {
        acc.totalSize -= sz;
        if (acc.totalSize <= 0.000001) {
          accumulators.delete(fill.coin);
        }
      }
    }
  }

  // Emit open positions from remaining accumulators
  for (const [coin, acc] of accumulators) {
    const entryPrice = acc.weightedEntrySum / acc.totalSize;
    trades.push({
      strategy_id: null, strategy_name: '', symbol: coin, direction: acc.direction,
      entry_price: entryPrice, exit_price: null, stop_loss_price: null, max_loss: null,
      quantity: acc.totalSize, outcome: 'Open', pnl: null,
      notes: '[TAGS] hyperliquid', autopsy: null, pre_entry_emotion: null,
      entry_date: new Date(acc.firstEntryTime).toISOString(),
      exit_date: null, compliance: [],
    });
  }

  return { trades, stats: { totalFills: fills.length, coins: coins.size } };
}

function buildTrade(
  coin: string, direction: 'Long' | 'Short', entryPrice: number, exitPrice: number,
  qty: number, closedPnl: number, entryTime: number, exitTime: number,
): TradeInput {
  const outcome = closedPnl > 0 ? 'Win' : closedPnl < 0 ? 'Loss' : 'Breakeven';
  return {
    strategy_id: null, strategy_name: '', symbol: coin, direction,
    entry_price: entryPrice, exit_price: exitPrice, stop_loss_price: null, max_loss: null,
    quantity: qty, outcome, pnl: closedPnl,
    notes: '[TAGS] hyperliquid', autopsy: null, pre_entry_emotion: null,
    entry_date: new Date(entryTime).toISOString(),
    exit_date: new Date(exitTime).toISOString(), compliance: [],
  };
}
