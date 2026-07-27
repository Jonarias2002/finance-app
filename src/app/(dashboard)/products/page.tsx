import { redirect } from 'next/navigation';

/** Unificado en /manage (tab Productos). Se conserva la ruta como redirección. */
export default function ProductsPage() {
  redirect('/manage?tab=products');
}
