'use client';

import { Strategy, Rule } from '@/lib/types';

interface StrategiesTableProps {
  strategies: (Strategy & { rules: Rule[] })[];
  loading: boolean;
  onNew: () => void;
  onEdit: (s: Strategy & { rules: Rule[] }) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
  onDelete: (id: string) => void;
}

export default function StrategiesTable({ strategies, loading, onNew, onEdit, onToggleActive, onDelete }: StrategiesTableProps) {
  const activeCount = strategies.filter((s) => s.is_active).length;

  return (
    <div className="p-2">
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-sm text-gray-500 font-mono uppercase tracking-wider">
          {strategies.length} total &middot; {activeCount} active
        </span>
        <button onClick={onNew}
          className="font-mono text-sm px-3 py-1 text-black font-bold uppercase tracking-wider" style={{ background: '#ff8c00' }}>+ NEW</button>
      </div>
      {loading ? (
        <p className="text-gray-600 text-sm font-mono px-1 py-4">Loading...</p>
      ) : strategies.length === 0 ? (
        <p className="text-gray-600 text-sm font-mono px-1 py-4">No strategies. Click + NEW to create one.</p>
      ) : (
        <table className="w-full text-[15px] font-mono">
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
                  {s.description && <div className="text-gray-600 truncate max-w-[220px] text-sm">{s.description}</div>}
                </td>
                <td className="text-center py-2.5 px-2 text-gray-400">{s.rules?.length ?? 0}</td>
                <td className="text-center py-2.5 px-2">
                  <span style={{ color: s.is_active ? '#4ec9b0' : '#555' }}>{s.is_active ? 'ACTIVE' : 'ARCHIVED'}</span>
                </td>
                <td className="text-right py-2.5 px-2">
                  <div className="flex items-center justify-end gap-3">
                    <button onClick={() => onEdit(s)} className="text-gray-500 hover:text-blue-400 transition-colors">EDIT</button>
                    <button onClick={() => onToggleActive(s.id, s.is_active)} className="text-gray-500 hover:text-yellow-400 transition-colors">{s.is_active ? 'ARC' : 'RST'}</button>
                    <button onClick={() => onDelete(s.id)} className="text-gray-500 hover:text-red-400 transition-colors">DEL</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
