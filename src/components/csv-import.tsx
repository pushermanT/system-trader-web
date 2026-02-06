'use client';

import { useState, useRef } from 'react';
import { Trade, Strategy, Rule } from '@/lib/types';
import { TradeInput } from '@/lib/data/types';
import { tradesToCsv, parseCsv, CsvParseResult } from '@/lib/csv';
import { formatCurrency } from '@/lib/utils';

interface CsvButtonsProps {
  trades: Trade[];
  onImport: (trades: TradeInput[]) => Promise<void>;
  strategies: (Strategy & { rules: Rule[] })[];
}

export default function CsvButtons({ trades, onImport }: CsvButtonsProps) {
  const [showImport, setShowImport] = useState(false);
  const [parseResult, setParseResult] = useState<CsvParseResult | null>(null);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleExport() {
    const csv = tradesToCsv(trades);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trades-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      setParseResult(parseCsv(content));
    };
    reader.readAsText(file);
  }

  async function handleConfirmImport() {
    if (!parseResult?.valid.length) return;
    setImporting(true);
    await onImport(parseResult.valid);
    setImporting(false);
    setShowImport(false);
    setParseResult(null);
  }

  return (
    <>
      <button
        onClick={handleExport}
        className="font-mono text-[13px] px-2 py-1 text-gray-500 hover:text-white transition-colors"
        style={{ border: '1px solid #333' }}
      >
        EXPORT
      </button>
      <button
        onClick={() => { setShowImport(true); setParseResult(null); }}
        className="font-mono text-[13px] px-2 py-1 text-gray-500 hover:text-white transition-colors"
        style={{ border: '1px solid #333' }}
      >
        IMPORT
      </button>

      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="w-full max-w-xl border bg-gray-950 p-5 font-mono" style={{ borderColor: '#569cd6' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: '#569cd6' }}>
                // CSV IMPORT
              </h3>
              <button
                onClick={() => { setShowImport(false); setParseResult(null); }}
                className="text-gray-500 hover:text-white"
              >
                ✕
              </button>
            </div>

            {!parseResult ? (
              <div>
                <p className="text-[14px] text-gray-400 mb-3">
                  Upload a CSV with headers: symbol, direction, entry_price, exit_price, quantity, entry_date, exit_date, notes
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:border file:border-gray-600 file:text-gray-300 file:bg-gray-800 file:font-mono file:text-sm file:cursor-pointer"
                />
              </div>
            ) : (
              <div>
                <div className="flex gap-4 mb-3 text-[14px]">
                  <span className="text-gray-400">
                    Valid: <span style={{ color: '#4ec9b0' }}>{parseResult.valid.length}</span>
                  </span>
                  {parseResult.errors.length > 0 && (
                    <span className="text-gray-400">
                      Errors: <span style={{ color: '#f44747' }}>{parseResult.errors.length}</span>
                    </span>
                  )}
                </div>

                {parseResult.errors.length > 0 && (
                  <div className="mb-3 max-h-24 overflow-y-auto text-[13px]" style={{ color: '#f44747' }}>
                    {parseResult.errors.map((e, i) => (
                      <div key={i}>Row {e.row}: {e.message}</div>
                    ))}
                  </div>
                )}

                {parseResult.valid.length > 0 && (
                  <div className="max-h-48 overflow-y-auto mb-3">
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
                        {parseResult.valid.slice(0, 20).map((t, i) => (
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
                    {parseResult.valid.length > 20 && (
                      <p className="text-gray-600 text-[13px] mt-1">+ {parseResult.valid.length - 20} more</p>
                    )}
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => { setParseResult(null); if (fileRef.current) fileRef.current.value = ''; }}
                    className="px-3 py-1.5 text-[14px] text-gray-400 hover:text-white"
                  >
                    BACK
                  </button>
                  <button
                    onClick={handleConfirmImport}
                    disabled={importing || parseResult.valid.length === 0}
                    className="px-4 py-1.5 text-[14px] font-bold text-black disabled:opacity-50"
                    style={{ background: '#569cd6' }}
                  >
                    {importing ? 'IMPORTING...' : `IMPORT ${parseResult.valid.length} TRADES`}
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
