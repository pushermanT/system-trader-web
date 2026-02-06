'use client';

import { useEffect, useRef } from 'react';
import { createChart, LineSeries, IChartApi } from 'lightweight-charts';
import { PnlDataPoint } from '@/lib/chart-utils';
import { formatCurrency } from '@/lib/utils';

interface PnlChartProps {
  data: PnlDataPoint[];
}

export default function PnlChart({ data }: PnlChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    if (data.length === 0) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
      layout: {
        background: { color: '#0d0d0d' },
        textColor: '#666',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: '#1a1a1a' },
        horzLines: { color: '#1a1a1a' },
      },
      crosshair: {
        vertLine: { color: '#444', labelBackgroundColor: '#222' },
        horzLine: { color: '#444', labelBackgroundColor: '#222' },
      },
      rightPriceScale: {
        borderColor: '#222',
      },
      timeScale: {
        borderColor: '#222',
        timeVisible: false,
      },
    });
    chartRef.current = chart;

    const endValue = data[data.length - 1]?.value ?? 0;
    const lineColor = endValue >= 0 ? '#4ec9b0' : '#f44747';

    const lineSeries = chart.addSeries(LineSeries, {
      color: lineColor,
      lineWidth: 2,
      priceFormat: {
        type: 'custom',
        formatter: (price: number) => formatCurrency(price),
      },
      crosshairMarkerRadius: 4,
      crosshairMarkerBackgroundColor: lineColor,
    });
    lineSeries.setData(data as any);

    // Zero-line
    lineSeries.createPriceLine({
      price: 0,
      color: '#555',
      lineWidth: 1,
      lineStyle: 2, // Dashed
      axisLabelVisible: true,
      title: '',
    });

    chart.timeScale().fitContent();

    // Responsive resize
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          chart.applyOptions({ width, height });
        }
      }
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full font-mono text-sm text-gray-600 tracking-wider">
        NO CLOSED TRADES
      </div>
    );
  }

  if (data.length === 1) {
    const point = data[0];
    const color = point.value >= 0 ? '#4ec9b0' : '#f44747';
    return (
      <div className="flex items-center justify-center h-full font-mono text-sm text-gray-500 tracking-wider">
        <div className="text-center">
          <div className="mb-1">1 CLOSED TRADE</div>
          <div style={{ color, fontSize: 18 }}>{formatCurrency(point.value)}</div>
          <div className="mt-1 text-gray-600">{point.time}</div>
        </div>
      </div>
    );
  }

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}
