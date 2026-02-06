'use client';

import { useState } from 'react';
import { TradeAutopsy } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

interface AutopsyModalProps {
  symbol: string;
  pnl: number;
  onSubmit: (autopsy: TradeAutopsy) => void;
  onSkip: () => void;
}

const EMOTIONAL_STATES = ['calm', 'anxious', 'FOMO', 'revenge', 'tilt', 'other'] as const;
const CATEGORIES: { value: TradeAutopsy['category']; label: string }[] = [
  { value: 'moved_stop', label: 'Moved Stop' },
  { value: 'no_stop', label: 'No Stop Set' },
  { value: 'averaged_down', label: 'Averaged Down' },
  { value: 'emotional', label: 'Emotional Decision' },
  { value: 'ignored_rules', label: 'Ignored Rules' },
  { value: 'other', label: 'Other' },
];

export default function AutopsyModal({ symbol, pnl, onSubmit, onSkip }: AutopsyModalProps) {
  const [originalStop, setOriginalStop] = useState('');
  const [movedStop, setMovedStop] = useState(false);
  const [whyMoved, setWhyMoved] = useState('');
  const [emotionalState, setEmotionalState] = useState('calm');
  const [category, setCategory] = useState<TradeAutopsy['category']>('other');
  const [lesson, setLesson] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      original_stop: originalStop,
      moved_stop: movedStop,
      why_moved: whyMoved,
      emotional_state: emotionalState,
      lesson,
      category,
    });
  }

  const inputClass = "mt-1 block w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80">
      <div className="w-full max-w-md border bg-gray-950 p-5" style={{ borderColor: '#f44747' }}>
        <div className="mb-4">
          <h3 className="text-sm font-mono font-bold uppercase tracking-wider" style={{ color: '#f44747' }}>
            // BIG LOSS AUTOPSY
          </h3>
          <p className="mt-1 text-sm text-gray-500 font-mono">
            {symbol} &mdash; <span style={{ color: '#f44747' }}>{formatCurrency(pnl)}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-300">What was your original stop?</label>
            <input value={originalStop} onChange={(e) => setOriginalStop(e.target.value)} placeholder="e.g. $145.00" className={inputClass} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Did you move your stop?</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMovedStop(false)}
                className={`px-4 py-1.5 text-sm font-mono rounded border ${!movedStop ? 'border-green-600 text-green-400 bg-green-900/20' : 'border-gray-700 text-gray-500'}`}
              >
                NO
              </button>
              <button
                type="button"
                onClick={() => setMovedStop(true)}
                className={`px-4 py-1.5 text-sm font-mono rounded border ${movedStop ? 'border-red-600 text-red-400 bg-red-900/20' : 'border-gray-700 text-gray-500'}`}
              >
                YES
              </button>
            </div>
          </div>

          {movedStop && (
            <div>
              <label className="block text-sm font-medium text-gray-300">Why did you move it?</label>
              <textarea value={whyMoved} onChange={(e) => setWhyMoved(e.target.value)} rows={2} className={inputClass} />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300">Emotional state during the trade</label>
            <select value={emotionalState} onChange={(e) => setEmotionalState(e.target.value)} className={inputClass}>
              {EMOTIONAL_STATES.map((s) => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value as TradeAutopsy['category'])} className={inputClass}>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300">What would you do differently?</label>
            <textarea value={lesson} onChange={(e) => setLesson(e.target.value)} rows={2} placeholder="Next time I will..." className={inputClass} />
          </div>

          <div className="flex justify-between pt-2">
            <button type="button" onClick={onSkip} className="text-sm text-gray-500 hover:text-gray-300 font-mono">
              Skip Autopsy
            </button>
            <button type="submit" className="rounded-md px-4 py-2 text-sm font-medium text-white font-mono" style={{ background: '#f44747' }}>
              Save Autopsy
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
