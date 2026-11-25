/**
 * OpenFreeMap vektor plitkalaridan (OpenMapTiles sxemasi, z14) atrof maʼlumoti — Overpass sekin yoki band boʻlganda zaxira.
 * Plitkalar tez (CDN) va kalitsiz; Overpassga nisbatan kamroq teg: bino balandligi faqat render_height, daraxtlar yoʻq,
 * koʻcha nomlari transportation_name qatlamidan ulanadi. Natija — Overpass tahlili bilan bir xil OsmData.
 */
import { PbfReader } from 'pbf';
import { VectorTile, classifyRings, type VectorTileFeature } from '@mapbox/vector-tile';
import type { LngLat } from '../core/doc';
import { heightByArea, ringAreaM2, roadWidth, type BBox, type CtxLine, type OsmData } from './osm';

export const OFM_TILEJSON = 'https://tiles.openfreemap.org/planet';
const Z = 14;
let tileUrl: string | null = null;

async function tileTemplate(f: typeof fetch): Promise<string> {
  if (tileUrl) return tileUrl;
  const j = await (await f(OFM_TILEJSON)).json() as { tiles?: string[] };
  if (!j.tiles?.[0]) throw new Error('OpenFreeMap: tilejson');
  tileUrl = j.tiles[0]; return tileUrl;
}

const lng2x = (lng: number, n: number) => (lng + 180) / 360 * n;
const lat2y = (lat: number, n: number) => { const r = lat * Math.PI / 180; return (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * n; };

/** bbox (janub, gʻarb, shimol, sharq) ni qoplaydigan z14 plitkalar */
export function tilesFor(bb: BBox): { x: number; y: number }[] {
  const n = 2 ** Z, x0 = Math.floor(lng2x(bb[1], n)), x1 = Math.floor(lng2x(bb[3], n)), y0 = Math.floor(lat2y(bb[2], n)), y1 = Math.floor(lat2y(bb[0], n));
  const out: { x: number; y: number }[] = [];
  for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) out.push({ x, y });
  return out;
}

/** OpenMapTiles transportation class/subclass → OSM highway */
function highwayOf(p: Record<string, unknown>): string | null {
  const c = String(p.class ?? ''), s = String(p.subclass ?? '');
  if (/^(motorway|trunk|primary|secondary|tertiary)$/.test(c)) return p.ramp === 1 || p.ramp === '1' ? `${c}_link` : c;
  if (c === 'minor') return /^(residential|unclassified|living_street|road)$/.test(s) ? s : 'residential';
  if (c === 'service') return 'service';
  if (c === 'track') return 'track';
  if (c === 'path') return /^(footway|path|cycleway|steps|pedestrian|bridleway|corridor)$/.test(s) ? s : 'path';
  if (c === 'raceway' || c === 'busway') return null;
  return null;
}
const PT_WAY: Record<string, number> = { river: 25, canal: 12, stream: 4, ditch: 2, drain: 2 };

