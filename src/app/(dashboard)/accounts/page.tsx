import { redirect } from 'next/navigation';

/** Unificado en /manage (tab Cuentas). Se conserva la ruta como redirección. */
export default function AccountsPage() {
  redirect('/manage?tab=accounts');
}
