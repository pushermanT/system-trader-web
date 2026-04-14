'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { DESIGN } from '@/lib/trade-chat/constants';
import type { RuleViolation } from '@/lib/trade-chat/types';

interface Props {
  violations: RuleViolation[];
  overrideRequestedAt: string | null;
  overrideAvailableAt: string | null;
  onRevise: () => void;
  onRequestOverride: () => void;
  onOverrideExpired: () => void;
}

function formatWrittenDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return '00:00:00';
  const total = Math.floor(ms / 1000);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function RuleViolationCard({
  violations,
  overrideRequestedAt,
  overrideAvailableAt,
  onRevise,
  onRequestOverride,
  onOverrideExpired,
}: Props) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const availableAt = overrideAvailableAt
    ? new Date(overrideAvailableAt).getTime()
    : null;
  const remainingMs = availableAt ? availableAt - now : null;
  const overrideReady =
    overrideRequestedAt !== null && remainingMs !== null && remainingMs <= 0;
  const overrideCountingDown =
    overrideRequestedAt !== null && remainingMs !== null && remainingMs > 0;

  useEffect(() => {
    if (overrideReady) onOverrideExpired();
  }, [overrideReady, onOverrideExpired]);

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
            color: DESIGN.accent_red,
            fontSize: 18,
            lineHeight: 1,
          }}
        >
          ⛔
        </span>
        <span
          className="text-[13px] tracking-[0.2em] font-semibold"
          style={{ color: DESIGN.accent_red }}
        >
          {violations.length} {violations.length === 1 ? 'RULE' : 'RULES'} VIOLATED
        </span>
      </div>

      <div className="space-y-3 mb-6">
        {violations.map((v, i) => (
          <div
            key={v.rule_id}
            className="p-4"
            style={{
              background: DESIGN.card_bg_inner,
              border: `1px solid ${DESIGN.card_border}`,
              borderRadius: 3,
            }}
          >
            <div
              className="text-[11px] tracking-[0.15em] uppercase mb-3"
              style={{ color: DESIGN.text_secondary }}
            >
              {i + 1}. {v.rule_type.replace(/_/g, ' ')}
            </div>

            <div
              className="mb-3 grid grid-cols-[90px_1fr] gap-x-3 gap-y-1 text-[13px]"
              style={{ fontFamily: 'var(--font-geist-mono), monospace' }}
            >
              <span style={{ color: DESIGN.text_secondary }}>Your trade:</span>
              <span style={{ color: DESIGN.text_primary }}>{v.current_value}</span>
              <span style={{ color: DESIGN.text_secondary }}>Your rule:</span>
              <span style={{ color: DESIGN.text_primary }}>{v.rule_limit}</span>
            </div>

            <div className="mt-3">
              <div
                className="text-[11px] tracking-[0.05em] mb-1"
                style={{ color: DESIGN.accent_amber }}
              >
                You wrote on {formatWrittenDate(v.rule_created_at)}:
              </div>
              <div
                className="text-[14px] leading-[1.5] italic"
                style={{ color: DESIGN.text_primary }}
              >
                &ldquo;{v.rule_text}&rdquo;
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onRevise}
        className="w-full py-3 mb-3 text-[14px] font-semibold tracking-[0.1em] uppercase transition-colors"
        style={{
          background: 'transparent',
          color: DESIGN.text_primary,
          border: `1px solid ${DESIGN.text_primary}`,
          borderRadius: 3,
          cursor: 'pointer',
        }}
      >
        Revise Trade
      </button>

      {!overrideRequestedAt && (
        <button
          type="button"
          onClick={onRequestOverride}
          className="w-full py-3 text-[13px] tracking-[0.1em] uppercase transition-opacity"
          style={{
            background: 'transparent',
            color: DESIGN.accent_red,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Override — Start 24 hr cooldown
        </button>
      )}

      {overrideCountingDown && (
        <button
          type="button"
          disabled
          className="w-full py-3 text-[13px] tracking-[0.1em] uppercase"
          style={{
            background: 'transparent',
            color: DESIGN.accent_red,
            border: 'none',
            opacity: 0.6,
            cursor: 'not-allowed',
            fontFamily: 'var(--font-geist-mono), monospace',
          }}
        >
          Override — available in {formatRemaining(remainingMs ?? 0)}
        </button>
      )}

      {overrideReady && (
        <button
          type="button"
          onClick={onRequestOverride}
          className="w-full py-3 text-[13px] tracking-[0.1em] uppercase"
          style={{
            background: 'transparent',
            color: DESIGN.accent_red,
            border: `1px solid ${DESIGN.accent_red}`,
            borderRadius: 3,
            cursor: 'pointer',
          }}
        >
          Override Available — Proceed Anyway
        </button>
      )}
    </motion.div>
  );
}
