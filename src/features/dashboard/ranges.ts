export const RANGES = ['week', 'month', '3m', '6m'] as const;
export type Range = (typeof RANGES)[number];
export const DEFAULT_RANGE: Range = 'month';

export function parseRange(value: string | undefined): Range {
  return (RANGES as readonly string[]).includes(value ?? '') ? (value as Range) : DEFAULT_RANGE;
}

export type Bucket = { key: string; label: string };
export type RangeConfig = {
  /** Límite inferior del rango, en ISO con offset de Caracas, para filtrar en SQL. */
  startIso: string;
  granularity: 'day' | 'month';
  buckets: Bucket[];
};

const parse = (s: string) => {
  const [y, m, d] = s.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d));
};
const ymd = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Construye los buckets ordenados del rango terminando hoy (fecha Caracas).
 * `week`/`month` agrupan por día; `3m`/`6m` por mes. Aritmética en UTC sobre
 * fechas-sin-hora para no arrastrar la zona horaria.
 */
export function buildRange(range: Range, today: string, locale: string): RangeConfig {
  const end = parse(today);

  if (range === 'week' || range === 'month') {
    const days = range === 'week' ? 7 : 30;
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - (days - 1));
    const fmt = new Intl.DateTimeFormat(locale, { day: 'numeric', timeZone: 'UTC' });
    const buckets: Bucket[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setUTCDate(d.getUTCDate() + i);
      buckets.push({ key: ymd(d), label: fmt.format(d) });
    }
    return { startIso: `${ymd(start)}T00:00:00-04:00`, granularity: 'day', buckets };
  }

  const months = range === '3m' ? 3 : 6;
  const startMonth = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - (months - 1), 1));
  const fmt = new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' });
  const buckets: Bucket[] = [];
  for (let i = 0; i < months; i++) {
    const d = new Date(Date.UTC(startMonth.getUTCFullYear(), startMonth.getUTCMonth() + i, 1));
    buckets.push({ key: ymd(d).slice(0, 7), label: fmt.format(d) });
  }
  return { startIso: `${ymd(startMonth)}T00:00:00-04:00`, granularity: 'month', buckets };
}
