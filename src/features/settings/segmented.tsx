'use client';

import { cn } from '@/lib/cn';

type Option<T extends string> = {
  value: T;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
};

type SegmentedProps<T extends string> = {
  value: T;
  options: readonly Option<T>[];
  onChange: (value: T) => void;
  ariaLabel: string;
  disabled?: boolean;
};

/** Control segmentado accesible (radiogroup) para elegir entre pocas opciones. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  disabled,
}: SegmentedProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="rounded-control border-line bg-surface-2 inline-flex gap-1 border p-1"
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
            className={cn(
              'text-caption flex items-center gap-2 rounded-[6px] px-3 py-1.5 font-medium transition-colors disabled:pointer-events-none disabled:opacity-60',
              active ? 'bg-surface text-ink shadow-sm' : 'text-sage hover:text-ink',
            )}
          >
            {Icon && <Icon className="size-4" />}
            {label}
          </button>
        );
      })}
    </div>
  );
}
