'use client';

import { useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Trade } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

const TradingViewWidget = dynamic(() => import('@/components/tradingview-widget'), { ssr: false });

interface TradeDetailPanelProps {
  trade: Trade;
  onClose: () => void;
}

export default function TradeDetailPanel({ trade, onClose }: TradeDetailPanelProps) {
  const [chartExpanded, setChartExpanded] = useState(false);
  const pnlColor = trade.pnl !== null
    ? (trade.pnl > 0 ? '#4ec9b0' : trade.pnl < 0 ? '#f44747' : '#888')
    : '#555';

  const outcomeColor = trade.outcome === 'Win' ? '#4ec9b0'
    : trade.outcome === 'Loss' ? '#f44747'
    : trade.outcome === 'Open' ? '#569cd6' : '#888';

  // Parse structured notes
  const { thesis, lessons, tags, notes } = parseNotes(trade.notes);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />

      {/* Slide-out panel */}
      <div
        className="fixed top-0 right-0 z-50 h-full w-full max-w-md overflow-y-auto font-mono text-[15px]"
        style={{ background: '#0d0d0d', borderLeft: '2px solid #569cd6' }}
      >
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #222' }}>
          <span className="text-sm font-bold uppercase tracking-widest" style={{ color: '#569cd6' }}>
            {trade.symbol} — TRADE DETAIL
          </span>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-lg">✕</button>
        </div>

        <div className="p-4 space-y-4">
          {/* Chart */}
          <Section title="CHART">
            <button
              onClick={() => setChartExpanded((v) => !v)}
              className="text-[13px] uppercase tracking-wider mb-2"
              style={{ color: '#dcdcaa' }}
            >
              {chartExpanded ? '— COLLAPSE' : '+ EXPAND CHART'}
            </button>
            {chartExpanded && (
              <div style={{ height: 280, border: '1px solid #222' }}>
                <TradingViewWidget symbol={trade.symbol} interval="D" height={280} autosize={false} />
              </div>
            )}
          </Section>

          {/* Core info */}
          <Section title="POSITION">
            <Row label="SYMBOL" value={trade.symbol} />
            <Row label="STRATEGY" value={trade.strategy_name} />
            <Row label="DIRECTION" value={trade.direction === 'Long' ? 'LONG' : 'SHORT'} color={trade.direction === 'Long' ? '#4ec9b0' : '#f44747'} />
            <Row label="QUANTITY" value={String(trade.quantity)} />
            <Row label="ENTRY" value={formatCurrency(trade.entry_price)} />
            <Row label="STOP LOSS" value={trade.stop_loss_price !== null ? formatCurrency(trade.stop_loss_price) : '—'} color={trade.stop_loss_price !== null ? '#f44747' : undefined} />
            <Row label="TAKE PROFIT" value={trade.take_profit_price !== null ? formatCurrency(trade.take_profit_price) : '—'} color={trade.take_profit_price !== null ? '#4ec9b0' : undefined} />
            <Row label="EXIT" value={trade.exit_price !== null ? formatCurrency(trade.exit_price) : '—'} />
            <Row label="P&L" value={trade.pnl !== null ? formatCurrency(trade.pnl) : '—'} color={pnlColor} />
            <Row label="OUTCOME" value={trade.outcome.toUpperCase()} color={outcomeColor} />
            <div className="pt-1">
              <Link
                href={`/dashboard/chart?sym=${trade.symbol}`}
                className="text-[13px] uppercase tracking-wider hover:underline"
                style={{ color: '#dcdcaa' }}
                onClick={onClose}
              >
                OPEN IN CHART &rarr;
              </Link>
            </div>
          </Section>

          {trade.pre_entry_emotion && (
            <Section title="PRE-ENTRY EMOTION">
              <span className="text-sm font-mono uppercase tracking-wider" style={{
                color: ['revenge', 'tilt', 'FOMO'].includes(trade.pre_entry_emotion) ? '#f44747' : '#4ec9b0'
              }}>{trade.pre_entry_emotion}</span>
            </Section>
          )}

          {/* Dates */}
          <Section title="TIMING">
            <Row label="ENTRY DATE" value={new Date(trade.entry_date).toLocaleString()} />
            <Row label="EXIT DATE" value={trade.exit_date ? new Date(trade.exit_date).toLocaleString() : '—'} />
            {trade.exit_date && (
              <Row label="DURATION" value={formatDuration(trade.entry_date, trade.exit_date)} />
            )}
          </Section>

          {/* Journal */}
          {thesis && (
            <Section title="THESIS">
              <p className="text-gray-300 whitespace-pre-wrap">{thesis}</p>
            </Section>
          )}

          {lessons && (
            <Section title="LESSONS">
              <p className="text-gray-300 whitespace-pre-wrap">{lessons}</p>
            </Section>
          )}

          {tags.length > 0 && (
            <Section title="TAGS">
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 text-[13px] uppercase tracking-wider"
                    style={{ background: '#1a1a2e', color: '#569cd6', border: '1px solid #333' }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {notes && (
            <Section title="NOTES">
              <p className="text-gray-400 whitespace-pre-wrap">{notes}</p>
            </Section>
          )}
        </div>
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-[13px] text-gray-600 uppercase tracking-widest mb-2"
        style={{ borderBottom: '1px solid #222', paddingBottom: 4 }}>
        {title}
      </h4>
      {children}
    </div>
  );
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex justify-between py-1">
      <span className="text-gray-500">{label}</span>
      <span style={{ color: color ?? '#e0e0e0' }}>{value}</span>
    </div>
  );
}

function formatDuration(start: string, end: string): string {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const hours = Math.floor(ms / 3600000);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h`;
  const mins = Math.floor((ms % 3600000) / 60000);
  return `${hours}h ${mins}m`;
}

export function parseNotes(raw: string): { thesis: string; lessons: string; tags: string[]; notes: string } {
  let thesis = '';
  let lessons = '';
  let tags: string[] = [];
  let notes = raw;

  const thesisMatch = raw.match(/\[THESIS\]([\s\S]*?)(?=\[(?:LESSONS|TAGS)\]|$)/);
  const lessonsMatch = raw.match(/\[LESSONS\]([\s\S]*?)(?=\[(?:THESIS|TAGS)\]|$)/);
  const tagsMatch = raw.match(/\[TAGS\]([\s\S]*?)(?=\[(?:THESIS|LESSONS)\]|$)/);

  if (thesisMatch || lessonsMatch || tagsMatch) {
    thesis = thesisMatch?.[1]?.trim() ?? '';
    lessons = lessonsMatch?.[1]?.trim() ?? '';
    const tagsStr = tagsMatch?.[1]?.trim() ?? '';
    tags = tagsStr ? tagsStr.split(',').map((s) => s.trim()).filter(Boolean) : [];
    // Remove structured content from notes
    notes = raw
      .replace(/\[THESIS\][\s\S]*?(?=\[(?:LESSONS|TAGS)\]|$)/, '')
      .replace(/\[LESSONS\][\s\S]*?(?=\[(?:THESIS|TAGS)\]|$)/, '')
      .replace(/\[TAGS\][\s\S]*?(?=\[(?:THESIS|LESSONS)\]|$)/, '')
      .trim();
  }

  return { thesis, lessons, tags, notes };
}
