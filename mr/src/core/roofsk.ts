/**
 * Qiya tom «straight skeleton» boʻyicha: barcha nishablar bir xil — tashqi burchakdan qovurgʻa (val'ma, 45° tarhda),
 * ichki burchakdan ichki burchak chizigʻi (endova), ular tizmada uchrashadi. L, T, U, xoch va teshikli (hovlili) shakl
 * bitta yaxlit tom boʻladi — boʻlaklarga boʻlinmaydi.
 *  - toʻrt nishabli: skelet yuzalari oʻzi;
 *  - ikki nishabli: qanot uchlaridagi uchburchak qiyaliklar tik frontonga aylanadi (choʻqqi nuqtasi uch qirrasi ustiga suriladi),
 *    ichki burchakdagi qoʻshilish saqlanadi.
 * Skelet: straight-skeleton (MIT, Felkel–Obdržálek usulining C# portidan).
 */
import { SkeletonBuilder } from 'straight-skeleton';
import polygonClipping, { type MultiPolygon, type Polygon } from 'polygon-clipping';
import { ShapeUtils, Vector2 } from 'three';
import { signedArea, type XY } from './geo';

export interface SkRoof { tris: number[]; walls: number[]; h: number }
/** Tom yuzasi (3D, tekis): tarhdagi koʻpburchak va har uchi balandligi; wall — tik (fronton) */
interface Face { pts: XY[]; z: number[]; wall: boolean }

const ccw = (r: XY[]) => (signedArea(r) < 0 ? r.slice().reverse() : r.slice());
const key = (p: XY) => `${p[0].toFixed(4)},${p[1].toFixed(4)}`;

/** Skelet yuzalari (rings[0] — tashqi, qolgani — teshiklar), z — masofa (m). Xato yoki buzilgan natija — null */
function skeletonFaces(rings: XY[][]): { faces: { edge: [XY, XY]; pts: XY[] }[]; dist: Map<string, number> } | null {
  const outer = ccw(rings[0]), holes = rings.slice(1).map(h => (signedArea(h) > 0 ? h.slice().reverse() : h.slice()));
  let sk;
  try { sk = SkeletonBuilder.BuildFromGeoJSON([[outer.map(p => [p[0], p[1]]), ...holes.map(h => h.map(p => [p[0], p[1]]))]] as never); } catch { return null; }
  const dist = new Map<string, number>();
  for (const [p, d] of sk.Distances) dist.set(key([p.X, p.Y]), d);
  const faces: { edge: [XY, XY]; pts: XY[] }[] = [];
  for (const e of sk.Edges) {
    const pts = (e.Polygon as unknown as { X: number; Y: number }[]).map(v => [v.X, v.Y] as XY);
    if (pts.length < 3 || pts.some(p => !Number.isFinite(p[0]) || !Number.isFinite(p[1]))) return null;
    const b = e.Edge as unknown as { Begin: { X: number; Y: number }; End: { X: number; Y: number } };
    faces.push({ edge: [[b.Begin.X, b.Begin.Y], [b.End.X, b.End.Y]], pts });
  }
  return faces.length ? { faces, dist } : null;
}

/**
 * Skelet tom: rings[0] — tashqi kontur, qolgani — teshiklar (hovli). maxRise — tizmaning eng katta balandligi (keng binoda nishab yassilanadi).
 */
export function skeletonRoof(rings: XY[][], kind: 'ikki' | 'tort', pitchDeg = 30, maxRise = 6): SkRoof | null {
  return facesToRoof(skeletonRoofFaces(rings, kind, pitchDeg, maxRise));
}

