/**
 * Koʻpriklar va pandus (02.11, egasi: «OSM dan yuklanganda koʻprik bor joyda tekis yoʻl boʻlib qolyapti»).
 * OSM: bridge=* + layer=N → koʻprik qavati N (kamida 1); tunnel=yes — yer osti (sahnada chizilmaydi, alohida roʻyxat).
 * Balandlik va pandus — normada yoʻq raqamlar «TAXMIN»:
 *   - LEVEL_H — bir koʻprik qavati 6,5 m (ostidagi yoʻl gabariti ~5 m + plita ~1 m + zaxira) — TAXMIN;
 *   - RAMP — pandus nishabligi 5 % (shahar yoʻllari uchun odatiy chegaradan oshmaydi) — TAXMIN, norma bilan aniqlanadi;
 *   - PIER — tayanchlar oraligʻi 30 m, plita 1 m, parapet 1,1 m — TAXMIN.
 * Pandus: koʻprik uchiga ulangan oddiy yoʻl (koʻprik emas) boʻlagi koʻprik balandligidan yergacha RAMP nishablik bilan tushadi.
 * Sof funksiya `elevateRoads` — testlanadi; `bridgeMeshes` — three.js geometriya.
 */
import * as THREE from 'three';
import type { XY } from '../core/geo';
import type { HeightFn } from './context3d';

export const LEVEL_H = 6.5, RAMP = 0.05, PIER = 30, DECK = 1, PARAPET = 1.1;

export interface RoadIn { id: number; pts: XY[]; w: number; cls: string; lvl?: number; lanes?: number; oneway?: boolean }
/** koʻtarilgan chiziq: har nuqta balandligi (yerdan, m); bridge — koʻprik (tayanchli), aks holda pandus (toʻsiq devorli) */
export interface Elevated { id: number; pts: XY[]; z: number[]; w: number; bridge: boolean }
export interface ElevResult { elevated: Elevated[]; /** yerdagi (tekis) qismlar — mavjud tekis chizish uchun */ flat: RoadIn[] }

const key = (p: XY) => `${Math.round(p[0] * 2)},${Math.round(p[1] * 2)}`;
const segLen = (a: XY, b: XY) => Math.hypot(b[0] - a[0], b[1] - a[1]);

/** Chiziqni boshidan s masofagacha boʻlak va qolgan qismga ajratish */
function splitAt(pts: XY[], s: number): [XY[], XY[]] {
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const L = segLen(pts[i - 1], pts[i]);
    if (acc + L >= s) {
      const t = (s - acc) / (L || 1), p: XY = [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t];
      return [[...pts.slice(0, i), p], [p, ...pts.slice(i)]];
    }
    acc += L;
  }
  return [pts, []];
}

/** Koʻpriklarni koʻtarish va ularga ulangan pandus boʻlaklari; qolgan yoʻllar tekis */
const segX = (a: XY, b: XY, c: XY, d: XY) => { const o = (p: XY, q: XY, r: XY) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])); return o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0; };
const crosses = (p: XY[], q: XY[]) => { for (let i = 1; i < p.length; i++) for (let j = 1; j < q.length; j++) if (segX(p[i - 1], p[i], q[j - 1], q[j])) return true; return false; };

/** 05.11: kalta koʻprik (zanjir uzunligi) — ariq/kanal koʻprigi; ostidan faqat piyoda/xizmat yoʻli oʻtsa koʻtarilmaydi (ANDOZA) */
export const SHORT_BRIDGE = 20;
const MINOR = /^(footway|path|cycleway|steps|track|bridleway|corridor|pedestrian|service|living_street)$/;
/**
 * Qaysi koʻprik haqiqatan koʻtariladi (02.11, egasi: «hudud oʻrtasida koʻprik chiqib qoldi»): OSM da ariq, kanal va jar ustidagi
 * kichik koʻpriklar ham bridge=yes — ular yer sathida qoladi. Koʻtariladi faqat ostidan yoʻl yoki temir yoʻl oʻtadigan koʻprik
 * (sath kesishmasi) va unga uchma-uch ulangan koʻprik boʻlaklari. 05.11: zanjiri ≤ SHORT_BRIDGE m va ostidan faqat piyoda/xizmat
 * yoʻli oʻtadigan koʻprik ham yer sathida (ariq boʻyidagi yoʻlak ustidagi kichik koʻprik 6,5 m ga koʻtarilib qolardi).
 */
