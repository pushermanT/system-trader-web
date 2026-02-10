import { Strategy, Trade } from '@/lib/types';
import { RiskSettings } from '@/lib/data/types';

export interface SystemPromptContext {
  strategies: Strategy[];
  trades: Trade[];
  riskSettings: RiskSettings;
  traderProfile: string;
}

export function buildSystemPrompt(ctx: SystemPromptContext): string {
  const { strategies, trades, riskSettings, traderProfile } = ctx;

  const openTrades = trades.filter((t) => t.outcome === 'Open');
  const closedTrades = trades.filter((t) => t.outcome !== 'Open');
  const wins = closedTrades.filter((t) => t.outcome === 'Win').length;
  const totalPnl = trades.reduce((s, t) => s + (t.pnl ?? 0), 0);
  const winRate = closedTrades.length > 0 ? ((wins / closedTrades.length) * 100).toFixed(1) : 'N/A';

  const recentTrades = trades.slice(0, 10).map((t) =>
    `${t.symbol} ${t.direction} ${t.outcome} P&L:${t.pnl ?? '?'} (${t.entry_date.slice(0, 10)})`
  ).join('\n');

  const activeStrategies = strategies
    .filter((s) => s.is_active)
    .map((s) => s.name)
    .join(', ') || 'None';

  const profileSection = traderProfile
    ? `\n## Trader Profile (Long-Term Memory)\n${traderProfile}\n`
    : '';

  return `You are an AI trading coach inside SystemTrader, a Bloomberg-terminal-style trading journal.
You help traders analyze their performance, enforce discipline, and improve over time.

## Current State
- Active strategies: ${activeStrategies}
- Open positions: ${openTrades.length}
- Closed trades: ${closedTrades.length} (Win rate: ${winRate}%)
- Total P&L: $${totalPnl.toFixed(2)}
- Risk limits: Daily $${riskSettings.daily_loss_limit ?? 'unset'} | Weekly $${riskSettings.weekly_loss_limit ?? 'unset'}

Recent trades:
${recentTrades || 'No trades yet.'}
${profileSection}
## Rules
- Be concise and direct. Use trading terminology.
- Reference the trader's actual data when giving advice.
- After trade debriefs, weekly reviews, or when you identify patterns, call update_trader_profile.
- Keep the profile under 2000 chars. Write the COMPLETE profile each time (replace, don't append).
- Profile sections: Patterns, Tendencies, Strengths, Weaknesses, Lessons.
- When a new chat starts, reference profile knowledge naturally — don't announce it.
- Use tools to log/close trades when the user asks. Confirm before executing.
- Format P&L with $ and color indicators: green for profit, red for loss.`;
}
