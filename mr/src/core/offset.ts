/**
 * Ishonchli ichki ofset (chekinish): halqadan har qirra boʻylab d kenglikdagi tasma va uchlardagi doiralar ayiriladi
 * (polygon-clipping). Oʻtkir burchak, botiq uch va qisqa qirralarda ham ishlaydi — oddiy «miter» ofset bunday shakllarda
 * null qaytarardi va generator «chekinishdan keyin joy qolmadi» derdi.
 * d — hamma qirraga bir xil yoki har qirraga alohida (d[k] — k → k+1 qirra). Natija — eng katta boʻlak (CCW), yoʻq boʻlsa null.
 */
import polygonClipping, { type Polygon } from 'polygon-clipping';
import { signedArea, type XY } from './geo';

const cl = (r: XY[]): [number, number][] => [...r, r[0]].map(p => [p[0], p[1]]);

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
