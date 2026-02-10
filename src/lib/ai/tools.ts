import { z } from 'zod';

export const logTradeSchema = z.object({
  symbol: z.string().describe('Ticker symbol (e.g. AAPL, BTC)'),
  direction: z.enum(['Long', 'Short']),
  entry_price: z.number(),
  quantity: z.number(),
  stop_loss_price: z.number().describe('Stop loss price — REQUIRED for every trade'),
  take_profit_price: z.number().describe('Take profit price — REQUIRED for every trade'),
  strategy_name: z.string().optional().default('Manual'),
  notes: z.string().optional().default(''),
  entry_date: z.string().describe('ISO date string'),
});

export const closeTradeSchema = z.object({
  trade_id: z.string().describe('UUID of the trade to close'),
  exit_price: z.number(),
  outcome: z.enum(['Win', 'Loss', 'Breakeven']),
  pnl: z.number(),
  exit_date: z.string().describe('ISO date string'),
  notes: z.string().optional(),
});

export const getTradesSchema = z.object({
  limit: z.number().optional().default(20),
  symbol: z.string().optional(),
  outcome: z.enum(['Win', 'Loss', 'Breakeven', 'Open', 'All']).optional().default('All'),
});

export const getStrategiesSchema = z.object({});

export const getStatsSchema = z.object({
  period: z.enum(['day', 'week', 'month', 'all']).optional().default('all'),
});

export const getRiskSettingsSchema = z.object({});

export const updateTraderProfileSchema = z.object({
  profile: z.string().max(2000).describe('Complete updated trader profile. Write the FULL profile each time — this replaces the previous version.'),
});

export const setNicknameSchema = z.object({
  name: z.string().min(1).max(50).describe('The name/nickname the user wants to be called'),
});
