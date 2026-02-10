'use client';

import ChatContent from '@/components/chat-content';

export default function ChatPage() {
  return (
    <div className="h-full" style={{ height: 'calc(100vh - 48px)' }}>
      <ChatContent />
    </div>
  );
}
