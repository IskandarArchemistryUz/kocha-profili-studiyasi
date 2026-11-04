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
 *  - suv obyektlari (04.11, Murad sinovi, 6-band): waterway=river|stream|canal|drain|ditch (chiziq — oʻq), natural=water (koʻl, suv ombori;
 *    water=river|canal — daryo/kanal yuzasi); toifa (sarf) OSM da yoʻq — river «oʻrta», stream «juda kichik», canal — kiritilmagan;
 *  - yer foydalanishi (qimmatli yerlar): landuse=orchard / vineyard / farmland — uchastka bilan kesishganlari, sukut «buziladi»
 *    (cheklov emas, yer balansi va yoʻqotiladigan yerlar uchun).
 * Hammasi src: 'osm', osm: id — foydalanuvchi holat, turini oʻzgartiradi yoki oʻchiradi.
 */
import type { LngLat } from '../core/doc';
import { frame, type XY } from '../core/geo';
import type { Limit, LimitKind } from '../core/limits';

type Geo = { lat: number; lon: number };
export interface OsmEl { type: 'node' | 'way' | 'relation'; id: number; tags?: Record<string, string>; lat?: number; lon?: number; geometry?: Geo[]; members?: { type: string; role: string; geometry?: Geo[] }[] }

export const LIM_OSM_R = 1000;   // 04.11: sanoat korxonasi I sinf SMZ — 1000 m (SanQvaN 0350-17, 2.9); avval 500

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
  way["waterway"~"^(river|stream|canal|drain|ditch)$"]["tunnel"!="culvert"]["tunnel"!="yes"]; way["natural"="water"]; relation["natural"="water"];
  way["landuse"="industrial"]; relation["landuse"="industrial"]; way["building"~"^(industrial|manufacture)$"]; way["man_made"="works"];
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
    // 04.11: suv oqimi (chiziq) — daryo yoki kanal oʻqi
    if (t.waterway && /^(river|stream|canal|drain|ditch)$/.test(t.waterway) && e.geometry && e.geometry.length >= 2) {
      const axis = e.geometry.map(p => [p.lon, p.lat] as LngLat), loc = axis.map(fr.toLocal), riv = t.waterway === 'river' || t.waterway === 'stream';
      if (!near(loc, S, riv ? 300 : 60)) continue;
      add(e, 'suv', { axis, suv: riv ? { t: 'daryo', q: t.waterway === 'stream' ? 4 : 2 } : { t: 'kanal', ...(t.waterway === 'canal' ? {} : { q: 2 }) } });
      continue;
    }
    // temir yoʻl — oʻq atrofida 6 m izlar koridori
    if (t.railway === 'rail' && e.geometry && e.geometry.length >= 2) {
      const loc = e.geometry.map(p => [p.lon, p.lat] as XY).map(p => fr.toLocal(p as LngLat));
      if (!near(loc, S, 110)) continue;
      const L = loc.length, left: XY[] = [], right: XY[] = [];
      for (let i = 0; i < L; i++) { const a = loc[Math.max(0, i - 1)], b = loc[Math.min(L - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l * 3, ny = dx / l * 3; left.push([loc[i][0] + nx, loc[i][1] + ny]); right.push([loc[i][0] - nx, loc[i][1] - ny]); }
      add(e, 'temiryol', { rings: [[...left, ...right.reverse()].map(fr.toGeo)] });
      continue;
    }
    // poligonlar (way yoki multipolygon relation — tashqi halqa)
    const r = e.type === 'way' ? ring(e.geometry) : ring(e.members?.find(m => m.role === 'outer')?.geometry);
    if (!r || r.length < 3) continue;
    const loc = r.map(fr.toLocal);
    if (t.landuse === 'cemetery' || t.amenity === 'grave_yard') { if (near(loc, S, 500)) add(e, 'qabriston', { rings: [r] }); continue; }
    if (t.landuse === 'greenhouse_horticulture' || t.building === 'greenhouse') { if (near(loc, S, 100)) add(e, 'issiqxona', { rings: [r] }); continue; }
    if (t.building === 'warehouse') { if (near(loc, S, 50)) add(e, 'ombor', { rings: [r] }); continue; }
    // 04.11 (Murad Buildings sinovi, 8-band): sanoat korxonasi — SMZ sinfi korxona turiga qarab (2.9-band), OSM da yoʻq — qoʻlda kiritiladi.
    // Markazi uchastka ichida boʻlsa — qayta qurilayotgan korxona: «buziladi» (taklif)
    if (t.landuse === 'industrial' || t.man_made === 'works' || (t.building && /^(industrial|manufacture)$/.test(t.building))) {
      if (!near(loc, S, 1000)) continue;
      const c: XY = [loc.reduce((a, p) => a + p[0], 0) / loc.length, loc.reduce((a, p) => a + p[1], 0) / loc.length];
      add(e, 'sanoat', pip(c, S) ? { rings: [r], status: 'buziladi' } : { rings: [r] });
      continue;
    }
    if (t.natural === 'water') {
      const w = t.water ?? '', tp = /^(river|oxbow|stream)$/.test(w) ? 'daryo' : /^(canal|ditch|drain)$/.test(w) ? 'kanal' : 'kol';
      if (near(loc, S, tp === 'daryo' ? 300 : 250)) add(e, 'suv', { rings: [r], suv: tp === 'daryo' ? { t: 'daryo', q: 2 } : { t: tp } });
      continue;
    }
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
    if ((f.kind === 'elu' || f.kind === 'suv') && f.axis) { const a = f.axis.map(fr.toLocal); if (have.some(h => h.kind === f.kind && h.axis && a.every(p => h.axis!.map(fr.toLocal).some((q, i, arr) => i > 0 && segD(p, arr[i - 1], q) <= 20)))) return false; }
    return true;
  });
}

