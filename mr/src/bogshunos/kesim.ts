/**
 * Bogʻshunos — bogʻ kesimi asbobi va qirgʻoq tipologiyalari (7–12-qadamlar). Grafika — Koʻchasoz kesimi uslubida (js/app.js sectionSVG):
 * qalin yer chizigʻi, tuproq shtrixi, odam/oʻsimlik siluetlari (kochasoz/boards/ua.json), pastda oʻlcham zanjiri; daraxtlar — DWG kutubxonasidan (symbols.ELEV).
 *
 * Kesim chizigʻi qoidalar bilan (qoʻlda emas): A–A — amfiteatr markazidan koʻl markaziga va davomi; B–B — koʻl markazidan unga perpendikulyar.
 * Profil 1 m qadamda: relyef (Ctx.E, topo yoki terrarium — P), yuza turi (suv, kanal, yoʻl turi va eni, dastur elementi, maysa, oʻtloq),
 * chiziqdan ≤ 6 m dagi daraxtlar (mavjud — reyestr balandligi; yangi — kattalik sinfidan yetuk balandlik, P).
 * Suv: sath = qirgʻoqdagi eng past yer; koʻl chuqurligi 1,4 m (P, foydalanuvchi farazi). Vertikal masshtab = gorizontal (1:1, buzilmagan).
 * Quyosh: tush paytidagi balandlik 90° − φ ± 23,44° (yoz/qish), φ — uchastka kengligi.
 */
import type { XY, BgSite } from './types';
import type { Ctx } from './analyze';
import type { DesignOut } from './design';
import type { Planting } from './planting';
import { ELEV, type ElevKey } from './symbols';
import { distance, distSeg } from './grid';
import UA_ from '../kochasoz/boards/ua.json';
import { DSIL } from './odamlar';
import { SHT } from './shtaffaj';
/** kesim daraxtlari — foydalanuvchi shtaffaj kutubxonasidan (daraxt-kesim), shakl turi boʻyicha */
const TK: Record<ElevKey, string[]> = { yirik: ['veg-017', 'veg-051', 'veg-024', 'veg-023'], kichik: ['veg-019', 'veg-023', 'veg-048', 'veg-050', 'veg-063'], kolonna: ['veg-084', 'veg-119'], igna: ['veg-035', 'veg-118'], ignaKeng: ['veg-035'], majnun: ['veg-047'] };
const TBG = ['veg-017', 'veg-019', 'veg-051', 'veg-023', 'veg-084', 'veg-118', 'veg-050'];
const TNEW = ['#9fc485', '#8db978', '#a8c98f', '#94bd7f'], TNEWb = ['#c9dcb8', '#bfd6ab', '#cfe0bf', '#c4d9b1'], TOLD = ['#b1bfa3', '#a6b598'];

const UA = UA_ as unknown as Record<string, { d: [string, number?][]; w: number; h: number; ox: number; oy: number }>;
export const LAKE_DEPTH = 1.4;
const INK = '#141414', f2 = (v: number) => (Math.round(v * 100) / 100).toString();
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const T = (x: number, y: number, s: unknown, o: { s?: number; w?: number; a?: string; c?: string } = {}) => `<text x="${f2(x)}" y="${f2(y)}" font-size="${o.s ?? 2.4}" font-family="Arial, Helvetica, sans-serif"${o.w ? ` font-weight="${o.w}"` : ''}${o.a ? ` text-anchor="${o.a}"` : ''} fill="${o.c ?? INK}">${esc(s)}</text>`;

export type Surf = 'suv' | 'kanal' | 'yol' | 'zina' | 'rampa' | 'amfiteatr' | 'terrasa' | 'sport' | 'bolalar' | 'botqoq' | 'yomgir' | 'otloq' | 'maysa' | 'bino' | 'boshqa' | 'tashqi';
export interface Sample { s: number; z: number; surf: Surf }
export interface STree { s: number; z: number; h: number; c: number; key: ElevKey; isNew: boolean; off: number }
export interface Profile { name: string; a: XY; b: XY; len: number; pts: Sample[]; trees: STree[]; wl: number | null; lat: number }

