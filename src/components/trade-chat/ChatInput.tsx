'use client';

import { useRef, useEffect, useState, KeyboardEvent, ChangeEvent } from 'react';
import { DESIGN } from '@/lib/trade-chat/constants';

interface Props {
  disabled: boolean;
  placeholder?: string;
  statusText?: string;
  onSend: (message: string) => void;
}

export default function ChatInput({ disabled, placeholder, statusText, onSend }: Props) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [value]);

  useEffect(() => {
    if (!disabled) textareaRef.current?.focus();
  }, [disabled]);

  function handleChange(e: ChangeEvent<HTMLTextAreaElement>) {
    setValue(e.target.value);
  }

  function submit() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  const empty = value.trim().length === 0;

  if (statusText) {
    return (
      <div
        className="w-full px-4 py-5 flex items-center justify-center text-[13px] tracking-wider"
        style={{
          background: DESIGN.input_bg,
          borderTop: `1px solid ${DESIGN.card_border}`,
          color: DESIGN.text_secondary,
        }}
      >
        {statusText}
      </div>
    );
  }

  return (
    <div
      className="w-full px-4 py-3 flex items-end gap-3"
      style={{
        background: DESIGN.input_bg,
        borderTop: `1px solid ${DESIGN.card_border}`,
      }}
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        rows={1}
        placeholder={placeholder ?? 'Type your trade idea...'}
        className="flex-1 resize-none bg-transparent outline-none py-2"
        style={{
          color: DESIGN.text_primary,
          fontSize: 16,
          lineHeight: 1.5,
          maxHeight: 140,
          fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
        }}
        aria-label="Message input"
      />
      <button
        type="button"
        onClick={submit}
        disabled={disabled || empty}
        aria-label="Send message"
        className="shrink-0 flex items-center justify-center w-10 h-10 transition-opacity"
        style={{
          color: DESIGN.text_primary,
          opacity: disabled || empty ? 0.3 : 1,
          cursor: disabled || empty ? 'not-allowed' : 'pointer',
        }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="12" y1="19" x2="12" y2="5" />
          <polyline points="5 12 12 5 19 12" />
        </svg>
      </button>
    </div>
  );
}
