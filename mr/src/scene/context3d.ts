/**
 * Kontekst geometriyasi: minglab OSM binolari va yoʻllari bitta-ikkita birlashtirilgan
 * geometriyaga yigʻiladi (har biri alohida obyekt boʻlsa, sahna sekinlashadi).
 * Yer ustidagi qatlamlar (yoʻl, suv, yashil) chuqurlik testisiz chiziladi — relyefga «yopishadi».
 */
import * as THREE from 'three';
import type { Frame, XY } from '../core/geo';
import type { ContextSettings } from '../core/doc';
import type { ContextBundle } from '../context/load';
import { imageryUV } from '../context/tiles';
import { streetsGeo, type StreetIn } from './streets3d';

export const CC = {
  ground: 0xe9e6df, bld: 0xffffff, bldEdge: 0x8f8a80, road: 0x9a9893, roadMajor: 0x84827d, foot: 0xd9d3c7,
  rail: 0x6e6158, water: 0x9cc3df, green: 0xc5dca8, forest: 0xa9c98c, pitch: 0xb6d69a, crown: 0x7fa65a, trunk: 0x7a6650, roof: 0xe3b4a2,
  sidewalk: 0xd8d2c6, asphalt: 0x585b62, asphaltMajor: 0x4d5058, mark: 0xf4f4f0, waterSat: 0x5f9fd0,
};

export type HeightFn = (x: number, y: number) => number;


/** Overlay material: relyef ustida, chuqurlik testisiz, tartib boʻyicha chiziladi */
function flatMat(color: number, order: number): THREE.MeshBasicMaterial {
  // chuqurlik tekshiruvi bilan: binolar orqasidagi yoʻl ularni kesib koʻrinmasin; polygonOffset — yerdan ustun turishi uchun
  const m = new THREE.MeshBasicMaterial({ color, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 - order, polygonOffsetUnits: -4 - order * 2 });
  m.userData.order = order; return m;
}

function overlay(geo: THREE.BufferGeometry, mat: THREE.Material, order: number, name: string): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat); m.renderOrder = order; m.name = name; m.frustumCulled = false; return m;
}

/** Koʻpburchaklar (teshiklari bilan) → bitta tekis geometriya, balandlik relyefdan */
function fillGeo(polys: XY[][][], H: HeightFn, lift = 0.05): THREE.BufferGeometry | null {
  const pos: number[] = [];
  for (const rings of polys) {
    if (!rings.length || rings[0].length < 3) continue;
    const outer = rings[0].map(p => new THREE.Vector2(p[0], p[1])), holes = rings.slice(1).filter(h => h.length >= 3).map(h => h.map(p => new THREE.Vector2(p[0], p[1])));
    let tris: number[][];
    try { tris = THREE.ShapeUtils.triangulateShape(outer, holes); } catch { continue; }
    const all = [...outer, ...holes.flat()];
    for (const t of tris) for (const k of t) { const v = all[k]; pos.push(v.x, H(v.x, v.y) + lift, -v.y); }
  }
  if (!pos.length) return null;
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); return g;
}