/** Plitkalardan OsmData; bb — qiziqish chegarasi (undan tashqaridagi obyektlar tashlanadi) */
export async function fetchOfm(bb: BBox, f: typeof fetch): Promise<OsmData> {
  const tpl = await tileTemplate(f), n = 2 ** Z;
  const tiles = tilesFor(bb);
  if (tiles.length > 36) throw new Error('OpenFreeMap: hudud juda katta');
  const bufs = await Promise.all(tiles.map(async t => {
    const r = await f(tpl.replace('{z}', String(Z)).replace('{x}', String(t.x)).replace('{y}', String(t.y)));
    if (!r.ok) throw new Error(`OpenFreeMap ${r.status}`);
    return { t, buf: new Uint8Array(await r.arrayBuffer()) };
  }));
  const d: OsmData = { buildings: [], roads: [], rails: [], water: [], waterways: [], green: [], trees: [] };
  const inBB = (pts: LngLat[]) => pts.some(p => p[1] >= bb[0] && p[1] <= bb[2] && p[0] >= bb[1] && p[0] <= bb[3]);
  const names: { name: string; pts: LngLat[] }[] = [];
  const seen = new Set<string>();
  let auto = 1;
  for (const { t, buf } of bufs) {
    const vt = new VectorTile(new PbfReader(buf));
    const toLL = (ext: number) => (px: { x: number; y: number }): LngLat => {
      const X = (t.x + px.x / ext) / n, Y = (t.y + px.y / ext) / n;
      return [Math.round((X * 360 - 180) * 1e7) / 1e7, Math.round(Math.atan(Math.sinh(Math.PI * (1 - 2 * Y))) * 180 / Math.PI * 1e7) / 1e7];
    };
    const each = (layer: string, fn: (ft: VectorTileFeature, geom: LngLat[][], id: number) => void) => {
      const L = vt.layers[layer]; if (!L) return;
      for (let i = 0; i < L.length; i++) {
        const ft = L.feature(i), geom = ft.loadGeometry().map(r => r.map(toLL(ft.extent)));
        const id = ft.id ?? (900_000_000 + auto++);
        // plitka chegarasida boʻlingan obyekt ikki marta kelmasin (id boʻlsa)
        const key = `${layer}:${ft.id ?? `${t.x}/${t.y}/${i}`}`; if (ft.id != null && seen.has(key)) continue; seen.add(key);
        fn(ft, geom, id);
      }
    };
    const polys = (ft: VectorTileFeature): LngLat[][][] => classifyRings(ft.loadGeometry()).map(rs => rs.map(r => r.map(toLL(ft.extent)).reverse()));   // MVT: tashqi halqa soat yoʻnalishida (y pastga) → geografikda teskari
    each('building', (ft, _g, id) => {
      const p = ft.properties, rh = Number(p.render_height), given = Number.isFinite(rh) && rh > 0 && rh !== 5;   // OMT: balandlik yoʻq boʻlsa 5 qoʻyadi
      polys(ft).forEach((rings, i) => { if (rings[0].length < 4 || !inBB(rings[0])) return; const a = ringAreaM2(rings[0]); if (a < 12) return;
        d.buildings.push({ id: id * 10 + i, rings, h: given ? rh : heightByArea('yes', a, 9), hSrc: given ? 'height' : 'taxmin', kind: 'yes' }); });
    });
    each('transportation', (ft, geom, id) => {
      const p = ft.properties, tun = p.brunnel === 'tunnel', lay = Number(p.layer);
      const c = String(p.class ?? ''), s = String(p.subclass ?? '');
      if (tun && (c === 'rail' || c === 'transit')) return;
      if (c === 'rail' || c === 'transit') {
        const cls = c === 'rail' ? 'rail' : /^(tram|subway|light_rail|narrow_gauge)$/.test(s) ? s : 'rail';
        if (cls === 'subway') return;
        geom.forEach((pts, i) => { if (pts.length >= 2 && inBB(pts)) d.rails.push({ id: id * 10 + i, pts, cls, w: cls === 'tram' ? 2.6 : 3.2 }); });
        return;
      }
      const hw = highwayOf(p); if (!hw) return;
      const t2: Record<string, string> = { highway: hw }; if (hw === 'service' && p.service) t2.service = String(p.service);
      const oneway = p.oneway === 1 || p.oneway === -1 || p.oneway === '1' || p.oneway === '-1';
      geom.forEach((pts, i) => { if (pts.length < 2 || !inBB(pts)) return;
        const r: CtxLine = { id: id * 10 + i, pts, cls: hw, w: roadWidth(t2), ...(t2.service ? { sub: t2.service } : {}), ...(oneway ? { oneway } : {}) };
        // 02.11: koʻprik / tunnel (OpenMapTiles «brunnel», «layer»)
        if (tun) { (d.tunnels ??= []).push({ ...r, lvl: Number.isFinite(lay) && lay < 0 ? lay : -1 }); return; }
        if (p.brunnel === 'bridge') r.lvl = Math.max(1, Math.min(5, Number.isFinite(lay) ? Math.round(lay) : 1));
        d.roads.push(r); });
    });
    each('transportation_name', (ft, geom) => { const nm = ft.properties.name; if (typeof nm === 'string' && nm) geom.forEach(pts => names.push({ name: nm, pts })); });
    each('water', (ft, _g, id) => { const k = String(ft.properties.class ?? 'water'); if (k === 'ocean') return; polys(ft).forEach((rings, i) => { if (rings[0].length >= 4 && inBB(rings[0])) d.water.push({ id: id * 10 + i, rings, kind: k }); }); });
    each('waterway', (ft, geom, id) => { const p = ft.properties, k = String(p.class ?? 'stream'); if (p.brunnel === 'tunnel') return;
      geom.forEach((pts, i) => { if (pts.length >= 2 && inBB(pts)) d.waterways.push({ id: id * 10 + i, pts, cls: k, w: PT_WAY[k] ?? 3, ...(typeof p.name === 'string' && p.name ? { name: p.name } : {}) }); }); });
    each('park', (ft, _g, id) => polys(ft).forEach((rings, i) => { if (rings[0].length >= 4 && inBB(rings[0])) d.green.push({ id: id * 10 + i, rings, kind: 'park' }); }));
    each('landcover', (ft, _g, id) => { const c = String(ft.properties.class ?? ''), s = String(ft.properties.subclass ?? '');
      const kind = c === 'wood' ? (s === 'scrub' ? 'scrub' : 'wood') : c === 'grass' ? (s === 'grassland' ? 'grassland' : /^(meadow|allotments|orchard|vineyard|recreation_ground|village_green)$/.test(s) ? s : 'grass') : c === 'farmland' ? (s === 'orchard' || s === 'vineyard' ? s : '') : '';
      if (!kind) return; polys(ft).forEach((rings, i) => { if (rings[0].length >= 4 && inBB(rings[0])) d.green.push({ id: id * 10 + i, rings, kind }); }); });
    each('landuse', (ft, _g, id) => { const c = String(ft.properties.class ?? ''); const kind = /^(cemetery|pitch|playground|garden|golf_course)$/.test(c) ? c : ''; if (!kind) return;
      polys(ft).forEach((rings, i) => { if (rings[0].length >= 4 && inBB(rings[0])) d.green.push({ id: id * 10 + i, rings, kind }); }); });
  }
  // koʻcha nomlari: nom chizigʻi bilan uch nuqtasi ustma-ust tushgan yoʻllarga
  if (names.length && d.roads.length) {
    const key = (p: LngLat) => `${Math.round(p[0] * 2e5)}:${Math.round(p[1] * 2e5)}`;
    const byPt = new Map<string, string>(); for (const nmn of names) for (const p of nmn.pts) byPt.set(key(p), nmn.name);
    for (const r of d.roads) { for (const p of r.pts) { const nm = byPt.get(key(p)); if (nm) { r.name = nm; break; } } }
  }
  return d;
}


