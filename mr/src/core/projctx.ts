/**
 * Loyiha konteksti (3-PR, 14.11.2026): xizmat Master reja loyihasi ichidan ochilganda manzilda `?p=<loyiha id>` boʻladi.
 * - Kontekst URL da — yangi varaqda, sahifa yangilanganda va «Orqaga» bosilganda ham yoʻqolmaydi (avval faqat sessionStorage edi).
 * - Xizmat holati (tahlil hududi, qatlamlar, koʻcha, render asosi) shu loyihaga ajratiladi: `kalit@<id>` —
 *   bir loyihaning tahlili boshqasiga aralashmaydi. Bosh sahifadan alohida ochilganda (p yoʻq) — avvalgidek umumiy kalitlar.
 */
const ID_RE = /^[A-Za-z0-9_-]{4,64}$/;

/** Joriy sahifa qaysi loyiha ichida ochilgan (yoʻq — alohida xizmat) */
export function ctxProject(search: string = typeof location !== 'undefined' ? location.search : ''): string | null {
  const p = new URLSearchParams(search).get('p');
  return p && ID_RE.test(p) ? p : null;
}

/** Loyihaga ajratilgan saqlash kaliti */
export function scoped(key: string, p: string | null = ctxProject()): string { return p ? `${key}@${p}` : key; }

/** Xizmat manzili: loyiha ichida boʻlsa — ?p= saqlanadi (hash ham) */
export function svcHref(href: string, p: string | null = ctxProject()): string {
  if (!p) return href;
  const [path, hash = ''] = href.split('#');
  const [base, q = ''] = path.split('?');
  const s = new URLSearchParams(q); s.set('p', p);
  return `${base}?${s.toString()}${hash ? `#${hash}` : ''}`;
}

/** Master reja loyihasiga qaytish manzili (app/ ichidagi sahifalardan) */
export const projectHref = (id: string): string => `./#/p/${encodeURIComponent(id)}`;

/**
 * Loyiha ichida birinchi ochilganda: Joyshunos tahlil hududini loyiha uchastkasidan oladi
 * (faqat shu loyihaning kaliti hali boʻsh boʻlsa — foydalanuvchi oʻzgartirgani ustiga yozilmaydi).
 * ring — [uzunlik, kenglik] (Master reja hujjati tartibi).
 */
export function seedSite(p: string, ring: [number, number][] | null | undefined, store: Pick<Storage, 'getItem' | 'setItem'> = localStorage): boolean {
  if (!ring || ring.length < 3) return false;
  const k = scoped('kps_site', p);
  try {
    if (store.getItem(k)) return false;
    store.setItem(k, JSON.stringify({ t: Date.now(), mode: 'poly', ring: ring.map(q => [+q[1].toFixed(6), +q[0].toFixed(6)]), center: null, from: 'mr' }));
    return true;
  } catch { return false; }
}