export function gradeBridges(roads: RoadIn[], rails: XY[][] = []): Set<number> {
  const bridges = roads.filter(r => (r.lvl ?? 0) > 0 && r.pts.length >= 2), flat = roads.filter(r => !((r.lvl ?? 0) > 0));
  const len = (b: RoadIn) => b.pts.slice(1).reduce((t, p, i) => t + segLen(b.pts[i], p), 0);
  // uchma-uch ulangan koʻprik boʻlaklari — bitta zanjir; uzunligi — yigʻindi
  const chain = (b0: RoadIn): number => { const seen = new Set([b0.id]), q = [b0]; let L = 0;
    while (q.length) { const b = q.pop()!; L += len(b); const ends = [b.pts[0], b.pts[b.pts.length - 1]].map(key);
      for (const o of bridges) if (!seen.has(o.id) && [o.pts[0], o.pts[o.pts.length - 1]].some(p => ends.includes(key(p)))) { seen.add(o.id); q.push(o); } }
    return L; };
  const on = new Set<number>(bridges.filter(b => rails.some(r => crosses(b.pts, r)) || flat.some(f => crosses(b.pts, f.pts) && (!MINOR.test(f.cls) || chain(b) > SHORT_BRIDGE))).map(b => b.id));
  for (let ch = true; ch;) { ch = false; for (const b of bridges) { if (on.has(b.id)) continue; const ends = [b.pts[0], b.pts[b.pts.length - 1]].map(key);
    if (bridges.some(o => on.has(o.id) && [o.pts[0], o.pts[o.pts.length - 1]].some(p => ends.includes(key(p))))) { on.add(b.id); ch = true; } } }
  return on;
}

export function elevateRoads(roads0: RoadIn[], rails: XY[][] = []): ElevResult {
  const up = gradeBridges(roads0, rails), roads = roads0.map(r => (r.lvl ?? 0) > 0 && !up.has(r.id) ? { ...r, lvl: 0 } : r);
  const bridges = roads.filter(r => (r.lvl ?? 0) > 0 && r.pts.length >= 2);
  if (!bridges.length) return { elevated: [], flat: roads };
  const elevated: Elevated[] = [];
  for (const b of bridges) { const h = (b.lvl ?? 1) * LEVEL_H; elevated.push({ id: b.id, pts: b.pts, z: b.pts.map(() => h), w: b.w, bridge: true }); }
  // koʻprik uchlari va ulardagi balandlik
  const ends = new Map<string, number>();
  for (const b of bridges) for (const p of [b.pts[0], b.pts[b.pts.length - 1]]) { const k = key(p), h = (b.lvl ?? 1) * LEVEL_H; ends.set(k, Math.max(ends.get(k) ?? 0, h)); }
  // pandus: koʻprik uchiga tegib turgan oddiy yoʻl — oʻsha uchidan yergacha
  const flat: RoadIn[] = [];
  for (const r of roads) {
    if ((r.lvl ?? 0) > 0) continue;
    let pts = r.pts; const hs = ends.get(key(pts[0])), he = ends.get(key(pts[pts.length - 1]));
    if (!hs && !he) { flat.push(r); continue; }
    const total = pts.slice(1).reduce((t, p, i) => t + segLen(pts[i], p), 0);
    // ikkala uchi koʻprikka ulangan qisqa boʻlak — butunlay koʻtarilgan (chiziqli)
    if (hs && he && total <= (hs + he) / RAMP) {
      let acc = 0; const z = pts.map((p, i) => { if (i) acc += segLen(pts[i - 1], p); return hs + (he - hs) * (acc / (total || 1)); });
      elevated.push({ id: r.id, pts, z, w: r.w, bridge: false }); continue;
    }
    const ramp = (line: XY[], h0: number): Elevated | null => {
      const L = h0 / RAMP, [up] = splitAt(line, L); if (up.length < 2) return null;
      let acc = 0; const z = up.map((p, i) => { if (i) acc += segLen(up[i - 1], p); return Math.max(0, h0 * (1 - acc / L)); });
      return { id: r.id, pts: up, z, w: r.w, bridge: false };
    };
    if (hs) { const e = ramp(pts, hs); if (e) { elevated.push(e); pts = splitAt(pts, hs / RAMP)[1]; } }
    if (he && pts.length >= 2) {
      const rev = [...pts].reverse(), e = ramp(rev, he);
      if (e) { elevated.push(e); pts = splitAt(rev, he / RAMP)[1].reverse(); }
    }
    if (pts.length >= 2) flat.push({ ...r, pts });
  }
  return { elevated, flat };
}

