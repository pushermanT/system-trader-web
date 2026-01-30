'use client';

import { useState, useRef, useCallback, useEffect, ReactNode } from 'react';

interface TerminalPanelProps {
  title: string;
  children: ReactNode;
  defaultPosition: { x: number; y: number };
  defaultSize: { width: number; height: number };
  accentColor?: string;
  onFocus?: () => void;
  zIndex?: number;
  isMobile?: boolean;
}

export default function TerminalPanel({
  title,
  children,
  defaultPosition,
  defaultSize,
  accentColor = '#ff8c00',
  onFocus,
  zIndex = 1,
  isMobile = false,
}: TerminalPanelProps) {
  const [pos, setPos] = useState(defaultPosition);
  const [size, setSize] = useState(defaultSize);
  const [minimized, setMinimized] = useState(false);
  const dragging = useRef(false);
  const resizing = useRef(false);
  const offset = useRef({ x: 0, y: 0 });

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest('[data-no-drag]')) return;
      e.preventDefault();
      dragging.current = true;
      offset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
      onFocus?.();
    },
    [pos, onFocus]
  );

  const handleResizeDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      resizing.current = true;
      offset.current = { x: e.clientX, y: e.clientY };
      onFocus?.();
    },
    [onFocus]
  );

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (dragging.current) {
        setPos({ x: e.clientX - offset.current.x, y: e.clientY - offset.current.y });
      }
      if (resizing.current) {
        const dx = e.clientX - offset.current.x;
        const dy = e.clientY - offset.current.y;
        offset.current = { x: e.clientX, y: e.clientY };
        setSize((s) => ({
          width: Math.max(320, s.width + dx),
          height: Math.max(200, s.height + dy),
        }));
      }
    }
    function handleMouseUp() {
      dragging.current = false;
      resizing.current = false;
    }
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  if (isMobile) {
    return (
      <div className="mb-3">
        {/* Title bar */}
        <div
          className="flex items-center justify-between px-3 py-1.5"
          style={{
            background: `linear-gradient(180deg, ${accentColor}22 0%, ${accentColor}11 100%)`,
            borderTop: `2px solid ${accentColor}`,
            borderLeft: '1px solid #333',
            borderRight: '1px solid #333',
          }}
        >
          <span
            className="text-xs font-bold uppercase tracking-widest font-mono"
            style={{ color: accentColor }}
          >
            {title}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setMinimized((m) => !m)}
              className="w-4 h-4 rounded-sm flex items-center justify-center text-[10px] text-gray-500 hover:text-white hover:bg-gray-700 transition-colors"
            >
              {minimized ? '□' : '—'}
            </button>
          </div>
        </div>

        {/* Body */}
        {!minimized && (
          <div
            className="overflow-x-auto overflow-y-auto"
            style={{
              maxHeight: 400,
              background: '#0d0d0d',
              border: '1px solid #333',
              borderTop: 'none',
            }}
          >
            {children}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="absolute select-none"
      style={{
        left: pos.x,
        top: pos.y,
        width: size.width,
        zIndex,
      }}
      onMouseDown={() => onFocus?.()}
    >
      {/* Title bar */}
      <div
        className="flex items-center justify-between px-3 py-1.5 cursor-move"
        style={{
          background: `linear-gradient(180deg, ${accentColor}22 0%, ${accentColor}11 100%)`,
          borderTop: `2px solid ${accentColor}`,
          borderLeft: '1px solid #333',
          borderRight: '1px solid #333',
        }}
        onMouseDown={handleMouseDown}
      >
        <span
          className="text-xs font-bold uppercase tracking-widest font-mono"
          style={{ color: accentColor }}
        >
          {title}
        </span>
        <div className="flex items-center gap-1" data-no-drag>
          <button
            onClick={() => setMinimized((m) => !m)}
            className="w-4 h-4 rounded-sm flex items-center justify-center text-[10px] text-gray-500 hover:text-white hover:bg-gray-700 transition-colors"
          >
            {minimized ? '□' : '—'}
          </button>
        </div>
      </div>

      {/* Body */}
      {!minimized && (
        <div
          className="overflow-hidden flex flex-col"
          style={{
            height: size.height,
            background: '#0d0d0d',
            border: '1px solid #333',
            borderTop: 'none',
          }}
        >
          <div className="flex-1 overflow-y-auto overflow-x-hidden">{children}</div>

          {/* Resize handle */}
          <div
            className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize"
            style={{
              background: `linear-gradient(135deg, transparent 50%, ${accentColor}44 50%)`,
            }}
            onMouseDown={handleResizeDown}
          />
        </div>
      )}
    </div>
  );
}
