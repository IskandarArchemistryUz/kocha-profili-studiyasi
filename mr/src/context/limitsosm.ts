/**
 * Mavjud holat va cheklovlar — OSM dan avtomatik aniqlash (02.11, cheklovlar 4-bosqichi; egasi: «OSM da maʼlumot boʻlsa mavjud
 * yer foydalanishi va ELU tayanchlari bilan yuklansin, boʻlmasa qoʻlda toʻldiriladi»).
 *
 * Alohida yengil Overpass soʻrovi (kontekst keshi oʻzgarmaydi). Uchastka atrofida 500 m (eng katta qabriston SMZ — II sinf) ichida:
 *  - qabriston: landuse=cemetery, amenity=grave_yard;
 *  - issiqxona: landuse=greenhouse_horticulture, building=greenhouse;
 *  - ombor: building=warehouse;
 *  - temir yoʻl: railway=rail (oʻq atrofida 6 m yoʻlak — izlar koridori, TAXMIN);
 *  - ELU: power=line / minor_line (havo), power=cable (kabel); kuchlanish — voltage tegidan (V → kV, eng kattasi);
 *    tayanchlar — power=tower / pole nuqtalari, eng yaqin liniyaga (≤ 15 m) biriktiriladi;
 *  - yer foydalanishi (qimmatli yerlar): landuse=orchard / vineyard / farmland — uchastka bilan kesishganlari, sukut «buziladi»
 *    (cheklov emas, yer balansi va yoʻqotiladigan yerlar uchun).
 * Hammasi src: 'osm', osm: id — foydalanuvchi holat, turini oʻzgartiradi yoki oʻchiradi.
 */
import type { LngLat } from '../core/doc';
import { frame, type XY } from '../core/geo';
import type { Limit, LimitKind } from '../core/limits';

type Geo = { lat: number; lon: number };
export interface OsmEl { type: 'node' | 'way' | 'relation'; id: number; tags?: Record<string, string>; lat?: number; lon?: number; geometry?: Geo[]; members?: { type: string; role: string; geometry?: Geo[] }[] }

export const LIM_OSM_R = 500;

export function limitsQuery(site: LngLat[], r = LIM_OSM_R): string {
  const fr = frame(site[0]), loc = site.map(fr.toLocal), xs = loc.map(p => p[0]), ys = loc.map(p => p[1]);
  const sw = fr.toGeo([Math.min(...xs) - r, Math.min(...ys) - r]), ne = fr.toGeo([Math.max(...xs) + r, Math.max(...ys) + r]);
  const bb = [sw[1], sw[0], ne[1], ne[0]].map(v => v.toFixed(6)).join(',');
  return `[out:json][timeout:60][bbox:${bb}];
(
  way["landuse"="cemetery"]; relation["landuse"="cemetery"]; way["amenity"="grave_yard"];
  way["landuse"="greenhouse_horticulture"]; way["building"="greenhouse"];
  way["building"="warehouse"];
  way["railway"="rail"]["tunnel"!="yes"];
  way["power"~"^(line|minor_line|cable)$"];
  node["power"~"^(tower|pole)$"];
  way["landuse"~"^(orchard|vineyard|farmland)$"];
);
out geom qt;`;
}

const ring = (g?: Geo[]): LngLat[] | null => { if (!g || g.length < 4) return null; const r = g.map(p => [p.lon, p.lat] as LngLat); const a = r[0], b = r[r.length - 1]; return a[0] === b[0] && a[1] === b[1] ? r.slice(0, -1) : r; };
const pip = (p: XY, r: XY[]) => { let ins = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const a = r[i], b = r[j]; if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) ins = !ins; } return ins; };
const segD = (p: XY, a: XY, b: XY) => { const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2)); return Math.hypot(a[0] + dx * t - p[0], a[1] + dy * t - p[1]); };
/** nuqtadan koʻpburchak chegarasigacha masofa (ichida — 0) */
function distToRing(p: XY, r: XY[]): number { if (pip(p, r)) return 0; let d = Infinity; for (let i = 0; i < r.length; i++) d = Math.min(d, segD(p, r[i], r[(i + 1) % r.length])); return d; }
/** chiziq / koʻpburchak uchastkadan m masofada yoki ichidami */
const near = (pts: XY[], site: XY[], m: number) => pts.some(p => distToRing(p, site) <= m) || site.some(q => pts.length > 2 && pip(q, pts))
  // uzun kesma: uchastka burchaklaridan chiziq kesmalarigacha
  || site.some(q => pts.some((a, i) => i > 0 && segD(q, pts[i - 1], a) <= m))
  || pts.some((a, i) => i > 0 && site.some((_q, k) => segX(pts[i - 1], a, site[k], site[(k + 1) % site.length])));
