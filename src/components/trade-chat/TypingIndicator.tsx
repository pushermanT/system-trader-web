'use client';

import { DESIGN } from '@/lib/trade-chat/constants';

export default function TypingIndicator() {
  return (
    <div
      className="flex items-center gap-1.5 py-2"
      aria-label="Assistant is thinking"
      role="status"
    >
      <span className="dot" />
      <span className="dot dot-2" />
      <span className="dot dot-3" />
      <style jsx>{`
        .dot {
          width: 6px;
          height: 6px;
          border-radius: 9999px;
          background: ${DESIGN.text_primary};
          opacity: 0.35;
          animation: pulse 1.2s ease-in-out infinite;
        }
        .dot-2 {
          animation-delay: 0.15s;
        }
        .dot-3 {
          animation-delay: 0.3s;
        }
        @keyframes pulse {
          0%,
          80%,
          100% {
            opacity: 0.2;
            transform: translateY(0);
          }
          40% {
            opacity: 1;
            transform: translateY(-2px);
          }
        }
      `}</style>
    </div>
  );
}
