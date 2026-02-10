'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Strategy, Rule, Trade, TradeRuleCompliance, TradeAutopsy } from '@/lib/types';
import { TradeInput, RiskSettings } from '@/lib/data/types';
import { buildCumulativePnlSeries } from '@/lib/chart-utils';
import { checkCircuitBreaker } from '@/lib/risk';
import { useData } from '@/lib/data/data-context';
import TerminalPanel from '@/components/terminal-panel';
import PnlChart from '@/components/pnl-chart';
import OpenPositions from '@/components/open-positions';
import TradesTable from '@/components/trades-table';
import PerformancePanel from '@/components/performance-panel';
import StrategiesTable from '@/components/strategies-table';
import StatusBar from '@/components/status-bar';
import DashboardModals from '@/components/dashboard-modals';
import CsvButtons from '@/components/csv-import';
import HyperliquidImport from '@/components/hyperliquid-import';
import CircuitBreakerBar from '@/components/circuit-breaker-bar';
import LossStreakWarning from '@/components/loss-streak-warning';
import { currentLossStreak } from '@/lib/streak';
import { useIsMobile } from '@/hooks/use-is-mobile';
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

export default function DashboardPage() {
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
  const [riskSettings, setRiskSettings] = useState<RiskSettings>({ daily_loss_limit: null, weekly_loss_limit: null, portfolio_value: null, max_risk_per_trade_pct: null, max_symbol_concentration_pct: null, nickname: null });
  const [showRiskSettings, setShowRiskSettings] = useState(false);
  const [showEmotionalCheck, setShowEmotionalCheck] = useState(false);
  const [preEntryEmotion, setPreEntryEmotion] = useState<string | null>(null);

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
    const [strats, twc, rs] = await Promise.all([
      repo.getStrategies(),
      repo.getTradesWithCompliance(),
      repo.getRiskSettings(),
    ]);
    setStrategies(strats);
    setTrades(twc.trades.sort((a, b) => new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime()));
    setCompliance(twc.compliance);
    setRiskSettings(rs);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  async function handleSaveStrategy(data: { name: string; description: string; rules: string[]; max_loss_threshold?: number | null }) {
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
    let tradeId = editingTrade?.id;
    if (editingTrade) {
      await repo.updateTrade(editingTrade.id, data);
    } else {
      const created = await repo.createTrade(data);
      tradeId = created?.id;
    }
    setShowTradeForm(false);
    setEditingTrade(null);
    await loadData();

    if (data.outcome === 'Loss' && data.pnl !== null && tradeId) {
      const strategy = strategies.find((s) => s.id === data.strategy_id);
      const threshold = strategy?.max_loss_threshold ?? 500;
      if (Math.abs(data.pnl) > threshold) {
        setAutopsyTrade({ id: tradeId, symbol: data.symbol, pnl: data.pnl });
      }
    }
  }

  async function handleAutopsySubmit(autopsy: TradeAutopsy) {
    if (!autopsyTrade) return;
    const trade = trades.find((t) => t.id === autopsyTrade.id);
    if (!trade) { setAutopsyTrade(null); return; }
    const tc = compliance.filter((c) => c.trade_id === autopsyTrade.id)
      .map((c) => ({ rule_id: c.rule_id, rule_text: c.rule_text, followed: c.followed }));
    const { id, created_at, updated_at, ...rest } = trade;
    await repo.updateTrade(id, { ...rest, autopsy: JSON.stringify(autopsy), pre_entry_emotion: rest.pre_entry_emotion ?? null, compliance: tc });
    setAutopsyTrade(null);
    loadData();
  }

  async function handleDeleteTrade(id: string) {
    if (!confirm('Delete this trade?')) return;
    await repo.deleteTrade(id);
    loadData();
  }

  async function handleImportTrades(newTrades: TradeInput[]) {
    await repo.bulkCreateTrades(newTrades);
    loadData();
  }

  async function handleSaveRiskSettings(settings: RiskSettings) {
    await repo.saveRiskSettings(settings);
    setRiskSettings(settings);
    setShowRiskSettings(false);
  }

  const activeStrategies = strategies.filter((s) => s.is_active);
  const cbStatus = checkCircuitBreaker(trades, riskSettings.daily_loss_limit, riskSettings.weekly_loss_limit);
  const lossStreak = currentLossStreak(trades);
  const openTradeCount = trades.filter((t) => t.outcome === 'Open').length;
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
      <StatusBar complianceRate={complianceRate} totalPnl={totalPnl} winRate={winRate}
        openTrades={openTradeCount} totalTrades={trades.length} isMobile={isMobile}
        onShowRiskSettings={() => setShowRiskSettings(true)} />
      <CircuitBreakerBar status={cbStatus} dailyLimit={riskSettings.daily_loss_limit} weeklyLimit={riskSettings.weekly_loss_limit} />
      <LossStreakWarning streak={lossStreak} />

      <div className={isMobile ? 'p-3' : 'relative'} style={isMobile ? undefined : { height: 'calc(100vh - 80px)' }}>
        <TerminalPanel title="STRATEGIES" defaultPosition={{ x: 16, y: 16 }} defaultSize={{ width: 580, height: 480 }}
          accentColor="#ff8c00" zIndex={focusedPanel === 'strategies' ? 10 : 1} onFocus={() => setFocusedPanel('strategies')} isMobile={isMobile}>
          <StrategiesTable strategies={strategies} loading={loading}
            onNew={() => { setEditingStrategy(null); setShowStrategyForm(true); }}
            onEdit={(s) => { setEditingStrategy(s); setShowStrategyForm(true); }}
            onToggleActive={handleToggleActive} onDelete={handleDeleteStrategy} />
        </TerminalPanel>

        <TerminalPanel title="TRADES" defaultPosition={{ x: 620, y: 16 }} defaultSize={{ width: 740, height: 480 }}
          accentColor="#569cd6" zIndex={focusedPanel === 'trades' ? 10 : 1} onFocus={() => setFocusedPanel('trades')} isMobile={isMobile}>
          <div className="p-2">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-sm text-gray-500 font-mono uppercase tracking-wider">
                {filteredTrades.length}{filteredTrades.length !== trades.length ? `/${trades.length}` : ''} total &middot; {openTradeCount} open
              </span>
              <div className="flex items-center gap-2">
                <CsvButtons trades={trades} onImport={handleImportTrades} strategies={activeStrategies} />
                <HyperliquidImport onImport={handleImportTrades} />
                <button onClick={() => { if (!cbStatus.tripped) { setEditingTrade(null); setPreEntryEmotion(null); setShowEmotionalCheck(true); } }}
                  disabled={cbStatus.tripped}
                  className="font-mono text-sm px-3 py-1 text-black font-bold uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: cbStatus.tripped ? '#555' : '#569cd6' }}
                  title={cbStatus.tripped ? 'Circuit breaker active — trading halted' : undefined}>
                  {cbStatus.tripped ? 'HALTED' : '+ NEW'}
                </button>
              </div>
            </div>
            <TradeFilterBar filters={filters} onChange={handleFilterChange} sortField={sortField} sortDir={sortDir} strategyNames={strategyNames} />
            {loading ? (
              <p className="text-gray-600 text-sm font-mono px-1 py-4">Loading...</p>
            ) : filteredTrades.length === 0 ? (
              <p className="text-gray-600 text-sm font-mono px-1 py-4">
                {trades.length === 0 ? 'No trades. Click + NEW to log one.' : 'No trades match filters.'}
              </p>
            ) : (
              <TradesTable trades={filteredTrades} isMobile={isMobile} sortField={sortField} sortDir={sortDir} onSort={handleSort}
                pnlColor={pnlColor} outcomeColor={outcomeColor}
                onEdit={(t) => { setEditingTrade(t); setShowTradeForm(true); }} onDelete={handleDeleteTrade} onSelect={setSelectedTrade} />
            )}
          </div>
        </TerminalPanel>

        <TerminalPanel title="OPEN RISK" defaultPosition={{ x: 16, y: 530 }} defaultSize={{ width: 580, height: 240 }}
          accentColor="#f44747" zIndex={focusedPanel === 'open-risk' ? 10 : 1} onFocus={() => setFocusedPanel('open-risk')} isMobile={isMobile}>
          <OpenPositions trades={trades} strategies={strategies} riskSettings={riskSettings} />
        </TerminalPanel>

        <TerminalPanel title="PERFORMANCE" defaultPosition={{ x: 620, y: 530 }} defaultSize={{ width: 740, height: 240 }}
          accentColor="#4ec9b0" zIndex={focusedPanel === 'perf' ? 10 : 1} onFocus={() => setFocusedPanel('perf')} isMobile={isMobile}>
          <PerformancePanel trades={trades} activeStrategies={activeStrategies} compliance={compliance} />
        </TerminalPanel>

        <TerminalPanel title="CUMULATIVE P&L" defaultPosition={{ x: 16, y: 800 }} defaultSize={{ width: 1340, height: 240 }}
          accentColor="#4ec9b0" zIndex={focusedPanel === 'pnl-chart' ? 10 : 1} onFocus={() => setFocusedPanel('pnl-chart')} isMobile={isMobile}>
          <PnlChart data={buildCumulativePnlSeries(trades)} />
        </TerminalPanel>
      </div>

      <DashboardModals isMobile={isMobile} strategies={strategies} riskSettings={riskSettings} lossStreak={lossStreak}
        showStrategyForm={showStrategyForm} editingStrategy={editingStrategy}
        onSaveStrategy={handleSaveStrategy} onCloseStrategyForm={() => { setShowStrategyForm(false); setEditingStrategy(null); }}
        showTradeForm={showTradeForm} editingTrade={editingTrade} preEntryEmotion={preEntryEmotion}
        onSaveTrade={handleSaveTrade} onCloseTradeForm={() => { setShowTradeForm(false); setEditingTrade(null); }}
        showRiskSettings={showRiskSettings} onSaveRiskSettings={handleSaveRiskSettings} onCloseRiskSettings={() => setShowRiskSettings(false)}
        selectedTrade={selectedTrade} onCloseTradeDetail={() => setSelectedTrade(null)}
        showEmotionalCheck={showEmotionalCheck}
        onEmotionalConfirm={(emotion) => { setPreEntryEmotion(emotion); setShowEmotionalCheck(false); setShowTradeForm(true); }}
        onEmotionalCancel={() => setShowEmotionalCheck(false)}
        autopsyTrade={autopsyTrade} onAutopsySubmit={handleAutopsySubmit} onAutopsySkip={() => setAutopsyTrade(null)} />
    </div>
  );
}