/** Chiziq → kenglikli lenta (+ boʻgʻinlarda doira, burilishlar tekis chiqishi uchun) */
function ribbonGeo(lines: { pts: XY[]; w: number }[], H: HeightFn, lift = 0.1): THREE.BufferGeometry | null {
  const pos: number[] = [];
  const put = (x: number, y: number) => pos.push(x, H(x, y) + lift, -y);
  const disc = (c: XY, r: number) => { const n = r > 4 ? 12 : 8; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, b = (i + 1) / n * Math.PI * 2; put(c[0], c[1]); put(c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r); put(c[0] + Math.cos(b) * r, c[1] + Math.sin(b) * r); } };
  for (const l of lines) {
    const r = l.w / 2;
    for (let i = 1; i < l.pts.length; i++) {
      const a = l.pts[i - 1], b = l.pts[i], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy); if (L < 0.01) continue;
      const nx = -dy / L * r, ny = dx / L * r;
      // uzun segmentlarni relyef uchun boʻlish (har 20 m)
      const parts = Math.max(1, Math.ceil(L / 20));
      for (let k = 0; k < parts; k++) {
        const t0 = k / parts, t1 = (k + 1) / parts;
        const p0: XY = [a[0] + dx * t0, a[1] + dy * t0], p1: XY = [a[0] + dx * t1, a[1] + dy * t1];
        put(p0[0] + nx, p0[1] + ny); put(p0[0] - nx, p0[1] - ny); put(p1[0] + nx, p1[1] + ny);
        put(p1[0] + nx, p1[1] + ny); put(p0[0] - nx, p0[1] - ny); put(p1[0] - nx, p1[1] - ny);
      }
      if (r > 1.2) disc(b, r);
    }
    if (r > 1.2 && l.pts.length) disc(l.pts[0], r);
  }
  if (!pos.length) return null;
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); return g;
}

/** Binolar: devorlar + tom (uchburchaklangan), bitta geometriya; qirralar — alohida chiziqlar */
/** Eng kichik yuzali yoʻnaltirilgan toʻrtburchak (qirralar yoʻnalishlari boʻyicha) */
export function obb(r: XY[]): { U: XY; V: XY; u0: number; u1: number; v0: number; v1: number; area: number } {
  let best = { U: [1, 0] as XY, V: [0, 1] as XY, u0: 0, u1: 0, v0: 0, v1: 0, area: Infinity };
  for (let i = 0; i < r.length; i++) {
    const a = r[i], b = r[(i + 1) % r.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 0.3) continue;
    const U: XY = [(b[0] - a[0]) / L, (b[1] - a[1]) / L], V: XY = [-U[1], U[0]];
    let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
    for (const p of r) { const u = p[0] * U[0] + p[1] * U[1], v = p[0] * V[0] + p[1] * V[1]; u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
    const area = (u1 - u0) * (v1 - v0); if (area < best.area) best = { U, V, u0, u1, v0, v1, area };
  }
  return best;
}

const ROOFED = /^(house|detached|semidetached_house|bungalow|residential|yes|hut|cabin|terrace|farm|garage|shed|kiosk)$/;

/** Kichik past uylarga toʻrt qiyali (hip) tom: devorlar — OBB, tom — alohida geometriya */
function hipHouse(r: XY[], base: number, h: number, wall: { pos: number[]; nor: number[] }, roof: number[], ed: number[]): void {
  const o = obb(r); let { U, V, u0, u1, v0, v1 } = o;
  if (u1 - u0 < v1 - v0) { [U, V] = [V, [-U[0], -U[1]] as XY]; [u0, u1, v0, v1] = [v0, v1, -u1, -u0]; } // uzun oʻq — U
  const P = (u: number, v: number): XY => [U[0] * u + V[0] * v, U[1] * u + V[1] * v];
  const top = base + h, Lw = u1 - u0, S = v1 - v0, rh = Math.min(3.2, S * 0.32), oh = 0.35;
  // devorlar
  const rect = [P(u0, v0), P(u1, v0), P(u1, v1), P(u0, v1)];
  let sa = 0; for (let i = 0; i < 4; i++) { const a = rect[i], b = rect[(i + 1) % 4]; sa += a[0] * b[1] - b[0] * a[1]; }
  const rr = sa > 0 ? rect : rect.slice().reverse();
  for (let i = 0; i < 4; i++) {
    const p = rr[i], q = rr[(i + 1) % 4], dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy) || 1, n = [dy / L, 0, dx / L];
    for (const w of [[p[0], base, -p[1]], [q[0], base, -q[1]], [q[0], top, -q[1]], [p[0], base, -p[1]], [q[0], top, -q[1]], [p[0], top, -p[1]]]) { wall.pos.push(...w); wall.nor.push(...n); }
  }
  // tom
  const vm = (v0 + v1) / 2, A = P(u0 - oh, v0 - oh), B = P(u1 + oh, v0 - oh), C = P(u1 + oh, v1 + oh), D = P(u0 - oh, v1 + oh);
  const ridge = Lw - S > 0.5, R1 = ridge ? P(u0 + S / 2, vm) : P((u0 + u1) / 2, vm), R2 = ridge ? P(u1 - S / 2, vm) : R1;
  const e = top - 0.15, t = top + rh;
  const V3 = (p: XY, y: number) => [p[0], y, -p[1]];
  const tri = (a: number[], b: number[], c: number[]) => roof.push(...a, ...b, ...c);
  tri(V3(A, e), V3(B, e), V3(R2, t)); if (ridge) tri(V3(A, e), V3(R2, t), V3(R1, t));
  tri(V3(C, e), V3(D, e), V3(R1, t)); if (ridge) tri(V3(C, e), V3(R1, t), V3(R2, t));
  tri(V3(D, e), V3(A, e), V3(R1, t)); tri(V3(B, e), V3(C, e), V3(R2, t));
  for (const [a, b] of [[A, B], [B, C], [C, D], [D, A]] as [XY, XY][]) ed.push(...V3(a, e), ...V3(b, e));
  for (const [a, b] of [[A, R1], [D, R1], [B, R2], [C, R2]] as [XY, XY][]) ed.push(...V3(a, e), ...V3(b, t));
  if (ridge) ed.push(...V3(R1, t), ...V3(R2, t));
}

