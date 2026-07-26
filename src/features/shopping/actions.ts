'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { getLatestRate } from '@/features/exchange-rates/get-latest-rate';
import { listSchema, itemSchema, closeSchema, type ActionState } from './schemas';

const round2 = (n: number) => Math.round(n * 100) / 100;

function fieldErrorsFrom(error: z.ZodError): ActionState {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === 'string' && !fieldErrors[key]) {
      fieldErrors[key] = key === 'name' || key === 'quantity' ? issue.message : 'required';
    }
  }
  return { fieldErrors };
}

async function requireUser(supabase: SupabaseClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

// --- Listas -----------------------------------------------------------------
export async function saveList(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  if (!user) return { error: 'unauthenticated' };

  const rawStore = formData.get('storeId');
  const rawBudget = formData.get('budgetUsd');
  const parsed = listSchema.safeParse({
    name: formData.get('name'),
    storeId: rawStore ? String(rawStore) : null,
    budgetUsd: rawBudget ? Number(rawBudget) : null,
  });
  if (!parsed.success) return fieldErrorsFrom(parsed.error);

  const { name, storeId, budgetUsd } = parsed.data;
  const values = { name: name.trim(), store_id: storeId, budget_usd: budgetUsd };
  const id = (formData.get('id') as string) || null;

  if (id) {
    const { error } = await supabase
      .from('shopping_lists')
      .update(values)
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) return { error: 'generic' };
  } else {
    const { error } = await supabase.from('shopping_lists').insert({ ...values, user_id: user.id });
    if (error) return { error: 'generic' };
  }
  revalidatePath('/shopping');
  return { ok: true };
}

export async function deleteList(id: string) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  if (!user) return;
  await supabase.from('shopping_lists').delete().eq('id', id).eq('user_id', user.id);
  revalidatePath('/shopping');
}

