/**
 * Konstruktiv oʻqlar (05.11, egasi hujjati «Konstruktiv oʻqlar — tahlil va generator qoidalari»).
 * Qavat rejasidagi oʻqlar (1, 2, 3… / А, Б, В…) gabaritni teng boʻlgan «chizgʻich» emas — yuk koʻtaruvchi elementlar
 * (ustun, pilon, devor) oʻqi. Toʻr seysmik boʻlma darajasida, barcha qavatlar uchun bitta (vertikal uzluksizlik).
 *
 * NORMA (asl matndan):
 *  QMQ 2.01.03-19, 3.1.1 — tarh geometrik toʻgʻri shakllar; chiqib turgan qismlar tosh-gʻisht ≤ 2 m, monolit/panel/karkas ≤ 6 m;
 *    3.1.3 — oʻlchamlar 3.1-jadvaldan katta boʻlsa antiseysmik choklar bilan boʻlmalarga ajratiladi;
 *    3.1.4 — chok qoʻsh devor / qoʻsh rama; eng kichik eni: balandligi 5 m gacha 30 mm, har 5 m oshganda +20 mm;
 *             «Доимий яшаш … хоналарининг ичида антисейсмик чоклар ҳосил қилишга рухсат этилмайди»;
 *    3.1.5 — 3 qavat (10 m) va undan baland binoda har boʻlma chegarasida kamida bitta zinapoya katagi;
 *    3.1-jadval — boʻlma uzunligi (seysmik.lenLimit), balandlik (seysmik.heightLimit).
 *  ShNQ 2.01.06-25 (baland binolar, > 70 m — 2-band): 36 — tizim rejada muntazam va simmetrik; 39 — «yuk koʻtaruvchi tizimni
 *    deformatsiya choklar bilan faqat … rejadagi oʻlchamlari asosida mustaqil bloklarga ajratishga yoʻl qoʻyilmaydi»;
 *    40 — elementlar ikki oʻzaro perpendikulyar bosh oʻq yoʻnalishi boʻyicha; 172 — chok eni 6 m gacha 30 mm, har 3 m ga +10 mm;
 *    8-jadval A2 — boʻshliqlar (zina, lift bilan) > 1/3 orayopma; A3 — boʻrtiqlar ikki yoʻnalishda > 20 %;
 *    5-jadval (SLS 1–2): BBS 3 — H ≤ 56; BBS 2 — H ≤ 70; 9-jadval: A11 rama karkas BBS ≥ 3, A12–A15 devorli / aralash BBS ≥ 2;
 *    378–379 — baland binolar (> 70 m) faqat A12–A15 tizimlari.
 * AMALIYOT (egasining 53 misol rejasi): qadam toʻplami devorli 3,0 / 3,3 / 3,6 / 4,2, karkas 6,0 / 6,6 / 7,2 (8,4 — 7 ballda);
 *  yadro butun oraliq(lar)ni egallaydi; kvartira = butun oraliqlar; deraza oraliq ichida; L/П qanotlar — oʻz toʻri.
 * TALQIN: 70 m dan past binoda ShNQ 2.01.06-25 majburiyligi — konstruktor tasdigʻi (hujjat 8-boʻlim).
 */
import { area, obb2, signedArea, type XY } from './geo';
import type { ConstructSys } from './doc';
import { jointScheme, lenLimit, heightLimit, blockShape, SYS } from './seysmik';
import type { RulePlan, FacadeMod, PlanCheck } from './sectionplan';

export type AxisKind = 'main' | 'joint' | 'sub';
export interface Axis { id: string; pos: number; kind: AxisKind }
export type GridSystem = 'wall' | 'frame';
export interface GridBlock {
  ring: XY[]; U: XY; V: XY; u0: number; u1: number; v0: number; v1: number;
  /** koʻndalang (raqamli) oʻqlar — u boʻyicha; boʻylama (harfli) — v boʻyicha */ x: Axis[]; y: Axis[];
  /** zina-lift yadrosi oraligʻi (u) — birinchisi */ core: { from: number; to: number } | null;
  /** barcha yadrolar (har seksiyada oʻz yadrosi) */ cores: { from: number; to: number }[];
  /** qadamlar (asosiy oʻqlar orasi), m */ steps: number[];
  /** chok: boshi / oxiri */ joint0: boolean; joint1: boolean;
}
export interface StructGrid {
  ring: XY[]; blocks: GridBlock[]; system: GridSystem; sys: ConstructSys; seismic: number; H: number;
  /** antiseysmik chok eni, mm (QMQ 3.1.4; ShNQ 2.01.06-25 172 bilan kattasi) */ jointMm: number;
  /** choklar (bino koordinatalarida) */ joints: [XY, XY][];
  notes: string[];
}
export interface GridOpts { sys: ConstructSys; seismic: number; /** bino balandligi, m */ H: number; /** qavatlar (3.1.5) */ floors?: number }

