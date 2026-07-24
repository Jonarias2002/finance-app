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

---

## 1. Prerrequisitos

Antes de escribir una línea de código:

- [ ] **Node.js 20 LTS o superior** — verificar con `node -v`
- [ ] **Git** configurado con nombre y correo
- [ ] Cuenta de **GitHub**
- [ ] Cuenta de **Supabase** (plan gratuito)
- [ ] Cuenta de **Vercel** (plan Hobby), conectada a GitHub
- [ ] **Docker Desktop** _(opcional)_ — solo si quieres correr Supabase localmente

> ⚠️ Los proyectos gratuitos de Supabase se pausan tras varios días sin actividad. Para un portafolio, entra al panel cada cierto tiempo o abre la demo periódicamente.

---

## 2. Crear el proyecto

```bash
npx create-next-app@latest finance-app
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

**Verificación:** `npm run dev` levanta la app en `http://localhost:3000`.

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
npm i -D prettier prettier-plugin-tailwindcss husky lint-staged
npx husky init
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
npx lint-staged
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
npm i @supabase/supabase-js @supabase/ssr
npx supabase init
npx supabase link --project-ref <TU_PROJECT_REF>
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
npx supabase migration new initial_schema
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
npx supabase db push
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
npx shadcn@latest init
npx shadcn@latest add button input select card table dialog form badge alert
```

Cargar aquí los tokens del diseño propio: colores, tipografía, radios y espaciados.

---

## 11. Internacionalización

```bash
npm i next-intl
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

Programación: cron de Vercel (`vercel.json`) o `pg_cron` dentro de Supabase. `pg_cron` te independiza del hosting.

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
npm i -D vitest @vitest/ui
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

- [ ] `npm run dev` levanta sin errores
- [ ] `npm run typecheck` pasa limpio
- [ ] `npm run lint` pasa limpio
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

Una vez completado lo anterior:

1. Cuentas y categorías (CRUD base)
2. Transacciones con conversión de moneda
3. Gastos fijos recurrentes
4. Deudas y préstamos
5. Metas de ahorro con saldo reservado
6. Dashboard, agregaciones y alertas
7. Panel de administración
8. Pulido, estados vacíos y seed de demostración

---

_Última actualización: julio 2026_
