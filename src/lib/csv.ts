import { Trade } from './types';
import { TradeInput } from './data/types';
import { calculatePnl, determineOutcome } from './utils';

const EXPORT_HEADERS = [
  'symbol', 'strategy', 'direction', 'entry_price', 'exit_price',
  'quantity', 'pnl', 'outcome', 'entry_date', 'exit_date', 'notes',
];

export function tradesToCsv(trades: Trade[]): string {
  const rows = [EXPORT_HEADERS.join(',')];
  for (const t of trades) {
    rows.push([
      esc(t.symbol),
      esc(t.strategy_name),
      t.direction,
      String(t.entry_price),
      t.exit_price !== null ? String(t.exit_price) : '',
      String(t.quantity),
      t.pnl !== null ? String(t.pnl) : '',
      t.outcome,
      t.entry_date,
      t.exit_date ?? '',
      esc(t.notes),
    ].join(','));
  }
  return rows.join('\n');
}

function esc(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

export interface CsvParseResult {
  valid: TradeInput[];
  errors: { row: number; message: string }[];
}

export function parseCsv(content: string): CsvParseResult {
  const lines = content.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return { valid: [], errors: [{ row: 0, message: 'No data rows found' }] };

  const headerLine = lines[0].toLowerCase();
  const headers = parseCsvLine(headerLine);

  const colMap: Record<string, number> = {};
  const aliases: Record<string, string[]> = {
    symbol: ['symbol', 'sym', 'ticker'],
    strategy: ['strategy', 'strat', 'strategy_name'],
    direction: ['direction', 'dir', 'side'],
    entry_price: ['entry_price', 'entry', 'buy_price'],
    exit_price: ['exit_price', 'exit', 'sell_price'],
    quantity: ['quantity', 'qty', 'size', 'shares'],
    pnl: ['pnl', 'p&l', 'profit', 'profit_loss'],
    outcome: ['outcome', 'result', 'status'],
    entry_date: ['entry_date', 'date', 'open_date'],
    exit_date: ['exit_date', 'close_date'],
    notes: ['notes', 'note', 'comment', 'comments'],
  };

  for (const [field, names] of Object.entries(aliases)) {
    for (const name of names) {
      const idx = headers.indexOf(name);
      if (idx !== -1) { colMap[field] = idx; break; }
    }
  }

  if (!('symbol' in colMap)) return { valid: [], errors: [{ row: 0, message: 'Missing required column: symbol' }] };

  const valid: TradeInput[] = [];
  const errors: { row: number; message: string }[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    try {
      const symbol = col(cols, colMap, 'symbol');
      if (!symbol) { errors.push({ row: i + 1, message: 'Missing symbol' }); continue; }

      const direction = parseDirection(col(cols, colMap, 'direction'));
      const entryPrice = parseFloat(col(cols, colMap, 'entry_price') || '0');
      const exitPriceStr = col(cols, colMap, 'exit_price');
      const exitPrice = exitPriceStr ? parseFloat(exitPriceStr) : null;
      const quantity = parseFloat(col(cols, colMap, 'quantity') || '1');
      const entryDate = col(cols, colMap, 'entry_date') || new Date().toISOString();
      const exitDate = col(cols, colMap, 'exit_date') || null;

      let pnl: number | null = null;
      const pnlStr = col(cols, colMap, 'pnl');
      if (pnlStr) {
        pnl = parseFloat(pnlStr);
      } else if (exitPrice !== null) {
        pnl = calculatePnl(direction, entryPrice, exitPrice, quantity);
      }

      let outcome: TradeInput['outcome'] = 'Open';
      const outcomeStr = col(cols, colMap, 'outcome');
      if (outcomeStr) {
        outcome = parseOutcome(outcomeStr);
      } else if (pnl !== null) {
        outcome = determineOutcome(pnl);
      }

      valid.push({
        strategy_id: null,
        strategy_name: col(cols, colMap, 'strategy') || 'No Strategy',
        symbol: symbol.toUpperCase(),
        direction,
        entry_price: entryPrice,
        exit_price: exitPrice,
        quantity,
        outcome,
        pnl,
        notes: col(cols, colMap, 'notes') || '',
        entry_date: new Date(entryDate).toISOString(),
        exit_date: exitDate ? new Date(exitDate).toISOString() : null,
        compliance: [],
      });
    } catch {
      errors.push({ row: i + 1, message: 'Invalid data' });
    }
  }

  return { valid, errors };
}

function col(cols: string[], map: Record<string, number>, field: string): string {
  const idx = map[field];
  return idx !== undefined && idx < cols.length ? cols[idx].trim() : '';
}

function parseDirection(val: string): 'Long' | 'Short' {
  const lower = val.toLowerCase();
  if (['short', 'sht', 'sell', 's'].includes(lower)) return 'Short';
  return 'Long';
}

function parseOutcome(val: string): TradeInput['outcome'] {
  const lower = val.toLowerCase();
  if (lower === 'win' || lower === 'w') return 'Win';
  if (lower === 'loss' || lower === 'l') return 'Loss';
  if (lower === 'breakeven' || lower === 'be') return 'Breakeven';
  return 'Open';
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { current += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { result.push(current); current = ''; }
      else { current += ch; }
    }
  }
  result.push(current);
  return result;
}