/* ===== 25.11: faqat yoʻllar — Joyshunos piyoda tarmogʻi, oqim va shovqin uchun (Overpass oʻrniga; tez, 3 km gacha) ===== */
export interface OfmRoad { cls: string; pts: LngLat[]; f?: string }
type Px = [number, number];
/** Siniq chiziqni plitka kvadratiga [0, ext] kesish (Liang–Barsky): plitka chegarasidan tashqaridagi bufer qismi tashlanadi */
export function clipToTile(line: Px[], ext: number): Px[][] {
  const out: Px[][] = []; let cur: Px[] = [];
  const inside = (p: Px) => p[0] >= 0 && p[0] <= ext && p[1] >= 0 && p[1] <= ext;
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1], b = line[i], dx = b[0] - a[0], dy = b[1] - a[1];
    let t0 = 0, t1 = 1, ok = true;
    for (const [p, q] of [[-dx, a[0]], [dx, ext - a[0]], [-dy, a[1]], [dy, ext - a[1]]] as [number, number][]) {
      if (p === 0) { if (q < 0) { ok = false; break; } continue; }
      const r = q / p; if (p < 0) { if (r > t1) { ok = false; break; } if (r > t0) t0 = r; } else { if (r < t0) { ok = false; break; } if (r < t1) t1 = r; }
    }
    if (!ok) { if (cur.length >= 2) out.push(cur); cur = []; continue; }
    const A: Px = [a[0] + dx * t0, a[1] + dy * t0], Bp: Px = [a[0] + dx * t1, a[1] + dy * t1];
    if (!cur.length) cur.push(A); else if (t0 > 0) { if (cur.length >= 2) out.push(cur); cur = [A]; }
    cur.push(Bp);
    if (t1 < 1 || !inside(b)) { if (cur.length >= 2) out.push(cur); cur = []; }
  }
  if (cur.length >= 2) out.push(cur);
  return out;
}
/** Plitka chokida boʻlingan yoʻl boʻlaklari uchlarini birlashtirish: tol (gradus) ichidagi uchlar bitta nuqtaga — tarmoq uzilmasin */
export function weldEnds(lines: { pts: LngLat[] }[], tol = 2e-5): void {
  const cell = (v: number) => Math.floor(v / tol), grid = new Map<string, LngLat[]>();
  for (const l of lines) for (const p of [l.pts[0], l.pts[l.pts.length - 1]]) {
    let hit: LngLat | null = null;
    for (let i = -1; i <= 1 && !hit; i++) for (let j = -1; j <= 1 && !hit; j++) for (const q of grid.get(`${cell(p[0]) + i},${cell(p[1]) + j}`) ?? []) if (Math.abs(q[0] - p[0]) <= tol && Math.abs(q[1] - p[1]) <= tol) { hit = q; break; }
    if (hit) { p[0] = hit[0]; p[1] = hit[1]; } else { const k = `${cell(p[0])},${cell(p[1])}`; (grid.get(k) || grid.set(k, []).get(k)!).push(p); }
  }
}
/** Plitkalarda chiziqlar soddalashtirilgan: T-chorrahadagi umumiy tugun yoʻqoladi, yon koʻcha uchi asosiy koʻchadan 0,5–3 m qisqa qoladi.
 *  Bogʻlanmagan uch (boshqa chiziq uchi bilan tegmagan) eng yaqin boshqa chiziq kesmasiga (≤ tolM) cho'ziladi va undan 0,3 m oshiriladi —
 *  tarmoq qurilishida (cutCrossings) kesishuv sifatida aniqlanib, umumiy tugun hosil boʻladi. Sinov (Toshkent markazi, 700 m):
 *  tikishsiz 217 komponent, eng kattasi 60 %; Overpass — 5 komponent, 99,7 %. */
