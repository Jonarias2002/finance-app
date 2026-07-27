/** Tabs de la sección Gestión. Módulo plano (sin 'use client') para que el
 *  componente de servidor pueda usar el array real, no una referencia de cliente. */
export const MANAGE_TABS = ['accounts', 'categories', 'products', 'stores'] as const;
export type ManageTab = (typeof MANAGE_TABS)[number];
