'use client';

import { useActionState, useEffect, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { KeyRound, Shield, ShieldOff, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Card,
  Field,
  Input,
  Button,
  Alert,
  StatusBadge,
  Table,
  Th,
  Tr,
  Td,
  Pagination,
  usePagination,
} from '@/components/ui';
import { formatDayMonth } from '@/lib/format';
import { resetPassword, setUserAdmin, deleteUser } from './actions';

export type UserRow = {
  id: string;
  email: string;
  displayName: string | null;
  roles: string[];
  createdAt: string;
  isSelf: boolean;
};

export function AdminUsers({ users }: { users: UserRow[] }) {
  const t = useTranslations('admin');
  const [resetting, setResetting] = useState<UserRow | null>(null);
  const [isPending, startTransition] = useTransition();
  const paged = usePagination(users, 10);

  function toggleAdmin(u: UserRow) {
    startTransition(() => setUserAdmin(u.id, !u.roles.includes('admin')));
  }
  function remove(u: UserRow) {
    if (!confirm(t('deleteConfirm', { email: u.email }))) return;
    startTransition(() => deleteUser(u.id));
  }

  return (
    <>
      <Card className="pt-4">
        <Table>
          <thead>
            <tr>
              <Th>{t('user')}</Th>
              <Th>{t('created')}</Th>
              <Th align="right">
                <span className="sr-only">{t('actions')}</span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {paged.pageItems.map((u) => {
              const isAdmin = u.roles.includes('admin');
              return (
                <Tr key={u.id}>
                  <Td>
                    <div className="flex flex-col">
                      <span className="text-ink flex items-center gap-2 font-medium">
                        {u.email}
                        {isAdmin && <StatusBadge status="done" label={t('roleAdmin')} />}
                      </span>
                      {u.displayName && (
                        <span className="text-caption text-sage">{u.displayName}</span>
                      )}
                    </div>
                  </Td>
                  <Td>
                    <span className="tabular text-caption text-sage">
                      {formatDayMonth(u.createdAt)}
                    </span>
                  </Td>
                  <Td align="right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setResetting(u)}
                        aria-label={t('resetPassword')}
                        title={t('resetPassword')}
                      >
                        <KeyRound className="size-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleAdmin(u)}
                        disabled={isPending || (u.isSelf && isAdmin)}
                        aria-label={isAdmin ? t('revokeAdmin') : t('makeAdmin')}
                        title={isAdmin ? t('revokeAdmin') : t('makeAdmin')}
                      >
                        {isAdmin ? <ShieldOff className="size-4" /> : <Shield className="size-4" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => remove(u)}
                        disabled={isPending || u.isSelf}
                        aria-label={t('deleteUser')}
                        title={t('deleteUser')}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </Td>
                </Tr>
              );
            })}
          </tbody>
        </Table>
        <Pagination page={paged.page} pageCount={paged.pageCount} onPageChange={paged.setPage} />
      </Card>

      <ResetDialog user={resetting} onOpenChange={(open) => !open && setResetting(null)} />
    </>
  );
}

function ResetDialog({
  user,
  onOpenChange,
}: {
  user: UserRow | null;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations('admin');
  return (
    <Dialog open={user !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('resetPassword')}</DialogTitle>
        </DialogHeader>
        {user && <ResetForm key={user.id} user={user} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function ResetForm({ user, onDone }: { user: UserRow; onDone: () => void }) {
  const t = useTranslations('admin');
  const [state, action, pending] = useActionState(resetPassword, undefined);

  useEffect(() => {
    if (state?.ok) {
      const id = setTimeout(onDone, 900);
      return () => clearTimeout(id);
    }
  }, [state, onDone]);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="userId" value={user.id} />
      <p className="text-caption text-sage">{t('resetHint', { email: user.email })}</p>
      <Field
        label={t('newPassword')}
        htmlFor="password"
        required
        error={state?.error === 'passwordTooShort' ? t('errors.passwordTooShort') : undefined}
      >
        <Input
          id="password"
          name="password"
          type="text"
          autoComplete="off"
          minLength={8}
          required
          autoFocus
        />
      </Field>
      {state?.error === 'generic' && (
        <Alert level="critical" dismissible={false}>
          {t('errors.generic')}
        </Alert>
      )}
      {state?.ok && (
        <Alert level="warning" dismissible={false}>
          {t('resetDone')}
        </Alert>
      )}
      <DialogFooter>
        <Button type="button" variant="secondary" onClick={onDone} disabled={pending}>
          {t('close')}
        </Button>
        <Button type="submit" disabled={pending}>
          {t('save')}
        </Button>
      </DialogFooter>
    </form>
  );
}
