import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: role } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .maybeSingle();
  if (!role) redirect('/');

  const t = await getTranslations('admin');

  return (
    <div className="bg-canvas min-h-dvh">
      <header className="border-line bg-surface flex h-14 items-center gap-4 border-b px-4">
        <Link
          href="/"
          className="text-sage hover:text-ink text-caption inline-flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="size-4" />
          {t('back')}
        </Link>
        <h1 className="text-title text-ink font-[family-name:var(--font-bricolage)]">
          {t('title')}
        </h1>
      </header>
      <main className="mx-auto max-w-[900px] px-4 py-8 md:px-8">{children}</main>
    </div>
  );
}
