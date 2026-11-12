/**
 * Daraxtlar xaritasi (12.11, eski navbat 7-band; claude/albom-boblar-kcap-06-11.md, «Daraxt maʼlumoti»):
 * mavjud daraxtlar — OSM (natural=tree, tree_row) va foydalanuvchi inventarizatsiyasi (CSV, GeoJSON, DXF);
 * loyiha bilan solishtiriladi: bino ostida yoki qatnov qismida qolganlari — kesiladi / koʻchiriladi,
 * bino devoriga 5 m dan yaqin — ShNQ 2.07.01-23, 485-band, 35-jadval («bino devori — 5,0 m») boʻyicha ziddiyat; qolgani saqlanadi.
 * Toshkentda daraxt kesishga muddatsiz moratoriy bor — kesiladiganlar har biri alohida kelishiladi (izoh varaqda).
 * Toshkent «Daraxtlar reyestri» ochiq API siz — egasi soʻraydi; hozircha OSM + inventarizatsiya fayli.
 */
import type { LngLat } from './doc';
import { utmToLngLat } from './userlayers';

type XY = [number, number];
export interface InvTree { at: LngLat; sp?: string; d?: number; h?: number; st?: string }
export type TreeSt = 'saqlanadi' | 'kesiladi' | 'yaqin';
export const TREE_WALL = 5;   // 35-jadval: daraxt oʻqidan bino devorigacha, m

const num = (v: string | undefined): number | undefined => { if (v == null) return undefined; const x = Number(String(v).replace(',', '.').trim()); return Number.isFinite(x) ? x : undefined; };

/** Koordinatani WGS84 ga: lon/lat yoki UTM (41N/42N — Oʻzbekiston; 42N sukut) */
function toLL(a: number, b: number, zone = 42): LngLat | null {
  // Markaziy Osiyoda uzunlik (55–80) kenglikdan (37–46) katta — ustunlar almashgan boʻlsa ham toʻgʻri
  if (Math.abs(a) <= 180 && Math.abs(b) <= 180 && (Math.abs(a) <= 90 || Math.abs(b) <= 90)) return Math.abs(b) <= 90 && (a >= b || Math.abs(a) > 90) ? [a, b] : [b, a];
  if (a > 100000 && a < 900000 && b > 3000000 && b < 6000000) return utmToLngLat(a, b, zone);
  if (b > 100000 && b < 900000 && a > 3000000 && a < 6000000) return utmToLngLat(b, a, zone);
  return null;
}

/** CSV: sarlavhadan ustunlar (lon/lng/x/E · lat/y/N · tur/species/порода · diametr/d · balandlik/h · holat/state) */
export function parseTreesCsv(text: string, zone = 42): { trees: InvTree[]; skipped: number } {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return { trees: [], skipped: 0 };
  const sep = [';', '\t', ','].find(s => lines[0].split(s).length >= 2) ?? ',';
  const H = lines[0].split(sep).map(s => s.trim().toLowerCase().replace(/^"|"$/g, ''));
  const col = (...names: RegExp[]) => H.findIndex(h => names.some(r => r.test(h)));
  const cx = col(/^(lon|lng|long|x|e|easting|долгота)$/), cy = col(/^(lat|y|n|northing|широта)$/);
  const cs = col(/tur|species|порода|nom|name/), cd = col(/diam|^d$|диам|stvol/), ch = col(/balandl|height|^h$|высот/), cst = col(/holat|state|condition|состоя/);
  if (cx < 0 || cy < 0) return { trees: [], skipped: lines.length - 1 };
  const out: InvTree[] = []; let skipped = 0;
  for (const l of lines.slice(1)) {
    const c = l.split(sep).map(s => s.trim().replace(/^"|"$/g, ''));
    const a = num(c[cx]), b = num(c[cy]), ll = a != null && b != null ? toLL(a, b, zone) : null;
    if (!ll) { skipped++; continue; }
    out.push({ at: ll, ...(cs >= 0 && c[cs] ? { sp: c[cs] } : {}), ...(cd >= 0 && num(c[cd]) != null ? { d: num(c[cd]) } : {}), ...(ch >= 0 && num(c[ch]) != null ? { h: num(c[ch]) } : {}), ...(cst >= 0 && c[cst] ? { st: c[cst] } : {}) });
  }
  return { trees: out, skipped };
}

