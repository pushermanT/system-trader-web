'use client';

import { useState, useEffect } from 'react';

const EMOTIONS = ['calm', 'confident', 'anxious', 'FOMO', 'revenge', 'tilt', 'frustrated', 'euphoric'] as const;
const DANGER_EMOTIONS = new Set(['revenge', 'tilt', 'FOMO']);
const COOLDOWN_SECONDS = 60;

interface EmotionalCheckProps {
  lossStreak: number;
  onConfirm: (emotion: string) => void;
  onCancel: () => void;
}

export default function EmotionalCheck({ lossStreak, onConfirm, onCancel }: EmotionalCheckProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const isDangerous = selected !== null && DANGER_EMOTIONS.has(selected);
  const needsCooldown = isDangerous || lossStreak >= 3;

  useEffect(() => {
    if (!needsCooldown || !selected) return;
    setCooldown(COOLDOWN_SECONDS);
  }, [selected, needsCooldown]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  function handleConfirm() {
    if (!selected) return;
    if (needsCooldown && cooldown > 0) return;
    onConfirm(selected);
  }

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center bg-black/80">
      <div className="w-full max-w-md border bg-gray-950 p-5" style={{ borderColor: '#dcdcaa' }}>
        <h3 className="text-sm font-mono font-bold uppercase tracking-wider mb-1" style={{ color: '#dcdcaa' }}>
          // EMOTIONAL CHECK-IN
        </h3>
        <p className="text-sm text-gray-500 font-mono mb-4">
          How are you feeling right now? Be honest — this is for you.
        </p>

        <div className="grid grid-cols-4 gap-2 mb-4">
          {EMOTIONS.map((e) => {
            const active = selected === e;
            const danger = DANGER_EMOTIONS.has(e);
            const borderColor = active ? (danger ? '#f44747' : '#4ec9b0') : '#333';
            const bgColor = active ? (danger ? '#f4474715' : '#4ec9b015') : 'transparent';
            return (
              <button key={e} type="button" onClick={() => setSelected(e)}
                className="px-2 py-2 text-[13px] font-mono uppercase tracking-wider rounded border transition-colors"
                style={{ borderColor, background: bgColor, color: active ? (danger ? '#f44747' : '#4ec9b0') : '#888' }}>
                {e}
              </button>
            );
          })}
        </div>

        {isDangerous && (
          <div className="rounded-md border border-red-700 bg-red-900/20 px-3 py-2 text-sm font-mono text-red-400 mb-3">
            Your emotional state suggests this may not be a good time to trade.
            {cooldown > 0 && ` Wait ${cooldown}s before proceeding.`}
          </div>
        )}

        {!isDangerous && lossStreak >= 3 && selected && (
          <div className="rounded-md border border-yellow-700 bg-yellow-900/20 px-3 py-2 text-sm font-mono text-yellow-400 mb-3">
            You are on a {lossStreak}-trade losing streak. Take a breath.
            {cooldown > 0 && ` Wait ${cooldown}s before proceeding.`}
          </div>
        )}

        <div className="flex justify-between pt-2">
          <button type="button" onClick={onCancel}
            className="text-sm text-gray-500 hover:text-gray-300 font-mono">Cancel</button>
          <button type="button" onClick={handleConfirm}
            disabled={!selected || (needsCooldown && cooldown > 0)}
            className="rounded-md px-4 py-2 text-sm font-medium text-black font-mono disabled:opacity-40"
            style={{ background: '#dcdcaa' }}>
            {cooldown > 0 && needsCooldown ? `WAIT ${cooldown}s` : 'PROCEED TO TRADE'}
          </button>
        </div>
      </div>
    </div>
  );
}
