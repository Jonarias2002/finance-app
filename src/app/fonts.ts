import { Bricolage_Grotesque, Public_Sans, IBM_Plex_Mono } from 'next/font/google';

export const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['600'],
  variable: '--font-bricolage',
  display: 'swap',
});

export const publicSans = Public_Sans({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-public-sans',
  display: 'swap',
});

export const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['500'],
  variable: '--font-plex-mono',
  display: 'swap',
});

export const fontVariables = `${bricolage.variable} ${publicSans.variable} ${plexMono.variable}`;
