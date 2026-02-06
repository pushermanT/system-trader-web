'use client';

import { useState, useEffect } from 'react';
import { Trade, Strategy, Rule, TradeRuleCompliance } from '@/lib/types';
import { calculatePnl, determineOutcome, calculateRiskReward, formatCurrency } from '@/lib/utils';
import { parseNotes } from '@/components/trade-detail';

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
    stop_loss_price: number | null;
    max_loss: number | null;
    quantity: number;
    outcome: 'Win' | 'Loss' | 'Breakeven' | 'Open';
    pnl: number | null;
    notes: string;
    autopsy: string | null;
    entry_date: string;
    exit_date: string | null;
    compliance: { rule_id: string | null; rule_text: string; followed: boolean }[];
  }) => Promise<void>;
  onCancel: () => void;
}

export default function TradeForm({ trade, strategies, onSave, onCancel }: TradeFormProps) {
  const parsed = trade ? parseNotes(trade.notes ?? '') : { thesis: '', lessons: '', tags: [], notes: '' };

  const [strategyId, setStrategyId] = useState(trade?.strategy_id ?? '');
  const [symbol, setSymbol] = useState(trade?.symbol ?? '');
  const [direction, setDirection] = useState<'Long' | 'Short'>(trade?.direction ?? 'Long');
  const [entryPrice, setEntryPrice] = useState(trade?.entry_price?.toString() ?? '');
  const [exitPrice, setExitPrice] = useState(trade?.exit_price?.toString() ?? '');
  const [stopLossPrice, setStopLossPrice] = useState(trade?.stop_loss_price?.toString() ?? '');
  const [quantity, setQuantity] = useState(trade?.quantity?.toString() ?? '');
  const [notes, setNotes] = useState(parsed.notes);
  const [thesis, setThesis] = useState(parsed.thesis);
  const [lessons, setLessons] = useState(parsed.lessons);
  const [tags, setTags] = useState(parsed.tags.join(', '));
  const [entryDate, setEntryDate] = useState(
    trade?.entry_date ? new Date(trade.entry_date).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16)
  );
  const [exitDate, setExitDate] = useState(
    trade?.exit_date ? new Date(trade.exit_date).toISOString().slice(0, 16)
    : trade ? new Date().toISOString().slice(0, 16)
    : ''
  );
  const [compliance, setCompliance] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  const selectedStrategy = strategies.find((s) => s.id === strategyId);
  const rules = selectedStrategy?.rules?.sort((a, b) => a.order - b.order) ?? [];

  useEffect(() => {
    if (trade?.compliance && trade.strategy_id === strategyId) {
      const map: Record<string, boolean> = {};
      trade.compliance.forEach((c) => {
        map[c.rule_id ?? c.rule_text] = c.followed;
      });
      setCompliance(map);
    } else {
      const map: Record<string, boolean> = {};
      rules.forEach((r) => { map[r.id] = false; });
      setCompliance(map);
    }
  }, [strategyId]);

  const pnl =
    entryPrice && exitPrice && quantity
      ? calculatePnl(direction, parseFloat(entryPrice), parseFloat(exitPrice), parseFloat(quantity))
      : null;

  const outcome = exitPrice ? (pnl !== null ? determineOutcome(pnl) : 'Open') : 'Open';

  const riskReward = entryPrice && stopLossPrice && quantity
    ? calculateRiskReward(
        direction,
        parseFloat(entryPrice),
        parseFloat(stopLossPrice),
        exitPrice ? parseFloat(exitPrice) : null,
        parseFloat(quantity)
      )
    : null;

  const maxLoss = riskReward ? riskReward.risk : null;
  const threshold = selectedStrategy?.max_loss_threshold ?? null;
  const exceedsThreshold = maxLoss !== null && threshold !== null && maxLoss > threshold;

  function buildNotes(): string {
    const parts: string[] = [];
    if (thesis.trim()) parts.push(`[THESIS]${thesis.trim()}`);
    if (lessons.trim()) parts.push(`[LESSONS]${lessons.trim()}`);
    if (tags.trim()) parts.push(`[TAGS]${tags.trim()}`);
    if (notes.trim()) parts.push(notes.trim());
    return parts.join('\n');
  }

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
      stop_loss_price: stopLossPrice ? parseFloat(stopLossPrice) : null,
      max_loss: maxLoss,
      quantity: parseFloat(quantity),
      outcome,
      pnl,
      notes: buildNotes(),
      autopsy: trade?.autopsy ?? null,
      entry_date: new Date(entryDate).toISOString(),
      exit_date: exitDate ? new Date(exitDate).toISOString() : null,
      compliance: complianceData,
    });
    setSaving(false);
  }

  const inputClass = "mt-1 block w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-300">Strategy</label>
          <select value={strategyId} onChange={(e) => setStrategyId(e.target.value)} className={inputClass}>
            <option value="">No Strategy</option>
            {strategies.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300">Symbol</label>
          <input value={symbol} onChange={(e) => setSymbol(e.target.value)} required placeholder="AAPL" className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300">Direction</label>
          <select value={direction} onChange={(e) => setDirection(e.target.value as 'Long' | 'Short')} className={inputClass}>
            <option value="Long">Long</option>
            <option value="Short">Short</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300">Entry Price</label>
          <input type="number" step="any" value={entryPrice} onChange={(e) => setEntryPrice(e.target.value)} required className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300">Exit Price</label>
          <input type="number" step="any" value={exitPrice} onChange={(e) => setExitPrice(e.target.value)} className={inputClass} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300">Stop Loss Price</label>
          <input type="number" step="any" value={stopLossPrice} onChange={(e) => setStopLossPrice(e.target.value)} placeholder="Optional" className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300">Max Loss</label>
          <div className={`mt-1 rounded-md border border-gray-700 bg-gray-800/50 px-3 py-2 text-sm ${
            exceedsThreshold ? 'text-red-400 border-red-700' : maxLoss !== null ? 'text-yellow-400' : 'text-gray-500'
          }`}>
            {maxLoss !== null ? formatCurrency(maxLoss) : '--'}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300">Quantity</label>
          <input type="number" step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} required className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300">P&L</label>
          <div className="mt-1 flex items-center gap-2">
            <div className={`flex-1 rounded-md border border-gray-700 bg-gray-800/50 px-3 py-2 text-sm ${
              pnl !== null ? (pnl > 0 ? 'text-green-400' : pnl < 0 ? 'text-red-400' : 'text-gray-400') : 'text-gray-500'
            }`}>
              {pnl !== null ? `$${pnl.toFixed(2)}` : '--'}
            </div>
            {riskReward && (
              <RiskBadge ratio={riskReward.ratio} reward={riskReward.reward} risk={riskReward.risk} exceedsThreshold={exceedsThreshold} />
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300">Entry Date</label>
          <input type="datetime-local" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} required className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300">Exit Date</label>
          <input type="datetime-local" value={exitDate} onChange={(e) => setExitDate(e.target.value)} className={inputClass} />
        </div>
      </div>

      {/* Journal fields */}
      <div>
        <label className="block text-sm font-medium text-gray-300">Thesis <span className="text-gray-600 font-normal">— why did you enter?</span></label>
        <textarea value={thesis} onChange={(e) => setThesis(e.target.value)} rows={2} placeholder="Market thesis for this trade..." className={inputClass} />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300">Lessons <span className="text-gray-600 font-normal">— post-trade reflection</span></label>
        <textarea value={lessons} onChange={(e) => setLessons(e.target.value)} rows={2} placeholder="What did you learn?" className={inputClass} />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300">Tags <span className="text-gray-600 font-normal">— comma-separated</span></label>
        <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="earnings, breakout, FOMO" className={inputClass} />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300">Notes</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={inputClass} />
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
        <button type="button" onClick={onCancel} className="rounded-md px-4 py-2 text-sm text-gray-400 hover:text-white">
          Cancel
        </button>
        <button type="submit" disabled={saving} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Trade'}
        </button>
      </div>
    </form>
  );
}

function RiskBadge({ ratio, reward, risk, exceedsThreshold }: {
  ratio: string; reward: number | null; risk: number; exceedsThreshold: boolean;
}) {
  if (exceedsThreshold) {
    return <span className="px-2 py-1 text-[13px] font-mono font-bold rounded bg-red-900/50 text-red-400 border border-red-700 whitespace-nowrap">EXCEEDS THRESHOLD</span>;
  }
  if (reward === null || risk === 0) return null;
  const r = reward / risk;
  const color = r >= 2 ? 'text-green-400 border-green-700 bg-green-900/30'
    : r >= 1 ? 'text-yellow-400 border-yellow-700 bg-yellow-900/30'
    : 'text-red-400 border-red-700 bg-red-900/30';
  return <span className={`px-2 py-1 text-[13px] font-mono font-bold rounded border whitespace-nowrap ${color}`}>{ratio} R:R</span>;
}
