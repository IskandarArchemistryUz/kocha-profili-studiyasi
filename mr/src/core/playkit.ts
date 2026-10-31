/**
 * Hovli maydonchalari jihozlari (31.10, egasi: «landshaft uchun dizayn… saytga qoʻshilganmi»; canvasdagi namunalar asosida).
 * Har maydoncha (toʻrtburchak) ichida yengil chizma: qum, jihoz majmuasi, arg‘imchoq, skameyka, sport belgilari, pergola, kir quritish.
 * Oʻlchamlar — andoza (namuna eskiz), meʼyor emas: aniq jihozlar — loyihachi va ishlab chiqaruvchi katalogi.
 * Faqat tekis geometriya (fill / chiziq) — sahna rang boʻyicha bir nechta birlashtirilgan obyektga yigʻadi.
 */
import type { XY } from './geo';

export type KitCol = 'qum' | 'jihoz' | 'yogoch' | 'oq' | 'chiziq' | 'gul' | 'ekin';
export interface KitPart { c: KitCol; f?: XY[]; l?: XY[] }
type Kind = 'bolalar' | 'kattalar' | 'sport' | 'xojalik' | 'tajriba';

/** Modul oʻlchami (uzun × qisqa, m): katta maydoncha shu modullarga boʻlinadi — jihozlar maydon bilan birga koʻpayadi */
const CELL: Record<Kind, [number, number]> = { bolalar: [14, 12], kattalar: [12, 10], sport: [32, 19], xojalik: [12, 9], tajriba: [16, 12] };

