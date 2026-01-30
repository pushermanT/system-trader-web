'use client';

import { useState, useEffect } from 'react';
import { Strategy, Rule, Trade } from '@/lib/types';
import { TradeInput } from '@/lib/data/types';
import { formatCurrency } from '@/lib/utils';
import { useData } from '@/lib/data/data-context';
import StrategyForm from '@/components/strategy-form';
import TradeForm from '@/components/trade-form';
import TerminalPanel from '@/components/terminal-panel';

export default function DashboardPage() {
  const { repo } = useData();

  const [strategies, setStrategies] = useState<(Strategy & { rules: Rule[] })[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showStrategyForm, setShowStrategyForm] = useState(false);
  const [editingStrategy, setEditingStrategy] = useState<(Strategy & { rules: Rule[] }) | null>(null);
  const [showTradeForm, setShowTradeForm] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);

  // Panel focus
  const [focusedPanel, setFocusedPanel] = useState<string>('strategies');

  async function loadData() {
    const [strats, t] = await Promise.all([
      repo.getStrategies(),
      repo.getTrades(),
    ]);
    setStrategies(strats);
    setTrades(t);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  // Strategy handlers
  async function handleSaveStrategy(data: { name: string; description: string; rules: string[] }) {
    if (editingStrategy) {
      await repo.updateStrategy(editingStrategy.id, data);
    } else {
      await repo.createStrategy(data);
    }
    setShowStrategyForm(false);
    setEditingStrategy(null);
    loadData();
  }

  async function handleDeleteStrategy(id: string) {
    if (!confirm('Delete this strategy?')) return;
    await repo.deleteStrategy(id);
    loadData();
  }

  async function handleToggleActive(id: string, isActive: boolean) {
    await repo.toggleStrategyActive(id, isActive);
    loadData();
  }

  async function handleSaveTrade(data: TradeInput) {
    if (editingTrade) {
      await repo.updateTrade(editingTrade.id, data);
    } else {
      await repo.createTrade(data);
    }
    setShowTradeForm(false);
    setEditingTrade(null);
    loadData();
  }

  async function handleDeleteTrade(id: string) {
    if (!confirm('Delete this trade?')) return;
    await repo.deleteTrade(id);
    loadData();
  }

  const activeStrategies = strategies.filter((s) => s.is_active);

  function pnlColor(pnl: number | null): string {
    if (pnl === null) return '#555';
    if (pnl > 0) return '#4ec9b0';
    if (pnl < 0) return '#f44747';
    return '#888';
  }

  function outcomeColor(outcome: string): string {
    switch (outcome) {
      case 'Win': return '#4ec9b0';
      case 'Loss': return '#f44747';
      case 'Open': return '#569cd6';
      default: return '#888';
    }
  }

  // Stats
  const totalTrades = trades.length;
  const openTrades = trades.filter((t) => t.outcome === 'Open').length;
  const closedTrades = trades.filter((t) => t.outcome !== 'Open');
  const wins = closedTrades.filter((t) => t.outcome === 'Win').length;
  const winRate = closedTrades.length > 0 ? ((wins / closedTrades.length) * 100).toFixed(1) : '—';
  const totalPnl = trades.reduce((s, t) => s + (t.pnl ?? 0), 0);

  return (
    <div className="relative w-full h-full" style={{ minHeight: 'calc(100vh - 48px)' }}>

      {/* ── Top status bar ── */}
      <div
        className="flex items-center justify-between px-4 py-1.5 font-mono text-[13px] border-b"
        style={{ background: '#0a0a0a', borderColor: '#222', color: '#888' }}
      >
        <div className="flex items-center gap-4">
          <span style={{ color: '#ff8c00' }}>SYSTEM TRADER</span>
          <span>STRATEGIES: <span style={{ color: '#4ec9b0' }}>{activeStrategies.length}</span></span>
          <span>TRADES: <span style={{ color: '#4ec9b0' }}>{totalTrades}</span></span>
          <span>OPEN: <span style={{ color: '#569cd6' }}>{openTrades}</span></span>
        </div>
        <div className="flex items-center gap-4">
          <span>W/R: <span style={{ color: '#dcdcaa' }}>{winRate}%</span></span>
          <span>P&L: <span style={{ color: totalPnl >= 0 ? '#4ec9b0' : '#f44747' }}>{formatCurrency(totalPnl)}</span></span>
          <span style={{ color: '#555' }}>{new Date().toLocaleDateString()}</span>
        </div>
      </div>

      {/* ── Terminal panels ── */}
      <div className="relative" style={{ height: 'calc(100vh - 80px)' }}>

        <TerminalPanel
          title="STRATEGIES"
          defaultPosition={{ x: 16, y: 16 }}
          defaultSize={{ width: 580, height: 480 }}
          accentColor="#ff8c00"
          zIndex={focusedPanel === 'strategies' ? 10 : 1}
          onFocus={() => setFocusedPanel('strategies')}
        >
          <div className="p-2">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-xs text-gray-500 font-mono uppercase tracking-wider">
                {strategies.length} total &middot; {activeStrategies.length} active
              </span>
              <button
                onClick={() => { setEditingStrategy(null); setShowStrategyForm(true); }}
                className="font-mono text-xs px-3 py-1 text-black font-bold uppercase tracking-wider"
                style={{ background: '#ff8c00' }}
              >
                + NEW
              </button>
            </div>

            {loading ? (
              <p className="text-gray-600 text-xs font-mono px-1 py-4">Loading...</p>
            ) : strategies.length === 0 ? (
              <p className="text-gray-600 text-xs font-mono px-1 py-4">No strategies. Click + NEW to create one.</p>
            ) : (
              <table className="w-full text-[13px] font-mono">
                <thead>
                  <tr className="text-gray-500 border-b border-gray-800">
                    <th className="text-left py-1.5 px-2 font-normal">NAME</th>
                    <th className="text-center py-1.5 px-2 font-normal">RULES</th>
                    <th className="text-center py-1.5 px-2 font-normal">STATUS</th>
                    <th className="text-right py-1.5 px-2 font-normal">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {strategies.map((s) => (
                    <tr key={s.id} className="border-b border-gray-800/50 hover:bg-white/[0.03] transition-colors">
                      <td className="py-2.5 px-2">
                        <div className="text-gray-200 truncate max-w-[220px]">{s.name}</div>
                        {s.description && (
                          <div className="text-gray-600 truncate max-w-[220px] text-xs">{s.description}</div>
                        )}
                      </td>
                      <td className="text-center py-2.5 px-2 text-gray-400">{s.rules?.length ?? 0}</td>
                      <td className="text-center py-2.5 px-2">
                        <span style={{ color: s.is_active ? '#4ec9b0' : '#555' }}>
                          {s.is_active ? 'ACTIVE' : 'ARCHIVED'}
                        </span>
                      </td>
                      <td className="text-right py-2.5 px-2">
                        <div className="flex items-center justify-end gap-3">
                          <button onClick={() => { setEditingStrategy(s); setShowStrategyForm(true); }} className="text-gray-500 hover:text-blue-400 transition-colors">EDIT</button>
                          <button onClick={() => handleToggleActive(s.id, s.is_active)} className="text-gray-500 hover:text-yellow-400 transition-colors">{s.is_active ? 'ARC' : 'RST'}</button>
                          <button onClick={() => handleDeleteStrategy(s.id)} className="text-gray-500 hover:text-red-400 transition-colors">DEL</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </TerminalPanel>

        <TerminalPanel
          title="TRADES"
          defaultPosition={{ x: 620, y: 16 }}
          defaultSize={{ width: 740, height: 480 }}
          accentColor="#569cd6"
          zIndex={focusedPanel === 'trades' ? 10 : 1}
          onFocus={() => setFocusedPanel('trades')}
        >
          <div className="p-2">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-xs text-gray-500 font-mono uppercase tracking-wider">
                {trades.length} total &middot; {openTrades} open
              </span>
              <button
                onClick={() => { setEditingTrade(null); setShowTradeForm(true); }}
                className="font-mono text-xs px-3 py-1 text-black font-bold uppercase tracking-wider"
                style={{ background: '#569cd6' }}
              >
                + NEW
              </button>
            </div>

            {loading ? (
              <p className="text-gray-600 text-xs font-mono px-1 py-4">Loading...</p>
            ) : trades.length === 0 ? (
              <p className="text-gray-600 text-xs font-mono px-1 py-4">No trades. Click + NEW to log one.</p>
            ) : (
              <table className="w-full text-[13px] font-mono">
                <thead>
                  <tr className="text-gray-500 border-b border-gray-800">
                    <th className="text-left py-1.5 px-2 font-normal">SYM</th>
                    <th className="text-left py-1.5 px-2 font-normal">STRAT</th>
                    <th className="text-center py-1.5 px-2 font-normal">DIR</th>
                    <th className="text-right py-1.5 px-2 font-normal">ENTRY</th>
                    <th className="text-right py-1.5 px-2 font-normal">EXIT</th>
                    <th className="text-right py-1.5 px-2 font-normal">QTY</th>
                    <th className="text-right py-1.5 px-2 font-normal">P&L</th>
                    <th className="text-center py-1.5 px-2 font-normal">OUT</th>
                    <th className="text-right py-1.5 px-2 font-normal">ACT</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.map((t) => (
                    <tr key={t.id} className="border-b border-gray-800/50 hover:bg-white/[0.03] transition-colors">
                      <td className="py-2.5 px-2 text-gray-200 font-medium">{t.symbol}</td>
                      <td className="py-2.5 px-2 text-gray-500 truncate max-w-[120px]">{t.strategy_name}</td>
                      <td className="text-center py-2.5 px-2">
                        <span style={{ color: t.direction === 'Long' ? '#4ec9b0' : '#f44747' }}>
                          {t.direction === 'Long' ? 'LNG' : 'SHT'}
                        </span>
                      </td>
                      <td className="text-right py-2.5 px-2 text-gray-300">{formatCurrency(t.entry_price)}</td>
                      <td className="text-right py-2.5 px-2 text-gray-300">{t.exit_price !== null ? formatCurrency(t.exit_price) : '—'}</td>
                      <td className="text-right py-2.5 px-2 text-gray-400">{t.quantity}</td>
                      <td className="text-right py-2.5 px-2 font-medium" style={{ color: pnlColor(t.pnl) }}>
                        {t.pnl !== null ? formatCurrency(t.pnl) : '—'}
                      </td>
                      <td className="text-center py-2.5 px-2">
                        <span style={{ color: outcomeColor(t.outcome) }}>
                          {t.outcome === 'Breakeven' ? 'BE' : t.outcome.toUpperCase()}
                        </span>
                      </td>
                      <td className="text-right py-2.5 px-2">
                        <div className="flex items-center justify-end gap-3">
                          <button onClick={() => { setEditingTrade(t); setShowTradeForm(true); }} className="text-gray-500 hover:text-blue-400 transition-colors">EDIT</button>
                          <button onClick={() => handleDeleteTrade(t.id)} className="text-gray-500 hover:text-red-400 transition-colors">DEL</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </TerminalPanel>

        <TerminalPanel
          title="PERFORMANCE"
          defaultPosition={{ x: 16, y: 530 }}
          defaultSize={{ width: 580, height: 240 }}
          accentColor="#4ec9b0"
          zIndex={focusedPanel === 'perf' ? 10 : 1}
          onFocus={() => setFocusedPanel('perf')}
        >
          <div className="p-4 font-mono text-[13px] grid grid-cols-2 gap-x-8 gap-y-3">
            <div className="flex justify-between">
              <span className="text-gray-500">TOTAL TRADES</span>
              <span className="text-gray-200">{totalTrades}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">OPEN POSITIONS</span>
              <span style={{ color: '#569cd6' }}>{openTrades}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">WIN RATE</span>
              <span style={{ color: '#dcdcaa' }}>{winRate}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">WINS / LOSSES</span>
              <span>
                <span style={{ color: '#4ec9b0' }}>{wins}</span>
                <span className="text-gray-600"> / </span>
                <span style={{ color: '#f44747' }}>{closedTrades.length - wins}</span>
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">TOTAL P&L</span>
              <span style={{ color: totalPnl >= 0 ? '#4ec9b0' : '#f44747' }}>{formatCurrency(totalPnl)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">ACTIVE STRATEGIES</span>
              <span style={{ color: '#ff8c00' }}>{activeStrategies.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">AVG P&L</span>
              <span style={{ color: closedTrades.length > 0 ? (totalPnl / closedTrades.length >= 0 ? '#4ec9b0' : '#f44747') : '#555' }}>
                {closedTrades.length > 0 ? formatCurrency(totalPnl / closedTrades.length) : '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">CLOSED TRADES</span>
              <span className="text-gray-200">{closedTrades.length}</span>
            </div>
          </div>
        </TerminalPanel>

      </div>

      {/* ── Strategy Modal ── */}
      {showStrategyForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="w-full max-w-md border bg-gray-950 p-5" style={{ borderColor: '#ff8c00' }}>
            <h3 className="mb-4 text-sm font-mono font-bold uppercase tracking-wider" style={{ color: '#ff8c00' }}>
              {editingStrategy ? '// EDIT STRATEGY' : '// NEW STRATEGY'}
            </h3>
            <StrategyForm
              strategy={editingStrategy ?? undefined}
              onSave={handleSaveStrategy}
              onCancel={() => { setShowStrategyForm(false); setEditingStrategy(null); }}
            />
          </div>
        </div>
      )}

      {/* ── Trade Modal ── */}
      {showTradeForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 overflow-y-auto py-8">
          <div className="w-full max-w-lg border bg-gray-950 p-5" style={{ borderColor: '#569cd6' }}>
            <h3 className="mb-4 text-sm font-mono font-bold uppercase tracking-wider" style={{ color: '#569cd6' }}>
              {editingTrade ? '// EDIT TRADE' : '// NEW TRADE'}
            </h3>
            <TradeForm
              trade={editingTrade ?? undefined}
              strategies={activeStrategies}
              onSave={handleSaveTrade}
              onCancel={() => { setShowTradeForm(false); setEditingTrade(null); }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