/** Hudud ichidagi eng katta koʻl halqasi */
export function mainLake(C: Ctx): XY[] | null {
  const ar = (r: XY[]) => { let a = 0; for (let i = 0; i < r.length; i++) { const p = r[i], q = r[(i + 1) % r.length]; a += p[0] * q[1] - q[0] * p[1]; } return Math.abs(a / 2); };
  const inSite = (r: XY[]) => r.some(p => { const k = C.G.idx(p[0], p[1]); return k >= 0 && C.site[k] === 1; });
  return C.lakes.flatMap(mp => mp.map(poly => poly[0])).filter(inSite).sort((x, y) => ar(y) - ar(x))[0] ?? null;
}
/** Kesim chiziqlari (qoidalar bilan) */
export function sectionLines(C: Ctx, DO: DesignOut): { name: string; a: XY; b: XY }[] {
  const out: { name: string; a: XY; b: XY }[] = [];
  const lake = mainLake(C); if (!lake) { // koʻl yoʻq — hududning eng uzun oʻqi
    const B = C.boundary; let best: [XY, XY] = [B[0], B[1]], bd = 0; for (const p of B) for (const q of B) { const d = Math.hypot(p[0] - q[0], p[1] - q[1]); if (d > bd) { bd = d; best = [p, q]; } }
    const m: XY = [(best[0][0] + best[1][0]) / 2, (best[0][1] + best[1][1]) / 2], ux = (best[1][0] - best[0][0]) / bd, uy = (best[1][1] - best[0][1]) / bd;
    return [{ name: 'A–A', a: [m[0] + uy * 200, m[1] - ux * 200], b: [m[0] - uy * 200, m[1] + ux * 200] }];
  }
  let cx = 0, cy = 0; for (const p of lake) { cx += p[0]; cy += p[1]; } cx /= lake.length; cy /= lake.length;
  const am = DO.V.items.find(i => i.id === 'amfiteatr')?.p ?? DO.V.items.find(i => i.id === 'terrasa')?.p ?? [cx + 50, cy];
  const dx = cx - am[0], dy = cy - am[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
  out.push({ name: 'A–A', a: [am[0] - ux * 120, am[1] - uy * 120], b: [cx + ux * 200, cy + uy * 200] });
  out.push({ name: 'B–B', a: [cx - uy * 200, cy + ux * 200], b: [cx + uy * 200, cy - ux * 200] });
  return out;
}

/** Profil: 1 m qadam, faqat hudud ichidagi qism (+ 10 m atrof) */
export function profile(C: Ctx, DO: DesignOut, PL: Planting | null, site: BgSite, line: { name: string; a: XY; b: XY }): Profile {
  const G = C.G, M = DO.masks, [a, b] = [line.a, line.b], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const tier = (k: number): Surf | null => { // yoʻl turi niqob emas — chiziqlardan
    const p: XY = [G.cx(k % G.nx), G.cy((k / G.nx) | 0)];
    for (const q of DO.V.paths) for (let i = 1; i < q.g.length; i++) if (distSeg(p, q.g[i - 1], q.g[i]) <= q.w / 2 + 0.5) return q.tier === 'zina' ? 'zina' : q.tier === 'rampa' ? 'rampa' : 'yol';
    return null;
  };
  const raw: Sample[] = [];
  for (let s = 0; s <= L; s += 1) {
    const p: XY = [a[0] + (b[0] - a[0]) * s / L, a[1] + (b[1] - a[1]) * s / L], k = G.idx(p[0], p[1]);
    if (k < 0 || !Number.isFinite(C.E[k])) { raw.push({ s, z: NaN, surf: 'tashqi' }); continue; }
    let surf: Surf = 'tashqi';
    if (C.site[k]) surf = C.water[k] ? 'suv' : C.canal[k] ? 'kanal' : C.bld[k] ? 'bino' : M.amfiteatr?.[k] ? 'amfiteatr' : M.terrasa?.[k] ? 'terrasa' : (M.sport_yangi?.[k] || M.sport_mavjud?.[k]) ? 'sport' : M.bolalar?.[k] ? 'bolalar' : M.hard?.[k] ? (tier(k) ?? 'yol') : M.botqoq?.[k] ? 'botqoq' : M.yomgir_bogi?.[k] ? 'yomgir' : M.otloq?.[k] ? 'otloq' : C.grass[k] ? 'maysa' : 'boshqa';
    raw.push({ s, z: C.E[k], surf });
  }
  // hudud ichidagi oraliq ± 10 m
  const i0 = Math.max(0, raw.findIndex(r => r.surf !== 'tashqi') - 10), i1 = Math.min(raw.length - 1, raw.length - 1 - [...raw].reverse().findIndex(r => r.surf !== 'tashqi') + 10);
  const pts = raw.slice(i0, i1 + 1).map(r => ({ ...r, s: r.s - raw[i0].s })).filter(r => Number.isFinite(r.z));
  // suv sathi — suv kataklariga qoʻshni eng past yer
  let wl: number | null = null; pts.forEach((p, i) => { if (p.surf === 'suv' || p.surf === 'kanal') { for (const q of [pts[i - 1], pts[i + 1]]) if (q && q.surf !== 'suv' && q.surf !== 'kanal') wl = wl == null ? q.z : Math.min(wl, q.z); } });
  if (wl != null) for (const p of pts) if (p.surf === 'suv' || p.surf === 'kanal') p.z = wl;
  // daraxtlar: chiziqdan ≤ 6 m
  const off0 = raw[i0].s, ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L, trees: STree[] = [];
  const zAt = (s: number) => { const p = pts.reduce((m, q) => (Math.abs(q.s - s) < Math.abs(m.s - s) ? q : m), pts[0]); return p?.z ?? 0; };
  const proj = (p: XY) => { const t = (p[0] - a[0]) * ux + (p[1] - a[1]) * uy, off = Math.abs((p[0] - a[0]) * uy - (p[1] - a[1]) * ux); return { s: t - off0, off }; };
  C.trees.forEach((t, i) => { if (PL && (PL.decisions[i] === 'kesiladi' || PL.decisions[i] === 'kochiriladi')) return; const q = proj(t.p); if (q.off > 6 || q.s < 0 || q.s > (pts[pts.length - 1]?.s ?? 0)) return; trees.push({ s: q.s, z: zAt(q.s), h: Math.max(3, t.h || 8), c: Math.max(2, t.c || 4), key: /Juniperus|Pinus|Picea|Platycladus|Cupressus|Thuja/.test(t.sp) || /archa|qaragʹay|biota|sarv|tuya/i.test(t.sp) ? 'igna' : t.c > 9 ? 'yirik' : 'kichik', isNew: false, off: q.off }); });
  const HT: Record<string, number> = { Д1: 20, Д2: 15, Д3: 11, Д4: 7, Д1К: 12, Д4К: 6 };
  for (const t of PL?.trees ?? []) { const q = proj(t.p); if (q.off > 6 || q.s < 0 || q.s > (pts[pts.length - 1]?.s ?? 0)) continue; trees.push({ s: q.s, z: zAt(q.s), h: HT[t.sp.size] ?? 10, c: t.crown, key: t.sp.g === 'igna' ? 'igna' : /К/.test(t.sp.size) ? 'kolonna' : /Salix/.test(t.sp.lat) ? 'majnun' : t.crown >= 9 ? 'yirik' : 'kichik', isNew: true, off: q.off }); }
  trees.sort((p, q) => q.off - p.off);
  return { name: line.name, a, b, len: pts.length ? pts[pts.length - 1].s : 0, pts, trees, wl, lat: site.origin[1] };
}

const SURF: Record<Surf, [string, string]> = {
  suv: ['#cbdde3', 'Suv'], kanal: ['#b7d0da', 'Kanal'], yol: ['#d8c7a4', 'Yoʻl'], zina: ['#c99a55', 'Zina'], rampa: ['#e0bb7a', 'Rampa'], amfiteatr: ['#e7b98e', 'Amfiteatr'], terrasa: ['#d9a77a', 'Terrasa'],
  sport: ['#c9b8e0', 'Sport'], bolalar: ['#f4c98f', 'Bolalar'], botqoq: ['#b9d9cf', 'Botqoq qirgʻoq'], yomgir: ['#a9cdb9', 'Yomgʻir bogʻi'], otloq: ['#e3ecc4', 'Oʻtloq'], maysa: ['#c9dcc0', 'Maysa'],
  bino: ['#d9d4cd', 'Bino'], boshqa: ['#dfe6d3', 'Daraxtzor'], tashqi: ['#efede9', 'Hududdan tashqari'],
};
/** ua.json siluet: (x, y) — asos (pastki markaz), hm — balandlik mm */
function ua(nm: string, x: number, y: number, hm: number, fill: string, flip = false, op = 1): string {
  const a = UA[nm]; if (!a) return ''; const s = hm / a.h;
  return `<g transform="translate(${f2(x)} ${f2(y)}) scale(${(flip ? -s : s).toFixed(4)} ${s.toFixed(4)}) translate(${-a.ox} ${-a.oy})" opacity="${op}">${a.d.map(p => `<path d="${p[0]}" fill="${p[1] ? '#ffffff' : fill}"/>`).join('')}</g>`;
}

/** Kesimni chizish: rect (mm) ichiga, N — masshtab 1:N. Qaytaradi SVG boʻlagi.
 * Grafika (15.11, 2-tahrir — landshaft taqdimot kesimlari uslubida): relyef silliqlanadi (3 m toʻrdagi zinapoya yoʻqoladi), yer — ingichka chiziq,
 * kesilgan tuproq — iliq gradient (shtrixsiz), yuza turi — yer ostidagi ingichka rangli tasma, suv — gradient va punktir sath,
 * daraxtlar — yumshoq toʻldirilgan toj + ingichka shox chizigʻi, bir-birini koʻp yopadigan orqa daraxtlar tashlanadi; odamlar — toʻq kulrang. */
export function drawSection(P: Profile, r: { x: number; y: number; w: number; h: number }, N?: number): { g: string; N: number } {
  const sp = P.len || 1, wet = (p: Sample) => p.surf === 'suv' || p.surf === 'kanal';
  // relyefni silliqlash (±3 m, suvdan tashqari) — balandlik belgilari asl qiymatdan
  const zS = P.pts.map((p, n) => { if (wet(p)) return p.z; let a = 0, c = 0; for (let m = n - 3; m <= n + 3; m++) { const q = P.pts[m]; if (q && !wet(q)) { const w = 4 - Math.abs(m - n); a += q.z * w; c += w; } } return c ? a / c : p.z; });
  // amfiteatr: silliq yer oʻrniga pogʻonalar (0,45 m, A) — tuproq va yer chizigʻi ham shunga ergashadi
  for (let n = 0; n < P.pts.length;) { if (P.pts[n].surf !== 'amfiteatr') { n++; continue; } let m = n; while (m + 1 < P.pts.length && P.pts[m + 1].surf === 'amfiteatr') m++; const z0 = zS[n], z1 = zS[m], st = Math.max(2, Math.round(Math.abs(z1 - z0) / 0.45)); for (let q = n; q <= m; q++) { const f = Math.min(st - 1, Math.floor((q - n) / Math.max(1, m - n + 1) * st)); zS[q] = z0 + (z1 - z0) * f / (st - 1); } n = m + 1; }
  const zs = zS, zmin = Math.min(...zs, P.wl != null ? P.wl - LAKE_DEPTH : Infinity) - 3, zmax = Math.max(...zs) + Math.max(14, ...P.trees.map(t => t.h)) + 2;
  const need = Math.max(sp / (r.w - 10), (zmax - zmin) / (r.h - 26)) * 1000, NN = N ?? ([200, 250, 500, 750, 1000, 1500, 2000].find(v => v >= need) ?? Math.ceil(need / 500) * 500), k = 1000 / NN;
  const x0 = r.x + 4, base = r.y + r.h - 22, X = (s: number) => x0 + s * k, Y = (z: number) => base - (z - zmin - 3) * k, Zp = (n: number) => (wet(P.pts[n]) ? P.pts[n].z - LAKE_DEPTH : zS[n]);
  const id = `bgh${Math.round(r.x * 10)}${Math.round(r.y * 10)}`;
  let soil = `M${f2(X(0))} ${f2(base)}`; P.pts.forEach((p, n) => { soil += `L${f2(X(p.s))} ${f2(Y(Zp(n)))}`; }); soil += `L${f2(X(sp))} ${f2(base)}Z`;
  // yuza boʻlaklari; o'lcham zanjiri uchun < 3 m boʻlaklar qoʻshnisiga qoʻshiladi
  let i = 0; const runs: { a: number; b: number; t: Surf }[] = [];
  while (i < P.pts.length) { let j = i; while (j + 1 < P.pts.length && P.pts[j + 1].surf === P.pts[i].surf) j++; runs.push({ a: P.pts[i].s, b: P.pts[j].s + 1, t: P.pts[i].surf }); i = j + 1; }
  const chain: { a: number; b: number; t: Surf }[] = []; for (const q of runs) { const L = chain[chain.length - 1]; if (L && ((q.b - q.a) * k < 4 || (L.b - L.a) * k < 4)) { if (q.b - q.a > L.b - L.a) L.t = q.t; L.b = q.b; } else chain.push({ ...q }); }
  let g = `<defs><linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e6dccb"/><stop offset="1" stop-color="#f6f2eb"/></linearGradient><linearGradient id="${id}w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c3dce4"/><stop offset="1" stop-color="#8db4c2"/></linearGradient><clipPath id="${id}"><path d="${soil}"/></clipPath></defs>`;
  // suv tanasi (sath — punktir)
  if (P.wl != null) for (const q of runs) if (q.t === 'suv' || q.t === 'kanal') g += `<rect x="${f2(X(q.a))}" y="${f2(Y(P.wl))}" width="${f2((q.b - q.a) * k)}" height="${f2(LAKE_DEPTH * k + 0.2)}" fill="url(#${id}w)"/><line x1="${f2(X(q.a))}" y1="${f2(Y(P.wl))}" x2="${f2(X(q.b))}" y2="${f2(Y(P.wl))}" stroke="#4f8297" stroke-width=".22" stroke-dasharray="1.2 .6"/>`;
  // tuproq: iliq gradient + yuza turi tasmasi (yer ostida, kesimga kesilgan)
  let band = ''; for (const q of runs) { if (wet({ s: 0, z: 0, surf: q.t }) || q.t === 'tashqi') continue; let d = ''; P.pts.forEach((p, n) => { if (p.s >= q.a && p.s <= q.b) d += `${d ? 'L' : 'M'}${f2(X(p.s))} ${f2(Y(zS[n]))}`; }); if (d) band += `<path d="${d}" fill="none" stroke="${SURF[q.t][0]}" stroke-width="${f2(Math.max(1.2, 0.9 * k))}" stroke-linejoin="round"/>`; }
  // orqa fon: xira daraxt siluetlari (havo perspektivasi, T) — kesimga chuqurlik beradi
  { let bg = ''; let h0 = 0; for (let s2 = 2; s2 < sp - 2; s2 += 7 + (h0 % 5)) { h0 = (h0 * 7 + 11) % 97; const n = P.pts.findIndex(p => p.s >= s2); if (n < 0 || wet(P.pts[n]) || P.pts[n].surf === 'tashqi') continue; const nm = TBG[h0 % TBG.length], sh = SHT[nm], sy = (9 + (h0 % 7)) * k / sh.h; bg += `<g transform="translate(${f2(X(s2))} ${f2(Y(zS[n]))}) scale(${(h0 % 2 ? -sy : sy).toFixed(4)} ${sy.toFixed(4)}) translate(${-sh.ox} ${-sh.oy})"><path d="${sh.f}" fill="#edf0ea"/></g>`; } g += bg; }
  g += `<path d="${soil}" fill="url(#${id}s)"/><g clip-path="url(#${id})">${band}</g>`;
  // yer chizigʻi — ingichka, yumaloq burilish
  let ground = ''; P.pts.forEach((p, n) => { ground += `${n ? 'L' : 'M'}${f2(X(p.s))} ${f2(Y(wet(p) ? (P.wl ?? p.z) : zS[n]))}`; });
  g += `<path d="${ground}" fill="none" stroke="#2a2826" stroke-width=".38" stroke-linejoin="round" stroke-linecap="round"/>`;
  // daraxtlar: oldingilar saqlanadi, orqadagi bir-birini koʻp yopadiganlari tashlanadi
  const keep: STree[] = []; for (const t of [...P.trees].sort((p, q) => p.off - q.off)) { if (t.off > 1.5 && keep.some(q => Math.abs(q.s - t.s) < 0.45 * Math.max(q.c, t.c))) continue; keep.push(t); }
  keep.sort((p, q) => q.off - p.off);
  for (const t of keep) {
    const nm = TK[t.key][Math.abs(Math.round(t.s * 7 + t.off * 13)) % TK[t.key].length], sh = SHT[nm], back = t.off > 3, x = X(t.s), y = Y(zAtS(P, zS, t.s));
    const sy = t.h * k / sh.h, sx = sy * Math.max(0.8, Math.min(1.3, (t.c * k) / (sh.w * sy))) * (Math.round(t.s) % 2 ? -1 : 1), hue = Math.abs(Math.round(t.s * 3)) % 4;
    const fc = t.isNew ? (back ? TNEWb[hue] : TNEW[hue]) : (back ? '#d3dccb' : TOLD[hue % 2]), lc = t.isNew ? '#4e6b3f' : '#6d7566', sa = Math.abs(sy);
    g += `<g transform="translate(${f2(x)} ${f2(y)}) scale(${sx.toFixed(4)} ${sy.toFixed(4)}) translate(${-sh.ox} ${-sh.oy})"><path d="${sh.f}" fill="${fc}"/>${back ? '' : `<path d="${sh.i}" fill="none" stroke="${lc}" stroke-width="${(0.05 / sa).toFixed(2)}" stroke-opacity=".45"/>`}<path d="${sh.k}" fill="none" stroke="${lc}" stroke-width="${((back ? 0.05 : 0.09) / sa).toFixed(2)}" stroke-opacity="${back ? 0.35 : 0.8}" stroke-linejoin="round"/></g>`;
  }
  // odamlar: yuzaga qarab (har ~18 m, T) — Koʻchasoz siluetlari (toʻla) va DWG kutubxonasi siluetlari (chiziqli), toʻq kulrang
  const PC = '#4a4846';
  const dsil = (nm: keyof typeof DSIL, x: number, y: number, flip: boolean) => { const o = DSIL[nm], h = o.hm * k; return `<g transform="translate(${f2(x)} ${f2(y)}) scale(${(flip ? -h : h).toFixed(4)} ${h.toFixed(4)})"><path d="${o.d}" fill="none" stroke="${PC}" stroke-width="${(0.07 / h).toFixed(4)}" stroke-linejoin="round" stroke-linecap="round"/></g>`; };
  // shtaffaj (v2): bolalar, velosipedchi, sport — toʻldirilgan siluet, toʻq kulrang
  const v2 = (nm: string, x: number, y: number, hm: number, flip: boolean, fill = PC) => { const o = SHT[nm]; if (!o) return ''; const s2 = hm * k / o.h; return `<g transform="translate(${f2(x)} ${f2(y)}) scale(${(flip ? -s2 : s2).toFixed(4)} ${s2.toFixed(4)}) translate(${-o.ox} ${-o.oy})"><path d="${o.f}" fill="${fill}"/></g>`; };
  type Who = string | [keyof typeof DSIL] | { v: string; h: number };
  const VEL = ['velosipedchi-00', 'velosipedchi-03', 'velosipedchi-01', 'velosipedchi-13'].map(v => ({ v, h: 1.75 })), BOL = ['bola-03', 'bola-08', 'bola-09', 'bola-12', 'bola-15', 'bola-20', 'bola-22', 'bola-25', 'bola-29', 'bola-33', 'bola-36', 'bola-40', 'bola-48', 'bola-56'].map(v => ({ v, h: 1.15 }));
  const WHO: Partial<Record<Surf, Who[]>> = { yol: ['ayol_yurgan', 'erkak_yurgan', VEL[0], 'qariya', 'ayol_sumka', BOL[1], 'erkak_turgan', VEL[1], 'ona_bola', 'aravacha', ['it_sayr'], VEL[2]], rampa: [['nogiron'], 'ayol_yurgan'], amfiteatr: ['otirgan_blok', 'erkak_turgan', 'otirgan_blok', BOL[10]], terrasa: ['otirgan_stul', 'ayol_yurgan'], bolalar: BOL, sport: [{ v: 'sport-05', h: 1.75 }, { v: 'sport-14', h: 1.6 }, 'yuguruvchi', { v: 'sport-00', h: 1.9 }, { v: 'sport-17', h: 1.75 }] };
  let pi = 0; for (const q of runs) { const L = WHO[q.t]; if (!L || q.b - q.a < 2) continue; const st = q.t === 'bolalar' || q.t === 'amfiteatr' ? 7 : 16; for (let s2 = q.a + 1.5; s2 < q.b - 0.5; s2 += st) { const z = zAtS(P, zS, s2), w = L[pi % L.length], fl = pi % 2 === 1; g += Array.isArray(w) ? dsil(w[0], X(s2), Y(z), fl) : typeof w === 'object' ? v2(w.v, X(s2), Y(z), w.h, fl) : ua(w, X(s2), Y(z), (w.startsWith('otirgan') ? 1.3 : 1.7) * k, PC, fl); pi++; } }
  // yoritish ustunlari — yoʻl boʻylab har ~30 m (illyustrativ, T)
  for (const q of runs) if (q.t === 'yol' && q.b - q.a >= 6) for (let s2 = q.a + 2; s2 < q.b - 1; s2 += 30) g += v2('fonar-07', X(s2), Y(zAtS(P, zS, s2)), 4.5, false, '#9b968f');
  // quyosh (tush): yoz va qish balandligi — kichik, oʻng yuqori burchakda
  const hs = 90 - P.lat + 23.44, hw = 90 - P.lat - 23.44, sx = r.x + r.w - 6, sy = r.y + 6;
  for (const [hh, c, l] of [[hs, '#c0643a', `yoz ${f2(hs).replace('.', ',')}°`], [hw, '#3f6fa8', `qish ${f2(hw).replace('.', ',')}°`]] as [number, string, string][]) { const ex = sx - 9 * Math.cos(hh * Math.PI / 180), ey = sy + 9 * Math.sin(hh * Math.PI / 180); g += `<line x1="${f2(sx)}" y1="${f2(sy)}" x2="${f2(ex)}" y2="${f2(ey)}" stroke="${c}" stroke-width=".25" stroke-dasharray=".8 .5"/>` + T(ex - 0.8, ey + 2, l, { s: 1.7, c, a: 'end' }); }
  g += `<circle cx="${f2(sx)}" cy="${f2(sy)}" r="1.1" fill="#f0c43a" stroke="#c0643a" stroke-width=".2"/>`;
  // yuza tasmasi va oʻlcham zanjiri (kichik boʻlaklar birlashtirilgan)
  const LG = '#5f5a55';
  g += `<line x1="${f2(X(0))}" y1="${f2(base + 6)}" x2="${f2(X(sp))}" y2="${f2(base + 6)}" stroke="${LG}" stroke-width=".18"/>`;
  for (const q of chain) { g += `<rect x="${f2(X(q.a))}" y="${f2(base + 2)}" width="${f2((q.b - q.a) * k)}" height="1.6" fill="${SURF[q.t][0]}"/><line x1="${f2(X(q.a) - 0.7)}" y1="${f2(base + 6.7)}" x2="${f2(X(q.a) + 0.7)}" y2="${f2(base + 5.3)}" stroke="${LG}" stroke-width=".22"/>`; const w = (q.b - q.a) * k; if (w > 6) g += T(X(q.a) + w / 2, base + 9.6, `${Math.round(q.b - q.a)}`, { s: 1.8, a: 'middle', c: LG }); if (w > 14) g += T(X(q.a) + w / 2, base + 12.6, SURF[q.t][1], { s: 1.6, a: 'middle', c: '#8a847e' }); }
  g += `<line x1="${f2(X(sp) - 0.7)}" y1="${f2(base + 6.7)}" x2="${f2(X(sp) + 0.7)}" y2="${f2(base + 5.3)}" stroke="${LG}" stroke-width=".22"/>`;
  // balandlik belgilari (oq halo bilan): eng past / eng baland; suv sathi — suv ichida
  const halo = (x: number, y: number, t: string, o: { s?: number; a?: string; c?: string } = {}) => `<text x="${f2(x)}" y="${f2(y)}" font-size="${o.s ?? 1.8}" font-family="Arial, Helvetica, sans-serif"${o.a ? ` text-anchor="${o.a}"` : ''} fill="${o.c ?? INK}" stroke="#ffffff" stroke-width=".6" paint-order="stroke" stroke-linejoin="round">${esc(t)}</text>`;
  const land = P.pts.map((p, n) => ({ p, z: zS[n] })).filter(q => !wet(q.p));
  if (land.length) { const lo = land.reduce((m, q) => (q.z < m.z ? q : m)), hi = land.reduce((m, q) => (q.z > m.z ? q : m));
    for (const q of [hi, lo]) { const xx = X(q.p.s), yy = Y(q.z); g += `<path d="M${f2(xx)} ${f2(yy - 0.3)}l-.8 -1.3h1.6Z" fill="${INK}"/>` + halo(xx, yy - 2, `+${f2(q.p.z).replace('.', ',')}`, { a: 'middle' }); } }
  if (P.wl != null) { const fw = P.pts.find(wet)!; g += halo(X(fw.s) + 1.5, Y(P.wl) + 2.6, `▽ suv sathi +${f2(P.wl).replace('.', ',')} · chuqurlik ${String(LAKE_DEPTH).replace('.', ',')} m (P)`, { s: 1.6, c: '#2f5f72' }); }
  g += T(r.x, r.y + 4, `Kesim ${P.name}`, { s: 3.6, w: 700 }) + T(r.x + 30, r.y + 4, `M 1:${NN} · vertikal 1:${NN} (buzilmagan) · uzunligi ${Math.round(sp)} m`, { s: 2.2, c: '#77716c' });
  return { g, N: NN };
}
/** silliqlangan profildan s nuqtadagi balandlik */
function zAtS(P: Profile, zS: number[], s: number): number { let b = 0; for (let n = 1; n < P.pts.length; n++) if (Math.abs(P.pts[n].s - s) < Math.abs(P.pts[b].s - s)) b = n; return zS[b] ?? 0; }

/* ---------------- qirgʻoq tipologiyalari ---------------- */
export type ShoreT = 'amfiteatr' | 'terrasa' | 'botqoq' | 'promenada' | 'tik' | 'kanal' | 'tabiiy';
export const SHORE: Record<ShoreT, { n: string; c: string; d: string }> = {
  amfiteatr: { n: 'Pogʻonali qirgʻoq (amfiteatr)', c: '#e7b98e', d: 'Suvga tushuvchi oʻtirgʻichlar 0,45 × 0,9 m; pastki pogʻona sathdan +0,3 m (A).' },
  terrasa: { n: 'Terrasa / konsol', c: '#d9a77a', d: 'Yogʻoch sahn suv ustiga ≤ 6 m konsol, toʻsiq 1,1 m (A).' },
  botqoq: { n: 'Botqoq (ekologik) qirgʻoq', c: '#b9d9cf', d: 'Yotiq nishab ≤ 1:6, qamish-qiyoq zonasi 3–5 m, suv sifati va qushlar uchun (T).' },
  promenada: { n: 'Sohil yoʻli + maysa nishabi', c: '#d3c3a3', d: 'Yoʻl suvdan 6–9 m, orasida 1:4 maysa nishabi; qirgʻoq tosh bilan mustahkamlanadi (T).' },
  tik: { n: 'Tik qirgʻoq / tirgak devor', c: '#b0a596', d: 'Qiyalik > 12 %: gabion yoki tosh devor, tepada toʻsiq (T).' },
  kanal: { n: 'Kanal tomoni (muhofaza mintaqasi)', c: '#8fb3c1', d: 'Kanal sohil mintaqasi — qurilmaydi, daraxtzor saqlanadi (P).' },
  tabiiy: { n: 'Tabiiy qirgʻoq (daraxtzor)', c: '#9fc28a', d: 'Mavjud daraxt va maysa saqlanadi, yengil mustahkamlash (T).' },
};
export interface ShoreSeg { t: ShoreT; pts: XY[]; len: number; slope: number }
export function shores(C: Ctx, DO: DesignOut): { segs: ShoreSeg[]; tot: Record<ShoreT, number>; perim: number } {
  const G = C.G, M = DO.masks, dCanal = distance(G, C.canal), near = (m: Uint8Array | undefined, p: XY, R: number) => { if (!m) return false; for (let dy = -R; dy <= R; dy += G.step) for (let dx = -R; dx <= R; dx += G.step) { const k = G.idx(p[0] + dx, p[1] + dy); if (k >= 0 && m[k]) return true; } return false; };
  const sohil = G.u8(); for (const p of DO.V.paths) if (p.tier === 'sohil') for (const q of p.g) { const k = G.idx(q[0], q[1]); if (k >= 0) sohil[k] = 1; }
  const segs: ShoreSeg[] = [], tot = { amfiteatr: 0, terrasa: 0, botqoq: 0, promenada: 0, tik: 0, kanal: 0, tabiiy: 0 } as Record<ShoreT, number>; let perim = 0;
  for (const mp of C.lakes) for (const poly of mp) for (const ring of poly) {
    // halqani ~3 m qadamga
    const P: XY[] = []; for (let i = 0; i < ring.length; i++) { const a = ring[i], b = ring[(i + 1) % ring.length], n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 3)); for (let j = 0; j < n; j++) P.push([a[0] + (b[0] - a[0]) * j / n, a[1] + (b[1] - a[1]) * j / n]); }
    const cls = P.map((p): { t: ShoreT; s: number } => {
      const k = G.idx(p[0], p[1]), s = k >= 0 ? C.S[k] : 0, inSite = k >= 0 && C.site[k];
      if (!inSite) return { t: 'tabiiy', s };
      if (k >= 0 && dCanal[k] <= 12) return { t: 'kanal', s };
      if (near(M.amfiteatr, p, 12)) return { t: 'amfiteatr', s };
      if (near(M.terrasa, p, 9)) return { t: 'terrasa', s };
      if (near(M.botqoq, p, 6)) return { t: 'botqoq', s };
      if (s > 12) return { t: 'tik', s };
      if (near(sohil, p, 10)) return { t: 'promenada', s };
      return { t: 'tabiiy', s };
    });
    let cur: ShoreSeg | null = null;
    P.forEach((p, i) => { const c = cls[i], d = i ? Math.hypot(p[0] - P[i - 1][0], p[1] - P[i - 1][1]) : 0; perim += d; tot[c.t] += d; if (!cur || cur.t !== c.t) { if (cur) segs.push(cur); cur = { t: c.t, pts: i ? [P[i - 1], p] : [p], len: d, slope: c.s }; } else { cur.pts.push(p); cur.len += d; cur.slope = Math.max(cur.slope, c.s); } });
    if (cur) segs.push(cur);
  }
  return { segs, tot, perim };
}
/** Tipologiya sxematik kesimi (oʻlchamli, 1:200 atrofida) — rect ichida */
export function drawTypology(t: ShoreT, r: { x: number; y: number; w: number; h: number }): string {
  const k = Math.min(r.w / 24, (r.h - 12) / 9), x0 = r.x + 2, wl = r.y + r.h - 10 - 2.2 * k, X = (m: number) => x0 + m * k, Y = (z: number) => wl - z * k;
  // profil: m (gorizontal, 0 — suv chekkasi, manfiy — suv), z (sathdan)
  const PR: Record<ShoreT, [number, number][]> = {
    amfiteatr: [[-6, -1.4], [-0.5, -1.4], [0, 0.3], [0.9, 0.3], [0.9, 0.75], [1.8, 0.75], [1.8, 1.2], [2.7, 1.2], [2.7, 1.65], [3.6, 1.65], [3.6, 2.1], [6, 2.1], [18, 2.6]],
    terrasa: [[-6, -1.4], [-0.3, -1.4], [0, 0.5], [6, 0.6], [18, 1]],
    botqoq: [[-6, -1.4], [-4, -1], [0, 0], [5, 0.8], [10, 1.4], [18, 2]],
    promenada: [[-6, -1.4], [-0.6, -1.4], [0, 0.4], [3, 1.15], [7, 1.2], [11, 1.25], [18, 1.6]],
    tik: [[-6, -1.4], [-0.2, -1.4], [0, 2.4], [6, 2.6], [18, 3.4]],
    kanal: [[-6, -1.4], [-0.5, -1.4], [0, 0.5], [12, 1], [18, 1.4]],
    tabiiy: [[-6, -1.4], [-2, -0.8], [0, 0], [6, 1], [18, 2]],
  };
  const pr = PR[t]; let soil = `M${f2(X(-6))} ${f2(Y(-2.2))}`; for (const [m, z] of pr) soil += `L${f2(X(m))} ${f2(Y(z))}`; soil += `L${f2(X(18))} ${f2(Y(-2.2))}Z`;
  let g = `<rect x="${f2(X(-6))}" y="${f2(Y(0))}" width="${f2(6 * k)}" height="${f2(1.4 * k)}" fill="#cbdde3"/><path d="${soil}" fill="#efe7d8" stroke="none"/>`;
  g += `<path d="${pr.map(([m, z], i) => `${i ? 'L' : 'M'}${f2(X(m))} ${f2(Y(z))}`).join('')}" fill="none" stroke="${INK}" stroke-width=".45"/><line x1="${f2(X(-6))}" y1="${f2(Y(0))}" x2="${f2(X(0))}" y2="${f2(Y(0))}" stroke="#5f8fa3" stroke-width=".3"/>`;
  const zAt = (m: number) => { for (let i = 1; i < pr.length; i++) if (pr[i][0] >= m) { const [a, za] = pr[i - 1], [b, zb] = pr[i]; return za + (zb - za) * (m - a) / ((b - a) || 1); } return pr[pr.length - 1][1]; };
  if (t === 'terrasa') g += `<rect x="${f2(X(-4))}" y="${f2(Y(0.6))}" width="${f2(10 * k)}" height="${f2(0.25 * k)}" fill="#b98a5a"/><line x1="${f2(X(-4))}" y1="${f2(Y(0.6))}" x2="${f2(X(-4))}" y2="${f2(Y(1.7))}" stroke="${INK}" stroke-width=".3"/>`;
  if (t === 'tik') g += `<rect x="${f2(X(-0.6))}" y="${f2(Y(2.4))}" width="${f2(0.6 * k)}" height="${f2(3.8 * k)}" fill="#a39a8c" stroke="${INK}" stroke-width=".25"/>`;
  if (t === 'botqoq') for (let m = -3.5; m <= 3; m += 0.7) g += ua('B_qamish', X(m), Y(Math.max(0, zAt(m))), 1.4 * k, '#6f8f5a');
  if (t === 'promenada') g += `<rect x="${f2(X(7))}" y="${f2(Y(1.2) - 0.6)}" width="${f2(4 * k)}" height="0.8" fill="#d8c7a4"/>` + ua('erkak_yurgan', X(9), Y(1.2), 1.7 * k, INK);
  if (t === 'amfiteatr') g += ua('otirgan_blok', X(1.4), Y(0.75), 1.25 * k, INK) + ua('ayol_yurgan', X(4.5), Y(2.1), 1.7 * k, INK);
  if (t === 'terrasa') g += ua('erkak_turgan', X(-1), Y(0.85), 1.7 * k, INK);
  const th = (m: number, h: number) => Math.min(h * k, Y(zAt(m)) - r.y - 6);
  if (t === 'kanal' || t === 'tabiiy') { const H = th(8, 12); g += `<g transform="translate(${f2(X(8))} ${f2(Y(zAt(8)))}) scale(${H.toFixed(3)})"><path d="${ELEV.yirik.d}" fill="none" stroke="#2f5e33" stroke-width="${f2(0.16 / H)}"/></g>`; }
  if (t === 'botqoq' || t === 'tabiiy') { const H = th(14, 9); g += `<g transform="translate(${f2(X(14))} ${f2(Y(zAt(14)))}) scale(${H.toFixed(3)})"><path d="${ELEV.majnun.d}" fill="none" stroke="#2f5e33" stroke-width="${f2(0.16 / H)}"/></g>`; }
  g += T(r.x, r.y + 3.4, SHORE[t].n, { s: 2.8, w: 700 }) + `<rect x="${f2(r.x + r.w - 6)}" y="${f2(r.y + 0.6)}" width="5" height="3" fill="${SHORE[t].c}"/>`;
  g += `<line x1="${f2(X(-6))}" y1="${f2(r.y + r.h - 8)}" x2="${f2(X(18))}" y2="${f2(r.y + r.h - 8)}" stroke="${INK}" stroke-width=".2"/>` + [-6, 0, 6, 12, 18].map(m => `<line x1="${f2(X(m))}" y1="${f2(r.y + r.h - 9)}" x2="${f2(X(m))}" y2="${f2(r.y + r.h - 7)}" stroke="${INK}" stroke-width=".2"/>`).join('') + T(X(0), r.y + r.h - 4.6, '0', { s: 1.8, a: 'middle' }) + T(X(18), r.y + r.h - 4.6, '18 m', { s: 1.8, a: 'end' });
  return g;
}