/**
 * 04.11 (Murad Buildings sinovi, 8-band): Overpass javob bermasa — atrof konteksti (xarita qatlami: OSM yoki OpenFreeMap vektor
 * plitalari) dan zaxira aniqlash. Kontekst obyektlari Overpass elementlariga aylantirilib, xuddi shu `parseLimitsOsm` qoidalaridan
 * oʻtadi: bino turi (industrial, manufacture → sanoat; warehouse → ombor; greenhouse → issiqxona), qabriston, suv yuzasi va oqimlari,
 * temir yoʻl. ELU va yer foydalanishi kontekstda yoʻq. Tegsiz katta binolar (≥ 3000 m², 1000 m ichida) — faqat soni qaytariladi
 * (sanoat boʻlishi mumkin, qoʻlda tekshiriladi).
 */
export interface CtxLite {
  buildings: { id: number; rings: LngLat[][]; kind: string }[];
  green: { id: number; rings: LngLat[][]; kind: string }[];
  water: { id: number; rings: LngLat[][]; kind: string }[];
  waterways: { id: number; pts: LngLat[]; cls: string; name?: string }[];
  rails: { id: number; pts: LngLat[]; cls: string }[];
}
export function limitsFromContext(c: CtxLite, site: LngLat[]): { limits: Limit[]; bigUnknown: number } {
  const geo = (r: LngLat[]): Geo[] => r.map(p => ({ lon: p[0], lat: p[1] })), shut = (r: LngLat[]) => [...geo(r), geo(r)[0]];
  const els: OsmEl[] = [];
  for (const b of c.buildings) if (/^(industrial|manufacture|warehouse|greenhouse)$/.test(b.kind) && b.rings[0]?.length >= 3) els.push({ type: 'way', id: b.id, tags: { building: b.kind }, geometry: shut(b.rings[0]) });
  for (const g of c.green) if (g.kind === 'cemetery' && g.rings[0]?.length >= 3) els.push({ type: 'way', id: g.id, tags: { landuse: 'cemetery' }, geometry: shut(g.rings[0]) });
  for (const w of c.water) if (w.rings[0]?.length >= 3) els.push({ type: 'way', id: w.id, tags: { natural: 'water', ...(/^(river|canal|stream|ditch|drain)$/.test(w.kind) ? { water: w.kind } : {}) }, geometry: shut(w.rings[0]) });
  for (const w of c.waterways) if (/^(river|stream|canal|drain|ditch)$/.test(w.cls) && w.pts.length >= 2) els.push({ type: 'way', id: w.id, tags: { waterway: w.cls, ...(w.name ? { name: w.name } : {}) }, geometry: geo(w.pts) });
  for (const r of c.rails) if (r.cls === 'rail' && r.pts.length >= 2) els.push({ type: 'way', id: r.id, tags: { railway: 'rail' }, geometry: geo(r.pts) });
  const limits = parseLimitsOsm({ elements: els }, site);
  const fr = frame(site[0]), S = site.map(fr.toLocal);
  const area = (r: XY[]) => { let a = 0; for (let i = 0; i < r.length; i++) { const p = r[i], q = r[(i + 1) % r.length]; a += p[0] * q[1] - q[0] * p[1]; } return Math.abs(a) / 2; };
  const bigUnknown = c.buildings.filter(b => b.kind === 'yes' && b.rings[0]?.length >= 3 && (() => { const l = b.rings[0].map(fr.toLocal); return area(l) >= 3000 && near(l, S, 1000); })()).length;
  return { limits, bigUnknown };
}