/** Qadamlar toʻplami (AMALIYOT); karkasda 3.1-jadval ramalar qadami: 7 ball — 9, 8 — 7,5, 9 — 6 m */
export function stepSet(system: GridSystem, seismic: number): { set: number[]; min: number; max: number; pref: number } {
  if (system === 'frame') { const set = seismic >= 9 ? [6.0] : seismic >= 8 ? [6.0, 6.6, 7.2] : [6.0, 6.6, 7.2, 8.4]; return { set, min: 5.4, max: Math.max(...set), pref: seismic >= 9 ? 6.0 : 6.6 }; }
  return { set: [3.0, 3.3, 3.6, 4.2], min: 2.7, max: 4.2, pref: 3.3 };
}
/** Karkas ramalar qadami chegarasi (QMQ 2.01.03-19, 3.1-jadval, 1.2.2 б: 9 / 7,5 / 6 m) */
export const frameStepLimit = (seismic: number): number => (seismic >= 9 ? 6 : seismic >= 8 ? 7.5 : 9);
export const systemOf = (sys: ConstructSys): GridSystem => (sys === 'karkas' || sys === 'toldirgich' ? 'frame' : 'wall');
/** Chok eni, mm: QMQ 3.1.4 (30 mm + har 5 m ga 20 mm) va ShNQ 2.01.06-25 172 (30 mm + 6 m dan yuqori har 3 m ga 10 mm) — kattasi */
export function jointWidthMm(H: number): number {
  const q = 30 + Math.max(0, Math.ceil((H - 5) / 5 - 1e-9)) * 20, s = 30 + Math.max(0, Math.ceil((H - 6) / 3 - 1e-9)) * 10;
  return Math.max(q, s);
}
/** Harfli oʻqlar — GOST 21.101 tartibi (Ё, З, Й, О, Х, Ц, Ч, Щ, Ъ, Ы, Ь tashlanadi) */
export const LETTERS = ['А', 'Б', 'В', 'Г', 'Д', 'Е', 'Ж', 'И', 'К', 'Л', 'М', 'Н', 'П', 'Р', 'С', 'Т', 'У', 'Ф', 'Ш', 'Э', 'Ю', 'Я'];

const r2 = (v: number) => Math.round(v * 20) / 20;
const pointIn = (p: XY, r: XY[]) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) if ((r[i][1] > p[1]) !== (r[j][1] > p[1]) && p[0] < (r[j][0] - r[i][0]) * (p[1] - r[i][1]) / (r[j][1] - r[i][1]) + r[i][0]) c = !c; return c; };
const cen = (r: XY[]): XY => [r.reduce((s, p) => s + p[0], 0) / r.length, r.reduce((s, p) => s + p[1], 0) / r.length];

/**
 * Oraliqni qadamlarga boʻlish: n = span / pref ga yaqin, qadam [min, max] ichida boʻlsin; qadamlar bir xil (0,05 m ga yaxlitlab,
 * qoldiq oxirgi qadamga). Toʻplamdagi aniq qiymatlar (3,3 / 3,6 …) — AMALIYOT; langarlar (yadro, kvartira devori) qatʼiy.
 */
export function fillSpan(span: number, S: ReturnType<typeof stepSet>): number[] {
  if (span <= S.max + 0.05) return [r2(span)];
  let n = Math.max(1, Math.round(span / S.pref));
  if (span / n < S.min - 1e-6) n = Math.max(1, Math.floor(span / S.min));
  if (span / n > S.max + 1e-6) n = Math.ceil(span / S.max);   // chegaradan oshgandan koʻra — koʻproq oʻq
  const st = r2(span / n), out = Array.from({ length: n - 1 }, () => st); out.push(r2(span - st * (n - 1)));
  return out;
}

/**
 * Konstruktiv toʻr: boʻlmalar (QMQ 3.1.3 — uzunlik 3.1-jadvaldan oshsa chok; L/П qanotlar alohida), har boʻlmada ortogonal toʻr
 * (OBB uzun tomoni boʻylab — egri/qiya kontur toʻrni faqat qirqadi), raqamli oʻqlar langarlardan (boʻlma uchlari, yadro
 * devorlari, kvartiralararo devorlar, seksiya yongʻin devorlari) va ular orasini qadam toʻplami bilan toʻldirish; harfli oʻqlar —
 * fasad / koridor devorlari / fasad. plan = null — langarsiz toʻr (faqat qadamlar, yadro oʻrtada).
 */
