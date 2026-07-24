'use client';

import { useActionState, useState } from 'react';
import { useTranslations } from 'next-intl';
import { authenticate } from '@/features/auth/actions';
import { Card, Field, Input, Button, Alert } from '@/components/ui';

type Mode = 'login' | 'signup';

export default function LoginPage() {
  const t = useTranslations('auth');
  const [mode, setMode] = useState<Mode>('login');
  const [state, action, pending] = useActionState(authenticate, undefined);

  const isSignup = mode === 'signup';

  return (
    <main className="bg-canvas flex min-h-dvh items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <p className="text-title text-ink font-[family-name:var(--font-bricolage)]">FinWise</p>
          <p className="text-caption text-sage">{t('subtitle')}</p>
        </div>

        <Card>
          <h1 className="text-section text-ink mb-4 font-medium">
            {isSignup ? t('signupTitle') : t('loginTitle')}
          </h1>

          <form action={action} className="space-y-4">
            <input type="hidden" name="mode" value={mode} />

            <Field
              label={t('email')}
              htmlFor="email"
              required
              error={state?.fieldErrors?.email ? t(`errors.${state.fieldErrors.email}`) : undefined}
            >
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                required
              />
            </Field>

            <Field
              label={t('password')}
              htmlFor="password"
              required
              hint={isSignup ? t('passwordHint') : undefined}
              error={
                state?.fieldErrors?.password ? t(`errors.${state.fieldErrors.password}`) : undefined
              }
            >
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete={isSignup ? 'new-password' : 'current-password'}
                required
              />
            </Field>

            {state?.error && (
              <Alert level="critical" dismissible={false}>
                {t(`errors.${state.error}`)}
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={pending}>
              {isSignup ? t('submitSignup') : t('submitLogin')}
            </Button>
          </form>
        </Card>

        <div className="text-center">
          <button
            type="button"
            onClick={() => setMode(isSignup ? 'login' : 'signup')}
            className="text-caption text-sage hover:text-ink underline transition-colors"
          >
            {isSignup ? t('toLogin') : t('toSignup')}
          </button>
        </div>
      </div>
    </main>
  );
}