// --- Ítems ------------------------------------------------------------------
export async function addItem(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  if (!user) return { error: 'unauthenticated' };

  const rawProduct = formData.get('productId');
  const rawName = formData.get('name');
  const parsed = itemSchema.safeParse({
    listId: formData.get('listId'),
    productId: rawProduct ? String(rawProduct) : null,
    name: rawName ? String(rawName) : null,
    quantity: Number(formData.get('quantity')),
  });
  if (!parsed.success) return fieldErrorsFrom(parsed.error);

  const { listId, productId, name, quantity } = parsed.data;

  // Unidad y estimado: si es de catálogo, tomar el último precio unitario.
  let unit = 'unit';
  let estimated: number | null = null;
  let itemName = name;
  if (productId) {
    const { data: product } = await supabase
      .from('products')
      .select('name, unit')
      .eq('id', productId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (!product) return { fieldErrors: { name: 'required' } };
    unit = product.unit as string;
    itemName = itemName ?? (product.name as string);
    const { data: last } = await supabase
      .from('price_records')
      .select('unit_price_usd')
      .eq('product_id', productId)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (last) estimated = round2(Number(last.unit_price_usd) * quantity);
  }

  const { data: maxRow } = await supabase
    .from('shopping_list_items')
    .select('position')
    .eq('list_id', listId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle();
  const position = (maxRow ? Number(maxRow.position) : 0) + 1;

  const { error } = await supabase.from('shopping_list_items').insert({
    user_id: user.id,
    list_id: listId,
    product_id: productId,
    name: itemName,
    quantity: round2(quantity),
    unit,
    estimated_price_usd: estimated,
    position,
  });
  if (error) return { error: 'generic' };

  revalidatePath(`/shopping/${listId}`);
  return { ok: true };
}

/**
 * "Agregar lo que hace falta": añade los productos básicos (`is_staple`) que ya
 * tocan reponer — nunca comprados, o cuya última compra supera `typical_days` —
 * con el estimado de su último precio. Omite los que ya están en el carrito.
 */
export async function addMissingStaples(listId: string) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  if (!user) return;

  const { data: staples } = await supabase
    .from('products')
    .select('id, name, unit, typical_days')
    .eq('user_id', user.id)
    .eq('is_staple', true);
  if (!staples || staples.length === 0) return;

  const { data: existing } = await supabase
    .from('shopping_list_items')
    .select('product_id')
    .eq('list_id', listId);
  const inList = new Set((existing ?? []).map((e) => e.product_id).filter(Boolean));

  const ids = staples.map((s) => s.id);
  const { data: prices } = await supabase
    .from('price_records')
    .select('product_id, unit_price_usd, recorded_at')
    .in('product_id', ids)
    .order('recorded_at', { ascending: false });
  const lastByProduct = new Map<string, { unit_price_usd: number; recorded_at: string }>();
  for (const p of prices ?? []) {
    if (!lastByProduct.has(p.product_id as string)) {
      lastByProduct.set(p.product_id as string, {
        unit_price_usd: Number(p.unit_price_usd),
        recorded_at: p.recorded_at as string,
      });
    }
  }

  const nowMs = Date.now();
  const { data: maxRow } = await supabase
    .from('shopping_list_items')
    .select('position')
    .eq('list_id', listId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle();
  let position = maxRow ? Number(maxRow.position) : 0;

  const rows = [];
  for (const s of staples) {
    if (inList.has(s.id)) continue;
    const last = lastByProduct.get(s.id as string);
    let needed = false;
    if (!last) {
      needed = true;
    } else if (s.typical_days != null) {
      const days = Math.floor((nowMs - new Date(last.recorded_at).getTime()) / 86_400_000);
      if (days >= Number(s.typical_days)) needed = true;
    }
    if (!needed) continue;
    position += 1;
    rows.push({
      user_id: user.id,
      list_id: listId,
      product_id: s.id,
      name: s.name,
      quantity: 1,
      unit: s.unit,
      estimated_price_usd: last ? round2(last.unit_price_usd) : null,
      position,
    });
  }

  if (rows.length > 0) await supabase.from('shopping_list_items').insert(rows);
  revalidatePath(`/shopping/${listId}`);
}

export async function toggleItem(itemId: string, listId: string, checked: boolean) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  if (!user) return;
  await supabase
    .from('shopping_list_items')
    .update({ checked })
    .eq('id', itemId)
    .eq('user_id', user.id);
  revalidatePath(`/shopping/${listId}`);
}

/** Corrige el precio real de un ítem (y lo marca comprado). Alimenta el historial al cerrar. */
export async function setItemActual(itemId: string, listId: string, actualUsd: number | null) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  if (!user) return;
  const value = actualUsd !== null && actualUsd >= 0 ? round2(actualUsd) : null;
  await supabase
    .from('shopping_list_items')
    .update({ actual_price_usd: value, checked: value !== null })
    .eq('id', itemId)
    .eq('user_id', user.id);
  revalidatePath(`/shopping/${listId}`);
}

export async function deleteItem(itemId: string, listId: string) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  if (!user) return;
  await supabase.from('shopping_list_items').delete().eq('id', itemId).eq('user_id', user.id);
  revalidatePath(`/shopping/${listId}`);
}

// --- Cerrar compra ----------------------------------------------------------
/**
 * Convierte el carrito en UN movimiento (categoría elegida, cuenta de pago) y
 * registra el precio de cada ítem de catálogo comprado. Enlaza ambos lados.
 */
