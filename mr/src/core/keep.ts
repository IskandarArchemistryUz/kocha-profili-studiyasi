/**
 * Saqlanadigan binolar barqarorligi (27.10): atrof binolari id'si manbaga bogʻliq (Overpass — OSM way id,
 * OpenFreeMap/Overture zaxirasi — boshqa raqamlar). Atrof qayta yuklanganda id oʻzgarsa, saqlangan bino
 * markazi (keepAt) boʻyicha eng yaqin binoga qayta bogʻlanadi — foydalanuvchi tanlovi yoʻqolmaydi.
 */
import type { LngLat } from './doc';
import { frame } from './geo';

export interface KeepCand { id: number; c: LngLat }
/** markazlar orasidagi ruxsat etilgan farq (m): turli manbalarda bir bino konturi biroz farq qiladi */
export const KEEP_TOL = 5;

export function reconcileKeep(keep: number[], keepAt: Record<string, LngLat> | undefined, cands: KeepCand[], origin: LngLat): { keep: number[]; keepAt: Record<string, LngLat>; changed: boolean } {
  const at: Record<string, LngLat> = {}, byId = new Map(cands.map(c => [c.id, c])), used = new Set<number>(), out: number[] = [];
  const fr = frame(origin), loc = cands.map(c => fr.toLocal(c.c));
  let changed = false;
  // 1) id mos kelganlar — joyida qoladi
  for (const k of keep) if (byId.has(k)) used.add(k);
  for (const k of keep) {
    const hit = byId.get(k);
    if (hit) { out.push(k); at[k] = keepAt?.[k] ?? hit.c; if (!keepAt?.[k]) changed = true; continue; }
    const p = keepAt?.[k];
    if (!p) { out.push(k); continue; }            // markaz nomaʼlum — tegmaymiz (atrof hali yuklanmagan boʻlishi mumkin)
    const q = fr.toLocal(p); let best = -1, bd = KEEP_TOL;
    cands.forEach((c, i) => { if (used.has(c.id)) return; const d = Math.hypot(loc[i][0] - q[0], loc[i][1] - q[1]); if (d <= bd) { bd = d; best = i; } });
    if (best >= 0) { const c = cands[best]; used.add(c.id); out.push(c.id); at[c.id] = c.c; changed = true; }
    else { out.push(k); at[k] = p; }               // hozircha topilmadi — keyingi yuklashda yana urinamiz
  }
  return { keep: [...new Set(out)], keepAt: at, changed };
}
