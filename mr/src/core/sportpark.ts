/**
 * Sport hududi eskizi (31.10, egasi: «sport maydonlari, workout zonalar, yopiq, ochiq basseyn, stadionlar koʻrinib tursa, hozir parkdan farqi yoʻq»).
 * Kvartal katta-kichikligiga qarab standart oʻlchamli inshootlar joylashtiriladi (oʻlchamlar — sport federatsiyalari standartlari, andoza):
 *  · stadion: futbol maydoni 105 × 68 m (FIFA), atrofida 400 m yugurish yoʻlkasi (≈ 177 × 93 m, World Athletics);
 *  · futbol 105 × 68 (+ 3 m chet), mini-futbol 40 × 20, tennis 23,77 × 10,97 (kort 36 × 18), basketbol 28 × 15 (+2 m), voleybol 18 × 9 (+3 m);
 *  · ochiq basseyn 50 × 25 yoki 25 × 16 m (+ 4 m atrof yoʻlka); yopiq sport majmuasi (zal 42 × 24 + basseyn 25 × 16) ≈ 48 × 36 m, 10 m;
 *  · workout zonasi 15 × 10 m.
 * Hammasi kvartal asosiy oʻqiga parallel, chekdan ≥ 4 m, oralari ≥ 3 m; qolgan joy — maysa, yoʻlak va daraxtlar.
 */
import type { XY } from './geo';
import { mainAngle } from './labels';

export type SportKind = 'stadion' | 'yolka' | 'futbol' | 'minifutbol' | 'tennis' | 'basket' | 'voley' | 'workout' | 'basseyn' | 'yopiq';
export interface SportItem { k: SportKind; ring: XY[]; lines: XY[][]; h?: number }

const pin = (p: XY, r: XY[]) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) if ((r[i][1] > p[1]) !== (r[j][1] > p[1]) && p[0] < (r[j][0] - r[i][0]) * (p[1] - r[i][1]) / (r[j][1] - r[i][1]) + r[i][0]) c = !c; return c; };
const segD = (p: XY, a: XY, b: XY) => { const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2)); return Math.hypot(a[0] + dx * t - p[0], a[1] + dy * t - p[1]); };
const edgeD = (p: XY, r: XY[]) => { let d = Infinity; for (let i = 0; i < r.length; i++) d = Math.min(d, segD(p, r[i], r[(i + 1) % r.length])); return d; };

/** w × h toʻrtburchak, burilgan koordinatada (cx, cy) markazli */
type Box = { cx: number; cy: number; w: number; h: number };
interface Plan { k: SportKind; w: number; h: number; min?: number }

