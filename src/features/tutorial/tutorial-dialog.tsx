'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Info,
  ArrowLeft,
  ChevronRight,
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  Tags,
  Package,
  Store,
  ShoppingCart,
  HandCoins,
  Target,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Caption, Label } from '@/components/ui';

/** Orden del índice: primero lo que hay que crear antes de poder usar el resto. */
const MODULES = [
  { key: 'home', icon: LayoutDashboard },
  { key: 'accounts', icon: Wallet },
  { key: 'transactions', icon: ArrowLeftRight },
  { key: 'categories', icon: Tags },
  { key: 'products', icon: Package },
  { key: 'stores', icon: Store },
  { key: 'shopping', icon: ShoppingCart },
  { key: 'debts', icon: HandCoins },
  { key: 'goals', icon: Target },
] as const;

type ModuleKey = (typeof MODULES)[number]['key'];

/** Bloque de la ficha: rótulo pequeño + párrafo. */
function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label>{title}</Label>
      <p className="text-body text-ink">{children}</p>
    </div>
  );
}

/**
 * Guía de la app: un índice de módulos y, por cada uno, qué es, qué le pides al
 * formulario y dónde reaparece después lo que creas. Vive en el inicio porque es
 * la primera pantalla y no depende de ningún dato.
 */
export function TutorialDialog() {
  const t = useTranslations('tutorial');
  // El nombre de cada módulo sale de `nav`, que es donde ya vive: así renombrar
  // una sección no deja la guía llamándola de otra forma.
  const tNav = useTranslations('nav');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<ModuleKey | null>(null);

  function change(next: boolean) {
    setOpen(next);
    // Al cerrar vuelve al índice: reabrirlo en la ficha donde lo dejaste
    // desorienta más de lo que ahorra.
    if (!next) setActive(null);
  }

  const current = MODULES.find((m) => m.key === active);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('open')}
        title={t('open')}
        className="text-sage hover:text-ink rounded-control transition-colors"
      >
        <Info aria-hidden className="size-[18px]" />
      </button>

      <Dialog open={open} onOpenChange={change}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{current ? tNav(current.key) : t('title')}</DialogTitle>
            <DialogDescription>{current ? t('lead') : t('indexLead')}</DialogDescription>
          </DialogHeader>

          {/* El alto se limita aquí y no en el diálogo: así el encabezado queda
              fijo y solo desliza el contenido. */}
          <div className="-mr-2 max-h-[60dvh] overflow-y-auto pr-2">
            {current ? (
              <div className="space-y-4">
                <Block title={t('sections.what')}>{t(`modules.${current.key}.what`)}</Block>
                <Block title={t('sections.form')}>{t(`modules.${current.key}.form`)}</Block>
                <Block title={t('sections.where')}>{t(`modules.${current.key}.where`)}</Block>
                <button
                  type="button"
                  onClick={() => setActive(null)}
                  className="text-sage hover:text-ink text-caption inline-flex items-center gap-1.5 transition-colors"
                >
                  <ArrowLeft aria-hidden className="size-4" />
                  {t('back')}
                </button>
              </div>
            ) : (
              <ul className="divide-line divide-y">
                {MODULES.map(({ key, icon: Icon }) => (
                  <li key={key}>
                    <button
                      type="button"
                      onClick={() => setActive(key)}
                      className="hover:bg-surface-2 rounded-control flex w-full items-center gap-3 px-2 py-3 text-left transition-colors"
                    >
                      <span className="rounded-control bg-surface-2 text-sage grid size-9 shrink-0 place-items-center">
                        <Icon aria-hidden className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="text-body text-ink block font-medium">{tNav(key)}</span>
                        <Caption className="block">{t(`modules.${key}.hook`)}</Caption>
                      </span>
                      <ChevronRight aria-hidden className="text-sage size-4 shrink-0" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
