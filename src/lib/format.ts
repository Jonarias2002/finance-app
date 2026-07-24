export type Currency = 'USD' | 'VES';

const SYMBOL: Record<Currency, string> = { USD: '$', VES: 'Bs' };
const THIN_SPACE = ' ';

const numberFormat = new Intl.NumberFormat('es-VE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** 1284.5 -> "$ 1.284,50" */
export function formatMoney(amount: number, currency: Currency = 'USD'): string {
  return `${SYMBOL[currency]}${THIN_SPACE}${numberFormat.format(Math.abs(amount))}`;
}

/** Antepone + o - según el signo. Nunca dependas solo del color. */
export function formatSigned(amount: number, currency: Currency = 'USD'): string {
  const sign = amount < 0 ? '−' : '+';
  return `${sign}${THIN_SPACE}${formatMoney(amount, currency)}`;
}

/** 380 -> "380,00" */
export function formatRate(rate: number): string {
  return numberFormat.format(rate);
}

/** 0.44 -> "44 %" */
export function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 100)}${THIN_SPACE}%`;
}

/** Fecha corta en la zona horaria del usuario: "23/07" */
export function formatShortDate(date: Date | string, timeZone = 'America/Caracas'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('es-VE', { day: '2-digit', month: '2-digit', timeZone }).format(d);
}

/** "23 jul" */
export function formatDayMonth(date: Date | string, timeZone = 'America/Caracas'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('es-VE', { day: 'numeric', month: 'short', timeZone }).format(d);
}
