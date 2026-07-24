import { cn } from '@/lib/cn';

/** Tabla de datos: sin líneas verticales, filas de 52px, montos a la derecha. */
export function Table({ className, ...props }: React.ComponentProps<'table'>) {
  return (
    <div className="overflow-x-auto">
      <table className={cn('text-body w-full border-collapse', className)} {...props} />
    </div>
  );
}

export function Th({ className, align, ...props }: React.ComponentProps<'th'>) {
  return (
    <th
      className={cn(
        'border-line text-label text-sage border-b pb-2 font-medium tracking-[0.06em] uppercase',
        align === 'right' ? 'text-right' : 'text-left',
        className,
      )}
      {...props}
    />
  );
}

export function Tr({ className, ...props }: React.ComponentProps<'tr'>) {
  return (
    <tr
      className={cn('group border-line hover:bg-surface-2 border-b transition-colors', className)}
      {...props}
    />
  );
}

export function Td({ className, align, ...props }: React.ComponentProps<'td'>) {
  return (
    <td
      className={cn(
        'h-[52px] align-middle',
        align === 'right' ? 'text-right' : 'text-left',
        className,
      )}
      {...props}
    />
  );
}