/** Atrofdagi kichik uyga qiya tom qoʻyiladimi — tom balandligi (m), aks holda 0 (uy raqami tom ustiga qoʻyilishi uchun ham) */
export function houseRoofRise(b: { rings: XY[][]; h: number; kind?: string }): number {
  const outer = b.rings[0]; if (!outer || b.rings.length !== 1 || outer.length < 3 || outer.length > 12 || b.h > 8 || !ROOFED.test(b.kind ?? 'yes')) return 0;
  let a = 0; for (let i = 0, j = outer.length - 1; i < outer.length; j = i++) a += outer[j][0] * outer[i][1] - outer[i][0] * outer[j][1];
  const A = Math.abs(a) / 2, o = obb(outer), S = Math.min(o.u1 - o.u0, o.v1 - o.v0);
  return A < 450 && A / o.area > 0.8 && S > 3 ? Math.min(3.2, S * 0.32) : 0;
}

function buildingsGeo(list: { id?: number; rings: XY[][]; h: number; kind?: string }[], H: HeightFn): { mesh: THREE.BufferGeometry; edges: THREE.BufferGeometry; roof: THREE.BufferGeometry | null } | null {
  const pos: number[] = [], nor: number[] = [], ed: number[] = [], roof: number[] = [];
  // har vertexda bino identifikatori (`fid` atributi) — sahnada bosib tanlash va alohida rang berish uchun
  const fidM: number[] = [], fidR: number[] = [];
  let pm = 0, pr = 0, cur = -1;
  /** shu paytgacha qoʻshilgan (hali belgilanmagan) vertexlarni joriy bino identifikatori bilan belgilash */
  const tag = () => { for (let n = pos.length / 3; pm < n; pm++) fidM.push(cur); for (let n = roof.length / 3; pr < n; pr++) fidR.push(cur); };
  for (const b of list) {
    tag(); cur = b.id ?? -1;
    const outer = b.rings[0]; if (!outer || outer.length < 3) continue;
    let base = Infinity; for (const p of outer) base = Math.min(base, H(p[0], p[1]));
    const top = base + b.h;
    // past kichik uy, deyarli toʻrtburchak dogʻ → qiya tom
    if (houseRoofRise(b) > 0) { hipHouse(outer, base, b.h, { pos, nor }, roof, ed); continue; }
    // devorlar (har halqa; tashqi CCW, teshik CW boʻlishi kerak — normallar yoʻnalishi uchun)
    b.rings.forEach((r0, ri) => {
      let a = 0; for (let i = 0, j = r0.length - 1; i < r0.length; j = i++) a += r0[j][0] * r0[i][1] - r0[i][0] * r0[j][1];
      const r = (ri === 0) === (a > 0) ? r0 : r0.slice().reverse();
      for (let i = 0; i < r.length; i++) {
        const p = r[i], q = r[(i + 1) % r.length], dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy) || 1;
        const n = [dy / L, 0, dx / L]; // tashqariga (y→−z)
        const v = [[p[0], base, -p[1]], [q[0], base, -q[1]], [q[0], top, -q[1]], [p[0], base, -p[1]], [q[0], top, -q[1]], [p[0], top, -p[1]]];
        for (const w of v) { pos.push(...w); nor.push(...n); }
        // qirralar: tom konturi + keskin burchakdagi vertikal
        ed.push(p[0], top, -p[1], q[0], top, -q[1]);
        const o = r[(i - 1 + r.length) % r.length], ax = p[0] - o[0], ay = p[1] - o[1];
        const cos = (ax * dx + ay * dy) / ((Math.hypot(ax, ay) || 1) * L);
        if (cos < 0.94) ed.push(p[0], base, -p[1], p[0], top, -p[1]);
      }
    });
    const outerV = outer.map(p => new THREE.Vector2(p[0], p[1])), holes = b.rings.slice(1).filter(h => h.length >= 3).map(h => h.map(p => new THREE.Vector2(p[0], p[1])));
    let tris: number[][] = [];
    try { tris = THREE.ShapeUtils.triangulateShape(outerV, holes); } catch { /* buzilgan halqa — tomsiz */ }
    const all = [...outerV, ...holes.flat()];
    for (const t of tris) {
      const A = all[t[0]], B = all[t[1]], C = all[t[2]];
      const ix = (B.x - A.x) * (C.y - A.y) - (B.y - A.y) * (C.x - A.x) > 0 ? t : [t[0], t[2], t[1]]; // yuqoridan CCW
      for (const k of ix) { const v = all[k]; pos.push(v.x, top, -v.y); nor.push(0, 1, 0); }
    }
  }
  tag();
  if (!pos.length) return null;
  const mesh = new THREE.BufferGeometry();
  mesh.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); mesh.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  mesh.setAttribute('fid', new THREE.Int32BufferAttribute(fidM, 1));
  const edges = new THREE.BufferGeometry(); edges.setAttribute('position', new THREE.Float32BufferAttribute(ed, 3));
  let rg: THREE.BufferGeometry | null = null;
  if (roof.length) { rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(roof, 3)); rg.setAttribute('fid', new THREE.Int32BufferAttribute(fidR, 1)); rg.computeVertexNormals(); }
  return { mesh, edges, roof: rg };
}

