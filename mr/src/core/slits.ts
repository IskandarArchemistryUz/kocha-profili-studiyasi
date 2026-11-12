/**
 * 12.11 (G1, egasi: Olmazor va Yunusobod dahalari — «Hammasi» 0 bino): OSM dan aniqlangan daha chegarasida ichki servis
 * yoʻllaridan qolgan tor berk «tirqishlar» boʻladi (eni 2–10 m, chuqurligi 20–80 m). Generator perimetrni shu tirqishlar
 * boʻylab qisqa qirralarga boʻlib yuboradi, chekinish esa tirqishni 12+ m kenglikdagi oʻyiqqa aylantiradi — natijada
 * 160–250 m keng dahada ham «Daha juda tor» chiqardi.
 *
 * Yechim (TALQIN): generatsiya uchun tirqishlar yopiladi — morfologik yopish (tashqariga w/2, keyin ichkariga w/2) natijasidan
 * faqat tor va choʻziq boʻlaklar (oʻrtacha eni < w, maydoni ≥ minA) asl halqaga qoʻshiladi. Botiq burchaklar
 * (yopishdagi kichik yoysimon toʻldirishlar) oʻzgarmaydi. Uchastka chegarasi va maydon hisobi (KPI) asl halqada qoladi.
 * Ichki servis yoʻllari «Hammasini buzish» bilan birga qayta tashkil etiladi deb qabul qilinadi.
 */
import polygonClipping from 'polygon-clipping';
import { signedArea, type XY } from './geo';

const q3 = (v: number) => Math.round(v * 1000) / 1000;
const cl = (r: XY[]): [number, number][] => [...r, r[0]].map(p => [q3(p[0]), q3(p[1])]);
const op = (r: [number, number][]): XY[] => r.slice(0, -1).map(p => [p[0], p[1]] as XY);
const per = (r: XY[]) => r.reduce((s, p, i) => { const q = r[(i + 1) % r.length]; return s + Math.hypot(q[0] - p[0], q[1] - p[1]); }, 0);

/** Tashqariga (grow) yoki ichkariga h m: kengaytirish/qisqartirish (Minkowski: qirra toʻrtburchaklari + uchlarda 12 burchak). polygon-clipping butun toʻplamda
 *  baʼzan xato beradi (limits.bufferLocal va offset.insetRobust shunda asl halqa yoki null qaytaradi) — bu yerda boʻlaklar bittadan qoʻshiladi, xatolisi oʻtkaziladi */
function mink(r: XY[], h: number, grow: boolean): XY[] | null {
  const n = r.length, parts: [number, number][][][] = [];
  for (let i = 0; i < n; i++) {
    const a = r[i], b = r[(i + 1) % n], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy); if (L < 1e-6) continue;
    const nx = -dy / L * h, ny = dx / L * h;
    parts.push([cl([[a[0] - nx, a[1] - ny], [b[0] - nx, b[1] - ny], [b[0] + nx, b[1] + ny], [a[0] + nx, a[1] + ny]])]);
    parts.push([cl(Array.from({ length: 12 }, (_, k) => { const t = (k + 0.5) / 12 * Math.PI * 2; return [a[0] + Math.cos(t) * h, a[1] + Math.sin(t) * h] as XY; }))]);
  }
  let u: ReturnType<typeof polygonClipping.union> = [[cl(r)]];
  for (const p of parts) { try { u = grow ? polygonClipping.union(u, p) : polygonClipping.difference(u, p); } catch { /* oʻtkazildi */ } }
  let big: XY[] | null = null, ba = 0;
  for (const p of u) { const o = op(p[0]), a = Math.abs(signedArea(o)); if (a > ba) { ba = a; big = o; } }
  return big;
}

export interface SlitFix { ring: XY[]; n: number; area: number }

/** Tor berk tirqishlarni (eni < w m) yopish. Oʻzgarish boʻlmasa — asl halqa, n = 0 */
export function closeSlits(ring: XY[], w = 10, minA = 25): SlitFix {
  const same: SlitFix = { ring, n: 0, area: 0 };
  if (ring.length < 6) return same;   // tirqish kamida 3 ta qoʻshimcha nuqta talab qiladi
  const h = w / 2;
  try {
    const big = mink(ring, h, true); if (!big) return same;
    const closed = mink(big, h, false); if (!closed) return same;
    const diff = polygonClipping.difference([cl(closed)], [cl(ring)]);
    const add = diff.filter(p => {
      const o = op(p[0]), a = Math.abs(signedArea(o)), L = per(o) / 2;
      return a >= minA && L > 0 && a / L < w && L > 1.5 * w;   // tor (oʻrtacha eni < w) va choʻziq (uzunligi > 1,5·w)
    });
    if (!add.length) return same;
    const u = polygonClipping.union([cl(ring)], ...add);
    let best: XY[] | null = null, bb = 0;
    for (const p of u) { const o = op(p[0]), a = Math.abs(signedArea(o)); if (a > bb) { bb = a; best = o; } }
    if (!best) return same;
    const area = add.reduce((s, p) => s + Math.abs(signedArea(op(p[0]))), 0);
    return { ring: signedArea(ring) < 0 === signedArea(best) < 0 ? best : best.reverse(), n: add.length, area };
  } catch { return same; }
}

/** Halqa boʻyicha kesh (plan memo bir xil massivni qaytaradi) */
const memo = new WeakMap<XY[], SlitFix>();
export function genRing(ring: XY[]): SlitFix {
  let v = memo.get(ring); if (!v) { v = closeSlits(ring); memo.set(ring, v); }
  return v;
}
