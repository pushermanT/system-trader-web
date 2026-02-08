'use client';

import { SymbolConcentration } from '@/lib/position-sizing';
import { formatCurrency } from '@/lib/utils';

interface ConcentrationWarningProps {
  concentrations: SymbolConcentration[];
  maxPct: number | null;
}

export default function ConcentrationWarning({ concentrations, maxPct }: ConcentrationWarningProps) {
  const overConcentrated = concentrations.filter((c) => c.exceeds);
  if (overConcentrated.length === 0) return null;

  return (
    <div className="px-3 py-2 font-mono text-[13px] rounded-md border border-yellow-700 bg-yellow-900/15 mt-2">
      <span className="text-yellow-400 font-bold uppercase tracking-wider">CONCENTRATION</span>
      <span className="text-gray-500 ml-2">Max {maxPct}% per symbol</span>
      <div className="mt-1 space-y-0.5">
        {overConcentrated.map((c) => (
          <div key={c.symbol} className="flex justify-between text-yellow-400">
            <span>{c.symbol}</span>
            <span>{c.pct.toFixed(1)}% ({formatCurrency(c.exposure)})</span>
          </div>
        ))}
      </div>
    </div>
  );
}
