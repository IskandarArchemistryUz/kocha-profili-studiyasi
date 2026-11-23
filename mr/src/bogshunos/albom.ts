/**
 * Bogʻshunos · Loyiha albomi (14.11.2026) — Bogʻshunosning oʻz «Varaqlar» boʻlimi (Koʻchasoz «Loyiha albomi» usulida, js/ks-albom.js).
 * Landshaft master reja natijalaridan A3 varaqlar toʻplami: har varaq — SVG (mm), ramka va asosiy yozuv (shtamp) bilan; PDF — ui/pdf.
 * Varaq faqat oʻz qadami hisoblangan boʻlsa chiqadi (maʼlumotsiz varaq yoʻq). Chegara doim qizil.
 * Raqamlar faqat hisobdan; N — norma (ShNQ 2.07.01-23, asl matndan), P — taxmin, A — xorijiy orientir, T — talqin.
 */
import type { BgData, BgSite, MPoly, Ring, Variant, XY } from './types';
import type { Ctx, Analysis } from './analyze';
import type { DesignOut } from './design';
import { Grid, bbox, fillPoly, threshold, contour, distLine, area, len } from './grid';
import { REGISTRY_CITE } from './load';
import { plant } from './planting';
import { ASSORT, ASSORT_CITE, PHEN } from './assort';
import { PLAN, TPAL, csym, symOf, type PlanKey } from './symbols';
import { furnById, FCATS } from './library';
import { sectionLines, profile, drawSection, shores, drawTypology, mainLake, SHORE, type ShoreT } from './kesim';
import { fauna, habRings, HAB, FAUNA_CITE } from './fauna';
import { nets, NET, NKS } from './nets';
import { smeta, GRP, type Price } from './cost';
import { applyTreeEdits, type Edit } from './edits';
import { akso, type AksoReq } from './akso';
import type { VPart } from './vertikal';
import { TIERS, TIER_ORD, ZONES } from './catalog';

export interface AlbomSrc {
  site: BgSite; data: BgData; C: Ctx; A: Analysis; cls: Uint8Array;
  D: Partial<Record<'A' | 'B' | 'C', DesignOut>>; chosen: 'A' | 'B' | 'C';
  author?: string; date?: string;
  /** narx kitobi (foydalanuvchi tahriri); berilmasa — boshlangʻich */
  prices?: Price[];
  /** qoʻlda tahrirlar (daraxt qoʻyish / olib tashlash ekishga qoʻllanadi) */
  edits?: Edit[];
  /** topshiriq (maqsad, byudjet, foydalanuvchilar, saqlanadigan obyektlar) */
  brief?: { goal: string; budget: number | null; users: string[]; keep: string };
  /** saqlangan aksonometriyalar (hudud toʻrtburchagi, koʻrinish) */
  akso?: AksoReq[];
  /** vertikal rejalash: loyiha relyefi (Ctx nusxasi) va yer balansi */
  CG?: { C: Ctx; cut: number; fill: number; parts: VPart[] };
}
export interface AlbomSheet { id: string; title: string; svg: string; w: number; h: number }

/* ---------- varaq: A3, ramka va shtamp (Koʻchasoz albomi bilan bir xil) ---------- */
const PW = 420, PH = 297, FR = { x: 20, y: 5, w: 395, h: 287 }, STW = 185, STH = 40;
const WORK = { x: FR.x + 6, y: FR.y + 18, w: FR.w - 12, h: FR.h - 18 - STH - 5 };
/** Reja varaqlari: reja chapda varaqning toʻliq balandligida (shtamp oʻng-pastda), maʼlumot oʻngda shtamp ustida */
const PL = { x: WORK.x, y: WORK.y, w: 198, h: FR.y + FR.h - 4 - WORK.y }, X2 = PL.x + PL.w + 8, W2 = FR.x + FR.w - 6 - X2;
const SCALES = [200, 250, 500, 1000, 2000, 2500, 5000, 10000, 20000];
export const RED = '#d62828';
const K = { ink: '#151413', mut: '#77716c', line: '#d9d4ce', soft: '#f3f1ee', land: '#efede9', block: '#d9d4cd', green: '#c9dcc0', green2: '#7fa874', water: '#cbdde3', waterL: '#8fb3c1', acc: '#c0643a', acc2: '#3f6fa8', acc3: '#c9a227', ok: '#3c8a5a' };
const FF = 'Arial, Helvetica, sans-serif';

const f2 = (v: number) => (Math.round(v * 100) / 100).toString();
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
export const fmt = (v: number, d = 0): string => { const s = Math.abs(v).toFixed(d).split('.'); s[0] = s[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' '); return (v < 0 ? '−' : '') + s.join(','); };
const dec = (s: string) => s.replace(/(\d)\.(\d)/g, '$1,$2');
interface TO { s?: number; w?: number; a?: 'start' | 'middle' | 'end'; c?: string; i?: boolean }
const T = (x: number, y: number, s: unknown, o: TO = {}) => `<text x="${f2(x)}" y="${f2(y)}" font-size="${o.s ?? 3}" font-family="${FF}"${o.w ? ` font-weight="${o.w}"` : ''}${o.a ? ` text-anchor="${o.a}"` : ''}${o.i ? ' font-style="italic"' : ''} fill="${o.c ?? K.ink}">${esc(s)}</text>`;
const R = (x: number, y: number, w: number, h: number, f = 'none', s = K.ink, sw = 0.35, ex = '') => `<rect x="${f2(x)}" y="${f2(y)}" width="${f2(Math.max(0, w))}" height="${f2(Math.max(0, h))}" fill="${f}" stroke="${s}" stroke-width="${sw}"${ex}/>`;
const L = (x1: number, y1: number, x2: number, y2: number, s = K.ink, sw = 0.25, ex = '') => `<line x1="${f2(x1)}" y1="${f2(y1)}" x2="${f2(x2)}" y2="${f2(y2)}" stroke="${s}" stroke-width="${sw}"${ex}/>`;
/** Matnni kenglikka boʻlib yozish */
function para(x: number, y: number, w: number, txt: string, fs = 2.8, lh = 1.4, c = K.ink, max = 99): { g: string; h: number } {
  const n = Math.max(8, Math.floor(w / (fs * 0.5))), out: string[] = []; let line = '';
  for (const wd of txt.split(/\s+/)) { if ((line + ' ' + wd).trim().length > n) { out.push(line.trim()); line = wd; } else line += ' ' + wd; }
  if (line.trim()) out.push(line.trim());
  const ls = out.slice(0, max); return { g: ls.map((l, i) => T(x, y + fs + i * fs * lh, l, { s: fs, c })).join(''), h: ls.length * fs * lh + fs * 0.4 };
}
/** Jadval: cols — [sarlavha, kenglik mm, tekislash] */
function table(x: number, y: number, cols: [string, number, ('l' | 'r' | 'c')?][], rows: string[][], o: { rh?: number; fs?: number } = {}): { g: string; h: number } {
  const rh = o.rh ?? 5.2, fs = o.fs ?? 2.4, W = cols.reduce((a, c) => a + c[1], 0);
  let g = R(x, y, W, rh, K.soft, K.ink, 0.25), cx = x;
  cols.forEach(([t, w, al]) => { g += T(al === 'r' ? cx + w - 1.2 : al === 'c' ? cx + w / 2 : cx + 1.2, y + rh * 0.68, t, { s: fs * 0.92, w: 700, a: al === 'r' ? 'end' : al === 'c' ? 'middle' : 'start' }); cx += w; });
  rows.forEach((r, i) => {
    const yy = y + rh * (i + 1); cx = x;
    r.forEach((v, j) => { const [, w, al] = cols[j] ?? ['', 20]; const col = v === '✓' ? K.ok : v === '✗' ? RED : K.ink; g += T(al === 'r' ? cx + w - 1.2 : al === 'c' ? cx + w / 2 : cx + 1.2, yy + rh * 0.68, v, { s: fs, a: al === 'r' ? 'end' : al === 'c' ? 'middle' : 'start', c: col, w: v === '✓' || v === '✗' ? 700 : undefined }); cx += w; });
    g += L(x, yy + rh, x + W, yy + rh, K.line, 0.2);
  });
  return { g: g + R(x, y, W, rh * (rows.length + 1), 'none', K.ink, 0.3), h: rh * (rows.length + 1) };
}
interface LegIt { t: 'fill' | 'line' | 'dash' | 'dot' | 'x'; c: string; s?: string; l: string }
function legend(x: number, y: number, items: LegIt[], title = 'Shartli belgilar', fs = 2.3): { g: string; h: number } {
  const lh = fs * 1.45; let g = T(x, y + fs, title, { s: fs * 1.05, w: 700 });
  items.forEach((it, k) => {
    const cy = y + fs * 2.4 + k * lh;
    if (it.t === 'line' || it.t === 'dash') g += L(x, cy, x + 7, cy, it.c, 0.7, it.t === 'dash' ? ' stroke-dasharray="1.2 0.8"' : '');
    else if (it.t === 'dot') g += `<circle cx="${f2(x + 3.5)}" cy="${f2(cy)}" r="1.2" fill="${it.c}" stroke="${it.s ?? 'none'}" stroke-width=".15"/>`;
    else if (it.t === 'x') g += L(x + 2.3, cy - 1.2, x + 4.7, cy + 1.2, it.c, 0.45) + L(x + 2.3, cy + 1.2, x + 4.7, cy - 1.2, it.c, 0.45);
    else g += R(x, cy - 1.3, 7, 2.6, it.c, it.s ?? K.mut, 0.12);
    g += T(x + 9, cy + fs * 0.35, it.l, { s: fs });
  });
  return { g, h: fs * 2.4 + items.length * lh };
}

/* ---------- proyeksiya (shimol tepada) ---------- */
interface Pj { p: (q: XY) => [number, number]; k: number; N: number; d: (r: Ring[]) => string; ln: (l: XY[]) => string }
/** N berilsa — aniq masshtab 1:N (markazda); berilmasa — katakka sigʻadigan eng kichik standart masshtab */
function proj(bb: [number, number, number, number], r: { x: number; y: number; w: number; h: number }, N?: number, free = false): Pj {
  const bw = bb[2] - bb[0], bh = bb[3] - bb[1], need = Math.max(bw / r.w, bh / r.h) * 1000;
  const NN = N ?? (free ? need : (SCALES.find(s => s >= need) ?? Math.ceil(need / 1000) * 1000)), k = 1000 / NN;
  const cx = (bb[0] + bb[2]) / 2, cy = (bb[1] + bb[3]) / 2, ox = r.x + r.w / 2, oy = r.y + r.h / 2;
  const p = (q: XY): [number, number] => [ox + (q[0] - cx) * k, oy - (q[1] - cy) * k];
  const seg = (l: XY[]) => l.map((q, i) => { const a = p(q); return (i ? 'L' : 'M') + f2(a[0]) + ' ' + f2(a[1]); }).join('');
  return { p, k, N: NN, d: rr => rr.map(x => seg(x) + 'Z').join(''), ln: seg };
}
let CL = 0;
const clip = (r: { x: number; y: number; w: number; h: number }, inner: string) => { const id = `bgk${++CL}`; return `<clipPath id="${id}"><rect x="${f2(r.x)}" y="${f2(r.y)}" width="${f2(r.w)}" height="${f2(r.h)}"/></clipPath><g clip-path="url(#${id})">${inner}</g>`; };
const fillD = (d: string, f: string, ex = '') => (d ? `<path d="${d}" fill="${f}" fill-rule="evenodd"${ex}/>` : '');
const strokeD = (d: string, c: string, w: number, ex = '') => (d ? `<path d="${d}" fill="none" stroke="${c}" stroke-width="${f2(w)}" stroke-linejoin="round" stroke-linecap="round"${ex}/>` : '');
const mp = (P: Pj, g: MPoly) => g.map(poly => P.d(poly)).join('');
const expand = (bb: [number, number, number, number], m: number): [number, number, number, number] => [bb[0] - m, bb[1] - m, bb[2] + m, bb[3] + m];
function scaleBar(x: number, y: number, P: Pj): string {
  const m = [5, 10, 20, 25, 50, 100, 200, 250, 500, 1000].find(v => v * P.k >= 22) ?? 1000, w = m * P.k;
  return R(x, y, w / 2, 1.1, K.ink, K.ink, 0.15) + R(x + w / 2, y, w / 2, 1.1, '#fff', K.ink, 0.15) + T(x, y - 1, '0', { s: 2 }) + T(x + w, y - 1, `${m} m`, { s: 2, a: 'end' }) + T(x, y + 4, `M 1:${fmt(Math.round(P.N))}`, { s: 2.2, w: 700 });
}
const north = (x: number, y: number) => `<path d="M${f2(x)} ${f2(y)}l2 5l-2 -1.4l-2 1.4Z" fill="${K.ink}"/>` + T(x, y + 8.5, 'N', { s: 2.4, w: 700, a: 'middle' });

