'use client';

import { useState, useEffect, useCallback } from 'react';
import { Memory } from '@/lib/data/types';

const CATEGORY_LABELS: Record<string, string> = {
  pattern: 'Pattern',
  preference: 'Preference',
  lesson: 'Lesson',
  fact: 'Fact',
  goal: 'Goal',
  general: 'General',
};

const CATEGORIES = ['pattern', 'preference', 'lesson', 'fact', 'goal', 'general'] as const;

export default function MemorySettings() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchMemories = useCallback(async () => {
    try {
      const res = await fetch('/api/memory');
      if (res.ok) {
        const data = await res.json();
        setMemories(data);
      }
    } catch (err) {
      console.error('Failed to fetch memories:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMemories();
  }, [fetchMemories]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/memory/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setMemories((prev) => prev.filter((m) => m.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete memory:', err);
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return <div>Loading memories...</div>;
  }

  const grouped = CATEGORIES.reduce(
    (acc, cat) => {
      const items = memories.filter((m) => m.category === cat);
      if (items.length > 0) acc[cat] = items;
      return acc;
    },
    {} as Record<string, Memory[]>
  );

  return (
    <div>
      <div>
        <span>{memories.length} memories</span>
      </div>

      {memories.length === 0 && (
        <p>No memories yet. Chat with the AI and it will automatically learn about you.</p>
      )}

      {Object.entries(grouped).map(([category, items]) => (
        <div key={category}>
          <h4>{CATEGORY_LABELS[category] || category}</h4>
          <ul>
            {items.map((memory) => (
              <li key={memory.id}>
                <span>{memory.content}</span>
                <span>{new Date(memory.created_at).toLocaleDateString()}</span>
                <button
                  onClick={() => handleDelete(memory.id)}
                  disabled={deletingId === memory.id}
                >
                  {deletingId === memory.id ? 'Deleting...' : 'Delete'}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
