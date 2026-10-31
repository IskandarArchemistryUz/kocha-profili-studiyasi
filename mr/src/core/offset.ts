/**
 * Ishonchli ichki ofset (chekinish): halqadan har qirra boʻylab d kenglikdagi tasma va uchlardagi doiralar ayiriladi
 * (polygon-clipping). Oʻtkir burchak, botiq uch va qisqa qirralarda ham ishlaydi — oddiy «miter» ofset bunday shakllarda
 * null qaytarardi va generator «chekinishdan keyin joy qolmadi» derdi.
 * d — hamma qirraga bir xil yoki har qirraga alohida (d[k] — k → k+1 qirra). Natija — eng katta boʻlak (CCW), yoʻq boʻlsa null.
 */
import polygonClipping, { type Polygon } from 'polygon-clipping';
import { signedArea, type XY } from './geo';

const cl = (r: XY[]): [number, number][] => [...r, r[0]].map(p => [p[0], p[1]]);
/** 1 mm toʻrga yaxlitlangan yopiq halqa — polygon-clipping deyarli bir chiziqdagi qirralarda cheksiz siklga tushmasin (audit 31.10) */
const clr = (r: XY[]): [number, number][] => [...r, r[0]].map(p => [Math.round(p[0] * 1000) / 1000, Math.round(p[1] * 1000) / 1000]);

export function insetRobust(ring: XY[], d: number | number[], minArea = 1): XY[] | null {
  const r = signedArea(ring) < 0 ? ring.slice().reverse() : ring.slice(), n = r.length;
  if (n < 3) return null;
  const D = (k: number) => Math.max(0, typeof d === 'number' ? d : (signedArea(ring) < 0 ? d[(n - 2 - k + n) % n] : d[k]) ?? 0);
  const cut: Polygon[] = [];
  for (let k = 0; k < n; k++) {
    const a = r[k], b = r[(k + 1) % n], w = D(k); if (w <= 0) continue;
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy); if (L < 1e-6) continue;
    const nx = -dy / L * w, ny = dx / L * w;
    cut.push([cl([[a[0] - nx, a[1] - ny], [b[0] - nx, b[1] - ny], [b[0] + nx, b[1] + ny], [a[0] + nx, a[1] + ny]])]);
  }
  for (let k = 0; k < n; k++) {   // uch: qoʻshni qirralardan kichigi radiusida 16 burchak
    const w = Math.min(D((k - 1 + n) % n), D(k)); if (w <= 0) continue;
    const c: XY[] = []; for (let j = 0; j < 16; j++) { const t = (j + 0.5) / 16 * Math.PI * 2; c.push([r[k][0] + Math.cos(t) * w, r[k][1] + Math.sin(t) * w]); }
    cut.push([cl(c)]);
  }
  let res;
  try { res = cut.length ? polygonClipping.difference([cl(r)], ...cut) : [[cl(r)]]; } catch { return null; }
  let best: XY[] | null = null, ba = minArea;
  for (const p of res) { const o = p[0].slice(0, -1).map(q => [q[0], q[1]] as XY), a = Math.abs(signedArea(o)); if (a > ba) { ba = a; best = o; } }
  if (!best) return null;
  return signedArea(best) < 0 ? best.reverse() : best;
}

/**
 * Morfologik ochish (31.10): eni w dan tor qismlar (oʻtkir uch, qirqishdan qolgan ingichka oyoq) olib tashlanadi,
 * toʻgʻri burchakli L / toʻrtburchak shakl oʻzgarmaydi. Ichkariga w/2 (insetRobust), keyin qirra tasmalari va
 * uchlardagi qirraga parallel kvadratlar bilan tashqariga w/2, natija asl halqa bilan kesishtiriladi.
 */
