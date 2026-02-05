'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Strategy, Rule, Trade, TradeRuleCompliance, TradeAutopsy } from '@/lib/types';
import { TradeInput } from '@/lib/data/types';
import { formatCurrency } from '@/lib/utils';
import { buildCumulativePnlSeries } from '@/lib/chart-utils';
import { useData } from '@/lib/data/data-context';
import StrategyForm from '@/components/strategy-form';
import TradeForm from '@/components/trade-form';
import TerminalPanel from '@/components/terminal-panel';
import PnlChart from '@/components/pnl-chart';
import OpenPositions from '@/components/open-positions';
import AutopsyModal from '@/components/autopsy-modal';
import TradeDetailPanel from '@/components/trade-detail';
import CsvButtons from '@/components/csv-import';
import TradesTable from '@/components/trades-table';
import PerformancePanel from '@/components/performance-panel';
import StrategiesPanel from '@/components/strategies-panel';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { useEscapeKey } from '@/hooks/use-escape-key';
import {
  TradeFilterBar, applyFilters, applySort,
  TradeFilters, SortField, SortDir,
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
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-full font-mono text-xs text-gray-600 tracking-wider">
        LOADING TERMINAL...
      </div>
    }>
      <DashboardInner />
    </Suspense>
  );
}

function DashboardInner() {
  const isMobile = useIsMobile();
  const { repo } = useData();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [strategies, setStrategies] = useState<(Strategy & { rules: Rule[] })[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [compliance, setCompliance] = useState<TradeRuleCompliance[]>([]);
  const [loading, setLoading] = useState(true);

  const [showStrategyForm, setShowStrategyForm] = useState(false);
  const [editingStrategy, setEditingStrategy] = useState<(Strategy & { rules: Rule[] }) | null>(null);
  const [showTradeForm, setShowTradeForm] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [autopsyTrade, setAutopsyTrade] = useState<{ id: string; symbol: string; pnl: number } | null>(null);
  const [focusedPanel, setFocusedPanel] = useState<string>('strategies');
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<TradeFilters>(() => filtersFromParams(searchParams));
  const [sortField, setSortField] = useState<SortField>('entry_date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const handleFilterChange = useCallback((f: TradeFilters) => {
    setFilters(f);
    const qs = filtersToParams(f);
    router.replace(qs ? `?${qs}` : '/dashboard', { scroll: false });
  }, [router]);

  function handleSort(field: SortField) {
    setSortDir(sortField === field ? (sortDir === 'asc' ? 'desc' : 'asc') : 'desc');
    setSortField(field);
  }

  const closeAllModals = useCallback(() => {
    if (autopsyTrade) { setAutopsyTrade(null); return; }
    if (selectedTrade) { setSelectedTrade(null); return; }
    if (showTradeForm) { setShowTradeForm(false); setEditingTrade(null); return; }
    if (showStrategyForm) { setShowStrategyForm(false); setEditingStrategy(null); }
  }, [autopsyTrade, selectedTrade, showTradeForm, showStrategyForm]);

  useEscapeKey(closeAllModals, showStrategyForm || showTradeForm || !!selectedTrade || !!autopsyTrade);

  async function loadData() {
    try {
      const [strats, twc] = await Promise.all([repo.getStrategies(), repo.getTradesWithCompliance()]);
      setStrategies(strats);
      setTrades(twc.trades.sort((a, b) => new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime()));
      setCompliance(twc.compliance);
      setError(null);
    } catch (err) {
      setError('Failed to load data. Please refresh.');
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  async function handleSaveStrategy(data: { name: string; description: string; rules: string[] }) {
    if (editingStrategy) await repo.updateStrategy(editingStrategy.id, data);
    else await repo.createStrategy(data);
    setShowStrategyForm(false);
    setEditingStrategy(null);
    loadData();
  }

  async function handleDeleteStrategy(id: string) {
    if (!confirm('Delete this strategy?')) return;
    await repo.deleteStrategy(id);
    loadData();
  }

  async function handleSaveTrade(data: TradeInput) {
    let tradeId = editingTrade?.id;
    if (editingTrade) await repo.updateTrade(editingTrade.id, data);
    else { const created = await repo.createTrade(data); tradeId = created?.id; }
    setShowTradeForm(false);
    setEditingTrade(null);
    await loadData();
    if (data.outcome === 'Loss' && data.pnl !== null && tradeId) {
      const threshold = strategies.find((s) => s.id === data.strategy_id)?.max_loss_threshold ?? 500;
      if (Math.abs(data.pnl) > threshold) setAutopsyTrade({ id: tradeId, symbol: data.symbol, pnl: data.pnl });
    }
  }

  async function handleAutopsySubmit(autopsy: TradeAutopsy) {
    if (!autopsyTrade) return;
    const trade = trades.find((t) => t.id === autopsyTrade.id);
    if (!trade) { setAutopsyTrade(null); return; }
    await repo.updateTrade(trade.id, {
      strategy_id: trade.strategy_id, strategy_name: trade.strategy_name,
      symbol: trade.symbol, direction: trade.direction,
      entry_price: trade.entry_price, exit_price: trade.exit_price,
      stop_loss_price: trade.stop_loss_price, max_loss: trade.max_loss,
      quantity: trade.quantity, outcome: trade.outcome, pnl: trade.pnl,
      notes: trade.notes, autopsy: JSON.stringify(autopsy),
      entry_date: trade.entry_date, exit_date: trade.exit_date, compliance: [],
    });
    setAutopsyTrade(null);
    loadData();
  }

  async function handleDeleteTrade(id: string) {
    if (!confirm('Delete this trade?')) return;
    await repo.deleteTrade(id);
    loadData();
  }

  const activeStrategies = strategies.filter((s) => s.is_active);
  const openTrades = trades.filter((t) => t.outcome === 'Open').length;
  const closedTrades = trades.filter((t) => t.outcome !== 'Open');
  const wins = closedTrades.filter((t) => t.outcome === 'Win').length;
  const winRate = closedTrades.length > 0 ? ((wins / closedTrades.length) * 100).toFixed(1) : '—';
  const totalPnl = trades.reduce((s, t) => s + (t.pnl ?? 0), 0);
  const complianceRate = compliance.length > 0
    ? ((compliance.filter((c) => c.followed).length / compliance.length) * 100).toFixed(0) : null;
  const filteredTrades = applySort(applyFilters(trades, filters), sortField, sortDir);
  const strategyNames = [...new Set(trades.map((t) => t.strategy_name))].filter(Boolean);

  return (
    <div className="relative w-full h-full" style={{ minHeight: 'calc(100vh - 48px)' }}>
      {/* Status bar */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-1.5 font-mono text-[13px] border-b" style={{ background: '#0a0a0a', borderColor: '#222', color: '#888' }}>
        <span style={{ color: '#ff8c00' }}>SYSTEM TRADER</span>
        {complianceRate !== null && (
          <span className="text-[14px] font-bold" style={{ color: Number(complianceRate) >= 80 ? '#4ec9b0' : Number(complianceRate) >= 50 ? '#dcdcaa' : '#f44747' }}>
            {complianceRate}% COMPLIANT
          </span>
        )}
        <span>P&L: <span style={{ color: totalPnl >= 0 ? '#4ec9b0' : '#f44747' }}>{formatCurrency(totalPnl)}</span></span>
        {!isMobile && <>
          <span>W/R: <span style={{ color: '#dcdcaa' }}>{winRate}%</span></span>
          <span>OPEN: <span style={{ color: '#569cd6' }}>{openTrades}</span></span>
          <span>TRADES: <span style={{ color: '#4ec9b0' }}>{trades.length}</span></span>
          <span style={{ color: '#555' }}>{new Date().toLocaleDateString()}</span>
        </>}
      </div>

      {error && (
        <div className="px-4 py-2 font-mono text-xs" style={{ background: '#2a0a0a', borderBottom: '1px solid #f44747', color: '#f44747' }}>
          ⚠ {error}
        </div>
      )}

      {/* Terminal panels */}
      <div className={isMobile ? 'p-3' : 'relative'} style={isMobile ? undefined : { height: 'calc(100vh - 80px)' }}>
        <StrategiesPanel strategies={strategies} activeStrategies={activeStrategies} loading={loading} focusedPanel={focusedPanel} isMobile={isMobile} onFocus={() => setFocusedPanel('strategies')} onNew={() => { setEditingStrategy(null); setShowStrategyForm(true); }} onEdit={(s) => { setEditingStrategy(s); setShowStrategyForm(true); }} onToggle={(id, active) => repo.toggleStrategyActive(id, active).then(() => loadData())} onDelete={handleDeleteStrategy} />

        <TerminalPanel title="TRADES" defaultPosition={{ x: 620, y: 16 }} defaultSize={{ width: 740, height: 480 }} accentColor="#569cd6" zIndex={focusedPanel === 'trades' ? 10 : 1} onFocus={() => setFocusedPanel('trades')} isMobile={isMobile}>
          <div className="p-2">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-xs text-gray-500 font-mono uppercase tracking-wider">
                {filteredTrades.length}{filteredTrades.length !== trades.length ? `/${trades.length}` : ''} total &middot; {openTrades} open
              </span>
              <div className="flex items-center gap-2">
                <CsvButtons trades={trades} onImport={(t) => repo.bulkCreateTrades(t).then(() => loadData())} strategies={activeStrategies} />
                <button onClick={() => { setEditingTrade(null); setShowTradeForm(true); }} className="font-mono text-xs px-3 py-1 text-black font-bold uppercase tracking-wider" style={{ background: '#569cd6' }}>+ NEW</button>
              </div>
            </div>
            <TradeFilterBar filters={filters} onChange={handleFilterChange} sortField={sortField} sortDir={sortDir} strategyNames={strategyNames} />
            {loading ? <p className="text-gray-600 text-xs font-mono px-1 py-4">Loading...</p>
              : filteredTrades.length === 0 ? <p className="text-gray-600 text-xs font-mono px-1 py-4">{trades.length === 0 ? 'No trades. Click + NEW to log one.' : 'No trades match filters.'}</p>
              : <TradesTable trades={filteredTrades} isMobile={isMobile} sortField={sortField} sortDir={sortDir} onSort={handleSort} onEdit={(t) => { setEditingTrade(t); setShowTradeForm(true); }} onDelete={handleDeleteTrade} onSelect={setSelectedTrade} />}
          </div>
        </TerminalPanel>

        <TerminalPanel title="OPEN RISK" defaultPosition={{ x: 16, y: 530 }} defaultSize={{ width: 580, height: 240 }} accentColor="#f44747" zIndex={focusedPanel === 'open-risk' ? 10 : 1} onFocus={() => setFocusedPanel('open-risk')} isMobile={isMobile}>
          <OpenPositions trades={trades} strategies={strategies} />
        </TerminalPanel>

        <TerminalPanel title="PERFORMANCE" defaultPosition={{ x: 620, y: 530 }} defaultSize={{ width: 740, height: 240 }} accentColor="#4ec9b0" zIndex={focusedPanel === 'perf' ? 10 : 1} onFocus={() => setFocusedPanel('perf')} isMobile={isMobile}>
          <PerformancePanel trades={trades} activeStrategies={activeStrategies} compliance={compliance} />
        </TerminalPanel>

        <TerminalPanel title="CUMULATIVE P&L" defaultPosition={{ x: 16, y: 800 }} defaultSize={{ width: 1340, height: 240 }} accentColor="#4ec9b0" zIndex={focusedPanel === 'pnl-chart' ? 10 : 1} onFocus={() => setFocusedPanel('pnl-chart')} isMobile={isMobile}>
          <PnlChart data={buildCumulativePnlSeries(trades)} />
        </TerminalPanel>
      </div>

      {/* Strategy Modal */}
      {showStrategyForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => { setShowStrategyForm(false); setEditingStrategy(null); }}>
          <div className="w-full max-w-md border bg-gray-950 p-5" style={{ borderColor: '#ff8c00' }} onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-4 text-sm font-mono font-bold uppercase tracking-wider" style={{ color: '#ff8c00' }}>
              {editingStrategy ? '// EDIT STRATEGY' : '// NEW STRATEGY'}
            </h3>
            <StrategyForm strategy={editingStrategy ?? undefined} onSave={handleSaveStrategy} onCancel={() => { setShowStrategyForm(false); setEditingStrategy(null); }} />
          </div>
        </div>
      )}

      {/* Trade Modal */}
      {showTradeForm && (
        <div className={`fixed inset-0 z-50 bg-black/70 ${isMobile ? 'flex items-end' : 'flex items-center justify-center overflow-y-auto py-8'}`} onClick={() => { setShowTradeForm(false); setEditingTrade(null); }}>
          <div className={`w-full border bg-gray-950 p-5 ${isMobile ? 'rounded-t-lg max-h-[90vh] overflow-y-auto' : 'max-w-lg'}`} style={{ borderColor: '#569cd6' }} onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-4 text-sm font-mono font-bold uppercase tracking-wider" style={{ color: '#569cd6' }}>
              {editingTrade ? '// EDIT TRADE' : '// NEW TRADE'}
            </h3>
            <TradeForm trade={editingTrade ?? undefined} strategies={activeStrategies} onSave={handleSaveTrade} onCancel={() => { setShowTradeForm(false); setEditingTrade(null); }} />
          </div>
        </div>
      )}

      {selectedTrade && <TradeDetailPanel trade={selectedTrade} onClose={() => setSelectedTrade(null)} />}
      {autopsyTrade && <AutopsyModal symbol={autopsyTrade.symbol} pnl={autopsyTrade.pnl} onSubmit={handleAutopsySubmit} onSkip={() => setAutopsyTrade(null)} />}
    </div>
  );
}
