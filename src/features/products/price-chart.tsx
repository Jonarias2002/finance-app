'use client';

import { useEffect, useRef, useState } from 'react';
import { formatMoney, formatDayMonth } from '@/lib/format';

export type PricePoint = { date: string; usd: number; ves: number };

const H = 220;
const PAD = { top: 16, right: 16, bottom: 26, left: 52 };

function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

/** Precio unitario de un producto a lo largo del tiempo. Serie única → un color. */
export function PriceChart({
  points,
  currency,
}: {
  points: PricePoint[];
  currency: 'USD' | 'VES';
}) {
  const [ref, width] = useWidth();
  const [hover, setHover] = useState<number | null>(null);

  const values = points.map((p) => (currency === 'USD' ? p.usd : p.ves));
  const n = points.length;
  const plotW = Math.max(width - PAD.left - PAD.right, 0);
  const plotH = H - PAD.top - PAD.bottom;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || max || 1;
  const pad = span * 0.15;
  const lo = Math.max(0, min - pad);
  const hi = max + pad;

  const x = (i: number) => PAD.left + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const y = (v: number) => PAD.top + plotH - ((v - lo) / (hi - lo || 1)) * plotH;

  const fmt = (v: number) => (currency === 'USD' ? formatMoney(v) : formatMoney(v, 'VES'));
  const linePath = points
    .map((_, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(values[i]!)}`)
    .join(' ');
  const labelEvery = n <= 8 ? 1 : Math.ceil(n / 6);

  function onMove(e: React.MouseEvent<SVGRectElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const i = Math.round(((px - PAD.left) / (plotW || 1)) * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, i)));
  }

  return (
    <div ref={ref} className="relative w-full">
      {width > 0 && n > 0 && (
        <svg width={width} height={H} role="img">
          {/* gridlines y etiquetas Y (min y max) */}
          {[hi, lo].map((v, k) => (
            <g key={k}>
              <line
                x1={PAD.left}
                x2={width - PAD.right}
                y1={y(v)}
                y2={y(v)}
                stroke="var(--line)"
                strokeWidth={1}
              />
              <text
                x={PAD.left - 8}
                y={y(v) + 3}
                textAnchor="end"
                className="fill-sage"
                style={{ fontSize: 10 }}
              >
                {fmt(v)}
              </text>
            </g>
          ))}

          <path
            d={linePath}
            fill="none"
            stroke="var(--ink)"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {points.map((_, i) => (
            <circle
              key={i}
              cx={x(i)}
              cy={y(values[i]!)}
              r={hover === i ? 4.5 : 3}
              fill="var(--surface)"
              stroke="var(--ink)"
              strokeWidth={2}
            />
          ))}

          {points.map((p, i) =>
            i % labelEvery === 0 ? (
              <text
                key={i}
                x={x(i)}
                y={H - 8}
                textAnchor="middle"
                className="fill-sage"
                style={{ fontSize: 10 }}
              >
                {formatDayMonth(p.date)}
              </text>
            ) : null,
          )}

          {hover !== null && (
            <line
              x1={x(hover)}
              x2={x(hover)}
              y1={PAD.top}
              y2={PAD.top + plotH}
              stroke="var(--line-strong)"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
          )}

          <rect
            x={PAD.left}
            y={PAD.top}
            width={plotW}
            height={plotH}
            fill="transparent"
            onMouseMove={onMove}
            onMouseLeave={() => setHover(null)}
          />
        </svg>
      )}

      {hover !== null && points[hover] && (
        <div
          className="rounded-control border-line bg-surface pointer-events-none absolute z-10 -translate-x-1/2 border px-3 py-2 shadow-sm"
          style={{ left: Math.min(Math.max(x(hover), 60), width - 60), top: 0 }}
        >
          <p className="text-caption text-ink tabular font-medium">{fmt(values[hover]!)}</p>
          <p className="text-caption text-sage tabular">{formatDayMonth(points[hover].date)}</p>
        </div>
      )}
    </div>
  );
}