/* ---------- xarita qatlamlari ---------- */
function base(S: AlbomSrc, P: Pj, o: { grass?: boolean; trees?: 'full' | 'faint' | false; paths?: boolean } = {}): string {
  const C = S.C; let g = '';
  if (o.grass !== false) { let gr = ''; for (const f of S.data.osm) if (f.kind === 'pg' && f.k === 'landuse' && f.v === 'grass') gr += fillD(mp(P, f.g as MPoly), K.green, ' fill-opacity=".6"'); const id = `bgs${++CL}`; g += `<clipPath id="${id}"><path d="${P.d([S.site.boundary])}"/></clipPath><g clip-path="url(#${id})">${gr}</g>`; }
  for (const l of C.lakes) g += fillD(mp(P, l), K.water, ` stroke="${K.waterL}" stroke-width=".15"`);
  for (const c of C.canals) g += strokeD(P.ln(c), K.waterL, Math.max(0.5, 5 * P.k));
  for (const b of C.blds) g += fillD(mp(P, b), K.block, ` stroke="${K.mut}" stroke-width=".12"`);
  if (o.paths) for (const p of C.paths) g += strokeD(P.ln(p.g), '#fff', Math.max(0.35, 2.5 * P.k)) + strokeD(P.ln(p.g), K.mut, 0.1);
  if (o.trees) for (const t of C.trees) { const [x, y] = P.p(t.p); g += `<circle cx="${f2(x)}" cy="${f2(y)}" r="${f2(Math.max(0.3, Math.max(1.5, t.c / 2) * P.k))}" fill="${K.green2}" fill-opacity="${o.trees === 'faint' ? '.25' : '.55'}"/>`; }
  return g;
}
const border = (S: AlbomSrc, P: Pj, w = 0.6) => strokeD(P.d([S.site.boundary]), RED, w);
const maskD = (P: Pj, G: Grid, m: Uint8Array) => P.d(contour(G, m, 2));
/** Chegaradan aniq (evklid) masofa chiziqlari */
function offsets(S: AlbomSrc, Rs: number[]): Ring[][] {
  const B = S.site.boundary, ring = [...B, B[0]], G = Grid.around(bbox(B), 10, Math.max(...Rs) + 40), m = G.u8(); fillPoly(G, m, [B]);
  const d = new Float32Array(G.n); for (let k = 0; k < G.n; k++) d[k] = m[k] ? 0 : distLine([G.cx(k % G.nx), G.cy((k / G.nx) | 0)], ring);
  return Rs.map(v => contour(G, threshold(d, v), 3));
}
const siteBB = (S: AlbomSrc, m = 15) => expand(bbox(S.site.boundary), m);

/** Varaq ichidagi kichik xarita: sarlavha + chizma (ramkasiz) */
function panel(x: number, y: number, w: number, h: number, title: string, sub: string, draw: (r: { x: number; y: number; w: number; h: number }) => string): string {
  const r = { x, y: y + 9, w, h: h - 9 };
  return T(x, y + 3.6, title, { s: 3.2, w: 700 }) + T(x, y + 7.4, sub, { s: 2.3, c: K.mut }) + draw(r);
}

/* ---------- shartli belgilar (DWG kutubxonasidan) ---------- */
/** Plan belgisi: markaz (x, y), radius r (mm); chiziq qalinligi mm da saqlanadi */
const sym = (k: PlanKey, x: number, y: number, r: number, stroke: string, fill: string) => `<circle cx="${f2(x)}" cy="${f2(y)}" r="${f2(r)}" fill="${fill}" fill-opacity="${fill === 'none' ? 0 : 0.85}" stroke="none"/><g transform="translate(${f2(x)} ${f2(y)}) scale(${(Math.round(r * 1000) / 1000).toString()})"><path d="${PLAN[k].d}" fill="none" stroke="${stroke}" stroke-width="${f2(0.12 / Math.max(0.2, r)) || 0.3}"/></g>`;

/* ---------- muqova renderi: illyustrativ reja (soyalar, gradientlar; filtrsiz — PDF bilan mos) ---------- */
function render(S: AlbomSrc, V: Variant, P: Pj, PLT: ReturnType<typeof plant>): string {
  const C = S.C, id = `bgr${++CL}`, sh = 0.35 + 0.5 * P.k;   // soya siljishi (quyosh janubi-gʻarbdan, T)
  let g = `<defs><radialGradient id="${id}t" cx=".38" cy=".35" r=".7"><stop offset="0" stop-color="#9cc47e"/><stop offset=".7" stop-color="#5f9450"/><stop offset="1" stop-color="#3f6f3a"/></radialGradient>`
    + `<radialGradient id="${id}n" cx=".38" cy=".35" r=".7"><stop offset="0" stop-color="#c9e2a6"/><stop offset="1" stop-color="#7fae63"/></radialGradient>`
    + `<linearGradient id="${id}w" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#bfe0ea"/><stop offset="1" stop-color="#6fa5ba"/></linearGradient>`
    + `<clipPath id="${id}c"><path d="${P.d([S.site.boundary])}"/></clipPath></defs>`;
  g += fillD(P.d([S.site.boundary]), '#e9efd9');
  let inner = '';
  for (const f of S.data.osm) if (f.kind === 'pg' && f.k === 'landuse' && f.v === 'grass') inner += fillD(mp(P, f.g as MPoly), '#cfe2b2');
  if (V.prog.otloq) inner += fillD(mp(P, V.prog.otloq), '#e4e7b4');
  for (const [k, c] of [['botqoq', '#9cc7b1'], ['yomgir_bogi', '#8fc0a6'], ['bolalar', '#f1cf9b'], ['sport_mavjud', '#cbbfdf'], ['sport_yangi', '#b9a7d9'], ['amfiteatr', '#e8c39c'], ['terrasa', '#dbb48c']] as const) if (V.prog[k]) inner += fillD(mp(P, V.prog[k]), c);
  g += `<g clip-path="url(#${id}c)">${inner}</g>`;
  for (const l of C.lakes) g += fillD(mp(P, l), `url(#${id}w)`) + strokeD(mp(P, l), '#f6fbfc', 0.5, ' stroke-opacity=".8"');
  for (const c of C.canals) g += strokeD(P.ln(c), '#7fb0c2', Math.max(0.6, 5 * P.k));
  for (const b of C.blds) g += fillD(mp(P, b), '#000', ` fill-opacity=".18" transform="translate(${f2(sh * 1.5)} ${f2(sh * 1.5)})"`) + fillD(mp(P, b), '#f4f1ec', ' stroke="#9b958d" stroke-width=".12"');
  for (const p of V.paths) g += strokeD(P.ln(p.g), '#f7efe0', Math.max(0.25, p.w * P.k + 0.15));
  for (const b of V.bridges) g += strokeD(P.ln(b.g), '#6b5a48', b.w * P.k + 0.35) + strokeD(P.ln(b.g), '#d8c1a0', b.w * P.k);
  const trees: { p: XY; r: number; n: boolean; k?: PlanKey; fc?: string }[] = [];
  C.trees.forEach((t, i) => { const d = PLT.decisions[i]; if (d === 'saqlanadi' || d === 'yol_suriladi') trees.push({ p: t.p, r: Math.max(1.5, t.c / 2), n: false }); });
  for (const t of PLT.trees) trees.push({ p: t.p, r: t.crown / 2, n: true, k: symOf(t.sp), fc: PHEN[t.sp.lat]?.fc });
  trees.sort((a, b) => b.p[1] - a.p[1]);
  let shd = '', can = '';
  for (const t of trees) { const [x, y] = P.p(t.p), r = Math.max(0.35, t.r * P.k); shd += `<circle cx="${f2(x + sh)}" cy="${f2(y + sh)}" r="${f2(r)}"/>`; can += t.k ? csym(t.k, x, y, r, { fc: t.fc }) : `<circle cx="${f2(x)}" cy="${f2(y)}" r="${f2(r)}" fill="url(#${id}t)" stroke="#335a30" stroke-width=".06"/>`; }
  g += `<g fill="#1f3a1c" fill-opacity=".22">${shd}</g>${can}`;
  return g + border(S, P, 0.5);
}

/* ---------- variant chizish ---------- */
const PROG: [string, string, string][] = [['otloq', '#e3ecc4', 'Oʻtloq (kam oʻriladigan)'], ['botqoq', '#b9d9cf', 'Botqoq qirgʻoq'], ['yomgir_bogi', '#a9cdb9', 'Yomgʻir bogʻi'], ['bolalar', '#f4c98f', 'Bolalar maydoni'], ['sport_mavjud', '#c9b8e0', 'Sport (mavjud)'], ['sport_yangi', '#a891cf', 'Sport (yangi)'], ['amfiteatr', '#e7b98e', 'Amfiteatr'], ['terrasa', '#d9a77a', 'Terrasa'], ['qushxona', '#8e7a5a', 'Qushlarni kuzatish joyi'], ...(Object.entries(ZONES) as [string, { c: string; n: string }][]).filter(([k]) => !['otloq', 'botqoq', 'yomgir_bogi', 'bolalar', 'sport_yangi'].includes(k)).map(([k, d]) => [k, d.c, d.n] as [string, string, string])];
const TIER: Record<string, [string, string]> = Object.fromEntries(Object.entries(TIERS).map(([k, d]) => [k, [d.c, d.n]]));
const ORD: string[] = TIER_ORD;
function plan(S: AlbomSrc, V: Variant, P: Pj, o: { trees?: 'full' | 'faint'; gates?: boolean; items?: boolean } = {}): string {
  let g = base(S, P, { trees: o.trees ?? 'faint' });
  for (const [k, c] of PROG) if (V.prog[k]) g += fillD(mp(P, V.prog[k]), c, ` stroke="${K.mut}" stroke-width=".08"`);
  for (const t of ORD) for (const p of V.paths.filter(q => q.tier === t)) g += strokeD(P.ln(p.g), '#8c7f6e', Math.max(0.3, p.w * P.k + 0.3));
  for (const t of ORD) for (const p of V.paths.filter(q => q.tier === t)) g += strokeD(P.ln(p.g), TIER[t][0], Math.max(0.15, p.w * P.k), t === 'zina' ? ' stroke-dasharray=".25 .18"' : p.style === 'punktir' ? ` stroke-dasharray="${f2(Math.max(0.5, p.w * P.k * 1.6))} ${f2(Math.max(0.35, p.w * P.k))}" stroke-linecap="butt"` : '');
  for (const b of V.bridges) g += strokeD(P.ln(b.g), K.ink, b.w * P.k + 0.3) + strokeD(P.ln(b.g), '#fff', b.w * P.k);
  for (const l of V.marks ?? []) g += strokeD(P.ln(l), '#ffffff', 0.12);
  for (const fu of V.furn ?? []) { const f = furnById(fu.id); if (!f) continue; const [x, y] = P.p(fu.p), w = Math.max(0.5, f.w * P.k), d = Math.max(0.35, f.d * P.k), c = FCATS[f.cat].c;
    g += f.shape === 'circle' ? `<circle cx="${f2(x)}" cy="${f2(y)}" r="${f2(Math.max(0.35, f.w / 2 * P.k))}" fill="${c}" stroke="${K.ink}" stroke-width=".08"/>` : `<rect x="${f2(-w / 2)}" y="${f2(-d / 2)}" width="${f2(w)}" height="${f2(d)}" rx=".08" fill="${c}" stroke="${K.ink}" stroke-width=".08" transform="translate(${f2(x)} ${f2(y)}) rotate(${f2(-fu.a * 180 / Math.PI)})"/>`; }
  if (o.gates !== false) for (const gt of V.gates) { const [x, y] = P.p(gt.p); g += `<circle cx="${f2(x)}" cy="${f2(y)}" r="${gt.main ? 1.5 : 1}" fill="#fff" stroke="${K.ink}" stroke-width=".3"/>`; }
  if (o.items) V.items.forEach((it, i) => { const [x, y] = P.p(it.p); g += `<circle cx="${f2(x)}" cy="${f2(y)}" r="2" fill="${K.ink}"/>` + T(x, y + 0.95, i + 1, { s: 2.5, c: '#fff', a: 'middle', w: 700 }); });
  return g + border(S, P);
}
const planLeg = (V: Variant): LegIt[] => [...ORD.filter(t => V.paths.some(p => p.tier === t)).map(t => ({ t: 'fill' as const, c: TIER[t][0], s: '#8c7f6e', l: TIER[t][1] })), ...PROG.filter(([k]) => V.prog[k]?.length).map(([, c, l]) => ({ t: 'fill' as const, c, l })), { t: 'fill', c: K.water, l: 'Koʻl, kanal' }, { t: 'dot', c: '#fff', s: K.ink, l: 'Darvoza' }, ...[...new Set((V.furn ?? []).map(f => furnById(f.id)?.cat).filter(Boolean))].map(k => ({ t: 'fill' as const, c: FCATS[k!].c, s: K.ink, l: FCATS[k!].n })), { t: 'line', c: RED, l: 'Loyiha chegarasi' }];

