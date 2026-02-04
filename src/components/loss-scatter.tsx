'use client';

import { useRef, useEffect } from 'react';
import { Trade } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

interface LossScatterProps {
  trades: Trade[];
}

export default function LossScatter({ trades }: LossScatterProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Only losing trades with stop_loss_price set
  const dataPoints = trades
    .filter((t) => t.outcome === 'Loss' && t.pnl !== null && t.stop_loss_price !== null)
    .map((t) => ({
      planned: Math.abs(t.entry_price - t.stop_loss_price!) * t.quantity,
      actual: Math.abs(t.pnl!),
      symbol: t.symbol,
    }));

  const followedStop = dataPoints.filter((d) => d.actual <= d.planned * 1.1);
  const brokeStop = dataPoints.filter((d) => d.actual > d.planned * 1.1);

  const avgFollowed = followedStop.length > 0
    ? followedStop.reduce((s, d) => s + d.actual, 0) / followedStop.length : null;
  const avgBroke = brokeStop.length > 0
    ? brokeStop.reduce((s, d) => s + d.actual, 0) / brokeStop.length : null;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || dataPoints.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    const padding = { top: 20, right: 20, bottom: 30, left: 50 };
    const plotW = w - padding.left - padding.right;
    const plotH = h - padding.top - padding.bottom;

    const maxVal = Math.max(
      ...dataPoints.map((d) => d.planned),
      ...dataPoints.map((d) => d.actual)
    ) * 1.1;

    ctx.clearRect(0, 0, w, h);

    // Axes
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, h - padding.bottom);
    ctx.lineTo(w - padding.right, h - padding.bottom);
    ctx.stroke();

    // Diagonal "stayed within stop" line
    ctx.strokeStyle = '#333';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(padding.left, h - padding.bottom);
    ctx.lineTo(
      padding.left + plotW,
      padding.top
    );
    ctx.stroke();
    ctx.setLineDash([]);

    // Labels
    ctx.fillStyle = '#555';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('PLANNED LOSS →', padding.left + plotW / 2, h - 5);
    ctx.save();
    ctx.translate(12, padding.top + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('ACTUAL LOSS →', 0, 0);
    ctx.restore();

    // Plot dots
    dataPoints.forEach((d) => {
      const x = padding.left + (d.planned / maxVal) * plotW;
      const y = h - padding.bottom - (d.actual / maxVal) * plotH;
      const blew = d.actual > d.planned * 1.1;
      const intensity = blew
        ? Math.min(1, (d.actual - d.planned) / d.planned)
        : 0;

      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      if (blew) {
        const r = Math.round(244 * (0.5 + intensity * 0.5));
        ctx.fillStyle = `rgba(${r}, 71, 71, 0.8)`;
      } else {
        ctx.fillStyle = 'rgba(78, 201, 176, 0.7)';
      }
      ctx.fill();
    });
  }, [dataPoints]);

  if (dataPoints.length === 0) {
    return (
      <div className="p-4 font-mono text-xs text-gray-600 tracking-wider">
        Set stop-loss prices on your trades to see loss escalation data.
      </div>
    );
  }

  return (
    <div className="p-3">
      <canvas ref={canvasRef} className="w-full" style={{ height: 180 }} />
      <div className="flex justify-between mt-2 font-mono text-xs text-gray-500">
        {avgFollowed !== null && (
          <span>
            Avg loss (followed stop): <span style={{ color: '#4ec9b0' }}>{formatCurrency(avgFollowed)}</span>
          </span>
        )}
        {avgBroke !== null && (
          <span>
            Avg loss (broke stop): <span style={{ color: '#f44747' }}>{formatCurrency(avgBroke)}</span>
          </span>
        )}
      </div>
      <div className="flex gap-4 mt-1 font-mono text-[10px] text-gray-600">
        <span><span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: '#4ec9b0' }} />Within stop</span>
        <span><span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: '#f44747' }} />Blew through</span>
        <span className="text-gray-700">- - - Diagonal = stayed within stop</span>
      </div>
    </div>
  );
}
