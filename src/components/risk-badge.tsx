export default function RiskBadge({ ratio, reward, risk, exceedsThreshold }: {
  ratio: string; reward: number | null; risk: number; exceedsThreshold: boolean;
}) {
  if (exceedsThreshold) {
    return <span className="px-2 py-1 text-[13px] font-mono font-bold rounded bg-red-900/50 text-red-400 border border-red-700 whitespace-nowrap">EXCEEDS THRESHOLD</span>;
  }
  if (reward === null || risk === 0) return null;
  const r = reward / risk;
  const color = r >= 2 ? 'text-green-400 border-green-700 bg-green-900/30'
    : r >= 1 ? 'text-yellow-400 border-yellow-700 bg-yellow-900/30'
    : 'text-red-400 border-red-700 bg-red-900/30';
  return <span className={`px-2 py-1 text-[13px] font-mono font-bold rounded border whitespace-nowrap ${color}`}>{ratio} R:R</span>;
}
