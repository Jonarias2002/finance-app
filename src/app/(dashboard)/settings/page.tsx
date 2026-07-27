import { redirect } from 'next/navigation';

/** Los ajustes viven ahora en el menú del avatar (cabecera).
 *  Se conserva la ruta como redirección para enlaces antiguos. */
export default function SettingsPage() {
  redirect('/');
}
