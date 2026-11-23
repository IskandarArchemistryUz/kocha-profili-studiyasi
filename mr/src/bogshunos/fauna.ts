/**
 * Bogʻshunos — yashash muhitlari va fauna moduli (14.11.2026).
 *
 * Loyiha natijasidan (variant niqoblari + ekish rejasi) yashash muhitlari xaritasi va bioxilma-xillik koʻrsatkichlari.
 * Turlar soni yoki zichligi bashorat qilinmaydi — faqat muhit sharoitlari (maydon, sokinlik, ozuqa, uya joyi) hisoblanadi.
 *
 * Qoidalar (teg bilan):
 *  · Muhitlar (ustuvorlik tartibida, bir katak — bitta muhit): ochiq suv → botqoq qirgʻoq / yomgʻir bogʻi → daraxt toji
 *    (saqlanadigan + yangi, yetuk toj — P) → buta guruhi (r 3 m, T) → oʻtloq (kam oʻriladigan) → maysa → qolgan yashil; qattiq qoplama,
 *    sport, bolalar, amfiteatr, binolar — muhit emas (T).
 *  · Xilma-xillik: Shennon indeksi H′ = −Σ pᵢ ln pᵢ muhitlar maydoni ulushidan, tekislik J = H′ / ln n (T — muhit tuzilmasi koʻrsatkichi).
 *  · Sokin hudud: barcha yoʻl, maydon va qattiq qoplamadan ≥ 30 m (T, kichik bogʻ uchun loyiha qoidasi);
 *    xorijiy orientir — qoʻshiqchi va sohil qushlari uchun taʼsir masofasi ≤ 100 m (Dertien va b., 2021 — A).
 *  · Uya qutilari: saqlanadigan daraxt dbh ≥ 40 sm (kovak ehtimoli — T), yoʻldan ≥ 10 m, oraliq ≥ 30 m (T).
 *    Koʻrshapalak qutilari: shu daraxtlardan suvga ≤ 50 m, oraliq ≥ 50 m (T). Soni — joy topilgancha, cheklov 24 / 8.
 *  · Ozuqa kalendari: oylar boʻyicha meva beradigan va gullaydigan daraxtlar soni (assort.PHEN — P).
 *  · Yumshoq qirgʻoq ulushi: botqoq + tabiiy tipologiya / perimetr (kesim.shores — qoidalar).
 */
import type { XY } from './types';
import type { Ctx } from './analyze';
import type { DesignOut } from './design';
import type { Planting } from './planting';
import { distance, strokeLine, area, contour } from './grid';
import { PHEN } from './assort';
import { SPECIES } from './species';
import { shores } from './kesim';

export type Hab = 'suv' | 'botqoq' | 'daraxt' | 'buta' | 'otloq' | 'maysa' | 'yashil';
export const HAB: Record<Hab, { n: string; c: string }> = {
  suv: { n: 'Ochiq suv', c: '#9ec5d6' },
  botqoq: { n: 'Botqoq qirgʻoq, yomgʻir bogʻi', c: '#6fae98' },
  daraxt: { n: 'Daraxt toji (yetuk)', c: '#4f8a4a' },
  buta: { n: 'Buta guruhlari', c: '#8aa94c' },
  otloq: { n: 'Oʻtloq (kam oʻriladigan)', c: '#d8e3a6' },
  maysa: { n: 'Maysa', c: '#b9d6a2' },
  yashil: { n: 'Boshqa yashil yuza', c: '#e4eadb' },
};
export const HABS = Object.keys(HAB) as Hab[];

