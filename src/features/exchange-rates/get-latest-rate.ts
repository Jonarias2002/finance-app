import type { SupabaseClient } from '@supabase/supabase-js';
import type { RatePoint } from './rate-history';

export type LatestRate = {
  /** Bolívares por 1 USD. */
  rate: number;
  source: 'official' | 'parallel';
  date: string;
} | null;

/**
 * Última tasa conocida para conversiones. Usamos la paralela (referencia de
 * mercado en Venezuela). Si no hay filas, devuelve null y quien llame decide.
 */
export async function getLatestRate(supabase: SupabaseClient): Promise<LatestRate> {
  const { data } = await supabase
    .from('exchange_rates')
    .select('rate, source, rate_date')
    .eq('source', 'parallel')
    .order('rate_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  return { rate: Number(data.rate), source: data.source, date: data.rate_date as string };
}

/**
 * Histórico de tasas paralelas, más reciente primero. Se envía al formulario para
 * previsualizar la tasa de la fecha elegida sin ir al servidor en cada cambio.
 */
export async function getRateHistory(supabase: SupabaseClient, limit = 400): Promise<RatePoint[]> {
  const { data } = await supabase
    .from('exchange_rates')
    .select('rate, rate_date')
    .eq('source', 'parallel')
    .order('rate_date', { ascending: false })
    .limit(limit);

  return (data ?? []).map((r) => ({ date: r.rate_date as string, rate: Number(r.rate) }));
}

/**
 * Tasa paralela vigente en `date` (YYYY-MM-DD): la de ese día o, si no hay fila,
 * la más reciente anterior. Es la que congela un movimiento con fecha pasada.
 */
export async function getRateForDate(supabase: SupabaseClient, date: string): Promise<LatestRate> {
  const { data } = await supabase
    .from('exchange_rates')
    .select('rate, source, rate_date')
    .eq('source', 'parallel')
    .lte('rate_date', date)
    .order('rate_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  return { rate: Number(data.rate), source: data.source, date: data.rate_date as string };
}