/** Chiziqni toʻrtburchakka qirqish (Liang–Barsky, har segment) → ichkaridagi boʻlaklar */
export function clipLine(pts: XY[], x0: number, y0: number, x1: number, y1: number): XY[][] {
  const out: XY[][] = []; let cur: XY[] = [];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], dx = b[0] - a[0], dy = b[1] - a[1];
    let t0 = 0, t1 = 1, ok = true;
    for (const [p, q] of [[-dx, a[0] - x0], [dx, x1 - a[0]], [-dy, a[1] - y0], [dy, y1 - a[1]]]) {
      if (p === 0) { if (q < 0) { ok = false; break; } continue; }
      const r = q / p; if (p < 0) { if (r > t1) { ok = false; break; } if (r > t0) t0 = r; } else { if (r < t0) { ok = false; break; } if (r < t1) t1 = r; }
    }
    if (!ok) { if (cur.length > 1) out.push(cur); cur = []; continue; }
    const A: XY = [a[0] + dx * t0, a[1] + dy * t0], B: XY = [a[0] + dx * t1, a[1] + dy * t1];
    if (!cur.length || t0 > 0) { if (cur.length > 1) out.push(cur); cur = [A]; }
    cur.push(B);
    if (t1 < 1) { out.push(cur); cur = []; }
  }
  if (cur.length > 1) out.push(cur);
  return out;
}

