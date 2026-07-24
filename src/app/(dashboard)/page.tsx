import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { Card, EmptyState, Label } from '@/components/ui';

export default async function DashboardPage() {
  const t = await getTranslations('dashboard');
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const name = user?.email?.split('@')[0] ?? '';

  return (
    <>
      <Label>{t('greeting', { name })}</Label>
      <Card>
        <EmptyState title={t('emptyTitle')} description={t('emptyDescription')} />
      </Card>
    </>
  );
}