/** Fauna guruhlari — muhit va loyiha chorasi (miqdor bashorat qilinmaydi) */
export interface Guild { id: string; n: string; hab: Hab[]; need: string; act: string; t: 'T' | 'A' }
export const GUILDS: Guild[] = [
  { id: 'suvqush', n: 'Suv va suv boʻyi qushlari', hab: ['suv', 'botqoq'], need: 'sokin suv yuzasi, qamishli sayoz qirgʻoq, orol', act: 'botqoq qirgʻoq, orolga yoʻl yoʻq, qushxona — kuzatish faqat panadan', t: 'T' },
  { id: 'shox', n: 'Shoxda uya quruvchi qushlar', hab: ['daraxt', 'buta'], need: 'qalin toj, tikonli butalar', act: 'koʻp qavatli ekish: daraxt + buta guruhi; uya davrida (aprel–iyun) butash yoʻq', t: 'T' },
  { id: 'kovak', n: 'Kovakda uya quruvchi qushlar', hab: ['daraxt'], need: 'keksa daraxt, kovak, binolardagi teshik va tokchalar', act: 'dbh ≥ 40 sm daraxtlar saqlanadi, uya qutilari', t: 'T' },
  { id: 'kshap', n: 'Koʻrshapalaklar', hab: ['daraxt', 'suv'], need: 'keksa daraxt, suv ustida hasharot, qorongʻi yoʻlak', act: 'koʻrshapalak qutilari suvga yaqin; soʻqmoq va sohil yoritilmaydi yoki past (≤ 1 m) yoritiladi', t: 'T' },
  { id: 'chang', n: 'Changlatuvchilar (asalari, kapalak)', hab: ['otloq', 'buta', 'daraxt'], need: 'mart–oktyabr uzluksiz gullash, oʻrilmagan oʻt', act: 'oʻtloq yiliga 1–2 marta oʻriladi; gullash kalendaridagi boʻshliqlar butalar bilan toʻldiriladi', t: 'T' },
  { id: 'amfib', n: 'Amfibiyalar va suv umurtqasizlari', hab: ['botqoq', 'suv'], need: 'sayoz (≤ 0,3 m) iliq qirgʻoq, baliqsiz choʻntaklar', act: 'botqoq qirgʻoqda sayoz terrasa; kimyoviy ishlov yoʻq', t: 'T' },
  { id: 'sutemiz', n: 'Kichik sut emizuvchilar', hab: ['buta', 'otloq', 'yashil'], need: 'buta va oʻt panasi, toʻsiqsiz oʻtish', act: 'chegarada pastki teshikli toʻsiq; buta guruhlari zanjiri', t: 'T' },
];

export const FAUNA_CITE = [
  'Ganiev B.N., Azimov N.N., Kholmatov B.R. (2024). A comparative study of spring avifauna in natural biotopes and agricultural landscapes of the Tashkent Region. Acta Biologica Sibirica 10: 1103–1120 — Toshkent viloyatida bahorda 205 qush turi.',
  'Bykova E., Gashev S., Sorokina N., Tursumbekova G. (2022). The Influence of Urbanization on Mammal Diversity… Tashkent. Ekologia (Bratislava) 41(1): 57–69 — Toshkentda 32 sut emizuvchi turi; shahar rivojida 9 tur yoʻqolgan, 5 invaziv tur kelgan.',
  'Toshkent ornitologi bilan suhbat, podrobno.uz — chumchuq, popishak, kichik musicha kamaymoqda, mayna koʻpaymoqda; beton va oynali binolarda uya joyi yoʻq, oynaga urilish.',
  'Dertien J.S., Larson C.L., Reed S.E. (2021). Recreation effects on wildlife: a review of potential quantitative thresholds. Nature Conservation 44: 51–68 — qoʻshiqchi va sohil qushlari uchun taʼsir masofasi ≤ 100 m (A).',
];

export interface Box { p: XY; kind: 'qush' | 'kshap'; d: number }
export interface Fauna {
  hab: Uint8Array;               // 0 — muhit emas, 1.. — HABS indeksi + 1
  areas: Record<Hab, number>;    // m²
  H: number; J: number; nHab: number;
  quiet: Uint8Array; quietM2: number; quiet100M2: number; quietWaterM2: number; maxQuiet: number;
  boxes: Box[]; old: number;
  fruit: number[]; flower: number[];   // 12 oy, daraxt soni
  softShore: number; perim: number;
  guilds: { g: Guild; m2: number }[];
}

const latOfReg = (sp: string) => SPECIES[sp]?.[0] ?? sp;

