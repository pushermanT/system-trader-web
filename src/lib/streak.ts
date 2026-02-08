import { Trade } from './types';

export function currentLossStreak(trades: Trade[]): number {
  const sorted = [...trades]
    .filter((t) => t.outcome !== 'Open')
    .sort((a, b) => new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime());

  let streak = 0;
  for (const t of sorted) {
    if (t.outcome === 'Loss') streak++;
    else break;
  }
  return streak;
}

export function recentEmotions(trades: Trade[], count = 5): string[] {
  return trades
    .filter((t) => t.pre_entry_emotion)
    .sort((a, b) => new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime())
    .slice(0, count)
    .map((t) => t.pre_entry_emotion!);
}