const segX = (a: XY, b: XY, c: XY, d: XY) => { const o = (p: XY, q: XY, r: XY) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])); return o(a, b, c) !== o(a, b, d) && o(c, d, a) !== o(c, d, b); };

/** voltage tegi (V, «;» bilan bir nechta) → kV, eng kattasi; yoʻq — undefined */
export function kvOf(v?: string): number | undefined {
  if (!v) return undefined;
  const n = v.split(/[;,]/).map(s => parseFloat(s.trim())).filter(x => Number.isFinite(x) && x > 0);
  if (!n.length) return undefined;
  const m = Math.max(...n); return m >= 100 ? Math.round(m / 100) / 10 : m;   // 110000 → 110; 400 → 0,4; «10» (kV yozilgan) — oʻzi
}

/** Overpass javobidan cheklovlar roʻyxati; site — uchastka (LngLat) */
export function parseLimitsOsm(j: { elements?: OsmEl[] }, site: LngLat[]): Limit[] {
  const fr = frame(site[0]), S = site.map(fr.toLocal), out: Limit[] = [], els = j.elements ?? [];
  const add = (e: OsmEl, kind: LimitKind, extra: Partial<Limit>) => out.push({ id: `osm_${e.type[0]}${e.id}`, kind, status: 'saqlanadi', src: 'osm', osm: e.id, ...(e.tags?.name ? { name: e.tags.name.slice(0, 120) } : {}), ...extra } as Limit);
  const poles = els.filter(e => e.type === 'node' && e.lat != null && e.lon != null).map(e => [e.lon!, e.lat!] as LngLat);
  // 04.11 (Murad Buildings sinovi, 7-band): zavod ichki temir yoʻl tarmoqlari avtomatik «saqlanadi» boʻlib, 100 m SMZ bilan katta joyni
  // yopardi. Uchastka ichida toʻliq joylashgan va tashqi tarmoqqa ulanmagan shoxobchalar (bogʻlangan izlar guruhi) — «buziladi» taklifi
  const rails = els.filter(e => e.tags?.railway === 'rail' && e.geometry && e.geometry.length >= 2).map(e => ({ id: e.id, loc: e.geometry!.map(p => fr.toLocal([p.lon, p.lat] as LngLat)) }));
  const par = rails.map((_, i) => i), root = (i: number): number => (par[i] === i ? i : (par[i] = root(par[i])));
  for (let i = 0; i < rails.length; i++) for (let j = i + 1; j < rails.length; j++) {
    const A = rails[i].loc, B = rails[j].loc, ends = [A[0], A[A.length - 1], B[0], B[B.length - 1]];
    if (ends.slice(0, 2).some(p => B.some((q, k) => k > 0 && segD(p, B[k - 1], q) <= 3)) || ends.slice(2).some(p => A.some((q, k) => k > 0 && segD(p, A[k - 1], q) <= 3))) par[root(i)] = root(j);
  }
  const outside = new Set<number>(); rails.forEach((r, i) => { if (r.loc.some(p => !pip(p, S))) outside.add(root(i)); });
  const spur = new Set(rails.filter((_, i) => !outside.has(root(i))).map(r => r.id));
  for (const e of els) {
    const t = e.tags ?? {};
    if (e.type === 'node') continue;
    // ELU
    if (t.power && /^(line|minor_line|cable)$/.test(t.power) && e.geometry && e.geometry.length >= 2) {
      const axis = e.geometry.map(p => [p.lon, p.lat] as LngLat), loc = axis.map(fr.toLocal);
      if (!near(loc, S, 60)) continue;
      const kv = kvOf(t.voltage) ?? (t.power === 'minor_line' ? 0.4 : undefined);
      const pl = poles.filter(p => { const q = fr.toLocal(p); return loc.some((a, i) => i > 0 && segD(q, loc[i - 1], a) <= 15); });
      add(e, 'elu', { axis, ...(kv ? { kv } : {}), elu: t.power === 'cable' || t.location === 'underground' ? 'kabel' : 'mavjud', ...(pl.length ? { poles: pl } : {}) });
      continue;
    }
    // temir yoʻl — oʻq atrofida 6 m izlar koridori
    if (t.railway === 'rail' && e.geometry && e.geometry.length >= 2) {
      const loc = e.geometry.map(p => [p.lon, p.lat] as XY).map(p => fr.toLocal(p as LngLat));
      if (!near(loc, S, 110)) continue;
      const L = loc.length, left: XY[] = [], right: XY[] = [];
      for (let i = 0; i < L; i++) { const a = loc[Math.max(0, i - 1)], b = loc[Math.min(L - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l * 3, ny = dx / l * 3; left.push([loc[i][0] + nx, loc[i][1] + ny]); right.push([loc[i][0] - nx, loc[i][1] - ny]); }
      add(e, 'temiryol', { rings: [[...left, ...right.reverse()].map(fr.toGeo)], ...(spur.has(e.id) ? { status: 'buziladi' as const, name: `${e.tags?.name ? e.tags.name.slice(0, 80) + ' — ' : ''}ichki shoxobcha: uchastka ichida, tashqi tarmoqqa ulanmagan — zavod bilan birga buziladi (taklif)` } : {}) });
      continue;
    }
    // poligonlar (way yoki multipolygon relation — tashqi halqa)
    const r = e.type === 'way' ? ring(e.geometry) : ring(e.members?.find(m => m.role === 'outer')?.geometry);
    if (!r || r.length < 3) continue;
    const loc = r.map(fr.toLocal);
    if (t.landuse === 'cemetery' || t.amenity === 'grave_yard') { if (near(loc, S, 500)) add(e, 'qabriston', { rings: [r] }); continue; }
    if (t.landuse === 'greenhouse_horticulture' || t.building === 'greenhouse') { if (near(loc, S, 100)) add(e, 'issiqxona', { rings: [r] }); continue; }
    if (t.building === 'warehouse') { if (near(loc, S, 50)) add(e, 'ombor', { rings: [r] }); continue; }
    if (t.landuse && /^(orchard|vineyard|farmland)$/.test(t.landuse)) {
      if (near(loc, S, 0)) add(e, 'boshqa', { rings: [r], status: 'buziladi', name: e.tags?.name ?? ({ orchard: 'Bogʻ', vineyard: 'Uzumzor', farmland: 'Ekin maydoni' } as Record<string, string>)[t.landuse] });
      continue;
    }
  }
  return out;
}

/** Yangi topilganlar: hujjatda bor OSM obyektlari va bir xil turdagi qoʻlda chizilganlar bilan ustma-ust tushganlari tashlanadi */
export function newOnes(found: Limit[], have: Limit[], origin: LngLat): Limit[] {
  const fr = frame(origin), ids = new Set(have.map(l => l.osm).filter(x => x != null));
  const cen = (l: Limit): XY | null => { const r = l.rings?.[0]; if (!r?.length) return null; const loc = r.map(fr.toLocal); return [loc.reduce((t, p) => t + p[0], 0) / loc.length, loc.reduce((t, p) => t + p[1], 0) / loc.length]; };
  return found.filter(f => {
    if (f.osm != null && ids.has(f.osm)) return false;
    const c = cen(f);
    if (c && have.some(h => h.kind === f.kind && h.rings?.[0] && pip(c, h.rings[0].map(fr.toLocal)))) return false;
    if (f.kind === 'elu' && f.axis) { const a = f.axis.map(fr.toLocal); if (have.some(h => h.kind === 'elu' && h.axis && a.every(p => h.axis!.map(fr.toLocal).some((q, i, arr) => i > 0 && segD(p, arr[i - 1], q) <= 20)))) return false; }
    return true;
  });
}
