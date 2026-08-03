'use client';

import { DropdownMenu as Menu } from 'radix-ui';
import { MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/cn';

export type RowMenuItem = {
  label: string;
  onSelect: () => void;
  icon?: React.ComponentType<{ className?: string }>;
  /** `danger` para lo que destruye datos: se pinta en ladrillo. */
  tone?: 'default' | 'danger';
  disabled?: boolean;
};

type Props = {
  items: RowMenuItem[];
  ariaLabel: string;
};

/**
 * Menú de acciones de una fila (los tres puntitos).
 *
 * Sustituye a los botones que solo aparecían al pasar el ratón: en una pantalla
 * táctil no hay hover, así que allí eran invisibles. Va sobre Radix y no sobre el
 * patrón a mano del menú del avatar porque la tabla vive dentro de un
 * `overflow-x-auto`, que recortaría un desplegable posicionado en absoluto; el
 * portal de Radix lo saca de ahí y además trae navegación con teclado.
 */
export function RowMenu({ items, ariaLabel }: Props) {
  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label={ariaLabel}
        className="text-sage hover:text-ink hover:bg-surface-2 data-[state=open]:bg-surface-2 data-[state=open]:text-ink inline-flex size-9 items-center justify-center rounded-md transition-colors outline-none"
      >
        <MoreHorizontal className="size-4" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content
          align="end"
          sideOffset={4}
          // Sin esto, al cerrarse el menú devuelve el foco a su disparador y se lo
          // arranca al diálogo que acaba de abrir la acción de editar.
          onCloseAutoFocus={(e) => e.preventDefault()}
          className="rounded-control border-line bg-surface z-50 min-w-40 border p-1 shadow-lg"
        >
          {items.map(({ label, onSelect, icon: Icon, tone, disabled }) => (
            <Menu.Item
              key={label}
              disabled={disabled}
              onSelect={onSelect}
              className={cn(
                'text-caption flex cursor-pointer items-center gap-2 rounded px-2 py-2.5 font-medium outline-none select-none',
                'data-[highlighted]:bg-surface-2 data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
                tone === 'danger' ? 'text-ladrillo' : 'text-ink',
              )}
            >
              {Icon && <Icon className="size-4 shrink-0" />}
              {label}
            </Menu.Item>
          ))}
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}