export function sportPark(outer: XY[], areaM2: number): SportItem[] {
  const ang = mainAngle(outer), c = Math.cos(ang), s = Math.sin(ang);
  const rot = (p: XY): XY => [p[0] * c + p[1] * s, -p[0] * s + p[1] * c], un = (p: XY): XY => [p[0] * c - p[1] * s, p[0] * s + p[1] * c];
  const R = outer.map(rot);
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity; for (const p of R) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2, taken: Box[] = [], out: SportItem[] = [];
  const fits = (b: Box, gap: number) => {
    const xs = [b.cx - b.w / 2, b.cx, b.cx + b.w / 2], ys = [b.cy - b.h / 2, b.cy, b.cy + b.h / 2];
    for (const x of xs) for (const y of ys) { if (!pin([x, y], R)) return false; if ((x !== b.cx || y !== b.cy) && edgeD([x, y], R) < 4) return false; }
    return !taken.some(t => Math.abs(t.cx - b.cx) * 2 < t.w + b.w + 2 * gap && Math.abs(t.cy - b.cy) * 2 < t.h + b.h + 2 * gap);
  };
  // edge — katta maydon kvartal chetiga suriladi (qolgan joy bir boʻlak boʻlib qolsin)
  const place = (w: number, h: number, gap = 3, edge = false): Box | null => {
    let best: Box | null = null, bd = Infinity;
    for (const [ww, hh] of [[w, h], [h, w]]) for (let x = x0 + ww / 2 + 4; x <= x1 - ww / 2 - 4; x += 2) for (let y = y0 + hh / 2 + 4; y <= y1 - hh / 2 - 4; y += 2) {
      const b = { cx: x, cy: y, w: ww, h: hh }, d = edge ? (y - y0) + Math.abs(x - mx) * 0.2 : Math.hypot(x - mx, y - my); if (d < bd && fits(b, gap)) { bd = d; best = b; }
    }
    if (best) taken.push(best); return best;
  };
  const ring = (b: Box, w = b.w, h = b.h): XY[] => ([[b.cx - w / 2, b.cy - h / 2], [b.cx + w / 2, b.cy - h / 2], [b.cx + w / 2, b.cy + h / 2], [b.cx - w / 2, b.cy + h / 2]] as XY[]).map(un);
  const L = (pts: XY[]): XY[] => pts.map(un);
  const along = (b: Box) => b.w >= b.h;   // maydon uzun oʻqi burilgan x boʻylab
  // maydon belgilari: chegara, oʻrta chiziq, markaz doirasi
  const marks = (b: Box, fw: number, fh: number, circle = 0): XY[][] => {
    const W = along(b) ? fw : fh, H = along(b) ? fh : fw, r = ring(b, W, H), mid = along(b) ? [[b.cx, b.cy - H / 2], [b.cx, b.cy + H / 2]] : [[b.cx - W / 2, b.cy], [b.cx + W / 2, b.cy]];
    const out2: XY[][] = [[...r, r[0]], L(mid as XY[])];
    if (circle > 0) { const cc: XY[] = []; for (let i = 0; i <= 24; i++) cc.push([b.cx + Math.cos(i / 24 * Math.PI * 2) * circle, b.cy + Math.sin(i / 24 * Math.PI * 2) * circle]); out2.push(L(cc)); }
    return out2;
  };
  const ha = areaM2 / 1e4;
  // 1) stadion yoki futbol
  if (ha >= 2.2) {
    const b = place(180, 96, 6, true);
    if (b) {
      // yugurish yoʻlkasi: ikki yarim doira + toʻgʻri qismlar (ichki R 36,5 m, 8 yoʻlak × 1,22 m ≈ 9,8 m)
      const lng = along(b), Ri = 36.5, Ro = Ri + 9.8, st = 84.39 / 2, track = (r: number): XY[] => { const q: XY[] = []; for (let i = 0; i <= 18; i++) { const a = -Math.PI / 2 + i / 18 * Math.PI; q.push(lng ? [b.cx + st + Math.cos(a) * r, b.cy + Math.sin(a) * r] : [b.cx + Math.sin(a) * r, b.cy + st + Math.cos(a) * r]); } for (let i = 0; i <= 18; i++) { const a = Math.PI / 2 + i / 18 * Math.PI; q.push(lng ? [b.cx - st + Math.cos(a) * r, b.cy + Math.sin(a) * r] : [b.cx + Math.sin(a) * r, b.cy - st + Math.cos(a) * r]); } return q; };
      out.push({ k: 'yolka', ring: L(track(Ro)), lines: [L([...track(Ri), track(Ri)[0]]), L([...track(Ro), track(Ro)[0]])] });
      out.push({ k: 'stadion', ring: L(track(Ri)), lines: marks(b, 105, 68, 9.15) });
    }
  } else if (ha >= 1.3) { const b = place(111, 74, 4, true); if (b) out.push({ k: 'futbol', ring: ring(b), lines: marks(b, 105, 68, 9.15) }); }
  // 2) yopiq sport majmuasi (zal + basseyn) va ochiq basseyn
  if (ha >= 0.9) { const b = place(48, 36, 6); if (b) out.push({ k: 'yopiq', ring: ring(b), lines: [], h: 10 }); }
  if (ha >= 1.6) { const b = place(58, 33, 4); if (b) out.push({ k: 'basseyn', ring: ring(b, b.w - 8, b.h - 8), lines: [[...ring(b), ring(b)[0]]] }); }
  else if (ha >= 0.5) { const b = place(33, 24, 4); if (b) out.push({ k: 'basseyn', ring: ring(b, b.w - 8, b.h - 8), lines: [[...ring(b), ring(b)[0]]] }); }
  // 3) maydonchalar: mini-futbol, tennis, basketbol, voleybol, workout
  const small: Plan[] = [{ k: 'minifutbol', w: 44, h: 24 }, { k: 'tennis', w: 36, h: 18 }, { k: 'basket', w: 32, h: 19 }, { k: 'tennis', w: 36, h: 18 }, { k: 'voley', w: 24, h: 15 }, { k: 'workout', w: 15, h: 10 }, { k: 'basket', w: 32, h: 19 }, { k: 'voley', w: 24, h: 15 }, { k: 'workout', w: 15, h: 10 }];
  const dims: Record<string, [number, number, number]> = { minifutbol: [40, 20, 3], tennis: [23.77, 10.97, 0], basket: [28, 15, 1.8], voley: [18, 9, 0], workout: [15, 10, 0] };
  for (const p of small) {
    if (out.length >= 12) break;
    const b = place(p.w, p.h); if (!b) continue;
    const [fw, fh, cr] = dims[p.k];
    out.push({ k: p.k, ring: ring(b), lines: p.k === 'workout' ? [] : marks(b, fw, fh, cr) });
  }
  return out;
}
