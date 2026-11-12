/**
 * Koʻcha kesimi A–A (12.11, eski navbat 4-band, egasi maketni maʼqulladi): koʻcha oʻqiga perpendikulyar chiziq.
 * Hujjatda: koʻcha id si va oʻq boshidan masofa (t, m) — koʻcha surilsa yoki profili oʻzgarsa kesim oʻzi yangilanadi.
 * Kesim: profil qismlari (Koʻchasozdan qoʻllangan boʻlsa — aynan shu), ikki tomondagi eng yaqin loyiha binosi (masofa, balandlik).
 * Chizma yoʻnalishi: profil qismlari chapdan oʻngga (parts[0] — chapda), koʻruvchi oʻq yoʻnalishiga qarama-qarshi qaraydi.
 */
import type { Project, StreetCut } from './doc';
import { frame } from './geo';
import { profileById, profileWidth, type Profile } from './profiles';
import { bLevels } from './levels';

type XY = [number, number];
export interface CutSide { dist: number; depth: number; floors: number; H: number; id: string }
export interface CutGeom {
  cut: StreetCut; profile: Profile; W: number;
  /** kesim nuqtasi, oʻq yoʻnalishi va chap normal (mahalliy metr) */
  at: XY; dir: XY; n: XY; len: number;
  /** chiziq uchlari: a — chizmaning chap tomoni (−n), b — oʻng (+n) */
  a: XY; b: XY;
  left: CutSide | null; right: CutSide | null;
}

export const CUT_LABELS = 'ABCDEFGHIJKLMNOPRSTUVWXYZ';
export const nextCutLabel = (doc: Project): string => { const used = new Set((doc.cuts ?? []).map(c => c.label)); return [...CUT_LABELS].find(l => !used.has(l)) ?? 'Z'; };

/** Siniq chiziq boʻylab t masofadagi nuqta va yoʻnalish */
export function along(pts: XY[], t: number): { at: XY; dir: XY; len: number } {
  let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  let r = Math.max(0, Math.min(L, t));
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]); if (l < 1e-9) continue;
    if (r <= l || i === pts.length - 1) { const k = Math.min(1, r / l); return { at: [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k], dir: [(b[0] - a[0]) / l, (b[1] - a[1]) / l], len: L }; }
    r -= l;
  }
  return { at: pts[0], dir: [1, 0], len: L };
}

/** Nuqtaning siniq chiziqdagi proyeksiyasi: oʻq boshidan masofa va chiziqqacha masofa */
export function project(pts: XY[], p: XY): { t: number; d: number } {
  let best = { t: 0, d: Infinity }, acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy, l = Math.sqrt(l2);
    const k = l2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2)) : 0;
    const d = Math.hypot(a[0] + dx * k - p[0], a[1] + dy * k - p[1]);
    if (d < best.d) best = { t: acc + k * l, d };
    acc += l;
  }
  return best;
}

/** Nurning (o + s·u, s > 0) koʻpburchak bilan kesishuvlari — s qiymatlari */
function rayHits(o: XY, u: XY, ring: XY[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < ring.length; i++) {
    const p = ring[i], q = ring[(i + 1) % ring.length], ex = q[0] - p[0], ey = q[1] - p[1];
    const den = u[0] * ey - u[1] * ex; if (Math.abs(den) < 1e-12) continue;
    const wx = p[0] - o[0], wy = p[1] - o[1], s = (wx * ey - wy * ex) / den, r = (wx * u[1] - wy * u[0]) / den;
    if (s > 1e-6 && r >= 0 && r <= 1) out.push(s);
  }
  return out.sort((x, y) => x - y);
}

/** Kesim chizigʻi boʻylab eng yaqin bino (MAX m gacha) */
function sideHit(doc: Project, rings: { id: string; r: XY[] }[], o: XY, u: XY, max: number): CutSide | null {
  let best: CutSide | null = null;
  for (const { id, r } of rings) {
    const s = rayHits(o, u, r); if (!s.length) continue;
    // nur bino ichidan boshlansa (toq son) — chiqish nuqtasi emas, kirish 0
    const inside = s.length % 2 === 1, d0 = inside ? 0 : s[0], d1 = inside ? s[0] : (s[1] ?? s[0]);
    if (d0 > max || (best && d0 >= best.dist)) continue;
    const b = doc.buildings.find(x => x.id === id)!;
    best = { id, dist: d0, depth: Math.max(0.5, d1 - d0), floors: b.floors, H: bLevels(doc.settings, b).top };
  }
  return best;
}

export function cutGeom(doc: Project, cut: StreetCut, max = 60): CutGeom | null {
  const st = doc.streets.find(s => s.id === cut.street); if (!st || st.axis.length < 2) return null;
  const fr = frame(doc.origin), pts = st.axis.map(p => fr.toLocal(p) as XY), p = profileById(st.profile), W = profileWidth(p);
  const { at, dir, len } = along(pts, cut.t), n: XY = [-dir[1], dir[0]], e = W / 2 + 6;
  const rings = doc.buildings.map(b => ({ id: b.id, r: b.footprint.map(q => fr.toLocal(q) as XY) }));
  const L = sideHit(doc, rings, at, [-n[0], -n[1]], max + W / 2), R = sideHit(doc, rings, at, n, max + W / 2);
  const off = (s: CutSide | null) => s && { ...s, dist: Math.max(0, s.dist - W / 2) };
  return { cut, profile: p, W, at, dir, n, len, a: [at[0] - n[0] * e, at[1] - n[1] * e], b: [at[0] + n[0] * e, at[1] + n[1] * e], left: off(L), right: off(R) };
}
