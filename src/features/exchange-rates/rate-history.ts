/** Un punto del histórico de tasas: bolívares por 1 USD en una fecha (YYYY-MM-DD). */
export type RatePoint = { date: string; rate: number };

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
