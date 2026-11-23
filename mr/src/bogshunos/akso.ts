/**
 * Bogʻshunos — aksonometrik illyustratsiya (15.11.2026): master rejaning istalgan toʻrtburchak qismi «kesib olingan blok» koʻrinishida.
 *
 * Usul (T): hudud toʻrtburchagi toʻrga boʻlinadi, har katak uchun qatlam (bino, suv, dastur zonasi, qattiq qoplama, maysa) va
 * balandlik (relyef modeli, bilinear) olinadi; izometrik proyeksiya (30°), orqadan oldinga chiziladi (painter).
 * Old ikki tomon — tuproq kesimi (unumdor qatlam + grunt; suv — havza). Daraxt, buta, jihoz, bino va odamlar — oddiy hajmlar.
 * Vertikal masshtab oshiriladi (sukut ×1,5 — relyefni oʻqish uchun, T). Bino balandligi — OSM qavatlari × 3,2 m, yoʻq boʻlsa 3 qavat (P).
 * Daraxt balandligi — reyestrdan, yangi daraxt — toj × 1,1 (P). Ranglar — rangdor belgilar palitrasi (symbols.TPAL).
 */
import type { XY, BgData, MPoly } from './types';
import type { Ctx } from './analyze';
import type { DesignOut } from './design';
import type { Planting } from './planting';
import { ZONES, TIERS } from './catalog';
import { furnById, FCATS } from './library';
import { TPAL, symOf, type PlanKey } from './symbols';
import { PHEN } from './assort';
import { SPECIES } from './species';
import UA_ from '../kochasoz/boards/ua.json';
/** Koʻchasoz siluetlari: d — [yoʻl, oq detal?], h — balandlik, ox/oy — asos nuqtasi */
const UA = UA_ as unknown as Record<string, { d: [string, number?][]; h: number; w: number; ox: number; oy: number }>;

export interface AksoReq { c: XY; w: number; d: number; view: 0 | 1 | 2 | 3; ex?: number; labels?: boolean; title?: string }
export interface AksoOut { svg: string; w: number; h: number; legend: { n: string; c: string }[]; hint: string }
/* Render uchun qatlamlar (15.11): asosiy SVG elementlari sinf (class) va chuqurlik (--d, 0…1, yaqin = 1) bilan belgilanadi;
   aksoPass() shu SVG dan ID-maska (har sinf — tekis rang) yoki chuqurlik xaritasi (kulrang) yasaydi; bezaklar (.dec) yashiriladi. */
export const MASK_C: Record<string, [string, string]> = { g: ['#78c850', 'maysa / grunt'], w: ['#2f6fd0', 'suv'], s: ['#7a4a20', 'tuproq kesimi'], z: ['', 'dastur zonalari (oʻz rangi)'], p: ['', 'yoʻllar (oʻz rangi)'], br: ['#8b5a2b', 'koʻprik'], b: ['#e6e6e6', 'bino'], t: ['#1f8a1f', 'bargli daraxt'], tc: ['#0c5a3c', 'ignabargli daraxt'], sh: ['#9acd32', 'buta'], f: ['#e07a2a', 'jihoz'], h: ['#ff00ff', 'odam'] };
export function aksoPass(svg: string, mode: 'mask' | 'depth'): string {
  const css = mode === 'mask'
    ? `.dec{display:none}${Object.entries(MASK_C).filter(([, v]) => v[0]).map(([c, v]) => `.${c},.${c} *{fill:${v[0]}!important;stroke:${v[0]}!important}`).join('')}.z,.p{stroke-opacity:1}.z{stroke:none!important}.p,.br{fill:none!important}`
    : `.dec,.z,.p,.br,.w:not([style]){display:none}[style*="--d"],[style*="--d"] *{fill:hsl(0 0% calc(var(--d) * 100%))!important;stroke:hsl(0 0% calc(var(--d) * 100%))!important}`;
  return svg.replace(/<rect([^>]*)fill="#ffffff"\/>/, `<rect$1fill="#000000"/>`).replace('<defs>', `<style>${css}</style><defs>`);
}