function skeletonRoofFaces(rings: XY[][], kind: 'ikki' | 'tort', pitchDeg: number, maxRise: number): { faces: Face[]; h: number } | null {
  const S = skeletonFaces(rings); if (!S) return null;
  const { faces, dist } = S;
  let dmax = 0; for (const d of dist.values()) dmax = Math.max(dmax, d);
  if (!(dmax > 0.05)) return null;
  const t = Math.min(Math.tan(pitchDeg * Math.PI / 180), maxRise / dmax);
  const Z = (p: XY) => (dist.get(key(p)) ?? 0) * t;
  // ikki nishabli: qanot uchi (uchburchak yuza, qoʻshni qirralar ~tik) — choʻqqisi qirra ustiga suriladi
  const moved = new Map<string, XY>(), gable = new Set<number>();
  if (kind === 'ikki') {
    const outer = ccw(rings[0]), n = outer.length;
    const angleOk = (i: number) => {   // i-qirraga qoʻshni ikkala qirra 90° ± 15° burchakda va uchlar qavariq
      const a = outer[(i - 1 + n) % n], b = outer[i], c = outer[(i + 1) % n], d = outer[(i + 2) % n];
      const u = (p: XY, q: XY): XY => { const L = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1; return [(q[0] - p[0]) / L, (q[1] - p[1]) / L]; };
      const e0 = u(a, b), e1 = u(b, c), e2 = u(c, d), cr = (x: XY, y: XY) => x[0] * y[1] - x[1] * y[0];
      return cr(e0, e1) > 0 && cr(e1, e2) > 0 && Math.abs(e0[0] * e1[0] + e0[1] * e1[1]) < 0.26 && Math.abs(e1[0] * e2[0] + e1[1] * e2[1]) < 0.26;
    };
    const edgeIdx = (f: { edge: [XY, XY] }) => outer.findIndex((p, i) => key(p) === key(f.edge[0]) && key(outer[(i + 1) % n]) === key(f.edge[1]));
    const usedApex = new Set<string>();
    // qisqa qirralar birinchi — uzun qirra uch boʻlib qolmasin (kvadratda bitta juftlik)
    const order = faces.map((_, i) => i).sort((a, b) => Math.hypot(faces[a].edge[1][0] - faces[a].edge[0][0], faces[a].edge[1][1] - faces[a].edge[0][1]) - Math.hypot(faces[b].edge[1][0] - faces[b].edge[0][0], faces[b].edge[1][1] - faces[b].edge[0][1]));
    for (const fi of order) {
      const f = faces[fi]; if (f.pts.length !== 3) continue;
      const i = edgeIdx(f); if (i < 0 || !angleOk(i)) continue;
      const apex = f.pts.find(p => key(p) !== key(f.edge[0]) && key(p) !== key(f.edge[1])); if (!apex) continue;
      const k = key(apex); if (usedApex.has(k)) continue;
      // choʻqqi boshqa uch-yuzaning ham choʻqqisi boʻlsa (kvadrat, piramida) — frontonga aylantirilmaydi
      if (faces.some((g, gi) => gi !== fi && g.pts.length === 3 && gable.has(gi) && g.pts.some(p => key(p) === k))) continue;
      const [a, b] = f.edge, dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1, s = ((apex[0] - a[0]) * dx + (apex[1] - a[1]) * dy) / L2;
      if (s < 0.05 || s > 0.95) continue;
      moved.set(k, [a[0] + dx * s, a[1] + dy * s]); usedApex.add(k); gable.add(fi);
    }
  }
  const P = (p: XY): XY => moved.get(key(p)) ?? p;
  const out: Face[] = faces.map((f, fi) => ({ pts: f.pts.map(P), z: f.pts.map(Z), wall: gable.has(fi) }));
  return { faces: out, h: dmax * t };
}

/** Yuzalarni uchburchaklarga (tekis koʻpburchak — tarhda triangulyatsiya, balandlik uchlardan) */
function facesToRoof(F: { faces: Face[]; h: number } | null): SkRoof | null {
  if (!F) return null;
  const tris: number[] = [], walls: number[] = [];
  for (const f of F.faces) {
    const o = f.wall ? walls : tris;
    if (f.wall) {   // tik uchburchak: tarhda nol yuza — toʻgʻridan-toʻgʻri
      for (let i = 1; i < f.pts.length - 1; i++) for (const k of [0, i, i + 1]) o.push(f.pts[k][0], f.pts[k][1], f.z[k]);
      continue;
    }
    triangulate(f.pts, f.z, o);
  }
  return tris.length ? { tris, walls, h: F.h } : null;
}

