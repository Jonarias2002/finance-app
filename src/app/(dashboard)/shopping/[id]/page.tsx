import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CartDetail } from '@/features/shopping/cart-detail';
import type {
  AccountOption,
  ItemRow,
  ProductOption,
  ShoppingListRow,
  ShoppingStatus,
} from '@/features/shopping/schemas';
import type { ProductUnit } from '@/features/products/schemas';
import type { Currency } from '@/lib/format';

function one<T>(embed: unknown): T | null {
  if (Array.isArray(embed)) return (embed[0] as T) ?? null;
  return (embed as T) ?? null;
}

export default async function CartPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: list } = await supabase
    .from('shopping_lists')
    .select('id, name, store_id, budget_usd, status, transaction_id, stores(name)')
    .eq('id', id)
    .maybeSingle();
  if (!list) redirect('/shopping');

  const [{ data: items }, { data: products }, { data: accounts }] = await Promise.all([
    supabase
      .from('shopping_list_items')
      .select('id, name, unit, quantity, estimated_price_usd, actual_price_usd, checked')
      .eq('list_id', id)
      .order('position'),
    supabase.from('products').select('id, name, unit').order('name'),
    supabase.from('accounts').select('id, name, currency').eq('is_archived', false).order('name'),
  ]);

  const store = one<{ name: string }>(list.stores);
  const listRow: ShoppingListRow = {
    id: list.id as string,
    name: list.name as string,
    storeId: (list.store_id as string | null) ?? null,
    storeName: store?.name ?? null,
    budgetUsd: (list.budget_usd as number | null) ?? null,
    status: list.status as ShoppingStatus,
    transactionId: (list.transaction_id as string | null) ?? null,
    itemCount: 0,
    checkedCount: 0,
    total: 0,
  };

  const itemRows: ItemRow[] = (items ?? []).map((it) => ({
    id: it.id as string,
    name: (it.name as string | null) ?? '—',
    unit: it.unit as ProductUnit,
    quantity: Number(it.quantity),
    estimatedUsd: it.estimated_price_usd != null ? Number(it.estimated_price_usd) : null,
    actualUsd: it.actual_price_usd != null ? Number(it.actual_price_usd) : null,
    checked: it.checked as boolean,
  }));

  const productOptions: ProductOption[] = (products ?? []).map((p) => ({
    id: p.id as string,
    name: p.name as string,
    unit: p.unit as ProductUnit,
    lastUnitPriceUsd: null,
  }));

  const accountOptions: AccountOption[] = (accounts ?? []).map((a) => ({
    id: a.id as string,
    name: a.name as string,
    currency: a.currency as Currency,
  }));

  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Caracas' }).format(
    new Date(),
  );

  return (
    <CartDetail
      list={listRow}
      items={itemRows}
      products={productOptions}
      accounts={accountOptions}
      today={today}
    />
  );
}
