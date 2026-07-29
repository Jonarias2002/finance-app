# Finance App — Guía de inicialización del proyecto

> Documento de referencia. Sigue los pasos en orden; cada bloque termina en un estado verificable.
> **Convención:** todo el código, nombres de tablas, archivos y carpetas van en **inglés**. La interfaz va en **español** (con opción a inglés vía i18n).

---

## 0. Registro de decisiones técnicas (ADR)

Estas decisiones ya están cerradas. Si alguna cambia, actualiza este documento primero.

| #   | Decisión              | Elección                                                                                  | Motivo                                                                                                  |
| --- | --------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| 01  | Framework             | Next.js (App Router) + TypeScript                                                         | Frontend y backend en un solo despliegue                                                                |
| 02  | Hosting               | Vercel (plan gratuito)                                                                    | Integración nativa con Next.js                                                                          |
| 03  | Base de datos         | Supabase (PostgreSQL)                                                                     | Relacional + Auth + RLS en un servicio gratuito                                                         |
| 04  | Arquitectura          | Monolito modular, capas + organización por feature                                        | Dominio aislado y testeable                                                                             |
| 05  | Estilos               | Tailwind CSS + shadcn/ui                                                                  | Acabado profesional sin diseñar componentes                                                             |
| 06  | Validación            | Zod en el borde del servidor                                                              | Los Server Actions son el límite de confianza                                                           |
| 07  | Autenticación         | Correo + contraseña, sin confirmación por email                                           | El SMTP gratuito de Supabase solo envía a miembros de la organización y está limitado a ~2 correos/hora |
| 08  | Recuperación de clave | Panel de administrador                                                                    | Consecuencia directa de 07                                                                              |
| 09  | Roles                 | `user` y `admin`, en tabla `user_roles`                                                   | Evita que el usuario se auto-promueva                                                                   |
| 10  | Moneda canónica       | USD, `numeric(14,2)`                                                                      | Nunca `float`                                                                                           |
| 11  | Tasa de cambio        | DolarAPI (`https://ve.dolarapi.com/v1/dolares`), sincronizada 1 vez al día a tabla propia | Gratuita, sin API key. Respaldo: Cotizave                                                               |
| 12  | Histórico de tasas    | Cada transacción guarda la tasa usada                                                     | El histórico no debe cambiar cuando se mueve el dólar                                                   |
| 13  | Zona horaria          | `America/Caracas` (UTC−4), almacenamiento en UTC                                          | Agrupar reportes por fecha local                                                                        |
| 14  | Ciclo mensual         | `calendar` (por defecto), `fixed_day`, `rolling_30`                                       | Un solo cálculo centralizado en Postgres                                                                |
| 15  | Metas de ahorro       | Transferencia, no gasto                                                                   | El ahorro no sale del patrimonio                                                                        |
| 16  | Saldos                | `total_balance`, `reserved_balance`, `available_balance`                                  | Reserva por cuenta, no global                                                                           |
| 17  | Alertas               | Calculadas en el dominio, no persistidas                                                  | Sin cron ni correos                                                                                     |
| 18  | i18n                  | `next-intl`, estrategia por cookie                                                        | App privada, no necesita prefijo en la URL                                                              |
| 19  | Migraciones           | Archivos `.sql` versionados en el repo                                                    | Nunca cambiar el esquema desde el panel                                                                 |
| 20  | Presupuesto           | Todo en planes gratuitos                                                                  | Restricción del proyecto                                                                                |
| 21  | Gestor de paquetes    | **pnpm** (lockfile único `pnpm-lock.yaml`, sin `package-lock.json`)                       | Instalación rápida, disco eficiente, `node_modules` estricto. Comandos en AGENTS.md                     |

---

## 1. Prerrequisitos

Antes de escribir una línea de código:

- [ ] **Node.js 20 LTS o superior** — verificar con `node -v`
- [ ] **pnpm 11+** — gestor de paquetes del proyecto (`corepack enable` o `npm i -g pnpm`)
- [ ] **Git** configurado con nombre y correo
- [ ] Cuenta de **GitHub**
- [ ] Cuenta de **Supabase** (plan gratuito)
- [ ] Cuenta de **Vercel** (plan Hobby), conectada a GitHub
- [ ] **Docker Desktop** _(opcional)_ — solo si quieres correr Supabase localmente

