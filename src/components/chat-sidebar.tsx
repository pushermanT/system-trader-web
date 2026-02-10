'use client';

import { useState } from 'react';
import { ChatSession } from '@/lib/types';

interface ChatSidebarProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  open: boolean;
  onClose: () => void;
  isMobile: boolean;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86400000) return 'Today';
  if (diff < 172800000) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function SessionItem({
  session, active, onSelect, onDelete,
}: {
  session: ChatSession;
  active: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const [hovering, setHovering] = useState(false);

  return (
    <button
      onClick={onSelect}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      className="w-full text-left px-3 py-2 flex items-center gap-2 transition-colors relative group"
      style={{
        borderLeft: active ? '2px solid #f7931a' : '2px solid transparent',
        background: active ? '#f7931a08' : 'transparent',
        color: active ? '#f7931a' : '#888',
      }}
    >
      <div className="flex-1 min-w-0">
        <div className="text-sm font-mono truncate">{session.title}</div>
        <div className="text-[11px] font-mono" style={{ color: '#555' }}>
          {formatDate(session.updated_at)}
        </div>
      </div>
      {hovering && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="text-[11px] font-mono px-1 hover:text-red-500 transition-colors"
          style={{ color: '#555' }}
        >
          X
        </button>
      )}
    </button>
  );
}

export default function ChatSidebar({
  sessions, activeSessionId, onSelect, onNew, onDelete, open, onClose, isMobile,
}: ChatSidebarProps) {
  const sidebar = (
    <div
      className="flex flex-col h-full font-mono"
      style={{ width: isMobile ? '100%' : 260, background: '#0d0d0d', borderRight: '1px solid #333' }}
    >
      <div className="p-3" style={{ borderBottom: '1px solid #333' }}>
        <button
          onClick={onNew}
          className="w-full py-2 text-sm font-bold uppercase tracking-widest text-black"
          style={{ background: '#f7931a' }}
        >
          + NEW CHAT
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {sessions.length === 0 ? (
          <p className="text-[12px] text-gray-600 px-3 py-4">No conversations yet.</p>
        ) : (
          sessions.map((s) => (
            <SessionItem
              key={s.id}
              session={s}
              active={s.id === activeSessionId}
              onSelect={() => { onSelect(s.id); if (isMobile) onClose(); }}
              onDelete={() => onDelete(s.id)}
            />
          ))
        )}
      </div>
    </div>
  );

  // Mobile: overlay
  if (isMobile) {
    if (!open) return null;
    return (
      <div className="fixed inset-0 z-50 flex">
        <div className="w-72 h-full">{sidebar}</div>
        <div className="flex-1 bg-black/60" onClick={onClose} />
      </div>
    );
  }

  // Desktop: static sidebar
  return sidebar;
}
