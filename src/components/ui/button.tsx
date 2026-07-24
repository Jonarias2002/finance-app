import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive';
type Size = 'sm' | 'md';

const VARIANT: Record<Variant, string> = {
  primary: 'bg-ink text-canvas hover:opacity-90',
  secondary: 'border border-line text-ink hover:bg-surface-2',
  ghost: 'text-sage hover:bg-surface-2 hover:text-ink',
  destructive: 'border border-ladrillo text-ladrillo hover:bg-ladrillo/5',
};

const SIZE: Record<Size, string> = {
  sm: 'h-9 px-3 text-caption',
  md: 'h-11 px-4 text-body',
};

type ButtonProps = React.ComponentProps<'button'> & {
  variant?: Variant;
  size?: Size;
};

export function Button({ variant = 'primary', size = 'md', className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'rounded-control inline-flex items-center justify-center gap-2 font-medium transition-colors disabled:pointer-events-none disabled:opacity-50',
        VARIANT[variant],
        SIZE[size],
        className,
      )}
      {...props}
    />
  );
}