> ⚠️ Los proyectos gratuitos de Supabase se pausan tras varios días sin actividad. Para un portafolio, entra al panel cada cierto tiempo o abre la demo periódicamente.

---

## 2. Crear el proyecto

```bash
pnpm create next-app@latest finance-app
```

Responde:

| Pregunta           | Respuesta |
| ------------------ | --------- |
| TypeScript         | **Sí**    |
| ESLint             | **Sí**    |
| Tailwind CSS       | **Sí**    |
| `src/` directory   | **Sí**    |
| App Router         | **Sí**    |
| Import alias `@/*` | **Sí**    |

```bash
cd finance-app
git init
git branch -M main
```

**Verificación:** `pnpm dev` levanta la app en `http://localhost:3000`.

---

## 3. TypeScript estricto

En `tsconfig.json`:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

Activarlo ahora cuesta cero; activarlo con 3.000 líneas escritas cuesta un fin de semana.

---

## 4. Calidad de código

```bash
pnpm add -D prettier prettier-plugin-tailwindcss husky lint-staged
pnpm exec husky init
```

`.prettierrc`:

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

En `package.json`:

```json
{
  "scripts": {
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "format": "prettier --write .",
    "test": "vitest run"
  },
  "lint-staged": {
    "*.{ts,tsx}": ["prettier --write", "eslint --fix"]
  }
}
```

En `.husky/pre-commit`:

```bash
pnpm exec lint-staged
```

**Verificación:** un commit con un error de tipos o formato no pasa.

---

## 5. Estructura de carpetas

```
finance-app/
├── db/
│   ├── migrations/            # .sql versionados, numerados
│   └── seed.sql               # datos de demostración
├── messages/
│   ├── es.json
│   └── en.json
├── public/
├── src/
│   ├── app/
│   │   ├── (auth)/login/
│   │   ├── (dashboard)/
│   │   │   ├── page.tsx
│   │   │   ├── income/
│   │   │   ├── fixed-expenses/
│   │   │   ├── debts/
│   │   │   ├── goals/
│   │   │   ├── accounts/
│   │   │   └── settings/
│   │   ├── (admin)/admin/
│   │   ├── api/cron/sync-rates/
│   │   └── layout.tsx
│   ├── proxy.ts                  # Next.js 16: antes middleware.ts
│   │
│   ├── features/
│   │   ├── transactions/      # components/ actions.ts use-cases.ts repository.ts schemas.ts
│   │   ├── accounts/
│   │   ├── categories/
│   │   ├── debts/
│   │   ├── goals/
│   │   ├── recurring/
│   │   ├── exchange-rates/
│   │   ├── shopping/           # carritos, ítems, cierre de compra (§16)
│   │   ├── products/           # catálogo, tiendas, historial de precios
│   │   ├── tutorial/           # guía en la app (§17)
│   │   └── admin/
│   │
│   ├── domain/                # lógica pura, sin imports externos
│   │   ├── money.ts
│   │   ├── balance.ts
│   │   ├── cycle.ts
│   │   ├── goal-projection.ts
│   │   └── alerts.ts
│   │
│   ├── lib/
│   │   ├── supabase/          # server.ts client.ts proxy.ts admin.ts
│   │   ├── i18n/
│   │   └── utils/
│   │
│   ├── components/ui/         # shadcn
│   └── types/
└── tests/
```

**Regla de dependencias:** las importaciones apuntan hacia adentro. `domain/` no importa nada de `features/`, `lib/` ni `app/`.

---

## 6. Proyecto en Supabase

1. Crear proyecto nuevo en el panel de Supabase
2. **Región:** la más cercana a Venezuela (`us-east-1`)
3. Guardar la contraseña de la base de datos en un gestor de contraseñas
4. En **Authentication → Providers → Email**: desactivar _Confirm email_
5. En **Authentication → Providers**: desactivar los proveedores que no vas a usar

```bash
pnpm add @supabase/supabase-js @supabase/ssr
pnpm dlx supabase init
pnpm dlx supabase link --project-ref <TU_PROJECT_REF>
```