/* ---------- varaqlar ---------- */
export function buildAlbom(S: AlbomSrc): AlbomSheet[] {
  CL = 0;
  const { A, C, site } = S, DO = S.D[S.chosen], V = DO?.V, Vs = A.visitors, G = C.G, ids = (['A', 'B', 'C'] as const).filter(k => S.D[k]);
  const date = S.date ?? new Date().toLocaleDateString('ru-RU'), out: { id: string; title: string; scale?: string; body: string }[] = [];
  const push = (id: string, title: string, body: string, scale?: string) => out.push({ id, title, body, scale });
  const W = WORK;
  const PLT0 = DO ? applyTreeEdits(C, plant(C, A, DO, S.cls), S.edits ?? [], DO) : null;

  /* 1. Titul */
  {
    let g = T(W.x, W.y + 18, 'LANDSHAFT MASTER REJA', { s: 4, c: K.acc, w: 700 }) + T(W.x, W.y + 34, site.name, { s: 11, w: 700 }) + T(W.x, W.y + 44, `${site.place} · ${fmt(A.areaHa, 2)} ga · ${site.kind} bogʻi${site.rekonstruksiya ? ', rekonstruksiya' : ''}`, { s: 4, c: K.mut });
    if (V) g += T(W.x, W.y + 54, `Tanlangan konsepsiya: ${V.name}`, { s: 3.6 });
    const kp: [string, string][] = [[fmt(A.areaHa, 2), 'ga — maydon'], [fmt(Vs.N1), 'kishi bir vaqtda'], [fmt(A.trees.n), 'mavjud daraxt'], ...(V ? [[`${fmt(V.m.greenPct, 1)} %`, 'koʻkalamzor'] as [string, string]] : [])];
    kp.forEach(([v, l], i) => { const x = W.x + i * 48; g += L(x, W.y + 70, x, W.y + 92, K.line, 0.3) + T(x + 3, W.y + 82, v, { s: 8, w: 700, c: K.acc }) + T(x + 3, W.y + 89, l, { s: 2.6, c: K.mut }); });
    const r = { x: W.x + 190, y: FR.y + 3, w: W.w - 190, h: FR.h - STH - 8 }, P = proj(siteBB(S, 6), r, undefined, true);
    g += (V && PLT0 ? clip(r, render(S, V, P, PLT0)) : base(S, P, { trees: 'full' }) + border(S, P)) + north(r.x + r.w - 6, r.y + 2);
    g += para(W.x, W.y + 104, 185, `Albom Bogʻshunos qadamlari boʻyicha avtomatik yigʻilgan: atrof va joy tahlili, cheklovlar, tashrif modeli va dastur, uch variant, bosh reja, daraxtlarni saqlash, ekish va fasllar, kesimlar va qirgʻoqlar, yashash muhitlari va fauna, suv va sugʻorish, muhandislik tarmoqlari, TIK, smeta va normalar. Raqamlar hisobdan; taxminlar «P» belgisi bilan.`, 2.8, 1.45, K.mut).g;
    push('titul', 'Titul varagʻi', g);
  }
  /* 2. Umumiy maʼlumotlar — keyin (varaqlar roʻyxati kerak) */
  push('umumiy', 'Umumiy maʼlumotlar', '');

  /* 3. Atrof tahlili */
  {
    const Rs = offsets(S, [300, 1000]), bb = expand(bbox(Rs[1].flat()), 20), r = { x: W.x, y: W.y, w: 250, h: W.h }, P = proj(bb, r);
    let m = R(r.x, r.y, r.w, r.h, K.land, 'none', 0);
    for (const f of S.data.osm) { if (f.kind === 'pg' && ((f.k === 'leisure' && ['park', 'garden'].includes(f.v)) || (f.k === 'landuse' && ['grass', 'forest'].includes(f.v)))) m += fillD(mp(P, f.g as MPoly), K.green); if (f.kind === 'pg' && (f.k === 'water' || f.v === 'water')) m += fillD(mp(P, f.g as MPoly), K.water); }
    for (const f of S.data.osm) if (f.kind === 'pg' && f.k === 'building') m += fillD(mp(P, f.g as MPoly), K.block);
    const RW: Record<string, number> = { trunk: 0.9, primary: 0.8, secondary: 0.6, tertiary: 0.45, residential: 0.25, unclassified: 0.25, service: 0.12 };
    for (const f of S.data.osm) if (f.k === 'highway' && f.kind === 'ln' && RW[f.v]) m += strokeD(P.ln(f.g as XY[]), '#fff', RW[f.v]);
    for (const f of S.data.osm) if (f.k === 'waterway' && f.kind === 'ln') m += strokeD(P.ln(f.g as XY[]), K.waterL, 0.4);
    Rs.forEach((rg, i) => { m += strokeD(P.d(rg), K.ink, 0.3, ' stroke-dasharray="1.4 0.9"'); const top = rg.flat().reduce((b, q) => (q[1] > b[1] ? q : b), [0, -1e9] as XY), [x, y] = P.p(top); m += T(x, y - 1.2, i ? '1 km' : '300 m', { s: 2.6, w: 700, a: 'middle' }); });
    for (const f of S.data.osm) if (f.k === 'highway' && f.v === 'bus_stop') { const [x, y] = P.p((f.g as XY[])[0]); m += `<circle cx="${f2(x)}" cy="${f2(y)}" r=".8" fill="${K.acc2}"/>`; }
    for (const f of S.data.osm) if (f.v === 'subway_entrance') { const [x, y] = P.p((f.g as XY[])[0]); m += R(x - 1.1, y - 1.1, 2.2, 2.2, K.acc, 'none', 0); }
    m += fillD(P.d([site.boundary]), K.green2, ' fill-opacity=".35"') + border(S, P, 0.7);
    let g = clip(r, m) + north(r.x + r.w - 6, r.y + 3) + scaleBar(r.x + 4, r.y + r.h - 8, P);
    const x2 = r.x + r.w + 8, w2 = W.x + W.w - x2;
    const lg = legend(x2, W.y, [{ t: 'line', c: RED, l: 'Loyiha chegarasi' }, { t: 'dash', c: K.ink, l: 'Chegaradan 300 m va 1 km' }, { t: 'fill', c: K.green, l: 'Bogʻlar, maysa (OSM)' }, { t: 'fill', c: K.block, l: 'Binolar (OSM)' }, { t: 'dot', c: K.acc2, l: 'Avtobus bekati' }, { t: 'fill', c: K.acc, s: K.acc, l: 'Metro kirishi' }]);
    g += lg.g;
    const t1 = table(x2, W.y + lg.h + 5, [['Koʻrsatkich', w2 - 30], ['Qiymat', 30, 'r']], [['Aholi, chegaradan 300 m', `${fmt(A.pop.r300)} kishi`], ['Aholi, 1 km', `${fmt(A.pop.r1000)} kishi`], ['Bekatlar ≤ 300 m', `${A.stops.length}`], ['Metro', A.metro ? `«${A.metro.name}», ${fmt(A.metro.d)} m` : '—'], ['Bogʻchalar / maktablar ≤ 500 m', `${A.kinder} / ${A.schools}`]]);
    g += t1.g;
    if (A.parks.length) g += table(x2, W.y + lg.h + t1.h + 10, [['Yaqin bogʻlar (≤ 1 km)', w2 - 34], ['ga', 14, 'r'], ['m', 20, 'r']], A.parks.slice(0, 6).map(p => [p.name || 'nomsiz', fmt(p.ha, 1), fmt(p.d)])).g;
    g += para(x2, W.y + W.h - 14, w2, `Aholi: ${S.data.popSrc} (A). Xarita: OpenStreetMap hissadorlari (ODbL).`, 2, 1.35, K.mut).g;
    push('atrof', 'Atrof tahlili', g, `1:${fmt(P.N)}`);
  }

  /* 4. Joy tahlili: 6 modul */
  {
    const cw = (W.w - 2 * 8) / 3, ch = (W.h - 6) / 2, cells = [0, 1, 2, 3, 4, 5].map(i => ({ x: W.x + (i % 3) * (cw + 8), y: W.y + Math.floor(i / 3) * (ch + 6), w: cw, h: ch }));
    const ev: number[] = []; for (let k = 0; k < G.n; k++) if (C.site[k] && Number.isFinite(C.E[k])) ev.push(C.E[k]);
    const z0 = Math.floor(Math.min(...ev)), z1 = Math.ceil(Math.max(...ev));
    const mod = (i: number, title: string, sub: string, draw: (P: Pj, r: { x: number; y: number; w: number; h: number }) => string, leg?: LegIt[]) => {
      const c = cells[i]; return panel(c.x, c.y, c.w, c.h, `${i + 1}. ${title}`, sub, r => { const lw = leg ? 44 : 0, rr = { x: r.x, y: r.y, w: r.w - lw, h: r.h }, P = proj(siteBB(S, 10), rr, undefined, true); return clip(rr, draw(P, rr)) + (leg ? legend(r.x + r.w - lw + 2, r.y + 2, leg, '', 2.1).g : ''); });
    };
    let g = '';
    const RAMP = ['#f3eee2', '#e8dcc2', '#dcc8a2', '#cdb384', '#bb9b69', '#a5825a'];
    g += mod(0, 'Relyef', `${fmt(z0)}–${fmt(z1)} m, farq ${fmt(z1 - z0)} m · ${A.relief.src}`, P => {
      let s = ''; const st = (z1 - z0) / RAMP.length;
      RAMP.forEach((c, b) => { const mk = G.u8(); for (let k = 0; k < G.n; k++) mk[k] = C.site[k] && C.E[k] >= z0 + b * st ? 1 : 0; s += fillD(maskD(P, G, mk), c); });
      for (let z = Math.ceil(z0 / 2) * 2; z <= z1; z += 2) { const mk = G.u8(); for (let k = 0; k < G.n; k++) mk[k] = C.site[k] && C.E[k] >= z ? 1 : 0; s += strokeD(maskD(P, G, mk), '#8a6f4e', 0.12, ' stroke-opacity=".7"'); }
      for (const l of C.lakes) s += fillD(mp(P, l), K.water);
      return s + border(S, P, 0.5);
    }, [{ t: 'fill', c: RAMP[0], l: `${fmt(z0)} m` }, { t: 'fill', c: RAMP[5], l: `${fmt(z1)} m` }, { t: 'line', c: '#8a6f4e', l: 'Gorizontal 2 m' }]);
    const SC: [number, number, string, string][] = [[0, 5, '#e9efe1', '≤ 5 % — MGN'], [5, 8, '#f3e0a8', '5–8 % — rampa'], [8, 12, '#eba86a', '8–12 % — zina'], [12, 999, '#c9573a', '> 12 %']];
    g += mod(1, 'Nishab', `Median ${fmt(A.relief.slopeMed, 1)} %; > 8 % — ${fmt(A.relief.over8 * 100)} % hudud`, P => {
      let s = ''; for (const [a, b, c] of SC) { const mk = G.u8(); for (let k = 0; k < G.n; k++) mk[k] = C.site[k] && !C.water[k] && ((C.S[k] > a && C.S[k] <= b) || (a === 0 && C.S[k] === 0)) ? 1 : 0; s += fillD(maskD(P, G, mk), c); }
      for (const l of C.lakes) s += fillD(mp(P, l), K.water); return s + border(S, P, 0.5);
    }, SC.map(c => ({ t: 'fill' as const, c: c[2], l: c[3] })));
    const DC: [number, number, string, string][] = [[0, 20, '#c9dcb4', '< 20 sm'], [20, 40, '#8db77a', '20–40 sm'], [40, 60, '#4f8a4c', '40–60 sm'], [60, 999, '#2c5a2f', '≥ 60 sm']];
    g += mod(2, 'Mavjud daraxtlar', `${fmt(A.trees.n)} daraxt, ${A.trees.species} tur; ≥ 40 sm — ${fmt(A.trees.big40)}`, P => {
      let s = base(S, P, { paths: true }); for (const [a, b, c] of DC) for (const t of C.trees) if (t.d >= a && t.d < b) { const [x, y] = P.p(t.p); s += `<circle cx="${f2(x)}" cy="${f2(y)}" r="${f2(Math.max(0.35, Math.max(1.5, t.c / 2) * P.k))}" fill="${c}" fill-opacity=".85"/>`; }
      return s + border(S, P, 0.5);
    }, DC.map(c => ({ t: 'dot' as const, c: c[2], l: `dbh ${c[3]}` })));
    g += mod(3, 'Mavjud yoʻllar va kirishlar', `${C.paths.length} ta chiziq, ${fmt(C.paths.reduce((s, p) => s + len(p.g), 0))} m (OSM)`, P => {
      let s = base(S, P, { trees: 'faint' }); for (const p of C.paths) s += strokeD(P.ln(p.g), K.ink, p.h === 'service' ? 0.45 : 0.3, p.h === 'steps' ? ' stroke-dasharray=".4 .3"' : ''); return s + border(S, P, 0.5);
    });
    { // 5. turlar ulushi
      const c = cells[4], top = A.trees.top.slice(0, 10), mx = top[0]?.[1] || 1, rh = 6;
      let s = T(c.x, c.y + 3.6, '5. Asosiy turlar', { s: 3.2, w: 700 }) + T(c.x, c.y + 7.4, `${A.trees.species} tur; birinchi 10 tasi, ulush %`, { s: 2.3, c: K.mut });
      top.forEach(([k, v], i) => { const y = c.y + 11 + i * rh; s += T(c.x, y + 3.8, k, { s: 2.5 }) + R(c.x + 48, y + 1.2, (c.w - 62) * v / mx, 3.4, k === 'Yuksak aylant' ? RED : K.green2, 'none', 0) + T(c.x + c.w, y + 3.8, `${fmt(v, 1)} %`, { s: 2.4, a: 'end', c: K.mut }); });
      s += T(c.x, c.y + c.h - 2, 'Qizil — Ailanthus altissima (invaziv, olib tashlanadi)', { s: 2.1, c: RED });
      g += s;
    }
    { // 6. pasport
      const c = cells[5];
      g += T(c.x, c.y + 3.6, '6. Hudud pasporti', { s: 3.2, w: 700 }) + table(c.x, c.y + 9, [['Koʻrsatkich', c.w - 40], ['Qiymat', 40, 'r']], [['Maydon', `${fmt(A.areaHa, 2)} ga`], ['Perimetr', `${fmt(A.perim)} m`], ['Koʻl (hudud ichida)', `${fmt(A.water.lakeM2)} m²`], ['Kanal (hudud ichida)', `${fmt(A.water.canalM)} m`], ['Balandlik', `${fmt(A.relief.min, 1)}–${fmt(A.relief.max, 1)} m`], ['Nishab > 5 % / > 8 %', `${fmt(A.relief.over5 * 100)} / ${fmt(A.relief.over8 * 100)} %`], ['Daraxtlar (tasdiqlangan)', `${fmt(A.trees.n)} (${fmt(A.trees.verified)})`], ['Toj soyasi', `${fmt(A.trees.canopy, 1)} %`], ['dbh median / P90', `${fmt(A.trees.dbhMed)} / ${fmt(A.trees.dbhP90)} sm`]], { rh: 5.6 }).g
        + para(c.x, c.y + c.h - 9, c.w, `Daraxtlar: ${REGISTRY_CITE}.`, 1.9, 1.3, K.mut).g;
    }
    push('joy', 'Joy tahlili', g);
  }

  /* 5. Imkoniyat va cheklovlar */
  {
    const CLS: [number, string, string][] = [[2, '#e7a39a', 'Qurilish mumkin emas: kanal sohili, binolar'], [1, '#f2d98f', 'Cheklangan: daraxt ildiz zonasi, > 8 %, shovqin, qirgʻoq'], [0, '#cfe3bf', 'Erkin']];
    const r = PL, P = proj(siteBB(S, 8), r);
    let m = ''; for (const [v, c] of CLS) { const mk = G.u8(); for (let k = 0; k < G.n; k++) mk[k] = S.cls[k] === v ? 1 : 0; m += fillD(maskD(P, G, mk), c); }
    for (const l of C.lakes) m += fillD(mp(P, l), K.water); for (const c of C.canals) m += strokeD(P.ln(c), K.waterL, Math.max(0.5, 5 * P.k));
    let g = clip(r, m + border(S, P)) + north(r.x + r.w - 6, r.y + 2) + scaleBar(r.x + 4, r.y + r.h - 8, P);
    const Kc = A.constraints, Vm = V?.m;
    const t = table(X2, W.y, [['Talab (ShNQ 2.07.01-23)', W2 - 68], ['Norma', 30, 'r'], ['Loyiha', 30, 'r'], ['', 8, 'c']], [
      [`Min. maydon (481/490${site.rekonstruksiya ? ', −20 %' : ''})`, `≥ ${fmt(A.minHa, 1)} ga`, `${fmt(A.areaHa, 2)} ga`, A.minOk ? '✓' : '✗'],
      ...(Vm ? [['Koʻkalamzor (491)', '≥ 70 %', `${fmt(Vm.greenPct, 1)} %`, Vm.greenPct >= 70 ? '✓' : '✗']] : []),
      ['Bir vaqtdagi tashrif (501)', `≤ ${Vs.q} kishi/ga`, `${fmt(Vs.perHa)}`, Vs.perHa <= Vs.q ? '✓' : '✗'],
      ['Daraxt, suv saqlanadi (480)', 'saqlash', Vm ? `${Vm.conflict} ziddiyat` : '—', Vm && Vm.conflictBig === 0 ? '✓' : '!']]);
    g += T(X2, W.y - 2, 'Normalar tekshiruvi', { s: 3, w: 700 }) + t.g;
    const lg = legend(X2, W.y + t.h + 8, [...CLS.map(c => ({ t: 'fill' as const, c: c[1], l: c[2] })), { t: 'fill', c: K.water, l: 'Suv' }, { t: 'line', c: RED, l: 'Loyiha chegarasi' }]);
    g += lg.g + table(X2, W.y + t.h + lg.h + 14, [['Mintaqa', W2 - 48], ['Maydon', 48, 'r']], [['Erkin', `${fmt(Kc.green / 1e4, 2)} ga`], ['Cheklangan', `${fmt(Kc.yellow / 1e4, 2)} ga`], ['Mumkin emas', `${fmt(Kc.red / 1e4, 2)} ga`], ['Suv', `${fmt(Kc.water / 1e4, 2)} ga`]]).g;
    g += para(X2, W.y + W.h - 22, W2, `Kanal sohil mintaqasi ${Kc.canalStrip} m, qirgʻoq ${Kc.shore} m, magistral shovqini ${Kc.noise} m — foydalanuvchi kiritgan qiymatlar (P); kanal uchun nizom matni tekshirilsin. Ildiz zonasi: 12 × dbh (A, BS 5837:2012).`, 2.2, 1.35, K.mut).g;
    push('cheklov', 'Imkoniyat va cheklovlar', g, `1:${fmt(P.N)}`);
  }

  /* 6. Tashrif modeli va dastur */
  {
    let g = T(W.x, W.y + 6, `N₁ = min(A·q; P·s/k) = min(${fmt(Vs.A, 2)}·${Vs.q}; ${fmt(Vs.P)}·${fmt(Vs.s[0], 2)}/${Vs.k}) = min(${fmt(Vs.capacity)}; ${fmt(Vs.demand)}) = ${fmt(Vs.N1)} kishi`, { s: 4.6, w: 700 })
      + T(W.x, W.y + 13, `N kun = min(P·s; A·q·k) = ${fmt(Vs.Nday)} kishi/kun`, { s: 3.6 })
      + T(W.x, W.y + 19, 'A — maydon, ga; q — 501-band (N); P — 1 km aholisi (GHS-POP, A); s — tashrif ulushi (34-jadval, N); k — aylanma koeffitsiyenti (T)', { s: 2.4, c: K.mut });
    const kp: [string, string][] = [[fmt(Vs.N1), 'kishi — bir vaqtda'], [fmt(Vs.Nday), 'kishi/kun'], [fmt(Vs.perHa), 'kishi/ga'], [fmt(A.toilets), 'hojatxona (1 / 500 kishi, T)']];
    kp.forEach(([v, l], i) => { const x = W.x + i * (W.w / 4); g += L(x, W.y + 26, x, W.y + 50, K.line, 0.3) + T(x + 3, W.y + 40, v, { s: 10, w: 700, c: K.acc }) + T(x + 3, W.y + 47, l, { s: 2.6, c: K.mut }); });
    g += T(W.x, W.y + 62, `Xizmatlar dasturi — 33-jadval, ${fmt(Vs.N1)} kishiga`, { s: 3.2, w: 700 }) + table(W.x, W.y + 66, [['Xizmat', 90], ['1 000 kishiga (N)', 50, 'r'], ['Kerak', 50, 'r']], A.program.map(p => [p.k, p.norm, p.need]), { rh: 6 }).g;
    const bx = W.x + 210, B: [string, number, string][] = [['Sigʻim A·q (501)', Vs.capacity, K.green2], ['Talab P·s/k', Vs.demand, K.acc2], ['Hisobiy N₁', Vs.N1, K.acc]], mx = Math.max(...B.map(b => b[1]));
    g += T(bx, W.y + 62, `Sigʻim va talab: ${Vs.capacity <= Vs.demand ? 'maydon cheklaydi' : 'aholi talabi cheklaydi'}`, { s: 3.2, w: 700 });
    B.forEach(([l, v, c], i) => { const y = W.y + 70 + i * 12; g += T(bx, y + 5, l, { s: 2.8 }) + R(bx + 50, y, (W.x + W.w - bx - 78) * v / mx, 7, c, 'none', 0) + T(W.x + W.w, y + 5, `${fmt(v)} kishi`, { s: 2.8, a: 'end', c: K.mut }); });
    push('dastur', 'Tashrif modeli va dastur', g);
  }

  /* 7. Konsepsiya: uch variant */
  if (ids.length) {
    const n = ids.length, cw = (W.w - (n - 1) * 6) / n, ph = W.h - 62; let g = '';
    const bb = siteBB(S, 10), Pn = Math.max(...ids.map((_, i) => proj(bb, { x: 0, y: 0, w: cw, h: ph - 22 }).N + i * 0));
    ids.forEach((id, i) => {
      const Vi = S.D[id]!.V, x = W.x + i * (cw + 6), r = { x, y: W.y + 22, w: cw, h: ph - 22 }, P = proj(bb, r, Pn);
      g += T(x, W.y + 5, Vi.name + (id === S.chosen ? '  ✓ tanlandi' : ''), { s: 3.6, w: 700, c: id === S.chosen ? K.acc : K.ink }) + para(x, W.y + 7, cw, Vi.desc, 2.3, 1.35, K.mut, 4).g + clip(r, plan(S, Vi, P));
    });
    g += scaleBar(W.x + W.w - 40, W.y + ph - 6, proj(bb, { x: 0, y: 0, w: cw, h: ph - 22 }, Pn));
    const M = (k: string, f: (v: Variant) => string) => [k, ...ids.map(i => f(S.D[i]!.V))], cwT = (W.w - 70) / n;
    g += table(W.x, W.y + ph + 2, [['Koʻrsatkich', 70], ...ids.map(i => [i, cwT, 'r'] as [string, number, 'r'])], [M('Darvozalar / yoʻllar, m', v => `${v.m.gates} / ${fmt(v.m.pathLen)}`), M('Qattiq yuza, m² / yashil, %', v => `${fmt(v.m.hard)} / ${fmt(v.m.greenPct, 1)}`), M('Zina / rampa, m', v => `${fmt(v.m.zina)} / ${fmt(v.m.rampa)}`), M('Koʻpriklar / daraxt ziddiyati (≥ 40 sm)', v => `${v.bridges.length} / ${v.m.conflict} (${v.m.conflictBig})`), M('Sugʻorish, m³/sut (P)', v => `${fmt(v.m.irrLo)}–${fmt(v.m.irrHi)}`)], { rh: 5.4 }).g;
    push('variant', 'Konsepsiya: uch variant', g, `1:${fmt(Pn)}`);
  }

  if (V && DO) {
    /* 8. Zonalar va oqimlar */
    {
      const r = PL, P = proj(siteBB(S, 8), r);
      let m = base(S, P, { trees: 'faint' });
      for (const [k, c] of PROG) if (V.prog[k]) m += fillD(mp(P, V.prog[k]), c);
      const fm = Math.max(1e-9, ...DO.ods.map(o => o.f));
      for (const o of [...DO.ods].sort((a, b) => a.f - b.f)) if (o.path.length > 1) m += strokeD(P.ln(o.path), K.acc, 0.25 + 2.2 * o.f / fm, ' stroke-opacity=".35"');
      for (const gt of V.gates) { const [x, y] = P.p(gt.p); m += `<circle cx="${f2(x)}" cy="${f2(y)}" r="${f2(1.2 + 2 * gt.f / Math.max(1e-9, ...V.gates.map(q => q.f)))}" fill="#fff" stroke="${K.acc}" stroke-width=".45"/>`; }
      let g = clip(r, m + border(S, P)) + north(r.x + r.w - 6, r.y + 2) + scaleBar(r.x + 4, r.y + r.h - 8, P);
      const x2 = X2, w2 = W2;
      g += para(x2, W.y, w2, `Oqimlar: har manba (metro, bekatlar, turar joy sektorlari, ijtimoiy obyektlar) eng yaqin darvozaga, u yerdan ichki manzillarga; 3 m toʻrda eng arzon yoʻl — nishab (≤ 5 % ×1; 5–8 % ×1,6; 8–12 % ×3; > 12 % ×8), daraxt ildiz zonasi va mavjud yoʻl hisobga olinadi; umumiy yoʻllar birlashtiriladi (T). Chiziq qalinligi — oqim.`, 2.5, 1.4).g;
      g += legend(x2, W.y + 42, [{ t: 'line', c: K.acc, l: 'Manba–manzil oqimi' }, { t: 'dot', c: '#fff', s: K.acc, l: 'Darvoza (oʻlcham — oqim)' }, ...PROG.filter(([k]) => V.prog[k]?.length).map(([, c, l]) => ({ t: 'fill' as const, c, l })), { t: 'line', c: RED, l: 'Loyiha chegarasi' }]).g;
      push('zona', `Zonalar va oqimlar — ${V.name}`, g, `1:${fmt(P.N)}`);
    }
    /* 9. Bosh reja + eksplikatsiya */
    {
      const r = PL, P = proj(siteBB(S, 8), r);
      let g = clip(r, plan(S, V, P, { trees: 'full', items: true })) + north(r.x + r.w - 6, r.y + 2) + scaleBar(r.x + 4, r.y + r.h - 8, P);
      const x2 = X2, w2 = W2;
      const t = table(x2, W.y, [['№  Element', w2 * 0.42], ['Qoida / miqdor', w2 * 0.58, 'r']], [...V.items.map((it, i) => [`${i + 1}  ${it.name.replace(' (suvga qaragan)', '')}`, dec(it.rule.replace(' (tekislash)', ''))]),
        ['Asosiy / ikkinchi yoʻl', `${fmt(V.m.asosiy)} / ${fmt(V.m.ikkinchi)} m`], ['Soʻqmoq / sohil yoʻli', `${fmt(V.m.soqmoq)} / ${fmt(V.m.sohil)} m`], ['Rampa / zina', `${fmt(V.m.rampa)} / ${fmt(V.m.zina)} m`], ['Koʻpriklar', `${V.bridges.length} ta`], ['Oʻtloq', `${fmt(V.m.meadow)} m²`], ['Botqoq qirgʻoq', `${fmt(V.m.wetland)} m²`], ['Yomgʻir bogʻlari', `${fmt(V.m.rain)} m²`]], { fs: 2.15, rh: 5 });
      g += T(x2, W.y - 2, 'Eksplikatsiya', { s: 3, w: 700 }) + t.g + legend(x2, W.y + t.h + 6, planLeg(V), 'Shartli belgilar', 2.1).g;
      push('bosh', `Bosh reja — ${V.name}`, g, `1:${fmt(P.N)}`);
    }
    /* 10. Daraxtlarni saqlash rejasi — ekish moduli qarorlari bilan */
    const PLT = PLT0!;
    {
      const r = PL, P = proj(siteBB(S, 8), r), D = PLT.decisions, CC = PLT.counts;
      const COL: Record<string, string> = { kochiriladi: '#b5651d', yol_suriladi: '#7a3fa8', kesiladi: RED };
      let m = plan(S, V, P, { gates: false }).replace(/<circle[^>]*fill-opacity="\.25"\/>/g, '');
      C.trees.forEach((t, i) => { const [x, y] = P.p(t.p), rr = Math.max(0.5, Math.max(1.5, t.c / 2) * P.k), c = D[i];
        if (c === 'saqlanadi') m += `<circle cx="${f2(x)}" cy="${f2(y)}" r="${f2(rr)}" fill="${K.green2}" fill-opacity=".6" stroke="#4f7a45" stroke-width=".1"/>`;
        else if (c === 'yol_suriladi') m += `<circle cx="${f2(x)}" cy="${f2(y)}" r="${f2(rr)}" fill="${K.green2}" fill-opacity=".6" stroke="${COL[c]}" stroke-width=".45"/>`;
        else m += `<circle cx="${f2(x)}" cy="${f2(y)}" r="${f2(rr)}" fill="none" stroke="${COL[c]}" stroke-width=".3"/>` + L(x - rr * 0.7, y - rr * 0.7, x + rr * 0.7, y + rr * 0.7, COL[c], 0.3) + L(x - rr * 0.7, y + rr * 0.7, x + rr * 0.7, y - rr * 0.7, COL[c], 0.3); });
      let g = clip(r, m) + north(r.x + r.w - 6, r.y + 2) + scaleBar(r.x + 4, r.y + r.h - 8, P);
      const x2 = X2, w2 = W2;
      const t = table(x2, W.y, [['Qaror', w2 - 26], ['Soni', 26, 'r']], [['Saqlanadi', fmt(CC.saqlanadi)], ['Koʻchiriladi (dbh < 40 sm, T)', fmt(CC.kochiriladi)], ['Saqlanadi, yoʻl suriladi (≥ 40 sm, 480-band)', fmt(CC.yol_suriladi)], ['Kesiladi — Ailanthus (invaziv, T)', fmt(CC.kesiladi)], ['Jami (reyestr)', fmt(C.trees.length)]]);
      g += T(x2, W.y - 2, 'Daraxtlar balansi', { s: 3, w: 700 }) + t.g + legend(x2, W.y + t.h + 6, [{ t: 'dot', c: K.green2, s: '#4f7a45', l: 'Saqlanadi' }, { t: 'dot', c: K.green2, s: COL.yol_suriladi, l: 'Saqlanadi — yoʻl suriladi' }, { t: 'x', c: COL.kochiriladi, l: 'Koʻchiriladi' }, { t: 'x', c: RED, l: 'Kesiladi (Ailanthus)' }, { t: 'line', c: RED, l: 'Loyiha chegarasi' }]).g;
      g += para(x2, W.y + t.h + 40, w2, `Ziddiyat — daraxt yangi qattiq qoplama, sport maydoni yoki amfiteatr ostida va mavjud yoʻlda emas. Kesish va koʻchirish rasmiy tartibi (moratoriy, kompensatsion ekish) alohida rasmiylashtiriladi. Ildiz zonasi 12 × dbh, 2–15 m (A, BS 5837:2012).`, 2.3, 1.4, K.mut).g + para(x2, W.y + W.h - 10, w2, REGISTRY_CITE, 1.9, 1.3, K.mut).g;
      push('saqlash', 'Daraxtlarni saqlash rejasi', g, `1:${fmt(P.N)}`);
    }
    /* 11. Ekish rejasi va vedomost */
    {
      const r = PL, P = proj(siteBB(S, 8), r);
      const spp = [...new Map([...PLT.trees.map(t => [t.sp.lat, t.sp] as const), ...PLT.shrubs.map(s => [s.sp.lat, s.sp] as const)]).values()];
      const code = new Map(spp.map((s, i) => [s.lat, i + 1]));
      let m = plan(S, V, P, { gates: false }).replace(/<circle[^>]*fill-opacity="\.25"\/>/g, '');
      C.trees.forEach((t, i) => { if (PLT.decisions[i] === 'kesiladi' || PLT.decisions[i] === 'kochiriladi') return; const [x, y] = P.p(t.p); m += sym('mavjud', x, y, Math.max(0.4, Math.max(1.5, t.c / 2) * P.k), '#9c9a94', 'none'); });
      for (const t of PLT.trees) { const [x, y] = P.p(t.p), rr = t.crown / 2 * P.k; m += csym(symOf(t.sp), x, y, rr, { sh: rr * 0.18, fc: PHEN[t.sp.lat]?.fc, line: rr > 2 }) + T(x, y + 0.5, code.get(t.sp.lat), { s: Math.max(1.1, Math.min(1.8, rr * 0.8)), a: 'middle', w: 700, c: rr > 1.2 ? '#ffffff' : '#1d3a20' }); }
      for (const s of PLT.shrubs) { const [x, y] = P.p(s.p); m += csym('butaGuruh', x, y, 3 * P.k + 0.6, { fc: PHEN[s.sp.lat]?.fc }) + T(x + 3 * P.k + 1.4, y + 0.6, code.get(s.sp.lat), { s: 1.4, w: 700, c: '#5b4a2f' }); }
      let g = clip(r, m + border(S, P)) + north(r.x + r.w - 6, r.y + 2) + scaleBar(r.x + 4, r.y + r.h - 8, P);
      const x2 = X2, w2 = W2, cnt = (lat: string) => PLT.trees.filter(t => t.sp.lat === lat).length + PLT.shrubs.filter(s => s.sp.lat === lat).reduce((a, s) => a + s.n, 0);
      const t = table(x2, W.y, [['№', 7, 'c'], ['Tur (lotincha)', w2 - 61], ['Kattalik', 15, 'c'], ['Namlik', 14, 'c'], ['Soni', 18, 'r']], spp.map(s => [String(code.get(s.lat)), `${s.lat}${s.native ? ' *' : ''}${s.user ? ' †' : ''}`, s.size, s.water, fmt(cnt(s.lat))]), { rh: 4.6, fs: 2.15 });
      g += T(x2, W.y - 2, 'Ekish vedomosti', { s: 3, w: 700 }) + t.g;
      const k2 = table(x2, W.y + t.h + 5, [['Koʻrsatkich', w2 - 40], ['Qiymat', 40, 'r']], [['Toj qoplami (yetuk holat, P)', `${fmt(PLT.canopy0, 1)} → ${fmt(PLT.canopy1, 1)} %`], ['Yangi daraxtlar / buta guruhlari', `${PLT.trees.length} / ${PLT.shrubs.length}`], ['Mahalliy turlar ulushi (yangi)', `${fmt(PLT.native)} %`], ['Kam suv talab qiladigan (НТ)', `${fmt(PLT.lowWater)} %`], ['Soya / bolalar / suv / qiyalik / ochiq', ['soya', 'bolalar', 'suv', 'qiyalik', 'ochiq'].map(z => PLT.zones[z as 'soya']).join(' / ')]], { rh: 4.8, fs: 2.15 });
      g += k2.g + legend(x2, W.y + t.h + k2.h + 9, [{ t: 'dot', c: TPAL.yirik[0], s: TPAL.yirik[1], l: 'Yirik daraxt (Д1; raqam — vedomost)' }, { t: 'dot', c: TPAL.orta[0], s: TPAL.orta[1], l: 'Oʻrta daraxt (Д2)' }, { t: 'dot', c: TPAL.kichik[0], s: TPAL.kichik[1], l: 'Kichik daraxt (Д3–Д4)' }, { t: 'dot', c: TPAL.igna[0], s: TPAL.igna[1], l: 'Ignabargli' }, { t: 'dot', c: TPAL.kolonna[0], s: TPAL.kolonna[1], l: 'Kolonnasimon' }, { t: 'dot', c: '#f29bb8', s: '#ffffff', l: 'Gullaydigan (nuqta — gul rangi)' }, { t: 'dot', c: '#fff', s: '#9c9a94', l: 'Mavjud daraxt (saqlanadi)' }, { t: 'dot', c: TPAL.butaGuruh[0], s: TPAL.butaGuruh[1], l: 'Buta guruhi (5 tup)' }, { t: 'line', c: RED, l: 'Loyiha chegarasi' }], 'Shartli belgilar', 2.1).g;
      g += para(x2, W.y + W.h - 14, w2, `* — mahalliy tur (POWO). Namlik: Т — suvga talabchan, НТ — talabchan emas. Joylashuv: soya (yoʻl chetidan 2–6 m), bolalar maydoni ≤ 15 m, suv boʻyi ≤ 20 m, > 12 % qiyalik — T; bino devoridan ≥ 5 m (35-jadval, N). ${ASSORT_CITE}${ASSORT.some(x => x.user) ? `; foydalanuvchi qoʻshgan turlar: ${ASSORT.filter(x => x.user).length} (P, «†» belgisi)` : ''}. Belgilar — AUTOCAD_Library.dwg chiziqlari, rangdor toj uslubi foydalanuvchi namunalaridan (T: badiiy rang, turning haqiqiy rangi emas).`, 1.9, 1.3, K.mut).g;
      push('ekish', 'Ekish rejasi va vedomost', g, `1:${fmt(P.N)}`);
    }
    /* 12. Assortiment va fasllar */
    {
      const spp = [...new Map([...PLT.trees.map(t => [t.sp.lat, t.sp] as const), ...PLT.shrubs.map(s => [s.sp.lat, s.sp] as const)]).values()].slice(0, 20);
      const M0 = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'], x0 = W.x + 92, cw = (W.w - 92 - 70) / 12, rh = Math.min(8.6, (W.h - 34) / (spp.length + 1));
      let g = T(W.x, W.y + 4, 'Tur', { s: 2.4, w: 700, c: K.mut }) + M0.map((m, i) => T(x0 + cw * (i + 0.5), W.y + 4, m, { s: 2.4, w: 700, a: 'middle', c: K.mut })).join('') + T(x0 + 12 * cw + 4, W.y + 4, 'Izoh', { s: 2.4, w: 700, c: K.mut });
      spp.forEach((s, j) => {
        const y = W.y + 7 + j * rh, ph = PHEN[s.lat] ?? {};
        g += T(W.x, y + rh * 0.62, s.lat, { s: 2.3, i: true }) + L(W.x, y + rh, x0 + 12 * cw + 66, y + rh, K.line, 0.15);
        for (let mo = 1; mo <= 12; mo++) {
          const x = x0 + cw * (mo - 1); let c = ph.e ? '#5f8f5a' : mo >= 4 && mo <= 10 ? '#cfe3bf' : '#f1efe9';
          if (!ph.e && ph.a && (mo === 10 || mo === 11)) c = ph.a;
          g += R(x + 0.3, y + rh * 0.2, cw - 0.6, rh * 0.6, c, 'none', 0);
          if (ph.f?.includes(mo)) g += R(x + 0.3, y + rh * 0.2, cw - 0.6, rh * 0.3, ph.fc ?? '#f4c2cc', 'none', 0);
          if (ph.fr?.includes(mo)) g += `<circle cx="${f2(x + cw / 2)}" cy="${f2(y + rh * 0.65)}" r="${f2(Math.min(1, rh * 0.12))}" fill="#7a2e2e"/>`;
        }
        g += T(x0 + 12 * cw + 4, y + rh * 0.62, `${s.size} · ${s.water === 'НТ' ? 'kam suv' : 'suvsevar'}${s.native ? ' · mahalliy' : ''}`, { s: 2.1, c: K.mut });
      });
      const yl = W.y + 9 + spp.length * rh;
      g += legend(W.x, yl, [{ t: 'fill', c: '#cfe3bf', l: 'Bargli davr (IV–X, P)' }, { t: 'fill', c: '#5f8f5a', l: 'Doim yashil' }, { t: 'fill', c: '#f4c2cc', l: 'Gullash (tur rangi)' }, { t: 'fill', c: '#e0a23a', l: 'Kuzgi barg rangi' }, { t: 'dot', c: '#7a2e2e', l: 'Meva (qushlar uchun ozuqa)' }], 'Shartli belgilar', 2.1).g;
      const R0 = PLT.r22_0, R1 = PLT.r22, rr = (v: [string, number], lim: number) => `${v[0]} ${fmt(v[1], 1)} %${v[1] <= lim ? ' ✓' : ' ✗'}`;
      g += table(W.x + 110, yl, [['R22 xilma-xillik (tur ≤ 5 %, turkum ≤ 10 %, oila ≤ 20 %)', 110], ['Mavjud', 75, 'r'], ['Loyihadan keyin', 75, 'r']], [['Eng koʻp tur', rr(R0.sp, 5), rr(R1.sp, 5)], ['Eng koʻp turkum', rr(R0.genus, 10), rr(R1.genus, 10)], ['Eng koʻp oila', rr(R0.family, 20), rr(R1.family, 20)]], { rh: 5.4, fs: 2.2 }).g;
      g += para(W.x + 110, yl + 26, 260, 'Mavjud tarkibdagi ustunlik (Juniperus virginiana va boshqalar) yangi ekish bilan qisman kamayadi; toʻliq muvozanat uchun almashtirish ekishi bosqichma-bosqich rejalashtiriladi (T). Fenologiya — umumiy dendrologik maʼlumot (P), mahalliy kuzatuv bilan aniqlanadi.', 2.2, 1.4, K.mut).g;
      push('fasl', 'Assortiment va fasllar', g);
    }
    /* Kesimlar A–A, B–B */
    {
      const CE = S.CG?.C ?? C, lines = sectionLines(C, DO).filter(l => profile(CE, DO, PLT, site, l).pts.length > 10), KP = { x: W.x, y: W.y, w: 70, h: 110 }, Pk = proj(siteBB(S, 25), KP, undefined, true);
      let g = clip(KP, plan(S, V, Pk, { gates: false })) + north(KP.x + KP.w - 5, KP.y + 1);
      lines.forEach(l => { const [ax, ay] = Pk.p(l.a), [bx, by] = Pk.p(l.b); g += L(ax, ay, bx, by, RED, 0.35, ' stroke-dasharray="2 .8 .4 .8"') + T(ax, ay - 1, l.name.split('–')[0], { s: 3, w: 700, c: RED, a: 'middle' }) + T(bx, by - 1, l.name.split('–')[1], { s: 3, w: 700, c: RED, a: 'middle' }); });
      g = clip(KP, g);
      const rx = W.x + 78, rw = W.x + W.w - rx, hh = (W.h - 4) / Math.max(1, lines.length);
      const Ns: number[] = [];
      lines.forEach((l, i) => { const d = drawSection(profile(CE, DO, PLT, site, l), { x: rx, y: W.y + i * (hh + 4), w: rw, h: hh }); Ns.push(d.N); g += d.g; });
      g += legend(W.x, KP.y + KP.h + 6, [{ t: 'fill', c: '#d8c7a4', l: 'Yoʻl' }, { t: 'fill', c: '#c99a55', l: 'Zina' }, { t: 'fill', c: '#e7b98e', l: 'Amfiteatr' }, { t: 'fill', c: '#b9d9cf', l: 'Botqoq qirgʻoq' }, { t: 'fill', c: '#e3ecc4', l: 'Oʻtloq' }, { t: 'fill', c: '#c9dcc0', l: 'Maysa' }, { t: 'fill', c: '#cbdde3', l: 'Suv' }, { t: 'line', c: '#2f5e33', l: 'Yangi daraxt' }, { t: 'line', c: '#5c5a55', l: 'Mavjud daraxt' }], 'Shartli belgilar', 2).g;
      g += para(W.x, W.y + W.h - 34, 70, 'Kesim chiziqlari qoidadan: A–A amfiteatrdan koʻl markazi orqali, B–B unga perpendikulyar. Relyef — SRTM (P); daraxt balandligi: mavjud — reyestr, yangi — yetuk holat (P). Odam va oʻsimlik siluetlari — Koʻchasoz kutubxonasi, daraxtlar — AUTOCAD_Library.dwg.', 1.9, 1.35, K.mut).g;
      push('kesim', 'Kesimlar ' + lines.map(l => l.name).join(', '), g, Ns.map(n => `1:${fmt(n)}`).join(', '));
    }
    /* Qirgʻoq tipologiyalari */
    if (mainLake(C)) {
      const SH = shores(C, DO), r = { x: W.x, y: W.y, w: 150, h: W.h }, P = proj(expand(bbox(mainLake(C) ?? site.boundary), 30), r);
      let m = plan(S, V, P, { gates: false });
      for (const sg of SH.segs) m += strokeD(P.ln(sg.pts), SHORE[sg.t].c, 2.2) + strokeD(P.ln(sg.pts), K.ink, 0.12);
      let g = clip(r, m) + north(r.x + r.w - 6, r.y + 2) + scaleBar(r.x + 4, r.y + r.h - 8, P);
      const types = (Object.keys(SHORE) as ShoreT[]).filter(t => SH.tot[t] > 1), x2 = r.x + r.w + 8, w2 = W.x + W.w - x2, cols = 2, cw = (w2 - 6) / cols, chh = Math.min(48, (W.h - 50) / Math.ceil(types.length / cols));
      types.forEach((t, i) => { const cx = x2 + (i % cols) * (cw + 6), cy = W.y + Math.floor(i / cols) * chh; g += drawTypology(t, { x: cx, y: cy, w: cw, h: chh - 10 }) + para(cx, cy + chh - 10, cw, SHORE[t].d, 1.9, 1.3, K.mut, 2).g; });
      const ty = W.y + Math.ceil(types.length / cols) * chh + 2;
      g += table(x2, ty, [['Tipologiya', w2 - 60], ['Uzunlik, m', 30, 'r'], ['Ulush', 30, 'r']], types.map(t => [SHORE[t].n, fmt(SH.tot[t]), `${fmt(SH.tot[t] / SH.perim * 100)} %`]), { rh: 4.6, fs: 2.1 }).g;
      push('qirgoq', 'Qirgʻoq tipologiyalari', g, `1:${fmt(P.N)}`);
    }
    /* Aksonometriyalar — har varaqda 2 tagacha */
    if (S.akso?.length) {
      for (let s0 = 0; s0 < S.akso.length; s0 += 2) {
        const part = S.akso.slice(s0, s0 + 2), cw = (W.w - 8) / part.length; let g = '';
        part.forEach((q, i) => {
          const r = akso(S.CG?.C ?? C, S.data, DO, PLT, q), x = W.x + i * (cw + 8), sc = Math.min(cw / r.w, (W.h - 4) / r.h);
          const inner = r.svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '').replace(/akTop/g, `akTop${s0 + i}`).replace(/akN/g, `akN${s0 + i}`).replace(/akG/g, `akG${s0 + i}_`);
          const vb = /viewBox="([^"]+)"/.exec(r.svg)![1];
          g += `<svg x="${f2(x)}" y="${f2(W.y)}" width="${f2(r.w * sc)}" height="${f2(r.h * sc)}" viewBox="${vb}">${inner}</svg>`;
        });
        push(`akso${s0}`, S.akso.length > 2 ? `Aksonometriyalar (${s0 / 2 + 1})` : 'Aksonometriyalar', g);
      }
    }
    /* Yashash muhitlari va fauna */
    const FA = fauna(C, DO, PLT);
    {
      const r = PL, P = proj(siteBB(S, 8), r);
      let m = base(S, P, { grass: false, trees: false });
      for (const hr of habRings(C, FA)) m += fillD(P.d(hr.rings), HAB[hr.h].c, ' fill-opacity=".9"');
      for (const p of V.paths) m += strokeD(P.ln(p.g), '#fff', Math.max(0.2, p.w * P.k));
      for (const b of V.bridges) m += strokeD(P.ln(b.g), K.ink, b.w * P.k + 0.2);
      m += strokeD(maskD(P, G, FA.quiet), K.ink, 0.3, ' stroke-dasharray="1 .7"');
      for (const b of FA.boxes) { const [x, y] = P.p(b.p); m += b.kind === 'qush' ? `<path d="M${f2(x)} ${f2(y - 1.3)}l1.2 2.1h-2.4Z" fill="#fff" stroke="${K.ink}" stroke-width=".25"/>` : R(x - 0.9, y - 0.9, 1.8, 1.8, '#3b2f4a', '#fff', 0.2); }
      let g = clip(r, m + border(S, P)) + north(r.x + r.w - 6, r.y + 2) + scaleBar(r.x + 4, r.y + r.h - 8, P);
      const x2 = X2, w2 = W2, tot = Object.values(FA.areas).reduce((a, b) => a + b, 0);
      const t1 = table(x2, W.y, [['Yashash muhiti', w2 - 52], ['m²', 26, 'r'], ['%', 26, 'r']], (Object.keys(HAB) as (keyof typeof HAB)[]).filter(h => FA.areas[h] > 0).map(h => [HAB[h].n, fmt(FA.areas[h]), fmt(FA.areas[h] / tot * 100, 1)]), { rh: 4.4, fs: 2.05 });
      g += T(x2, W.y - 2, 'Muhitlar balansi', { s: 3, w: 700 }) + t1.g;
      let y = W.y + t1.h + 4;
      const t2 = table(x2, y, [['Koʻrsatkich', w2 - 42], ['Qiymat', 32, 'r'], ['Teg', 10, 'c']], [
        ['Shennon H′ / tekislik J (muhitlar)', `${fmt(FA.H, 2)} / ${fmt(FA.J, 2)}`, 'T'],
        ['Sokin hudud (yoʻl va maydondan ≥ 30 m)', `${fmt(FA.quietM2)} m²`, 'T'], ['   shundan suv yuzasi', `${fmt(FA.quietWaterM2)} m²`, 'T'],
        ['Yoʻldan ≥ 100 m (qushlar orientiri)', FA.quiet100M2 ? `${fmt(FA.quiet100M2)} m²` : `yoʻq (eng uzoq ${fmt(FA.maxQuiet)} m)`, 'A'],
        ['Keksa daraxtlar dbh ≥ 40 sm (saqlanadi)', fmt(FA.old), 'T'], ['Uya qutilari: qush / koʻrshapalak', `${FA.boxes.filter(b => b.kind === 'qush').length} / ${FA.boxes.filter(b => b.kind === 'kshap').length}`, 'T'],
        ['Yumshoq qirgʻoq (botqoq + tabiiy)', FA.perim ? `${fmt(FA.softShore / FA.perim * 100)} %` : '—', 'T']], { rh: 4.4, fs: 2.05 });
      g += t2.g; y += t2.h + 4;
      const M0 = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'], cw = (w2 - 30) / 12, mx = Math.max(1, ...FA.fruit, ...FA.flower);
      g += T(x2, y + 3, 'Ozuqa kalendari (daraxt va buta soni, P)', { s: 2.5, w: 700 });
      M0.forEach((mo, i) => { const x = x2 + 30 + i * cw; g += R(x + 0.4, y + 14 - 9 * FA.flower[i] / mx, cw * 0.4, 9 * FA.flower[i] / mx, '#e59bb0', 'none', 0) + R(x + cw * 0.5, y + 14 - 9 * FA.fruit[i] / mx, cw * 0.4, 9 * FA.fruit[i] / mx, '#7a2e2e', 'none', 0) + T(x + cw / 2, y + 17.5, mo, { s: 1.8, a: 'middle', c: K.mut }); });
      g += T(x2, y + 9, 'gullash', { s: 1.9, c: '#c0607a' }) + T(x2, y + 13, 'meva', { s: 1.9, c: '#7a2e2e' }) + L(x2 + 30, y + 14, x2 + w2, y + 14, K.mut, 0.15);
      const gap = FA.flower.map((v, i) => (i >= 2 && i <= 9 && v === 0 ? M0[i] : '')).filter(Boolean);
      y += 20; if (gap.length) { const pp = para(x2, y, w2, `Gullashsiz oylar (III–X): ${gap.join(', ')} — changlatuvchilar uchun buta va koʻp yillik gullar bilan toʻldiriladi (T).`, 2, 1.3, RED); g += pp.g; y += pp.h; }
      const t3 = table(x2, y + 2, [['Fauna guruhi', 50], ['Muhit, m²', 18, 'r'], ['Loyiha chorasi', w2 - 68]], FA.guilds.map(x => [x.g.n, fmt(x.m2), x.g.act.length > 92 ? x.g.act.slice(0, 91) + '…' : x.g.act]), { rh: 4.3, fs: 1.8 });
      g += t3.g; y += t3.h + 5;
      g += legend(x2, y, [{ t: 'dash', c: K.ink, l: 'Sokin hudud chegarasi (≥ 30 m)' }, { t: 'fill', c: '#fff', s: K.ink, l: 'Qush uya qutisi (uchburchak) — keksa daraxtda' }, { t: 'fill', c: '#3b2f4a', s: '#fff', l: 'Koʻrshapalak qutisi (suvga ≤ 50 m)' }], 'Shartli belgilar', 2).g;
      g += para(x2, W.y + W.h - 26, w2, FAUNA_CITE.join(' · '), 1.75, 1.3, K.mut, 9).g;
      push('fauna', 'Yashash muhitlari va fauna', g, `1:${fmt(P.N)}`);
    }
    /* 11. Suv va sugʻorish */
    {
      const lawn = V.m.lawn, mead = V.m.meadow, oth = V.m.other;
      const r = PL, P = proj(siteBB(S, 8), r);
      let m = '';
      { const site = G.u8(); for (let k = 0; k < G.n; k++) site[k] = C.site[k] && !C.water[k] ? 1 : 0; m += fillD(maskD(P, G, site), '#f4f1e6'); }
      let gr = ''; for (const f of S.data.osm) if (f.kind === 'pg' && f.k === 'landuse' && f.v === 'grass') gr += fillD(mp(P, f.g as MPoly), '#8fc1d6'); const id = `bgs${++CL}`; m += `<clipPath id="${id}"><path d="${P.d([site.boundary])}"/></clipPath><g clip-path="url(#${id})">${gr}</g>`;
      if (V.prog.otloq) m += fillD(mp(P, V.prog.otloq), '#cfe4ee'); if (V.prog.botqoq) m += fillD(mp(P, V.prog.botqoq), '#7fb7a6'); if (V.prog.yomgir_bogi) m += fillD(mp(P, V.prog.yomgir_bogi), '#5f9e8c');
      for (const l of C.lakes) m += fillD(mp(P, l), K.water, ` stroke="${K.waterL}" stroke-width=".2"`); for (const c of C.canals) m += strokeD(P.ln(c), K.waterL, Math.max(0.5, 5 * P.k));
      for (const p of V.paths) m += strokeD(P.ln(p.g), '#fff', Math.max(0.15, p.w * P.k));
      let g = clip(r, m + border(S, P)) + north(r.x + r.w - 6, r.y + 2) + scaleBar(r.x + 4, r.y + r.h - 8, P);
      const x2 = X2, w2 = W2;
      g += T(x2, W.y + 5, 'Q = Σ Aᵢ · nᵢ', { s: 5, w: 700 }) + T(x2, W.y + 11, 'Aᵢ — gidrozona maydoni, m²; nᵢ — sutkalik meʼyor, l/m² (P)', { s: 2.3, c: K.mut });
      const t = table(x2, W.y + 16, [['Gidrozona', w2 - 70], ['A, m²', 24, 'r'], ['n, l/m²', 18, 'r'], ['Q, m³/sut', 28, 'r']], [['1 Maysa (yuqori)', fmt(lawn), '15–20', `${fmt(lawn * 15 / 1000)}–${fmt(lawn * 20 / 1000)}`], ['2 Oʻtloq (past)', fmt(mead), '3–4', `${fmt(mead * 3 / 1000)}–${fmt(mead * 4 / 1000)}`], ['3 Daraxt-buta, qolgan (past)', fmt(oth), '3–4', `${fmt(oth * 3 / 1000)}–${fmt(oth * 4 / 1000)}`], ['Jami', '', '', `${fmt(V.m.irrLo)}–${fmt(V.m.irrHi)}`]]);
      g += t.g;
      const kp: [string, string][] = [[`${fmt(V.m.irrLo)}–${fmt(V.m.irrHi)}`, 'm³/sut — iyul choʻqqisi (P)'], [fmt(A.water.lakeM2), 'm² — koʻl suv sathi']];
      kp.forEach(([v, l], i) => { const y = W.y + 22 + t.h + i * 16; g += T(x2, y + 7, v, { s: 7, w: 700, c: K.acc2 }) + T(x2, y + 12, l, { s: 2.5, c: K.mut }); });
      g += legend(x2, W.y + 58 + t.h, [{ t: 'fill', c: '#8fc1d6', l: '1 — maysa, yuqori sugʻorish' }, { t: 'fill', c: '#cfe4ee', l: '2 — oʻtloq, past' }, { t: 'fill', c: '#f4f1e6', l: '3 — daraxt-buta va qolgan, past' }, { t: 'fill', c: '#7fb7a6', l: 'Botqoq qirgʻoq' }, { t: 'fill', c: '#5f9e8c', l: 'Yomgʻir bogʻi (oqim toʻplanishi, D8)' }, { t: 'fill', c: K.water, l: 'Koʻl, kanal' }]).g;
      g += para(x2, W.y + W.h - 18, w2, 'Sutkalik meʼyorlar — prototip faraziyasi (P): mahalliy meʼyor va tomchilatib sugʻorish loyihasi bilan aniqlanadi. Koʻl suvli, chuqurlik 1,4 m — faraz.', 2.2, 1.35, K.mut).g;
      push('suv', 'Suv va sugʻorish', g, `1:${fmt(P.N)}`);
    }
    /* Muhandislik tarmoqlari */
    const NT = nets(C, A, DO, PLT, S.data, site.kind);
    {
      const r = PL, P = proj(siteBB(S, 25), r);
      let m = plan(S, V, P, { gates: false, trees: 'faint' });
      for (const n of S.data.nets ?? []) m += strokeD(P.ln(n.g), '#8d8a86', 0.35, ' stroke-dasharray="1.2 .6"');
      const off: Record<string, number> = { suv: -0.9, kanal: 0.9, sugorish: -0.3, elektr: 0.3, aloqa: 1.5 };
      for (const rt of NT.routes) for (const l of rt.lines) m += `<g transform="translate(${off[rt.kind] ?? 0} ${off[rt.kind] ?? 0})">` + strokeD(P.ln(l), NET[rt.kind].c, rt.kind === 'elektr' ? 0.35 : 0.5, NET[rt.kind].dash ? ` stroke-dasharray="${NET[rt.kind].dash}"` : '') + '</g>';
      for (const l of NT.lamps) { const [x, y] = P.p(l.p); m += `<circle cx="${f2(x)}" cy="${f2(y)}" r="${l.kind === 'ustun' ? 0.65 : 0.4}" fill="${l.conflict ? RED : '#f2c230'}" stroke="${K.ink}" stroke-width=".12"/>`; }
      const ico: Record<string, string> = { wc: 'WC', kafe: 'K', sahna: 'S', fav: 'F', sfav: 'F', cam: 'V' };
      for (const c of NT.cons) { const key = Object.keys(ico).find(k => c.id.startsWith(k)); if (!key) continue; const [x, y] = P.p(c.p); m += `<circle cx="${f2(x)}" cy="${f2(y)}" r="1.5" fill="#fff" stroke="${K.ink}" stroke-width=".25"/>` + T(x, y + 0.7, ico[key], { s: 1.5, w: 700, a: 'middle' }); }
      for (const rt of NT.routes) { const [x, y] = P.p(rt.src); m += R(x - 1.3, y - 1.3, 2.6, 2.6, rt.srcTu ? K.ink : '#fff', K.ink, 0.3); }
      for (const t of S.data.tu ?? []) { const [x, y] = P.p(t.p); m += T(x + 1.8, y - 1.2, `TU ${t.kind} ${t.cap} ${t.unit}`, { s: 1.6, w: 700 }); }
      let g = clip(r, m + border(S, P)) + north(r.x + r.w - 6, r.y + 2) + scaleBar(r.x + 4, r.y + r.h - 8, P);
      const x2 = X2, w2 = W2;
      const t1 = table(x2, W.y, [['Tarmoq', w2 - 78], ['Uzunlik, m', 20, 'r'], ['Ulanish', 22, 'c'], ['Daraxt ✗', 18, 'r'], ['Bino ✗', 18, 'r']], NT.routes.map(rt => [NET[rt.kind].n, fmt(rt.len), rt.srcTu ? 'TU' : 'P', String(rt.treeHits.length), String(rt.bldHits)]), { rh: 4.6, fs: 2.0 });
      g += T(x2, W.y - 2, 'Tarmoqlar (trassa — qoidalar bilan)', { s: 3, w: 700 }) + t1.g;
      let y = W.y + t1.h + 4;
      const TN: Record<string, string> = { asosiy: 'Asosiy yoʻl (markaziy xiyobon)', ikkinchi: 'Ikkinchi darajali (yon xiyobon)', sohil: 'Sohil yoʻli (past yoritkich)', rampa: 'Rampa', zina: 'Zina (past yoritkich)' };
      const t2 = table(x2, y, [['Yoritish', w2 - 64], ['E, lk', 14, 'r'], ['s, m', 16, 'r'], ['Soni', 16, 'r'], ['Teg', 18, 'c']], [...NT.light.map(l => [TN[l.tier] ?? l.tier, fmt(l.lux), fmt(l.s, 1), String(l.n), 'A / P']), ['Kirishlar (bosh / yordamchi)', `${site.kind === 'shahar' ? 6 : 4} / ${site.kind === 'shahar' ? 2 : 1}`, '—', String(V.gates.length), 'A'], ['Soʻqmoq — yoritilmaydi (qorongʻi yoʻlak)', '0', '—', '0', 'T']], { rh: 4.4, fs: 1.95 });
      g += t2.g; y += t2.h + 4;
      const lc = NT.lamps.filter(l => l.conflict).length;
      const t3 = table(x2, y, [['Yuklama va hajm', w2 - 40], ['Qiymat', 40, 'r']], [
        ['Elektr: yoritish / nasos / kafe', `${fmt(NT.kw.light, 1)} / ${fmt(NT.kw.pump, 1)} / ${fmt(NT.kw.kafe)} kVt`], ['Elektr jami (P)', `${fmt(NT.kw.total, 1)} kVt`],
        ['Ichimlik suvi (3 l/tashrifchi, P)', `${fmt(NT.water.day, 1)} m³/sut`], ['Sugʻorish (iyul, P)', `${fmt(NT.water.irr[0])}–${fmt(NT.water.irr[1])} m³/sut`],
        ['Yomgʻir: oqim (20 mm, ψ 0,9) / sigʻim', `${fmt(NT.storm.V)} / ${fmt(NT.storm.cap)} m³`], ['Yomgʻir bogʻlari qamrovi', `${fmt(Math.min(999, NT.storm.ratio * 100))} %`],
        ['Ustun daraxtga < 4 m (35-jadval)', lc ? `${lc} ✗` : '0 ✓']], { rh: 4.4, fs: 1.95 });
      g += t3.g; y += t3.h + 4;
      const t4 = table(x2, y, [['Normativ masofa, m (N)', w2 - 44], ['Daraxt oʻqi', 22, 'r'], ['Bino', 22, 'r']], NKS.filter(k => k !== 'yomgir').map(k => [NET[k].n, fmt(NET[k].tree, 1), fmt(NET[k].bld, 1)]).concat([['Yoritish ustuni', '4,0', '—']]), { rh: 4.2, fs: 1.9 });
      g += t4.g; y += t4.h + 4;
      g += legend(x2, y, [...NT.routes.map(rt => ({ t: (NET[rt.kind].dash ? 'dash' : 'line') as 'line', c: NET[rt.kind].c, l: NET[rt.kind].n })), { t: 'dot', c: '#f2c230', s: K.ink, l: 'Yoritkich (qizil — daraxtga < 4 m)' }, { t: 'fill', c: K.ink, s: K.ink, l: 'Ulanish nuqtasi: TU (qora) / taxminiy (oq)' }], 'Shartli belgilar', 1.9).g;
      g += para(x2, W.y + W.h - 15, w2, `Daraxt va bino masofalari — ShNQ 2.07.01-23, 35- va 8-jadval (N). Yoritilganlik — SNiP 23-05-95 (A), KMK bilan solishtirilsin. ${NT.tuN ? `TU: ${NT.tuN} ta nuqta.` : 'TU kiritilmagan — ulanish nuqtalari taxminiy (P), texnik shartlar olinsin.'} ${NT.exist ? `Mavjud tarmoqlar: ${NT.exist} ta (kulrang).` : 'Mavjud tarmoqlar syomkasi kiritilmagan.'}`, 1.8, 1.3, K.mut, 6).g;
      push('tarmoq', 'Muhandislik tarmoqlari', g, `1:${fmt(P.N)}`);
    }
    /* 12. TIK va balans */
    {
      const siteA = area(G, C.site), wA = A.water.lakeM2, bA = (() => { let n = 0; for (let k = 0; k < G.n; k++) if (C.site[k] && C.bld[k]) n++; return n * G.cellA; })();
      const hardNoB = V.m.hard - bA, bal: [string, number, string][] = [['Maysa', V.m.lawn, K.green], ['Oʻtloq', V.m.meadow, '#e3ecc4'], ['Daraxt-buta va boshqa yashil', Math.max(0, siteA - wA - V.m.hard - V.m.lawn - V.m.meadow), K.green2], ['Suv', wA, K.water], ['Qattiq qoplama, maydonlar', hardNoB, '#e6d8bd'], ['Binolar', bA, K.block]];
      const tot = bal.reduce((s, b) => s + b[1], 0);
      let g = T(W.x, W.y - 2, 'Hudud balansi', { s: 3, w: 700 }) + table(W.x, W.y, [['Element', 70], ['m²', 30, 'r'], ['%', 20, 'r']], [...bal.map(([k, v]) => [k, fmt(v), fmt(v / tot * 100, 1)]), ['Jami', fmt(tot), '100']]).g;
      let x0 = W.x; const by = W.y + 50; bal.forEach(([, v, c]) => { const w = 120 * v / tot; g += R(x0, by, w, 8, c, '#fff', 0.2); x0 += w; });
      const kx = W.x + 135, kw = W.w - 135;
      g += T(kx, W.y - 2, `TIK — ${V.name}`, { s: 3, w: 700 }) + table(kx, W.y, [['Koʻrsatkich', kw - 60], ['Birlik', 24, 'c'], ['Qiymat', 36, 'r']], [
        ['Maydon', 'ga', fmt(A.areaHa, 2)], ['Koʻkalamzor ulushi', '%', fmt(V.m.greenPct, 1)], ['Bir vaqtdagi tashrifchilar', 'kishi', fmt(Vs.N1)], ['Kunlik tashrifchilar', 'kishi/kun', fmt(Vs.Nday)],
        ['Darvozalar', 'ta', String(V.m.gates)], ['Yoʻllar jami', 'm', fmt(V.m.pathLen)], ['Zina / rampa', 'm', `${fmt(V.m.zina)} / ${fmt(V.m.rampa)}`], ['Koʻpriklar', 'ta', String(V.bridges.length)],
        ['Sport maydonlari', 'm²', fmt(V.m.sport)], ['Yer ishlari (sport maydonlari)', 'm³', fmt(V.m.earth)], ...(S.CG ? [['Vertikal rejalash: qazish / toʻkish (P)', 'm³', `${fmt(S.CG.cut)} / ${fmt(S.CG.fill)}`], ['Yer balansi (P)', 'm³', `${S.CG.cut - S.CG.fill >= 0 ? '+' : '−'}${fmt(Math.abs(S.CG.cut - S.CG.fill))}`]] : []), ['Sugʻorish (P)', 'm³/sut', `${fmt(V.m.irrLo)}–${fmt(V.m.irrHi)}`], ['Oʻrtacha aylanma koeffitsiyent', '—', fmt(V.m.prd, 2)]], { rh: 5.6 }).g;
      g += para(W.x, by + 14, 120, 'Qiymat — «Yiriklashtirilgan smeta» varagʻida (hajm × narx kitobi).', 2.4, 1.4, K.mut).g;
      push('tik', 'TIK va hudud balansi', g);
    }
    /* Yiriklashtirilgan smeta (narx kitobi) */
    {
      const progA: Record<string, number> = {}; for (const [k, mk] of Object.entries(DO.masks)) progA[k] = area(G, mk);
      const SM = smeta({ V, PL: PLT, N: NT, uya: FA.boxes.length, prog: progA }, S.prices);
      const rows: string[][] = []; let no = 0;
      for (const gk of Object.keys(GRP)) { const ls = SM.lines.filter(l => l.grp === gk); if (!ls.length) continue; rows.push(['', GRP[gk].toUpperCase(), '', '', '', '', '']); for (const l of ls) rows.push([String(++no), l.n.length > 70 ? l.n.slice(0, 69) + '…' : l.n, l.u, fmt(l.q), l.p != null ? fmt(l.p) : '—', l.sum != null ? fmt(l.sum / 1e6, 1) : '—', l.t]); }
      const rh = Math.min(5, (W.h - 8) / (rows.length + 1));
      let g = table(W.x, W.y, [['№', 8, 'c'], ['Ish va material', 140], ['Birlik', 14, 'c'], ['Hajm', 24, 'r'], ['Narx, soʻm', 28, 'r'], ['Summa, mln soʻm', 30, 'r'], ['Teg', 12, 'c']], rows, { rh, fs: Math.min(2.2, rh * 0.45) }).g;
      const x2 = W.x + 264, w2 = W.w - 264;
      g += T(x2, W.y - 2, 'Jami', { s: 3, w: 700 }) + table(x2, W.y, [['Boʻlim', w2 - 44], ['mln soʻm', 26, 'r'], ['Narxsiz', 18, 'r']], [...SM.byGrp.map(b => [GRP[b.grp], fmt(b.sum / 1e6, 1), String(b.un)]), ['Jami (narxlangan bandlar)', fmt(SM.tot / 1e6, 1), String(SM.unpriced)]], { rh: 5.2, fs: 2.1 }).g;
      const y0 = W.y + 5.2 * (SM.byGrp.length + 2) + 4;
      const st = SM.unpriced ? `Smeta toʻliq emas: ${SM.unpriced} bandning narxi narx kitobida yoʻq («—»). Jami faqat narxlangan ${SM.priced} band yigʻindisi — loyiha qiymati sifatida ishlatilmaydi.` : 'Barcha bandlar narxlangan.';
      const p1 = para(x2, y0, w2, st, 2.3, 1.4, SM.unpriced ? RED : K.ok); g += p1.g;
      const p2 = para(x2, y0 + p1.h + 4, w2, 'Usul: hajm (loyihadan avtomatik) × birlik narxi (narx kitobi). Narx — bozor kuzatuvi yoki taklif, manbasi va sanasi bilan (P). Rasmiy smeta — ishchi loyihada, joriy smeta meʼyorlari bilan. Hajmlar: yoʻl = uzunlik × en; koʻchatlar — ekish vedomostidan; tarmoqlar — trassa uzunligi; jihozlar — tarmoqlar va fauna modulidan.', 2.1, 1.4, K.mut); g += p2.g;
      const src = SM.lines.filter(l => l.src).map(l => `${l.n.split(' (')[0]}: ${l.src}`);
      g += para(x2, y0 + p1.h + p2.h + 8, w2, 'Narx manbalari: ' + (src.length ? src.join(' · ') : '—'), 1.8, 1.3, K.mut, 16).g;
      push('smeta', 'Yiriklashtirilgan smeta', g);
    }
  }
  /* 13. Normalar reyestri */
  {
    const rows: string[][] = [
      ['ShNQ 2.07.01-23, 481/490', 'Bogʻ minimal maydoni (rekonstruksiyada −20 %)', `≥ ${fmt(A.minHa, 1)} ga`, `${fmt(A.areaHa, 2)} ga`, 'N', A.minOk ? '✓' : '✗'],
      ['ShNQ 2.07.01-23, 491', 'Koʻkalamzor ulushi', '≥ 70 %', V ? `${fmt(V.m.greenPct, 1)} %` : '—', 'N', V ? (V.m.greenPct >= 70 ? '✓' : '✗') : '—'],
      ['ShNQ 2.07.01-23, 501', 'Bir vaqtdagi tashrifchilar', `${Vs.q} kishi/ga`, `${fmt(Vs.perHa)} kishi/ga`, 'N', Vs.perHa <= Vs.q ? '✓' : '✗'],
      ['ShNQ 2.07.01-23, 34-jadval', 'Tashrif ulushi s', `${fmt(Vs.s[0], 2)}–${fmt(Vs.s[1], 2)}`, fmt(Vs.s[0], 2), 'N', '—'],
      ['ShNQ 2.07.01-23, 33-jadval', 'Xizmatlar dasturi (1 000 kishiga)', 'jadval', `${A.program.length} band`, 'N', '—'],
      ['ShNQ 2.07.01-23, 480', 'Mavjud daraxt va suv saqlanadi', 'saqlash', V ? `${V.m.conflict} ziddiyat (${V.m.conflictBig} ≥ 40 sm)` : '—', 'N', V && V.m.conflictBig === 0 ? '✓' : '!'],
      ['ShNQ 2.07.02-24', 'MGN yoʻllari nishabi', '≤ 5 %', V ? `> 5 % (zina/rampasiz): ${fmt(V.m.mgnOver)} m` : '—', 'N', V && V.m.mgnOver === 0 ? '✓' : '!'],
      ['ShNQ 2.07.01-23, 494', 'Yoʻl nishabi (‰ — matn tekshirilsin)', '—', '—', 'P', '?'],
      ['BS 5837:2012', 'Daraxt ildiz zonasi radiusi', '12 × dbh', '2–15 m', 'A', '—'],
      ['—', 'Kanal sohil mintaqasi', 'nizom topilmadi', `${A.constraints.canalStrip} m`, 'P', '?'],
      ['—', 'Sugʻorish meʼyori', '—', '15–20 / 3–4 l/m²·sut', 'P', '?'],
    ];
    const g = table(W.x, W.y, [['Manba', 60], ['Talab', 112], ['Norma', 42, 'r'], ['Loyiha', 82, 'r'], ['Teg', 16, 'c'], ['Holat', 18, 'c']], rows, { rh: 7, fs: 2.6 }).g
      + para(W.x, W.y + 7 * (rows.length + 1) + 6, 300, 'Teglar: N — norma (asl matndan), P — taxmin yoki tekshirilishi kerak, A — xorijiy orientir, T — talqin. «!» — loyihada tuzatish kerak; «?» — manba aniqlanmagan.', 2.5, 1.4, K.mut).g;
    push('norma', 'Normalar reyestri', g);
  }
  /* 2. Umumiy maʼlumotlar (varaqlar roʻyxati bilan) */
  {
    const list = out.map((s, i) => [String(i + 1), s.title, s.scale ?? '—']);
    let g = T(W.x, W.y - 2, 'Varaqlar roʻyxati', { s: 3, w: 700 }) + table(W.x, W.y, [['№', 12, 'c'], ['Nomi', 120], ['Masshtab', 28, 'r']], list, { rh: 6.2 }).g;
    const x2 = W.x + 178, w2 = W.w - 178;
    g += T(x2, W.y - 2, 'Maʼlumot manbalari', { s: 3, w: 700 });
    let y = W.y + 1;
    for (const s of [`Daraxtlar: ${REGISTRY_CITE}.`, `Xarita: OpenStreetMap hissadorlari (ODbL), ${S.data.at.slice(0, 10)}.`, `Aholi: ${S.data.popSrc}.`, `Relyef: ${A.relief.src}.`, 'Normalar: ShNQ 2.07.01-23 (joriy tahrir), ShNQ 2.07.02-24.']) { const p = para(x2, y, w2, s, 2.5, 1.4); g += p.g; y += p.h + 2; }
    if (S.brief && (S.brief.goal || S.brief.keep || S.brief.users.length || S.brief.budget != null)) {
      const UN: Record<string, string> = { bolalar: 'bolalar', oila: 'oilalar', yoshlar: 'yoshlar', keksalar: 'keksalar', sport: 'sportchilar', mgn: 'harakati cheklanganlar', sayyoh: 'sayyohlar', ishchi: 'atrofdagi ishchilar' };
      g += T(x2, y + 8, 'Topshiriq', { s: 3, w: 700 }); y += 10;
      for (const t of [S.brief.goal && `Maqsad: ${S.brief.goal}`, S.brief.users.length && `Asosiy foydalanuvchilar: ${S.brief.users.map(u => UN[u] ?? u).join(', ')}.`, S.brief.budget != null && `Byudjet chegarasi: ${fmt(S.brief.budget)} mln soʻm.`, S.brief.keep && `Saqlanishi shart: ${S.brief.keep}`].filter(Boolean) as string[]) { const p = para(x2, y, w2, t, 2.5, 1.4); g += p.g; y += p.h + 2; }
    }
    g += T(x2, y + 8, 'Hisob usuli', { s: 3, w: 700 });
    g += para(x2, y + 10, w2, 'Toʻr 3 m; masofalar — chamfer; yoʻllar — manba–manzil oqimi, nishabli narx va birlashtirish; dastur elementlari (amfiteatr, terrasa, koʻpriklar, qushxona, sport, yomgʻir bogʻlari, oʻtloq) qoidalar bilan topiladi, qoʻlda koordinata yoʻq.', 2.5, 1.4).g;
    out[1].body = g;
  }
  const n = out.length;
  return out.map((s, i) => ({ id: s.id, title: s.title, w: PW, h: PH, svg: frame(i + 1, n, s.title, s.scale, s.body, site, S.author, date) }));
}

