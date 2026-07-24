import { cn } from '@/lib/cn';

type FieldProps = {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  htmlFor?: string;
  children: React.ReactNode;
};

export function Field({ label, hint, error, required, htmlFor, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="text-caption text-ink block font-medium">
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