export function structGrid(ring0: XY[], plan: RulePlan | null, o: GridOpts): StructGrid {
  const ring = signedArea(ring0) < 0 ? [...ring0].reverse() : ring0;
  const system = systemOf(o.sys), S = stepSet(system, o.seismic), notes: string[] = [];
  const tall = o.H > 70;
  const lim = tall ? null : lenLimit(o.sys, o.seismic);
  if (tall) notes.push('Bino 70 m dan baland — boʻlmalarga avtomatik ajratilmadi (ShNQ 2.01.06-25, 39-band: rejadagi oʻlchamlar asosida mustaqil bloklarga ajratishga yoʻl qoʻyilmaydi); uzunlik harorat va choʻkish hisobi bilan asoslanadi');
  const sch = jointScheme(ring, lim && lim > 0 ? lim : null);
  const jointMm = jointWidthMm(o.H), jw = jointMm / 1000;
  const blocks: GridBlock[] = [];
  const parts = sch.parts.length ? sch.parts : [ring];
  const isJointLine = (a: XY, b: XY) => sch.cuts.some(([c, d]) => { const dx = d[0] - c[0], dy = d[1] - c[1], L = Math.hypot(dx, dy) || 1; const dd = (p: XY) => Math.abs((p[0] - c[0]) * dy - (p[1] - c[1]) * dx) / L; return dd(a) < 0.3 && dd(b) < 0.3; });
  // bino bosh oʻqlari: butun kontur OBB — boʻlma toʻri shunga parallel boʻlsa, yoʻnalish shu boʻyicha (raqamlar chapdan oʻngga / pastdan yuqoriga)
  const om = obb2(ring), Um = om.U, Vm: XY = [-Um[1], Um[0]];
  // boʻlma toʻri yoʻnalishi: binoning tashqi (fasad) qirralaridan eng uzuni — kesim (chok) chizigʻi emas; bosh oʻqqa ≤ 3° yaqin boʻlsa — bosh oʻq
  const onRing = (p: XY) => ring.some((a, i) => { const b = ring[(i + 1) % ring.length], dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2)); return Math.hypot(a[0] + dx * t - p[0], a[1] + dy * t - p[1]) < 0.05; });
  const dirOf = (q: XY[]): XY => {
    let best: XY | null = null, bl = 0;
    for (let i = 0; i < q.length; i++) { const a = q[i], b = q[(i + 1) % q.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 4 || L <= bl || !onRing(a) || !onRing(b) || !onRing([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2])) continue; best = [(b[0] - a[0]) / L, (b[1] - a[1]) / L]; bl = L; }
    let U = best ?? obb2(q).U;
    for (const c of [Um, Vm]) if (Math.abs(U[0] * c[0] + U[1] * c[1]) > Math.cos(3 * Math.PI / 180)) U = c;
    // yoʻnalish: bosh oʻqqa parallel — Um tomonga, perpendikulyar — Vm tomonga (chizmada chapdan oʻngga / pastdan yuqoriga)
    const du = U[0] * Um[0] + U[1] * Um[1], dv = U[0] * Vm[0] + U[1] * Vm[1];
    if ((Math.abs(du) >= Math.abs(dv) ? du : dv) < 0) U = [-U[0], -U[1]];
    // boʻlma uzun tomoni boʻyicha emas, bosh yoʻnalish boʻyicha boʻlsa ham — raqamli oʻqlar boʻlmaning uzun oʻqi boʻylab
    const o2 = obb2(q), V2: XY = [-U[1], U[0]], ext = (d: XY) => { const ps = q.map(p => p[0] * d[0] + p[1] * d[1]); return Math.max(...ps) - Math.min(...ps); };
    if (ext(V2) > ext(U) * 1.15 && o2.L > 0) { U = V2; const du2 = U[0] * Um[0] + U[1] * Um[1], dv2 = U[0] * Vm[0] + U[1] * Vm[1]; if ((Math.abs(du2) >= Math.abs(dv2) ? du2 : dv2) < 0) U = [-U[0], -U[1]]; }
    return U;
  };
  parts.forEach((q0, bi) => {
    const q = signedArea(q0) < 0 ? [...q0].reverse() : q0, U = dirOf(q), V: XY = [-U[1], U[0]];
    const pu = (p: XY) => p[0] * U[0] + p[1] * U[1], pv = (p: XY) => p[0] * V[0] + p[1] * V[1];
    const u0 = Math.min(...q.map(pu)), u1 = Math.max(...q.map(pu)), v0 = Math.min(...q.map(pv)), v1 = Math.max(...q.map(pv));
    const inB = (p: XY) => pointIn(p, q);
    // qatʼiy langarlar (u): boʻlma uchlari + yadrolar; kvartira va yongʻin devorlari — yumshoq (toʻldirilgan oʻq yaqin boʻlsa unga suriladi)
    const anchors = new Set<number>([r2(u0), r2(u1)]), soft: number[] = [];
    let core: GridBlock['core'] = null; const coreList: { from: number; to: number }[] = [];
    if (plan) {
      // har seksiyaning oʻz yadrosi (zina + liftlar + lift oldi): seksiya boʻyicha guruh; seksiyalar boʻlmasa — u boʻyicha ≤ 3,2 m oraliq
      const groups: XY[][][] = plan.sections.length ? plan.sections.map(sc => [...sc.stairs, ...sc.lifts]) : [[...plan.stairs, ...plan.lifts]];
      for (const gq of groups) {
        const iv = gq.filter(c => inB(cen(c))).map(c => { const us = c.map(pu); return { from: Math.min(...us), to: Math.max(...us) }; }).sort((a, b) => a.from - b.from);
        const loc: { from: number; to: number }[] = [];
        for (const c of iv) { const l = loc[loc.length - 1]; if (l && c.from <= l.to + 3.2) l.to = Math.max(l.to, c.to); else loc.push({ ...c }); }
        coreList.push(...loc);
      }
      coreList.sort((a, b) => a.from - b.from);
      // yonma-yon seksiyalar yadrolari (yongʻin devori bilan ajratilgan, oraliq < 0,6 m) — umumiy oʻq devor oʻrtasida (ikki yadro oraligʻi, tor qadam qolmaydi)
      for (let i = 1; i < coreList.length; i++) if (coreList[i].from <= coreList[i - 1].to + 0.6 && coreList[i].from >= coreList[i - 1].to - 0.6) { const m = (coreList[i].from + coreList[i - 1].to) / 2; coreList[i - 1].to = m; coreList[i].from = m; }
      for (const c of coreList) { c.from = r2(c.from); c.to = r2(c.to); anchors.add(c.from); anchors.add(c.to); }
      core = coreList[0] ?? null;
      for (const a of plan.apts) { if (!inB(cen(a.ring))) continue; const us = a.ring.map(pu); soft.push(r2(Math.min(...us)), r2(Math.max(...us))); }
      // seksiyalararo yongʻin devorlari — yumshoq langar (asosiy oʻqlar: qadam toʻplami + yadro + chok)
      for (const f of plan.fireWalls) { if (f.length < 2 || !inB(cen(f))) continue; const d = [f[1][0] - f[0][0], f[1][1] - f[0][1]], L = Math.hypot(d[0], d[1]) || 1; if (Math.abs((d[0] * U[0] + d[1] * U[1]) / L) < 0.3) soft.push(r2(pu(f[0]))); }
    } else {
      const mid = (u0 + u1) / 2, cw = system === 'frame' ? S.pref : 5.7; core = { from: r2(mid - cw / 2), to: r2(mid + cw / 2) }; coreList.push(core); anchors.add(core.from); anchors.add(core.to);
    }
    // yaqin langarlar (< 0,6 m) birlashtiriladi — boʻlma uchlari va yadro ustun
    const keep = new Set<number>([r2(u0), r2(u1), ...coreList.flatMap(c => [c.from, c.to])]);
    const A = [...anchors].filter(u => u > u0 - 0.01 && u < u1 + 0.01).sort((a, b) => a - b).filter((u, i, arr) => keep.has(u) || (i === 0 || u - arr[i - 1] >= 0.6) && !arr.some(w => w !== u && keep.has(w) && Math.abs(w - u) < 0.6));
    // oraliqlarni toʻldirish
    const pos: number[] = [A[0]];
    for (let i = 1; i < A.length; i++) { const span = A[i] - A[i - 1]; const isCore = coreList.some(c => A[i - 1] >= c.from - 1e-6 && A[i] <= c.to + 1e-6); const left = !!core && A[i] <= core.from + 1e-6, st0 = isCore ? [span] : fillSpan(span, S), st = left ? [...st0].reverse() : st0; /* qoldiq yadro tomonda — simmetriya */ let u = A[i - 1]; for (const s of st) { u = r2(u + s); pos.push(u); } pos[pos.length - 1] = A[i]; }
    const uniq = pos.filter((u, i) => i === 0 || u - pos[i - 1] > 0.05);
    // yumshoq langar: toʻldirilgan (qatʼiy boʻlmagan) oʻq kvartira devoriga ≤ 0,6 m — qoʻshni qadamlar toʻplam chegarasida qolsa, unga suriladi
    const hard = new Set(A);
    for (let i = 1; i + 1 < uniq.length; i++) {
      if (hard.has(uniq[i])) continue;
      const w = soft.filter(sv => Math.abs(sv - uniq[i]) <= 0.6).sort((a, b) => Math.abs(a - uniq[i]) - Math.abs(b - uniq[i]))[0]; if (w == null) continue;
      const l = w - uniq[i - 1], r = uniq[i + 1] - w; if (l >= S.min - 1e-6 && l <= S.max + 1e-6 && r >= S.min - 1e-6 && r <= S.max + 1e-6) uniq[i] = w;
    }
    // choklar: boʻlma uchi kesim chizigʻida boʻlsa — chok oʻqi (juft oʻq: ikki boʻlmada bittadan)
    const endPts = (u: number): [XY, XY] => [[U[0] * u + V[0] * v0, U[1] * u + V[1] * v0], [U[0] * u + V[0] * v1, U[1] * u + V[1] * v1]];
    const joint0 = parts.length > 1 && isJointLine(...endPts(u0)), joint1 = parts.length > 1 && isJointLine(...endPts(u1));
    const x: Axis[] = uniq.map((u, i) => ({ id: String(i + 1), pos: u, kind: 'main' as AxisKind }));
    if (joint0) { x[0] = { id: '1с', pos: r2(u0 + jw / 2), kind: 'joint' }; }
    if (joint1) { x[x.length - 1] = { id: `${x.length}с`, pos: r2(u1 - jw / 2), kind: 'joint' }; }
    // yarim oraliqlar (karkasda — kvartira chegarasi mumkin; devorlida — yengil toʻsiq submoduli)
    const subs: Axis[] = []; for (let i = 1; i < x.length; i++) if (x[i].pos - x[i - 1].pos >= 2.4) subs.push({ id: `${x[i - 1].id}/2`, pos: r2((x[i].pos + x[i - 1].pos) / 2), kind: 'sub' });
    // harfli oʻqlar: fasad – koridor devorlari – fasad
    const vs = new Set<number>([r2(v0), r2(v1)]);
    if (plan) {
      const mops = plan.mop.filter(m => inB(cen(m)) && (Math.max(...m.map(pu)) - Math.min(...m.map(pu))) > 4);
      for (const m of mops) { const a = m.map(pv), lo = r2(Math.min(...a)), hi = r2(Math.max(...a)); if (lo - v0 > 1.2) vs.add(lo); if (v1 - hi > 1.2) vs.add(hi); }
    }
    const vy = [...vs].sort((a, b) => a - b).filter((v, i, arr) => i === 0 || v - arr[i - 1] >= 0.8);
    const y: Axis[] = vy.map((v, i) => ({ id: LETTERS[i] ?? `Я${i}`, pos: v, kind: 'main' as AxisKind }));
    const steps = x.slice(1).map((a, i) => r2(a.pos - x[i].pos));
    blocks.push({ ring: q, U, V, u0, u1, v0, v1, x: [...x, ...subs], y, core, cores: coreList, steps, joint0, joint1 });
    if (bi === 0 && system === 'frame' && steps.some(s => s > frameStepLimit(o.seismic) + 0.05)) notes.push(`Karkas ramalar qadami ${frameStepLimit(o.seismic)} m dan katta (QMQ 2.01.03-19, 3.1-jadval, 1.2.2 б) — yadro oraligʻi yoki langar devorlar`);
  });
  renumber(blocks, Um, Vm);
  if (blocks.length > 1) notes.push(`${blocks.length} ta seysmik boʻlma, chok eni ${jointMm} mm (QMQ 2.01.03-19, 3.1.4: 30 mm + har 5 m ga 20 mm; ShNQ 2.01.06-25, 172-band bilan kattasi)`);
  return { ring, blocks, system, sys: o.sys, seismic: o.seismic, H: o.H, jointMm, joints: sch.cuts, notes };
}

