import { createClient } from '@/lib/supabase/server';
import { ProductsManager } from '@/features/products/products-manager';
import type { CategoryOption, ProductRow, StoreRow } from '@/features/products/schemas';

function one<T>(embed: unknown): T | null {
  if (Array.isArray(embed)) return (embed[0] as T) ?? null;
  return (embed as T) ?? null;
}

export default async function ProductsPage() {
  const supabase = await createClient();

  const [{ data: products }, { data: stores }, { data: categories }] = await Promise.all([
    supabase
      .from('products')
      .select(
        'id, name, unit, default_category_id, is_staple, typical_days, is_recurring, recurring_day, categories(name)',
      )
      .order('name'),
    supabase.from('stores').select('id, name').order('name'),
    supabase.from('categories').select('id, name').eq('kind', 'expense').order('name'),
  ]);

  const productRows: ProductRow[] = (products ?? []).map((p) => {
    const category = one<{ name: string }>(p.categories);
    return {
      id: p.id as string,
      name: p.name as string,
      unit: p.unit as ProductRow['unit'],
      defaultCategoryId: (p.default_category_id as string | null) ?? null,
      defaultCategoryName: category?.name ?? null,
      isStaple: p.is_staple as boolean,
      typicalDays: (p.typical_days as number | null) ?? null,
      isRecurring: p.is_recurring as boolean,
      recurringDay: (p.recurring_day as number | null) ?? null,
    };
  });

  const storeRows: StoreRow[] = (stores ?? []).map((s) => ({
    id: s.id as string,
    name: s.name as string,
  }));

  const categoryOptions: CategoryOption[] = (categories ?? []).map((c) => ({
    id: c.id as string,
    name: c.name as string,
  }));

  return <ProductsManager products={productRows} stores={storeRows} categories={categoryOptions} />;
}
