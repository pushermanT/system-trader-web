'use client';

import { Strategy, Rule } from '@/lib/types';
import TerminalPanel from '@/components/terminal-panel';

interface StrategiesPanelProps {
  strategies: (Strategy & { rules: Rule[] })[];
  activeStrategies: (Strategy & { rules: Rule[] })[];
  loading: boolean;
  focusedPanel: string;
  isMobile: boolean;
  onFocus: () => void;
  onNew: () => void;
  onEdit: (s: Strategy & { rules: Rule[] }) => void;
  onToggle: (id: string, isActive: boolean) => void;
  onDelete: (id: string) => void;
}

export default function StrategiesPanel({
  strategies, activeStrategies, loading, focusedPanel, isMobile,
  onFocus, onNew, onEdit, onToggle, onDelete,
}: StrategiesPanelProps) {
  return (
    <TerminalPanel
      title="STRATEGIES"
      defaultPosition={{ x: 16, y: 16 }}
      defaultSize={{ width: 580, height: 480 }}
      accentColor="#ff8c00"
      zIndex={focusedPanel === 'strategies' ? 10 : 1}
      onFocus={onFocus}
      isMobile={isMobile}
    >
      <div className="p-2">
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-xs text-gray-500 font-mono uppercase tracking-wider">
            {strategies.length} total &middot; {activeStrategies.length} active
          </span>
          <button
            onClick={onNew}
            className="font-mono text-xs px-3 py-1 text-black font-bold uppercase tracking-wider"
            style={{ background: '#ff8c00' }}
          >
            + NEW
          </button>
        </div>

        {loading ? (
          <p className="text-gray-600 text-xs font-mono px-1 py-4">Loading...</p>
        ) : strategies.length === 0 ? (
          <p className="text-gray-600 text-xs font-mono px-1 py-4">No strategies. Click + NEW to create one.</p>
        ) : (
          <table className="w-full text-[13px] font-mono">
            <thead>
              <tr className="text-gray-500 border-b border-gray-800">
                <th className="text-left py-1.5 px-2 font-normal">NAME</th>
                <th className="text-center py-1.5 px-2 font-normal">RULES</th>
                <th className="text-center py-1.5 px-2 font-normal">STATUS</th>
                <th className="text-right py-1.5 px-2 font-normal">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {strategies.map((s) => (
                <tr key={s.id} className="border-b border-gray-800/50 hover:bg-white/[0.03] transition-colors">
                  <td className="py-2.5 px-2">
                    <div className="text-gray-200 truncate max-w-[220px]">{s.name}</div>
                    {s.description && (
                      <div className="text-gray-600 truncate max-w-[220px] text-xs">{s.description}</div>
                    )}
                  </td>
                  <td className="text-center py-2.5 px-2 text-gray-400">{s.rules?.length ?? 0}</td>
                  <td className="text-center py-2.5 px-2">
                    <span style={{ color: s.is_active ? '#4ec9b0' : '#555' }}>
                      {s.is_active ? 'ACTIVE' : 'ARCHIVED'}
                    </span>
                  </td>
                  <td className="text-right py-2.5 px-2">
                    <div className="flex items-center justify-end gap-3">
                      <button onClick={() => onEdit(s)} className="text-gray-500 hover:text-blue-400 transition-colors">EDIT</button>
                      <button onClick={() => onToggle(s.id, s.is_active)} className="text-gray-500 hover:text-yellow-400 transition-colors">
                        {s.is_active ? 'ARC' : 'RST'}
                      </button>
                      <button onClick={() => onDelete(s.id)} className="text-gray-500 hover:text-red-400 transition-colors">DEL</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </TerminalPanel>
  );
}