const COS = Math.cos(Math.PI / 6), SIN = Math.sin(Math.PI / 6);
const r1 = (v: number) => (Math.round(v * 10) / 10).toString();
const ITEM_C: Record<string, string> = { amfiteatr: '#e7b98e', terrasa: '#d9a77a', qushxona: '#8e7a5a', sport_mavjud: '#c9b8e0', sport_yangi: '#a891cf', otloq: '#e3ecc4', botqoq: '#b9d9cf', yomgir_bogi: '#a9cdb9', bolalar: '#f4c98f' };
const ZN: Record<string, string> = { amfiteatr: 'Amfiteatr', terrasa: 'Terrasa', qushxona: 'Qushlarni kuzatish joyi', sport_mavjud: 'Sport (mavjud)', sport_yangi: 'Sport (yangi)', otloq: 'Oʻtloq', botqoq: 'Botqoq qirgʻoq', yomgir_bogi: 'Yomgʻir bogʻi', bolalar: 'Bolalar maydoni' };
const shade = (hex: string, f: number) => { const n = parseInt(hex.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.max(0, Math.min(255, Math.round(f < 1 ? v * f : v + (255 - v) * (f - 1))))); return `#${c.map(v => v.toString(16).padStart(2, '0')).join('')}`; };
/** Deterministik tasodif */
function rng(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

export function akso(C: Ctx, data: BgData, DO: DesignOut, PL: Planting | null, R: AksoReq): AksoOut {
  const G = C.G, M = DO.masks, V = DO.V, ex = R.ex ?? 1.5;
  const x0 = R.c[0] - R.w / 2, y0 = R.c[1] - R.d / 2, x1 = x0 + R.w, y1 = y0 + R.d;
  // koʻrinish: (a, b) — izometrik oʻqlar; old burchak = max a, max b. view: 0 — janubi-gʻarbdan, 1 — janubi-sharqdan, 2 — shimoli-sharqdan, 3 — shimoli-gʻarbdan
  const v = R.view, A = v % 2 ? R.d : R.w, B = v % 2 ? R.w : R.d;
  const toAB = (p: XY): [number, number] => {
    const u = p[0] - x0, w = p[1] - y0;
    return v === 0 ? [R.w - u, w] : v === 1 ? [w, u] : v === 2 ? [u, R.d - w] : [R.d - w, R.w - u];
  };
  const fromAB = (a: number, b: number): XY => v === 0 ? [x0 + R.w - a, y0 + b] : v === 1 ? [x0 + b, y0 + a] : v === 2 ? [x0 + a, y0 + R.d - b] : [x0 + R.w - b, y0 + R.d - a];
  const inside = (p: XY) => p[0] >= x0 && p[0] <= x1 && p[1] >= y0 && p[1] <= y1;
  // balandlik
  const Eat = (p: XY) => { const k = G.idx(p[0], p[1]); const e = k >= 0 ? C.E[k] : NaN; return Number.isFinite(e) ? e : NaN; };
  const s = Math.max(1.5, Math.max(A, B) / 90), na = Math.ceil(A / s), nb = Math.ceil(B / s), sa = A / na, sb = B / nb;
  const Z = new Float32Array((na + 1) * (nb + 1)); let zmin = Infinity;
  for (let j = 0; j <= nb; j++) for (let i = 0; i <= na; i++) { const p = fromAB(i * sa, j * sb); let e = Eat(p); if (!Number.isFinite(e)) { let s2 = 0, n = 0; for (const [dx, dy] of [[3, 0], [-3, 0], [0, 3], [0, -3]]) { const q = Eat([p[0] + dx, p[1] + dy]); if (Number.isFinite(q)) { s2 += q; n++; } } e = n ? s2 / n : NaN; } Z[j * (na + 1) + i] = e; if (Number.isFinite(e)) zmin = Math.min(zmin, e); }
  if (!Number.isFinite(zmin)) zmin = 0;
  for (let k = 0; k < Z.length; k++) Z[k] = ((Number.isFinite(Z[k]) ? Z[k] : zmin) - zmin) * ex;
  const zAB = (a: number, b: number) => { const fi = Math.max(0, Math.min(na, a / sa)), fj = Math.max(0, Math.min(nb, b / sb)), i = Math.min(na - 1, Math.floor(fi)), j = Math.min(nb - 1, Math.floor(fj)), u = fi - i, w = fj - j; const z = (ii: number, jj: number) => Z[jj * (na + 1) + ii]; return z(i, j) * (1 - u) * (1 - w) + z(i + 1, j) * u * (1 - w) + z(i, j + 1) * (1 - u) * w + z(i + 1, j + 1) * u * w; };
  // proyeksiya (piksel): k px / m
  const k = 1100 / ((A + B) * COS), DEPTH = 3 * ex;
  const P = (a: number, b: number, z: number): [number, number] => [(a - b) * COS * k, ((a + b) * SIN - z) * k];
  const pts = (q: [number, number][]) => q.map(p => `${r1(p[0])},${r1(p[1])}`).join(' ');
  const zTop = Math.max(1, ...Array.from(Z)) + 15;
  const dv = (a: number, b: number, z: number) => (Math.round(Math.min(1, Math.max(0.08, 0.1 + 0.9 * (((a + b) / (A + B)) * 0.75 + Math.max(0, z) / zTop * 0.25))) * 1000) / 1000).toString();
  // ---- katak qatlami ----
  const zoneKeys = [...Object.keys(ZONES), ...Object.keys(ITEM_C)].filter((z, i, a) => a.indexOf(z) === i && M[z]);
  const colOf = (z: string) => (ZONES as Record<string, { c: string }>)[z]?.c ?? ITEM_C[z] ?? '#ddd';
  const used = new Map<string, { n: string; c: string; sa: number; sb: number; cnt: number }>();
  const cellC = (p: XY): { c: string; water?: boolean; key?: string } => {
    const g = G.idx(p[0], p[1]); if (g < 0) return { c: '#e7e9df' };
    if (C.water[g]) return { c: '#9cc6d8', water: true };
    if (C.bld[g]) return { c: '#dcd8d2' };
    for (const z of zoneKeys) if (M[z][g]) return { c: C.grass[g] ? '#c4dca6' : '#d4e3b8', key: z };
    if (M.hard?.[g] || C.exPath[g] && !C.grass[g]) return { c: '#d4e3b8', key: 'hard' };
    if (!C.site[g]) return { c: '#e4e6dc' };
    return { c: C.grass[g] ? '#c4dca6' : '#d4e3b8' };
  };
  let ground = '', side = '';
  const hardPts: XY[] = [], keyCells: Record<string, [number, number][]> = {}, waterCells: [number, number][] = [];
  // orqadan oldinga (a + b oʻsishi boʻyicha)
  const cells: { i: number; j: number }[] = []; for (let j = 0; j < nb; j++) for (let i = 0; i < na; i++) cells.push({ i, j }); cells.sort((p, q) => p.i + p.j - (q.i + q.j));
  for (const { i, j } of cells) {
    const a = i * sa, b = j * sb, ctr = fromAB(a + sa / 2, b + sb / 2), cc = cellC(ctr);
    const z = (ii: number, jj: number) => Z[jj * (na + 1) + ii] - (cc.water ? 0.4 * ex : 0);
    const q: [number, number][] = [P(a, b, z(i, j)), P(a + sa, b, z(i + 1, j)), P(a + sa, b + sb, z(i + 1, j + 1)), P(a, b + sb, z(i, j + 1))];
    // relyef soyasi (yorugʻ chap-orqadan): qiyalik koʻrinsin — tepalik, pogʻona, jar
    const Zc = (ii: number, jj: number) => Z[Math.max(0, Math.min(nb, jj)) * (na + 1) + Math.max(0, Math.min(na, ii))], ga = (Zc(i + 3, j) + Zc(i + 3, j + 1) - Zc(i - 2, j) - Zc(i - 2, j + 1)) / (10 * sa), gb = (Zc(i, j + 3) + Zc(i + 1, j + 3) - Zc(i, j - 2) - Zc(i + 1, j - 2)) / (10 * sb), hs = cc.water ? 1 : 1 + Math.max(-0.2, Math.min(0.2, Math.round((ga * 0.8 - gb * 0.5) * 12) / 12)), fc = hs === 1 ? cc.c : shade(cc.c, hs);
    ground += `<polygon class="${cc.water ? 'w' : 'g'}" style="--d:${dv(a + sa / 2, b + sb / 2, z(i, j))}" points="${pts(q)}" fill="${fc}" stroke="${fc}" stroke-width=".6"/>`;
    if (cc.key === 'hard') hardPts.push(ctr);
    if (cc.key && cc.key !== 'hard') (keyCells[cc.key] ??= []).push([a + sa / 2, b + sb / 2]); if (cc.water) waterCells.push([a + sa / 2, b + sb / 2]);
    if (cc.key && cc.key !== 'hard') { const u = used.get(cc.key) ?? { n: (ZONES as Record<string, { n: string }>)[cc.key]?.n ?? ZN[cc.key] ?? cc.key, c: colOf(cc.key), sa: 0, sb: 0, cnt: 0 }; u.sa += a; u.sb += b; u.cnt++; used.set(cc.key, u); }
    // old tomonlar — tuproq kesimi
    const base = -DEPTH;
    if (i === na - 1) { const za = z(i + 1, j), zb = z(i + 1, j + 1); side += `<polygon class="s" style="--d:${dv(A, b, 0)}" points="${pts([P(A, b, za), P(A, b + sb, zb), P(A, b + sb, base), P(A, b, base)])}" fill="#b89470" stroke="#b89470" stroke-width=".6"/>`; side += `<polygon class="dec" points="${pts([P(A, b, za), P(A, b + sb, zb), P(A, b + sb, zb - 0.5 * ex), P(A, b, za - 0.5 * ex)])}" fill="${cc.water ? '#7fb3c9' : '#7d5c3e'}"/>`; }
    if (j === nb - 1) { const za = z(i, j + 1), zb = z(i + 1, j + 1); side += `<polygon class="s" style="--d:${dv(a, B, 0)}" points="${pts([P(a, B, za), P(a + sa, B, zb), P(a + sa, B, base), P(a, B, base)])}" fill="#a9845f" stroke="#a9845f" stroke-width=".6"/>`; side += `<polygon class="dec" points="${pts([P(a, B, za), P(a + sa, B, zb), P(a + sa, B, zb - 0.5 * ex), P(a, B, za - 0.5 * ex)])}" fill="${cc.water ? '#6fa6bd' : '#6f5036'}"/>`; }
  }
  // ---- vektor qatlamlar (blok ustki yuzasiga kesilgan): koʻl, dastur zonalari, yoʻllar, koʻpriklar ----
  const at0 = (p: XY): [number, number] => { const [a, b] = toAB(p); return P(a, b, zAB(Math.max(0, Math.min(A, a)), Math.max(0, Math.min(B, b)))); };
  const dens = (r: XY[], st = 2): XY[] => { const o: XY[] = []; for (let t = 0; t < r.length; t++) { const p1 = r[t], p2 = r[(t + 1) % r.length]; if (t === r.length - 1 && (p1[0] !== r[0][0] || p1[1] !== r[0][1]) && r.length > 0) { o.push(p1); continue; } const L = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]), n = Math.max(1, Math.ceil(L / st)); for (let q = 0; q < n; q++) o.push([p1[0] + (p2[0] - p1[0]) * q / n, p1[1] + (p2[1] - p1[1]) * q / n]); } return o; };
  const near = (r: XY[]) => r.some(p => p[0] > x0 - 60 && p[0] < x1 + 60 && p[1] > y0 - 60 && p[1] < y1 + 60);
  const polyD = (mp: MPoly, wz = 0) => mp.filter(pg => near(pg[0])).map(pg => pg.map(r => 'M' + dens(r, Math.max(1.5, s)).map(p => { const q = at0(p); return `${r1(q[0])} ${r1(q[1] + wz)}`; }).join('L') + 'Z').join('')).join('');
  const lineD = (g: XY[]) => 'M' + dens(g, Math.max(1.5, s)).concat([g[g.length - 1]]).map(p => { const q = at0(p); return `${r1(q[0])} ${r1(q[1])}`; }).join('L');
  const topOutline: [number, number][] = []; for (let i = 0; i <= na; i++) topOutline.push(P(i * sa, 0, zAB(i * sa, 0))); for (let j = 0; j <= nb; j++) topOutline.push(P(A, j * sb, zAB(A, j * sb))); for (let i = na; i >= 0; i--) topOutline.push(P(i * sa, B, zAB(i * sa, B))); for (let j = nb; j >= 0; j--) topOutline.push(P(0, j * sb, zAB(0, j * sb)));
  let vec = '', dec = '';
  for (const l of C.lakes) vec += `<path class="w" d="${polyD(l, 0.4 * ex * k)}" fill="#9cc6d8" stroke="#eaf5f9" stroke-width="1.6" fill-rule="evenodd"/>`;
  for (const z of zoneKeys) { const mp = V.prog[z]; if (mp?.length) vec += `<path class="z" d="${polyD(mp)}" fill="${colOf(z)}" stroke="${shade(colOf(z), 0.82)}" stroke-width=".8" fill-rule="evenodd"/>`; }
  /* zona tafsilotlari: oʻtloq — oʻt tutamlari va gullar; botqoq, yomgʻir bogʻi, swale — qamish; sport — oq chiziqlar; maydon — plitka toʻri */
  const deco = (key: string, f: (q: [number, number], R: () => number) => string, every = 1) => { const L = keyCells[key]; if (!L) return; const Rr = rng(key.length * 97); L.forEach((q, i) => { if (i % every === 0) dec += f(q, Rr); }); };
  const tuft = (q: [number, number], Rr: () => number, c: string, h = 0.5) => { const a = q[0] + (Rr() - 0.5) * sa, b = q[1] + (Rr() - 0.5) * sb, [x, y] = P(a, b, zAB(a, b)), hh = h * k; return `<path d="M${r1(x - hh * 0.35)} ${r1(y)}L${r1(x - hh * 0.1)} ${r1(y - hh)}M${r1(x)} ${r1(y)}L${r1(x)} ${r1(y - hh * 1.2)}M${r1(x + hh * 0.35)} ${r1(y)}L${r1(x + hh * 0.15)} ${r1(y - hh)}" stroke="${c}" stroke-width="${r1(Math.max(0.6, hh * 0.12))}" stroke-linecap="round" fill="none"/>`; };
  const FLW = ['#f29bb8', '#f0d23a', '#ffffff', '#b58ad2'];
  for (const key of ['otloq', 'gulzor', 'qumlik', 'yovvoyi', 'tepalik']) deco(key, (q, Rr) => tuft(q, Rr, '#8fae5a', 0.45) + (Rr() < (key === 'gulzor' ? 0.9 : 0.45) ? (() => { const a = q[0] + (Rr() - 0.5) * sa, b = q[1] + (Rr() - 0.5) * sb, [x, y] = P(a, b, zAB(a, b) + 0.3); return `<circle cx="${r1(x)}" cy="${r1(y)}" r="${r1(Math.max(0.9, 0.14 * k))}" fill="${FLW[Math.floor(Rr() * FLW.length)]}"/>`; })() : ''), key === 'gulzor' ? 1 : 2);
  for (const key of ['botqoq', 'yomgir_bogi', 'swale', 'tozalash']) deco(key, (q, Rr) => tuft(q, Rr, '#5f8a54', 1.1) + (Rr() < 0.35 ? tuft(q, Rr, '#8a7a4a', 1.4) : ''));
  for (const key of ['sport_yangi', 'sport_mavjud']) { const mp = V.prog[key]; if (mp?.length) dec += `<path d="${polyD(mp)}" fill="none" stroke="#ffffff" stroke-width="1.6" stroke-opacity=".9" transform="scale(1)" stroke-dasharray="1 0"/>`; }
  for (const key of ['maydon', 'suv_maydon', 'sohil_pogona', 'amfiteatr', 'terrasa']) { const mp = V.prog[key]; if (mp?.length) dec += `<path d="${polyD(mp)}" fill="url(#akPave)" stroke="none"/>`; }
  for (const key of ['bolalar', 'oyin_tabiiy']) deco(key, (q, Rr) => { if (Rr() > 0.18) return ''; const [x, y] = P(q[0], q[1], zAB(q[0], q[1])); return `<ellipse cx="${r1(x)}" cy="${r1(y)}" rx="${r1(0.9 * k)}" ry="${r1(0.45 * k)}" fill="${['#f2b25a', '#e2763c', '#8fc0d6'][Math.floor(Rr() * 3)]}" fill-opacity=".8"/>`; });
  for (const key of ['ormoncha', 'mevazor', 'sokin_bog']) deco(key, (q, Rr) => tuft(q, Rr, '#6f9a48', 0.7), 2);
  { const Rr = rng(5); waterCells.forEach((q, i) => { if (i % 4 || Rr() > 0.32) return; const [x, y] = P(q[0], q[1], zAB(q[0], q[1]) - 0.4 * ex), L = (0.8 + Rr()) * k; dec += `<path d="M${r1(x - L)} ${r1(y)}Q${r1(x)} ${r1(y - L * 0.25)} ${r1(x + L)} ${r1(y)}" fill="none" stroke="#e6f3f8" stroke-width="${r1(Math.max(0.8, 0.09 * k))}" stroke-linecap="round" stroke-opacity=".8"/>`; }); }
  vec += `<g class="dec">${dec}</g>`; dec = '';
  const ORDER = ['ekotropa', 'soqmoq', 'yugurish', 'pastil', 'sohil', 'servis', 'velo', 'aralash', 'ikkinchi', 'promenada', 'asosiy', 'rampa', 'zina'];
  const PS = V.paths.filter(p => near(p.g)).sort((p, q) => ORDER.indexOf(p.tier) - ORDER.indexOf(q.tier));
  for (const p of PS) vec += `<path class="dec" d="${lineD(p.g)}" fill="none" stroke="#b9ab94" stroke-width="${r1(p.w * k * 0.82 + 2)}" stroke-linecap="round" stroke-linejoin="round"/>`;
  /* yoʻl yuzasi va belgilari (T — illyustrativ): tosh xiyobon — markaz yorugʻ chiziq; velo — koʻk-kulrang asfalt + oq oʻq chizigʻi;
     yugurish — qizil rezina + oq chetlar; pastil — koʻndalang taxtalar; soʻqmoq / ekotropa — shagʻal / mulcha nuqtalari; zina — pogʻonalar */
  const SURF: Record<string, string> = { velo: '#aebfca', aralash: '#c9cfc4', yugurish: '#d99a83', pastil: '#c9a57a', sohil: '#cfb38c', ekotropa: '#d9c9a6', soqmoq: '#e6dcc6', servis: '#cfd8bf', zina: '#d6b07a', rampa: '#e3c79a' };
  for (const p of PS) {
    const d = lineD(p.g), w = p.w * k * 0.82, base = SURF[p.tier] ?? TIERS[p.tier]?.c ?? '#efe6d4';
    vec += `<path class="p" d="${d}" fill="none" stroke="${base}" stroke-width="${r1(w)}" stroke-linecap="round" stroke-linejoin="round"${p.style === 'punktir' ? ` stroke-dasharray="${r1(w * 1.2)} ${r1(w * 0.8)}"` : ''}/>`;
    if (p.style === 'punktir') continue;
    if (p.tier === 'velo' || p.tier === 'aralash') dec += `<path d="${d}" fill="none" stroke="#ffffff" stroke-width="${r1(Math.max(0.7, w * 0.06))}" stroke-dasharray="${r1(w * 0.9)} ${r1(w * 0.7)}"/>`;
    else if (p.tier === 'yugurish') dec += `<path d="${d}" fill="none" stroke="#fff" stroke-width="${r1(w * 0.82)}" stroke-opacity=".85"/><path d="${d}" fill="none" stroke="${base}" stroke-width="${r1(w * 0.72)}"/>`;
    else if (p.tier === 'pastil' || p.tier === 'sohil') dec += `<path d="${d}" fill="none" stroke="${shade(base, 0.72)}" stroke-width="${r1(w)}" stroke-dasharray="${r1(Math.max(0.5, 0.06 * k))} ${r1(Math.max(1.6, 0.28 * k))}"/>`;
    else if (p.tier === 'soqmoq' || p.tier === 'ekotropa') dec += `<path d="${d}" fill="none" stroke="${shade(base, 0.8)}" stroke-width="${r1(w * 0.55)}" stroke-linecap="round" stroke-dasharray="0 ${r1(Math.max(2, w * 0.5))}"/>`;
    else if (p.tier === 'zina') dec += `<path d="${d}" fill="none" stroke="${shade(base, 0.7)}" stroke-width="${r1(w)}" stroke-dasharray="${r1(Math.max(0.6, 0.08 * k))} ${r1(Math.max(1.5, 0.3 * k))}"/>`;
    else if (p.tier === 'servis') dec += `<path d="${d}" fill="none" stroke="#9fbf86" stroke-width="${r1(w * 0.8)}" stroke-dasharray="${r1(Math.max(1, 0.15 * k))} ${r1(Math.max(1, 0.15 * k))}"/>`;
    else dec += `<path d="${d}" fill="none" stroke="#ffffff" stroke-opacity=".35" stroke-width="${r1(w * 0.3)}" stroke-linecap="round"/>`;
  }
  vec += `<g class="dec">${dec}</g>`; dec = '';
  for (const b of V.bridges.filter(b => near(b.g))) vec += `<path class="br" d="${lineD(b.g)}" fill="none" stroke="#6b5a48" stroke-width="${r1(b.w * k * 0.82 + 3)}"/><path class="br" d="${lineD(b.g)}" fill="none" stroke="#d8c1a0" stroke-width="${r1(b.w * k * 0.82)}"/>`;
  ground += `<clipPath id="akTop"><polygon points="${pts(topOutline)}"/></clipPath><g clip-path="url(#akTop)">${vec}${dec ? `<g class="dec">${dec}</g>` : ''}</g>`;
  // ---- hajmlar (chuqurlik boʻyicha) ----
  type Obj = { d: number; g: string };
  const objs: Obj[] = [];
  const at = (p: XY) => { const [a, b] = toAB(p); return { a, b, z: zAB(a, b) }; };
  // binolar
  const levelsOf = (poly: MPoly) => { const c0 = poly[0][0][0]; const f = data.osm.find(o => o.k === 'building' && o.kind === 'pg' && (o.g as MPoly)[0]?.[0]?.[0]?.[0] === c0[0] && (o.g as MPoly)[0][0][0][1] === c0[1]); const L = +(f?.tags?.['building:levels'] ?? NaN); return Number.isFinite(L) && L > 0 ? L : 3; };
  for (const poly of [...C.blds, ...data.osm.filter(o => o.k === 'building' && o.kind === 'pg').map(o => o.g as MPoly).filter(pg => !C.blds.includes(pg))]) {
    const ring = poly[0][0]; if (!ring?.length) continue; const cx = ring.reduce((s2, p) => s2 + p[0], 0) / ring.length, cy = ring.reduce((s2, p) => s2 + p[1], 0) / ring.length; if (!inside([cx, cy])) continue;
    const R2 = ring.map(p => { const [a, b] = toAB([Math.max(x0, Math.min(x1, p[0])), Math.max(y0, Math.min(y1, p[1]))]); return [a, b] as [number, number]; });
    // poydevor: kontur boʻylab eng past yer — bino relyefga «oʻtiradi», qiyalikda pastki tomoni ochiq qolmaydi (T)
    const zs: number[] = []; for (let t = 0; t < R2.length; t++) { const p1 = R2[t], p2 = R2[(t + 1) % R2.length], n = Math.max(1, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / 2)); for (let u = 0; u < n; u++) zs.push(zAB(Math.max(0, Math.min(A, p1[0] + (p2[0] - p1[0]) * u / n)), Math.max(0, Math.min(B, p1[1] + (p2[1] - p1[1]) * u / n)))); }
    const lvN = levelsOf(poly), fh = 3.2 * Math.min(ex, 1.2), H = lvN * fh, z0 = Math.min(...zs) - 0.15 * ex, zT = Math.max(...zs) + H, plinth = zT - H - z0;
    const walls: { d: number; g: string }[] = [];
    // koʻrinadigan devorlar: tashqi normal kuzatuvchi tomonga (+a, +b) qaragan
    let sa2 = 0; for (let t = 0; t < R2.length; t++) { const p1 = R2[t], p2 = R2[(t + 1) % R2.length]; sa2 += p1[0] * p2[1] - p2[0] * p1[1]; }
    const sg = sa2 >= 0 ? 1 : -1, glass = (f: number) => shade('#8fa9b8', f), WW = 1.5, WG = 3.2;
    let run = 0;   // derazalar perimetr boʻylab uzluksiz (qisqa qirralarda ham ritm buzilmaydi)
    for (let t = 0; t < R2.length; t++) {
      const p1 = R2[t], p2 = R2[(t + 1) % R2.length], dx = p2[0] - p1[0], dy = p2[1] - p1[1], Lw = Math.hypot(dx, dy); if (Lw < 0.05) continue;
      const nx = sg * dy, ny = -sg * dx, vis = nx + ny > 1e-6; const s0 = run; run += Lw; if (!vis) continue;
      const f = Math.abs(nx) >= Math.abs(ny) ? 0.9 : 0.76, ux = dx / Lw, uy = dy / Lw;
      let g = `<polygon points="${pts([P(p1[0], p1[1], z0), P(p2[0], p2[1], z0), P(p2[0], p2[1], zT), P(p1[0], p1[1], zT)])}" fill="${shade('#f3efe8', f)}" stroke="#b9b2a7" stroke-width=".5" stroke-linejoin="round"/>`;
      if (plinth > 0.4) g += `<polygon points="${pts([P(p1[0], p1[1], z0), P(p2[0], p2[1], z0), P(p2[0], p2[1], z0 + plinth), P(p1[0], p1[1], z0 + plinth)])}" fill="${shade('#cfc7bb', f)}"/>`;
      for (let w0 = Math.ceil(s0 / WG) * WG - s0 + WG / 2; w0 < Lw; w0 += WG) { const hw = Math.min(WW / 2, w0 - 0.08, Lw - w0 - 0.08); if (hw < 0.3) continue;
        const a1 = p1[0] + ux * (w0 - hw), b1 = p1[1] + uy * (w0 - hw), a2 = p1[0] + ux * (w0 + hw), b2 = p1[1] + uy * (w0 + hw);
        for (let q = 0; q < lvN; q++) { const zb = zT - H + q * fh + 0.28 * fh, zt = zb + 0.47 * fh; g += `<polygon points="${pts([P(a1, b1, zb), P(a2, b2, zb), P(a2, b2, zt), P(a1, b1, zt)])}" fill="${glass(f)}"/>`; } }
      walls.push({ d: (p1[0] + p2[0] + p1[1] + p2[1]) / 2, g });
    }
    // devorlar alohida obyekt (oʻz chuqurligi bilan) — oldidagi daraxtlar fasadni toʻgʻri yopadi; tom — markaz chuqurligida
    const roof = `<polygon points="${pts(R2.map(p => P(p[0], p[1], zT)))}" fill="#fbfaf7" stroke="#a9a196" stroke-width=".7" stroke-linejoin="round"/>`;
    const dc = R2.reduce((s2, p) => s2 + p[0] + p[1], 0) / R2.length, bd = `class="b" style="--d:${dv(dc / 2, dc / 2, (z0 + zT) / 2)}"`;
    for (const w2 of walls) objs.push({ d: w2.d, g: `<g ${bd}>${w2.g}</g>` });
    objs.push({ d: Math.max(dc, ...walls.map(w2 => w2.d)) + 1e-3, g: `<g ${bd}>${roof}</g>` });
  }
  // yoritish ustunlari — yoritiladigan yoʻllar boʻylab (ustun ~25 m, past yoritkich ~12 m; illyustrativ, T)
  for (const p of V.paths) {
    const lt = p.light === 'yoq' ? null : p.light ?? TIERS[p.tier]?.light; if (!lt) continue; const step = lt === 'ustun' ? 25 : 12; let acc = step / 2;
    for (let t = 1; t < p.g.length; t++) { const q0 = p.g[t - 1], q1 = p.g[t], L = Math.hypot(q1[0] - q0[0], q1[1] - q0[1]); if (!L) continue; const nx = -(q1[1] - q0[1]) / L, ny = (q1[0] - q0[0]) / L;
      while (acc <= L) { const u = acc / L, q: XY = [q0[0] + (q1[0] - q0[0]) * u + nx * (p.w / 2 + 0.6), q0[1] + (q1[1] - q0[1]) * u + ny * (p.w / 2 + 0.6)]; acc += step; if (!inside(q)) continue;
        const { a, b, z } = at(q), [x, y] = P(a, b, z), hh = (lt === 'ustun' ? 4 : 0.9) * Math.min(ex, 1.2) * k;
        objs.push({ d: a + b, g: '<g class="dec">' + (lt === 'ustun' ? `<line x1="${r1(x)}" y1="${r1(y)}" x2="${r1(x)}" y2="${r1(y - hh)}" stroke="#4a4a48" stroke-width="${r1(Math.max(0.8, 0.12 * k))}"/><ellipse cx="${r1(x)}" cy="${r1(y - hh)}" rx="${r1(Math.max(1.6, 0.35 * k))}" ry="${r1(Math.max(0.8, 0.15 * k))}" fill="#fff6d8" stroke="#4a4a48" stroke-width=".5"/>` : `<rect x="${r1(x - Math.max(0.6, 0.1 * k))}" y="${r1(y - hh)}" width="${r1(Math.max(1.2, 0.2 * k))}" height="${r1(hh)}" fill="#4a4a48"/><rect x="${r1(x - Math.max(0.6, 0.1 * k))}" y="${r1(y - hh)}" width="${r1(Math.max(1.2, 0.2 * k))}" height="${r1(Math.max(0.6, 0.12 * k))}" fill="#fff1b8"/>`) + '</g>' }); }
      acc -= L; } }
  // daraxtlar va butalar
  /* daraxt hajmi (15.11, 2-tahrir): toj — 5–8 boʻlakli bulut, gradient (yorugʻ yuqori-chapda), shakl turga qarab */
  type Form = 'round' | 'oval' | 'col' | 'cone' | 'weep';
  const usedG = new Set<PlanKey>();
  const grad = (key: PlanKey) => { usedG.add(key); return `url(#akG${key})`; };
  const lobes = (cx: number, cy: number, rx: number, ry: number, key: PlanKey, seed: number, n = 7) => {
    const [, c1] = TPAL[key], Rn = rng(seed), L: [number, number, number][] = [];
    for (let t = 0; t < n; t++) { const an = t / n * 6.283 + Rn() * 0.5, q = 0.42 + Rn() * 0.12; L.push([cx + Math.cos(an) * rx * q, cy + Math.sin(an) * ry * q, (0.5 + Rn() * 0.14) * Math.min(rx, ry)]); }
    let g = L.map(([x, y, r]) => `<ellipse cx="${r1(x + r * 0.08)}" cy="${r1(y + r * 0.1)}" rx="${r1(r * (rx / Math.min(rx, ry)))}" ry="${r1(r * (ry / Math.min(rx, ry)))}" fill="${shade(c1, 0.92)}"/>`).join('');
    g += `<ellipse cx="${r1(cx)}" cy="${r1(cy)}" rx="${r1(rx * 0.72)}" ry="${r1(ry * 0.72)}" fill="${grad(key)}"/>`;
    g += L.map(([x, y, r]) => `<ellipse cx="${r1(x)}" cy="${r1(y)}" rx="${r1(r * 0.92 * (rx / Math.min(rx, ry)))}" ry="${r1(r * 0.92 * (ry / Math.min(rx, ry)))}" fill="${grad(key)}"/>`).join('');
    const [, , c2] = TPAL[key];
    g += `<ellipse cx="${r1(cx - rx * 0.3)}" cy="${r1(cy - ry * 0.34)}" rx="${r1(rx * 0.32)}" ry="${r1(ry * 0.26)}" fill="${c2}" fill-opacity=".45"/>`;
    return g;
  };
  const trunk = (px: number, py: number, topY: number, w: number) => `<polygon points="${pts([[px - w / 2, py], [px + w / 2, py], [px + w * 0.22, topY], [px - w * 0.22, topY]])}" fill="#6e5039"/><polygon points="${pts([[px, py], [px + w / 2, py], [px + w * 0.22, topY], [px, topY]])}" fill="#5a412e"/>`;
  const tree = (p: XY, crown: number, hgt: number, key: PlanKey, fc?: string, form?: Form) => {
    const { a, b, z } = at(p); if (a < 0 || b < 0 || a > A || b > B) return;
    const r = crown / 2, H = Math.max(hgt, crown * 0.9), [px, py] = P(a, b, z), [c0, c1, c2] = TPAL[key], seed = Math.round(p[0] * 7.3 + p[1] * 13.1);
    const fm: Form = form ?? (key === 'igna' ? 'cone' : key === 'kolonna' ? 'col' : key === 'orta' || key === 'kichik' ? 'oval' : 'round');
    let g = `<g class="dec"><ellipse cx="${r1(px + r * 0.6 * k)}" cy="${r1(py + r * 0.18 * k)}" rx="${r1(r * 1.05 * k)}" ry="${r1(r * 0.5 * k)}" fill="#29401f" fill-opacity=".13"/><ellipse cx="${r1(px + r * 0.35 * k)}" cy="${r1(py + r * 0.1 * k)}" rx="${r1(r * 0.6 * k)}" ry="${r1(r * 0.28 * k)}" fill="#29401f" fill-opacity=".12"/></g>`;
    const tw = Math.max(1.4, r * 0.16 * k);
    if (fm === 'cone') {
      g += trunk(px, py, py - H * 0.2 * k, tw);
      for (let t = 0; t < 3; t++) { const z0 = z + H * (0.14 + t * 0.2), w = r * (0.82 - t * 0.2);
        const top = P(a, b, z + H * (0.5 + t * 0.25)), bl = P(a - w * 0.7, b + w * 0.7, z0), br = P(a + w * 0.7, b - w * 0.7, z0), bm = P(a + w * 0.2, b + w * 0.2, z0 - w * 0.25);
        g += `<polygon points="${pts([top, br, bm, bl])}" fill="${grad(key)}" stroke="${c1}" stroke-width=".8" stroke-linejoin="round"/><polygon points="${pts([top, bm, bl])}" fill="${c2}" fill-opacity=".28"/>`; }
    } else if (fm === 'weep') {
      const cyz = z + H - r * 0.8, [cx, cy] = P(a, b, cyz), rx = r * k, ry = rx * 0.75;
      g += trunk(px, py, cy, tw);
      const Rn = rng(seed); let dr = ''; for (let t = 0; t < 16; t++) { const u = -0.95 + t / 15 * 1.9, x = cx + u * rx, y0 = cy + ry * 0.2 * (1 - u * u), y1 = cy + ry * (0.9 + Rn() * 0.9); dr += `M${r1(x)} ${r1(y0)}Q${r1(x + rx * 0.08)} ${r1((y0 + y1) / 2)} ${r1(x + rx * 0.02)} ${r1(y1)}`; }
      g += `<path d="${dr}" fill="none" stroke="${c0}" stroke-width="${r1(Math.max(1.4, rx * 0.12))}" stroke-linecap="round"/>` + lobes(cx, cy, rx, ry, key, seed, 6) + `<path d="${dr}" fill="none" stroke="${c2}" stroke-opacity=".5" stroke-width="${r1(Math.max(.6, rx * 0.04))}" stroke-linecap="round"/>`;
    } else {
      const cyz = z + H - r * (fm === 'col' ? 1.6 : 1), [cx, cy] = P(a, b, cyz), rx = r * k * (fm === 'oval' ? 0.92 : 1), ry = fm === 'col' ? rx * 2.1 : fm === 'oval' ? rx * 1.12 : rx * 0.95;
      g += trunk(px, py, cy + ry * 0.5, tw);
      g += lobes(cx, cy, rx, ry, key, seed, fm === 'col' ? 6 : 7);
      if (fc) { const R3 = rng(seed + 1); for (let t = 0; t < 9; t++) { const an = R3() * 6.28, q = 0.2 + 0.65 * R3(); g += `<circle cx="${r1(cx + Math.cos(an) * rx * q)}" cy="${r1(cy + Math.sin(an) * ry * q)}" r="${r1(Math.max(1, rx * 0.085))}" fill="${fc}" stroke="#fff" stroke-width=".5"/>`; } }
    }
    void c0;
    objs.push({ d: a + b, g: `<g class="${fm === 'cone' ? 'tc' : 't'}" style="--d:${dv(a, b, z + H * 0.6)}">${g}</g>` });
  };
  const shrub = (p: XY, fc?: string) => { const { a, b, z } = at(p); if (a < 0 || b < 0 || a > A || b > B) return; const [c0, c1, c2] = TPAL.butaGuruh; let g = ''; for (const [da, db] of [[-0.9, 0.3], [0.8, 0.5], [0, -0.6]]) { const [cx, cy] = P(a + da, b + db, z + 0.6); g += `<ellipse cx="${r1(cx)}" cy="${r1(cy)}" rx="${r1(1 * k)}" ry="${r1(0.75 * k)}" fill="${c0}" stroke="${c1}" stroke-width=".8"/>`; } const [hx, hy] = P(a, b - 0.3, z + 0.9); g += `<ellipse cx="${r1(hx)}" cy="${r1(hy)}" rx="${r1(0.5 * k)}" ry="${r1(0.35 * k)}" fill="${c2}" fill-opacity=".6"/>`; if (fc) g += `<circle cx="${r1(hx + 0.4 * k)}" cy="${r1(hy + 0.2 * k)}" r="${r1(Math.max(1, 0.18 * k))}" fill="${fc}"/>`; objs.push({ d: a + b, g: `<g class="sh" style="--d:${dv(a, b, z + 0.6)}">${g}</g>` }); };
  const formOfLat = (lat: string, c: number): [PlanKey, Form] => {
    const gn = lat.split(' ')[0];
    if (/babylonica/.test(lat)) return ['orta', 'weep'];
    if (['Thuja', 'Cupressus', 'Platycladus'].includes(gn) || lat === 'Populus nigra') return ['kolonna', 'col'];
    if (['Pinus', 'Picea', 'Juniperus', 'Taxodium', 'Metasequoia', 'Abies', 'Cedrus'].includes(gn)) return ['igna', 'cone'];
    if (PHEN[lat]?.f) return ['gul', c >= 10 ? 'round' : 'oval'];
    return c >= 10 ? ['yirik', 'round'] : c >= 6 ? ['orta', 'oval'] : ['kichik', 'oval'];
  };
  C.trees.forEach((t, i) => { if (!inside(t.p)) return; const dcs = PL?.decisions[i]; if (dcs === 'kesiladi' || dcs === 'kochiriladi') return; const c = Math.max(3, t.c || 6), lat = SPECIES[t.sp]?.[0] ?? '', [key, fm] = formOfLat(lat, c); tree(t.p, c, t.h || c * 1.2, key, undefined, fm); });
  for (const t of PL?.trees ?? []) if (inside(t.p)) tree(t.p, t.crown, t.crown * 1.1, symOf(t.sp), PHEN[t.sp.lat]?.fc, /babylonica/.test(t.sp.lat) ? 'weep' : undefined);
  for (const s2 of PL?.shrubs ?? []) if (inside(s2.p)) shrub(s2.p, PHEN[s2.sp.lat]?.fc);
  // jihozlar — quti (aylanish bilan)
  for (const fu of V.furn ?? []) {
    if (!inside(fu.p)) continue; const f = furnById(fu.id); if (!f) continue; const col = FCATS[f.cat].c, { z } = at(fu.p), hh = Math.max(0.15, f.h) * Math.min(ex, 1.2);
    const ca = Math.cos(fu.a), sn = Math.sin(fu.a), cor = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([u, w]) => { const q: XY = [fu.p[0] + (u * f.w / 2) * ca - (w * f.d / 2) * sn, fu.p[1] + (u * f.w / 2) * sn + (w * f.d / 2) * ca]; return toAB(q); });
    const sides = cor.map((p1, t) => { const p2 = cor[(t + 1) % 4]; return { d: p1[0] + p2[0] + p1[1] + p2[1], g: `<polygon points="${pts([P(p1[0], p1[1], z), P(p2[0], p2[1], z), P(p2[0], p2[1], z + hh), P(p1[0], p1[1], z + hh)])}" fill="${shade(col, 0.82)}" stroke="${shade(col, 0.6)}" stroke-width=".5"/>` }; }).sort((p, q) => p.d - q.d);
    const ctr = toAB(fu.p);
    objs.push({ d: ctr[0] + ctr[1], g: `<g class="f" style="--d:${dv(ctr[0], ctr[1], z + hh / 2)}">` + sides.map(x => x.g).join('') + `<polygon points="${pts(cor.map(p => P(p[0], p[1], z + hh)))}" fill="${shade(col, 1.25)}" stroke="${shade(col, 0.6)}" stroke-width=".5"/></g>` });
  }
  // odamlar — Koʻchasoz siluetlari (ua.json), yoʻl turi va zonaga qarab (illyustrativ zichlik, T)
  {
    const Rr = rng(11), PC = ['#3f3d3b', '#4a4846', '#55524f'];   // toʻq kulrang (foydalanuvchi talabi, 15.11)
    const WALK = ['ayol_yurgan', 'erkak_yurgan', 'ayol_sumka', 'erkak_2', 'erkak_3', 'ayol_koylak', 'qariya', 'ryukzak', 'telefon', 'ayol_palto', 'erkak_palto', 'ayol_sumka2', 'erkak_4'];
    const VELO = ['velo_sport', 'velo_1', 'velo_2', 'velo_ryukzak', 'velo_savat'], KIDS = ['ona_bola', 'aravacha', 'velo_bola', 'qol_kotargan'], SIT = ['otirgan_stul', 'otirgan_blok'], STAND = ['erkak_turgan', 'qol_kotargan', 'telefon', 'erkak_2'];
    const HT: Record<string, number> = { otirgan_stul: 1.3, otirgan_blok: 1.25, it: 0.55, velo_bola: 1.3, qol_kotargan: 1.75 };
    const pick = (L: string[]) => L[Math.floor(Rr() * L.length)];
    let nP = 0; const MAXP = 140;
    const fig = (nm: string, a: number, b: number, faceL: boolean) => {
      const f = UA[nm]; if (!f || a < 0 || b < 0 || a > A || b > B || nP >= MAXP) return; nP++;
      const z = zAB(a, b), [px, py] = P(a, b, z), hp = (HT[nm] ?? (nm.startsWith('velo') ? 1.75 : 1.72)) * k, sc = hp / f.h, c = PC[Math.floor(Rr() * PC.length)], w = f.w * sc;
      const g = `<g class="h" style="--d:${dv(a, b, z + 0.9)}"><ellipse class="dec" cx="${r1(px + w * 0.12)}" cy="${r1(py)}" rx="${r1(Math.max(w * 0.45, hp * 0.18))}" ry="${r1(hp * 0.07)}" fill="#1f2a1c" fill-opacity=".16"/><g transform="translate(${r1(px)} ${r1(py)}) scale(${(faceL ? -sc : sc).toFixed(4)} ${sc.toFixed(4)}) translate(${-f.ox} ${-f.oy})">${f.d.map(q => `<path d="${q[0]}" fill="${q[1] ? '#d9d6d2' : c}"/>`).join('')}</g></g>`;
      objs.push({ d: a + b + 0.01, g });
    };
    // yoʻllar boʻylab: qadam va kim — yoʻl turiga qarab
    const SP: Partial<Record<string, number>> = { asosiy: 9, promenada: 8, ikkinchi: 14, aralash: 12, sohil: 13, velo: 18, yugurish: 24, pastil: 16, soqmoq: 30, ekotropa: 30, rampa: 16 };
    for (const p of PS) {
      const st = SP[p.tier]; if (!st) continue; let acc = st * Rr();
      for (let t = 1; t < p.g.length; t++) { const q0 = p.g[t - 1], q1 = p.g[t], L = Math.hypot(q1[0] - q0[0], q1[1] - q0[1]); if (!L) continue;
        while (acc <= L) { const u = acc / L, off = (Rr() - 0.5) * p.w * 0.6, nx = -(q1[1] - q0[1]) / L, ny = (q1[0] - q0[0]) / L, q: XY = [q0[0] + (q1[0] - q0[0]) * u + nx * off, q0[1] + (q1[1] - q0[1]) * u + ny * off]; acc += st * (0.6 + Rr() * 0.8);
          if (!inside(q) || Rr() < 0.3) continue; const [a, b] = toAB(q), [a1, b1] = toAB(q1), fwd = Rr() < 0.5, faceL = ((a1 - a) - (b1 - b) < 0) === fwd, r = Rr();
          const nm = p.tier === 'velo' ? pick(VELO) : p.tier === 'yugurish' ? 'yuguruvchi' : p.tier === 'aralash' ? (r < 0.45 ? pick(VELO) : pick(WALK)) : r < 0.07 ? 'samokat' : r < 0.12 ? 'aravacha' : pick(WALK);
          fig(nm, a, b, faceL); if (r > 0.92 && p.tier !== 'velo') fig('it', a + 0.7, b - 0.4, faceL); } acc -= L; }
    }
    // zonalar ichida: oʻtiradiganlar, bolalar, sport, it sayri
    const ZP: [string[], string[], number][] = [[['amfiteatr', 'terrasa', 'piknik', 'tadbir', 'sokin_bog', 'sohil_pogona'], SIT, 0.22], [['bolalar', 'oyin_tabiiy', 'suv_oyin', 'qumlik'], KIDS, 0.16], [['sport_mavjud', 'sport_yangi', 'workout', 'skeyt'], [...STAND, 'yuguruvchi'], 0.07], [['it_maydon'], ['it', 'erkak_turgan', 'ayol_yurgan'], 0.1], [['maydon', 'suv_maydon', 'jamoat_bogi'], [...STAND, ...WALK], 0.06], [['otloq', 'tepalik'], SIT, 0.012]];
    for (const [keys, L, pr] of ZP) for (const key of keys) for (const [a, b] of keyCells[key] ?? []) if (Rr() < pr * sa * sb / 9) fig(pick(L), a + (Rr() - 0.5) * sa, b + (Rr() - 0.5) * sb, Rr() < 0.5);
    for (const q of hardPts) if (Rr() < 0.025 * sa * sb / 9) { const [a, b] = toAB(q); fig(pick([...WALK, ...STAND]), a, b, Rr() < 0.5); }
  }
  objs.sort((p, q) => p.d - q.d);
  // ---- yorliqlar ----
  let lab = ''; const legend: AksoOut['legend'] = [];
  if (R.labels !== false) {
    let no = 0;
    for (const [key, u] of [...used.entries()].sort((p, q) => q[1].cnt - p[1].cnt).slice(0, 9)) {
      if (u.cnt < 3) continue; no++; const a = u.sa / u.cnt + sa / 2, b = u.sb / u.cnt + sb / 2, z = zAB(a, b), [px, py] = P(a, b, z), ty = py - (28 + (no % 3) * 14);
      lab += `<line x1="${r1(px)}" y1="${r1(py)}" x2="${r1(px)}" y2="${r1(ty)}" stroke="#151413" stroke-width=".8"/><circle cx="${r1(px)}" cy="${r1(py)}" r="2" fill="#151413"/><circle cx="${r1(px)}" cy="${r1(ty - 7)}" r="8" fill="#fff" stroke="#151413" stroke-width="1"/><text x="${r1(px)}" y="${r1(ty - 3.5)}" font-size="10" font-weight="700" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" fill="#151413">${no}</text>`;
      legend.push({ n: `${no}. ${u.n}`, c: u.c }); void key;
    }
    const tiers = new Set(V.paths.filter(p => p.g.some(inside)).map(p => p.tier)); if (hardPts.length) legend.push({ n: [...tiers].map(t => TIERS[t]?.n).filter(Boolean).slice(0, 3).join(', ') || 'Qattiq qoplama', c: '#efe6d4' });
  }
  // ---- yigʻish ----
  const zmax = Math.max(...Array.from(Z)), all = [P(0, 0, 0), P(A, 0, 0), P(A, B, 0), P(0, B, 0), P(A, B, -DEPTH), P(0, 0, zmax + 16), P(A, 0, zmax + 16), P(0, B, zmax + 16)];
  const minX = Math.min(...all.map(p => p[0])) - 20, maxX = Math.max(...all.map(p => p[0])) + 20, minY = Math.min(...all.map(p => p[1])) - 40, maxY = Math.max(...all.map(p => p[1])) + 20;
  const LH = 17, legH = legend.length ? legend.length * LH + 30 : 0, maxY2 = maxY + Math.max(0, legH - 120);
  const W = maxX - minX, H = maxY2 - minY;
  const FF = 'font-family="Arial, Helvetica, sans-serif"';
  let leg = R.title ? `<text x="${r1(minX + 16)}" y="${r1(minY + 26)}" font-size="18" font-weight="700" ${FF} fill="#151413">${R.title.replace(/[<&>]/g, '')}</text>` : '';
  if (legend.length) { const lx = minX + 16, ly = maxY2 - legH + 10; leg += legend.map((l, i) => `<rect x="${r1(lx)}" y="${r1(ly + i * LH)}" width="22" height="11" rx="2" fill="${l.c}" stroke="#8c847a" stroke-width=".5"/><text x="${r1(lx + 30)}" y="${r1(ly + i * LH + 10)}" font-size="12" ${FF} fill="#151413">${l.n.replace(/[<&>]/g, '')}</text>`).join('') + `<text x="${r1(lx)}" y="${r1(ly + legend.length * LH + 12)}" font-size="10" ${FF} fill="#77716c">Aksonometriya · vertikal masshtab ×${String(ex).replace('.', ',')} · ${r1(R.w)} × ${r1(R.d)} m</text>`; }
  // shimol koʻrsatkichi (dunyo +y)
  const nA = toAB([x0, y0 + 1]), nB = toAB([x0, y0]), [n1x, n1y] = P(nA[0], nA[1], 0), [n0x, n0y] = P(nB[0], nB[1], 0), nl = Math.hypot(n1x - n0x, n1y - n0y) || 1, nx = (n1x - n0x) / nl, ny = (n1y - n0y) / nl;
  const NX = maxX - 40, NY = minY + 45;
  const north = `<g><line x1="${r1(NX - nx * 18)}" y1="${r1(NY - ny * 18)}" x2="${r1(NX + nx * 18)}" y2="${r1(NY + ny * 18)}" stroke="#151413" stroke-width="1.6" marker-end="url(#akN)"/><text x="${r1(NX + nx * 30)}" y="${r1(NY + ny * 30 + 4)}" font-size="12" font-weight="700" text-anchor="middle" font-family="Arial, Helvetica, sans-serif">N</text></g>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${r1(minX)} ${r1(minY)} ${r1(W)} ${r1(H)}" width="${Math.round(W)}" height="${Math.round(H)}"><defs>${[...usedG].map(kk => { const [c0, c1, c2] = TPAL[kk]; return `<linearGradient id="akG${kk}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c2}"/><stop offset=".45" stop-color="${c0}"/><stop offset="1" stop-color="${c1}"/></linearGradient>`; }).join('')}<pattern id="akPave" width="9" height="5.2" patternUnits="userSpaceOnUse" patternTransform="skewX(-30)"><path d="M0 0H9M0 0V5.2" stroke="#ffffff" stroke-opacity=".45" stroke-width=".7" fill="none"/></pattern><marker id="akN" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" fill="#151413"/></marker></defs><rect x="${r1(minX)}" y="${r1(minY)}" width="${r1(W)}" height="${r1(H)}" fill="#ffffff"/>${side}${ground}${objs.map(o => o.g).join('')}<g class="dec">${lab}${north}${leg}</g></svg>`;
  // render uchun qisqa tavsif (modelga — inglizcha; joylashuvni oʻzgartirmaslik talabi bilan)
  const nT = (PL?.trees ?? []).filter(t => inside(t.p)).length + C.trees.filter((t, i) => inside(t.p) && PL?.decisions[i] !== 'kesiladi' && PL?.decisions[i] !== 'kochiriladi').length;
  const spp = new Map<string, number>(); for (const t of PL?.trees ?? []) if (inside(t.p)) spp.set(t.sp.lat, (spp.get(t.sp.lat) ?? 0) + 1);
  const topSp = [...spp.entries()].sort((p, q) => q[1] - p[1]).slice(0, 4).map(([n]) => n).join(', ');
  const tiersIn = [...new Set(V.paths.filter(p => p.g.some(inside)).map(p => p.tier))];
  const EN: Record<string, string> = { asosiy: 'stone main alley', ikkinchi: 'paved paths', soqmoq: 'gravel footpaths', sohil: 'timber shore walk', pastil: 'timber boardwalk', velo: 'bike lane with white centre line', aralash: 'shared walk-cycle path', yugurish: 'red running track', ekotropa: 'mulch nature trail', promenada: 'waterfront promenade', zina: 'steps', rampa: 'ramps', servis: 'grass-grid fire lane' };
  const hint = [`Landscape park, isometric cut-block illustration: ${nT} trees${topSp ? ` (${topSp})` : ''}`, waterCells.length ? 'lake with reed edges' : '', tiersIn.map(t => EN[t]).filter(Boolean).join(', '), keyCells.otloq ? 'wildflower meadow' : '', (keyCells.sport_yangi || keyCells.sport_mavjud) ? 'sports courts' : '', keyCells.bolalar ? 'playground' : '', 'keep every tree, path, water edge and building exactly in place; do not add or remove objects'].filter(Boolean).join('; ').slice(0, 400);
  return { svg, w: W, h: H, legend, hint };
}
