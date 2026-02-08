'use client';

interface LossStreakWarningProps {
  streak: number;
}

export default function LossStreakWarning({ streak }: LossStreakWarningProps) {
  if (streak < 2) return null;

  const severity = streak >= 5 ? 'critical' : streak >= 3 ? 'warning' : 'info';
  const color = severity === 'critical' ? '#f44747' : severity === 'warning' ? '#dcdcaa' : '#569cd6';

  const messages: Record<string, string> = {
    critical: `${streak} consecutive losses. Step away. Review your strategy before entering another trade.`,
    warning: `${streak} consecutive losses. Slow down and check your emotional state.`,
    info: `${streak} consecutive losses. Stay disciplined.`,
  };

  return (
    <div
      className="px-4 py-2 font-mono text-[13px]"
      style={{ background: `${color}10`, borderBottom: `1px solid ${color}40` }}
    >
      <span style={{ color }} className="font-bold uppercase tracking-wider">
        {severity === 'critical' ? 'STOP' : 'CAUTION'}
      </span>
      <span className="text-gray-400 ml-2">{messages[severity]}</span>
    </div>
  );
}
