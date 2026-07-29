import { Landmark } from 'lucide-react';
import { cn } from '@/lib/cn';

type Size = 'sm' | 'md';

/** El emblema crece con el texto: mismo lockup, dos densidades. */
const SIZES: Record<Size, { badge: string; icon: string; text: string }> = {
  sm: { badge: 'size-10', icon: 'size-5', text: 'text-section' },
  md: { badge: 'size-12 2xl:size-14', icon: 'size-6 2xl:size-7', text: 'text-title 2xl:text-hero' },
};

type WordmarkProps = {
  size?: Size;
  className?: string;
};

/**
 * Logotipo de FinWise: emblema en oro + wordmark bicolor.
 *
 * "Fin" toma el color del texto del ámbito y "Wise" va siempre en oro — así el
 * mismo componente sirve sobre el panel oscuro y sobre superficie clara sin
 * tocar nada. El acento va en degradado recortado al texto, que es lo que le da
 * el brillo metálico.
 */
export function Wordmark({ size = 'sm', className }: WordmarkProps) {
  const s = SIZES[size];

  return (
    <span className={cn('inline-flex items-center gap-3', className)}>
      {/* Emblema: cuadro redondeado con lavado de oro y aro fino. El brillo
          superior izquierdo simula una luz cenital, igual que las tarjetas. */}
      <span
        aria-hidden
        className={cn(
          'rounded-card ring-ocre/25 relative grid shrink-0 place-items-center ring-1',
          'from-ocre/25 to-ocre/5 bg-gradient-to-br',
          s.badge,
        )}
      >
        <Landmark className={cn('text-ocre', s.icon)} />
      </span>

      {/* `leading-none` para que el lockup centre por el trazo y no por la caja
          de línea, que en display-lg deja un desfase visible contra el emblema. */}
      <span className={cn('font-display leading-none font-bold tracking-[-0.02em]', s.text)}>
        Fin
        <span className="from-ocre to-ocre/70 bg-gradient-to-br bg-clip-text text-transparent">
          Wise
        </span>
      </span>
    </span>
  );
}
