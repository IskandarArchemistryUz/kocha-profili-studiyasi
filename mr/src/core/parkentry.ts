/**
 * Avtoturargoh kirish-chiqish (pandus) va shamollatish shaxtalari — joylashuvi va meʼyoriy masofalar (05.11, egasi:
 * «pandus va kirish joyini modelga qoʻshish kerak — usiz 414 va 415-band tekshiruvlari doim koʻrib chiqish»).
 *
 * NORMA (asl matn):
 *  - ShNQ 2.07.01-23, 414-band: «Автотураргоҳларнинг кириш-чиқиш жойлари магистрал кўчалар чорраҳаларидан камида 50 m, маҳаллий
 *    аҳамиятидаги кўчалардан 20 m, жамоат транспорти бекатларидан 5 m масофада бўлиши керак.»
 *    TALQIN: «маҳаллий аҳамиятидаги кўчалардан 20 m» — mahalliy koʻchalar CHORRAHASIDAN 20 m deb olinadi (kirish koʻchaning oʻziga
 *    ochiladi, undan 20 m uzoqda boʻlolmaydi); magistral (tuman / shahar) koʻcha qatnashgan chorraha — 50 m.
 *  - ShNQ 2.07.01-23, 415-band: «Ерости автотураргоҳларининг кириш-чиқиш жойлари турар жой ва жамоат бинолари деразаларидан,
 *    шунингдек таълим ва даволаш муассасалари ҳудудларидан камида 15 m узоқликда бўлиши керак.»
 *  - ShNQ 2.05.07-24, 10-band: «Jamoat va turar joy obyektlari binolarida joylashgan avtomobillar uchun yer osti, yarim yer osti toʻxtash
 *    joylarining kirish-chiqish joyidan jamoat va turar joy obyekti binosigacha boʻlgan masofa belgilanmaydi» — oʻz binosi (garaj ustidagi
 * *    bino, TALQIN) kirish-chiqish uchun tekshirilmaydi (EntryEnv.host). 06.11 (c63): oʻz binosi — garaj konturi bilan kesishgan yoki
 *    unga tutash (≤ 0,5 m) bino yoki stilobat (TALQIN).
 *  - 06.11 (c61): bekor qilingan SanPiN 0350-17, 6.4.1-jadval 8-izohi (shamollatish shaxtalari, dam olish maydonchalari — 15 m) amaldagi
 *    SanQvaN 0103-25 da yoʻq. Shaxtalar va maydonchalar uchun 415-band qiymati (15 m) qoldirildi — AMALIYOT/TALQIN.
 *    TALQIN: «деразалари» — turar va jamoat binolarining izi (derazalar qaysi tarzda ekani modelda yoʻq — xavfsiz tomonga,
 *    butun kontur); dam olish maydonchalari — hovlidagi bolalar, kattalar va sport maydonchalari (xoʻjalik maydonchasi emas).
 * ANDOZA: pandus izi 6 × 3,5 m (bir yoʻnalishli yoʻlak, SP 113.13330.2016 — taqqoslash uchun); shamollatish shaxtasi 2 × 2 m,
 *  har 2 000 m² garaj maydoniga 1 ta, koʻpi bilan 6 ta (hisob loyihada); nomzod nuqtalar qadami 5 m. Shaxtalar binolar, dam olish
 *  maydonchalari va taʼlim / davolash hududlaridan eng uzoq joyga qoʻyiladi.
 */
import type { XY } from './geo';

export type EntryKind = 'rampa' | 'shaxta';
export interface EntryLocal { at: XY; dir?: number; kind: EntryKind; /** joiz joy topilmadi — garaj chetiga qoʻyildi (qoida: koʻrib chiqish) */ edge?: true }
export interface EntryStreet { axis: XY[]; w: number; /** magistral (tuman / shahar) */ main: boolean }
export interface EntryEnv {
  /** kvartal / parsel halqasi (garaj joylashgan) */ block: XY[];
  streets: EntryStreet[];
  /** jamoat transporti bekatlari */ stops: XY[];
  /** turar joy va jamoat binolari izi (derazali deb olinadi) */ windows: XY[][];
  /** taʼlim va davolash muassasalari hududlari */ edu: XY[][];
  /** dam olish va oʻyin maydonchalari */ rest: XY[][];
  /** barcha binolar (shaxta uchun) */ buildings: XY[][];
  /** ShNQ 2.05.07-24, 10-band: yer osti garaji joylashgan oʻz binosi (turar / jamoat) — kirish-chiqishdan tekshirilmaydi, shaxtadan tekshiriladi */ host?: XY[][];
}
export type CheckKind = 'chorraha' | 'bekat' | 'deraza' | 'hudud' | 'maydoncha';
export interface EntryCheck { kind: CheckKind; d: number; need: number; ok: boolean; /** eng yaqin nuqta (sahnada kesma uchun) */ to: XY; /** magistral chorraha */ main?: boolean }

