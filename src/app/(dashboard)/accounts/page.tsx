import { createClient } from '@/lib/supabase/server';
import { AccountsManager } from '@/features/accounts/accounts-manager';
import type { AccountRow, BankOption } from '@/features/accounts/schemas';
import type { Currency } from '@/lib/format';

export default async function AccountsPage() {
  const supabase = await createClient();

  const [{ data: accounts }, { data: balances }, { data: banks }] = await Promise.all([
    supabase
      .from('accounts')
      .select('id, name, type, currency, bank_id, is_archived, banks(name)')
      .order('is_archived')
      .order('created_at'),
    supabase
      .from('account_balances')
      .select('account_id, total_balance, reserved_balance, available_balance'),
    supabase.from('banks').select('id, name').eq('is_active', true).order('name'),
  ]);

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

  const rows: AccountRow[] = (accounts ?? []).map((a) => {
    const bal = balanceById.get(a.id as string) ?? { total: 0, reserved: 0, available: 0 };
    // El embed banks(name) es una relación a-uno; el tipado del builder lo infiere
    // como arreglo, así que lo normalizamos.
    const embed = a.banks as unknown as { name: string } | { name: string }[] | null;
    const bank = Array.isArray(embed) ? (embed[0] ?? null) : embed;
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

  return <AccountsManager accounts={rows} banks={bankOptions} />;
}