export function openRing(ring0: XY[], w: number, minArea = 1): XY[] | null {
  // oʻz-oʻzini kesgan / tikanli halqa (burchak seksiyalarini birlashtirishdan qolgan) — avval tozalanadi
  let ring = despike(ring0);
  try { let ba = 0; for (const p of polygonClipping.union([clr(despike(ring0))])) { const o = p[0].slice(0, -1).map(q => [q[0], q[1]] as XY), a = Math.abs(signedArea(o)); if (a > ba) { ba = a; ring = o; } } } catch { /* asl halqa */ }
  const h = w / 2, inner0 = insetRobust(ring, h, minArea); if (!inner0) return null;
  // ichki halqani soddalashtirish (uchlardagi yoy nuqtalari ≤ 0,3 m): birlashtirish barqaror boʻlsin; koordinatalar 1 mm ga yaxlitlanadi
  const inner = dp(inner0, 0.3).map(p => [Math.round(p[0] * 1000) / 1000, Math.round(p[1] * 1000) / 1000] as XY);
  const n = inner.length, add: Polygon[] = [[clr(inner)]];
  for (let k = 0; k < n; k++) {
    const a = inner[k], b = inner[(k + 1) % n], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy); if (L < 1e-6) continue;
    const ux = dx / L, uy = dy / L, nx = -uy * h, ny = ux * h;
    add.push([clr([[a[0] - nx, a[1] - ny], [b[0] - nx, b[1] - ny], [b[0] + nx, b[1] + ny], [a[0] + nx, a[1] + ny]])]);
    for (const p of [a, b]) add.push([clr([[p[0] + (-ux - uy) * h, p[1] + (-uy + ux) * h], [p[0] + (ux - uy) * h, p[1] + (uy + ux) * h], [p[0] + (ux + uy) * h, p[1] + (uy - ux) * h], [p[0] + (-ux + uy) * h, p[1] + (-uy - ux) * h]])]);
  }
  let res;
  // birlashtirish bittadan (polygon-clipping baʼzan butun toʻplamda xato beradi — xato boʻlakni oʻtkazib yuboramiz)
  let u: ReturnType<typeof polygonClipping.union>;
  try { u = polygonClipping.union(add[0], ...add.slice(1)); } catch { u = [add[0] as [number, number][][]]; for (const a of add.slice(1)) { try { u = polygonClipping.union(u, a); } catch { /* oʻtkazildi */ } } }
  try { res = polygonClipping.intersection(u, [clr(signedArea(ring) < 0 ? ring.slice().reverse() : ring)]); } catch { return null; }
  let best: XY[] | null = null, ba = minArea;
  for (const p of res) { const o = p[0].slice(0, -1).map(q => [q[0], q[1]] as XY), a = Math.abs(signedArea(o)); if (a > ba) { ba = a; best = o; } }
  if (!best) return null;
  // bir chiziqdagi va juda yaqin nuqtalar
  const out: XY[] = [];
  for (let i = 0; i < best.length; i++) { const p = best[(i - 1 + best.length) % best.length], c = best[i], q = best[(i + 1) % best.length]; const cr = (c[0] - p[0]) * (q[1] - c[1]) - (c[1] - p[1]) * (q[0] - c[0]); if (Math.hypot(c[0] - p[0], c[1] - p[1]) < 0.05 || Math.abs(cr) < 0.02 * Math.hypot(c[0] - p[0], c[1] - p[1]) * Math.hypot(q[0] - c[0], q[1] - c[1])) continue; out.push(c); }
  const r2 = despike(out.length >= 3 ? out : best);
  return signedArea(r2) < 0 ? r2.reverse() : r2;
}

/** Douglas–Peucker (yopiq halqa): tol dan kichik ogʻishli nuqtalar olinadi */
function dp(r: XY[], tol: number): XY[] {
  if (r.length <= 4) return r;
  const seg = (p: XY, a: XY, b: XY) => { const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1e-12, t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2)); return Math.hypot(a[0] + dx * t - p[0], a[1] + dy * t - p[1]); };
  const rec = (pts: XY[]): XY[] => { let im = -1, dm = tol; for (let i = 1; i < pts.length - 1; i++) { const d = seg(pts[i], pts[0], pts[pts.length - 1]); if (d > dm) { dm = d; im = i; } } return im < 0 ? [pts[0], pts[pts.length - 1]] : [...rec(pts.slice(0, im + 1)).slice(0, -1), ...rec(pts.slice(im))]; };
  // eng uzoq ikki nuqta boʻyicha ikkiga boʻlib
  let far = 0, fd = -1; for (let i = 1; i < r.length; i++) { const d = Math.hypot(r[i][0] - r[0][0], r[i][1] - r[0][1]); if (d > fd) { fd = d; far = i; } }
  const a = rec(r.slice(0, far + 1)), b = rec([...r.slice(far), r[0]]);
  const out = [...a.slice(0, -1), ...b.slice(0, -1)];
  return out.length >= 3 ? out : r;
}

/** «Tikan»larni olib tashlash: qirra orqaga qaytadigan (burchak < 20°) yoki 30 sm dan yaqin nuqtalar; takroriy */
export function despike(r0: XY[]): XY[] {
  let r = r0.slice();
  for (let it = 0; it < 50 && r.length > 3; it++) {
    let k = -1;
    for (let i = 0; i < r.length; i++) {
      const p = r[(i - 1 + r.length) % r.length], c = r[i], q = r[(i + 1) % r.length];
      const a: XY = [p[0] - c[0], p[1] - c[1]], b: XY = [q[0] - c[0], q[1] - c[1]], la = Math.hypot(a[0], a[1]), lb = Math.hypot(b[0], b[1]);
      if (la < 0.3 || lb < 0.3) { k = i; break; }
      const cos = (a[0] * b[0] + a[1] * b[1]) / (la * lb), cr = a[0] * b[1] - a[1] * b[0];
      if (cos > Math.cos(20 * Math.PI / 180) || Math.abs(cr) < 1e-3 * la * lb) { k = i; break; }   // tikan yoki bir chiziqda
    }
    if (k < 0) break; r.splice(k, 1);
  }
  return r.length >= 3 ? r : r0;
}