function triangulate(pts: XY[], z: number[], o: number[]): void {
  // takroriy uchlarni olib tashlash
  const P: XY[] = [], Z: number[] = [];
  pts.forEach((p, i) => { if (!P.length || Math.hypot(p[0] - P[P.length - 1][0], p[1] - P[P.length - 1][1]) > 1e-6) { P.push(p); Z.push(z[i]); } });
  if (P.length > 3 && Math.hypot(P[0][0] - P[P.length - 1][0], P[0][1] - P[P.length - 1][1]) < 1e-6) { P.pop(); Z.pop(); }
  if (P.length < 3) return;
  const idx = ShapeUtils.triangulateShape(P.map(p => new Vector2(p[0], p[1])), []);
  for (const tr of idx) {
    const [a, b, c] = tr, ar = (P[b][0] - P[a][0]) * (P[c][1] - P[a][1]) - (P[b][1] - P[a][1]) * (P[c][0] - P[a][0]);
    if (Math.abs(ar) < 1e-8) continue;
    for (const k of [a, b, c]) o.push(P[k][0], P[k][1], Z[k]);
  }
}

/**
 * Tutash binolar guruhi uchun yaxlit tom: konturlar birlashtiriladi, skelet tom quriladi va har bino uchun
 * faqat uning dogʻiga tushgan qismi qaytariladi (balandlik — yuza tekisligidan). Fronton — asosi shu bino qirrasida boʻlsa.
 * Natija: har dogʻ uchun tom yoki null (birlashtirish yoki skelet ishlamasa — chaqiruvchi alohida tom quradi).
 */
export function groupRoof(rings: XY[][], kind: 'ikki' | 'tort', pitchDeg = 30, maxRise = 6): (SkRoof | null)[] | null {
  const cl = (r: XY[]): [number, number][] => [...r, r[0]].map(p => [p[0], p[1]]);
  let U: MultiPolygon;
  try { U = polygonClipping.union(...rings.map(r => [cl(ccw(r))] as Polygon) as [Polygon, ...Polygon[]]); } catch { return null; }
  if (U.length !== 1) return null;
  const urings = U[0].map(r => simplifyRing(r.slice(0, -1).map(q => [q[0], q[1]] as XY)));
  const F = skeletonRoofFaces(urings, kind, pitchDeg, maxRise); if (!F) return null;
  return rings.map(r => {
    const rr = ccw(r), tris: number[] = [], walls: number[] = [];
    for (const f of F.faces) {
      if (f.wall) {   // fronton asosi (ikki z=0 uchi) shu dogʻ qirrasida boʻlsa
        const base = f.pts.filter((_, i) => f.z[i] < 1e-6); if (base.length < 2) continue;
        const m: XY = [(base[0][0] + base[1][0]) / 2, (base[0][1] + base[1][1]) / 2];
        if (!onBoundary(m, rr)) continue;
        for (let i = 1; i < f.pts.length - 1; i++) for (const k of [0, i, i + 1]) walls.push(f.pts[k][0], f.pts[k][1], f.z[k]);
        continue;
      }
      const pl = plane(f.pts, f.z); if (!pl) continue;
      let parts: MultiPolygon = [];
      try { parts = polygonClipping.intersection([cl(ccw(f.pts))], [cl(rr)]); } catch { continue; }
      for (const pp of parts) {
        const q = pp[0].slice(0, -1).map(v => [v[0], v[1]] as XY);
        if (Math.abs(signedArea(q)) < 0.01) continue;
        triangulate(q, q.map(p => Math.max(0, pl[0] * p[0] + pl[1] * p[1] + pl[2])), tris);
      }
    }
    return tris.length ? { tris, walls, h: F.h } : null;
  });
}

/** z = a·x + b·y + c (eng katta uchburchak orqali) */
function plane(p: XY[], z: number[]): [number, number, number] | null {
  let best: [number, number, number] | null = null, ba = 1e-6;
  for (let i = 0; i < p.length; i++) for (let j = i + 1; j < p.length; j++) for (let k = j + 1; k < p.length; k++) {
    const d = (p[j][0] - p[i][0]) * (p[k][1] - p[i][1]) - (p[j][1] - p[i][1]) * (p[k][0] - p[i][0]);
    if (Math.abs(d) <= ba) continue;
    const a = ((z[j] - z[i]) * (p[k][1] - p[i][1]) - (z[k] - z[i]) * (p[j][1] - p[i][1])) / d;
    const b = ((z[k] - z[i]) * (p[j][0] - p[i][0]) - (z[j] - z[i]) * (p[k][0] - p[i][0])) / d;
    best = [a, b, z[i] - a * p[i][0] - b * p[i][1]]; ba = Math.abs(d);
    if (p.length > 6) return best;
  }
  return best;
}

