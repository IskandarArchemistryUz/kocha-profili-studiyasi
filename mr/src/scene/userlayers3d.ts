/**
 * Foydalanuvchi qatlamlari sahnada: binolar — hajm (toifa rangida), chegaralar — kontur va nom,
 * yerdan foydalanish — yarim shaffof toʻldirish, chiziqlar — chiziq. Har toifa — alohida obyekt:
 * yoqish/oʻchirish qayta qurmasdan (visible) ishlaydi; qayta qurish faqat geometriya oʻzgarganda.
 *
 * Ranglar vertex rangi sifatida beriladi (`color` atributi): toifa rangi, alohida obyekt rangi (meta.overrides) va
 * tanlov belgisi geometriyani qayta qurmasdan, faqat shu atributni yangilab qoʻllanadi (12 000 binoda ham tez).
 * Har vertexda `fid` — obyekt indeksi (qatlam roʻyxatidagi oʻrni): sahnada bosib tanlash shu orqali.
 */
import * as THREE from 'three';
import type { Frame, XY } from '../core/geo';
import { centroid, polyArea } from '../core/geo';
import { catOf, featureColor, heightOf, type ULFeature, type UserLayerMeta } from '../core/userlayers';
import { buildingMeshes, type HeightFn } from './context3d';

export interface UL3D {
  group: THREE.Group; byCat: Map<string, THREE.Object3D[]>; fills: THREE.Material[]; labels: THREE.Sprite[];
  /** bosib tanlanadigan sirtlar (`fid` atributli): binolar devori va tomi, toʻldirishlar */
  pickable: THREE.Mesh[];
  /** obyektlar markazi (mahalliy metr) — ramka bilan tanlash uchun; markazsiz (chiziq) obyektlarda NaN */
  centers: Float32Array;
  /** oxirgi qoʻllangan ranglar kaliti (qayta boʻyash kerakmi) */
  paintKey: string;
  dispose(): void;
}
/** toifasiz obyektlar kaliti */
export const NOCAT = '\u0000';
/** tanlangan obyekt rangi (DS: --sel) — asl rang bilan aralashtiriladi */
const SEL = new THREE.Color(0x2a6fb0);

function fill(polys: { fid: number; rings: XY[][] }[], H: HeightFn, lift: number): THREE.BufferGeometry | null {
  const pos: number[] = [], fid: number[] = [];
  for (const { fid: id, rings } of polys) {
    if (!rings.length || rings[0].length < 3) continue;
    const outer = rings[0].map(p => new THREE.Vector2(p[0], p[1])), holes = rings.slice(1).filter(h => h.length >= 3).map(h => h.map(p => new THREE.Vector2(p[0], p[1])));
    let tris: number[][]; try { tris = THREE.ShapeUtils.triangulateShape(outer, holes); } catch { continue; }
    const all = [...outer, ...holes.flat()];
    for (const t of tris) for (const k of t) { const v = all[k]; pos.push(v.x, H(v.x, v.y) + lift, -v.y); fid.push(id); }
  }
  if (!pos.length) return null;
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('fid', new THREE.Int32BufferAttribute(fid, 1)); return g;
}
/** halqalar va chiziqlar → bitta LineSegments geometriyasi (relyef ustida; uzun qirralar 25 m dan boʻlinadi) */
function segs(lines: XY[][], closed: boolean, H: HeightFn, lift: number): THREE.BufferGeometry | null {
  const pos: number[] = [];
  for (const l of lines) {
    const n = closed ? l.length : l.length - 1;
    for (let i = 0; i < n; i++) {
      const a = l[i], b = l[(i + 1) % l.length], k = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 25));
      for (let j = 0; j < k; j++) {
        const p = [a[0] + (b[0] - a[0]) * j / k, a[1] + (b[1] - a[1]) * j / k], q = [a[0] + (b[0] - a[0]) * (j + 1) / k, a[1] + (b[1] - a[1]) * (j + 1) / k];
        pos.push(p[0], H(p[0], p[1]) + lift, -p[1], q[0], H(q[0], q[1]) + lift, -q[1]);
      }
    }
  }
  if (!pos.length) return null;
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); return g;
}
const darker = (c: number, k: number) => { const x = new THREE.Color(c); x.multiplyScalar(k); return x.getHex(); };

