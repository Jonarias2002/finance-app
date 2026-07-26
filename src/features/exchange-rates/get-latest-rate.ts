import type { SupabaseClient } from '@supabase/supabase-js';

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
