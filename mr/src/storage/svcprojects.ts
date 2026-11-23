/**
 * Xizmatlarning oʻz loyihalari (14.11.2026, egasi): Koʻchasoz, Joyshunos, Render alohida kirilganda — Master rejaga emas,
 * oʻz loyihalar roʻyxatiga. Roʻyxat brauzerda (`svcp:<xizmat>`), har loyiha holati `kalit@<id>` (core/projctx.scoped).
 * id «s_…» — Master reja loyihasi («p_…») bilan aralashmaydi. «Asosiy loyiha» (id '') — manzilda ?p= yoʻq holat (avvalgi ish).
 */
export type SvcKind = 'ks' | 'joy' | 'ren' | 'dk';   // 23.11: dk — Dizayn-kod peshlavhalari (holat — ildizdagi js/dk-loyiha.js, IndexedDB «archemistry-dk»)
export interface SvcProject { id: string; name: string; created: string; updated: string; /** 22.11: loyihasiz eski ishdan koʻchirilgan */ legacy?: true }
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

/** 22.11: shu loyiha eski (loyihasiz) ishdan koʻchirilganmi */
export function isLegacySvc(s: SvcKind, id: string | null, store = ls()): boolean { return !!id && !!listSvc(s, store).find(x => x.id === id)?.legacy; }

/** Xizmat holati kalitlari (loyihaga ajratiladigan): localStorage va IndexedDB kesh */
export const SVC_STATE: Record<SvcKind, { ls: string[]; idb: string[] }> = {
  ks: { ls: ['ks-street', 'ks-a', 'ks-b', 'ks-c', 'ks-e', 'ks-grafika', 'ks-varaq'], idb: [] },
  joy: { ls: ['joy-state', 'joy-proj', 'joy-axo', 'joy-street', 'kps_site'], idb: ['joy-model'] },
  ren: { ls: ['render-base'], idb: ['render-src', 'render-out'] },
  dk: { ls: [], idb: [] },
};
type Idb = { get: (k: string) => Promise<unknown>; put: (k: string, v: unknown) => Promise<void> };
/**
 * 22.11 (egasi: «eski sahnalar ochilaveradi»): loyihasiz (umumiy kalitlardagi) eski ish bir marta nomli loyihaga koʻchiriladi
 * (nusxa — asl kalitlar oʻchirilmaydi, lekin endi hech qayerda oʻqilmaydi). Qayta koʻchirilmaydi (`svcmig:<xizmat>`).
 */
export async function migrateOld(s: SvcKind, name: string, idb: Idb, store = ls(), now = new Date()): Promise<SvcProject | null> {
  if (!store || store.getItem(`svcmig:${s}`)) return null;
  const st = SVC_STATE[s], lsv = st.ls.map(k => [k, store.getItem(k)] as const).filter(([, v]) => v != null && v !== '' && v !== 'null');
  const idv: [string, unknown][] = [];
  for (const k of st.idb) { const v = await idb.get(k).catch(() => null); if (v != null && !(Array.isArray(v) && !v.length)) idv.push([k, v]); }
  try { store.setItem(`svcmig:${s}`, '1'); } catch { /* */ }
  if (!lsv.length && !idv.length) return null;
  const p = createSvc(s, name, store, now);
  const a = listSvc(s, store); const q = a.find(x => x.id === p.id); if (q) { q.legacy = true; save(s, a, store); }
  for (const [k, v] of lsv) try { store.setItem(`${k}@${p.id}`, v!); } catch { /* */ }
  for (const [k, v] of idv) await idb.put(`${k}@${p.id}`, v).catch(() => {});
  return { ...p, legacy: true };
}
