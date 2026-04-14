'use client';

import { motion } from 'framer-motion';
import { DESIGN } from '@/lib/trade-chat/constants';
import type { TradeSummary } from '@/lib/trade-chat/types';

interface Props {
  summary: TradeSummary;
  onExecute: () => void;
  onEdit: () => void;
  onSaveToJournal: () => void;
  onCancel: () => void;
  executing?: boolean;
}

function formatPrice(n: number | undefined): string {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '—';
  return `$${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}

function formatUsd(n: number | null): string {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '—';
  const sign = n < 0 ? '-' : '+';
  return `${sign}$${Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

function pctChange(from: number | undefined, to: number | undefined, direction: 'long' | 'short' | undefined) {
  if (typeof from !== 'number' || typeof to !== 'number' || !direction) return '';
  const raw = ((to - from) / from) * 100;
  const signed = direction === 'long' ? raw : -raw;
  const sign = signed >= 0 ? '+' : '';
  return `(${sign}${signed.toFixed(1)}%)`;
}

export default function TradeSummaryCard({
  summary,
  onExecute,
  onEdit,
  onSaveToJournal,
  onCancel,
  executing,
}: Props) {
  const { trade } = summary;
  const rr = summary.risk_reward_ratio;
  const rrDisplay = rr > 0 ? `1:${rr.toFixed(1)}` : '—';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="w-full max-w-[480px] mx-auto p-6"
      style={{
        background: DESIGN.card_bg,
        border: `1px solid ${DESIGN.card_border}`,
        borderRadius: 4,
      }}
    >
      <div className="flex items-center gap-2 mb-5">
        <span
          aria-hidden
          style={{
            color: DESIGN.accent_green,
            fontSize: 18,
            lineHeight: 1,
          }}
        >
          ✓
        </span>
        <span
          className="text-[13px] tracking-[0.2em] font-semibold"
          style={{ color: DESIGN.accent_green }}
        >
          TRADE APPROVED
        </span>
      </div>

      <div
        className="mb-6 text-[20px] font-medium"
        style={{ color: DESIGN.text_primary }}
      >
        {trade.asset ?? '—'} {trade.direction ? trade.direction.toUpperCase() : ''}
      </div>

      <div className="space-y-2 mb-6" style={{ fontSize: 14 }}>
        <Row label="Entry" value={formatPrice(trade.entry_price)} />
        <Row
          label="Stop Loss"
          value={`${formatPrice(trade.stop_loss)}  ${pctChange(
            trade.entry_price,
            trade.stop_loss,
            trade.direction
          )}`}
        />
        <Row
          label="Take Profit"
          value={`${formatPrice(trade.take_profit)}  ${pctChange(
            trade.entry_price,
            trade.take_profit,
            trade.direction
          )}`}
        />
        <Row label="Risk:Reward" value={rrDisplay} />
      </div>

      <div
        className="my-6 h-px"
        style={{ background: DESIGN.card_border }}
      />

      <div className="space-y-2 mb-6" style={{ fontSize: 14 }}>
        <Row label="Position" value={summary.portfolio_impact} />
        <Row
          label="Est. Loss"
          value={formatUsd(summary.estimated_loss_at_stop)}
          valueColor={summary.estimated_loss_at_stop !== null ? DESIGN.accent_red : undefined}
        />
        <Row
          label="Est. Gain"
          value={formatUsd(summary.estimated_gain_at_tp)}
          valueColor={summary.estimated_gain_at_tp !== null ? DESIGN.accent_green : undefined}
        />
      </div>

      {trade.thesis && (
        <>
          <div
            className="my-6 h-px"
            style={{ background: DESIGN.card_border }}
          />
          <div className="mb-6">
            <div
              className="text-[11px] tracking-[0.15em] uppercase mb-2"
              style={{ color: DESIGN.text_secondary }}
            >
              Thesis
            </div>
            <div
              className="text-[14px] leading-[1.6]"
              style={{ color: DESIGN.text_primary, fontStyle: 'italic' }}
            >
              &ldquo;{trade.thesis}&rdquo;
            </div>
          </div>
        </>
      )}

      <button
        type="button"
        onClick={onExecute}
        disabled={executing}
        className="w-full py-3 text-[14px] font-semibold tracking-[0.1em] uppercase transition-opacity"
        style={{
          background: DESIGN.accent_green,
          color: '#000000',
          opacity: executing ? 0.5 : 1,
          cursor: executing ? 'wait' : 'pointer',
          border: 'none',
          borderRadius: 3,
        }}
      >
        {executing ? 'Executing...' : 'Execute Trade'}
      </button>

      <div
        className="mt-5 flex items-center justify-center gap-4 text-[12px]"
        style={{ color: DESIGN.text_secondary }}
      >
        <button type="button" onClick={onEdit} className="hover:underline">
          Edit
        </button>
        <span style={{ color: DESIGN.text_muted }}>·</span>
        <button type="button" onClick={onSaveToJournal} className="hover:underline">
          Save to Journal
        </button>
        <span style={{ color: DESIGN.text_muted }}>·</span>
        <button type="button" onClick={onCancel} className="hover:underline">
          Cancel
        </button>
      </div>
    </motion.div>
  );
}

function Row({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span style={{ color: DESIGN.text_secondary }}>{label}</span>
      <span
        style={{
          color: valueColor ?? DESIGN.text_primary,
          fontVariantNumeric: 'tabular-nums',
          fontFamily: 'var(--font-geist-mono), monospace',
        }}
      >
        {value}
      </span>
    </div>
  );
}
