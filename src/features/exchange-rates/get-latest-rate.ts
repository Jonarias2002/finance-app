import type { SupabaseClient } from '@supabase/supabase-js';
import {
  DEFAULT_RATE_SOURCE,
  RATE_SOURCES,
  type RateHistories,
  type RatePoint,
  type RateSource,
} from './rate-history';

export type LatestRate = {
  /** Bolívares por 1 USD. */
  rate: number;
  source: RateSource;
  date: string;
} | null;

/**
 * Última tasa conocida para conversiones, del BCV salvo que se pida otra fuente.
 * Si no hay filas, devuelve null y quien llame decide.
 */
export async function getLatestRate(
  supabase: SupabaseClient,
  source: RateSource = DEFAULT_RATE_SOURCE,
): Promise<LatestRate> {
  const { data } = await supabase
    .from('exchange_rates')
    .select('rate, source, rate_date')
    .eq('source', source)
    .order('rate_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  return { rate: Number(data.rate), source: data.source, date: data.rate_date as string };
}

/**
 * Histórico de las dos fuentes, más reciente primero. Se envía completo al
 * formulario para previsualizar la tasa de la fecha elegida —y de la fuente
 * elegida— sin ir al servidor en cada cambio.
 */
export async function getRateHistories(
  supabase: SupabaseClient,
  limit = 400,
): Promise<RateHistories> {
  const { data } = await supabase
    .from('exchange_rates')
    .select('rate, rate_date, source')
    .order('rate_date', { ascending: false })
    .limit(limit * RATE_SOURCES.length);

  const histories: RateHistories = { official: [], parallel: [] };
  for (const row of data ?? []) {
    const source = row.source as RateSource;
    const bucket = histories[source];
    // Una fuente desconocida (o añadida después) no debe romper el formulario.
    if (bucket) bucket.push({ date: row.rate_date as string, rate: Number(row.rate) });
  }
  return histories;
}

/**
 * Tasa vigente en `date` (YYYY-MM-DD) para la fuente pedida: la de ese día o, si
 * no hay fila, la más reciente anterior. Es la que congela un movimiento con
 * fecha pasada.
 */
export async function getRateForDate(
  supabase: SupabaseClient,
  date: string,
  source: RateSource = DEFAULT_RATE_SOURCE,
): Promise<LatestRate> {
  const { data } = await supabase
    .from('exchange_rates')
    .select('rate, source, rate_date')
    .eq('source', source)
    .lte('rate_date', date)
    .order('rate_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  return { rate: Number(data.rate), source: data.source, date: data.rate_date as string };
}

export type { RatePoint, RateSource };
