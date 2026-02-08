'use client';

import { formatCurrency } from '@/lib/utils';

interface StatusBarProps {
  complianceRate: string | null;
  totalPnl: number;
  winRate: string;
  openTrades: number;
  totalTrades: number;
  isMobile: boolean;
  onShowRiskSettings: () => void;
}

export default function StatusBar({ complianceRate, totalPnl, winRate, openTrades, totalTrades, isMobile, onShowRiskSettings }: StatusBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-1.5 font-mono text-[15px] border-b"
      style={{ background: '#0a0a0a', borderColor: '#222', color: '#888' }}>
      <span style={{ color: '#ff8c00' }}>SYSTEM TRADER</span>
      {complianceRate !== null && (
        <span className="text-[16px] font-bold" style={{ color: Number(complianceRate) >= 80 ? '#4ec9b0' : Number(complianceRate) >= 50 ? '#dcdcaa' : '#f44747' }}>
          {complianceRate}% COMPLIANT
        </span>
      )}
      <span>P&L: <span style={{ color: totalPnl >= 0 ? '#4ec9b0' : '#f44747' }}>{formatCurrency(totalPnl)}</span></span>
      {!isMobile && (
        <>
          <span>W/R: <span style={{ color: '#dcdcaa' }}>{winRate}%</span></span>
          <span>OPEN: <span style={{ color: '#569cd6' }}>{openTrades}</span></span>
          <span>TRADES: <span style={{ color: '#4ec9b0' }}>{totalTrades}</span></span>
        </>
      )}
      {!isMobile && <span style={{ color: '#555' }}>{new Date().toLocaleDateString()}</span>}
      <button onClick={onShowRiskSettings} className="text-gray-600 hover:text-red-400 transition-colors text-[13px] tracking-wider">LIMITS</button>
    </div>
  );
}
