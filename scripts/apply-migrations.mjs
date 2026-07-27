// Aplica las migraciones pendientes vía la Management API de Supabase (HTTPS/443).
// En esta red el puerto 5432 está bloqueado, así que `supabase db push` falla; este
// script hace lo mismo por HTTP: corre el SQL de cada migración no aplicada (una por
// transacción implícita) y la registra en supabase_migrations.schema_migrations.
//
// Uso:  pnpm db:apply            -> aplica todas las pendientes
//       pnpm db:apply --dry-run  -> solo lista qué aplicaría
//
// Requiere en .env.local (o en el entorno):
//   SUPABASE_ACCESS_TOKEN  token personal sbp_... (https://supabase.com/dashboard/account/tokens)
//   SUPABASE_PROJECT_REF   ref del proyecto
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MIGRATIONS_DIR = join(ROOT, 'supabase', 'migrations');

function loadEnv(path) {
  const env = {};
  try {
    for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch {
    /* sin .env.local: se usa solo el entorno */
  }
  return env;
}

const env = loadEnv(join(ROOT, '.env.local'));
const token = process.env.SUPABASE_ACCESS_TOKEN || env.SUPABASE_ACCESS_TOKEN;
const ref = process.env.SUPABASE_PROJECT_REF || env.SUPABASE_PROJECT_REF;
const dryRun = process.argv.includes('--dry-run');

async function runQuery(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${text}`);
  return text ? JSON.parse(text) : [];
}

async function main() {
  if (!token) {
    console.error(
      'Falta SUPABASE_ACCESS_TOKEN. Agrégalo a .env.local (token sbp_... de\n' +
        'https://supabase.com/dashboard/account/tokens).',
    );
    return 2;
  }
  if (!ref) {
    console.error('Falta SUPABASE_PROJECT_REF en .env.local.');
    return 2;
  }

  // Migraciones locales: <version 14 dígitos>_<nombre>.sql
  const local = readdirSync(MIGRATIONS_DIR)
    .map((file) => file.match(/^(\d{14})_(.+)\.sql$/))
    .filter(Boolean)
    .map((m) => ({ version: m[1], name: m[2], file: m[0] }))
    .sort((a, b) => a.version.localeCompare(b.version));

  const appliedRows = await runQuery(
    'select version from supabase_migrations.schema_migrations order by version;',
  );
  const applied = new Set(appliedRows.map((r) => r.version));
  const pending = local.filter((m) => !applied.has(m.version));

  if (pending.length === 0) {
    console.log('Sin migraciones pendientes. La base está al día.');
    return 0;
  }

  console.log(`Pendientes (${pending.length}):`);
  for (const m of pending) console.log(`  · ${m.version}_${m.name}`);

  if (dryRun) {
    console.log('\n--dry-run: no se aplicó nada.');
    return 0;
  }

  for (const m of pending) {
    const sql = readFileSync(join(MIGRATIONS_DIR, m.file), 'utf8');
    process.stdout.write(`\nAplicando ${m.version}_${m.name}… `);
    await runQuery(sql);
    const safeName = m.name.replace(/'/g, "''");
    await runQuery(
      `insert into supabase_migrations.schema_migrations (version, name)
       values ('${m.version}', '${safeName}') on conflict (version) do nothing;`,
    );
    console.log('OK');
  }

  console.log('\n✔ Migraciones aplicadas.');
  return 0;
}

// Sin process.exit(): en Windows, salir mientras fetch cierra sockets dispara una
// assertion de libuv. Fijamos exitCode y dejamos que el bucle de eventos termine.
main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((e) => {
    console.error('\nERROR: ' + e.message);
    console.error('Se detuvo. Corrige y vuelve a ejecutar (las ya aplicadas se saltan).');
    process.exitCode = 1;
  });