export function stitchEnds(lines: { pts: LngLat[]; f?: string }[], tolM = 6): number {
  if (!lines.length) return 0;
  const lat0 = lines[0].pts[0][1], kx = 111_320 * Math.cos(lat0 * Math.PI / 180), ky = 111_132;
  const X = (p: LngLat): [number, number] => [p[0] * kx, p[1] * ky];
  const C = 20, grid = new Map<string, [number, number][]>(), ends = new Map<string, number>(), ek = (p: LngLat) => `${p[0].toFixed(6)},${p[1].toFixed(6)}`;
  lines.forEach((l, li) => {
    for (const p of [l.pts[0], l.pts[l.pts.length - 1]]) ends.set(ek(p), (ends.get(ek(p)) ?? 0) + 1);
    for (let i = 1; i < l.pts.length; i++) {
      const a = X(l.pts[i - 1]), b = X(l.pts[i]);
      for (let gx = Math.floor(Math.min(a[0], b[0]) / C); gx <= Math.floor(Math.max(a[0], b[0]) / C); gx++) for (let gy = Math.floor(Math.min(a[1], b[1]) / C); gy <= Math.floor(Math.max(a[1], b[1]) / C); gy++) {
        const k = `${gx},${gy}`; (grid.get(k) || grid.set(k, []).get(k)!).push([li, i]);
      }
    }
  });
  let n = 0;
  lines.forEach((l, li) => {
    for (const end of [0, l.pts.length - 1]) {
      const p = l.pts[end]; if ((ends.get(ek(p)) ?? 0) > 1) continue;   // boshqa chiziq uchi bilan tutashgan
      const P = X(p), own = end === 0 ? 1 : l.pts.length - 1;
      let best: { d: number; q: [number, number] } | null = null;
      for (let gx = Math.floor((P[0] - tolM) / C); gx <= Math.floor((P[0] + tolM) / C); gx++) for (let gy = Math.floor((P[1] - tolM) / C); gy <= Math.floor((P[1] + tolM) / C); gy++) for (const [lj, sj] of grid.get(`${gx},${gy}`) ?? []) {
        if (lj === li && sj === own) continue;   // oʻz uchidagi kesma (koʻprik uchi — yer sathidagi davomiga ulanadi: rampalar)
        const a = X(lines[lj].pts[sj - 1]), b = X(lines[lj].pts[sj]), dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy; if (!L2) continue;
        const t = Math.max(0, Math.min(1, ((P[0] - a[0]) * dx + (P[1] - a[1]) * dy) / L2)), q: [number, number] = [a[0] + dx * t, a[1] + dy * t], d = Math.hypot(q[0] - P[0], q[1] - P[1]);
        if (d <= tolM && (!best || d < best.d)) best = { d, q };
      }
      if (!best || best.d <= 0.05) continue;   // uch allaqachon boshqa chiziq ustida (OSM tuguni saqlangan) — tegilmaydi
      const ux = (best.q[0] - P[0]) / best.d, uy = (best.q[1] - P[1]) / best.d, o = 0.3;
      l.pts[end] = [Math.round((best.q[0] + ux * o) / kx * 1e7) / 1e7, Math.round((best.q[1] + uy * o) / ky * 1e7) / 1e7]; n++;
    }
  });
  return n;
}
/** Chiziqlarni tugunlash (OSM dagi umumiy tugun oʻrniga): kesishgan kesmalarga ikkalasiga bir xil nuqta qoʻshiladi.
 *  Koʻprik / tunnel (f) boshqa sathdagi yoʻl bilan kesishsa — tugun yoʻq (ustidan / ostidan oʻtadi). */
