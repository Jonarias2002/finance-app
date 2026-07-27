import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getLatestRate } from '@/features/exchange-rates/get-latest-rate';
import { DebtDetail } from '@/features/debts/debt-detail';
import type { DebtDirection, DebtRow, PaymentRow } from '@/features/debts/schemas';
import type { Currency } from '@/lib/format';

const round2 = (n: number) => Math.round(n * 100) / 100;

export default async function DebtPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: debt }, { data: payments }, rate] = await Promise.all([
    supabase
      .from('debts')
      .select('id, direction, counterparty, principal, currency, description, due_date, is_settled')
      .eq('id', id)
      .maybeSingle(),
    supabase
      .from('debt_payments')
      .select('id, amount, note, paid_at')
      .eq('debt_id', id)
      .order('paid_at', { ascending: false }),
    getLatestRate(supabase),
  ]);
  if (!debt) redirect('/debts');

  const list: PaymentRow[] = (payments ?? []).map((p) => ({
    id: p.id as string,
    amount: Number(p.amount),
    note: (p.note as string | null) ?? null,
    paidAt: p.paid_at as string,
  }));

  const principal = Number(debt.principal);
  const paid = round2(list.reduce((sum, p) => sum + p.amount, 0));

  const row: DebtRow = {
    id: debt.id as string,
    direction: debt.direction as DebtDirection,
    counterparty: debt.counterparty as string,
    principal,
    currency: debt.currency as Currency,
    description: (debt.description as string | null) ?? null,
    dueDate: (debt.due_date as string | null) ?? null,
    isSettled: debt.is_settled as boolean,
    paid,
    remaining: round2(Math.max(principal - paid, 0)),
    payments: list,
  };

  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Caracas' }).format(
    new Date(),
  );

  return <DebtDetail debt={row} rate={rate?.rate ?? 0} today={today} />;
}