function frame(no: number, total: number, title: string, scale: string | undefined, body: string, site: BgSite, author: string | undefined, date: string): string {
  const sx = FR.x + FR.w - STW, sy = FR.y + FR.h - STH;
  const stamp = R(sx, sy, STW, STH, '#fff', K.ink, 0.5) + L(sx, sy + 8, sx + STW, sy + 8) + L(sx, sy + 18, sx + STW, sy + 18) + L(sx, sy + 28, sx + STW, sy + 28) + L(sx + 65, sy, sx + 65, sy + STH) + L(sx + 135, sy + 18, sx + 135, sy + STH) + L(sx + 160, sy + 18, sx + 160, sy + STH)
    + T(sx + 2, sy + 5.5, 'Archemistry Lab · Bogʻshunos', { s: 2.6, w: 700 }) + T(sx + 67, sy + 5.5, site.name, { s: 3, w: 700 })
    + T(sx + 2, sy + 13.5, 'Bosqich: Konsepsiya (P)', { s: 2.4 }) + T(sx + 67, sy + 13.5, site.place, { s: 2.6 })
    + T(sx + 2, sy + 23.5, `Ishlab chiqdi: ${author ?? '____________'}`, { s: 2.4 }) + T(sx + 67, sy + 23.5, title.length > 34 ? title.slice(0, 33) + '…' : title, { s: 2.8, w: 700 })
    + T(sx + 2, sy + 33.5, 'Tekshirdi: ______________', { s: 2.4 }) + T(sx + 67, sy + 36.5, scale ? `Masshtab ${scale}` : '', { s: 2.4 })
    + T(sx + 137, sy + 22, 'Varaq', { s: 2 }) + T(sx + 147.5, sy + 33, no, { s: 5, w: 700, a: 'middle' }) + T(sx + 162, sy + 22, 'Varaqlar', { s: 2 }) + T(sx + 172.5, sy + 33, total, { s: 5, w: 700, a: 'middle' })
    + T(sx + 2, sy + STH - 1.5, date, { s: 2, c: '#666' });
  const head = T(FR.x + 6, FR.y + 8.5, title, { s: 5, w: 700 }) + T(FR.x + FR.w - STW - 4, FR.y + 8.5, `${no} / ${total}`, { s: 2.6, c: K.mut, a: 'end' });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${PW}mm" height="${PH}mm" viewBox="0 0 ${PW} ${PH}"><rect width="${PW}" height="${PH}" fill="#fff"/>${head}${body}${R(FR.x, FR.y, FR.w, FR.h, 'none', K.ink, 0.6)}${stamp}</svg>`;
}