export const RAMP_L = 6, RAMP_W = 3.5, SHAFT_W = 2, SHAFT_PER_M2 = 2000, SHAFT_MAX = 6;
export const NEED = { main: 50, local: 20, stop: 5, win: 15, edu: 15, rest: 15 } as const;

const segD = (p: XY, a: XY, b: XY): { d: number; q: XY } => { const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L)), q: XY = [a[0] + dx * t, a[1] + dy * t]; return { d: Math.hypot(p[0] - q[0], p[1] - q[1]), q }; };
const inR = (p: XY, r: XY[]): boolean => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) if ((r[i][1] > p[1]) !== (r[j][1] > p[1]) && p[0] < (r[j][0] - r[i][0]) * (p[1] - r[i][1]) / (r[j][1] - r[i][1]) + r[i][0]) c = !c; return c; };
/** nuqtadan halqagacha (ichida boʻlsa 0) */
export function ringDist(p: XY, r: XY[]): { d: number; q: XY } {
  if (r.length >= 3 && inR(p, r)) return { d: 0, q: p };
  let best = { d: Infinity, q: p }; for (let i = 0; i < r.length; i++) { const s = segD(p, r[i], r[(i + 1) % r.length]); if (s.d < best.d) best = s; } return best;
}
function lineDist(p: XY, pts: XY[]): { d: number; q: XY } { let best = { d: Infinity, q: p }; for (let i = 1; i < pts.length; i++) { const s = segD(p, pts[i - 1], pts[i]); if (s.d < best.d) best = s; } return best; }
const ringArea = (r: XY[]) => Math.abs(r.reduce((s, p, i) => { const q = r[(i + 1) % r.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0) / 2);

function segX(a: XY, b: XY, c: XY, d: XY): XY | null {
  const r: XY = [b[0] - a[0], b[1] - a[1]], s: XY = [d[0] - c[0], d[1] - c[1]], den = r[0] * s[1] - r[1] * s[0]; if (Math.abs(den) < 1e-9) return null;
  const t = ((c[0] - a[0]) * s[1] - (c[1] - a[1]) * s[0]) / den, u = ((c[0] - a[0]) * r[1] - (c[1] - a[1]) * r[0]) / den;
  return t >= -0.02 && t <= 1.02 && u >= -0.02 && u <= 1.02 ? [a[0] + r[0] * t, a[1] + r[1] * t] : null;
}
/** Koʻcha oʻqlari chorrahalari (kesishma yoki uchi boshqa oʻqqa 3 m ichida tutashgan); main — ikkisidan biri magistral */
export function intersections(streets: EntryStreet[]): { p: XY; main: boolean }[] {
  const out: { p: XY; main: boolean }[] = [];
  const add = (p: XY, main: boolean) => { const e = out.find(o => Math.hypot(o.p[0] - p[0], o.p[1] - p[1]) < 3); if (e) e.main = e.main || main; else out.push({ p, main }); };
  for (let i = 0; i < streets.length; i++) for (let j = i + 1; j < streets.length; j++) {
    const A = streets[i], B = streets[j], main = A.main || B.main;
    for (let a = 1; a < A.axis.length; a++) for (let b = 1; b < B.axis.length; b++) { const x = segX(A.axis[a - 1], A.axis[a], B.axis[b - 1], B.axis[b]); if (x) add(x, main); }
    for (const [P, Q] of [[A, B], [B, A]] as const) for (const e of [P.axis[0], P.axis[P.axis.length - 1]]) { const l = lineDist(e, Q.axis); if (l.d <= 3) add(e, main); }
  }
  return out;
}

/** Bitta nuqta uchun meʼyoriy tekshiruvlar; ug — yer osti (415-band va SanPiN 8-izoh ham), aks holda faqat 414-band */
export function entryChecks(p: XY, env: EntryEnv, ug: boolean, kind: EntryKind = 'rampa'): EntryCheck[] {
  const out: EntryCheck[] = [];
  if (kind === 'rampa') {
    for (const x of intersections(env.streets)) { const d = Math.hypot(x.p[0] - p[0], x.p[1] - p[1]), need = x.main ? NEED.main : NEED.local; if (d < need + 30) out.push({ kind: 'chorraha', d, need, ok: d >= need - 0.3, to: x.p, main: x.main }); }
    for (const s of env.stops) { const d = Math.hypot(s[0] - p[0], s[1] - p[1]); if (d < NEED.stop + 30) out.push({ kind: 'bekat', d, need: NEED.stop, ok: d >= NEED.stop - 0.3, to: s }); }
  }
  if (ug) {
    for (const r of kind === 'shaxta' ? [...env.windows, ...(env.host ?? [])] : env.windows) { const x = ringDist(p, r); if (x.d < NEED.win + 30) out.push({ kind: 'deraza', d: x.d, need: NEED.win, ok: x.d >= NEED.win - 0.3, to: x.q }); }
    for (const r of env.edu) { const x = ringDist(p, r); if (x.d < NEED.edu + 30) out.push({ kind: 'hudud', d: x.d, need: NEED.edu, ok: x.d >= NEED.edu - 0.3, to: x.q }); }
    for (const r of env.rest) { const x = ringDist(p, r); if (x.d < NEED.rest + 30) out.push({ kind: 'maydoncha', d: x.d, need: NEED.rest, ok: x.d >= NEED.rest - 0.3, to: x.q }); }
  }
  return out;
}
/** eng yomon tekshiruv (talabga nisbatan eng kam ulush) */
export function worstCheck(cs: EntryCheck[]): EntryCheck | null { let w: EntryCheck | null = null; for (const c of cs) if (!w || c.d / c.need < w.d / w.need) w = c; return w; }
const penalty = (cs: EntryCheck[]) => cs.reduce((t, c) => t + Math.min(0, c.d - c.need), 0);

/** Nuqtadan eng yaqin koʻcha: masofa (qatnov chetidan) va yoʻnalish (oʻqqa tomon), null — koʻcha yoʻq */
export function nearestStreet(p: XY, streets: EntryStreet[]): { d: number; dir: number; s: EntryStreet } | null {
  let best: { d: number; dir: number; s: EntryStreet } | null = null;
  for (const s of streets) { const l = lineDist(p, s.axis), d = l.d - s.w / 2; if (!best || d < best.d) best = { d, dir: Math.atan2(l.q[1] - p[1], l.q[0] - p[0]), s }; }
  return best;
}

/**
 * Pandus (kirish-chiqish) nuqtasini avtomatik tanlash: garaj halqasi qirralari boʻylab har 5 m da nomzod; koʻchaga qaragan
 * (qatnov chetidan ≤ 12 m) nomzodlar afzal; ball — meʼyoriy masofalar jarimasi (kam boʻlsa manfiy), tenglikda koʻchaga yaqini.
 * ug — yer osti (415-band va SanPiN ham). null — halqa boʻsh.
 */
export function autoEntry(gar: XY[], env: EntryEnv, ug: boolean): EntryLocal | null {
  if (gar.length < 3) return null;
  const cands: XY[] = [];
  for (let i = 0; i < gar.length; i++) { const a = gar[i], b = gar[(i + 1) % gar.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(L / 5)); for (let k = 0; k < n; k++) cands.push([a[0] + (b[0] - a[0]) * (k + 0.5) / n, a[1] + (b[1] - a[1]) * (k + 0.5) / n]); }
  // ichki nomzodlar (hovli): perimetr qurilishida chegara qirrasi binolar ostida — pandus hovlidan (arka orqali) chiqadi
  { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const p of gar) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
    const st = Math.max(3, Math.min(6, Math.min(x1 - x0, y1 - y0) / 8));
    for (let x = x0 + st / 2; x < x1; x += st) for (let y = y0 + st / 2; y < y1; y += st) { const p: XY = [x, y]; if (inR(p, gar)) cands.push(p); } }
  // bino ichida yoki 1 m dan yaqin nomzodlar olinmaydi (pandus izi bino ostiga tushmasin)
  const free = cands.filter(p => !env.buildings.some(b => ringDist(p, b).d < 1) && !env.rest.some(r => ringDist(p, r).d < 1));
  const scored = (free.length ? free : cands).map(p => { const ns = nearestStreet(p, env.streets), face = !!ns && ns.d <= 12, pen = penalty(entryChecks(p, env, ug)); return { p, ns, face, pen }; });
  const okAll = scored.filter(x => x.pen >= 0), pool = (okAll.length ? okAll : scored).slice();
  // meʼyorlar bajarilgan nomzodlar ichida — koʻchaga eng yaqini; birortasi bajarmasa — eng kam jarima, keyin koʻchaga yaqini
  pool.sort((x, y) => (okAll.length ? 0 : y.pen - x.pen) || Number(y.face) - Number(x.face) || (x.ns?.d ?? 1e9) - (y.ns?.d ?? 1e9));
  const b = pool[0]; if (!b) return null;
  return { at: b.p, kind: 'rampa', ...(b.ns ? { dir: Math.round(b.ns.dir * 1000) / 1000 } : {}) };
}

/**
 * Shamollatish shaxtalari (05.11, koordinator: shaxtalar sport maydonchalari ustiga tushgan edi): garaj halqasi ichida toʻr
 * nomzodlari; joiz nomzod — binolardan ≥ 2 m (bino ostida emas), dam olish va sport maydonchalari, taʼlim / davolash hududlari va
 * turar / jamoat binolaridan ≥ 15 m (415-band qiymati — TALQIN; bekor qilingan 0350-17, 6.4.1-jadval 8-izohi 0103-25 da yoʻq). Ochkoʻz tanlov: himoyalangan obyektlardan va oldingi
 * shaxtalardan eng uzoq (shaxtalar orasi ≥ 10 m). Joiz joy yetmasa — garaj chetida, koʻcha tomondagi (yashil tasma) nuqta, edge
 * belgisi bilan: qoida uni «koʻrib chiqish» deb baholaydi. Soni — har 2 000 m² ga 1, koʻpi bilan 6 (ANDOZA).
 */
export function autoShafts(gar: XY[], env: Pick<EntryEnv, 'buildings' | 'windows' | 'rest' | 'edu' | 'streets' | 'host'>, n = Math.min(SHAFT_MAX, Math.max(1, Math.ceil(ringArea(gar) / SHAFT_PER_M2)))): EntryLocal[] {
  if (gar.length < 3) return [];
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const p of gar) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
  const st = Math.max(2, Math.min(4, Math.min(x1 - x0, y1 - y0) / 6)), cands: XY[] = [];
  for (let x = x0 + st / 2; x < x1; x += st) for (let y = y0 + st / 2; y < y1; y += st) { const p: XY = [x, y]; if (inR(p, gar)) cands.push(p); }
  const prot = [...env.windows, ...(env.host ?? []), ...env.rest, ...env.edu];
  const dP = (p: XY) => Math.min(Infinity, ...prot.map(r => ringDist(p, r).d)), dB = (p: XY) => Math.min(Infinity, ...env.buildings.map(b => ringDist(p, b).d));
  const ok = cands.map(p => ({ p, d: dP(p) })).filter(x => x.d >= NEED.rest && dB(x.p) >= 2);
  const out: EntryLocal[] = [];
  for (let k = 0; k < n; k++) {
    let best: XY | null = null, bs = -Infinity;
    for (const x of ok) { const sp = Math.min(Infinity, ...out.map(o => Math.hypot(o.at[0] - x.p[0], o.at[1] - x.p[1]))); if (sp < 10) continue; const s = Math.min(x.d, sp); if (s > bs) { bs = s; best = x.p; } }
    if (!best) break; out.push({ at: best, kind: 'shaxta' });
  }
  if (!out.length) {
    // joiz joy yoʻq — garaj chetida, koʻcha tomonda (koʻchaga ≤ 12 m), maydoncha va bino ostida emas; himoyalangan obyektlardan eng uzoq
    const edge: XY[] = [];
    for (let i = 0; i < gar.length; i++) { const a = gar[i], b = gar[(i + 1) % gar.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]), m = Math.max(1, Math.round(L / 3)); for (let q = 0; q < m; q++) edge.push([a[0] + (b[0] - a[0]) * (q + 0.5) / m, a[1] + (b[1] - a[1]) * (q + 0.5) / m]); }
    const free = edge.filter(p => dB(p) >= 2 && !env.rest.some(r => ringDist(p, r).d < 1));
    const face = free.filter(p => { const ns = nearestStreet(p, env.streets); return !!ns && ns.d <= 12; });
    const pool = face.length ? face : free.length ? free : edge;
    let best = pool[0], bs = -Infinity; for (const p of pool) { const d = dP(p); if (d > bs) { bs = d; best = p; } }
    if (best) out.push({ at: best, kind: 'shaxta', edge: true });
  }
  return out;
}

/** Pandus izi (toʻrtburchak RAMP_L × RAMP_W, dir — chiqish yoʻnalishi; at — tashqi uchi oʻrtasi) yoki shaxta kvadrati */
export function entryRing(e: EntryLocal): XY[] {
  if (e.kind === 'shaxta') { const h = SHAFT_W / 2, [x, y] = e.at; return [[x - h, y - h], [x + h, y - h], [x + h, y + h], [x - h, y + h]]; }
  const a = e.dir ?? 0, ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux, hw = RAMP_W / 2, [x, y] = e.at;
  // tashqi uch — at; ichkariga (−u) RAMP_L
  return [[x + nx * hw, y + ny * hw], [x - nx * hw, y - ny * hw], [x - nx * hw - ux * RAMP_L, y - ny * hw - uy * RAMP_L], [x + nx * hw - ux * RAMP_L, y + ny * hw - uy * RAMP_L]];
}
