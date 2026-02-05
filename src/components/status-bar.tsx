'use client';

import { formatCurrency } from '@/lib/utils';

interface StatusBarProps {
  title: string;
  items: { label: string; value: string; color: string }[];
  showDate?: boolean;
}

export default function StatusBar({ title, items, showDate = true }: StatusBarProps) {
  return (
    <div
      className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-1.5 font-mono text-[13px] border-b"
      style={{ background: '#0a0a0a', borderColor: '#222', color: '#888' }}
    >
      <span style={{ color: '#ff8c00' }}>{title}</span>
      {items.map((item) => (
        <span key={item.label}>
          {item.label}: <span style={{ color: item.color }}>{item.value}</span>
        </span>
      ))}
      {showDate && <span style={{ color: '#555' }}>{new Date().toLocaleDateString()}</span>}
    </div>
  );
}
