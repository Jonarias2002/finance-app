'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle, XCircle, X } from 'lucide-react';
import { cn } from '@/lib/cn';

type Level = 'warning' | 'critical';

const LEVEL: Record<Level, { border: string; bg: string; icon: string }> = {
  warning: { border: 'border-ocre', bg: 'bg-ocre/[0.06]', icon: 'text-ocre' },
  critical: { border: 'border-ladrillo', bg: 'bg-ladrillo/[0.06]', icon: 'text-ladrillo' },
};

type AlertProps = {
  level?: Level;
  children: React.ReactNode;
  /** Si es true muestra la × para cerrarlo. */
  dismissible?: boolean;
  onDismiss?: () => void;
};

export function Alert({ level = 'warning', children, dismissible = true, onDismiss }: AlertProps) {
  const t = useTranslations('alert');
  const [open, setOpen] = useState(true);
  if (!open) return null;

  const s = LEVEL[level];
  const Icon = level === 'critical' ? XCircle : AlertTriangle;

  return (
    <div
      role="status"
      className={cn('rounded-control flex items-start gap-3 border p-3 pl-4', s.border, s.bg)}
    >
      <Icon aria-hidden className={cn('mt-0.5 size-[18px] shrink-0', s.icon)} />
      {/* El texto siempre en ink: nunca en el color del acento */}
      <p className="text-body text-ink flex-1">{children}</p>
      {dismissible && (
        <button
          type="button"
          aria-label={t('dismiss')}
          onClick={() => {
            setOpen(false);
            onDismiss?.();
          }}
          className="text-sage hover:text-ink rounded p-0.5 transition-colors"
        >
          <X className="size-[18px]" />
        </button>
      )}
    </div>
  );
}
