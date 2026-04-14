'use client';

import { type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { DESIGN } from '@/lib/trade-chat/constants';
import type { ChatMessage as ChatMessageType } from '@/lib/trade-chat/types';

interface Props {
  message: ChatMessageType;
}

function renderInlineMarkdown(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    const token = match[0];
    if (token.startsWith('**')) {
      parts.push(
        <strong key={key++} style={{ fontWeight: 600 }}>
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('`')) {
      parts.push(
        <code
          key={key++}
          style={{
            fontFamily: 'var(--font-geist-mono), monospace',
            fontSize: '0.92em',
            background: '#1a1a1a',
            padding: '1px 4px',
            borderRadius: 2,
          }}
        >
          {token.slice(1, -1)}
        </code>
      );
    } else {
      parts.push(
        <em key={key++} style={{ fontStyle: 'italic' }}>
          {token.slice(1, -1)}
        </em>
      );
    }
    last = match.index + token.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export default function ChatMessage({ message }: Props) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  if (isSystem) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="w-full flex justify-center my-3"
      >
        <span
          className="text-[11px] tracking-[0.15em] uppercase"
          style={{ color: DESIGN.text_muted }}
        >
          {message.content}
        </span>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`w-full flex ${isUser ? 'justify-end' : 'justify-start'} my-4`}
    >
      <div
        className="max-w-[640px] text-[16px] leading-[1.6]"
        style={{
          color: isUser ? DESIGN.user_message_color : DESIGN.ai_message_color,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {renderInlineMarkdown(message.content)}
      </div>
    </motion.div>
  );
}