/** Koʻtarilgan yoʻllar geometriyasi: plita (yuqori yuza + yon), parapet, tayanchlar (koʻprik) yoki toʻsiq devori (pandus) */
export function bridgeMeshes(list: Elevated[], H: HeightFn): { deck: THREE.BufferGeometry; side: THREE.BufferGeometry } | null {
  if (!list.length) return null;
  const top: number[] = [], side: number[] = [];
  const v = (arr: number[], x: number, y: number, z: number) => arr.push(x, z, -y);
  const quad = (arr: number[], a: number[], b: number[], c: number[], d: number[]) => { for (const p of [a, b, c, a, c, d]) v(arr, p[0], p[1], p[2]); };
  for (const e of list) {
    const r = e.w / 2 + 0.6;   // yoʻl + chetlari
    for (let i = 1; i < e.pts.length; i++) {
      const a = e.pts[i - 1], b = e.pts[i], L = segLen(a, b); if (L < 0.05) continue;
      const nx = -(b[1] - a[1]) / L, ny = (b[0] - a[0]) / L;
      const za = H(a[0], a[1]) + e.z[i - 1], zb = H(b[0], b[1]) + e.z[i];
      if (e.z[i - 1] < 0.05 && e.z[i] < 0.05) continue;
      const aL = [a[0] + nx * r, a[1] + ny * r], aR = [a[0] - nx * r, a[1] - ny * r], bL = [b[0] + nx * r, b[1] + ny * r], bR = [b[0] - nx * r, b[1] - ny * r];
      // yuqori yuza
      quad(top, [aL[0], aL[1], za], [bL[0], bL[1], zb], [bR[0], bR[1], zb], [aR[0], aR[1], za]);
      for (const [p, q] of [[aL, bL], [aR, bR]] as const) {
        // parapet (ikki tomonda)
        quad(side, [p[0], p[1], za], [q[0], q[1], zb], [q[0], q[1], zb + PARAPET], [p[0], p[1], za + PARAPET]);
        // yon yuza: koʻprikda — plita qalinligi; pandusda — yergacha devor
        const ga = e.bridge ? za - DECK : H(p[0], p[1]), gb = e.bridge ? zb - DECK : H(q[0], q[1]);
        quad(side, [p[0], p[1], ga], [q[0], q[1], gb], [q[0], q[1], zb], [p[0], p[1], za]);
      }
      if (e.bridge) quad(side, [aL[0], aL[1], za - DECK], [bL[0], bL[1], zb - DECK], [bR[0], bR[1], zb - DECK], [aR[0], aR[1], za - DECK]);
    }
    // tayanchlar (faqat koʻprik): har PIER m, eni yoʻl enining 0,6 qismi, 1,2 m qalinlik
    if (e.bridge) {
      let acc = 0, next = PIER / 2;
      for (let i = 1; i < e.pts.length; i++) {
        const a = e.pts[i - 1], b = e.pts[i], L = segLen(a, b); if (L < 0.05) continue;
        const ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L, nx = -uy, ny = ux, hw = e.w * 0.3, ht = 0.6;
        while (next <= acc + L) {
          const t = next - acc, c = [a[0] + ux * t, a[1] + uy * t], g = H(c[0], c[1]), zt = g + e.z[i - 1] + (e.z[i] - e.z[i - 1]) * (t / L) - DECK;
          const P = (s: number, w: number) => [c[0] + ux * s + nx * w, c[1] + uy * s + ny * w];
          const cs = [P(-ht, -hw), P(ht, -hw), P(ht, hw), P(-ht, hw)];
          for (let k = 0; k < 4; k++) { const p = cs[k], q = cs[(k + 1) % 4]; quad(side, [p[0], p[1], g], [q[0], q[1], g], [q[0], q[1], zt], [p[0], p[1], zt]); }
          next += PIER;
        }
        acc += L;
      }
    }
  }
  const mk = (arr: number[]) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3)); g.computeVertexNormals(); return g; };
  return { deck: mk(top), side: mk(side) };
}