export function playKit(kind: Kind, ring: XY[], variant = 0): KitPart[] {
  if (ring.length < 4) return [];
  const xs = ring.map(p => p[0]), ys = ring.map(p => p[1]);
  const x0 = Math.min(...xs), y0 = Math.min(...ys), W = Math.max(...xs) - x0, H = Math.max(...ys) - y0;
  const L = Math.max(W, H), S = Math.min(W, H), rot = H > W;
  // mahalliy koordinata: u — uzun tomon, v — qisqa
  const P = (u: number, v: number): XY => (rot ? [x0 + v, y0 + u] : [x0 + u, y0 + v]);
  const out: KitPart[] = [];
  const nu = Math.max(1, Math.floor(L / CELL[kind][0])), nv = Math.max(1, Math.floor(S / CELL[kind][1]));
  if (nu * nv > 1 && nu * nv <= 64) {
    const cu = L / nu, cv = S / nv;
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
      out.push(...playKit(kind, [P(i * cu, j * cv), P((i + 1) * cu, j * cv), P((i + 1) * cu, (j + 1) * cv), P(i * cu, (j + 1) * cv)], (i + j * 2) % 3));
      if (i) out.push({ c: kind === 'sport' ? 'oq' : 'chiziq', l: [P(i * cu, 0.3), P(i * cu, S - 0.3)] });   // modullar orasidagi chegara
    }
    for (let j = 1; j < nv; j++) out.push({ c: kind === 'sport' ? 'oq' : 'chiziq', l: [P(0.3, j * cv), P(L - 0.3, j * cv)] });
    return out;
  }
  const rect = (c: KitCol, u: number, v: number, w: number, h: number, line = false) => {
    const r = [P(u, v), P(u + w, v), P(u + w, v + h), P(u, v + h)];
    out.push(line ? { c, l: [...r, r[0]] } : { c, f: r });
  };
  const circ = (c: KitCol, u: number, v: number, r: number, line = false, n = 18) => {
    const q: XY[] = []; for (let k = 0; k < n; k++) { const t = k / n * Math.PI * 2; q.push(P(u + Math.cos(t) * r, v + Math.sin(t) * r)); }
    out.push(line ? { c, l: [...q, q[0]] } : { c, f: q });
  };
  const seg = (c: KitCol, u0: number, v0: number, u1: number, v1: number) => out.push({ c, l: [P(u0, v0), P(u1, v1)] });
  const bench = (u: number, v: number) => rect('yogoch', u, v, Math.min(1.8, L * 0.2), 0.5);
  if (S < 3 || L < 4) return out;

  if (kind === 'bolalar' && variant === 1 && L >= 10 && S >= 7) {
    // 2-modul: katta qum maydoni (toʻrtburchak) va karusel
    rect('qum', 1, 1, L * 0.55, S - 2); rect('yogoch', 1, 1, L * 0.55, S - 2, true);
    circ('jihoz', L * 0.78, S / 2, Math.min(1.6, S * 0.15)); circ('chiziq', L * 0.78, S / 2, Math.min(2.6, S * 0.22), true);
    bench(L - 2.4, 0.3);
  } else if (kind === 'bolalar' && variant === 2 && L >= 10 && S >= 7) {
    // 3-modul: tirmashish jihozi (toʻr) va tepalik
    rect('jihoz', L * 0.15, S * 0.2, L * 0.35, S * 0.25);
    for (let u = L * 0.15 + 0.8; u < L * 0.5; u += 0.8) seg('chiziq', u, S * 0.2, u, S * 0.45);
    circ('gul', L * 0.7, S * 0.6, Math.min(2.5, S * 0.2)); circ('chiziq', L * 0.7, S * 0.6, Math.min(2.5, S * 0.2), true);
    bench(0.6, S - 0.8);
  } else if (kind === 'bolalar') {
    // qum (doira), jihoz majmuasi, argʻimchoq, skameykalar chetda
    const r = Math.max(1.2, Math.min(3, S * 0.2));
    circ('qum', Math.min(L * 0.25, r + 1.2), S / 2, r);
    circ('yogoch', Math.min(L * 0.25, r + 1.2), S / 2, r, true);
    if (L >= 10 && S >= 7) {
      const cw = Math.min(6, L * 0.3), ch = Math.min(4, S * 0.4), cu = L * 0.62 - cw / 2;
      rect('jihoz', cu, S * 0.15, cw, ch);
      rect('chiziq', cu + cw * 0.15, S * 0.15 + ch * 0.2, cw * 0.7, ch * 0.6, true);   // minora va tepalik
      const su = L * 0.62, sv = Math.min(S - 1.5, S * 0.15 + ch + 2.2);
      seg('chiziq', su - 1.8, sv, su + 1.8, sv);                                       // argʻimchoq toʻsini
      rect('jihoz', su - 1.1, sv - 0.25, 0.5, 0.5); rect('jihoz', su + 0.6, sv - 0.25, 0.5, 0.5);
    }
    bench(0.6, 0.3); if (L >= 8) bench(L - 2.4, S - 0.8);
  } else if (kind === 'sport') {
    // umumiy sport maydoni: chegara (1 m ichkarida), oʻrta chiziq, markaz doirasi, ikki tomonda zona
    const m = Math.min(1, S * 0.1), u0 = m, v0 = m, u1 = L - m, v1 = S - m;
    rect('oq', u0, v0, u1 - u0, v1 - v0, true);
    seg('oq', L / 2, v0, L / 2, v1);
    if (S >= 8) circ('oq', L / 2, S / 2, Math.min(1.8, S * 0.15), true, 24);
    if (L >= 20 && S >= 10) {
      const kw = Math.min(5.8, L * 0.2), kh = Math.min(4.9, (v1 - v0) * 0.45);
      rect('oq', u0, S / 2 - kh / 2, kw, kh, true); rect('oq', u1 - kw, S / 2 - kh / 2, kw, kh, true);
    }
  } else if (kind === 'kattalar') {
    // pergola (toʻsinlar bilan), stollar, skameykalar, gul tasmasi
    const pw = Math.min(8, L * 0.6), ph = Math.min(3, S * 0.5), pu = (L - pw) / 2, pv = S * 0.15;
    rect('yogoch', pu, pv, pw, ph, true);
    for (let u = pu + 0.6; u < pu + pw - 0.3; u += 0.6) seg('yogoch', u, pv, u, pv + ph);
    if (S >= 6) { circ('yogoch', L * 0.35, pv + ph + 1.5, 0.6); if (L >= 8) circ('yogoch', L * 0.65, pv + ph + 1.5, 0.6); }
    bench(pu + 0.3, pv + 0.3);
    if (S >= 5) rect('gul', 0.4, S - 1.3, L - 0.8, 0.9);
  } else if (kind === 'tajriba') {
    // oʻquv-tajriba bogʻi / MTM bogʻi: ekin pushtalari (1,2 m) va oraliq yoʻlakchalar (0,6 m), bir chetda kichik issiqxona
    const bw = 1.2, gap = 0.6, gh = Math.min(4, L * 0.25);
    for (let v = 0.8; v + bw <= S - 0.8; v += bw + gap) rect('ekin', 0.8, v, L - 1.6 - gh - 0.6, bw);
    if (L > 8) { rect('chiziq', L - 0.8 - gh, 0.8, gh, Math.min(6, S - 1.6), true); for (let u = L - 0.8 - gh + 1; u < L - 0.8; u += 1) seg('chiziq', u, 0.8, u, 0.8 + Math.min(6, S - 1.6)); }
  } else {
    // xoʻjalik: kir quritish (ustunlar va iplar), gilam qoqish ramasi
    const n = Math.max(2, Math.min(6, Math.floor((S - 2) / 1.2)));
    const lu0 = 1, lu1 = Math.max(lu0 + 2, L * 0.65);
    for (let k = 0; k < n; k++) { const v = 1 + k * 1.2; seg('chiziq', lu0, v, lu1, v); }
    rect('chiziq', lu0 - 0.15, 0.85, 0.3, (n - 1) * 1.2 + 0.3); rect('chiziq', lu1 - 0.15, 0.85, 0.3, (n - 1) * 1.2 + 0.3);
    if (L - lu1 > 3.5) rect('jihoz', lu1 + 1, S / 2 - 0.15, Math.min(3, L - lu1 - 1.5), 0.3);
  }
  return out;
}
