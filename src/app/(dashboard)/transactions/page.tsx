import { createClient } from '@/lib/supabase/server';
import { getRateHistory } from '@/features/exchange-rates/get-latest-rate';
import { TransactionsManager } from '@/features/transactions/transactions-manager';
import type {
  AccountOption,
  CategoryOption,
  ProductOption,
  StoreOption,
  TxnRow,
  TxnType,
} from '@/features/transactions/schemas';
import type { Currency } from '@/lib/format';

/** Normaliza un embed a-uno que el tipado del builder infiere como arreglo. */
function one<T>(embed: unknown): T | null {
  if (Array.isArray(embed)) return (embed[0] as T) ?? null;
  return (embed as T) ?? null;
}

export default async function TransactionsPage() {
  const supabase = await createClient();

  // Dos FKs a accounts: hay que desambiguar el embed con el hint de columna.
  const cols =
    'id, type, account_id, transfer_account_id, category_id, store_id, amount, currency, amount_usd, exchange_rate, description, occurred_at, source:accounts!account_id(name), dest:accounts!transfer_account_id(name), categories(name), stores(name)';

  const [
    { data: txns },
    { data: accounts },
    { data: categories },
    { data: products },
    { data: stores },
    rateHistory,
  ] = await Promise.all([
    supabase
      .from('transactions')
      .select(cols)
      .in('type', ['income', 'expense'])
      .order('occurred_at', { ascending: false })
      .limit(100),
    supabase.from('accounts').select('id, name, currency').eq('is_archived', false).order('name'),
    supabase.from('categories').select('id, name, kind').order('name'),
    supabase.from('products').select('id, name, default_category_id').order('name'),
    supabase.from('stores').select('id, name').order('name'),
    getRateHistory(supabase),
  ]);

  type TxnRecord = NonNullable<typeof txns>[number];
  const toRow = (tx: TxnRecord): TxnRow => {
    const account = one<{ name: string }>(tx.source);
    const transferAccount = one<{ name: string }>(tx.dest);
    const category = one<{ name: string }>(tx.categories);
    const store = one<{ name: string }>(tx.stores);
    return {
      id: tx.id as string,
      type: tx.type as TxnType,
      accountId: tx.account_id as string,
      accountName: account?.name ?? '—',
      transferAccountId: (tx.transfer_account_id as string | null) ?? null,
      transferAccountName: transferAccount?.name ?? null,
      categoryId: (tx.category_id as string | null) ?? null,
      categoryName: category?.name ?? null,
      storeId: (tx.store_id as string | null) ?? null,
      storeName: store?.name ?? null,
      amount: Number(tx.amount),
      currency: tx.currency as Currency,
      amountUsd: Number(tx.amount_usd),
      exchangeRate: Number(tx.exchange_rate),
      description: tx.description as string,
      occurredAt: tx.occurred_at as string,
    };
  };

  const rows: TxnRow[] = (txns ?? []).map(toRow);

  const accountOptions: AccountOption[] = (accounts ?? []).map((a) => ({
    id: a.id as string,
    name: a.name as string,
    currency: a.currency as Currency,
  }));

  const categoryOptions: CategoryOption[] = (categories ?? []).map((c) => ({
    id: c.id as string,
    name: c.name as string,
    kind: c.kind as 'income' | 'expense',
  }));

  const productOptions: ProductOption[] = (products ?? []).map((p) => ({
    id: p.id as string,
    name: p.name as string,
    categoryId: (p.default_category_id as string | null) ?? null,
  }));

  const storeOptions: StoreOption[] = (stores ?? []).map((s) => ({
    id: s.id as string,
    name: s.name as string,
  }));

  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Caracas' }).format(
    new Date(),
  );

  return (
    <TransactionsManager
      transactions={rows}
      accounts={accountOptions}
      categories={categoryOptions}
      products={productOptions}
      stores={storeOptions}
      rateHistory={rateHistory}
      today={today}
    />
  );
}
