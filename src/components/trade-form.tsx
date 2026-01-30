'use client';

import { useState, useEffect } from 'react';
import { Trade, Strategy, Rule, TradeRuleCompliance } from '@/lib/types';
import { calculatePnl, determineOutcome } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

interface TradeFormProps {
  trade?: Trade & { compliance?: TradeRuleCompliance[] };
  strategies: (Strategy & { rules: Rule[] })[];
  onSave: (data: {
    strategy_id: string | null;
    strategy_name: string;
    symbol: string;
    direction: 'Long' | 'Short';
    entry_price: number;
    exit_price: number | null;
    quantity: number;
    outcome: 'Win' | 'Loss' | 'Breakeven' | 'Open';
    pnl: number | null;
    notes: string;
    entry_date: string;
    exit_date: string | null;
    compliance: { rule_id: string | null; rule_text: string; followed: boolean }[];
  }) => Promise<void>;
  onCancel: () => void;
}

export default function TradeForm({ trade, strategies, onSave, onCancel }: TradeFormProps) {
  const [strategyId, setStrategyId] = useState(trade?.strategy_id ?? '');
  const [symbol, setSymbol] = useState(trade?.symbol ?? '');
  const [direction, setDirection] = useState<'Long' | 'Short'>(trade?.direction ?? 'Long');
  const [entryPrice, setEntryPrice] = useState(trade?.entry_price?.toString() ?? '');
  const [exitPrice, setExitPrice] = useState(trade?.exit_price?.toString() ?? '');
  const [quantity, setQuantity] = useState(trade?.quantity?.toString() ?? '');
  const [notes, setNotes] = useState(trade?.notes ?? '');
  const [entryDate, setEntryDate] = useState(
    trade?.entry_date ? new Date(trade.entry_date).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16)
  );
  const [exitDate, setExitDate] = useState(
    trade?.exit_date ? new Date(trade.exit_date).toISOString().slice(0, 16) : ''
  );
  const [compliance, setCompliance] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  const selectedStrategy = strategies.find((s) => s.id === strategyId);
  const rules = selectedStrategy?.rules?.sort((a, b) => a.order - b.order) ?? [];

  // Initialize compliance from existing trade or when strategy changes
  useEffect(() => {
    if (trade?.compliance && trade.strategy_id === strategyId) {
      const map: Record<string, boolean> = {};
      trade.compliance.forEach((c) => {
        map[c.rule_id ?? c.rule_text] = c.followed;
      });
      setCompliance(map);
    } else {
      const map: Record<string, boolean> = {};
      rules.forEach((r) => {
        map[r.id] = false;
      });
      setCompliance(map);
    }
  }, [strategyId]);

  // Calculate PnL
  const pnl =
    entryPrice && exitPrice && quantity
      ? calculatePnl(direction, parseFloat(entryPrice), parseFloat(exitPrice), parseFloat(quantity))
      : null;

  const outcome = exitPrice ? (pnl !== null ? determineOutcome(pnl) : 'Open') : 'Open';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const complianceData = rules.map((r) => ({
      rule_id: r.id,
      rule_text: r.text,
      followed: compliance[r.id] ?? false,
    }));

    await onSave({
      strategy_id: strategyId || null,
      strategy_name: selectedStrategy?.name ?? 'No Strategy',
      symbol: symbol.toUpperCase(),
      direction,
      entry_price: parseFloat(entryPrice),
      exit_price: exitPrice ? parseFloat(exitPrice) : null,
      quantity: parseFloat(quantity),
      outcome,
      pnl,
      notes,
      entry_date: new Date(entryDate).toISOString(),
      exit_date: exitDate ? new Date(exitDate).toISOString() : null,
      compliance: complianceData,
    });
    setSaving(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-300">Strategy</label>
          <select
            value={strategyId}
            onChange={(e) => setStrategyId(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">No Strategy</option>
            {strategies.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300">Symbol</label>
          <input
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            required
            placeholder="AAPL"
            className="mt-1 block w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300">Direction</label>
          <select
            value={direction}
            onChange={(e) => setDirection(e.target.value as 'Long' | 'Short')}
            className="mt-1 block w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="Long">Long</option>
            <option value="Short">Short</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300">Entry Price</label>
          <input
            type="number"
            step="any"
            value={entryPrice}
            onChange={(e) => setEntryPrice(e.target.value)}
            required
            className="mt-1 block w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300">Exit Price</label>
          <input
            type="number"
            step="any"
            value={exitPrice}
            onChange={(e) => setExitPrice(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300">Quantity</label>
          <input
            type="number"
            step="any"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
            className="mt-1 block w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300">P&L</label>
          <div className={`mt-1 rounded-md border border-gray-700 bg-gray-800/50 px-3 py-2 text-sm ${
            pnl !== null ? (pnl > 0 ? 'text-green-400' : pnl < 0 ? 'text-red-400' : 'text-gray-400') : 'text-gray-500'
          }`}>
            {pnl !== null ? `$${pnl.toFixed(2)}` : '--'}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300">Entry Date</label>
          <input
            type="datetime-local"
            value={entryDate}
            onChange={(e) => setEntryDate(e.target.value)}
            required
            className="mt-1 block w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300">Exit Date</label>
          <input
            type="datetime-local"
            value={exitDate}
            onChange={(e) => setExitDate(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="mt-1 block w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {rules.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Rule Compliance</label>
          <div className="space-y-2 rounded-md border border-gray-700 bg-gray-800/50 p-3">
            {rules.map((rule) => (
              <label key={rule.id} className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={compliance[rule.id] ?? false}
                  onChange={(e) => setCompliance({ ...compliance, [rule.id]: e.target.checked })}
                  className="mt-0.5 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
                />
                <span className="text-gray-300">{rule.text}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md px-4 py-2 text-sm text-gray-400 hover:text-white"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Trade'}
        </button>
      </div>
    </form>
  );
}
