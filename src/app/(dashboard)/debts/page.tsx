import { createClient } from '@/lib/supabase/server';
import { getLatestRate } from '@/features/exchange-rates/get-latest-rate';
import { DebtsManager } from '@/features/debts/debts-manager';
import type { DebtDirection, DebtRow, PaymentRow } from '@/features/debts/schemas';
import type { AccountOption } from '@/features/transactions/schemas';
import type { Currency } from '@/lib/format';

const round2 = (n: number) => Math.round(n * 100) / 100;

export default async function DebtsPage() {
  const supabase = await createClient();

  const [{ data: debts }, { data: payments }, { data: accounts }, rate] = await Promise.all([
    supabase
      .from('debts')
      .select('id, direction, counterparty, principal, currency, description, due_date, is_settled')
      .order('is_settled')
      .order('created_at', { ascending: false }),
    supabase
      .from('debt_payments')
      .select('id, debt_id, amount, note, paid_at, transaction_id')
      .order('paid_at', { ascending: false }),
    supabase.from('accounts').select('id, name, currency').eq('is_archived', false).order('name'),
    getLatestRate(supabase),
  ]);

  const paymentsByDebt = new Map<string, PaymentRow[]>();
  for (const p of payments ?? []) {
    const list = paymentsByDebt.get(p.debt_id as string) ?? [];
    list.push({
      id: p.id as string,
      amount: Number(p.amount),
      note: (p.note as string | null) ?? null,
      paidAt: p.paid_at as string,
      transactionId: (p.transaction_id as string | null) ?? null,
    });
    paymentsByDebt.set(p.debt_id as string, list);
  }

  const rows: DebtRow[] = (debts ?? []).map((d) => {
    const list = paymentsByDebt.get(d.id as string) ?? [];
    const paid = round2(list.reduce((sum, p) => sum + p.amount, 0));
    const principal = Number(d.principal);
    return {
      id: d.id as string,
      direction: d.direction as DebtDirection,
      counterparty: d.counterparty as string,
      principal,
      currency: d.currency as Currency,
      description: (d.description as string | null) ?? null,
      dueDate: (d.due_date as string | null) ?? null,
      isSettled: d.is_settled as boolean,
      paid,
      remaining: round2(Math.max(principal - paid, 0)),
      payments: list,
    };
  });

  const accountOptions: AccountOption[] = (accounts ?? []).map((a) => ({
    id: a.id as string,
    name: a.name as string,
    currency: a.currency as Currency,
  }));

  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Caracas' }).format(
    new Date(),
  );

  return (
    <DebtsManager debts={rows} accounts={accountOptions} rate={rate?.rate ?? 0} today={today} />
  );
}
