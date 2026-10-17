/** Tungi rejim — ds2.css dagi [data-theme=dark] tokenlari. «auto» — tizim sozlamasi. */
export type Theme = 'auto' | 'light' | 'dark';
const KEY = 'mr-theme';
let pref: Theme = (() => { try { const v = localStorage.getItem(KEY); return v === 'light' || v === 'dark' ? v : 'auto'; } catch { return 'auto'; } })();
const mq = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null;
const subs = new Set<() => void>();

export const themePref = (): Theme => pref;
export const isDark = (): boolean => pref === 'dark' || (pref === 'auto' && !!mq?.matches);
function apply(): void { document.documentElement.dataset.theme = isDark() ? 'dark' : 'light'; subs.forEach(f => f()); }
export function setTheme(t: Theme): void { pref = t; try { localStorage.setItem(KEY, t); } catch { /* */ } apply(); }
/** Tugma: yorugʻ ↔ tungi (auto dan — joriy holatning teskarisi) */
export function toggleTheme(): void { setTheme(isDark() ? 'light' : 'dark'); }
export function onTheme(f: () => void): () => void { subs.add(f); return () => subs.delete(f); }
mq?.addEventListener('change', () => { if (pref === 'auto') apply(); });
apply();