/**
 * Oʻqlar nomlari bino boʻyicha yagona (05.11, takroriy harf / raqam boʻlmasin):
 *  raqamli — boʻlmalar tartibida davomli (avval bosh yoʻnalishga parallel boʻlmalar chapdan oʻngga, keyin perpendikulyarlari pastdan
 *  yuqoriga), har boʻlma ichida oʻsib boradi; chok oʻqlari «n с | n+1 с»;
 *  harfli — bir chiziqda yotgan oʻqlar (parallel boʻlmalarda bir xil sath) bitta harf; parallel boʻlmalar harflari pastdan yuqoriga,
 *  perpendikulyar boʻlmalarniki — davomi, chapdan oʻngga.
 */
function renumber(blocks: GridBlock[], Um: XY, Vm: XY): void {
  const isH = (b: GridBlock) => Math.abs(b.U[0] * Um[0] + b.U[1] * Um[1]) >= 0.7;
  const c = (b: GridBlock): XY => cen(b.ring), pj = (p: XY, d: XY) => p[0] * d[0] + p[1] * d[1];
  const order = [...blocks].sort((a, b) => (isH(a) === isH(b) ? (isH(a) ? pj(c(a), Um) - pj(c(b), Um) : pj(c(a), Vm) - pj(c(b), Vm)) : isH(a) ? -1 : 1));
  let n = 0;
  for (const b of order) {
    const main = b.x.filter(a => a.kind !== 'sub').sort((p, q) => p.pos - q.pos), subs: Axis[] = [];
    for (const a of main) { n++; a.id = a.kind === 'joint' ? `${n}с` : String(n); }
    for (let i = 1; i < main.length; i++) if (main[i].pos - main[i - 1].pos >= 2.4) subs.push({ id: `${main[i - 1].id}/1`, pos: r2((main[i].pos + main[i - 1].pos) / 2), kind: 'sub' });
    b.x = [...main, ...subs];
  }
  // harflar: dunyo boʻyicha kalit (yoʻnalish turi + sath, 0,15 m aniqlikda)
  const keys: { h: boolean; w: number }[] = [];
  const worldOf = (b: GridBlock, v: number): { h: boolean; w: number } => { const h = isH(b), p = ptOf(b, (b.u0 + b.u1) / 2, v); return { h, w: h ? pj(p, Vm) : pj(p, Um) }; };
  for (const b of order) for (const a of b.y) { const k = worldOf(b, a.pos); if (!keys.some(x => x.h === k.h && Math.abs(x.w - k.w) < 0.15)) keys.push(k); }
  keys.sort((a, b) => (a.h === b.h ? a.w - b.w : a.h ? -1 : 1));
  for (const b of order) { for (const a of b.y) { const k = worldOf(b, a.pos), i = keys.findIndex(x => x.h === k.h && Math.abs(x.w - k.w) < 0.15); a.id = LETTERS[i] ?? `Я${i}`; } b.y.sort((p, q) => p.pos - q.pos); }
}
/** Nuqta qaysi boʻlmada */
export function blockAt(g: StructGrid, p: XY): GridBlock | null { return g.blocks.find(b => pointIn(p, b.ring)) ?? null; }
/** Boʻlma U-koordinatasi */
export const uOf = (b: GridBlock, p: XY) => p[0] * b.U[0] + p[1] * b.U[1];
export const vOf = (b: GridBlock, p: XY) => p[0] * b.V[0] + p[1] * b.V[1];
export const ptOf = (b: GridBlock, u: number, v: number): XY => [b.U[0] * u + b.V[0] * v, b.U[1] * u + b.V[1] * v];

