import { Manrope, Hanken_Grotesk, IBM_Plex_Mono } from 'next/font/google';

/** Titulares: geométrica y equilibrada (display, headline y title del sistema). */
export const manrope = Manrope({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-manrope',
  display: 'swap',
});

/** Texto corrido y etiquetas: legibilidad alta en zonas densas de datos. */
export const hanken = Hanken_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-hanken',
  display: 'swap',
});

/** Cifras monetarias: tabular, para que los decimales alineen en columna. */
export const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['500'],
  variable: '--font-plex-mono',
  display: 'swap',
});

export const fontVariables = `${manrope.variable} ${hanken.variable} ${plexMono.variable}`;