/** Bitta qatlamni qurish; label — sahnadagi yorliq yasovchi (ekranda doimiy oʻlchamda). Ranglar keyin paintUserLayer bilan beriladi */
export function buildUserLayer(m: UserLayerMeta, data: ULFeature[], fr: Frame, H: HeightFn, fh: number, label: (t: string) => THREE.Sprite): UL3D {
  const group = new THREE.Group(); group.name = `ul:${m.id}`;
  const byCat = new Map<string, THREE.Object3D[]>(), fills: THREE.Material[] = [], labels: THREE.Sprite[] = [], pickable: THREE.Mesh[] = [];
  const key = (f: ULFeature) => (m.catField ? catOf(f, m)?.v ?? String(f.p[m.catField] ?? '') : NOCAT);
  const colorOf = (k: string) => (m.colorBy === 'toifa' ? m.cats.find(c => c.v === k)?.color : undefined) ?? m.color;
  const groups = new Map<string, number[]>();
  data.forEach((f, i) => { const k = key(f); (groups.get(k) ?? groups.set(k, []).get(k)!).push(i); });
  const put = (k: string, o: THREE.Object3D) => { group.add(o); (byCat.get(k) ?? byCat.set(k, []).get(k)!).push(o); };
  const L = (f: ULFeature) => (f.polys ?? []).map(pg => pg.map(r => r.map(fr.toLocal)));
  const centers = new Float32Array(data.length * 2).fill(NaN);
  data.forEach((f, i) => { const pg = f.polys?.[0]?.[0]; if (pg?.length) { const c = centroid(pg.map(fr.toLocal)); centers[2 * i] = c[0]; centers[2 * i + 1] = c[1]; } });

  for (const [k, idx] of groups) {
    const col = colorOf(k), fs = idx.map(i => data[i]);
    if (m.kind === 'bino') {
      const list = idx.flatMap(i => L(data[i]).map(rings => ({ id: i, rings, h: heightOf(data[i], m, fh), kind: 'ul' })));
      const objs = buildingMeshes(list, H, new THREE.MeshLambertMaterial({ vertexColors: true }), new THREE.MeshLambertMaterial({ vertexColors: true }), new THREE.LineBasicMaterial({ color: darker(col, 0.55), transparent: true, opacity: 0.45 }));
      objs.forEach(o => { o.renderOrder = 10; if (o instanceof THREE.Mesh) { o.castShadow = o.receiveShadow = true; pickable.push(o); } put(k, o); });
    } else if (m.kind === 'yer' || m.kind === 'chegara') {
      const polys = idx.flatMap(i => L(data[i]).map(rings => ({ fid: i, rings }))), g = fill(polys, H, m.kind === 'yer' ? 0.12 : 0.16);
      if (g) {
        const mat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: m.opacity, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -6 });
        const mesh = new THREE.Mesh(g, mat); mesh.renderOrder = m.kind === 'yer' ? 4 : 5; mesh.frustumCulled = false; put(k, mesh); fills.push(mat); pickable.push(mesh);
      }
      const e = segs(polys.flatMap(p => p.rings), true, H, 0.3);
      if (e) { const ln = new THREE.LineSegments(e, new THREE.LineBasicMaterial({ color: m.kind === 'chegara' ? col : darker(col, 0.7), depthTest: m.kind !== 'chegara', transparent: m.kind === 'yer', opacity: m.kind === 'yer' ? 0.6 : 1 })); ln.renderOrder = m.kind === 'chegara' ? 45 : 6; ln.frustumCulled = false; put(k, ln); }
      if (m.labels && m.nameField) for (const f of fs) {
        const nm = String(f.p[m.nameField] ?? '').trim(); if (!nm) continue;
        // eng katta boʻlakning markazi
        const pg = L(f).sort((a, b) => polyArea(b) - polyArea(a))[0]; if (!pg) continue;
        const c = centroid(pg[0]), sp = label(nm); sp.position.set(c[0], H(c[0], c[1]) + 3, -c[1]); sp.center.set(0.5, 0.5); sp.renderOrder = 46; put(k, sp); labels.push(sp);
      }
    } else {
      const g = segs(fs.flatMap(f => (f.lines ?? []).map(l => l.map(fr.toLocal))), false, H, 0.25);
      if (g) { const ln = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: col })); ln.renderOrder = 8; ln.frustumCulled = false; put(k, ln); }
    }
  }
  return {
    group, byCat, fills, labels, pickable, centers, paintKey: '',
    dispose() { group.traverse(o => { const x = o as THREE.Mesh; x.geometry?.dispose(); const mt = x.material as THREE.Material | THREE.Material[] | undefined; (Array.isArray(mt) ? mt : mt ? [mt] : []).forEach(q => { (q as THREE.SpriteMaterial).map?.dispose(); q.dispose(); }); }); },
  };
}

