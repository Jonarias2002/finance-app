import { getLocale, getTranslations } from 'next-intl/server';
import { AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getLatestRate } from '@/features/exchange-rates/get-latest-rate';
import { Card, CardHeader, CardTitle, Label } from '@/components/ui';
import { StatTile } from '@/features/dashboard/stat-tile';
import { SpendingChart, type FlowPoint } from '@/features/dashboard/spending-chart';
import { CategoryChart, type CategorySlice } from '@/features/dashboard/category-chart';
import { RangeFilter } from '@/features/dashboard/range-filter';
import { buildRange, parseRange } from '@/features/dashboard/ranges';

const round2 = (n: number) => Math.round(n * 100) / 100;

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

  const monthStartIso = `${today.slice(0, 7)}-01T00:00:00-04:00`;
  const [
    { data: txns },
    { data: balances },
    rate,
    { data: debts },
    { data: templates },
    { data: postedThisMonth },
  ] = await Promise.all([
    supabase
      .from('transactions')
      .select('type, amount_usd, occurred_at, categories(name)')
      // Las plantillas de gasto fijo no cuentan en el análisis (no son dinero movido).
      .eq('is_template', false)
      .in('type', ['income', 'expense'])
      .gte('occurred_at', cfg.startIso),
    supabase.from('account_balances').select('currency, available_balance'),
    getLatestRate(supabase),
    supabase.from('debts').select('direction, due_date, is_settled'),
    supabase.from('transactions').select('id, fixed_day').eq('is_template', true),
    supabase
      .from('transactions')
      .select('template_id')
      .not('template_id', 'is', null)
      .gte('occurred_at', monthStartIso),
  ]);

  // --- Flujo por bucket (ingresos vs gastos, en USD) ---
  const index = new Map(cfg.buckets.map((b, i) => [b.key, i]));
  const flow: FlowPoint[] = cfg.buckets.map((b) => ({ label: b.label, income: 0, expense: 0 }));
  const categories = new Map<string, number>();
  const dateFmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Caracas' });
  const noCategory = t('charts.noCategory');

  for (const tx of txns ?? []) {
    const dateKey = dateFmt.format(new Date(tx.occurred_at as string));
    const key = cfg.granularity === 'month' ? dateKey.slice(0, 7) : dateKey;
    const i = index.get(key);
    const usd = Number(tx.amount_usd);
    if (i !== undefined) {
      if (tx.type === 'income') flow[i]!.income += usd;
      else flow[i]!.expense += usd;
    }
    if (tx.type === 'expense') {
      const embed = tx.categories as { name: string } | { name: string }[] | null;
      const catName = Array.isArray(embed) ? embed[0]?.name : embed?.name;
      const nameKey = catName ?? noCategory;
      categories.set(nameKey, (categories.get(nameKey) ?? 0) + usd);
    }
  }
  for (const p of flow) {
    p.income = round2(p.income);
    p.expense = round2(p.expense);
  }

  const incomeTotal = round2(flow.reduce((s, p) => s + p.income, 0));
  const expenseTotal = round2(flow.reduce((s, p) => s + p.expense, 0));
  const netTotal = round2(incomeTotal - expenseTotal);

  // Top categorías + "Otras"
  const sorted = [...categories.entries()].sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, 6);
  const rest = sorted.slice(6);
  const catItems: CategorySlice[] = top.map(([nm, amt]) => ({ name: nm, amount: round2(amt) }));
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

  // --- Alertas (calculadas, no persistidas — ADR 17) ---
  const alerts: string[] = [];
  if (expenseTotal > incomeTotal && expenseTotal > 0) alerts.push(t('alerts.overspend'));
  const overdue = (debts ?? []).filter(
    (d) => d.direction === 'i_owe' && !d.is_settled && d.due_date && (d.due_date as string) < today,
  ).length;
  if (overdue > 0) alerts.push(t('alerts.overdueDebts', { count: overdue }));
  // Gastos fijos "por registrar": su día ya llegó este mes y aún no se han posteado.
  const todayDay = Number(today.slice(8, 10));
  const postedIds = new Set((postedThisMonth ?? []).map((r) => r.template_id as string));
  const due = (templates ?? []).filter(
    (tpl) => Number(tpl.fixed_day) <= todayDay && !postedIds.has(tpl.id as string),
  ).length;
  if (due > 0) alerts.push(t('alerts.dueRecurring', { count: due }));

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Label>{t('greeting', { name })}</Label>
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

      <Card>
        <CardHeader>
          <CardTitle>{t('charts.flow')}</CardTitle>
        </CardHeader>
        <SpendingChart data={flow} />
      </Card>

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
