import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'accent';
type Size = 'sm' | 'md' | 'touch';

const VARIANT: Record<Variant, string> = {
  primary: 'bg-ink text-canvas hover:opacity-90',
  secondary: 'border border-line text-ink hover:bg-surface-2',
  ghost: 'text-sage hover:bg-surface-2 hover:text-ink',
  destructive: 'border border-ladrillo text-ladrillo hover:bg-ladrillo/5',
  // Solo para el acceso (login), fuera del shell: allí el ocre es el color de
  // acción. Dentro de la app el ocre significa aviso — no usar esta variante.
  accent: 'bg-ocre text-on-ocre shadow-sm hover:opacity-90',
};

const SIZE: Record<Size, string> = {
  sm: 'h-9 px-3 text-caption',
  md: 'h-11 px-4 text-body',
  // Igual que `sm`, pero con el alto de `md` mientras la pantalla es de móvil:
  // 36px se queda corto como área táctil cuando el botón es la acción principal
  // de la vista. Un solo sitio donde vive la regla, en vez de un `h-11 sm:h-9`
  // repetido por cada botón.
  touch: 'h-11 px-3 text-caption sm:h-9',
};

const BASE =
  'rounded-control inline-flex items-center justify-center gap-2 font-medium transition-colors disabled:pointer-events-none disabled:opacity-50';

/**
 * Las clases del botón, sin el elemento. Es lo que usan los enlaces que deben
 * verse como un botón (`<Link>` de Next no acepta ser envuelto por `Button`
 * sin perder el prefetch), para no copiar a mano las tablas de arriba.
 */
export function buttonClass({
  variant = 'primary',
  size = 'md',
  className,
}: { variant?: Variant; size?: Size; className?: string } = {}) {
  return cn(BASE, VARIANT[variant], SIZE[size], className);
}

type ButtonProps = React.ComponentProps<'button'> & {
  variant?: Variant;
  size?: Size;
};

export function Button({ variant, size, className, ...props }: ButtonProps) {
  return <button className={buttonClass({ variant, size, className })} {...props} />;
}
