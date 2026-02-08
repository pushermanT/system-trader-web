'use client';

import React, { useState } from 'react';
import { Trade } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { SortableHeader, SortField, SortDir } from '@/components/trade-filters';

interface TradesTableProps {
  trades: Trade[];
  isMobile: boolean;
  sortField: SortField;
  sortDir: SortDir;
  onSort: (f: SortField) => void;
  pnlColor: (pnl: number | null) => string;
  outcomeColor: (o: string) => string;
  onEdit: (t: Trade) => void;
  onDelete: (id: string) => void;
  onSelect: (t: Trade) => void;
}

export default function TradesTable({
  trades, isMobile, sortField, sortDir, onSort,
  pnlColor, outcomeColor, onEdit, onDelete, onSelect,
}: TradesTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (isMobile) {
    return (
      <table className="w-full text-[15px] font-mono">
        <thead>
          <tr className="text-gray-500 border-b border-gray-800">
            <th className="text-left py-1.5 px-2 font-normal">SYM</th>
            <th className="text-center py-1.5 px-2 font-normal">DIR</th>
            <th className="text-right py-1.5 px-2 font-normal">P&L</th>
            <th className="text-center py-1.5 px-2 font-normal">OUT</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((t) => (
            <React.Fragment key={t.id}>
              <tr
                className="border-b border-gray-800/50 hover:bg-white/[0.03] transition-colors cursor-pointer"
                onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
              >
                <td className="py-2.5 px-2 text-gray-200 font-medium">{t.symbol}</td>
                <td className="text-center py-2.5 px-2">
                  <span style={{ color: t.direction === 'Long' ? '#4ec9b0' : '#f44747' }}>
                    {t.direction === 'Long' ? 'LNG' : 'SHT'}
                  </span>
                </td>
                <td className="text-right py-2.5 px-2 font-medium" style={{ color: pnlColor(t.pnl) }}>
                  {t.pnl !== null ? formatCurrency(t.pnl) : '—'}
                </td>
                <td className="text-center py-2.5 px-2">
                  <span style={{ color: outcomeColor(t.outcome) }}>
                    {t.outcome === 'Breakeven' ? 'BE' : t.outcome.toUpperCase()}
                  </span>
                </td>
              </tr>
              {expandedId === t.id && (
                <tr className="border-b border-gray-800/50">
                  <td colSpan={4} className="py-2 px-3 text-[14px]" style={{ background: '#0a0a0a' }}>
                    <div className="grid grid-cols-2 gap-1 text-gray-400 mb-2">
                      <span>STRAT: <span className="text-gray-300">{t.strategy_name}</span></span>
                      <span>QTY: <span className="text-gray-300">{t.quantity}</span></span>
                      <span>ENTRY: <span className="text-gray-300">{formatCurrency(t.entry_price)}</span></span>
                      <span>EXIT: <span className="text-gray-300">{t.exit_price !== null ? formatCurrency(t.exit_price) : '—'}</span></span>
                    </div>
                    <div className="flex gap-4">
                      <button onClick={(e) => { e.stopPropagation(); onSelect(t); }} className="text-gray-500 hover:text-blue-400">VIEW</button>
                      <button onClick={(e) => { e.stopPropagation(); onEdit(t); }} className="text-gray-500 hover:text-blue-400">EDIT</button>
                      <button onClick={(e) => { e.stopPropagation(); onDelete(t.id); }} className="text-gray-500 hover:text-red-400">DEL</button>
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    );
  }

  return (
    <table className="w-full text-[15px] font-mono">
      <thead>
        <tr className="text-gray-500 border-b border-gray-800">
          <SortableHeader label="SYM" field="symbol" sortField={sortField} sortDir={sortDir} onSort={onSort} />
          <th className="text-left py-1.5 px-2 font-normal">STRAT</th>
          <th className="text-center py-1.5 px-2 font-normal">DIR</th>
          <th className="text-right py-1.5 px-2 font-normal">ENTRY</th>
          <th className="text-right py-1.5 px-2 font-normal">EXIT</th>
          <SortableHeader label="QTY" field="quantity" sortField={sortField} sortDir={sortDir} onSort={onSort} />
          <SortableHeader label="P&L" field="pnl" sortField={sortField} sortDir={sortDir} onSort={onSort} />
          <th className="text-center py-1.5 px-2 font-normal">OUT</th>
          <SortableHeader label="DATE" field="entry_date" sortField={sortField} sortDir={sortDir} onSort={onSort} />
          <th className="text-right py-1.5 px-2 font-normal">ACT</th>
        </tr>
      </thead>
      <tbody>
        {trades.map((t) => (
          <tr
            key={t.id}
            className="border-b border-gray-800/50 hover:bg-white/[0.03] transition-colors cursor-pointer"
            onClick={() => onSelect(t)}
          >
            <td className="py-2.5 px-2 text-gray-200 font-medium">{t.symbol}</td>
            <td className="py-2.5 px-2 text-gray-500 truncate max-w-[120px]">{t.strategy_name}</td>
            <td className="text-center py-2.5 px-2">
              <span style={{ color: t.direction === 'Long' ? '#4ec9b0' : '#f44747' }}>
                {t.direction === 'Long' ? 'LNG' : 'SHT'}
              </span>
            </td>
            <td className="text-right py-2.5 px-2 text-gray-300">{formatCurrency(t.entry_price)}</td>
            <td className="text-right py-2.5 px-2 text-gray-300">{t.exit_price !== null ? formatCurrency(t.exit_price) : '—'}</td>
            <td className="text-right py-2.5 px-2 text-gray-400">{t.quantity}</td>
            <td className="text-right py-2.5 px-2 font-medium" style={{ color: pnlColor(t.pnl) }}>
              {t.pnl !== null ? formatCurrency(t.pnl) : '—'}
            </td>
            <td className="text-center py-2.5 px-2">
              <span style={{ color: outcomeColor(t.outcome) }}>
                {t.outcome === 'Breakeven' ? 'BE' : t.outcome.toUpperCase()}
              </span>
            </td>
            <td className="text-right py-2.5 px-2 text-gray-500 text-[13px]">
              {new Date(t.entry_date).toLocaleDateString()}
            </td>
            <td className="text-right py-2.5 px-2">
              <div className="flex items-center justify-end gap-3">
                <button onClick={(e) => { e.stopPropagation(); onEdit(t); }} className="text-gray-500 hover:text-blue-400 transition-colors">EDIT</button>
                <button onClick={(e) => { e.stopPropagation(); onDelete(t.id); }} className="text-gray-500 hover:text-red-400 transition-colors">DEL</button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
