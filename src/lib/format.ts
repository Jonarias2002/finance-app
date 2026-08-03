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

// --- Campos de monto -------------------------------------------------------
// Convención es-VE: el punto separa los miles y la coma los decimales. Estas tres
// funciones existen para que nadie tenga que teclear ni el punto ni la coma.

/**
 * Da forma a lo que se está escribiendo: "1284500" -> "1.284.500", "1284,5" ->
 * "1.284,5". Descarta lo que no sea dígito o coma, agrupa los miles y recorta a
 * dos decimales. Pensado para llamarse en cada tecla.
 */
export function formatAmountInput(text: string): string {
  const cleaned = text.replace(/[^\d,]/g, '');
  const [rawInt = '', ...rest] = cleaned.split(',');
  // Sin ceros a la izquierda, pero "0" y "0,50" siguen siendo válidos.
  const int = rawInt.replace(/^0+(?=\d)/, '');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  if (!cleaned.includes(',')) return grouped;
  return `${grouped},${rest.join('').slice(0, 2)}`;
}

/** Al salir del campo: "1.284" -> "1.284,00", "1.284,5" -> "1.284,50". */
export function completeAmountInput(text: string): string {
  if (!text.trim()) return '';
  const [int = '', dec = ''] = formatAmountInput(text).split(',');
  return `${int || '0'},${(dec + '00').slice(0, 2)}`;
}

/** 1284.5 -> "1.284,50", para precargar el campo al editar. */
export function amountToInput(amount: number): string {
  return completeAmountInput(String(amount).replace('.', ','));
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
