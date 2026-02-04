'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Strategy, Rule, Trade } from '@/lib/types';
import { TradeInput } from '@/lib/data/types';
import { formatCurrency } from '@/lib/utils';
import { buildCumulativePnlSeries } from '@/lib/chart-utils';
import { useData } from '@/lib/data/data-context';
import StrategyForm from '@/components/strategy-form';
import TradeForm from '@/components/trade-form';
import TerminalPanel from '@/components/terminal-panel';
import PnlChart from '@/components/pnl-chart';
import { useIsMobile } from '@/hooks/use-is-mobile';
import {
  TradeFilterBar, SortableHeader, applyFilters, applySort,
  TradeFilters, DEFAULT_FILTERS, SortField, SortDir,
} from '@/components/trade-filters';

function filtersFromParams(params: URLSearchParams): TradeFilters {
  return {
    symbol: params.get('sym') ?? '',
    strategy: params.get('strat') ?? '',
    outcome: (params.get('out') as TradeFilters['outcome']) ?? 'All',
    dateFrom: params.get('from') ?? '',
    dateTo: params.get('to') ?? '',
    tags: params.get('tags') ?? '',
  };
}

function filtersToParams(f: TradeFilters): string {
  const p = new URLSearchParams();
  if (f.symbol) p.set('sym', f.symbol);
  if (f.strategy) p.set('strat', f.strategy);
  if (f.outcome !== 'All') p.set('out', f.outcome);
  if (f.dateFrom) p.set('from', f.dateFrom);
  if (f.dateTo) p.set('to', f.dateTo);
  if (f.tags) p.set('tags', f.tags);
  return p.toString();
}