/**
 * Deraza oʻrni oraliq ichida (AMALIYOT 2.6): modul markazi asosiy/chok oʻqqa 0,5 m dan yaqin boʻlsa — shu modul yotgan oraliq
 * markaziga suriladi (oraliq eni ≥ 1,2 m boʻlsa). Qaytaradi: har modul uchun deraza markazi va surilganmi.
 */
export function gridWindows(g: StructGrid, mods: FacadeMod[]): { c: XY; moved: boolean; onAxis: boolean }[] {
  return mods.map(m => {
    const c: XY = [(m.a[0] + m.b[0]) / 2, (m.a[1] + m.b[1]) / 2];
    const dx = m.b[0] - m.a[0], dy = m.b[1] - m.a[1], L = Math.hypot(dx, dy) || 1, n: XY = [-dy / L, dx / L];   // ichki normal (CCW halqa)
    const b = blockAt(g, [c[0] + n[0] * 0.5, c[1] + n[1] * 0.5]); if (!b || m.blind) return { c, moved: false, onAxis: false };
    // modul boʻlma U ga parallel boʻlsa — raqamli oʻqlar, aks holda harfli
    const alongU = Math.abs((dx * b.U[0] + dy * b.U[1]) / L) > 0.7, ax = alongU ? b.x.filter(a => a.kind !== 'sub') : b.y, t = alongU ? uOf(b, c) : vOf(b, c);
    const near = ax.find(a => Math.abs(a.pos - t) < 0.5); if (!near) return { c, moved: false, onAxis: false };
    const lo = ax.filter(a => a.pos <= t + 0.5 && a !== near).map(a => a.pos).sort((p, q) => q - p)[0], hi = ax.filter(a => a.pos >= t - 0.5 && a !== near).map(a => a.pos).sort((p, q) => p - q)[0];
    // modul yotgan oraliq: modul oʻrtasi oʻqning qaysi tomonida koʻproq boʻlsa
    const ta = alongU ? uOf(b, m.a) : vOf(b, m.a), tb = alongU ? uOf(b, m.b) : vOf(b, m.b), side = (ta + tb) / 2 - near.pos;
    const other = side >= 0 ? hi : lo; if (other == null || Math.abs(other - near.pos) < 1.2) return { c, moved: false, onAxis: true };
    const tm = (near.pos + other) / 2, shift = tm - t, cc: XY = alongU ? [c[0] + b.U[0] * shift, c[1] + b.U[1] * shift] : [c[0] + b.V[0] * shift, c[1] + b.V[1] * shift];
    return { c: cc, moved: true, onAxis: false };
  });
}