function onBoundary(m: XY, r: XY[]): boolean {
  for (let i = 0; i < r.length; i++) {
    const a = r[i], b = r[(i + 1) % r.length], dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((m[0] - a[0]) * dx + (m[1] - a[1]) * dy) / L2));
    if (Math.hypot(a[0] + dx * t - m[0], a[1] + dy * t - m[1]) < 0.05) return true;
  }
  return false;
}

/** bir chiziqdagi va juda yaqin uchlarni olib tashlash (birlashtirishdan keyin) */
function simplifyRing(r0: XY[]): XY[] {
  let r = r0.slice();
  for (let g = 0; g < 200 && r.length > 3; g++) {
    let ch = false;
    for (let k = 0; k < r.length; k++) {
      const a = r[(k - 1 + r.length) % r.length], b = r[k], c = r[(k + 1) % r.length];
      const cr = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]), L = Math.hypot(c[0] - a[0], c[1] - a[1]) || 1;
      if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 0.05 || Math.abs(cr) / L < 0.02) { r.splice(k, 1); ch = true; break; }
    }
    if (!ch) break;
  }
  return r;
}

/** Umumiy devor uzunligi (parallel, ≤ 0,3 m oraliqdagi qirralar ustma-ust qismi), m */
export function sharedLen(a: XY[], b: XY[]): number {
  let tot = 0;
  for (let i = 0; i < a.length; i++) {
    const p = a[i], q = a[(i + 1) % a.length], dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy); if (L < 0.1) continue;
    const ux = dx / L, uy = dy / L;
    for (let j = 0; j < b.length; j++) {
      const r = b[j], s = b[(j + 1) % b.length], ex = s[0] - r[0], ey = s[1] - r[1], M = Math.hypot(ex, ey); if (M < 0.1) continue;
      if (Math.abs(ux * ey / M - uy * ex / M) > 0.02) continue;
      if (Math.abs((r[0] - p[0]) * uy - (r[1] - p[1]) * ux) > 0.3) continue;
      const t0 = (r[0] - p[0]) * ux + (r[1] - p[1]) * uy, t1 = (s[0] - p[0]) * ux + (s[1] - p[1]) * uy;
      tot += Math.max(0, Math.min(L, Math.max(t0, t1)) - Math.max(0, Math.min(t0, t1)));
    }
  }
  return tot;
}

/**
 * Tutash binolar (umumiy devor ≥ 1 m, bir xil balandlik va tom turi — key) guruhlarga boʻlinadi; ≥ 2 binoli guruhga
 * yaxlit tom quriladi va har bino oʻz qismini oladi. Natijada faqat guruhdagi binolar boʻladi.
 */
export function roofGroups(items: { id: string; ring: XY[]; kind: 'ikki' | 'tort'; key: string }[], maxRise = 6): Map<string, SkRoof> {
  const out = new Map<string, SkRoof>(), n = items.length, par = items.map((_, i) => i);
  const find = (i: number): number => (par[i] === i ? i : (par[i] = find(par[i])));
  const bb = items.map(it => { let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity; for (const p of it.ring) { a = Math.min(a, p[0]); b = Math.min(b, p[1]); c = Math.max(c, p[0]); d = Math.max(d, p[1]); } return [a, b, c, d]; });
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    if (items[i].key !== items[j].key || items[i].kind !== items[j].kind) continue;
    const A = bb[i], B = bb[j]; if (A[2] < B[0] - 0.5 || B[2] < A[0] - 0.5 || A[3] < B[1] - 0.5 || B[3] < A[1] - 0.5) continue;
    if (sharedLen(items[i].ring, items[j].ring) >= 1) par[find(i)] = find(j);
  }
  const G = new Map<number, number[]>(); for (let i = 0; i < n; i++) { const r = find(i); G.set(r, [...(G.get(r) ?? []), i]); }
  for (const g of G.values()) {
    if (g.length < 2) continue;
    const res = groupRoof(g.map(i => items[i].ring), items[g[0]].kind, 30, maxRise); if (!res) continue;
    g.forEach((i, k) => { const r = res[k]; if (r) out.set(items[i].id, r); });
  }
  return out;
}
