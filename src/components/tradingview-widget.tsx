'use client';

import { useEffect, useRef, memo } from 'react';

interface TradingViewWidgetProps {
  symbol: string;
  interval?: string;
  height?: number;
  autosize?: boolean;
}

function TradingViewWidgetInner({ symbol, interval = 'D', height = 400, autosize = true }: TradingViewWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Clear previous widget
    container.innerHTML = '';

    const widgetDiv = document.createElement('div');
    widgetDiv.className = 'tradingview-widget-container__widget';
    widgetDiv.style.height = autosize ? '100%' : `${height}px`;
    widgetDiv.style.width = '100%';
    container.appendChild(widgetDiv);

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol,
      interval,
      timezone: 'Etc/UTC',
      theme: 'dark',
      style: '1',
      locale: 'en',
      backgroundColor: '#0d0d0d',
      gridColor: '#1a1a1a',
      hide_top_toolbar: false,
      hide_legend: false,
      allow_symbol_change: true,
      save_image: false,
      calendar: false,
      hide_volume: false,
      support_host: 'https://www.tradingview.com',
      overrides: {
        'paneProperties.background': '#0d0d0d',
        'paneProperties.backgroundType': 'solid',
        'mainSeriesProperties.candleStyle.upColor': '#4ec9b0',
        'mainSeriesProperties.candleStyle.downColor': '#f44747',
        'mainSeriesProperties.candleStyle.wickUpColor': '#4ec9b0',
        'mainSeriesProperties.candleStyle.wickDownColor': '#f44747',
        'mainSeriesProperties.candleStyle.borderUpColor': '#4ec9b0',
        'mainSeriesProperties.candleStyle.borderDownColor': '#f44747',
      },
    });
    container.appendChild(script);

    return () => {
      container.innerHTML = '';
    };
  }, [symbol, interval, height, autosize]);

  return (
    <div
      ref={containerRef}
      className="tradingview-widget-container"
      style={{ height: autosize ? '100%' : height, width: '100%' }}
    />
  );
}

const TradingViewWidget = memo(TradingViewWidgetInner);
export default TradingViewWidget;