/** GeoJSON: Point / MultiPoint obyektlari */
export function parseTreesGeoJSON(text: string, zone = 42): { trees: InvTree[]; skipped: number } {
  const gj = JSON.parse(text), fs: any[] = gj.type === 'FeatureCollection' ? gj.features : [gj];
  const out: InvTree[] = []; let skipped = 0;
  for (const f of fs) {
    const g = f?.geometry, P = f?.properties ?? {};
    const pts: number[][] = g?.type === 'Point' ? [g.coordinates] : g?.type === 'MultiPoint' ? g.coordinates : [];
    if (!pts.length) { skipped++; continue; }
    for (const p of pts) { const ll = toLL(p[0], p[1], zone); if (!ll) { skipped++; continue; } out.push({ at: ll, ...(P.species || P.tur ? { sp: String(P.species ?? P.tur) } : {}) }); }
  }
  return { trees: out, skipped };
}

/** DXF (ASCII): POINT, CIRCLE va INSERT (blok) markazlari — DWG ni DXF ga saqlab yuklang. Koordinatalar UTM (42N) yoki lon/lat */
export function parseTreesDxf(text: string, zone = 42): { trees: InvTree[]; skipped: number } {
  const L = text.split(/\r?\n/), out: InvTree[] = []; let skipped = 0, inEnt = false;
  for (let i = 0; i + 1 < L.length; i += 2) {
    const code = L[i].trim(), val = L[i + 1].trim();
    if (code === '2' && val === 'ENTITIES') inEnt = true;
    if (code === '0' && val === 'ENDSEC') inEnt = false;
    if (!inEnt || code !== '0' || !['POINT', 'CIRCLE', 'INSERT'].includes(val)) continue;
    let x: number | undefined, y: number | undefined, j = i + 2;
    for (; j + 1 < L.length && L[j].trim() !== '0'; j += 2) { const c = L[j].trim(); if (c === '10') x = num(L[j + 1]); if (c === '20') y = num(L[j + 1]); }
    const ll = x != null && y != null ? toLL(x, y, zone) : null;
    if (ll) out.push({ at: ll }); else skipped++;
    i = j - 2;
  }
  return { trees: out, skipped };
}

export function parseTrees(file: string, text: string): { trees: InvTree[]; skipped: number } {
  const f = file.toLowerCase();
  if (f.endsWith('.geojson') || f.endsWith('.json')) return parseTreesGeoJSON(text);
  if (f.endsWith('.dxf')) return parseTreesDxf(text);
  return parseTreesCsv(text);
}

const pip = (p: XY, r: XY[]) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const a = r[i], b = r[j]; if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
const segD = (p: XY, a: XY, b: XY) => { const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy, t = l2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2)) : 0; return Math.hypot(a[0] + dx * t - p[0], a[1] + dy * t - p[1]); };
const ringD = (p: XY, r: XY[]) => { let m = Infinity; for (let i = 0; i < r.length; i++) m = Math.min(m, segD(p, r[i], r[(i + 1) % r.length])); return m; };

/** Mavjud daraxt holati: bino ostida yoki qatnov qismida — kesiladi; bino devoriga < 5 m — yaqin; aks holda saqlanadi */
export function treeStatus(t: XY, blds: XY[][], carriage: XY[][][]): TreeSt {
  if (blds.some(r => pip(t, r)) || carriage.some(poly => pip(t, poly[0]) && !poly.slice(1).some(h => pip(t, h)))) return 'kesiladi';
  if (blds.some(r => ringD(t, r) < TREE_WALL - 1e-6)) return 'yaqin';
  return 'saqlanadi';
}

/** OSM va inventarizatsiyani birlashtirish: inventar daraxtidan 2 m ichidagi OSM nuqtasi — takror, olinmaydi */
export function mergeTrees(osm: XY[], inv: XY[]): XY[] {
  if (!inv.length) return osm;
  return [...inv, ...osm.filter(p => !inv.some(q => Math.hypot(p[0] - q[0], p[1] - q[1]) < 2))];
}
