/** Un punto del histórico de tasas: bolívares por 1 USD en una fecha (YYYY-MM-DD). */
export type RatePoint = { date: string; rate: number };

/** Las dos fuentes que sincroniza el cron desde DolarAPI: BCV y mercado paralelo. */
export type RateSource = 'official' | 'parallel';
export const RATE_SOURCES: readonly RateSource[] = ['official', 'parallel'];

/**
 * Tasa de referencia por defecto en toda la app. El BCV es la oficial y la que el
 * usuario espera ver; el formulario de movimiento permite cambiar a la paralela
 * caso por caso.
 */
export const DEFAULT_RATE_SOURCE: RateSource = 'official';

/** Histórico por fuente, cada uno ordenado por fecha descendente. */
export type RateHistories = Record<RateSource, RatePoint[]>;

/**
 * Tasa vigente en `date`: la de ese mismo día o, si no hay fila, la más reciente
 * anterior. `history` debe venir ordenado por fecha descendente (como lo entrega
 * `getRateHistory`). Módulo puro sin dependencias de servidor: se usa igual en el
 * cliente para previsualizar y en el servidor para congelar la tasa.
 */
export function rateOnOrBefore(history: RatePoint[], date: string): RatePoint | null {
  for (const point of history) {
    if (point.date <= date) return point;
  }
  return null;
}
