/**
 * Uchastkaga kirish va atrofdagi yoʻllar (27.10, 1-qadam «Kirish va yoʻllar»): chegaradan ≤ 30 m dagi OSM yoʻllari, toifasi.
 * Toifa OSM `highway` tegidan: ShNQ 2.07.06-24, 1-ilova (koʻcha-yoʻllar tasnifi) boʻyicha yaqin guruh — taxminiy moslik.
 */
import type { CtxLine } from '../context/osm';
import type { LngLat } from './doc';
import { frame, type XY } from './geo';

export type RoadGroup = 'magistral' | 'tuman' | 'mahalliy' | 'xizmat';
export const ROAD_GROUP: Record<string, RoadGroup> = {
  motorway: 'magistral', trunk: 'magistral', primary: 'magistral', motorway_link: 'magistral', trunk_link: 'magistral', primary_link: 'magistral',
  secondary: 'tuman', tertiary: 'tuman', secondary_link: 'tuman', tertiary_link: 'tuman',
  residential: 'mahalliy', unclassified: 'mahalliy', living_street: 'mahalliy', road: 'mahalliy',
  service: 'xizmat',
};
/**
 * Uchastkaga kirish holati yoʻl toifasi boʻyicha (ShNQ 2.07.06-24, 1-ilova, asl matndan):
 *  asosiy shahar yoʻli 1-sinf — «turli darajadagi chorrahalar (razvyazkalar) orqali transport vositalariga kirish»;
 *  asosiy yoʻl 2-sinf — «chorrahalar va tutashuvlar orqali transport vositalariga kirish 300-400 m dan oshmaydi»;
 *  shahar ahamiyatidagi asosiy koʻcha 1-sinf — «tutash binolarga xizmat koʻrsatish yon yoki mahalliy oʻtish yoʻllaridan»;
 *  turar joylar hududidagi koʻchalar — «binolar va yer uchastkalariga toʻgʻridan-toʻgʻri kirishni taʼminlaydi».
 * OSM toifasi → sinf moslashuvi taxminiy.
 */
export function accessVerdict(a: { cls: string; group: RoadGroup }): { s: 'ok' | 'warn' | 'info'; t: string } {
  if (a.cls === 'motorway' || a.cls === 'trunk' || a.cls === 'motorway_link' || a.cls === 'trunk_link') return { s: 'warn', t: 'Toʻgʻridan-toʻgʻri kirish yoʻq — razvyazka yoki yon yoʻl orqali' };
  if (a.group === 'magistral') return { s: 'warn', t: 'Kirish yon (mahalliy) yoʻldan yoki chorraha orqali, orasi 300–400 m dan oshmaydi' };
  if (a.group === 'tuman') return { s: 'info', t: 'Kirish chorraha yoki tutashuv orqali' };
  return { s: 'ok', t: 'Toʻgʻridan-toʻgʻri kirish mumkin' };
}
export interface Access { id: number; name: string; cls: string; group: RoadGroup; d: number; oneway: boolean; len: number }

const pd = (p: XY, a: XY, b: XY) => { const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy, t = L ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L)) : 0; return Math.hypot(p[0] - a[0] - dx * t, p[1] - a[1] - dy * t); };

/** Chegaradan ≤ maxD m dagi yoʻllar: yoʻl boʻylab chegaraga yaqin qismi uzunligi (len) bilan; magistral → mahalliy tartibda */
export function siteAccess(site: LngLat[], roads: CtxLine[], origin: LngLat, maxD = 30, skip: Set<number> = new Set()): Access[] {
  const fr = frame(origin), S = site.map(fr.toLocal), out: Access[] = [];
  const dist = (p: XY) => { let d = Infinity; for (let i = 0; i < S.length; i++) d = Math.min(d, pd(p, S[i], S[(i + 1) % S.length])); return d; };
  for (const r of roads) {
    const g = ROAD_GROUP[r.cls]; if (!g || skip.has(r.id)) continue;
    const P = r.pts.map(fr.toLocal); let dmin = Infinity, len = 0;
    for (let i = 1; i < P.length; i++) {
      const a = P[i - 1], b = P[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(L / 10));
      for (let k = 0; k < n; k++) { const t = (k + 0.5) / n, p: XY = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], d = dist(p); dmin = Math.min(dmin, d); if (d <= maxD) len += L / n; }
    }
    if (dmin <= maxD) out.push({ id: r.id, name: r.name ?? '', cls: r.cls, group: g, d: dmin, oneway: !!r.oneway, len });
  }
  const ord: RoadGroup[] = ['magistral', 'tuman', 'mahalliy', 'xizmat'];
  // bir nomli boʻlaklar birlashtiriladi (OSM yoʻli koʻp boʻlakka boʻlingan)
  const by = new Map<string, Access>();
  for (const a of out) { const k = a.name ? `${a.name}|${a.group}` : `#${a.id}`, o = by.get(k); if (!o) by.set(k, { ...a }); else { o.len += a.len; o.d = Math.min(o.d, a.d); o.oneway = o.oneway && a.oneway; } }
  return [...by.values()].filter(a => a.len >= 10).sort((a, b) => ord.indexOf(a.group) - ord.indexOf(b.group) || b.len - a.len);
}
