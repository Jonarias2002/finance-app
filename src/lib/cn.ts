import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * tailwind-merge no conoce nuestros tokens custom: por defecto mete `text-body`
 * (tamaño) y `text-canvas` (color) en el MISMO grupo y elimina uno. Eso borraba
 * el color de texto de los botones (fondo y texto quedaban iguales → invisible).
 * Registramos los tamaños de fuente y los colores propios para que no colisionen.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        {
          text: [
            'hero',
            'title',
            'section',
            'card',
            'body',
            'label',
            'caption',
            'fig-lg',
            'fig-md',
            'fig-sm',
          ],
        },
      ],
      'text-color': [
        {
          text: [
            'canvas',
            'surface',
            'surface-2',
            'ink',
            'sage',
            'line',
            'line-strong',
            'verde',
            'ladrillo',
            'ocre',
            'brand',
            'brand-accent',
          ],
        },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