export default function DashboardPage() {
  const isMobile = useIsMobile();
  const { repo } = useData();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [strategies, setStrategies] = useState<(Strategy & { rules: Rule[] })[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showStrategyForm, setShowStrategyForm] = useState(false);
  const [editingStrategy, setEditingStrategy] = useState<(Strategy & { rules: Rule[] }) | null>(null);
  const [showTradeForm, setShowTradeForm] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);

  // Trade detail slide-out
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);

  // Panel focus
  const [focusedPanel, setFocusedPanel] = useState<string>('strategies');

  // Filters & sort
  const [filters, setFilters] = useState<TradeFilters>(() => filtersFromParams(searchParams));
  const [sortField, setSortField] = useState<SortField>('entry_date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const handleFilterChange = useCallback((f: TradeFilters) => {
    setFilters(f);
    const qs = filtersToParams(f);
    router.replace(qs ? `?${qs}` : '/dashboard', { scroll: false });
  }, [router]);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  }

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

  // CSV import handler
  async function handleImportTrades(newTrades: TradeInput[]) {
    await repo.bulkCreateTrades(newTrades);
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

  // Filtered + sorted trades
  const filteredTrades = applySort(applyFilters(trades, filters), sortField, sortDir);
  const strategyNames = [...new Set(trades.map((t) => t.strategy_name))].filter(Boolean);

  return (
    <div className="relative w-full h-full" style={{ minHeight: 'calc(100vh - 48px)' }}>

      {/* ── Top status bar ── */}
      <div
        className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-1.5 font-mono text-[13px] border-b"
        style={{ background: '#0a0a0a', borderColor: '#222', color: '#888' }}
      >
        <span style={{ color: '#ff8c00' }}>SYSTEM TRADER</span>
        {!isMobile && (
          <>
            <span>STRATEGIES: <span style={{ color: '#4ec9b0' }}>{activeStrategies.length}</span></span>
            <span>TRADES: <span style={{ color: '#4ec9b0' }}>{totalTrades}</span></span>
            <span>OPEN: <span style={{ color: '#569cd6' }}>{openTrades}</span></span>
            <span>W/R: <span style={{ color: '#dcdcaa' }}>{winRate}%</span></span>
          </>
        )}
        <span>P&L: <span style={{ color: totalPnl >= 0 ? '#4ec9b0' : '#f44747' }}>{formatCurrency(totalPnl)}</span></span>
        {!isMobile && <span style={{ color: '#555' }}>{new Date().toLocaleDateString()}</span>}
      </div>

      {/* ── Terminal panels ── */}
      <div className={isMobile ? 'p-3' : 'relative'} style={isMobile ? undefined : { height: 'calc(100vh - 80px)' }}>

        <TerminalPanel
          title="STRATEGIES"
          defaultPosition={{ x: 16, y: 16 }}
          defaultSize={{ width: 580, height: 480 }}
          accentColor="#ff8c00"
          zIndex={focusedPanel === 'strategies' ? 10 : 1}
          onFocus={() => setFocusedPanel('strategies')}
          isMobile={isMobile}
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
          isMobile={isMobile}
        >
          <div className="p-2">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-xs text-gray-500 font-mono uppercase tracking-wider">
                {filteredTrades.length}{filteredTrades.length !== trades.length ? `/${trades.length}` : ''} total &middot; {openTrades} open
              </span>
              <div className="flex items-center gap-2">
                <CsvButtons trades={trades} onImport={handleImportTrades} strategies={activeStrategies} />
                <button
                  onClick={() => { setEditingTrade(null); setShowTradeForm(true); }}
                  className="font-mono text-xs px-3 py-1 text-black font-bold uppercase tracking-wider"
                  style={{ background: '#569cd6' }}
                >
                  + NEW
                </button>
              </div>
            </div>

            <TradeFilterBar
              filters={filters}
              onChange={handleFilterChange}
              sortField={sortField}
              sortDir={sortDir}
              strategyNames={strategyNames}
            />

            {loading ? (
              <p className="text-gray-600 text-xs font-mono px-1 py-4">Loading...</p>
            ) : filteredTrades.length === 0 ? (
              <p className="text-gray-600 text-xs font-mono px-1 py-4">
                {trades.length === 0 ? 'No trades. Click + NEW to log one.' : 'No trades match filters.'}
              </p>
            ) : (
              <TradesTable
                trades={filteredTrades}
                isMobile={isMobile}
                sortField={sortField}
                sortDir={sortDir}
                onSort={handleSort}
                pnlColor={pnlColor}
                outcomeColor={outcomeColor}
                onEdit={(t) => { setEditingTrade(t); setShowTradeForm(true); }}
                onDelete={handleDeleteTrade}
                onSelect={setSelectedTrade}
              />
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
          isMobile={isMobile}
        >
          <PerformancePanel trades={trades} activeStrategies={activeStrategies} />
        </TerminalPanel>

        <TerminalPanel
          title="CUMULATIVE P&L"
          defaultPosition={{ x: 620, y: 530 }}
          defaultSize={{ width: 740, height: 240 }}
          accentColor="#4ec9b0"
          zIndex={focusedPanel === 'pnl-chart' ? 10 : 1}
          onFocus={() => setFocusedPanel('pnl-chart')}
          isMobile={isMobile}
        >
          <PnlChart data={buildCumulativePnlSeries(trades)} />
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
        <div className={`fixed inset-0 z-50 bg-black/70 ${isMobile ? 'flex items-end' : 'flex items-center justify-center overflow-y-auto py-8'}`}>
          <div className={`w-full border bg-gray-950 p-5 ${isMobile ? 'rounded-t-lg max-h-[90vh] overflow-y-auto' : 'max-w-lg'}`} style={{ borderColor: '#569cd6' }}>
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

      {/* ── Trade Detail Slide-out ── */}
      {selectedTrade && (
        <TradeDetailPanel trade={selectedTrade} onClose={() => setSelectedTrade(null)} />
      )}
    </div>
  );
}

/* ── Trades Table (extracted for size limits) ── */
function TradesTable({ trades, isMobile, sortField, sortDir, onSort, pnlColor, outcomeColor, onEdit, onDelete, onSelect }: {
  trades: Trade[];
  isMobile: boolean;
  sortField: SortField;
  sortDir: SortDir;
  onSort: (f: SortField) => void;
  pnlColor: (pnl: number | null) => string;
  outcomeColor: (o: string) => string;
  onEdit: (t: Trade) => void;
  onDelete: (id: string) => void;
  onSelect: (t: Trade) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (isMobile) {
    return (
      <table className="w-full text-[13px] font-mono">
        <thead>
          <tr className="text-gray-500 border-b border-gray-800">
            <th className="text-left py-1.5 px-2 font-normal">SYM</th>
            <th className="text-center py-1.5 px-2 font-normal">DIR</th>
            <th className="text-right py-1.5 px-2 font-normal">P&L</th>
            <th className="text-center py-1.5 px-2 font-normal">OUT</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((t) => (
            <>
              <tr
                key={t.id}
                className="border-b border-gray-800/50 hover:bg-white/[0.03] transition-colors cursor-pointer"
                onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
              >
                <td className="py-2.5 px-2 text-gray-200 font-medium">{t.symbol}</td>
                <td className="text-center py-2.5 px-2">
                  <span style={{ color: t.direction === 'Long' ? '#4ec9b0' : '#f44747' }}>
                    {t.direction === 'Long' ? 'LNG' : 'SHT'}
                  </span>
                </td>
                <td className="text-right py-2.5 px-2 font-medium" style={{ color: pnlColor(t.pnl) }}>
                  {t.pnl !== null ? formatCurrency(t.pnl) : '—'}
                </td>
                <td className="text-center py-2.5 px-2">
                  <span style={{ color: outcomeColor(t.outcome) }}>
                    {t.outcome === 'Breakeven' ? 'BE' : t.outcome.toUpperCase()}
                  </span>
                </td>
              </tr>
              {expandedId === t.id && (
                <tr key={`${t.id}-exp`} className="border-b border-gray-800/50">
                  <td colSpan={4} className="py-2 px-3 text-[12px]" style={{ background: '#0a0a0a' }}>
                    <div className="grid grid-cols-2 gap-1 text-gray-400 mb-2">
                      <span>STRAT: <span className="text-gray-300">{t.strategy_name}</span></span>
                      <span>QTY: <span className="text-gray-300">{t.quantity}</span></span>
                      <span>ENTRY: <span className="text-gray-300">{formatCurrency(t.entry_price)}</span></span>
                      <span>EXIT: <span className="text-gray-300">{t.exit_price !== null ? formatCurrency(t.exit_price) : '—'}</span></span>
                    </div>
                    <div className="flex gap-4">
                      <button onClick={(e) => { e.stopPropagation(); onSelect(t); }} className="text-gray-500 hover:text-blue-400">VIEW</button>
                      <button onClick={(e) => { e.stopPropagation(); onEdit(t); }} className="text-gray-500 hover:text-blue-400">EDIT</button>
                      <button onClick={(e) => { e.stopPropagation(); onDelete(t.id); }} className="text-gray-500 hover:text-red-400">DEL</button>
                    </div>
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
    );
  }

  return (
    <table className="w-full text-[13px] font-mono">
      <thead>
        <tr className="text-gray-500 border-b border-gray-800">
          <SortableHeader label="SYM" field="symbol" sortField={sortField} sortDir={sortDir} onSort={onSort} />
          <th className="text-left py-1.5 px-2 font-normal">STRAT</th>
          <th className="text-center py-1.5 px-2 font-normal">DIR</th>
          <th className="text-right py-1.5 px-2 font-normal">ENTRY</th>
          <th className="text-right py-1.5 px-2 font-normal">EXIT</th>
          <SortableHeader label="QTY" field="quantity" sortField={sortField} sortDir={sortDir} onSort={onSort} />
          <SortableHeader label="P&L" field="pnl" sortField={sortField} sortDir={sortDir} onSort={onSort} />
          <th className="text-center py-1.5 px-2 font-normal">OUT</th>
          <SortableHeader label="DATE" field="entry_date" sortField={sortField} sortDir={sortDir} onSort={onSort} />
          <th className="text-right py-1.5 px-2 font-normal">ACT</th>
        </tr>
      </thead>
      <tbody>
        {trades.map((t) => (
          <tr
            key={t.id}
            className="border-b border-gray-800/50 hover:bg-white/[0.03] transition-colors cursor-pointer"
            onClick={() => onSelect(t)}
          >
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
            <td className="text-right py-2.5 px-2 text-gray-500 text-[11px]">
              {new Date(t.entry_date).toLocaleDateString()}
            </td>
            <td className="text-right py-2.5 px-2">
              <div className="flex items-center justify-end gap-3">
                <button onClick={(e) => { e.stopPropagation(); onEdit(t); }} className="text-gray-500 hover:text-blue-400 transition-colors">EDIT</button>
                <button onClick={(e) => { e.stopPropagation(); onDelete(t.id); }} className="text-gray-500 hover:text-red-400 transition-colors">DEL</button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ── Performance Panel (T-008 advanced analytics) ── */
import { computeAnalytics } from '@/lib/analytics';

function PerformancePanel({ trades, activeStrategies }: { trades: Trade[]; activeStrategies: (Strategy & { rules: Rule[] })[] }) {
  const stats = computeAnalytics(trades);

  return (
    <div className="p-4 font-mono text-[13px] grid grid-cols-2 gap-x-8 gap-y-2.5">
      <Stat label="TOTAL TRADES" value={String(stats.totalTrades)} color="#e0e0e0" />
      <Stat label="OPEN POSITIONS" value={String(stats.openTrades)} color="#569cd6" />
      <Stat label="WIN RATE" value={`${stats.winRate}%`} color="#dcdcaa" />
      <Stat label="WINS / LOSSES" value="" color="">
        <span>
          <span style={{ color: '#4ec9b0' }}>{stats.wins}</span>
          <span className="text-gray-600"> / </span>
          <span style={{ color: '#f44747' }}>{stats.losses}</span>
        </span>
      </Stat>
      <Stat label="TOTAL P&L" value={formatCurrency(stats.totalPnl)} color={stats.totalPnl >= 0 ? '#4ec9b0' : '#f44747'} />
      <Stat label="AVG P&L" value={stats.closedTrades > 0 ? formatCurrency(stats.avgPnl) : '—'} color={stats.avgPnl >= 0 ? '#4ec9b0' : '#f44747'} />
      <Stat label="PROFIT FACTOR" value={stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2)} color="#dcdcaa" />
      <Stat label="EXPECTANCY" value={formatCurrency(stats.expectancy)} color={stats.expectancy >= 0 ? '#4ec9b0' : '#f44747'} />
      <Stat label="SHARPE RATIO" value={stats.sharpeRatio !== null ? stats.sharpeRatio.toFixed(2) : '—'} color="#dcdcaa" />
      <Stat label="MAX DRAWDOWN" value={stats.maxDrawdown !== 0 ? `${formatCurrency(stats.maxDrawdown)} (${stats.maxDrawdownPct.toFixed(1)}%)` : '—'} color="#f44747" />
      <Stat label="BEST TRADE" value={stats.bestTrade !== null ? formatCurrency(stats.bestTrade) : '—'} color="#4ec9b0" />
      <Stat label="WORST TRADE" value={stats.worstTrade !== null ? formatCurrency(stats.worstTrade) : '—'} color="#f44747" />
      <Stat label="WIN STREAK" value={String(stats.longestWinStreak)} color="#4ec9b0" />
      <Stat label="LOSS STREAK" value={String(stats.longestLossStreak)} color="#f44747" />
      <Stat label="ACTIVE STRATEGIES" value={String(activeStrategies.length)} color="#ff8c00" />
      <Stat label="CLOSED TRADES" value={String(stats.closedTrades)} color="#e0e0e0" />
    </div>
  );
}

function Stat({ label, value, color, children }: { label: string; value: string; color: string; children?: React.ReactNode }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      {children ?? <span style={{ color }}>{value}</span>}
    </div>
  );
}

/* ── Trade Detail Slide-out Panel (T-009) ── */
import TradeDetailPanel from '@/components/trade-detail';

/* ── CSV Import/Export Buttons (T-011) ── */
import CsvButtons from '@/components/csv-import';
