'use client';

import { cn } from '@/lib/cn';

type Option<T extends string> = {
  value: T;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
};

/** `pill` es el "selection indicator" del sistema; `control` el rectangular. */
export type SegmentedShape = 'control' | 'pill';
type Shape = SegmentedShape;
type Size = 'sm' | 'md';

const SHAPE: Record<Shape, string> = {
  control: 'rounded-control',
  pill: 'rounded-full',
};

const SIZE: Record<Size, string> = {
  sm: 'text-caption py-1.5',
  md: 'text-body py-2.5',
};

type SegmentedProps<T extends string> = {
  value: T;
  options: readonly Option<T>[];
  onChange: (value: T) => void;
  ariaLabel: string;
  disabled?: boolean;
  shape?: Shape;
  size?: Size;
  className?: string;
};

/** Control segmentado accesible (radiogroup) para elegir entre pocas opciones. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  disabled,
  shape = 'control',
  size = 'sm',
  className,
}: SegmentedProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        'border-line bg-surface-2 flex w-full gap-1 border p-1',
        SHAPE[shape],
        className,
      )}
    >
      {options.map(({ value: optionValue, label, icon: Icon }) => {
        const active = optionValue === value;
        return (
          <button
            key={optionValue}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(optionValue)}
            // `flex-1` + `min-w-0`: segmentos de igual ancho que nunca desbordan
            // su contenedor, por estrecho que sea (p. ej. el menú del avatar).
            className={cn(
              'flex min-w-0 flex-1 items-center justify-center gap-1.5 px-2 font-medium transition-colors disabled:pointer-events-none disabled:opacity-60',
              SHAPE[shape],
              SIZE[size],
              active ? 'bg-surface text-ink shadow-sm' : 'text-sage hover:text-ink',
            )}
          >
            {Icon && <Icon className="size-4 shrink-0" />}
            <span className="truncate">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
