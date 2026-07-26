'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { setLocale } from '@/i18n/locale';
import type { Locale } from '@/i18n/request';
import { Segmented } from './segmented';

export function LanguageToggle({ initial }: { initial: Locale }) {
  const t = useTranslations('settings.language');
  const router = useRouter();
  const [value, setValue] = useState<Locale>(initial);
  const [isPending, startTransition] = useTransition();

  function select(next: Locale) {
    if (next === value) return;
    setValue(next);
    // Los mensajes se resuelven en el servidor: refrescar para re-renderizar
    // con el nuevo idioma una vez guardada la cookie.
    startTransition(async () => {
      await setLocale(next);
      router.refresh();
    });
  }

  const options = [
    { value: 'es' as const, label: 'Español' },
    { value: 'en' as const, label: 'English' },
  ];

  return (
    <Segmented
      value={value}
      options={options}
      onChange={select}
      ariaLabel={t('label')}
      disabled={isPending}
    />
  );
}
