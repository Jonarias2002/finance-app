import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { AdminUsers, type UserRow } from '@/features/admin/admin-users';

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const admin = createAdminClient();
  const [{ data: list }, { data: roles }, { data: profiles }] = await Promise.all([
    admin.auth.admin.listUsers(),
    admin.from('user_roles').select('user_id, role'),
    admin.from('profiles').select('id, display_name'),
  ]);

  const rolesByUser = new Map<string, string[]>();
  for (const r of roles ?? []) {
    const arr = rolesByUser.get(r.user_id as string) ?? [];
    arr.push(r.role as string);
    rolesByUser.set(r.user_id as string, arr);
  }
  const nameById = new Map(
    (profiles ?? []).map((p) => [p.id as string, (p.display_name as string | null) ?? null]),
  );

  const users: UserRow[] = (list?.users ?? []).map((u) => ({
    id: u.id,
    email: u.email ?? '',
    displayName: nameById.get(u.id) ?? null,
    roles: rolesByUser.get(u.id) ?? [],
    createdAt: u.created_at,
    isSelf: u.id === user?.id,
  }));

  return <AdminUsers users={users} />;
}