/** Deterministik tasodif (har yuklashda daraxtlar bir joyda turishi uchun) */
function rng(seed: number) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; }; }

function pip(p: XY, r: XY[]): boolean {
  let c = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) if ((r[i][1] > p[1]) !== (r[j][1] > p[1]) && p[0] < (r[j][0] - r[i][0]) * (p[1] - r[i][1]) / (r[j][1] - r[i][1]) + r[i][0]) c = !c;
  return c;
}

/**
 * Daraxtlar: OSM dagi alohida daraxtlar + bogʻ/park ichida va koʻchalar boʻylab taxminiy joylashuv.
 * Taxminiy daraxtlar faqat koʻrinish uchun; hisob-kitobda ishlatilmaydi.
 */
function treePositions(b: ContextBundle, fr: Frame, R: number, avoid: (p: XY) => boolean): XY[] {
  const out: XY[] = b.osm.trees.map(fr.toLocal).filter(p => Math.abs(p[0]) < R && Math.abs(p[1]) < R);
  const rnd = rng(Math.round(b.center[0] * 1e4) ^ Math.round(b.center[1] * 1e4));
  const MAXT = 14000;
  for (const a of b.osm.green) {
    if (/pitch|playground|golf|cemetery/.test(a.kind)) continue;
    const r = a.rings[0].map(fr.toLocal); let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const p of r) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    const step = /forest|wood/.test(a.kind) ? 7 : 11;
    for (let x = x0; x < x1; x += step) for (let y = y0; y < y1; y += step) {
      if (out.length > MAXT) return out;
      const p: XY = [x + (rnd() - 0.5) * step * 0.8, y + (rnd() - 0.5) * step * 0.8];
      if (Math.abs(p[0]) < R && Math.abs(p[1]) < R && pip(p, r) && rnd() > 0.25 && !avoid(p)) out.push(p);
    }
  }
  // koʻcha daraxtlari: turar va ikkinchi darajali koʻchalar chetidan 2 m
  for (const l of b.osm.roads) {
    if (!/^(residential|secondary|tertiary|primary|unclassified|living_street)$/.test(l.cls)) continue;
    const pts = l.pts.map(fr.toLocal), off = l.w / 2 + 2.2;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], c = pts[i], dx = c[0] - a[0], dy = c[1] - a[1], L = Math.hypot(dx, dy); if (L < 12) continue;
      const nx = -dy / L, ny = dx / L;
      for (let s = 6; s < L - 6; s += 10) for (const sg of [1, -1]) {
        if (out.length > MAXT) return out;
        const p: XY = [a[0] + dx / L * s + nx * off * sg, a[1] + dy / L * s + ny * off * sg];
        if (Math.abs(p[0]) < R && Math.abs(p[1]) < R && rnd() > 0.3 && !avoid(p)) out.push(p);
      }
    }
  }
  return out;
}

export interface ContextScene { group: THREE.Group; ground: THREE.Mesh; inSite: CtxBld[]; /** uchastkadan tashqaridagi koʻrinadigan binolar (tanlash uchun) */ blds: CtxBld[]; /** koʻrsatilgan OSM yoʻllari (mahalliy) — loyiha koʻchalari ularga ulanadi */ roads: StreetIn[]; dispose(): void; maskTrees(ring: XY[] | null): void }

/** Butun kontekst sahnasini qurish */
export interface CtxBld { id: number; rings: XY[][]; h: number; kind?: string }

/** Bitta yoki bir nechta binoning geometriyasi (loyiha uchastkasidagi mavjud binolar uchun) */
export function buildingMeshes(list: CtxBld[], H: HeightFn, mat: THREE.Material, roofMat: THREE.Material, edgeMat: THREE.LineBasicMaterial): THREE.Object3D[] {
  const g = buildingsGeo(list, H); if (!g) return [];
  const out: THREE.Object3D[] = [new THREE.Mesh(g.mesh, mat), new THREE.LineSegments(g.edges, edgeMat)];
  if (g.roof) out.push(new THREE.Mesh(g.roof, roofMat));
  return out;
}

