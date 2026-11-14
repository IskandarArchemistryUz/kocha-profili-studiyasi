/**
 * Xizmatlarning oʻz loyihalari (14.11.2026, egasi): Koʻchasoz, Joyshunos, Render alohida kirilganda — Master rejaga emas,
 * oʻz loyihalar roʻyxatiga. Roʻyxat brauzerda (`svcp:<xizmat>`), har loyiha holati `kalit@<id>` (core/projctx.scoped).
 * id «s_…» — Master reja loyihasi («p_…») bilan aralashmaydi. «Asosiy loyiha» (id '') — manzilda ?p= yoʻq holat (avvalgi ish).
 */
export type SvcKind = 'ks' | 'joy' | 'ren';
export interface SvcProject { id: string; name: string; created: string; updated: string }
type KV = Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'key' | 'length'>;
const ls = (): KV | null => { try { return localStorage; } catch { return null; } };
const K = (s: SvcKind) => `svcp:${s}`;
export const isSvcId = (id: string | null | undefined): boolean => !!id && id.startsWith('s_');

export function listSvc(s: SvcKind, store = ls()): SvcProject[] {
  try { const a = JSON.parse(store?.getItem(K(s)) || '[]'); return Array.isArray(a) ? a.filter(x => x && typeof x.id === 'string') : []; } catch { return []; }
}
function save(s: SvcKind, a: SvcProject[], store = ls()): void { try { store?.setItem(K(s), JSON.stringify(a)); } catch { /* */ } }
export function createSvc(s: SvcKind, name: string, store = ls(), now = new Date()): SvcProject {
  const t = now.toISOString(), p = { id: `s_${Math.random().toString(36).slice(2, 12)}`, name: name.slice(0, 120), created: t, updated: t };
  save(s, [p, ...listSvc(s, store)], store); return p;
}
export function touchSvc(s: SvcKind, id: string, store = ls(), now = new Date()): void {
  const a = listSvc(s, store), p = a.find(x => x.id === id); if (!p) return;
  p.updated = now.toISOString(); save(s, a, store);
}
export function renameSvc(s: SvcKind, id: string, name: string, store = ls()): void {
  const a = listSvc(s, store), p = a.find(x => x.id === id); if (!p) return; p.name = name.slice(0, 120) || p.name; save(s, a, store);
}
/** Oʻchirish: roʻyxatdan va brauzerdagi `kalit@id` holatidan */
export function removeSvc(s: SvcKind, id: string, store = ls()): void {
  save(s, listSvc(s, store).filter(x => x.id !== id), store);
  if (!store) return;
  const suf = `@${id}`, ks: string[] = [];
  for (let i = 0; i < store.length; i++) { const k = store.key(i); if (k?.endsWith(suf)) ks.push(k); }
  ks.forEach(k => store.removeItem(k));
}
