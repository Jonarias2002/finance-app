'use client';

import { useActionState, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AtSign, Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';
import { Card, Field, Input, Button, Alert, Segmented } from '@/components/ui';
import { authenticate } from './actions';

type Mode = 'login' | 'signup';

/** Campos altos y en superficie hundida, con borde que enciende en oro al foco. */
const FIELD = 'bg-surface-2 h-14 px-4 pr-12 transition-colors focus-visible:border-ocre';

export function LoginForm() {
  const t = useTranslations('auth');
  const [mode, setMode] = useState<Mode>('login');
  const [reveal, setReveal] = useState(false);
  const [state, formAction, pending] = useActionState(authenticate, undefined);
  // Los errores pertenecen al modo con el que se envió: al cambiar de pestaña
  // dejan de aplicar, y `useActionState` no permite resetear su estado.
  const [stale, setStale] = useState(false);

  const isSignup = mode === 'signup';
  const result = stale ? undefined : state;

  function switchMode(next: Mode) {
    setMode(next);
    setStale(true);
  }

  return (
    // Nivel 2 de elevación: contenedor traslúcido con sombra ambiental suave.
    // El desenfoque solo se nota sobre el degradado del fondo, no sobre plano.
    //
    // Relleno y ritmo van en `clamp` contra `vh`: la tarjeta se comprime sola en
    // portátiles bajos para que el acceso quepa sin scroll. La altura de los
    // campos no se toca — son el área táctil y encogerla sí se nota al usar.
    <Card className="border-line/60 bg-surface/70 rounded-xl p-[clamp(1.25rem,3.5vh,2rem)] shadow-2xl backdrop-blur-xl">
      <Segmented
        value={mode}
        options={[
          { value: 'login', label: t('submitLogin') },
          { value: 'signup', label: t('submitSignup') },
        ]}
        onChange={switchMode}
        ariaLabel={t('modeLabel')}
        disabled={pending}
        size="md"
      />

      <div className="my-[clamp(1rem,3vh,1.75rem)] space-y-2">
        <h1 className="text-title text-ink font-display font-semibold">
          {isSignup ? t('signupTitle') : t('loginTitle')}
        </h1>
        <p className="text-body text-sage">{isSignup ? t('signupLead') : t('loginLead')}</p>
      </div>

      <form
        action={(formData: FormData) => {
          setStale(false);
          formAction(formData);
        }}
        className="space-y-[clamp(1rem,2.5vh,1.5rem)]"
      >
        <input type="hidden" name="mode" value={mode} />

        <Field
          label={t('email')}
          htmlFor="email"
          required
          labelVariant="overline"
          error={result?.fieldErrors?.email ? t(`errors.${result.fieldErrors.email}`) : undefined}
        >
          <div className="relative">
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder={t('emailPlaceholder')}
              required
              className={FIELD}
            />
            <AtSign
              aria-hidden
              className="text-sage/50 pointer-events-none absolute inset-y-0 right-4 my-auto size-5"
            />
          </div>
        </Field>

        <Field
          label={t('password')}
          htmlFor="password"
          required
          labelVariant="overline"
          hint={isSignup ? t('passwordHint') : undefined}
          error={
            result?.fieldErrors?.password ? t(`errors.${result.fieldErrors.password}`) : undefined
          }
        >
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={reveal ? 'text' : 'password'}
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              required
              className={FIELD}
            />
            <button
              type="button"
              onClick={() => setReveal((r) => !r)}
              aria-label={reveal ? t('hidePassword') : t('showPassword')}
              aria-pressed={reveal}
              className="rounded-control text-sage hover:text-ocre absolute inset-y-0 right-0 flex w-12 items-center justify-center transition-colors"
            >
              {reveal ? (
                <EyeOff aria-hidden className="size-5" />
              ) : (
                <Eye aria-hidden className="size-5" />
              )}
            </button>
          </div>
        </Field>

        {result?.error && (
          <Alert level="critical" dismissible={false}>
            {t(`errors.${result.error}`)}
          </Alert>
        )}

        <Button
          type="submit"
          variant="accent"
          disabled={pending}
          className="mt-2 h-14 w-full font-semibold transition-all active:scale-[0.99]"
        >
          {pending ? (
            <>
              <Loader2 aria-hidden className="size-5 animate-spin" />
              {isSignup ? t('pendingSignup') : t('pendingLogin')}
            </>
          ) : (
            <>
              {isSignup ? t('submitSignup') : t('submitLogin')}
              <ArrowRight aria-hidden className="size-5" />
            </>
          )}
        </Button>
      </form>
    </Card>
  );
}
