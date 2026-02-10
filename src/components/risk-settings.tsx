'use client';

import { useState } from 'react';
import { RiskSettings } from '@/lib/data/types';

interface RiskSettingsFormProps {
  settings: RiskSettings;
  onSave: (settings: RiskSettings) => Promise<void>;
  onCancel: () => void;
}

export default function RiskSettingsForm({ settings, onSave, onCancel }: RiskSettingsFormProps) {
  const [dailyLimit, setDailyLimit] = useState(settings.daily_loss_limit?.toString() ?? '');
  const [weeklyLimit, setWeeklyLimit] = useState(settings.weekly_loss_limit?.toString() ?? '');
  const [portfolioValue, setPortfolioValue] = useState(settings.portfolio_value?.toString() ?? '');
  const [maxRiskPct, setMaxRiskPct] = useState(settings.max_risk_per_trade_pct?.toString() ?? '');
  const [maxConcentrationPct, setMaxConcentrationPct] = useState(settings.max_symbol_concentration_pct?.toString() ?? '');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await onSave({
      daily_loss_limit: dailyLimit ? parseFloat(dailyLimit) : null,
      weekly_loss_limit: weeklyLimit ? parseFloat(weeklyLimit) : null,
      portfolio_value: portfolioValue ? parseFloat(portfolioValue) : null,
      max_risk_per_trade_pct: maxRiskPct ? parseFloat(maxRiskPct) : null,
      max_symbol_concentration_pct: maxConcentrationPct ? parseFloat(maxConcentrationPct) : null,
      nickname: settings.nickname,
    });
    setSaving(false);
  }

  const inputClass = "mt-1 block w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-gray-500 font-mono">
        Configure circuit breakers and position sizing guards.
      </p>

      <div className="text-[13px] font-mono text-gray-600 uppercase tracking-wider pt-1">Circuit Breakers</div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-300">Daily Loss Limit ($)</label>
          <input type="number" step="any" min="0" value={dailyLimit}
            onChange={(e) => setDailyLimit(e.target.value)} placeholder="e.g. 500" className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300">Weekly Loss Limit ($)</label>
          <input type="number" step="any" min="0" value={weeklyLimit}
            onChange={(e) => setWeeklyLimit(e.target.value)} placeholder="e.g. 2000" className={inputClass} />
        </div>
      </div>

      <div className="text-[13px] font-mono text-gray-600 uppercase tracking-wider pt-1">Position Sizing</div>
      <div>
        <label className="block text-sm font-medium text-gray-300">
          Portfolio Value ($)
          <span className="text-gray-600 font-normal"> — your total trading capital</span>
        </label>
        <input type="number" step="any" min="0" value={portfolioValue}
          onChange={(e) => setPortfolioValue(e.target.value)} placeholder="e.g. 100000" className={inputClass} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-300">Max Risk/Trade (%)</label>
          <input type="number" step="0.1" min="0" max="100" value={maxRiskPct}
            onChange={(e) => setMaxRiskPct(e.target.value)} placeholder="e.g. 2" className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300">Max Concentration (%)</label>
          <input type="number" step="0.1" min="0" max="100" value={maxConcentrationPct}
            onChange={(e) => setMaxConcentrationPct(e.target.value)} placeholder="e.g. 25" className={inputClass} />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="rounded-md px-4 py-2 text-sm text-gray-400 hover:text-white">
          Cancel
        </button>
        <button type="submit" disabled={saving}
          className="rounded-md px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          style={{ background: '#f44747' }}>
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </form>
  );
}
