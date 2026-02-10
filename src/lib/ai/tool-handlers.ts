import { tool } from 'ai';
import { UserContext, filterTrades } from './context';
import {
  logTradeSchema,
  closeTradeSchema,
  getTradesSchema,
  getStrategiesSchema,
  getStatsSchema,
  getRiskSettingsSchema,
  updateTraderProfileSchema,
  setNicknameSchema,
} from './tools';

export function createTools(ctx: UserContext) {
  return {
    log_trade: tool({
      description: 'Log a new trade entry',
      inputSchema: logTradeSchema,
      execute: async (params) => {
        const trade = await ctx.repo.createTrade({
          strategy_id: null,
          strategy_name: params.strategy_name ?? 'Manual',
          symbol: params.symbol.toUpperCase(),
          direction: params.direction,
          entry_price: params.entry_price,
          exit_price: null,
          stop_loss_price: params.stop_loss_price,
          take_profit_price: params.take_profit_price,
          max_loss: null,
          quantity: params.quantity,
          outcome: 'Open',
          pnl: null,
          notes: params.notes ?? '',
          autopsy: null,
          pre_entry_emotion: null,
          entry_date: params.entry_date,
          exit_date: null,
          compliance: [],
        });
        if (!trade) return { error: 'Failed to log trade' };
        return { success: true, trade_id: trade.id, symbol: trade.symbol };
      },
    }),

    close_trade: tool({
      description: 'Close an existing open trade',
      inputSchema: closeTradeSchema,
      execute: async (params) => {
        const trade = ctx.trades.find((t) => t.id === params.trade_id);
        if (!trade) return { error: 'Trade not found' };
        if (trade.outcome !== 'Open') return { error: 'Trade is already closed' };

        await ctx.repo.updateTrade(params.trade_id, {
          strategy_id: trade.strategy_id,
          strategy_name: trade.strategy_name,
          symbol: trade.symbol,
          direction: trade.direction,
          entry_price: trade.entry_price,
          exit_price: params.exit_price,
          stop_loss_price: trade.stop_loss_price,
          take_profit_price: trade.take_profit_price,
          max_loss: trade.max_loss,
          quantity: trade.quantity,
          outcome: params.outcome,
          pnl: params.pnl,
          notes: params.notes ?? trade.notes,
          autopsy: trade.autopsy,
          pre_entry_emotion: trade.pre_entry_emotion,
          entry_date: trade.entry_date,
          exit_date: params.exit_date,
          compliance: [],
        });
        return { success: true, symbol: trade.symbol, pnl: params.pnl };
      },
    }),

    get_trades: tool({
      description: 'Retrieve trades with optional filters',
      inputSchema: getTradesSchema,
      execute: async (params) => {
        const filtered = filterTrades(ctx.trades, params);
        return {
          count: filtered.length,
          trades: filtered.map((t) => ({
            id: t.id,
            symbol: t.symbol,
            direction: t.direction,
            outcome: t.outcome,
            pnl: t.pnl,
            entry_date: t.entry_date,
            exit_date: t.exit_date,
            entry_price: t.entry_price,
            exit_price: t.exit_price,
            stop_loss_price: t.stop_loss_price,
            take_profit_price: t.take_profit_price,
          })),
        };
      },
    }),

    get_strategies: tool({
      description: 'List all trading strategies',
      inputSchema: getStrategiesSchema,
      execute: async () => {
        return {
          strategies: ctx.strategies.map((s) => ({
            id: s.id,
            name: s.name,
            is_active: s.is_active,
          })),
        };
      },
    }),

    get_stats: tool({
      description: 'Get trading performance statistics',
      inputSchema: getStatsSchema,
      execute: async (params) => {
        let trades = ctx.trades.filter((t) => t.outcome !== 'Open');
        const now = new Date();

        if (params.period === 'day') {
          const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          trades = trades.filter((t) => new Date(t.entry_date) >= start);
        } else if (params.period === 'week') {
          const start = new Date(now);
          start.setDate(start.getDate() - 7);
          trades = trades.filter((t) => new Date(t.entry_date) >= start);
        } else if (params.period === 'month') {
          const start = new Date(now);
          start.setMonth(start.getMonth() - 1);
          trades = trades.filter((t) => new Date(t.entry_date) >= start);
        }

        const wins = trades.filter((t) => t.outcome === 'Win').length;
        const losses = trades.filter((t) => t.outcome === 'Loss').length;
        const totalPnl = trades.reduce((s, t) => s + (t.pnl ?? 0), 0);
        const avgPnl = trades.length > 0 ? totalPnl / trades.length : 0;

        return {
          period: params.period,
          total_trades: trades.length,
          wins,
          losses,
          win_rate: trades.length > 0 ? ((wins / trades.length) * 100).toFixed(1) + '%' : 'N/A',
          total_pnl: totalPnl.toFixed(2),
          avg_pnl: avgPnl.toFixed(2),
        };
      },
    }),

    get_risk_settings: tool({
      description: 'Get current risk management settings',
      inputSchema: getRiskSettingsSchema,
      execute: async () => {
        return ctx.riskSettings;
      },
    }),

    update_trader_profile: tool({
      description: 'Update the persistent trader profile with patterns, tendencies, and lessons learned. Call this after debriefs, weekly reviews, or pattern recognition.',
      inputSchema: updateTraderProfileSchema,
      execute: async (params) => {
        await ctx.repo.updateTraderProfile(params.profile);
        return { success: true, length: params.profile.length };
      },
    }),

    set_nickname: tool({
      description: 'Save the user\'s preferred name/nickname. Call this when the user tells you their name during onboarding or anytime they ask to change it.',
      inputSchema: setNicknameSchema,
      execute: async (params) => {
        await ctx.repo.saveNickname(params.name);
        return { success: true, nickname: params.name };
      },
    }),
  };
}