/** Koʻrinish (qayta qurmasdan): qatlam, toifalar, shaffoflik */
export function applyVisibility(u: UL3D, m: UserLayerMeta): void {
  u.group.visible = m.visible;
  const off = new Set(m.cats.filter(c => !c.on).map(c => c.v));
  for (const [k, objs] of u.byCat) for (const o of objs) o.visible = !off.has(k);
  for (const f of u.fills) (f as THREE.MeshBasicMaterial).opacity = m.opacity;
}

/** Ranglar kaliti: toifa ranglari, qatlam rangi, alohida ranglar, tanlov — oʻzgarsa qayta boʻyaladi (qurilmaydi) */
export function paintKey(m: UserLayerMeta, sel: Set<number> | null): string {
  return JSON.stringify([m.colorBy, m.color, m.cats.map(c => [c.v, c.color]), m.overrides ?? 0, sel ? [...sel].sort((a, b) => a - b) : 0]);
}

/**
 * Vertex ranglarini qoʻyish: har obyekt uchun featureColor (alohida rang → toifa → qatlam); tanlanganlar — koʻk bilan aralashgan.
 * `fid` atributi boʻyicha ishlaydi; `color` atributi yoʻq boʻlsa yaratiladi.
 */
export function paintUserLayer(u: UL3D, m: UserLayerMeta, data: ULFeature[], sel: Set<number> | null): void {
  const key = paintKey(m, sel); if (u.paintKey === key) return; u.paintKey = key;
  const cache = new Map<number, [number, number, number]>(), c = new THREE.Color();
  const rgb = (i: number): [number, number, number] => {
    let v = cache.get(i);
    if (!v) {
      const f = data[i]; c.set(f ? featureColor(m, f, i) : m.color);
      if (sel?.has(i)) c.lerp(SEL, 0.55);
      v = [c.r, c.g, c.b]; cache.set(i, v);
    }
    return v;
  };
  for (const mesh of u.pickable) {
    const g = mesh.geometry, fid = g.getAttribute('fid') as THREE.BufferAttribute | undefined; if (!fid) continue;
    let col = g.getAttribute('color') as THREE.BufferAttribute | undefined;
    if (!col || col.count !== fid.count) { col = new THREE.Float32BufferAttribute(new Float32Array(fid.count * 3), 3); g.setAttribute('color', col); }
    const a = col.array as Float32Array, ids = fid.array as Int32Array;
    for (let k = 0; k < ids.length; k++) { const v = rgb(ids[k]); a[3 * k] = v[0]; a[3 * k + 1] = v[1]; a[3 * k + 2] = v[2]; }
    col.needsUpdate = true;
  }
}

/** Qayta qurish kerakmi — shu kalit oʻzgarsa (ranglar kirmaydi: ular paintUserLayer bilan) */
export function geomKey(m: UserLayerMeta): string {
  return JSON.stringify([m.kind, m.catField, m.colorBy, m.color, m.heightField, m.floorsField, m.nameField, m.labels, m.cats.map(c => c.v)]);
}
