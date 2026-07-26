import { createClient } from '@/lib/supabase/server';
import { GoalsManager } from '@/features/goals/goals-manager';
import type { ContributionRow, GoalRow } from '@/features/goals/schemas';
import type { AccountOption } from '@/features/transactions/schemas';
import type { Currency } from '@/lib/format';

const round2 = (n: number) => Math.round(n * 100) / 100;

function one<T>(embed: unknown): T | null {
  if (Array.isArray(embed)) return (embed[0] as T) ?? null;
  return (embed as T) ?? null;
}

export default async function GoalsPage() {
  const supabase = await createClient();

  const [{ data: goals }, { data: contributions }, { data: accounts }] = await Promise.all([
    supabase
      .from('savings_goals')
      .select(
        'id, name, account_id, currency, target_amount, target_date, is_achieved, accounts(name)',
      )
      .order('is_achieved')
      .order('created_at', { ascending: false }),
    supabase
      .from('goal_contributions')
      .select('id, goal_id, amount, note, contributed_at')
      .order('contributed_at', { ascending: false }),
    supabase.from('accounts').select('id, name, currency').eq('is_archived', false).order('name'),
  ]);

  const byGoal = new Map<string, ContributionRow[]>();
  for (const c of contributions ?? []) {
    const list = byGoal.get(c.goal_id as string) ?? [];
    list.push({
      id: c.id as string,
      amount: Number(c.amount),
      note: (c.note as string | null) ?? null,
      contributedAt: c.contributed_at as string,
    });
    byGoal.set(c.goal_id as string, list);
  }

  const rows: GoalRow[] = (goals ?? []).map((g) => {
    const list = byGoal.get(g.id as string) ?? [];
    const saved = round2(list.reduce((sum, c) => sum + c.amount, 0));
    const target = Number(g.target_amount);
    const account = one<{ name: string }>(g.accounts);
    return {
      id: g.id as string,
      name: g.name as string,
      accountId: g.account_id as string,
      accountName: account?.name ?? '—',
      currency: g.currency as Currency,
      targetAmount: target,
      targetDate: (g.target_date as string | null) ?? null,
      isAchieved: g.is_achieved as boolean,
      saved: Math.max(saved, 0),
      remaining: round2(Math.max(target - saved, 0)),
      contributions: list,
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

  return <GoalsManager goals={rows} accounts={accountOptions} today={today} />;
}
