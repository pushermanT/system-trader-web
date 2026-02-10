'use client';

import { Strategy, Rule, Trade, TradeAutopsy } from '@/lib/types';
import { TradeInput, RiskSettings } from '@/lib/data/types';
import StrategyForm from '@/components/strategy-form';
import TradeForm from '@/components/trade-form';
import RiskSettingsForm from '@/components/risk-settings';
import TradeDetailPanel from '@/components/trade-detail';
import EmotionalCheck from '@/components/emotional-check';
import AutopsyModal from '@/components/autopsy-modal';

interface DashboardModalsProps {
  isMobile: boolean;
  strategies: (Strategy & { rules: Rule[] })[];
  riskSettings: RiskSettings;
  lossStreak: number;

  showStrategyForm: boolean;
  editingStrategy: (Strategy & { rules: Rule[] }) | null;
  onSaveStrategy: (data: { name: string; description: string; rules: string[]; max_loss_threshold?: number | null }) => Promise<void>;
  onCloseStrategyForm: () => void;

  showTradeForm: boolean;
  editingTrade: Trade | null;
  preEntryEmotion: string | null;
  onSaveTrade: (data: TradeInput) => Promise<void>;
  onCloseTradeForm: () => void;

  showRiskSettings: boolean;
  onSaveRiskSettings: (settings: RiskSettings) => Promise<void>;
  onCloseRiskSettings: () => void;

  selectedTrade: Trade | null;
  onCloseTradeDetail: () => void;

  showEmotionalCheck: boolean;
  onEmotionalConfirm: (emotion: string) => void;
  onEmotionalCancel: () => void;

  autopsyTrade: { id: string; symbol: string; pnl: number } | null;
  onAutopsySubmit: (autopsy: TradeAutopsy) => Promise<void>;
  onAutopsySkip: () => void;
}

export default function DashboardModals(props: DashboardModalsProps) {
  const activeStrategies = props.strategies.filter((s) => s.is_active);

  return (
    <>
      {props.showStrategyForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="w-full max-w-md border bg-gray-950 p-5" style={{ borderColor: '#ff8c00' }}>
            <h3 className="mb-4 text-sm font-mono font-bold uppercase tracking-wider" style={{ color: '#ff8c00' }}>
              {props.editingStrategy ? '// EDIT STRATEGY' : '// NEW STRATEGY'}
            </h3>
            <StrategyForm strategy={props.editingStrategy ?? undefined} onSave={props.onSaveStrategy}
              onCancel={props.onCloseStrategyForm} />
          </div>
        </div>
      )}

      {props.showTradeForm && (
        <div className={`fixed inset-0 z-50 bg-black/70 ${props.isMobile ? 'flex items-end' : 'flex items-center justify-center overflow-y-auto py-8'}`}>
          <div className={`w-full border bg-gray-950 p-5 ${props.isMobile ? 'rounded-t-lg max-h-[90vh] overflow-y-auto' : 'max-w-lg'}`} style={{ borderColor: '#569cd6' }}>
            <h3 className="mb-4 text-sm font-mono font-bold uppercase tracking-wider" style={{ color: '#569cd6' }}>
              {props.editingTrade ? '// EDIT TRADE' : '// NEW TRADE'}
            </h3>
            <TradeForm trade={props.editingTrade ?? undefined} strategies={activeStrategies}
              preEntryEmotion={props.preEntryEmotion} riskSettings={props.riskSettings}
              onSave={props.onSaveTrade} onCancel={props.onCloseTradeForm} />
          </div>
        </div>
      )}

      {props.showRiskSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="w-full max-w-md border bg-gray-950 p-5" style={{ borderColor: '#f44747' }}>
            <h3 className="mb-4 text-sm font-mono font-bold uppercase tracking-wider" style={{ color: '#f44747' }}>
              // RISK LIMITS
            </h3>
            <RiskSettingsForm settings={props.riskSettings} onSave={props.onSaveRiskSettings}
              onCancel={props.onCloseRiskSettings} />
          </div>
        </div>
      )}

      {props.selectedTrade && <TradeDetailPanel trade={props.selectedTrade} onClose={props.onCloseTradeDetail} />}

      {props.showEmotionalCheck && (
        <EmotionalCheck lossStreak={props.lossStreak}
          onConfirm={props.onEmotionalConfirm}
          onCancel={props.onEmotionalCancel} />
      )}

      {props.autopsyTrade && (
        <AutopsyModal symbol={props.autopsyTrade.symbol} pnl={props.autopsyTrade.pnl}
          onSubmit={props.onAutopsySubmit} onSkip={props.onAutopsySkip} />
      )}
    </>
  );
}
