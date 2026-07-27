import { createClient } from '@/lib/supabase/server';
import { CategoriesManager } from '@/features/categories/categories-manager';
import type { CategoryRow } from '@/features/categories/schemas';

export default async function CategoriesPage() {
  const supabase = await createClient();

  const { data: cats } = await supabase
    .from('categories')
    .select('id, name, kind, parent_id, is_system')
    .order('name');

  const categories: CategoryRow[] = (cats ?? []).map((c) => ({
    id: c.id as string,
    name: c.name as string,
    kind: c.kind as CategoryRow['kind'],
    parentId: (c.parent_id as string | null) ?? null,
    isSystem: c.is_system as boolean,
  }));

  return <CategoriesManager categories={categories} />;
}
