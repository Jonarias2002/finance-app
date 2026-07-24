import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/layout/app-shell';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  // Tasa del día para el sello de la barra superior. Aún no hay sincronización
  // (§12), así que si no hay filas se muestra como desactualizada.
  const { data } = await supabase
    .from('exchange_rates')
    .select('rate, source, rate_date')
    .order('rate_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  const rate = data
    ? {
        value: Number(data.rate),
        source: data.source === 'parallel' ? ('Paralelo' as const) : ('BCV' as const),
        date: data.rate_date as string,
        stale: false,
      }
    : { value: 0, source: 'BCV' as const, date: new Date(), stale: true };

  return <AppShell rate={rate}>{children}</AppShell>;
}
