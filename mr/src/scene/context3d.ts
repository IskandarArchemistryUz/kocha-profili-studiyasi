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

export const CC = {
  ground: 0xe9e6df, bld: 0xffffff, bldEdge: 0x8f8a80, road: 0x9a9893, roadMajor: 0x84827d, foot: 0xd9d3c7,
  rail: 0x6e6158, water: 0x9cc3df, green: 0xc5dca8, forest: 0xa9c98c, pitch: 0xb6d69a, crown: 0x7fa65a, trunk: 0x7a6650,
};

export type HeightFn = (x: number, y: number) => number;

const MAJOR = new Set(['motorway', 'trunk', 'primary', 'secondary', 'motorway_link', 'trunk_link', 'primary_link']);
const FOOT = new Set(['footway', 'path', 'cycleway', 'steps', 'pedestrian', 'track', 'bridleway', 'corridor']);

/** Overlay material: relyef ustida, chuqurlik testisiz, tartib boʻyicha chiziladi */
function flatMat(color: number, order: number): THREE.MeshBasicMaterial {
  const m = new THREE.MeshBasicMaterial({ color, depthTest: false, depthWrite: false, side: THREE.DoubleSide });
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
function buildingsGeo(list: { rings: XY[][]; h: number }[], H: HeightFn): { mesh: THREE.BufferGeometry; edges: THREE.BufferGeometry } | null {
  const pos: number[] = [], nor: number[] = [], ed: number[] = [];
  for (const b of list) {
    const outer = b.rings[0]; if (!outer || outer.length < 3) continue;
    let base = Infinity; for (const p of outer) base = Math.min(base, H(p[0], p[1]));
    const top = base + b.h;
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
  if (!pos.length) return null;
  const mesh = new THREE.BufferGeometry();
  mesh.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); mesh.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  const edges = new THREE.BufferGeometry(); edges.setAttribute('position', new THREE.Float32BufferAttribute(ed, 3));
  return { mesh, edges };
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
  const out: XY[] = b.osm.trees.map(fr.toLocal);
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

export interface ContextScene { group: THREE.Group; ground: THREE.Mesh; dispose(): void; maskTrees(ring: XY[] | null): void }

/** Butun kontekst sahnasini qurish */
export function buildContext(b: ContextBundle, fr: Frame, cs: ContextSettings, H: HeightFn, imageTex: THREE.Texture | null): ContextScene {
  const g = new THREE.Group(); g.name = 'kontekst';
  const R = b.radius, L = cs.layers;
  const clip = (pts: XY[]) => pts.some(p => Math.abs(p[0]) < R * 1.05 && Math.abs(p[1]) < R * 1.05);

  // yer: relyef toʻri (+ sunʼiy yoʻldosh UV)
  const seg = Math.min(160, Math.max(40, Math.round(2 * R / 10)));
  const geo = new THREE.PlaneGeometry(2 * R, 2 * R, seg, seg); geo.rotateX(-Math.PI / 2);
  const P = geo.attributes.position as THREE.BufferAttribute, uv = geo.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i), y = -P.getZ(i);
    P.setY(i, H(x, y));
    if (b.imagery) { const [u, v] = imageryUV(b.imagery, fr.toGeo([x, y])); uv.setXY(i, u, v); }
  }
  geo.computeVertexNormals();
  const sat = cs.base === 'sputnik' && imageTex;
  const groundMat = sat ? new THREE.MeshLambertMaterial({ map: imageTex }) : new THREE.MeshLambertMaterial({ color: CC.ground });
  const ground = new THREE.Mesh(geo, groundMat); ground.name = 'relyef'; ground.receiveShadow = true; ground.renderOrder = 0;
  g.add(ground);

  // yashil va suv (sunʼiy yoʻldoshda — tasvirning oʻzi koʻrsatadi)
  if (!sat && L.green) {
    const kinds: [RegExp, number][] = [[/forest|wood|orchard|vineyard|scrub/, CC.forest], [/pitch|golf/, CC.pitch], [/.*/, CC.green]];
    const used = new Set<number>();
    kinds.forEach(([re, col], k) => {
      const polys = b.osm.green.filter((a, i) => !used.has(i) && re.test(a.kind) && (used.add(i), true)).map(a => a.rings.map(r => r.map(fr.toLocal))).filter(r => clip(r[0]));
      const fg = fillGeo(polys, H); if (fg) g.add(overlay(fg, flatMat(col, 1), 1 + k * 0.01, 'yashil'));
    });
  }
  if (!sat && L.water) {
    const fg = fillGeo(b.osm.water.map(a => a.rings.map(r => r.map(fr.toLocal))).filter(r => clip(r[0])), H);
    if (fg) g.add(overlay(fg, flatMat(CC.water, 2), 2, 'suv'));
    const wg = ribbonGeo(b.osm.waterways.filter(w => !/river|canal/.test(w.cls) || !b.osm.water.length).map(w => ({ pts: w.pts.map(fr.toLocal), w: w.w })).filter(l => clip(l.pts)), H);
    if (wg) g.add(overlay(wg, flatMat(CC.water, 2), 2.01, 'suv'));
  }
  // yoʻllar: avval piyoda, keyin oddiy, keyin magistral (ustma-ust tartib)
  if (L.roads) {
    const groups: [(c: string) => boolean, number, number][] = [[c => FOOT.has(c), CC.foot, 3], [c => !FOOT.has(c) && !MAJOR.has(c), CC.road, 3.1], [c => MAJOR.has(c), CC.roadMajor, 3.2]];
    for (const [f, col, ord] of groups) {
      const rg = ribbonGeo(b.osm.roads.filter(r => f(r.cls)).map(r => ({ pts: r.pts.map(fr.toLocal), w: r.w })).filter(l => clip(l.pts)), H);
      if (rg) { const m = flatMat(col, ord); if (sat) { m.transparent = true; m.opacity = 0.55; } g.add(overlay(rg, m, ord, 'yoʻllar')); }
    }
  }
  if (L.rail) {
    const rg = ribbonGeo(b.osm.rails.map(r => ({ pts: r.pts.map(fr.toLocal), w: r.w })).filter(l => clip(l.pts)), H);
    if (rg) g.add(overlay(rg, flatMat(CC.rail, 3.5), 3.5, 'temir yoʻl'));
  }
  // binolar
  if (L.buildings) {
    const bl = b.osm.buildings.map(x => ({ rings: x.rings.map(r => r.map(fr.toLocal)), h: x.h })).filter(x => clip(x.rings[0]));
    const bg = buildingsGeo(bl, H);
    if (bg) {
      const m = new THREE.Mesh(bg.mesh, new THREE.MeshLambertMaterial({ color: CC.bld })); m.name = 'binolar'; m.castShadow = m.receiveShadow = true; m.renderOrder = 10;
      const e = new THREE.LineSegments(bg.edges, new THREE.LineBasicMaterial({ color: CC.bldEdge, transparent: true, opacity: 0.35 })); e.renderOrder = 11;
      g.add(m, e);
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
    group: g, ground,
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
