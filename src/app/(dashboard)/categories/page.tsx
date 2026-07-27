import { redirect } from 'next/navigation';

/** Unificado en /manage (tab Categorías). Se conserva la ruta como redirección. */
export default function CategoriesPage() {
  redirect('/manage?tab=categories');
}