export function nodeLines(lines: { pts: LngLat[]; f?: string }[]): number {
  if (!lines.length) return 0;
  const lat0 = lines[0].pts[0][1], kx = 111_320 * Math.cos(lat0 * Math.PI / 180), ky = 111_132, C = 50;
  const X = (p: LngLat): [number, number] => [p[0] * kx, p[1] * ky];
  type Sg = { l: number; i: number; a: [number, number]; b: [number, number] };
  const segs: Sg[] = [], grid = new Map<string, number[]>();
  lines.forEach((l, li) => { for (let i = 1; i < l.pts.length; i++) {
    const a = X(l.pts[i - 1]), b = X(l.pts[i]), k = segs.length; segs.push({ l: li, i, a, b });
    for (let gx = Math.floor(Math.min(a[0], b[0]) / C); gx <= Math.floor(Math.max(a[0], b[0]) / C); gx++) for (let gy = Math.floor(Math.min(a[1], b[1]) / C); gy <= Math.floor(Math.max(a[1], b[1]) / C); gy++) {
      const g = `${gx},${gy}`; (grid.get(g) || grid.set(g, []).get(g)!).push(k);
    } } });
  const cuts = new Map<number, { t: number; p: LngLat }[]>(), done = new Set<string>(), E = 1e-7;
  const add = (k: number, t: number, p: LngLat) => { (cuts.get(k) || cuts.set(k, []).get(k)!).push({ t, p }); };
  let n = 0;
  for (const ids of grid.values()) for (let x = 0; x < ids.length; x++) for (let y = x + 1; y < ids.length; y++) {
    const P = segs[ids[x]], Q = segs[ids[y]];
    if (P.l === Q.l && Math.abs(P.i - Q.i) <= 1) continue;
    if (!!lines[P.l].f !== !!lines[Q.l].f) continue;   // turli sath
    const pk = ids[x] < ids[y] ? `${ids[x]}|${ids[y]}` : `${ids[y]}|${ids[x]}`; if (done.has(pk)) continue; done.add(pk);
    const rx = P.b[0] - P.a[0], ry = P.b[1] - P.a[1], sx = Q.b[0] - Q.a[0], sy = Q.b[1] - Q.a[1], den = rx * sy - ry * sx;
    if (Math.abs(den) < 1e-9) continue;
    const qx = Q.a[0] - P.a[0], qy = Q.a[1] - P.a[1], t = (qx * sy - qy * sx) / den, u = (qx * ry - qy * rx) / den;
    if (t < -E || t > 1 + E || u < -E || u > 1 + E) continue;
    const tin = t > 1e-6 && t < 1 - 1e-6, uin = u > 1e-6 && u < 1 - 1e-6; if (!tin && !uin) continue;   // ikkalasining uchida — allaqachon tugun
    // umumiy nuqta: uchi tushgan boʻlsa — oʻsha uch, aks holda hisoblangan nuqta
    const p: LngLat = !tin ? lines[P.l].pts[t < 0.5 ? P.i - 1 : P.i] : !uin ? lines[Q.l].pts[u < 0.5 ? Q.i - 1 : Q.i]
      : [Math.round((P.a[0] + rx * t) / kx * 1e7) / 1e7, Math.round((P.a[1] + ry * t) / ky * 1e7) / 1e7];
    if (tin) add(ids[x], t, p); if (uin) add(ids[y], u, p); n++;
  }
  const byLine = new Map<number, Map<number, { t: number; p: LngLat }[]>>();
  for (const [k, c] of cuts) { const sg = segs[k]; (byLine.get(sg.l) || byLine.set(sg.l, new Map()).get(sg.l)!).set(sg.i, c); }
  for (const [li, m] of byLine) {
    const old = lines[li].pts, out: LngLat[] = [old[0]];
    for (let i = 1; i < old.length; i++) { for (const c of (m.get(i) ?? []).sort((a, b) => a.t - b.t)) out.push(c.p); out.push(old[i]); }
    lines[li].pts = out;
  }
  return n;
}
/** Hudud yoʻllari OpenFreeMap z14 plitkalaridan: highway sinfi va bayroq b (koʻprik / tunnel). OSM dagi foot=no va sidewalk teglari yoʻq. */
export async function fetchOfmRoads(bb: BBox, f: typeof fetch): Promise<OfmRoad[]> {
  const tpl = await tileTemplate(f), n = 2 ** Z, tiles = tilesFor(bb);
  if (tiles.length > 49) throw new Error('OpenFreeMap: hudud juda katta');
  const bufs = await Promise.all(tiles.map(async t => {
    const r = await f(tpl.replace('{z}', String(Z)).replace('{x}', String(t.x)).replace('{y}', String(t.y)));
    if (!r.ok) throw new Error(`OpenFreeMap ${r.status}`);
    return { t, buf: new Uint8Array(await r.arrayBuffer()) };
  }));
  const out: OfmRoad[] = [];
  const inBB = (pts: LngLat[]) => pts.some(p => p[1] >= bb[0] && p[1] <= bb[2] && p[0] >= bb[1] && p[0] <= bb[3]);
  for (const { t, buf } of bufs) {
    const L = new VectorTile(new PbfReader(buf)).layers.transportation; if (!L) continue;
    for (let i = 0; i < L.length; i++) {
      const ft = L.feature(i); if (ft.type !== 2) continue;
      const p = ft.properties, c = String(p.class ?? ''); if (c === 'rail' || c === 'transit' || c === 'ferry' || c === 'aerialway') continue;
      const hw = highwayOf(p); if (!hw) continue;
      const fl = p.brunnel === 'bridge' || p.brunnel === 'tunnel' ? 'b' : '', ext = ft.extent;
      const ll = (q: Px): LngLat => { const X = (t.x + q[0] / ext) / n, Y = (t.y + q[1] / ext) / n; return [Math.round((X * 360 - 180) * 1e7) / 1e7, Math.round(Math.atan(Math.sinh(Math.PI * (1 - 2 * Y))) * 180 / Math.PI * 1e7) / 1e7]; };
      for (const g of ft.loadGeometry()) for (const piece of clipToTile(g.map(q => [q.x, q.y] as Px), ext)) {
        const pts = piece.map(ll); if (pts.length >= 2 && inBB(pts)) out.push({ cls: hw, pts, ...(fl ? { f: fl } : {}) });
      }
    }
  }
  weldEnds(out); stitchEnds(out); nodeLines(out);
  return out;
}
