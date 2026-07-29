import { cn } from '@/lib/cn';

/** `overline`: etiqueta en versalitas espaciadas, como el componente Label. */
type LabelVariant = 'inline' | 'overline';

const LABEL: Record<LabelVariant, string> = {
  inline: 'text-caption text-ink font-medium',
  // Tracking por encima del que ya trae `text-label`: en versalitas, el aire
  // extra es lo que las separa del texto normal a este tamaño.
  overline: 'text-label text-sage font-medium tracking-[0.1em] uppercase',
};

type FieldProps = {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  htmlFor?: string;
  labelVariant?: LabelVariant;
  children: React.ReactNode;
};

export function Field({
  label,
  hint,
  error,
  required,
  htmlFor,
  labelVariant = 'inline',
  children,
}: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className={cn('block', LABEL[labelVariant])}>
        {label}
        {required && <span className="text-sage"> *</span>}
      </label>
      {children}
      {error ? (
        <p className="text-caption text-ladrillo">{error}</p>
      ) : hint ? (
        <p className="text-caption text-sage">{hint}</p>
      ) : null}
    </div>
  );
}

export function Input({ className, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      className={cn(
        'rounded-control border-line bg-surface text-body text-ink placeholder:text-sage h-11 w-full border px-3',
        className,
      )}
      {...props}
    />
  );
}

export function Select({ className, ...props }: React.ComponentProps<'select'>) {
  return (
    <select
      className={cn(
        'rounded-control border-line bg-surface text-body text-ink h-11 w-full border px-3',
        className,
      )}
      {...props}
    />
  );
}
