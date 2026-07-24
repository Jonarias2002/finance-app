import { cn } from '@/lib/cn';

/** Etiqueta pequeña en mayúsculas sobre una cifra. */
export function Label({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      className={cn('text-label text-sage font-medium tracking-[0.06em] uppercase', className)}
      {...props}
    />
  );
}

export function Caption({ className, ...props }: React.ComponentProps<'span'>) {
  return <span className={cn('text-caption text-sage', className)} {...props} />;
}