export function fauna(C: Ctx, DO: DesignOut, PL: Planting): Fauna {
  const G = C.G, M = DO.masks, V = DO.V;
  // ---- 1. muhitlar ----
  const crown = G.u8();
  C.trees.forEach((t, i) => { const d = PL.decisions[i]; if (d === 'saqlanadi' || d === 'yol_suriladi') strokeLine(G, crown, [t.p, t.p], Math.max(2, t.c)); });
  for (const t of PL.trees) strokeLine(G, crown, [t.p, t.p], t.crown);
  const shrub = G.u8(); for (const s of PL.shrubs) strokeLine(G, shrub, [s.p, s.p], 6);
  const nonHab = (k: number) => !!(M.hard?.[k] || M.sport_yangi?.[k] || M.sport_mavjud?.[k] || M.bolalar?.[k] || M.amfiteatr?.[k] || M.terrasa?.[k] || C.bld[k]);
  const hab = G.u8(), ix = (h: Hab) => HABS.indexOf(h) + 1;
  for (let k = 0; k < G.n; k++) {
    if (!C.site[k]) continue;
    if (C.water[k]) { hab[k] = ix('suv'); continue; }
    if (nonHab(k)) continue;
    if (M.botqoq?.[k] || M.yomgir_bogi?.[k]) hab[k] = ix('botqoq');
    else if (crown[k]) hab[k] = ix('daraxt');
    else if (shrub[k]) hab[k] = ix('buta');
    else if (M.otloq?.[k]) hab[k] = ix('otloq');
    else if (C.grass[k]) hab[k] = ix('maysa');
    else hab[k] = ix('yashil');
  }
  const areas = Object.fromEntries(HABS.map(h => [h, area(G, hab, ix(h))])) as Record<Hab, number>;
  const tot = HABS.reduce((s, h) => s + areas[h], 0), ps = HABS.map(h => areas[h] / Math.max(1, tot)).filter(p => p > 0.001);
  const H = -ps.reduce((s, p) => s + p * Math.log(p), 0), nHab = ps.length, J = nHab > 1 ? H / Math.log(nHab) : 0;
  // ---- 2. sokin hudud ----
  const busy = G.u8(); for (const p of V.paths) strokeLine(G, busy, p.g, p.w);
  for (let k = 0; k < G.n; k++) if (nonHab(k) && !C.bld[k]) busy[k] = 1;
  const dB = distance(G, busy), quiet = G.u8(); let q100 = 0, qw = 0, maxQ = 0;
  for (let k = 0; k < G.n; k++) if (C.site[k] && dB[k] >= 30) { quiet[k] = 1; if (C.water[k]) qw++; if (dB[k] >= 100) q100++; }
  for (let k = 0; k < G.n; k++) if (C.site[k] && dB[k] > maxQ && dB[k] < 1e8) maxQ = dB[k];
  // ---- 3. uya qutilari ----
  const dW = distance(G, C.water), boxes: Box[] = []; let old = 0;
  const cand = C.trees.map((t, i) => ({ t, i })).filter(({ t, i }) => (PL.decisions[i] === 'saqlanadi' || PL.decisions[i] === 'yol_suriladi') && t.d >= 40);
  old = cand.length;
  cand.sort((a, b) => { const ka = G.idx(a.t.p[0], a.t.p[1]), kb = G.idx(b.t.p[0], b.t.p[1]); return (dB[kb] ?? 0) - (dB[ka] ?? 0) || b.t.d - a.t.d; });
  const far = (p: XY, kind: Box['kind'], m: number) => boxes.every(b => b.kind !== kind || Math.hypot(b.p[0] - p[0], b.p[1] - p[1]) >= m);
  for (const { t } of cand) { const k = G.idx(t.p[0], t.p[1]); if (k < 0 || dB[k] < 10) continue; if (boxes.filter(b => b.kind === 'qush').length < 24 && far(t.p, 'qush', 30)) boxes.push({ p: t.p, kind: 'qush', d: t.d }); }
  for (const { t } of cand) { const k = G.idx(t.p[0], t.p[1]); if (k < 0 || dW[k] > 50 || dB[k] < 10) continue; if (boxes.filter(b => b.kind === 'kshap').length < 8 && far(t.p, 'kshap', 50) && boxes.every(b => b.p !== t.p)) boxes.push({ p: t.p, kind: 'kshap', d: t.d }); }
  // ---- 4. ozuqa va gullash kalendari ----
  const fruit = Array(12).fill(0), flower = Array(12).fill(0);
  const addPh = (lat: string) => { const ph = PHEN[lat]; if (!ph) return; for (const m of ph.fr ?? []) fruit[m - 1]++; for (const m of ph.f ?? []) flower[m - 1]++; };
  C.trees.forEach((t, i) => { const d = PL.decisions[i]; if (d === 'saqlanadi' || d === 'yol_suriladi') addPh(latOfReg(t.sp)); });
  for (const t of PL.trees) addPh(t.sp.lat);
  for (const s of PL.shrubs) for (let j = 0; j < s.n; j++) addPh(s.sp.lat);
  // ---- 5. qirgʻoq ----
  let softShore = 0, perim = 0;
  if (C.lakes.length) { const S = shores(C, DO); softShore = (S.tot.botqoq ?? 0) + (S.tot.tabiiy ?? 0); perim = S.perim; }
  const guilds = GUILDS.map(g => ({ g, m2: g.hab.reduce((s, h) => s + areas[h], 0) }));
  return { hab, areas, H, J, nHab, quiet, quietM2: area(G, quiet), quiet100M2: q100 * G.cellA, quietWaterM2: qw * G.cellA, maxQuiet: maxQ, boxes, old, fruit, flower, softShore, perim, guilds };
}

/** Muhit konturlari (albom va xarita uchun) */
export function habRings(C: Ctx, F: Fauna): { h: Hab; rings: XY[][] }[] {
  return HABS.map((h, i) => { const m = C.G.u8(); for (let k = 0; k < C.G.n; k++) if (F.hab[k] === i + 1) m[k] = 1; return { h, rings: contour(C.G, m, 2) }; }).filter(x => x.rings.length);
}
