import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const nextConfig: NextConfig = {
  // Fija la raíz del proyecto para Turbopack. Con el node_modules simbólico de
  // pnpm evita que infiera mal el "workspace root" (causa de un panic al
  // arrancar). El proyecto usa pnpm — ver AGENTS.md.
  turbopack: { root: import.meta.dirname },
};

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

export default withNextIntl(nextConfig);