/** Devorni toʻrga yopishtirish uchun belgilar (u boʻyicha): asosiy va chok oʻqlari, karkasda yarim oraliqlar ham (V2) */
export function snapMarks(g: StructGrid, ring: XY[], U: XY): number[] {
  const b = blockAt(g, cen(ring)); if (!b) return [];
  const along = Math.abs(U[0] * b.U[0] + U[1] * b.U[1]) > 0.7, vm = (b.v0 + b.v1) / 2, um = (b.u0 + b.u1) / 2;
  const ax = along ? b.x : b.y;   // asosiy, chok va yarim oraliq (yengil toʻsiq submoduli) oʻqlari
  return ax.map(a => { const p = along ? ptOf(b, a.pos, vm) : ptOf(b, um, a.pos); return p[0] * U[0] + p[1] * U[1]; });
}

const f1 = (v: number) => v.toFixed(1).replace('.', ',');
/** T1–T7 (hujjat 5-boʻlim) va 8-jadval ogohlantirishlari — PlanCheck koʻrinishida */
export function gridChecks(g: StructGrid, plan: RulePlan, mods: FacadeMod[], floors: number): PlanCheck[] {
  const out: PlanCheck[] = [];
  const QMQ = 'QMQ 2.01.03-19', SH = 'ShNQ 2.01.06-25';
  // T1: kvartiralararo / yadro devorlari oʻq ustida
  let off = 0, nW = 0;
  for (const a of plan.apts) { const b = blockAt(g, cen(a.ring)); if (!b) continue; const us = a.ring.map(p => uOf(b, p)); for (const u of [Math.min(...us), Math.max(...us)]) { if (u < b.u0 - 0.1 || u > b.u1 + 0.1) continue; /* burchak kvartirasi — qoʻshni qanot toʻrida */ nW++; if (!b.x.some(x => x.kind !== 'sub' && Math.abs(x.pos - u) < 0.12)) off++; } }
  out.push({ id: 'ax-T1', title: 'Yuk koʻtaruvchi devorlar oʻq ustida', ok: off === 0, value: off ? `${off} / ${nW} devor oʻqdan tashqarida` : `${nW} devor oʻqda`, norm: 'ogʻish 0', source: `${SH}, 40-band (elementlar ikki bosh oʻq boʻyicha); AMALIYOT` });
  // T2: oʻq deraza oʻrnidan oʻtmaydi
  const win = gridWindows(g, mods), onAx = win.filter(w => w.onAxis).length;
  out.push({ id: 'ax-T2', title: 'Oʻq deraza oʻrnidan oʻtmaydi', ok: onAx === 0, value: onAx ? `${onAx} deraza oʻq ustida (oraliq tor)` : `${win.filter(w => w.moved).length} deraza oraliq markaziga surildi`, norm: 'deraza oraliq ichida', source: 'AMALIYOT (misollar: deraza pilonlar orasida)' });
  // T3: boʻsh oʻq yoʻq — toʻldirilgan oʻqlar pilon / devor chizigʻi (AMALIYOT), langarlar — devor
  out.push({ id: 'ax-T3', title: 'Har oʻqda konstruktiv element', ok: true, value: `${g.blocks.reduce((t, b) => t + b.x.filter(x => x.kind !== 'sub').length, 0)} raqamli, ${g.blocks.reduce((t, b) => t + b.y.length, 0)} harfli oʻq`, norm: 'oʻq = pilon / devor oʻrni', source: 'AMALIYOT' });
  // T4: chok xonadan oʻtmaydi (3.1.4), har boʻlmada zina (3.1.5), uzunlik ≤ jadval (3.1.3), chiqiq ≤ (3.1.1)
  let through = 0;
  for (const [c, d] of g.joints) { const dx = d[0] - c[0], dy = d[1] - c[1], L = Math.hypot(dx, dy) || 1; const sd = (p: XY) => ((p[0] - c[0]) * dy - (p[1] - c[1]) * dx) / L; for (const a of plan.apts) { const s = a.ring.map(sd); if (Math.min(...s) < -0.3 && Math.max(...s) > 0.3) through++; } }
  out.push({ id: 'ax-T4a', title: 'Antiseysmik chok xonadan oʻtmaydi', ok: g.joints.length ? through === 0 : null, value: g.joints.length ? (through ? `${through} kvartira chok ustida` : `${g.joints.length} chok, ${g.jointMm} mm`) : 'chok yoʻq', norm: 'chok faqat kvartiralararo devorda', source: `${QMQ}, 3.1.4` });
  if (floors >= 3) { const noSt = g.blocks.filter(b => !plan.stairs.some(s => pointIn(cen(s), b.ring))).length; out.push({ id: 'ax-T4b', title: 'Har boʻlmada zinapoya katagi', ok: noSt === 0, value: noSt ? `${noSt} boʻlmada zina yoʻq` : `${g.blocks.length} boʻlma — har birida zina`, norm: '≥ 1 zina / boʻlma (3+ qavat)', source: `${QMQ}, 3.1.5` }); }
  const lim = g.H > 70 ? null : lenLimit(g.sys, g.seismic), lens = g.blocks.map(b => b.u1 - b.u0), tooLong = lim ? lens.filter(l => l > lim + 0.05).length : 0;
  out.push({ id: 'ax-T4c', title: 'Boʻlma uzunligi 3.1-jadvaldan oshmaydi', ok: lim ? tooLong === 0 : null, value: `${lens.map(f1).join(' / ')} m${lim ? ` (chegara ${lim})` : ' (> 70 m — 39-band, hisob bilan)'}`, norm: lim ? `≤ ${lim} m` : '—', source: `${QMQ}, 3.1.3, 3.1-jadval (${SYS[g.sys].row})` });
  const pj = g.blocks.flatMap(b => blockShape(b.ring).proj), pl = SYS[g.sys].proj, badP = pj.filter(p => p > pl + 0.05).length;
  out.push({ id: 'ax-T4d', title: 'Chiqib turgan qismlar', ok: badP === 0, value: pj.length ? `${pj.map(f1).join(' / ')} m` : 'yoʻq', norm: `≤ ${pl} m`, source: `${QMQ}, 3.1.1` });
  // T5: karkas qadami
  if (g.system === 'frame') { const L5 = frameStepLimit(g.seismic), bad = g.blocks.flatMap(b => b.steps).filter(s => s > L5 + 0.05).length; out.push({ id: 'ax-T5', title: 'Karkas ramalar qadami', ok: bad === 0, value: bad ? `${bad} oraliq > ${L5} m` : `≤ ${L5} m`, norm: `${g.seismic} ballda ≤ ${L5} m`, source: `${QMQ}, 3.1-jadval, 1.2.2 б` }); }
  // T6: vertikal uzluksizlik — toʻr bino uchun bitta (barcha qavatlar)
  out.push({ id: 'ax-T6', title: 'Toʻr barcha qavatlarda bitta', ok: true, value: 'turar, 1-qavat va yer osti — bir toʻr', norm: 'devor ustunga, ustun konsolga tayanmaydi', source: `${SH}, 34-band (B3)` });
  // T7: tizim ↔ balandlik
  const H = g.H, fr = g.system === 'frame', okSh = fr ? H <= 56 : H <= 70, qm = heightLimit(g.sys, g.seismic), okQ = !qm || qm.h == null || H <= qm.h + 0.05;
  const val = fr ? `karkas, H = ${f1(H)} m (A11: BBS ≥ 3 → ≤ 56 m)` : `devorli / aralash, H = ${f1(H)} m (A12–A15: BBS ≥ 2 → ≤ 70 m)`;
  out.push({ id: 'ax-T7', title: 'Konstruktiv tizim balandlikka mos', ok: H > 70 ? null : (okSh && okQ ? (H <= 70 ? null : true) : false), value: H > 70 ? `baland bino (> 70 m): yadro + devorli tizim, devor ≥ 300 mm (378–381)` : val + (qm?.h != null ? `; QMQ 3.1-jadval ≤ ${qm.h} m` : ''), norm: '5- va 9-jadvallar (SLS 1–2); 70 m dan past binoda ShNQ 2.01.06-25 majburiyligi — konstruktor tasdigʻi (TALQIN)', source: `${SH}, 5-, 9-jadvallar, 378–379; ${QMQ}, 3.1-jadval` });
  // ogohlantirishlar: A3 boʻrtiq > 20 %, A2 boʻshliq > 1/3
  const sh = blockShape(g.ring), ob = obb2(g.ring), a3 = sh.proj.some(p => p > 0.2 * Math.min(ob.L, ob.S));
  out.push({ id: 'ax-A3', title: 'Rejadagi boʻrtiqlar (A3)', ok: a3 ? null : true, value: a3 ? 'boʻrtiq > 20 % — nomuntazam, hisob murakkablashadi' : 'muntazam', norm: '≤ 20 % (ikki yoʻnalishda)', source: `${SH}, 8-jadval A3, 32-band` });
  const holes = [...plan.stairs, ...plan.lifts].reduce((t, q) => t + area(q), 0), fa = g.blocks.reduce((t, b) => t + area(b.ring), 0), a2 = fa > 0 && holes / fa > 1 / 3;
  out.push({ id: 'ax-A2', title: 'Orayopma boʻshliqlari (A2)', ok: a2 ? null : true, value: `${Math.round(fa ? holes / fa * 100 : 0)} % (zina, lift)`, norm: '≤ 1/3', source: `${SH}, 8-jadval A2` });
  return out;
}
