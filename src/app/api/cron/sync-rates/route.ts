import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/** Fecha de hoy en America/Caracas (ADR 13), formato YYYY-MM-DD. */
function caracasToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Caracas' }).format(new Date());
}

type DolarItem = {
  fuente: string;
  promedio: number | null;
  venta: number | null;
  compra: number | null;
};

type RateRow = {
  rate_date: string;
  source: 'official' | 'parallel';
  rate: number;
  fetched_at: string;
};

const SOURCE_MAP: Record<string, 'official' | 'parallel'> = {
  oficial: 'official',
  paralelo: 'parallel',
};

/**
 * Sincroniza las tasas del día desde DolarAPI (ADR 11) a `exchange_rates`.
 * Se autentica con CRON_SECRET, no con sesión. Si la API falla, deja la última
 * tasa conocida (no borra nada) y responde con error para que el cron lo registre.
 */
export async function GET(request: Request) {
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let items: DolarItem[];
  try {
    const res = await fetch(process.env.EXCHANGE_API_URL!, { cache: 'no-store' });
    if (!res.ok) throw new Error(`upstream ${res.status}`);
    items = (await res.json()) as DolarItem[];
  } catch (error) {
    return NextResponse.json({ error: 'upstream_failed', detail: String(error) }, { status: 502 });
  }

  const rateDate = caracasToday();
  const fetchedAt = new Date().toISOString();
  const rows: RateRow[] = [];
  for (const item of items) {
    const source = SOURCE_MAP[item.fuente];
    const rate = item.promedio ?? item.venta ?? item.compra;
    if (source && rate && rate > 0) {
      rows.push({ rate_date: rateDate, source, rate, fetched_at: fetchedAt });
    }
  }

  if (rows.length === 0) {
    return NextResponse.json({ error: 'no_valid_rates' }, { status: 502 });
  }

  // Escribe con la service_role key: exchange_rates no tiene política de escritura
  // para usuarios normales a propósito.
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('exchange_rates')
    .upsert(rows, { onConflict: 'rate_date,source' });
  if (error) {
    return NextResponse.json({ error: 'db', detail: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, rateDate, count: rows.length });
}
