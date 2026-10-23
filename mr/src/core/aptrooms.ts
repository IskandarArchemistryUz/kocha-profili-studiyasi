/**
 * 11-band: kvartira rejasi xonalarga — kvartira halqasidan ichki devorlar (0,12 m) va sanuzel-dahliz zonasi ayiriladi,
 * qolgan boʻlaklar — xonalar. 3D «kvartiralar koʻrinishi»da xonalar rangda chiziladi.
 */
import polygonClipping, { type Polygon, type MultiPolygon } from 'polygon-clipping';
import { area, type XY } from './geo';
import type { RuleApt } from './sectionplan';

const q = (v: number) => Math.round(v * 1000) / 1000;
const close = (r: XY[]): [number, number][] => [...r, r[0]].map(p => [q(p[0]), q(p[1])]);
const open = (r: [number, number][]): XY[] => r.slice(0, -1).map(p => [p[0], p[1]]);

/** Kesma atrofida yupqa toʻrtburchak (devor) */
function slab(a: XY, b: XY, w: number): XY[] {
  const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l * w / 2, ny = dx / l * w / 2, ex = dx / l * 0.02, ey = dy / l * 0.02;
  return [[a[0] - ex + nx, a[1] - ey + ny], [b[0] + ex + nx, b[1] + ey + ny], [b[0] + ex - nx, b[1] + ey - ny], [a[0] - ex - nx, a[1] - ey - ny]];
}

const cache = new WeakMap<RuleApt, { rooms: XY[][]; wet: XY[][] }>();
/** Xonalar (yashash, oshxona va h.k. — boʻlinma devorlar orasidagi boʻlaklar) va hoʻl zona */
export function aptRooms(a: RuleApt): { rooms: XY[][]; wet: XY[][] } {
  const c = cache.get(a); if (c) return c;
  let out: { rooms: XY[][]; wet: XY[][] } = { rooms: [a.ring], wet: [] };
  try {
    const R: Polygon = [close(a.ring)];
    const wet: MultiPolygon = a.wet.length >= 3 ? polygonClipping.intersection([close(a.wet)], R) : [];
    // boʻlinma devori fasaddan ichkariga — kvartira orqa devorigacha uzaytiriladi (xona — fasad moduli boʻylab tasma)
    const walls: Polygon[] = a.walls.filter(([p, r]) => Math.hypot(r[0] - p[0], r[1] - p[1]) > 0.3).map(([p, r]) => [close(slab(p, [p[0] + (r[0] - p[0]) * 2.2, p[1] + (r[1] - p[1]) * 2.2], 0.12))]);
    const cut: MultiPolygon = walls.length || wet.length ? polygonClipping.union(...([...(wet.length ? [wet] : []), ...walls.map(w => [w] as MultiPolygon)] as [MultiPolygon, ...MultiPolygon[]])) : [];
    const rest = cut.length ? polygonClipping.difference(R, cut) : [R];
    const rooms = rest.map(pp => open(pp[0])).filter(r => r.length >= 3 && area(r) > 1);
    const wr = wet.map(pp => open(pp[0])).filter(r => r.length >= 3 && area(r) > 0.3);
    if (rooms.length) out = { rooms, wet: wr };
  } catch { /* geometriya xatosi — butun kvartira bitta xona */ }
  cache.set(a, out); return out;
}
