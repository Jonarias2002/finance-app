import type { SupabaseClient } from '@supabase/supabase-js';

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Marca la deuda como saldada cuando los abonos cubren el principal (y la vuelve
 * a abrir si dejan de cubrirlo). Vive fuera de `actions.ts` porque la usan dos
 * módulos —deudas y movimientos— y en un fichero `'use server'` cualquier export
 * quedaría expuesto como acción llamable desde el cliente.
 */
export async function syncSettled(
  supabase: SupabaseClient,
  userId: string,
  debtId: string,
): Promise<void> {
  const { data: debt } = await supabase
    .from('debts')
    .select('principal')
    .eq('id', debtId)
    .eq('user_id', userId)
    .maybeSingle();
  if (!debt) return;

  const { data: payments } = await supabase
    .from('debt_payments')
    .select('amount')
    .eq('debt_id', debtId);
  const paid = (payments ?? []).reduce((sum, p) => sum + Number(p.amount), 0);

  await supabase
    .from('debts')
    .update({ is_settled: round2(paid) >= Number(debt.principal) })
    .eq('id', debtId)
    .eq('user_id', userId);
}
