'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import TradingViewWidget from '@/components/tradingview-widget';
import { useData } from '@/lib/data/data-context';
import { useIsMobile } from '@/hooks/use-is-mobile';

function ChartPageInner() {
  const isMobile = useIsMobile();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { repo } = useData();

  const [symbol, setSymbol] = useState(searchParams.get('sym') || 'AAPL');
  const [inputValue, setInputValue] = useState(symbol);
  const [recentSymbols, setRecentSymbols] = useState<string[]>([]);

  useEffect(() => {
    repo.getTrades().then((trades) => {
      const symbols = [...new Set(trades.map((t) => t.symbol))].slice(0, 8);
      setRecentSymbols(symbols);
    });
  }, [repo]);

  function handleSymbolSubmit(e: React.FormEvent) {
    e.preventDefault();
    const sym = inputValue.trim().toUpperCase();
    if (!sym) return;
    setSymbol(sym);
    setInputValue(sym);
    router.replace(`/dashboard/chart?sym=${sym}`, { scroll: false });
  }

  function handleQuickSelect(sym: string) {
    setSymbol(sym);
    setInputValue(sym);
    router.replace(`/dashboard/chart?sym=${sym}`, { scroll: false });
  }

  const chartHeight = isMobile ? 'calc(100vh - 180px)' : 'calc(100vh - 140px)';

  return (
    <div className="h-full font-mono">
      {/* Header bar */}
      <div
        className="flex items-center gap-3 px-4 py-2"
        style={{
          background: 'linear-gradient(180deg, #dcdcaa22 0%, #dcdcaa11 100%)',
          borderBottom: '2px solid #dcdcaa',
        }}
      >
        <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#dcdcaa' }}>
          CHART
        </span>
        <form onSubmit={handleSymbolSubmit} className="flex items-center gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value.toUpperCase())}
            className="px-2 py-1 text-[13px] font-mono uppercase tracking-wider w-24"
            style={{
              background: '#1a1a1a',
              border: '1px solid #333',
              color: '#e0e0e0',
              outline: 'none',
            }}
            placeholder="SYMBOL"
          />
          <button
            type="submit"
            className="px-3 py-1 text-[12px] font-bold uppercase tracking-wider"
            style={{ background: '#dcdcaa', color: '#0d0d0d' }}
          >
            GO
          </button>
        </form>

        {/* Recent symbols */}
        {recentSymbols.length > 0 && (
          <div className="flex items-center gap-1.5 ml-2 overflow-x-auto">
            {recentSymbols.map((sym) => (
              <button
                key={sym}
                onClick={() => handleQuickSelect(sym)}
                className="px-2 py-0.5 text-[11px] uppercase tracking-wider transition-colors"
                style={{
                  background: sym === symbol ? '#dcdcaa22' : 'transparent',
                  color: sym === symbol ? '#dcdcaa' : '#555',
                  border: `1px solid ${sym === symbol ? '#dcdcaa44' : '#333'}`,
                }}
              >
                {sym}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Chart */}
      <div style={{ height: chartHeight, background: '#0d0d0d' }}>
        <TradingViewWidget symbol={symbol} autosize />
      </div>
    </div>
  );
}

export default function ChartPage() {
  return (
    <Suspense fallback={<div className="p-4 font-mono text-gray-600 text-sm">Loading chart...</div>}>
      <ChartPageInner />
    </Suspense>
  );
}
