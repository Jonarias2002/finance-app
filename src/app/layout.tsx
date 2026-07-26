import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale } from 'next-intl/server';
import { fontVariables } from './fonts';
import { themeScript } from '@/lib/theme';
import './globals.css';

export const metadata: Metadata = {
  title: 'FinWise',
  description: 'Finanzas personales claras: cuánto puedes gastar hoy.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();

  return (
    <html lang={locale} className={fontVariables} suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
