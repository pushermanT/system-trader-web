'use client';

import { useState, useEffect } from 'react';
import { Trade } from '@/lib/types';
import { formatCurrency, calcWinRate, calcTotalPnl } from '@/lib/utils';
import { buildCumulativePnlSeries } from '@/lib/chart-utils';
import { useData } from '@/lib/data/data-context';
import TerminalPanel from '@/components/terminal-panel';
import PnlChart from '@/components/pnl-chart';
import { useIsMobile } from '@/hooks/use-is-mobile';

export default function PortfolioPage() {
  const { repo } = useData();
  const isMobile = useIsMobile();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    repo.getTrades().then((t) => {
      setTrades(t);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full font-mono text-xs text-gray-600 tracking-wider">
        LOADING DATA...
      </div>
    );
  }

  const closedTrades = trades.filter((t) => t.outcome !== 'Open');
  const totalPnl = calcTotalPnl(closedTrades);
  const winRate = calcWinRate(trades);
  const pnlSeries = buildCumulativePnlSeries(trades);

  return (
    <div className="relative w-full h-full" style={{ minHeight: 'calc(100vh - 48px)' }}>
      {/* ── Top status bar ── */}
      <div
        className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-1.5 font-mono text-[13px] border-b"
        style={{ background: '#0a0a0a', borderColor: '#222', color: '#888' }}
      >
        <span style={{ color: '#ff8c00' }}>PORTFOLIO</span>
        <span>CLOSED: <span style={{ color: '#4ec9b0' }}>{closedTrades.length}</span></span>
        <span>W/R: <span style={{ color: '#dcdcaa' }}>{winRate.toFixed(1)}%</span></span>
        <span>P&L: <span style={{ color: totalPnl >= 0 ? '#4ec9b0' : '#f44747' }}>{formatCurrency(totalPnl)}</span></span>
        <span style={{ color: '#555' }}>{new Date().toLocaleDateString()}</span>
      </div>

      {/* ── Chart panel ── */}
      <div className={isMobile ? 'p-3' : 'relative'} style={isMobile ? undefined : { height: 'calc(100vh - 80px)' }}>
        <TerminalPanel
          title="CUMULATIVE P&L"
          defaultPosition={{ x: 16, y: 16 }}
          defaultSize={{ width: 1000, height: 500 }}
          accentColor="#4ec9b0"
          isMobile={isMobile}
        >
          <PnlChart data={pnlSeries} />
        </TerminalPanel>
      </div>
    </div>
  );
}
