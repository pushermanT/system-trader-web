'use client';

import { useState } from 'react';
import { TradeInput } from '@/lib/data/types';
import { formatCurrency } from '@/lib/utils';

interface Props {
  onImport: (trades: TradeInput[]) => Promise<void>;
}

type Step = 'input' | 'loading' | 'preview';

export default function HyperliquidImport({ onImport }: Props) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('input');
  const [address, setAddress] = useState('');
  const [trades, setTrades] = useState<TradeInput[]>([]);
  const [stats, setStats] = useState<{ totalFills: number; coins: number } | null>(null);
  const [error, setError] = useState('');
  const [importing, setImporting] = useState(false);

  function reset() {
    setStep('input');
    setAddress('');
    setTrades([]);
    setStats(null);
    setError('');
  }

  function handleClose() {
    setOpen(false);
    reset();
  }

  async function handleFetch() {
    const trimmed = address.trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
      setError('Invalid address — must be 0x + 40 hex chars');
      return;
    }
    setError('');
    setStep('loading');

    try {
      const res = await fetch('/api/hyperliquid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fetch failed');
      setTrades(data.trades);
      setStats(data.stats);
      setStep('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setStep('input');
    }
  }

  async function handleConfirmImport() {
    if (!trades.length) return;
    setImporting(true);
    await onImport(trades);
    setImporting(false);
    handleClose();
  }

  return (
    <>
      <button
        onClick={() => { setOpen(true); reset(); }}
        className="font-mono text-[13px] px-2 py-1 transition-colors"
        style={{ border: '1px solid #333', color: '#a855f7' }}
      >
        HYPERLIQUID
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="w-full max-w-xl border bg-gray-950 p-5 font-mono" style={{ borderColor: '#a855f7' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: '#a855f7' }}>
                // HYPERLIQUID IMPORT
              </h3>
              <button onClick={handleClose} className="text-gray-500 hover:text-white">✕</button>
            </div>

            {step === 'input' && (
              <div>
                <p className="text-[14px] text-gray-400 mb-3">
                  Paste a Hyperliquid wallet address to import all historical trades.
                </p>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="0x..."
                  className="w-full bg-black border border-gray-700 px-3 py-2 text-sm text-gray-200 font-mono mb-3 focus:outline-none focus:border-purple-500"
                />
                {error && <p className="text-[14px] mb-3" style={{ color: '#f44747' }}>{error}</p>}
                <div className="flex justify-end">
                  <button
                    onClick={handleFetch}
                    disabled={!address.trim()}
                    className="px-4 py-1.5 text-[14px] font-bold text-black disabled:opacity-50"
                    style={{ background: '#a855f7' }}
                  >
                    FETCH TRADES
                  </button>
                </div>
              </div>
            )}

            {step === 'loading' && (
              <div className="py-8 text-center">
                <p className="text-[15px] text-gray-400 animate-pulse">Fetching fills from Hyperliquid...</p>
              </div>
            )}

            {step === 'preview' && (
              <div>
                <div className="flex gap-4 mb-3 text-[14px]">
                  <span className="text-gray-400">
                    Fills: <span style={{ color: '#a855f7' }}>{stats?.totalFills ?? 0}</span>
                  </span>
                  <span className="text-gray-400">
                    Coins: <span style={{ color: '#a855f7' }}>{stats?.coins ?? 0}</span>
                  </span>
                  <span className="text-gray-400">
                    Trades: <span style={{ color: '#4ec9b0' }}>{trades.length}</span>
                  </span>
                </div>

                {trades.length > 0 ? (
                  <PreviewTable trades={trades} />
                ) : (
                  <p className="text-gray-600 text-[14px] py-4">No trades found for this address.</p>
                )}

                <div className="flex justify-end gap-2 mt-3">
                  <button onClick={reset} className="px-3 py-1.5 text-[14px] text-gray-400 hover:text-white">
                    BACK
                  </button>
                  <button
                    onClick={handleConfirmImport}
                    disabled={importing || trades.length === 0}
                    className="px-4 py-1.5 text-[14px] font-bold text-black disabled:opacity-50"
                    style={{ background: '#a855f7' }}
                  >
                    {importing ? 'IMPORTING...' : `IMPORT ${trades.length} TRADES`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function PreviewTable({ trades }: { trades: TradeInput[] }) {
  return (
    <div className="max-h-48 overflow-y-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="text-gray-500 border-b border-gray-800">
            <th className="text-left py-1 px-1">SYM</th>
            <th className="text-center py-1 px-1">DIR</th>
            <th className="text-right py-1 px-1">ENTRY</th>
            <th className="text-right py-1 px-1">EXIT</th>
            <th className="text-right py-1 px-1">QTY</th>
            <th className="text-right py-1 px-1">P&L</th>
          </tr>
        </thead>
        <tbody>
          {trades.slice(0, 20).map((t, i) => (
            <tr key={i} className="border-b border-gray-800/50">
              <td className="py-1 px-1 text-gray-200">{t.symbol}</td>
              <td className="text-center py-1 px-1" style={{ color: t.direction === 'Long' ? '#4ec9b0' : '#f44747' }}>
                {t.direction === 'Long' ? 'LNG' : 'SHT'}
              </td>
              <td className="text-right py-1 px-1 text-gray-300">{formatCurrency(t.entry_price)}</td>
              <td className="text-right py-1 px-1 text-gray-300">{t.exit_price !== null ? formatCurrency(t.exit_price) : '—'}</td>
              <td className="text-right py-1 px-1 text-gray-400">{t.quantity}</td>
              <td className="text-right py-1 px-1" style={{ color: (t.pnl ?? 0) >= 0 ? '#4ec9b0' : '#f44747' }}>
                {t.pnl !== null ? formatCurrency(t.pnl) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {trades.length > 20 && (
        <p className="text-gray-600 text-[13px] mt-1">+ {trades.length - 20} more</p>
      )}
    </div>
  );
}
