import Image from 'next/image';
import { getLocale, getTranslations } from 'next-intl/server';
import { Wallet, ChartNoAxesCombined, TrendingUp } from 'lucide-react';
import { Label, Wordmark } from '@/components/ui';
import { LoginForm } from '@/features/auth/login-form';
import { LanguageToggle } from '@/features/settings/language-toggle';
import type { Locale } from '@/i18n/request';

const HIGHLIGHTS = [
  { key: 'accounts', icon: Wallet },
  { key: 'goalsDebts', icon: ChartNoAxesCombined },
  { key: 'rate', icon: TrendingUp },
] as const;

export default async function LoginPage() {
  const t = await getTranslations('auth');

  // El idioma sí se elige antes de entrar: sin sesión, la acción solo escribe
  // la cookie (el perfil se sincroniza al iniciar sesión). El tema no se toca
  // aquí — el acceso siempre va en oscuro y se ajusta desde Ajustes.
  const locale = (await getLocale()) as Locale;

  return (
    // `theme-obsidian` fija la paleta oscura en este ámbito: el acceso se ve
    // igual sea cual sea el tema guardado.
    <main className="theme-obsidian bg-canvas text-ink min-h-dvh lg:grid lg:grid-cols-[11fr_9fr]">
      {/* Panel de marca: solo en pantallas anchas; en móvil manda el formulario. */}
      {/* Los ritmos verticales van en `clamp` contra `vh`, no en pasos fijos:
          es lo que garantiza que el panel entre en la altura disponible sin
          que aparezca scroll. El relleno inferior es mayor porque el pie va
          absoluto y hay que reservarle sitio al centrar el contenido. */}
      <section className="bg-panel text-panel-ink relative hidden flex-col justify-center overflow-hidden px-10 pt-[clamp(2rem,5vh,4rem)] pb-[clamp(4rem,9vh,7rem)] lg:flex xl:px-14 2xl:px-16">
        {/* Luz ambiental del panel. Estática: el que se mueve es el cofre. */}
        <div
          aria-hidden
          className="bg-ocre/10 pointer-events-none absolute -top-40 -left-32 size-[34rem] rounded-full blur-3xl"
        />

        <div className="relative space-y-[clamp(1.25rem,3.5vh,3rem)]">
          {/* En bloque: es hijo directo del ritmo `space-y` del panel. */}
          <Wordmark size="md" className="flex" />

          {/* Titular y bajada a todo el ancho del panel: no comparten fila con
              el cofre, así el salto a 48px cabe en dos líneas ya desde xl. */}
          <div className="space-y-3">
            <h2 className="text-title xl:text-hero font-display font-bold">
              {t.rich('tagline', {
                accent: (chunks) => <span className="text-ocre">{chunks}</span>,
              })}
            </h2>
            <p className="text-body 2xl:text-body-lg text-panel-ink/70 max-w-3xl">{t('lead')}</p>
          </div>

          {/* Solo las features comparten fila con el cofre. */}
          <div className="flex items-end gap-8 2xl:gap-12">
            <ul className="min-w-0 flex-1 space-y-[clamp(0.75rem,2vh,1.5rem)]">
              {HIGHLIGHTS.map(({ key, icon: Icon }) => (
                <li key={key} className="group flex items-start gap-4">
                  <span className="rounded-control bg-panel-ink/[0.08] text-ocre group-hover:bg-ocre group-hover:text-on-ocre flex size-10 shrink-0 items-center justify-center transition-colors 2xl:size-11">
                    <Icon aria-hidden className="size-5" />
                  </span>
                  <div className="space-y-1">
                    <p className="text-card font-display font-semibold">
                      {t(`highlights.${key}.title`)}
                    </p>
                    <p className="text-caption 2xl:text-body text-panel-ink/60">
                      {t(`highlights.${key}.description`)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            {/* Decorativa: todo lo que dice ya está en el texto de al lado, así
                que va con alt vacío. Sin `priority` — se oculta por debajo de xl
                y la precarga no entiende de media queries: sería peso muerto en
                móvil.

                El ancho va en porcentaje del panel y no en pasos fijos: así las
                features conservan siempre la misma proporción y no se
                estrangulan entre breakpoints. */}
            <Image
              src="/vault.webp"
              alt=""
              width={720}
              height={648}
              // Sin `sizes`, next/image solo ofrece los candidatos grandes del
              // srcset y descarga el original de 720px para un hueco de ~250.
              sizes="(min-width: 1536px) 22vw, 20vw"
              className="drift hidden w-[28%] max-w-85 shrink-0 xl:block"
            />
          </div>
        </div>

        <Label className="text-panel-ink/50 absolute bottom-[clamp(1.5rem,4vh,3rem)] left-10 tracking-[0.15em] xl:left-14 2xl:left-16">
          {t('subtitle')}
        </Label>
      </section>

      {/* El relleno superior tiene suelo de 4rem: es lo que necesita el selector
          de idioma, que va absoluto en esa esquina. */}
      <section className="relative flex min-h-dvh items-center justify-center px-6 pt-[clamp(4rem,10vh,6rem)] pb-[clamp(1.5rem,4vh,3rem)] lg:min-h-0 lg:px-8 xl:px-12">
        {/* Textura suave detrás de la tarjeta, para que el desenfoque tenga algo
            que desenfocar. Gradiente sobre el token, no un hex suelto. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.06] [background:radial-gradient(70%_50%_at_75%_10%,var(--ocre),transparent)]"
        />

        <div className="absolute top-6 right-6 w-40 lg:top-8 lg:right-8">
          <LanguageToggle initial={locale} shape="pill" />
        </div>

        <div className="fade-in-up relative w-full max-w-lg space-y-[clamp(1rem,3vh,2rem)]">
          {/* Encabezado propio del móvil, donde el panel de marca no se ve. */}
          <div className="flex justify-center lg:hidden">
            <Wordmark />
          </div>

          <LoginForm />
        </div>
      </section>
    </main>
  );
}
