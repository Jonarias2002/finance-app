export const THEMES = ['system', 'light', 'dark'] as const;
export type Theme = (typeof THEMES)[number];
export const DEFAULT_THEME: Theme = 'system';
export const THEME_COOKIE = 'theme';

/**
 * Script sin bloqueo que resuelve el tema antes del primer pintado, para que no
 * haya parpadeo claro→oscuro al recargar. Lee la cookie `theme`; si vale
 * `system` (o falta) sigue la preferencia del sistema operativo. Se inyecta
 * inline en el <body> del layout raíz. Mantener en una sola línea y sin
 * dependencias: corre antes que cualquier módulo de la app.
 */
export const themeScript = `(function(){try{var m=document.cookie.match(/(?:^|; )theme=([^;]*)/);var t=m?m[1]:'system';var d=t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;