export async function closePurchase(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  if (!user) return { error: 'unauthenticated' };

  const parsed = closeSchema.safeParse({
    listId: formData.get('listId'),
    accountId: formData.get('accountId'),
    occurredAt: formData.get('occurredAt'),
  });
  if (!parsed.success) return fieldErrorsFrom(parsed.error);
  const { listId, accountId, occurredAt } = parsed.data;
  const occurredAtIso = `${occurredAt}T12:00:00-04:00`; // mediodía Caracas (ADR 13)

  const { data: list } = await supabase
    .from('shopping_lists')
    .select('id, name, status, store_id, stores(name)')
    .eq('id', listId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!list || list.status === 'completed') return { error: 'generic' };

  const { data: items } = await supabase
    .from('shopping_list_items')
    .select(
      'product_id, quantity, estimated_price_usd, actual_price_usd, products(default_category_id)',
    )
    .eq('list_id', listId);
  const priced = (items ?? []).map((it) => ({
    ...it,
    lineUsd: Number(it.actual_price_usd ?? it.estimated_price_usd ?? 0),
  }));
  const totalUsd = round2(priced.reduce((s, it) => s + it.lineUsd, 0));
  if (totalUsd <= 0) return { error: 'emptyCart' };

  // Categoría dominante: se hereda de los productos, sumando por categoría y
  // eligiendo la de mayor monto. Si ningún producto tiene categoría, queda null (v1).
  const byCategory = new Map<string, number>();
  for (const it of priced) {
    const prod = Array.isArray(it.products) ? it.products[0] : it.products;
    const catId = (prod as { default_category_id: string | null } | null)?.default_category_id;
    if (!catId || it.lineUsd <= 0) continue;
    byCategory.set(catId, (byCategory.get(catId) ?? 0) + it.lineUsd);
  }
  let categoryId: string | null = null;
  let maxAmount = 0;
  for (const [cat, amount] of byCategory) {
    if (amount > maxAmount) {
      maxAmount = amount;
      categoryId = cat;
    }
  }

  const { data: account } = await supabase
    .from('accounts')
    .select('currency')
    .eq('id', accountId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!account) return { fieldErrors: { accountId: 'required' } };
  const currency = account.currency as 'USD' | 'VES';

  const latest = await getLatestRate(supabase);
  if (currency === 'VES' && !latest) return { error: 'noRate' };
  const exchangeRate = currency === 'VES' ? latest!.rate : (latest?.rate ?? 1);
  const amount = currency === 'VES' ? round2(totalUsd * exchangeRate) : totalUsd;

  const storeEmbed = list.stores as { name: string } | { name: string }[] | null;
  const storeName = Array.isArray(storeEmbed) ? storeEmbed[0]?.name : storeEmbed?.name;
  const description = storeName ? `Mercado en ${storeName}` : (list.name as string);

  const { data: txn, error: txnError } = await supabase
    .from('transactions')
    .insert({
      user_id: user.id,
      account_id: accountId,
      category_id: categoryId,
      type: 'expense',
      amount,
      currency,
      exchange_rate: exchangeRate,
      amount_usd: totalUsd,
      description,
      shopping_list_id: listId,
      occurred_at: occurredAtIso,
    })
    .select('id')
    .single();
  if (txnError || !txn) return { error: 'generic' };

  await supabase
    .from('shopping_lists')
    .update({
      status: 'completed',
      completed_at: occurredAtIso,
      transaction_id: txn.id,
    })
    .eq('id', listId)
    .eq('user_id', user.id);

  // Historial de precios: ítems de catálogo con precio real y cantidad.
  const priceRows = (items ?? [])
    .filter((it) => it.product_id && it.actual_price_usd && Number(it.quantity) > 0)
    .map((it) => ({
      user_id: user.id,
      product_id: it.product_id,
      store_id: (list.store_id as string | null) ?? null,
      unit_price_usd: round2(Number(it.actual_price_usd) / Number(it.quantity)),
      original_currency: currency,
      exchange_rate: exchangeRate,
      recorded_at: occurredAtIso,
    }));
  if (priceRows.length > 0) await supabase.from('price_records').insert(priceRows);

  revalidatePath('/shopping');
  revalidatePath(`/shopping/${listId}`);
  revalidatePath('/transactions');
  revalidatePath('/accounts');
  revalidatePath('/');
  return { ok: true };
}
