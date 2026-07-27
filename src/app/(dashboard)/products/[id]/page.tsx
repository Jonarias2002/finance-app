import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ProductDetail } from '@/features/products/product-detail';
import type { PricePoint } from '@/features/products/price-chart';
import type { ProductUnit } from '@/features/products/schemas';

function one<T>(embed: unknown): T | null {
  if (Array.isArray(embed)) return (embed[0] as T) ?? null;
  return (embed as T) ?? null;
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: product } = await supabase
    .from('products')
    .select(
      'id, name, unit, is_staple, typical_days, is_recurring, recurring_day, categories(name)',
    )
    .eq('id', id)
    .maybeSingle();
  if (!product) redirect('/manage?tab=products');

  const { data: prices } = await supabase
    .from('price_records')
    .select('unit_price_usd, exchange_rate, recorded_at')
    .eq('product_id', id)
    .order('recorded_at', { ascending: true });

  const points: PricePoint[] = (prices ?? []).map((p) => {
    const usd = Number(p.unit_price_usd);
    return {
      date: p.recorded_at as string,
      usd,
      ves: Math.round(usd * Number(p.exchange_rate) * 100) / 100,
    };
  });

  const category = one<{ name: string }>(product.categories);

  return (
    <ProductDetail
      name={product.name as string}
      unit={product.unit as ProductUnit}
      categoryName={category?.name ?? null}
      isStaple={product.is_staple as boolean}
      typicalDays={(product.typical_days as number | null) ?? null}
      recurringDay={
        (product.is_recurring as boolean)
          ? ((product.recurring_day as number | null) ?? null)
          : null
      }
      points={points}
    />
  );
}
