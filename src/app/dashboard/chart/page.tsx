'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import TradingViewWidget from '@/components/tradingview-widget';
import { useIsMobile } from '@/hooks/use-is-mobile';

function ChartPageInner() {
  const isMobile = useIsMobile();
  const searchParams = useSearchParams();
  const [symbol] = useState(searchParams.get('sym') || 'AAPL');

  const chartHeight = isMobile ? 'calc(100vh - 100px)' : 'calc(100vh - 90px)';

  return (
    <div className="h-full font-mono">
      {/* Header bar */}
      <div
        className="flex items-center gap-3 px-4 py-2"
        style={{
          background: 'linear-gradient(180deg, #ff8c0022 0%, #ff8c0011 100%)',
          borderBottom: '2px solid #ff8c00',
        }}
      >
        <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#ff8c00' }}>
          CHART
        </span>
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
