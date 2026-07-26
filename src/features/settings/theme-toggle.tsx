'use client';

import { useEffect, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Monitor, Sun, Moon } from 'lucide-react';
import type { Theme } from '@/lib/theme';
import { setTheme } from './actions';
import { Segmented } from './segmented';

/** Aplica la clase `.dark` en <html> según el tema; refleja el script inline del layout. */
function applyTheme(theme: Theme) {
  const dark =
    theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
}

export function ThemeToggle({ initial }: { initial: Theme }) {
  const t = useTranslations('settings.theme');
  const [value, setValue] = useState<Theme>(initial);
  const [, startTransition] = useTransition();

  // Con "Sistema" activo, seguir los cambios de preferencia del SO en vivo.
  useEffect(() => {
    if (value !== 'system') return;
    const media = matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme('system');
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [value]);

  function select(next: Theme) {
    if (next === value) return;
    setValue(next);
    applyTheme(next);
    startTransition(() => setTheme(next));
  }

  const options = [
    { value: 'system' as const, label: t('system'), icon: Monitor },
    { value: 'light' as const, label: t('light'), icon: Sun },
    { value: 'dark' as const, label: t('dark'), icon: Moon },
  ];

  return <Segmented value={value} options={options} onChange={select} ariaLabel={t('label')} />;
}