/** Sunʼiy yoʻldosh tasviri biroz xira va ochroq: model (binolar, koʻchalar) oldinga chiqsin */
export const satTint = (sh: { fragmentShader: string }): void => {
  sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
      float lum_ = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(lum_), 0.4);
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.92, 0.91, 0.88), 0.28);`);
};

export function buildContext(b: ContextBundle, fr: Frame, cs: ContextSettings, H: HeightFn, imageTex: THREE.Texture | null, site: XY[] | null = null, skipRoads: Set<number> = new Set(), removed: Set<number> = new Set()): ContextScene {
  const g = new THREE.Group(); g.name = 'kontekst';
  const inSite: CtxBld[] = [], blds: CtxBld[] = [];
  const R = b.radius, L = cs.layers;
  const C0 = fr.toLocal(b.center);
  const clip = (pts: XY[]) => pts.some(p => Math.abs(p[0] - C0[0]) < R * 1.05 && Math.abs(p[1] - C0[1]) < R * 1.05);
  /** chiziqlarni kontekst kvadratiga qirqish (yer chegarasidan tashqariga chiqmasin) */
  const cut = (ls: { pts: XY[]; w: number }[]) => ls.flatMap(l => clipLine(l.pts, C0[0] - R, C0[1] - R, C0[0] + R, C0[1] + R).map(pts => ({ pts, w: l.w })));

  // yer: relyef toʻri (+ sunʼiy yoʻldosh UV)
  const seg = Math.min(160, Math.max(40, Math.round(2 * R / 10)));
  const geo = new THREE.PlaneGeometry(2 * R, 2 * R, seg, seg); geo.rotateX(-Math.PI / 2); geo.translate(C0[0], 0, -C0[1]);
  const P = geo.attributes.position as THREE.BufferAttribute, uv = geo.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i), y = -P.getZ(i);
    P.setY(i, H(x, y));
    if (b.imagery) { const [u, v] = imageryUV(b.imagery, fr.toGeo([x, y])); uv.setXY(i, u, v); }
  }
  geo.computeVertexNormals();
  const sat = cs.base === 'sputnik' && imageTex;
  const groundMat = sat ? new THREE.MeshLambertMaterial({ map: imageTex }) : new THREE.MeshLambertMaterial({ color: CC.ground });
  // sunʼiy yoʻldosh tasviri biroz xira va ochroq: model (binolar, koʻchalar) oldinga chiqsin
  if (sat) groundMat.onBeforeCompile = satTint;
  const ground = new THREE.Mesh(geo, groundMat); ground.name = 'relyef'; ground.receiveShadow = true; ground.renderOrder = 0;
  g.add(ground);
  // atrof chegarasi (chegara boʻyicha yuklanganda): uzuq chiziq
  if (cs.area && cs.area.length >= 3) {
    const pts: THREE.Vector3[] = [];
    const loc = cs.area.map(fr.toLocal);
    for (let i = 0; i <= loc.length; i++) {
      const a = loc[i % loc.length], b = loc[(i + 1) % loc.length], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 25));
      if (i === loc.length) break;
      for (let k = 0; k < n; k++) { const x = a[0] + (b[0] - a[0]) * k / n, y = a[1] + (b[1] - a[1]) * k / n; pts.push(new THREE.Vector3(x, H(x, y) + 1.2, -y)); }
    }
    pts.push(pts[0].clone());
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineDashedMaterial({ color: 0xe0281e, dashSize: 18, gapSize: 7, depthTest: false }));
    line.computeLineDistances(); line.renderOrder = 60; line.name = 'atrof chegarasi'; g.add(line);
  }

  // yashil va suv (sunʼiy yoʻldoshda — tasvirning oʻzi koʻrsatadi)
  if (!sat && L.green) {
    const kinds: [RegExp, number][] = [[/forest|wood|orchard|vineyard|scrub/, CC.forest], [/pitch|golf/, CC.pitch], [/.*/, CC.green]];
    const used = new Set<number>();
    kinds.forEach(([re, col], k) => {
      const polys = b.osm.green.filter((a, i) => !used.has(i) && re.test(a.kind) && (used.add(i), true)).map(a => a.rings.map(r => r.map(fr.toLocal))).filter(r => clip(r[0]));
      const fg = fillGeo(polys, H); if (fg) g.add(overlay(fg, flatMat(col, 1), 1 + k * 0.01, 'yashil'));
    });
  }
  if (L.water) {
    const wc = sat ? CC.waterSat : CC.water;
    const fg = fillGeo(b.osm.water.map(a => a.rings.map(r => r.map(fr.toLocal))).filter(r => clip(r[0])), H);
    if (fg) g.add(overlay(fg, flatMat(wc, 2), 2, 'suv'));
    // kanal va ariqlar: trotuar ustida, asfaltdan pastda (Toshkentda ariqlar koʻpincha koʻcha boʻyida oqadi)
    const wg = ribbonGeo(cut(b.osm.waterways.map(w => ({ pts: w.pts.map(fr.toLocal), w: Math.max(1.6, w.w) }))), H, 0.095);
    if (wg) g.add(overlay(wg, flatMat(wc, 3.07), 3.07, 'ariqlar'));
  }
  // koʻchalar: trotuar → asfalt → chiziqlar (sunʼiy yoʻldosh ustida ham toʻliq koʻrinadi)
  const shownRoads: StreetIn[] = [];
  if (L.roads) {
    const sts: StreetIn[] = b.osm.roads.filter(r => !skipRoads.has(r.id)).flatMap(r => clipLine(r.pts.map(fr.toLocal), C0[0] - R, C0[1] - R, C0[0] + R, C0[1] + R)
      .map(pts => ({ pts, cls: r.cls, w: r.w, lanes: r.lanes, oneway: r.oneway })));
    shownRoads.push(...sts);
    const sg = streetsGeo(sts, H);
    const add = (arr: number[], col: number, ord: number, name: string) => { if (!arr.length) return; const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3)); g.add(overlay(geo, flatMat(col, ord), ord, name)); };
    add(sg.foot, CC.foot, 3, 'yoʻlaklar'); add(sg.sidewalk, CC.sidewalk, 3.05, 'trotuarlar');
    add(sg.asphalt, CC.asphalt, 3.1, 'yoʻllar'); add(sg.major, CC.asphaltMajor, 3.15, 'yoʻllar'); add(sg.marks, CC.mark, 3.3, 'chiziqlar');
  }
  if (L.rail) {
    const rg = ribbonGeo(cut(b.osm.rails.map(r => ({ pts: r.pts.map(fr.toLocal), w: r.w }))), H);
    if (rg) g.add(overlay(rg, flatMat(CC.rail, 3.5), 3.5, 'temir yoʻl'));
  }
  // binolar
  if (L.buildings) {
    const all = b.osm.buildings.map(x => ({ id: x.id, rings: x.rings.map(r => r.map(fr.toLocal)), h: x.h, kind: x.kind })).filter(x => clip(x.rings[0]) && !removed.has(x.id));
    // uchastka ichidagilar (markazi boʻyicha) — alohida: saqlash/buzish qarori loyihada
    const cen = (r: XY[]): XY => { let x = 0, y = 0; r.forEach(p => { x += p[0]; y += p[1]; }); return [x / r.length, y / r.length]; };
    const bl = site ? all.filter(x => !pip(cen(x.rings[0]), site)) : all;
    if (site) inSite.push(...all.filter(x => pip(cen(x.rings[0]), site)));
    blds.push(...bl);
    const bg = buildingsGeo(bl, H);
    if (bg) {
      const m = new THREE.Mesh(bg.mesh, new THREE.MeshLambertMaterial({ color: CC.bld })); m.name = 'binolar'; m.castShadow = m.receiveShadow = true; m.renderOrder = 10;
      const e = new THREE.LineSegments(bg.edges, new THREE.LineBasicMaterial({ color: CC.bldEdge, transparent: true, opacity: 0.35 })); e.renderOrder = 11;
      g.add(m, e);
      if (bg.roof) { const rm = new THREE.Mesh(bg.roof, new THREE.MeshLambertMaterial({ color: CC.roof, side: THREE.DoubleSide })); rm.name = 'tomlar'; rm.castShadow = rm.receiveShadow = true; rm.renderOrder = 10; g.add(rm); }
    }
  }
  // daraxtlar
  if (L.trees) {
    const bldRings = L.buildings ? b.osm.buildings.map(x => x.rings[0].map(fr.toLocal)) : [];
    // bino ichiga tushmasin: oddiy katak indeks
    const cell = 25, idx = new Map<string, XY[][]>();
    bldRings.forEach(r => { const c = r[0]; const k = `${Math.floor(c[0] / cell)},${Math.floor(c[1] / cell)}`; (idx.get(k) || idx.set(k, []).get(k)!).push(r); });
    const avoid = (p: XY) => { const cx = Math.floor(p[0] / cell), cy = Math.floor(p[1] / cell); for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) for (const r of idx.get(`${cx + i},${cy + j}`) || []) if (pip(p, r)) return true; return false; };
    const pts = treePositions(b, fr, R, avoid);
    if (pts.length) {
      const crown = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshLambertMaterial({ color: CC.crown }), pts.length);
      const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.18, 0.25, 1, 5), new THREE.MeshLambertMaterial({ color: CC.trunk }), pts.length);
      const m4 = new THREE.Matrix4(), rnd = rng(7);
      pts.forEach((p, i) => {
        const s = 2.2 + rnd() * 1.6, h = 3 + rnd() * 2.5, y = H(p[0], p[1]);
        m4.compose(new THREE.Vector3(p[0], y + h + s * 0.6, -p[1]), new THREE.Quaternion(), new THREE.Vector3(s, s * 1.05, s)); crown.setMatrixAt(i, m4);
        m4.compose(new THREE.Vector3(p[0], y + h / 2 + 0.3, -p[1]), new THREE.Quaternion(), new THREE.Vector3(1, h + 0.6, 1)); trunk.setMatrixAt(i, m4);
      });
      crown.castShadow = true; crown.name = 'daraxtlar'; crown.renderOrder = 12; trunk.renderOrder = 12;
      crown.userData.pts = pts; crown.userData.trunk = trunk;
      crown.userData.m0 = Float32Array.from(crown.instanceMatrix.array); trunk.userData.m0 = Float32Array.from(trunk.instanceMatrix.array);
      g.add(crown, trunk);
    }
  }
  return {
    group: g, ground, inSite, blds, roads: shownRoads,
    /** Loyiha uchastkasi ichidagi kontekst daraxtlarini yashirish (uchastka loyihalanadi) */
    maskTrees(ring) {
      const crown = g.getObjectByName('daraxtlar') as THREE.InstancedMesh | undefined; if (!crown) return;
      const trunk = crown.userData.trunk as THREE.InstancedMesh, pts = crown.userData.pts as XY[];
      const a = crown.instanceMatrix.array as Float32Array, b = trunk.instanceMatrix.array as Float32Array;
      a.set(crown.userData.m0); b.set(trunk.userData.m0);
      if (ring && ring.length > 2) pts.forEach((p, i) => { if (pip(p, ring)) { a.fill(0, i * 16, i * 16 + 16); b.fill(0, i * 16, i * 16 + 16); } });
      crown.instanceMatrix.needsUpdate = trunk.instanceMatrix.needsUpdate = true;
    },
    dispose() {
      g.traverse(o => { const m = o as THREE.Mesh; m.geometry?.dispose(); const mt = m.material as THREE.Material | THREE.Material[] | undefined; (Array.isArray(mt) ? mt : mt ? [mt] : []).forEach(x => x.dispose()); });
    },
  };
}
