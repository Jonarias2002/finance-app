import { getLocale, getTranslations } from 'next-intl/server';
import { AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getLatestRate } from '@/features/exchange-rates/get-latest-rate';
import { Card, CardHeader, CardTitle, Label, RateStamp } from '@/components/ui';
import { StatTile } from '@/features/dashboard/stat-tile';
import { CategoryChart, type CategorySlice } from '@/features/dashboard/category-chart';
import {
  UpcomingServices,
  GoalsProgress,
  DebtsProgress,
  type ServiceItem,
  type GoalItem,
  type DebtItem,
} from '@/features/dashboard/home-panels';
import { RangeFilter } from '@/features/dashboard/range-filter';
import { buildRange, parseRange } from '@/features/dashboard/ranges';
import type { Currency } from '@/lib/format';

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Próxima ocurrencia de un día del mes a partir de hoy (YYYY-MM-DD en Caracas). */
function nextServiceDate(todayStr: string, day: number): { date: string; daysAway: number } {
  const [ys, ms, ds] = todayStr.split('-');
  const y = Number(ys);
  const m = Number(ms); // 1-12
  const d = Number(ds);
  let year = y;
  let month = m; // 1-12
  if (day < d) {
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const dd = Math.min(day, daysInMonth);
  const date = `${year}-${String(month).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
  const daysAway = Math.round((Date.UTC(year, month - 1, dd) - Date.UTC(y, m - 1, d)) / 86400000);
  return { date, daysAway };
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const t = await getTranslations('dashboard');
  const locale = await getLocale();
  const range = parseRange((await searchParams).range);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const name = user?.email?.split('@')[0] ?? '';

  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Caracas' }).format(
    new Date(),
  );
  const cfg = buildRange(range, today, locale);

  const [
    { data: txns },
    { data: balances },
    rate,
    { data: debts },
    { data: debtPayments },
    { data: goals },
    { data: goalContribs },
    { data: services },
  ] = await Promise.all([
    supabase
      .from('transactions')
      .select('type, amount_usd, occurred_at, categories(name)')
      .in('type', ['income', 'expense'])
      .gte('occurred_at', cfg.startIso),
    supabase.from('account_balances').select('currency, available_balance'),
    getLatestRate(supabase),
    supabase
      .from('debts')
      .select('id, direction, counterparty, principal, currency, due_date, is_settled'),
    supabase.from('debt_payments').select('debt_id, amount'),
    supabase
      .from('savings_goals')
      .select('id, name, currency, target_amount, target_date, is_achieved'),
    supabase.from('goal_contributions').select('goal_id, amount'),
    supabase
      .from('products')
      .select('id, name, recurring_day, categories(name)')
      .eq('is_recurring', true),
  ]);

  // --- Totales del período (USD) + gasto por categoría ---
  let incomeTotal = 0;
  let expenseTotal = 0;
  const categories = new Map<string, number>();
  const noCategory = t('charts.noCategory');

  for (const tx of txns ?? []) {
    const usd = Number(tx.amount_usd);
    if (tx.type === 'income') {
      incomeTotal += usd;
    } else {
      expenseTotal += usd;
      const embed = tx.categories as { name: string } | { name: string }[] | null;
      const catName = Array.isArray(embed) ? embed[0]?.name : embed?.name;
      const nameKey = catName ?? noCategory;
      categories.set(nameKey, (categories.get(nameKey) ?? 0) + usd);
    }
  }
  incomeTotal = round2(incomeTotal);
  expenseTotal = round2(expenseTotal);
  const netTotal = round2(incomeTotal - expenseTotal);

  // Top categorías + "Otras"
  const sorted = [...categories.entries()].sort((a, b) => b[1] - a[1]);
  const catItems: CategorySlice[] = sorted
    .slice(0, 6)
    .map(([nm, amt]) => ({ name: nm, amount: round2(amt) }));
  const rest = sorted.slice(6);
  if (rest.length > 0) {
    catItems.push({
      name: t('charts.other'),
      amount: round2(rest.reduce((s, [, amt]) => s + amt, 0)),
    });
  }

  // --- Patrimonio disponible en USD ---
  let availableUsd = 0;
  for (const b of balances ?? []) {
    const av = Number(b.available_balance);
    availableUsd += b.currency === 'USD' ? av : rate ? av / rate.rate : 0;
  }
  availableUsd = round2(availableUsd);

  // --- Próximos gastos fijos (servicios recurrentes), por cercanía ---
  const serviceItems: ServiceItem[] = (services ?? [])
    .map((p) => {
      const embed = p.categories as { name: string } | { name: string }[] | null;
      const categoryName = (Array.isArray(embed) ? embed[0]?.name : embed?.name) ?? null;
      const { date, daysAway } = nextServiceDate(today, Number(p.recurring_day));
      return { id: p.id as string, name: p.name as string, categoryName, date, daysAway };
    })
    .sort((a, b) => a.daysAway - b.daysAway);

  // --- Metas: reunido vs meta (no cumplidas), por fecha objetivo más próxima ---
  const savedByGoal = new Map<string, number>();
  for (const c of goalContribs ?? [])
    savedByGoal.set(
      c.goal_id as string,
      (savedByGoal.get(c.goal_id as string) ?? 0) + Number(c.amount),
    );
  const goalItems: GoalItem[] = (goals ?? [])
    .filter((g) => !g.is_achieved)
    .map((g) => ({
      item: {
        id: g.id as string,
        name: g.name as string,
        currency: g.currency as Currency,
        target: Number(g.target_amount),
        saved: Math.max(round2(savedByGoal.get(g.id as string) ?? 0), 0),
      },
      key: (g.target_date as string | null) ?? '9999-99-99',
    }))
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((r) => r.item);

  // --- Deudas: pagado vs total (no saldadas); "debo" primero, luego mayor saldo ---
  const paidByDebt = new Map<string, number>();
  for (const p of debtPayments ?? [])
    paidByDebt.set(
      p.debt_id as string,
      (paidByDebt.get(p.debt_id as string) ?? 0) + Number(p.amount),
    );
  const debtItems: DebtItem[] = (debts ?? [])
    .filter((d) => !d.is_settled)
    .map((d) => {
      const principal = Number(d.principal);
      const paid = round2(paidByDebt.get(d.id as string) ?? 0);
      const direction = d.direction as DebtItem['direction'];
      return {
        item: {
          id: d.id as string,
          counterparty: d.counterparty as string,
          direction,
          currency: d.currency as Currency,
          principal,
          paid,
        },
        remaining: round2(Math.max(principal - paid, 0)),
        direction,
      };
    })
    .sort((a, b) => {
      if (a.direction !== b.direction) return a.direction === 'i_owe' ? -1 : 1;
      return b.remaining - a.remaining;
    })
    .map((r) => r.item);

  // --- Alertas (calculadas, no persistidas — ADR 17) ---
  const alerts: string[] = [];
  if (expenseTotal > incomeTotal && expenseTotal > 0) alerts.push(t('alerts.overspend'));
  const overdue = (debts ?? []).filter(
    (d) => d.direction === 'i_owe' && !d.is_settled && d.due_date && (d.due_date as string) < today,
  ).length;
  if (overdue > 0) alerts.push(t('alerts.overdueDebts', { count: overdue }));

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col items-start gap-1.5">
          <Label>{t('greeting', { name })}</Label>
          {rate && (
            <RateStamp
              rate={rate.rate}
              source={rate.source === 'official' ? 'BCV' : 'Paralelo'}
              // Mediodía en Caracas: evita que la fecha (solo día) retroceda al
              // formatearla con zona horaria.
              date={`${rate.date}T12:00:00-04:00`}
              // El cron escribe una fila por día; si la más reciente no es de
              // hoy, la sincronización de hoy no llegó.
              stale={rate.date < today}
            />
          )}
        </div>
        <RangeFilter active={range} />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label={t('kpi.available')} amount={availableUsd} tone="ink" />
        <StatTile label={t('kpi.income')} amount={incomeTotal} tone="income" />
        <StatTile label={t('kpi.expense')} amount={expenseTotal} tone="expense" />
        <StatTile
          label={t('kpi.net')}
          amount={netTotal}
          tone={netTotal < 0 ? 'expense' : 'income'}
          signed
        />
      </div>

      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((message, i) => (
            <div
              key={i}
              role="status"
              className="rounded-control border-ocre bg-ocre/[0.06] flex items-start gap-3 border p-3 pl-4"
            >
              <AlertTriangle aria-hidden className="text-ocre mt-0.5 size-[18px] shrink-0" />
              <p className="text-body text-ink flex-1">{message}</p>
            </div>
          ))}
        </div>
      )}

      {serviceItems.length > 0 && <UpcomingServices items={serviceItems} />}

      {(goalItems.length > 0 || debtItems.length > 0) && (
        <div className="grid gap-3 lg:grid-cols-2">
          {goalItems.length > 0 && <GoalsProgress items={goalItems} />}
          {debtItems.length > 0 && <DebtsProgress items={debtItems} />}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t('charts.byCategory')}</CardTitle>
        </CardHeader>
        {catItems.length > 0 ? (
          <CategoryChart items={catItems} total={expenseTotal} />
        ) : (
          <p className="text-caption text-sage">{t('charts.flowEmpty')}</p>
        )}
      </Card>
    </>
  );
}
