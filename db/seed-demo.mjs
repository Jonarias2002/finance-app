// Seed de demostración: llena un usuario con ~6 meses de datos realistas
// (cuentas, movimientos en USD y Bs, deudas, metas y gastos fijos) para que el
// dashboard y cada módulo se vean vivos. Idempotente: borra y re-siembra.
//
//   node db/seed-demo.mjs <email>            (por defecto admin@finanzapp.com)
//
// Usa la service_role key de .env.local (bypassa RLS). Solo para local/demo.
import { readFile } from 'node:fs/promises';

const env = {};
for (const line of (await readFile('.env.local', 'utf8')).split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}
const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const EMAIL = process.argv[2] ?? 'admin@finanzapp.com';
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };

const round2 = (n) => Math.round(n * 100) / 100;
const randInt = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const ymd = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Caracas' }).format(d);
const iso = (d) => `${ymd(d)}T12:00:00-04:00`;

async function api(method, path, body, extra = {}) {
  const res = await fetch(`${URL}/rest/v1/${path}`, {
    method,
    headers: { ...H, ...extra },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${await res.text()}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}
const insert = (table, rows) =>
  api('POST', table, rows, { Prefer: 'return=representation' });

// --- Resolver usuario ---
const users = await (await fetch(`${URL}/auth/v1/admin/users`, { headers: H })).json();
const user = (users.users ?? []).find((u) => u.email === EMAIL);
if (!user) {
  console.error(`No existe el usuario ${EMAIL}. Créalo primero.`);
  process.exit(1);
}
const uid = user.id;
console.log(`Sembrando datos de demo para ${EMAIL}`);

// --- Tasa e insumos ---
const rateRow = await api(
  'GET',
  `exchange_rates?source=eq.parallel&order=rate_date.desc&limit=1&select=rate`,
);
const rate = rateRow?.[0] ? Number(rateRow[0].rate) : 40;
const cats = await api('GET', `categories?user_id=eq.${uid}&select=id,name,kind`);
const catId = (name) => cats.find((c) => c.name === name)?.id ?? null;

// --- Limpiar datos previos (respetando FKs) ---
await api('DELETE', `shopping_lists?user_id=eq.${uid}`); // cascade ítems
await api('DELETE', `products?user_id=eq.${uid}`); // cascade price_records
await api('DELETE', `stores?user_id=eq.${uid}`);
await api('DELETE', `transactions?user_id=eq.${uid}`);
await api('DELETE', `savings_goals?user_id=eq.${uid}`); // cascade contribuciones
await api('DELETE', `debts?user_id=eq.${uid}`); // cascade abonos
await api('DELETE', `accounts?user_id=eq.${uid}`);
console.log('  datos previos limpiados');

// --- Cuentas ---
const [efectivo, zinli, banesco] = await insert('accounts', [
  { user_id: uid, name: 'Efectivo', type: 'cash', currency: 'USD', bank_id: null },
  { user_id: uid, name: 'Zinli', type: 'digital', currency: 'USD', bank_id: null },
  { user_id: uid, name: 'Banesco', type: 'bank', currency: 'VES', bank_id: 134 },
]);
console.log('  3 cuentas creadas');

// --- Movimientos: ~6 meses ---
const now = new Date();
const txns = [];
const addTxn = (date, account, type, usd, categoryName, description) => {
  const currency = account.currency;
  const exchange_rate = rate;
  const amount = currency === 'VES' ? round2(usd * rate) : round2(usd);
  const amount_usd = round2(usd);
  txns.push({
    user_id: uid,
    account_id: account.id,
    transfer_account_id: null,
    category_id: categoryName ? catId(categoryName) : null,
    type,
    amount,
    currency,
    exchange_rate,
    amount_usd,
    description,
    occurred_at: iso(date),
  });
};
// Transferencia entre dos cuentas de la misma moneda (mismas claves que addTxn).
const addTransfer = (date, from, to, usd, description) => {
  txns.push({
    user_id: uid,
    account_id: from.id,
    transfer_account_id: to.id,
    category_id: null,
    type: 'transfer',
    amount: round2(usd),
    currency: from.currency,
    exchange_rate: rate,
    amount_usd: round2(usd),
    description,
    occurred_at: iso(date),
  });
};

const dayMs = 86400000;
for (let offset = 182; offset >= 0; offset--) {
  const date = new Date(now.getTime() - offset * dayMs);
  const day = Number(ymd(date).slice(8, 10));

  // Saldos iniciales (fondean cada cuenta al inicio del histórico)
  if (offset === 182) {
    addTxn(date, efectivo, 'income', 250, 'Otros ingresos', 'Saldo inicial');
    addTxn(date, banesco, 'income', 400, 'Otros ingresos', 'Saldo inicial');
    addTxn(date, zinli, 'income', 300, 'Otros ingresos', 'Saldo inicial');
  }

  // Sueldo quincenal en Zinli (USD)
  if (day === 1 || day === 16) addTxn(date, zinli, 'income', randInt(300, 380), 'Salario', 'Sueldo');
  // Ingreso mensual en Bs (freelance) a Banesco, para fondear los gastos en Bs
  if (day === 10) addTxn(date, banesco, 'income', randInt(300, 400), 'Otros ingresos', 'Freelance');
  // Efectivo extra mensual
  if (day === 20) addTxn(date, efectivo, 'income', randInt(25, 60), 'Otros ingresos', 'Efectivo extra');

  // Gastos diarios variables
  const n = Math.random() < 0.75 ? randInt(1, 3) : 0;
  for (let i = 0; i < n; i++) {
    const roll = Math.random();
    if (roll < 0.5) addTxn(date, banesco, 'expense', randInt(4, 22), 'Comida', pick(['Mercado', 'Almuerzo', 'Panadería', 'Café']));
    else if (roll < 0.72) addTxn(date, banesco, 'expense', randInt(2, 10), 'Transporte', pick(['Pasaje', 'Gasolina', 'Taxi']));
    else if (roll < 0.86) addTxn(date, zinli, 'expense', randInt(6, 40), 'Ocio', pick(['Cine', 'Salida', 'Streaming', 'Videojuego']));
    else if (roll < 0.95) addTxn(date, efectivo, 'expense', randInt(3, 15), 'Otros gastos', pick(['Varios', 'Regalo', 'Propina']));
    else addTxn(date, zinli, 'expense', randInt(10, 45), 'Salud', pick(['Farmacia', 'Consulta']));
  }

  // Retiro de efectivo: transferencia Zinli → Efectivo (USD, misma moneda)
  if (day === 25) addTransfer(date, zinli, efectivo, randInt(20, 50), 'Retiro de efectivo');

  // Servicios mensuales (día 5)
  if (day === 5) {
    addTxn(date, banesco, 'expense', randInt(8, 14), 'Servicios', 'Electricidad y agua');
    addTxn(date, zinli, 'expense', 12, 'Servicios', 'Internet');
  }
}
// Insertar en lotes
for (let i = 0; i < txns.length; i += 200) await insert('transactions', txns.slice(i, i + 200));
console.log(`  ${txns.length} movimientos creados`);

// --- Deudas ---
const [pedro] = await insert('debts', [
  {
    user_id: uid,
    direction: 'i_owe',
    counterparty: 'Pedro',
    principal: 200,
    currency: 'USD',
    description: 'Préstamo',
    due_date: ymd(new Date(now.getTime() + 20 * dayMs)),
  },
]);
await insert('debts', [
  {
    user_id: uid,
    direction: 'owed_to_me',
    counterparty: 'María',
    principal: 80,
    currency: 'USD',
    description: 'Le presté',
    due_date: ymd(new Date(now.getTime() - 5 * dayMs)), // vencida
  },
]);
await insert('debt_payments', [
  { debt_id: pedro.id, user_id: uid, amount: 50, note: 'Primer abono', paid_at: iso(new Date(now.getTime() - 15 * dayMs)) },
]);
console.log('  2 deudas (una con abono, una vencida)');

// --- Metas ---
const [viaje] = await insert('savings_goals', [
  {
    user_id: uid,
    account_id: zinli.id,
    name: 'Viaje',
    target_amount: 1000,
    currency: 'USD',
    target_date: ymd(new Date(now.getTime() + 120 * dayMs)),
  },
]);
await insert('goal_contributions', [
  { goal_id: viaje.id, user_id: uid, amount: 120, contributed_at: iso(new Date(now.getTime() - 60 * dayMs)) },
  { goal_id: viaje.id, user_id: uid, amount: 100, contributed_at: iso(new Date(now.getTime() - 30 * dayMs)) },
  { goal_id: viaje.id, user_id: uid, amount: 80, contributed_at: iso(new Date(now.getTime() - 5 * dayMs)) },
]);
console.log('  1 meta con $300 reservados en Zinli');

// --- Gasto recurrente: es un atributo de la CATEGORÍA de gasto ---
const serviciosId = catId('Servicios');
if (serviciosId) {
  await api('PATCH', `categories?id=eq.${serviciosId}`, {
    is_recurring: true,
    recurring_day: 5,
  });
  console.log('  categoría "Servicios" marcada como recurrente (día 5)');
}

// --- Compras: tiendas, productos con precios, y carritos ---
const [gama] = await insert('stores', [
  { user_id: uid, name: 'Excelsior Gama' },
  { user_id: uid, name: 'Farmatodo' },
]);
const productDefs = [
  // `last` = días desde la última compra (para que "lo que hace falta" tenga vencidos)
  { name: 'Arroz', unit: 'kg', is_staple: true, typical_days: 20, last: 26, cat: 'Comida', price: 1.2 },
  { name: 'Leche', unit: 'liter', is_staple: true, typical_days: 7, last: 9, cat: 'Comida', price: 1.5 },
  { name: 'Café', unit: 'kg', is_staple: true, typical_days: 25, last: 12, cat: 'Comida', price: 6.0 },
  { name: 'Aceite', unit: 'liter', is_staple: true, typical_days: 30, last: 34, cat: 'Comida', price: 3.2 },
  { name: 'Pan', unit: 'unit', is_staple: false, typical_days: null, last: 4, cat: 'Comida', price: 1.0 },
  { name: 'Jabón', unit: 'unit', is_staple: true, typical_days: 30, last: 10, cat: 'Otros gastos', price: 1.8 },
];
const products = await insert(
  'products',
  productDefs.map((p) => ({
    user_id: uid,
    name: p.name,
    unit: p.unit,
    default_category_id: catId(p.cat),
    is_staple: p.is_staple,
    typical_days: p.typical_days,
  })),
);
const prod = (name) => products.find((p) => p.name === name);
// Historial: 5 puntos por producto. El precio real (USD) apenas se mueve, pero la
// tasa sube con el tiempo → el precio en Bs se dispara (el diferenciador §16).
const priceRows = [];
const K = 5;
products.forEach((p, i) => {
  const base = productDefs[i].price;
  const last = productDefs[i].last;
  for (let k = 0; k < K; k++) {
    const offset = last + (K - 1 - k) * 35; // del más viejo al más reciente
    const rateFactor = 0.5 + 0.5 * (k / (K - 1)); // la tasa de entonces subía hasta hoy
    const usd = round2(base * (0.94 + ((i + k) % 4) * 0.03)); // USD casi plano (±ruido)
    priceRows.push({
      user_id: uid,
      product_id: p.id,
      store_id: gama.id,
      unit_price_usd: usd,
      original_currency: 'USD',
      exchange_rate: round2(rate * rateFactor),
      recorded_at: iso(new Date(now.getTime() - offset * dayMs)),
    });
  }
});
await insert('price_records', priceRows);
console.log('  2 tiendas, 6 productos, historial de precios (tasa creciente)');

// Carrito cerrado (enlazado a un movimiento) — el ciclo completo
const doneCart = (await insert('shopping_lists', { user_id: uid, name: 'Mercado de la semana', store_id: gama.id, budget_usd: 25, status: 'completed', completed_at: iso(new Date(now.getTime() - 8 * dayMs)) }))[0];
const mercadoTxn = (await insert('transactions', { user_id: uid, account_id: banesco.id, category_id: catId('Comida'), type: 'expense', amount: round2(19.4 * rate), currency: 'VES', exchange_rate: rate, amount_usd: 19.4, description: 'Mercado en Excelsior Gama', shopping_list_id: doneCart.id, occurred_at: iso(new Date(now.getTime() - 8 * dayMs)) }))[0];
await api('PATCH', `shopping_lists?id=eq.${doneCart.id}`, { transaction_id: mercadoTxn.id });
const mkItem = (list, name, qty, unit, est, actual, checked, pos) => ({ user_id: uid, list_id: list, product_id: prod(name)?.id ?? null, name, quantity: qty, unit, estimated_price_usd: est, actual_price_usd: actual, checked, position: pos });
await insert('shopping_list_items', [
  mkItem(doneCart.id, 'Arroz', 2, 'kg', 2.4, 2.6, true, 1),
  mkItem(doneCart.id, 'Leche', 3, 'liter', 4.5, 4.8, true, 2),
  mkItem(doneCart.id, 'Café', 1, 'kg', 6.0, 6.2, true, 3),
  mkItem(doneCart.id, 'Pan', 6, 'unit', 6.0, 5.8, true, 4),
]);

// Carrito abierto (con presupuesto y estimados del historial)
const openCart = (await insert('shopping_lists', { user_id: uid, name: 'Compra pendiente', store_id: gama.id, budget_usd: 30, status: 'draft' }))[0];
await insert('shopping_list_items', [
  mkItem(openCart.id, 'Arroz', 3, 'kg', 3.6, null, false, 1),
  mkItem(openCart.id, 'Aceite', 1, 'liter', 3.2, null, false, 2),
  mkItem(openCart.id, 'Jabón', 2, 'unit', 3.6, null, false, 3),
  mkItem(openCart.id, 'Servilletas', 1, 'unit', null, null, false, 4),
]);
console.log('  2 carritos (uno cerrado, uno abierto con presupuesto)');

console.log('\nListo. Entra al dashboard para ver los datos.');
