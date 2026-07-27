import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { GoalDetail } from '@/features/goals/goal-detail';
import type { ContributionRow, GoalRow } from '@/features/goals/schemas';
import type { Currency } from '@/lib/format';

const round2 = (n: number) => Math.round(n * 100) / 100;

function one<T>(embed: unknown): T | null {
  if (Array.isArray(embed)) return (embed[0] as T) ?? null;
  return (embed as T) ?? null;
}

export default async function GoalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: goal }, { data: contributions }] = await Promise.all([
    supabase
      .from('savings_goals')
      .select(
        'id, name, account_id, currency, target_amount, target_date, is_achieved, accounts(name)',
      )
      .eq('id', id)
      .maybeSingle(),
    supabase
      .from('goal_contributions')
      .select('id, amount, note, contributed_at')
      .eq('goal_id', id)
      .order('contributed_at', { ascending: false }),
  ]);
  if (!goal) redirect('/goals');

  const list: ContributionRow[] = (contributions ?? []).map((c) => ({
    id: c.id as string,
    amount: Number(c.amount),
    note: (c.note as string | null) ?? null,
    contributedAt: c.contributed_at as string,
  }));

  const saved = round2(list.reduce((sum, c) => sum + c.amount, 0));
  const target = Number(goal.target_amount);
  const account = one<{ name: string }>(goal.accounts);

  const row: GoalRow = {
    id: goal.id as string,
    name: goal.name as string,
    accountId: goal.account_id as string,
    accountName: account?.name ?? '—',
    currency: goal.currency as Currency,
    targetAmount: target,
    targetDate: (goal.target_date as string | null) ?? null,
    isAchieved: goal.is_achieved as boolean,
    saved: Math.max(saved, 0),
    remaining: round2(Math.max(target - saved, 0)),
    contributions: list,
  };

  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Caracas' }).format(
    new Date(),
  );

  return <GoalDetail goal={row} today={today} />;
}