---

## 7. Variables de entorno

`.env.local` (nunca se sube al repo):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...        # SIN prefijo NEXT_PUBLIC_. Ignora RLS.
EXCHANGE_API_URL=https://ve.dolarapi.com/v1/dolares
CRON_SECRET=...                       # cadena aleatoria larga
```

Crear también `.env.example` con las mismas claves vacías, ese sí versionado.

> El panel de Supabase puede mostrar las claves con nomenclatura nueva (_publishable_ / _secret_) además de la clásica (_anon_ / _service_role_). Usa la que corresponda a tu proyecto.

**Regla de seguridad:** la `service_role` key solo se lee dentro de Server Actions o Route Handlers, jamás en un componente cliente.

---

## 8. Migración inicial

```bash
pnpm dlx supabase migration new initial_schema
```

> **Nota:** el CLI crea las migraciones en `supabase/migrations/` (ruta que lee
> `supabase db push`), no en `db/migrations/`. Se respeta la convención del CLI;
> `db/migrations/` queda solo como referencia y `db/seed.sql` para datos demo.

Orden de creación dentro del archivo:

1. Extensiones — `pgcrypto`, `pg_trgm`
2. `banks` — catálogo con código de pago móvil (0102 BDV, 0105 Mercantil, 0134 Banesco…). El BOD ya no existe: forma parte del BNC
3. `profiles` — moneda base, zona horaria, locale, tipo de ciclo
4. `user_roles` + función `is_admin()` con `security definer`
5. `accounts` — `cash` / `bank` / `digital`, con moneda propia
6. `categories` — `income` / `expense`, con `parent_id` nullable
7. `exchange_rates` — tasa por día y fuente
8. `transactions` — libro contable único, `description` obligatoria
9. `recurring_transactions` — plantillas de gastos fijos
10. `debts` + `debt_payments` — `i_owe` / `owed_to_me`
11. `savings_goals` + `goal_contributions`
12. `budgets`
13. `audit_log`
14. Función `get_cycle_bounds(user_id, ref_date)`
15. Vista `account_balances` — total, reservado, disponible
16. **Políticas RLS en todas las tablas**
17. Trigger `on_auth_user_created` — crea perfil, rol y categorías por defecto

```bash
pnpm dlx supabase db push
```

**Verificación crítica:** crear dos usuarios de prueba y confirmar que ninguno ve los datos del otro. Si una tabla quedó sin política, cualquiera con la clave pública lee todo.

---

## 9. Clientes de Supabase

Tres archivos en `src/lib/supabase/`:

| Archivo     | Uso                                              | Clave            |
| ----------- | ------------------------------------------------ | ---------------- |
| `client.ts` | Componentes cliente                              | anon             |
| `server.ts` | Server Components y Server Actions (lee cookies) | anon             |
| `admin.ts`  | Solo panel admin, solo servidor                  | **service_role** |

Y `src/proxy.ts` para refrescar la sesión y proteger rutas. **Next.js 16 renombró
`middleware.ts` a `proxy.ts`** (misma función, exporta `proxy` en vez de `middleware`);
va en `src/`, al mismo nivel que `app/`, no dentro de `app/`.

> No mezclar el cliente de servidor con el de navegador. Es el error más común y produce sesiones fantasma difíciles de depurar.

---

## 10. Interfaz base

```bash
pnpm dlx shadcn@latest init
pnpm dlx shadcn@latest add button input select card table dialog form badge alert
```

Cargar aquí los tokens del diseño propio: colores, tipografía, radios y espaciados.

---

## 11. Internacionalización

```bash
pnpm add next-intl
```

- Mensajes en `messages/es.json` y `messages/en.json`
- Idioma persistido en `profiles.locale`, con el navegador como valor inicial
- Formato de números y moneda **siempre** con `Intl.NumberFormat(locale, { style: 'currency' })`

> Regla estricta desde el primer componente: **cero texto literal en el JSX**. Siempre `t('...')`.

---

## 12. Sincronización de tasas

Route handler en `src/app/api/cron/sync-rates/route.ts`:

1. Verifica el header `Authorization` contra `CRON_SECRET`
2. Consulta `EXCHANGE_API_URL`
3. Hace `upsert` en `exchange_rates` para la fecha de hoy (oficial y paralelo)
4. Si la API falla, deja la última tasa conocida y registra el error

Programación: cron de Vercel (`vercel.json`, ya en el repo) o `pg_cron` dentro de
Supabase. El `vercel.json` la agenda a las 13:00 UTC — 9:00 en Caracas, con las
tasas del día ya publicadas. Vercel manda `Authorization: Bearer $CRON_SECRET`
por su cuenta, que es justo lo que valida la ruta, así que **basta con definir
`CRON_SECRET` en las variables de entorno del proyecto**. En el plan Hobby el
disparo es aproximado (dentro de la hora) y hay tope de un cron diario; si algún
día molesta esa dependencia del hosting, `pg_cron` hace lo mismo desde Supabase.

**Verificación:** llamar el endpoint a mano y confirmar que aparece la fila del día en `exchange_rates`.

---

## 13. Git y despliegue

```bash
git checkout -b dev
```

- `main` → producción · `dev` → desarrollo · ramas `feat/*` por funcionalidad
- Commits convencionales: `feat:`, `fix:`, `chore:`, `docs:`

Subir a GitHub, importar el repositorio en Vercel y cargar las variables de entorno en **Settings → Environment Variables** (Production y Preview).

**Verificación:** hacer deploy con la app todavía vacía. Los problemas de configuración deben aparecer ahora, no dentro de tres semanas.

---

## 14. Pruebas y CI

```bash
pnpm add -D vitest @vitest/ui
```

Tests solo sobre `src/domain/`:

- `money.ts` — redondeo y conversión
- `balance.ts` — disponible vs reservado
- `cycle.ts` — los tres modos, incluido febrero
- `goal-projection.ts` — proyección de metas
- `alerts.ts` — cada regla de alerta

GitHub Action en `.github/workflows/ci.yml` que corra `lint`, `typecheck` y `test` en cada pull request.

---

## 15. Documentación del repositorio

Desde el primer commit:

- `README.md` — qué es, capturas, stack, decisiones técnicas y cómo levantarlo
- `docs/erd.png` — diagrama entidad-relación
- `SETUP.md` — este documento
- `.env.example`

---

## Checklist final

Antes de dar por inicializado el proyecto:

- [ ] `pnpm dev` levanta sin errores
- [ ] `pnpm typecheck` pasa limpio
- [ ] `pnpm lint` pasa limpio
- [ ] Un commit con error de formato es rechazado por el hook
- [ ] Migración aplicada en Supabase
- [ ] **RLS probada con dos usuarios distintos**
- [ ] Registro e inicio de sesión funcionan
- [ ] La sesión persiste al recargar y al cerrar el navegador
- [ ] Un usuario normal no puede entrar a `/admin`
- [ ] El endpoint de tasas guarda la fila del día
- [ ] Cambio de idioma es→en funciona
- [ ] Deploy en Vercel accesible por URL pública
- [ ] `.env.local` está en `.gitignore` y no hay claves en el historial de Git

---

## Orden sugerido de desarrollo

Una vez completado lo anterior (el shell, i18n, auth y la persistencia de
preferencias en `profiles` ya están hechos):

1. Cuentas y categorías (CRUD base) — ✅ hecho
2. Transacciones con conversión de moneda — ✅ hecho
3. Gastos fijos recurrentes — ✅ hecho (con "registrar ahora"; falta agendar el auto-registro)
4. Deudas y préstamos — ✅ hecho (deuda + abonos, saldado automático)
5. Metas de ahorro con saldo reservado — ✅ hecho (reserva/libera vía `account_balances`)
6. Dashboard, agregaciones y alertas — ✅ hecho (KPIs, gráficas con filtro semana/mes/3m/6m, alertas)
7. Panel de administración — ✅ hecho (`/admin`: usuarios, roles, reset de contraseña)
8. Pulido, estados vacíos y seed de demostración — ✅ hecho (`db/seed-demo.mjs`)

**Pendientes conocidos de la v1** (diferidos a propósito):

- **Transferencias entre cuentas** — ✅ hecho (misma moneda: un asiento
  `transfer` con `transfer_account_id`; la vista resta del origen y suma al
  destino). Cross-moneda (USD↔Bs) queda fuera: la vista suma el monto en la
  moneda del origen, así que convertir requeriría un segundo monto/columna.
- **Agendar los cron**: `/api/cron/sync-rates` ya queda agendada por `vercel.json`
  al desplegar (§12). Falta el del "registrar ahora" de gastos fijos, que sigue
  siendo manual. En local no hay cron: el sello de la tasa se ve "desactualizada"
  porque la fila más reciente de `exchange_rates` no es de hoy — no es un fallo,
  la app sigue con la última tasa conocida.
- **Migración `20260728120000_transaction_store.sql` sin aplicar**: `pnpm db:apply`
  necesita `SUPABASE_ACCESS_TOKEN` en `.env.local`. Hasta aplicarla, guardar un
  gasto con tienda falla con el error genérico.

Terminada la v1, el siguiente gran módulo es el **Carrito de compras con
presupuesto** (§16).

---

## 16. Módulo v2 — Carrito de compras con presupuesto

> No entra en la v1. Es un módulo completo —cuatro tablas nuevas + una columna,
> tres pantallas y la lógica de estimación— y se construye **después** de que la
> v1 esté funcional. Meterlo antes alarga la primera versión y arriesga no
> terminar ninguna de las dos. Para el portafolio incluso conviene que sea
> posterior: "v1 funcional, luego extendida con un módulo de compras" cuenta
> mejor historia que un proyecto que intentó todo de una vez.

**Estado.** Módulo completo. Incremento 1: migración (4 tablas + columna
`shopping_list_id`), catálogo de productos/tiendas (`/products`), carritos con
presupuesto y checklist (`/shopping`), y cerrar compra (con fecha) → un movimiento
(categoría elegida) + registro de precios. Incremento 2: detalle de producto
(`/products/[id]`) con **gráfica de precio y toggle USD/Bs** (el diferenciador:
en Bs sube, en USD se mantiene), y botón **"agregar lo que hace falta"** que arma
la lista con los básicos vencidos (`is_staple` + `typical_days` + última compra).
Restringido a la moneda de la cuenta de pago (cross-moneda pendiente, como en
transferencias).

**Encuadre.** Un carrito es un _movimiento en borrador_: la etapa previa de algo
que el sistema ya maneja. Al cerrar la compra, el carrito se convierte en un
gasto normal (categoría _Comida_). Ese ciclo cerrado es lo valioso: cada compra
registra precios que mejoran el estimado de la siguiente. Sin el historial de
precios, el presupuesto del carrito sería adivinanza.

### Modelo de datos

Cuatro tablas nuevas y **una sola** columna en `transactions`. Convenciones del
proyecto: nombres en inglés, `numeric(14,2)` para dinero, `timestamptz` en UTC,
`user_id` denormalizado en cada tabla para RLS directa (igual que `debt_payments`
y `goal_contributions`), y **RLS `owner all`** en todas.

Enums nuevos, al estilo de los existentes:

```sql
create type public.shopping_status as enum ('draft', 'shopping', 'completed', 'cancelled');
create type public.product_unit    as enum ('unit', 'kg', 'g', 'liter', 'ml', 'pack');
```

```sql
-- supermercados
stores (
  id uuid pk, user_id → auth.users on delete cascade,
  name text not null, created_at timestamptz
)

-- catálogo personal de productos
products (
  id uuid pk, user_id → auth.users on delete cascade,
  name text not null,
  unit public.product_unit not null default 'unit',
  default_category_id → categories on delete set null,
  is_staple    boolean not null default false,   -- ¿se compra siempre?
  typical_days smallint,                          -- cada cuántos días se repone
  created_at timestamptz
)

-- historial de precios (el corazón del módulo)
price_records (
  id uuid pk, user_id → auth.users on delete cascade,
  product_id → products on delete cascade,
  store_id   → stores  on delete set null,
  unit_price_usd    numeric(14,2) not null,            -- canónico en USD (ADR 10)
  original_amount   numeric(14,2),                     -- lo que pagaste en Bs/USD
  original_currency char(3) not null default 'USD',
  exchange_rate     numeric(18,6) not null default 1,  -- tasa de ese día (ADR 12)
  recorded_at timestamptz not null default now(),
  note text
)
-- índice (product_id, recorded_at desc) para resolver "último precio" rápido

-- carritos
shopping_lists (
  id uuid pk, user_id → auth.users on delete cascade,
  name text not null,
  store_id → stores on delete set null,
  budget_usd numeric(14,2),                            -- límite opcional
  status public.shopping_status not null default 'draft',
  transaction_id → transactions on delete set null,    -- se llena al cerrar
  started_at timestamptz not null default now(),
  completed_at timestamptz
)

-- ítems del carrito / checklist
shopping_list_items (
  id uuid pk, user_id → auth.users on delete cascade,
  list_id    → shopping_lists on delete cascade,
  product_id → products on delete set null,            -- null = ítem ad-hoc
  name text,                                           -- ad-hoc o snapshot del nombre
  quantity numeric(12,3) not null default 1,
  unit public.product_unit not null default 'unit',
  estimated_price_usd numeric(14,2),                   -- del último price_record
  actual_price_usd    numeric(14,2),                   -- corregido al marcar
  checked boolean not null default false,
  position smallint not null default 0,
  created_at timestamptz
)
```

Y en `transactions`, una columna nullable — **parte de esta migración v2, no de
la inicial**: la migración inicial ya está aplicada y la tabla `shopping_lists`
no existía aún para la FK. Añadirla aquí es un `alter` trivial, sin migración de
datos:

```sql
alter table public.transactions
  add column shopping_list_id uuid references public.shopping_lists (id) on delete set null;
```

Y una segunda, ya en v2.1 (`20260728120000_transaction_store.sql`): la tienda de
un gasto suelto, para que comprar sin carrito también alimente el "dónde compro
más barato". La regla vive en la tabla, no en el formulario:

```sql
alter table public.transactions
  add column store_id uuid references public.stores (id) on delete set null;

-- Solo un gasto ocurre en una tienda.
alter table public.transactions
  add constraint transactions_store_only_expense
  check (store_id is null or type = 'expense');

-- Parcial: por el check, ingresos y transferencias llevan null y son la mayoría.
create index transactions_store_idx on public.transactions (store_id, occurred_at desc)
  where store_id is not null;
```

El formulario de movimientos solo enseña el selector cuando el tipo es gasto, y
`transactionSchema` lo anula con un `.transform()` para el envío manipulado — la
UI es comodidad, el check es quien manda. Al cerrar un carrito, el gasto hereda
la tienda de la lista.

### Las tres reglas que lo definen

1. **El presupuesto avisa, no bloquea.** El total corre en vivo contra
   `budget_usd`. Tres estados con los tokens ya existentes: normal (`ink`), sobre
   el 85 % en `ocre`, excedido en `ladrillo`. Puedes seguir agregando — misma
   filosofía que el resto de la app: en la caja no puede negártelo.
2. **Un carrito = un solo asiento.** Al cerrar se crea **una** transacción con el
   total, categoría _Comida_, la cuenta con que pagaste y descripción automática
   ("Mercado en Excelsior Gama"). Los productos quedan como detalle enlazado
   (`shopping_list_items`), no como filas del libro contable. Registrar cada
   producto por separado haría la tabla de movimientos ilegible en dos meses.
3. **Estimado ≠ real.** El estimado sale del último `price_records` de ese
   producto en esa tienda. Al marcar el ítem corriges al precio real, y esa
   corrección **alimenta el historial**. Ese lazo es el mecanismo completo: sin
   él, el módulo es una lista de compras cualquiera.

### El diferenciador — precio real vs. tasa

Como cada precio se guarda en USD y en la moneda original con la tasa del día
(ADR 10/12), el módulo responde algo que ninguna app genérica responde:

> El kilo de queso pasó de 45.000 a 61.000 Bs — pero en dólares bajó de $ 4,80 a
> $ 4,72. No subió de precio: se movió la tasa.

Un gráfico de **precio real (USD) por producto** a lo largo de los meses es el
tipo de detalle que hace que alguien revisando el proyecto se detenga. Reutiliza
el sistema de tasas y el formato monetario (`Figure`, `formatMoney`) ya montados.

### "Qué hace falta" — sin tabla adicional

Con `is_staple`, `typical_days` y la fecha del último `price_records`:

```
Arroz   — última compra hace 24 días (sueles comprarlo cada 15)  ← vencido
Aceite  — última compra hace 18 días (cada 20)
Café    — hace 6 días
```

Un botón **"Agregar lo que hace falta"** arma la lista con los productos vencidos.
Como los estimados vienen del historial, la lista nace con un total aproximado
antes de salir de casa.

### Pantallas (3) y rutas

1. **Carritos** (`/shopping`) — lista de `shopping_lists` por estado, cada una con
   barra de presupuesto (reutiliza el patrón de `BalanceBar`).
2. **Carrito activo** — checklist de ítems, total en vivo vs. límite, marcar y
   corregir precio, "agregar lo que hace falta", y botón _Cerrar compra_ que
   genera la transacción y enlaza `transaction_id` ↔ `shopping_list_id`.
3. **Catálogo de productos** (`/products`) — historial de precios con gráfico USD
   vs. Bs, y edición de `is_staple` / `typical_days` / categoría por defecto.

Ambas rutas entran al sidebar solo-escritorio, junto a Cuentas y Categorías.

---

## 17. Guía en la app

Un icono `Info` junto al saludo del inicio abre `TutorialDialog`
(`src/features/tutorial/`): un índice de los nueve módulos y, por cada uno, una
ficha con tres bloques — **qué es**, **qué te pide el formulario** y **dónde lo
usas después**. Ese tercer bloque es la razón de existir de la guía: lo que no
se deduce de la interfaz es que un producto reaparece en el carrito, que la
categoría por defecto de un producto es lo que clasifica una compra cerrada, o
que una deuda no mueve el saldo de ninguna cuenta.

Dos decisiones que conviene no deshacer sin querer:

- **La prosa vive en `messages/*.json`**, namespace `tutorial`, no en el
  componente. Regla del proyecto: cero texto literal en el JSX (§11).
- **El nombre de cada módulo se lee del namespace `nav`**, no de `tutorial`.
  Renombrar una sección en el menú la renombra también en la guía; duplicarlo
  garantizaba que se desincronizaran.

El icono es `Info` y no `!` a propósito: en este sistema el ocre y el `!` ya
significan _aviso_ (sobregasto, deuda vencida), y un `!` fijo en la cabecera se
leería como que algo va mal.

---

## 18. Sistema de diseño — reglas que se rompen solas

Apuntes de mantenimiento, todos aprendidos rompiéndolos:

- **Nada de clases de botón copiadas.** `Button` exporta también
  `buttonClass({variant, size, className})` para los `<Link>` que deben verse
  como botón (envolver un `Link` de Next en `Button` pierde el prefetch). Copiar
  la cadena de clases es lo que hizo que el mismo CTA acabara con dos alturas
  distintas en dos pantallas.
- **El área táctil es un tamaño, no un parche.** `size="touch"` = `sm` con el
  alto de `md` mientras la pantalla es de móvil. Sustituye al `h-11 sm:h-9`
  suelto por botón.
- **El desbordamiento se contiene en el componente.** `Tabs` lleva
  `overflow-x-auto` + `shrink-0`: cuatro pestañas empujaban el ancho de la
  página entera en móvil. Si aparece otra tira horizontal, mismo tratamiento —
  no un `overflow-hidden` en la página.
- **Las versalitas son `Label`.** `text-label text-sage font-medium uppercase`
  escrito a mano acaba con un `tracking` distinto en cada sitio; el
  interletraje lo fija la escala (`--text-label--letter-spacing`).
- **Los colores solo se definen en `globals.css`.** Si añades un token, regístralo
  también en los `classGroups` de `src/lib/cn.ts`: tailwind-merge no conoce los
  nombres propios y, sin eso, no puede deduplicar (`text-body` y `text-canvas`
  caerían en el mismo grupo).

---

_Última actualización: julio 2026_
