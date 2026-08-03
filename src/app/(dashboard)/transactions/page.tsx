import { createClient } from '@/lib/supabase/server';
import { getRateHistories } from '@/features/exchange-rates/get-latest-rate';
import { TransactionsManager } from '@/features/transactions/transactions-manager';
import type {
  AccountOption,
  CategoryOption,
  DebtOption,
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
    'id, type, account_id, transfer_account_id, category_id, store_id, amount, currency, entry_amount, entry_currency, amount_usd, exchange_rate, description, occurred_at, source:accounts!account_id(name), dest:accounts!transfer_account_id(name), categories(name), stores(name), debt_payments(debt_id)';

  const [
    { data: txns },
    { data: accounts },
    { data: categories },
    { data: products },
    { data: stores },
    { data: debts },
    rateHistories,
  ] = await Promise.all([
    supabase
      .from('transactions')
      .select(cols)
      .in('type', ['income', 'expense'])
      // Del más reciente al más viejo. El desempate por created_at no es un
      // adorno: todos los movimientos se guardan a mediodía de Caracas (ADR 13),
      // así que los del mismo día comparten occurred_at y sin esto Postgres los
      // devolvía en un orden cualquiera — el recién creado no subía arriba.
      .order('occurred_at', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(100),
    supabase.from('accounts').select('id, name, currency').eq('is_archived', false).order('name'),
    supabase.from('categories').select('id, name, kind').order('name'),
    supabase.from('products').select('id, name, default_category_id').order('name'),
    supabase.from('stores').select('id, name').order('name'),
    // Deudas con sus abonos: el formulario ofrece pagarlas y necesita saber
    // cuánto falta para poder cancelarlas de una. Van también las saldadas, para
    // que al editar el movimiento que canceló una no se pierda el enlace.
    supabase
      .from('debts')
      .select('id, counterparty, direction, currency, principal, is_settled, debt_payments(amount)')
      .order('counterparty'),
    getRateHistories(supabase),
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
      debtId: one<{ debt_id: string }>(tx.debt_payments)?.debt_id ?? null,
      amount: Number(tx.amount),
      currency: tx.currency as Currency,
      entryAmount: tx.entry_amount == null ? null : Number(tx.entry_amount),
      entryCurrency: (tx.entry_currency as Currency | null) ?? null,
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

  // Lo que falta por pagar = principal menos lo ya abonado.
  const debtOptions: DebtOption[] = (debts ?? []).map((d) => {
    const payments = (d.debt_payments ?? []) as { amount: number }[];
    const paid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    return {
      id: d.id as string,
      counterparty: d.counterparty as string,
      direction: d.direction as DebtOption['direction'],
      currency: d.currency as Currency,
      remaining: Math.max(0, Math.round((Number(d.principal) - paid) * 100) / 100),
      isSettled: Boolean(d.is_settled),
    };
  });

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
      debts={debtOptions}
      rateHistories={rateHistories}
      today={today}
    />
  );
}
