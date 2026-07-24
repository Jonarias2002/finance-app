import { cn } from '@/lib/cn';

export function Card({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div className={cn('rounded-card border-line bg-surface border p-5', className)} {...props} />
  );
}

export function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div className={cn('mb-4 flex items-center justify-between gap-4', className)} {...props} />
  );
}

export function CardTitle({ className, ...props }: React.ComponentProps<'h3'>) {
  return <h3 className={cn('text-card text-ink font-medium', className)} {...props} />;
}
