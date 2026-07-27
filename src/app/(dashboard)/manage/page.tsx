import { createClient } from '@/lib/supabase/server';
import { ManageTabs } from '@/features/manage/manage-tabs';
import { MANAGE_TABS, type ManageTab } from '@/features/manage/tabs';
import type { AccountRow, BankOption } from '@/features/accounts/schemas';
import type { CategoryRow } from '@/features/categories/schemas';
import type { CategoryOption, ProductRow, StoreRow } from '@/features/products/schemas';
import type { Currency } from '@/lib/format';

function one<T>(embed: unknown): T | null {
  if (Array.isArray(embed)) return (embed[0] as T) ?? null;
  return (embed as T) ?? null;
}

export default async function ManagePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const raw = (await searchParams).tab;
  const initialTab: ManageTab = MANAGE_TABS.includes(raw as ManageTab)
    ? (raw as ManageTab)
    : 'accounts';

  const supabase = await createClient();

  const [
    { data: accounts },
    { data: balances },
    { data: banks },
    { data: cats },
    { data: products },
    { data: stores },
    { data: expenseCategories },
  ] = await Promise.all([
    supabase
      .from('accounts')
      .select('id, name, type, currency, bank_id, is_archived, banks(name)')
      .order('is_archived')
      .order('created_at'),
    supabase
      .from('account_balances')
      .select('account_id, total_balance, reserved_balance, available_balance'),
    supabase.from('banks').select('id, name').eq('is_active', true).order('name'),
    supabase.from('categories').select('id, name, kind, parent_id, is_system').order('name'),
    supabase
      .from('products')
      .select(
        'id, name, unit, default_category_id, is_staple, typical_days, is_recurring, recurring_day, categories(name)',
      )
      .order('name'),
    supabase.from('stores').select('id, name').order('name'),
    supabase.from('categories').select('id, name').eq('kind', 'expense').order('name'),
  ]);

  // --- Cuentas ---
  const balanceById = new Map(
    (balances ?? []).map((b) => [
      b.account_id as string,
      {
        total: Number(b.total_balance),
        reserved: Number(b.reserved_balance),
        available: Number(b.available_balance),
      },
    ]),
  );
  const accountRows: AccountRow[] = (accounts ?? []).map((a) => {
    const bal = balanceById.get(a.id as string) ?? { total: 0, reserved: 0, available: 0 };
    const bank = one<{ name: string }>(a.banks);
    return {
      id: a.id as string,
      name: a.name as string,
      type: a.type as AccountRow['type'],
      currency: a.currency as Currency,
      bankId: (a.bank_id as number | null) ?? null,
      bankName: bank?.name ?? null,
      isArchived: a.is_archived as boolean,
      ...bal,
    };
  });
  const bankOptions: BankOption[] = (banks ?? []).map((b) => ({
    id: b.id as number,
    name: b.name as string,
  }));

  // --- Categorías ---
  const categoryRows: CategoryRow[] = (cats ?? []).map((c) => ({
    id: c.id as string,
    name: c.name as string,
    kind: c.kind as CategoryRow['kind'],
    parentId: (c.parent_id as string | null) ?? null,
    isSystem: c.is_system as boolean,
  }));

  // --- Productos y tiendas ---
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
  const productCategories: CategoryOption[] = (expenseCategories ?? []).map((c) => ({
    id: c.id as string,
    name: c.name as string,
  }));

  return (
    <ManageTabs
      initialTab={initialTab}
      accounts={accountRows}
      banks={bankOptions}
      categories={categoryRows}
      products={productRows}
      stores={storeRows}
      productCategories={productCategories}
    />
  );
}
