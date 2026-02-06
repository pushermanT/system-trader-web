'use client';

import { Trade } from '@/lib/types';

export type SortField = 'symbol' | 'pnl' | 'entry_date' | 'quantity';
export type SortDir = 'asc' | 'desc';

export interface TradeFilters {
  symbol: string;
  strategy: string;
  outcome: 'All' | 'Win' | 'Loss' | 'Open';
  dateFrom: string;
  dateTo: string;
  tags: string;
}

export const DEFAULT_FILTERS: TradeFilters = {
  symbol: '',
  strategy: '',
  outcome: 'All',
  dateFrom: '',
  dateTo: '',
  tags: '',
};

interface TradeFilterBarProps {
  filters: TradeFilters;
  onChange: (filters: TradeFilters) => void;
  sortField: SortField;
  sortDir: SortDir;
  strategyNames: string[];
}

export function TradeFilterBar({ filters, onChange, strategyNames }: TradeFilterBarProps) {
  function set<K extends keyof TradeFilters>(key: K, val: TradeFilters[K]) {
    onChange({ ...filters, [key]: val });
  }

  const hasFilters = filters.symbol || filters.strategy || filters.outcome !== 'All'
    || filters.dateFrom || filters.dateTo || filters.tags;

  return (
    <div className="flex flex-wrap items-center gap-2 px-2 py-2 font-mono text-[14px]"
      style={{ borderBottom: '1px solid #222' }}>
      <input
        value={filters.symbol}
        onChange={(e) => set('symbol', e.target.value)}
        placeholder="SYM"
        className="w-16 px-2 py-1 rounded-none border text-[14px] font-mono"
        style={{ background: '#0a0a0a', borderColor: '#333', color: '#ddd' }}
      />
      <select
        value={filters.strategy}
        onChange={(e) => set('strategy', e.target.value)}
        className="px-2 py-1 rounded-none border text-[14px] font-mono"
        style={{ background: '#0a0a0a', borderColor: '#333', color: '#ddd' }}
      >
        <option value="">ALL STRAT</option>
        {strategyNames.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
      <select
        value={filters.outcome}
        onChange={(e) => set('outcome', e.target.value as TradeFilters['outcome'])}
        className="px-2 py-1 rounded-none border text-[14px] font-mono"
        style={{ background: '#0a0a0a', borderColor: '#333', color: '#ddd' }}
      >
        <option value="All">ALL OUT</option>
        <option value="Win">WIN</option>
        <option value="Loss">LOSS</option>
        <option value="Open">OPEN</option>
      </select>
      <input
        type="date"
        value={filters.dateFrom}
        onChange={(e) => set('dateFrom', e.target.value)}
        className="px-2 py-1 rounded-none border text-[14px] font-mono"
        style={{ background: '#0a0a0a', borderColor: '#333', color: '#ddd' }}
        title="From date"
      />
      <input
        type="date"
        value={filters.dateTo}
        onChange={(e) => set('dateTo', e.target.value)}
        className="px-2 py-1 rounded-none border text-[14px] font-mono"
        style={{ background: '#0a0a0a', borderColor: '#333', color: '#ddd' }}
        title="To date"
      />
      <input
        value={filters.tags}
        onChange={(e) => set('tags', e.target.value)}
        placeholder="TAGS"
        className="w-20 px-2 py-1 rounded-none border text-[14px] font-mono"
        style={{ background: '#0a0a0a', borderColor: '#333', color: '#ddd' }}
      />
      {hasFilters && (
        <button
          onClick={() => onChange(DEFAULT_FILTERS)}
          className="px-2 py-1 text-[13px] text-gray-500 hover:text-white transition-colors"
        >
          CLEAR
        </button>
      )}
    </div>
  );
}

export function SortableHeader({
  label, field, sortField, sortDir, onSort,
}: {
  label: string;
  field: SortField;
  sortField: SortField;
  sortDir: SortDir;
  onSort: (field: SortField) => void;
}) {
  const active = sortField === field;
  return (
    <th
      className="py-1.5 px-2 font-normal cursor-pointer select-none hover:text-gray-300 transition-colors"
      onClick={() => onSort(field)}
      style={{ color: active ? '#dcdcaa' : undefined }}
    >
      {label}{active ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
    </th>
  );
}

export function applyFilters(trades: Trade[], filters: TradeFilters): Trade[] {
  return trades.filter((t) => {
    if (filters.symbol && !t.symbol.toLowerCase().includes(filters.symbol.toLowerCase())) return false;
    if (filters.strategy && t.strategy_name !== filters.strategy) return false;
    if (filters.outcome !== 'All' && t.outcome !== filters.outcome) return false;
    if (filters.dateFrom && t.entry_date < filters.dateFrom) return false;
    if (filters.dateTo && t.entry_date > filters.dateTo + 'T23:59:59') return false;
    if (filters.tags) {
      const searchTags = filters.tags.toLowerCase().split(',').map((s) => s.trim()).filter(Boolean);
      const tradeTags = (t.notes ?? '').toLowerCase();
      if (!searchTags.some((tag) => tradeTags.includes(tag))) return false;
    }
    return true;
  });
}

export function applySort(trades: Trade[], field: SortField, dir: SortDir): Trade[] {
  const sorted = [...trades].sort((a, b) => {
    switch (field) {
      case 'symbol': return a.symbol.localeCompare(b.symbol);
      case 'pnl': return (a.pnl ?? 0) - (b.pnl ?? 0);
      case 'entry_date': return new Date(a.entry_date).getTime() - new Date(b.entry_date).getTime();
      case 'quantity': return a.quantity - b.quantity;
    }
  });
  return dir === 'desc' ? sorted.reverse() : sorted;
}
