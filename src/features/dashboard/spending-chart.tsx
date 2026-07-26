'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { formatMoney } from '@/lib/format';

export type FlowPoint = { label: string; income: number; expense: number };

const H = 240;
const PAD_TOP = 20;
const PAD_BOTTOM = 24;

/** Ancho real del contenedor: dibujar en px reales evita distorsionar texto y marcas. */
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

/** Barra con solo los dos vértices del extremo de dato redondeados (base cuadrada). */
function bar(x: number, w: number, from: number, to: number, r: number): string {
  // from = baseline, to = extremo de dato. up si to<from.
  const rr = Math.min(r, w / 2, Math.abs(to - from));
  if (to <= from) {
    // hacia arriba: redondea arriba
    return `M ${x} ${from} L ${x} ${to + rr} Q ${x} ${to} ${x + rr} ${to} L ${x + w - rr} ${to} Q ${x + w} ${to} ${x + w} ${to + rr} L ${x + w} ${from} Z`;
  }
  // hacia abajo: redondea abajo
  return `M ${x} ${from} L ${x + w} ${from} L ${x + w} ${to - rr} Q ${x + w} ${to} ${x + w - rr} ${to} L ${x + rr} ${to} Q ${x} ${to} ${x} ${to - rr} L ${x} ${from} Z`;
}

export function SpendingChart({ data }: { data: FlowPoint[] }) {
  const t = useTranslations('dashboard.charts');
  const [ref, width] = useWidth();
  const [hover, setHover] = useState<number | null>(null);

  const hasData = data.some((d) => d.income > 0 || d.expense > 0);

  const n = data.length;
  const padX = 4;
  const plotW = Math.max(width - padX * 2, 0);
  const slot = n > 0 ? plotW / n : 0;
  const barW = Math.min(Math.max(slot * 0.56, 2), 44);
  const baseline = PAD_TOP + (H - PAD_TOP - PAD_BOTTOM) / 2;
  const halfH = (H - PAD_TOP - PAD_BOTTOM) / 2;
  const max = Math.max(...data.map((d) => Math.max(d.income, d.expense)), 1);

  const labelEvery = n <= 12 ? 1 : Math.ceil(n / 8);
  const centerX = (i: number) => padX + slot * i + slot / 2;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-4">
        <div className="flex gap-4">
          <span className="text-caption text-sage inline-flex items-center gap-1.5">
            <span className="bg-verde size-2.5 rounded-full" aria-hidden />
            {t('income')}
          </span>
          <span className="text-caption text-sage inline-flex items-center gap-1.5">
            <span className="bg-ladrillo size-2.5 rounded-full" aria-hidden />
            {t('expense')}
          </span>
        </div>
      </div>

      <div ref={ref} className="relative w-full">
        {!hasData ? (
          <div
            className="text-caption text-sage flex items-center justify-center"
            style={{ height: H }}
          >
            {t('flowEmpty')}
          </div>
        ) : (
          width > 0 && (
            <svg width={width} height={H} role="img" aria-label={t('flow')}>
              {/* línea cero */}
              <line
                x1={0}
                x2={width}
                y1={baseline}
                y2={baseline}
                stroke="var(--line-strong)"
                strokeWidth={1}
              />
              {data.map((d, i) => {
                const incTop = baseline - (d.income / max) * halfH;
                const expBottom = baseline + (d.expense / max) * halfH;
                const x = centerX(i) - barW / 2;
                const active = hover === i;
                return (
                  <g key={i} opacity={hover === null || active ? 1 : 0.45}>
                    {d.income > 0 && (
                      <path d={bar(x, barW, baseline, incTop, 3)} fill="var(--verde)" />
                    )}
                    {d.expense > 0 && (
                      <path d={bar(x, barW, baseline, expBottom, 3)} fill="var(--ladrillo)" />
                    )}
                    {i % labelEvery === 0 && (
                      <text
                        x={centerX(i)}
                        y={H - 8}
                        textAnchor="middle"
                        className="fill-sage"
                        style={{ fontSize: 10 }}
                      >
                        {d.label}
                      </text>
                    )}
                    {/* zona de hover invisible por bucket */}
                    <rect
                      x={padX + slot * i}
                      y={PAD_TOP}
                      width={slot}
                      height={H - PAD_TOP - PAD_BOTTOM}
                      fill="transparent"
                      onMouseEnter={() => setHover(i)}
                      onMouseLeave={() => setHover((h) => (h === i ? null : h))}
                    />
                  </g>
                );
              })}
            </svg>
          )
        )}

        {/* tooltip */}
        {hover !== null && data[hover] && (
          <div
            className="rounded-control border-line bg-surface pointer-events-none absolute z-10 -translate-x-1/2 border px-3 py-2 shadow-sm"
            style={{
              left: Math.min(Math.max(centerX(hover), 70), width - 70),
              top: 0,
            }}
          >
            <p className="text-caption text-ink mb-1 font-medium">{data[hover].label}</p>
            <p className="text-caption text-sage tabular flex items-center gap-1.5">
              <span className="bg-verde size-2 rounded-full" aria-hidden />
              {formatMoney(data[hover].income)}
            </p>
            <p className="text-caption text-sage tabular flex items-center gap-1.5">
              <span className="bg-ladrillo size-2 rounded-full" aria-hidden />
              {formatMoney(data[hover].expense)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
