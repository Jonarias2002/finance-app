import { cn } from '@/lib/cn';

/** Etiqueta pequeña en mayúsculas sobre una cifra. */
export function Label({ className, ...props }: React.ComponentProps<'span'>) {
  // El tracking lo trae `text-label` desde el sistema; no lo repitas aquí.
  return (
    <span className={cn('text-label text-sage font-medium uppercase', className)} {...props} />
  );
}

export function Caption({ className, ...props }: React.ComponentProps<'span'>) {
  return <span className={cn('text-caption text-sage', className)} {...props} />;
}
