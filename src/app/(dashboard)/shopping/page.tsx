import { createClient } from '@/lib/supabase/server';
import { ShoppingManager } from '@/features/shopping/shopping-manager';
import type { ShoppingListRow, ShoppingStatus, StoreOption } from '@/features/shopping/schemas';

const round2 = (n: number) => Math.round(n * 100) / 100;

function one<T>(embed: unknown): T | null {
  if (Array.isArray(embed)) return (embed[0] as T) ?? null;
  return (embed as T) ?? null;
}

export default async function ShoppingPage() {
  const supabase = await createClient();

  const [{ data: lists }, { data: items }, { data: stores }] = await Promise.all([
    supabase
      .from('shopping_lists')
      .select('id, name, store_id, budget_usd, status, transaction_id, stores(name)')
      .order('status')
      .order('started_at', { ascending: false }),
    supabase
      .from('shopping_list_items')
      .select('list_id, checked, estimated_price_usd, actual_price_usd'),
    supabase.from('stores').select('id, name').order('name'),
  ]);

  const agg = new Map<string, { count: number; checked: number; total: number }>();
  for (const it of items ?? []) {
    const key = it.list_id as string;
    const cur = agg.get(key) ?? { count: 0, checked: 0, total: 0 };
    cur.count += 1;
    if (it.checked) cur.checked += 1;
    cur.total += Number(it.actual_price_usd ?? it.estimated_price_usd ?? 0);
    agg.set(key, cur);
  }

  const rows: ShoppingListRow[] = (lists ?? []).map((l) => {
    const a = agg.get(l.id as string) ?? { count: 0, checked: 0, total: 0 };
    const store = one<{ name: string }>(l.stores);
    return {
      id: l.id as string,
      name: l.name as string,
      storeId: (l.store_id as string | null) ?? null,
      storeName: store?.name ?? null,
      budgetUsd: (l.budget_usd as number | null) ?? null,
      status: l.status as ShoppingStatus,
      transactionId: (l.transaction_id as string | null) ?? null,
      itemCount: a.count,
      checkedCount: a.checked,
      total: round2(a.total),
    };
  });

  const storeOptions: StoreOption[] = (stores ?? []).map((s) => ({
    id: s.id as string,
    name: s.name as string,
  }));

  return <ShoppingManager lists={rows} stores={storeOptions} />;
}
