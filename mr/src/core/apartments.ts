/**
 * Kvartiralar (massing bosqichi uchun sxema) va deraza insolyatsiyasi — SanQvaN 0102-25.
 *
 * Seksiya fasadi perimetr boʻylab ~3,3 m li modullarga boʻlinadi (bir modul — bitta xona derazasi).
 * Qoʻshni seksiyaga tegib turgan devor — berk (derazasiz). Ketma-ket modullar kvartiralarga guruhlanadi:
 * k xonali kvartira = k yashash xonasi + 1 oshxona moduli. Burchakda guruh ikki fasadga chiqadi (ikki tomonlama kvartira).
 * Xonalar joylashuvi «optimistik»: yashash xonalari kvartiraning eng yaxshi yoʻnalishdagi derazalarini oladi,
 * oshxona — gʻarbiy yoki eng shimoliy derazani (loyihachi shunday qiladi; aniq reja 5-bosqichda).
 *
 * Meʼyor — SanQvaN 0102-25 (SEOJSQ qarori 04.08.2025, 22-son; Adliya 15.09.2025, №370; kuchga kirgan 16.12.2025; 2-band: 0331-16 kuchini yoʻqotgan), asl matndan:
 *  94 — «1 — 3 xonali kvartiralarning kamida bitta xonasiga va 4-5 xonali kvartiralarda kamida ikkita xonasiga quyosh nurining davomiy tushishi»;
 *  95 — «xona 22-martdan 22-sentabrgacha boʻlgan davrda 2 h (soat) davomida ... uzluksiz quyosh nuri taʼsiri ostida»; uy atrofidagi hududda 0,5 — 1 h;
 *       (eski 0331-16 8.5 dagi «uzlukli +0,5 soat» va «rekonstruksiyada −0,5 soat» yangi normada YOʻQ — uzlukli rejim mos deb hisoblanmaydi);
 *  15 — «derazalarni ufqning gʻarbiy tomoniga 200 — 290° oraligʻida yoʻnaltirishga yoʻl qoʻyilmaydi» (istisnosiz);
 *       «Ikki xonali kvartirani bitta xonasi, uch xonali kvartirani ikkita xonasi ... janubiy, janubiy-sharqiy, sharqiy tomoniga» (1 va 4–5 xonali — aytilmagan).
 */
import type { XY } from './geo';
import { signedArea, obb2 } from './geo';
import type { Prism, SunStep } from './sun';
import { rulePlan, applyEdit, finishPlan, type RulePlan, type GridSys } from './sectionplan';
import { structGrid, systemOf, stepSet, fillSpan, ptOf, type StructGrid } from './axes';
import { bLevels } from './levels';
import { fixLiftAdj } from './liftadj';

export interface Module { a: XY; b: XY; /** deraza nuqtasi (fasaddan 0,3 m tashqarida) */ p: XY; /** tashqi normal azimuti, ° */ az: number; blind: boolean; /** 05.11: chegaralari konstruktiv oʻqda */ grid?: true }
export interface Apt { rooms: number; /** modullar indekslari */ mods: number[]; /** yashash xonalari modullari */ living: number[]; /** qator oxirida joy yetmay kichraytirilgan — miksdan tashqari */ forced?: boolean; /** rejadagi umumiy maydon, m² (yalpi × 0,85) */ area?: number }
/** plan — qavat rejasi (kommunikatsiya → kvartiralar), kvartiralar shundan olinadi */
export interface Layout { mods: Module[]; apts: Apt[]; plan?: RulePlan }

export const MIX_DEFAULT: [number, number, number, number] = [20, 40, 30, 10];
export const MOD_W = 3.3;
/** Kvartira oʻlchami: k xonali kvartiraga qoʻshimcha modullar (S — ixcham, M — oʻrtacha, L — keng) */
export type AptSize = 'S' | 'M' | 'L';
export const APT_SIZES: { id: AptSize; name: string; note: string }[] = [{ id: 'S', name: 'S', note: 'ixcham: 1x ≈ 36, 2x ≈ 52, 3x ≈ 70 m²' }, { id: 'M', name: 'M', note: 'oʻrtacha: 1x ≈ 42, 2x ≈ 60, 3x ≈ 80 m²' }, { id: 'L', name: 'L', note: 'keng: 1x ≈ 50, 2x ≈ 72, 3x ≈ 95 m²' }];
export const extraMods = (size: AptSize, rooms: number) => size === 'L' ? 1 : size === 'M' && rooms >= 3 ? 1 : 0;
/** Kvartira netto maydoni, m² — TAXMIN: modullar × 3,3 m × seksiya yarim chuqurligi × 0,8 (devorlar, umumiy joylar) */
export const aptArea = (mods: number, halfDepth: number) => mods * MOD_W * halfDepth * 0.8;

const az = (n: XY) => ((Math.atan2(n[0], n[1]) * 180 / Math.PI) + 360) % 360;
export const isWest = (a: number) => a >= 200 && a <= 290;
/** oshxonaga eng mos (yashash uchun eng yomon) deraza: gʻarb, keyin shimol */
export const badness = (a: number) => (isWest(a) ? 2 : 0) + Math.cos(a * Math.PI / 180);

/**
 * Seksiya rejasi. ring — mahalliy XY; blindAt(p) — nuqta qoʻshni binoning ichidami (berk devor).
 * Fasad ~3,3 m li modullarga (derazalar) boʻlinadi; kvartiralar QAVAT REJASIDAN olinadi (sectionplan.ts):
 * avval zina-lift yadrosi va koridor, keyin har kvartira koridorga eshik va fasadga deraza bilan.
 */
export function layoutSection(ring0: XY[], blindAt: (p: XY) => boolean, mix: number[] = MIX_DEFAULT, modW = MOD_W, size: AptSize = 'M', court: XY | null = null, walls: [XY, XY][] = [], gs?: GridSys): Layout {
  const ring = signedArea(ring0) < 0 ? [...ring0].reverse() : ring0;
  const mods = facadeMods(ring, blindAt, modW);
  // reja generatori bir necha variant yasaydi (sekin) — natija kesh: kontur, berk modullar, aralashma, oʻlcham, hovli nuqtasi
  const key = JSON.stringify([ring.map(p => [Math.round(p[0] * 1e3), Math.round(p[1] * 1e3)]), mods.map(m => m.blind ? 1 : 0).join(''), mix, modW, size, court && [Math.round(court[0] * 1e3), Math.round(court[1] * 1e3)], walls.map(w => w.map(p => [Math.round(p[0] * 10), Math.round(p[1] * 10)]))]);
  const key2 = gs ? key + JSON.stringify(gs) : key;
  let base = PLAN_CACHE.get(key2);
  if (!base) { base = rulePlan(ring, mods, mix, size, court, walls, gs); PLAN_CACHE.set(key2, base); if (PLAN_CACHE.size > 400) PLAN_CACHE.delete(PLAN_CACHE.keys().next().value!); }
  const plan = structuredClone(base);
  // 05.11 (egasi: «devorlar oynaga borib urilyapti»): toʻr birinchi — fasad modullari konstruktiv oʻqlar oraligʻiga moslanadi:
  // har oraliqda bitta deraza (oʻrtada), karkasda — yarim oraliqlarda; kvartira va xona devorlari modul chegarasida (= oʻqda) — derazaga tegmaydi
  // minora (nuqtali) rejasi — kvartiralar fasadga tik kesilgan: koʻndalang devorlar (bir uchi fasadda) oʻq boʻladi
  if (gs && !plan.axisLines?.length) { const wl = wallLines(plan, ring); if (wl.length) plan.axisLines = wl; }
  if (plan.axisLines?.length) {
    const m2 = facadeMods(ring, blindAt, modW, plan.axisLines, gs ? stepSet(gs.system, gs.seismic) : undefined);
    finishPlan(plan, m2, size, true);
    return { mods: m2, apts: aptsOf(plan, m2), plan };
  }
  return { mods, apts: aptsOf(plan, mods), plan };
}
/** Kvartira chegaralaridagi koʻndalang devorlar: bir uchi fasadda (konturda), fasadga tik — konstruktiv oʻq chizigʻi sifatida */
function wallLines(plan: RulePlan, ring: XY[]): [XY, XY][] {
  const segD = (p: XY, a: XY, b: XY) => { const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2)); return Math.hypot(a[0] + dx * t - p[0], a[1] + dy * t - p[1]); };
  const onEdge = (p: XY): number => { for (let i = 0; i < ring.length; i++) if (segD(p, ring[i], ring[(i + 1) % ring.length]) < 0.15) return i; return -1; };
  const out: [XY, XY][] = [];
  for (const a of plan.apts) for (let k = 0; k < a.ring.length; k++) {
    const p = a.ring[k], q = a.ring[(k + 1) % a.ring.length], dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy); if (L < 1) continue;
    const ep = onEdge(p), eq = onEdge(q); if ((ep < 0) === (eq < 0)) continue;   // bitta uchi fasadda
    const e = ep >= 0 ? ep : eq, A = ring[e], B = ring[(e + 1) % ring.length], ex = B[0] - A[0], ey = B[1] - A[1], el = Math.hypot(ex, ey) || 1;
    if (Math.abs((dx * ex + dy * ey) / (L * el)) > 0.1) continue;   // fasadga tik emas
    if (!out.some(([u, v]) => Math.hypot(u[0] - p[0], u[1] - p[1]) + Math.hypot(v[0] - q[0], v[1] - q[1]) < 0.3 || Math.hypot(u[0] - q[0], u[1] - q[1]) + Math.hypot(v[0] - p[0], v[1] - p[1]) < 0.3)) out.push([p, q]);
  }
  return out;
}
/**
 * Fasad modullari. lines yoʻq — har qirra ~modW li teng boʻlaklar (eski yoʻl). lines bor (05.11) — qirraga perpendikulyar konstruktiv
 * oʻqlar qirrani kesgan joylar modul chegarasi; oraliq ≥ 4,5 m (karkas, yadro oraligʻi) — teng 2–3 boʻlakka; oʻqsiz qirra (torets) — eski yoʻl.
 */
function facadeMods(ring: XY[], blindAt: (p: XY) => boolean, modW: number, lines?: [XY, XY][], S?: ReturnType<typeof stepSet>): Module[] {
  const mods: Module[] = [];
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy); if (l < 0.5) continue;
    const ux = dx / l, uy = dy / l, n: XY = [dy / l, -dx / l];
    let ts: number[] = [];
    if (lines) for (const [p, q] of lines) {
      const lx = q[0] - p[0], ly = q[1] - p[1], ll = Math.hypot(lx, ly) || 1; if (Math.abs((lx * ux + ly * uy) / ll) > 0.1) continue;
      // qirra va chiziq kesishuvi: qirradagi t, chiziq ichida (± 0,4 m)
      const den = ux * ly / ll - uy * lx / ll; if (Math.abs(den) < 1e-9) continue;
      const t = ((p[0] - a[0]) * ly / ll - (p[1] - a[1]) * lx / ll) / den, X: XY = [a[0] + ux * t, a[1] + uy * t];
      const s = ((X[0] - p[0]) * lx + (X[1] - p[1]) * ly) / ll; if (s < -0.4 || s > ll + 0.4) continue;
      if (t > 1.0 && t < l - 1.0) ts.push(t);
    }
    ts = ts.sort((x, y) => x - y).filter((t, k, arr) => k === 0 || t - arr[k - 1] > 0.6);
    let cuts: number[];
    if (lines && ts.length) {
      const B = [0, ...ts, l]; cuts = [0];
      // oraliq qadamdan katta — konstruktiv toʻr kabi (core/axes fillSpan) boʻlinadi; oraliq ≥ 4,5 m (karkas) — 2–3 deraza moduli
      for (let k = 1; k < B.length; k++) {
        const sp = B[k] - B[k - 1], bays = S && sp > S.max + 0.05 ? fillSpan(sp, S) : [sp]; let t = B[k - 1];
        bays.forEach((bw, bi) => { const t1 = bi === bays.length - 1 ? B[k] : t + bw, w = t1 - t, nn = w >= 4.5 ? Math.max(1, Math.round(w / modW)) : 1; for (let j = 1; j < nn; j++) cuts.push(t + w * j / nn); cuts.push(t1); t = t1; });
      }
    } else {
      const cnt = Math.floor(l / modW + 0.2); if (cnt < 1) continue;
      cuts = Array.from({ length: cnt + 1 }, (_, k) => l * k / cnt);
    }
    for (let k = 0; k + 1 < cuts.length; k++) {
      const t0 = cuts[k], t1 = cuts[k + 1], w = t1 - t0;
      const ma: XY = [a[0] + ux * t0, a[1] + uy * t0], mb: XY = [a[0] + ux * t1, a[1] + uy * t1], mid: XY = [(ma[0] + mb[0]) / 2, (ma[1] + mb[1]) / 2];
      mods.push({ a: ma, b: mb, p: [mid[0] + n[0] * 0.3, mid[1] + n[1] * 0.3], az: az(n), blind: blindAt([mid[0] + n[0] * 0.8, mid[1] + n[1] * 0.8]) || w < (lines ? 1.2 : 2.4), ...(lines && ts.length ? { grid: true as const } : {}) });   // toʻr oraliqlarida: ≥ 1,2 m — kichik deraza
    }
  }
  return mods;
}
const PLAN_CACHE = new Map<string, RulePlan>();
/** Rejadagi kvartiralar → insolyatsiya va hisob uchun roʻyxat (yashash xonalari — eng yaxshi yoʻnalishdagi derazalar) */
export function aptsOf(plan: RulePlan, mods: Module[]): Apt[] {
  return plan.apts.map(a => ({ rooms: a.rooms, mods: a.mods, living: [...a.mods].sort((x, y) => badness(mods[x].az) - badness(mods[y].az)).slice(0, a.rooms), area: a.area * 0.85 }));
}


/* ---------------- deraza insolyatsiyasi ---------------- */
const RAD = Math.PI / 180;

function rayEnter(p: XY, d: XY, r: XY[]): number {
  let best = Infinity, inside = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const a = r[j], b = r[i];
    if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
    const ex = b[0] - a[0], ey = b[1] - a[1], den = d[0] * ey - d[1] * ex; if (Math.abs(den) < 1e-12) continue;
    const t = ((a[0] - p[0]) * ey - (a[1] - p[1]) * ex) / den, s = ((a[0] - p[0]) * d[1] - (a[1] - p[1]) * d[0]) / den;
    if (t >= 0 && s >= 0 && s <= 1 && t < best) best = t;
  }
  return inside ? 0 : best;
}

/**
 * Har deraza uchun: eng uzun uzluksiz quyoshli davr va jami (soat). Quyosh fasad oldida boʻlishi shart
 * (normal bilan burchak < 90°). steps — teng qadamli, vaqt tartibida.
 */
export function windowSun(pts: XY[], z: number[], nAz: number[], prisms: Prism[], steps: SunStep[], maxDist = 500): { run: Float32Array; total: Float32Array } {
  const C = 20, grid = new Map<string, number[]>();
  let maxTop = 0;
  prisms.forEach((pr, k) => {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity; maxTop = Math.max(maxTop, pr.top);
    for (const p of pr.ring) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    for (let i = Math.floor(x0 / C); i <= Math.floor(x1 / C); i++) for (let j = Math.floor(y0 / C); j <= Math.floor(y1 / C); j++) { const key = `${i},${j}`; (grid.get(key) || grid.set(key, []).get(key)!).push(k); }
  });
  const N = pts.length, run = new Float32Array(N), total = new Float32Array(N), cur = new Float32Array(N), stamp = new Int32Array(prisms.length).fill(-1);
  let tick = 0;
  for (const st of steps) {
    const tanA = Math.tan(st.alt * RAD), d: XY = [Math.sin(st.az * RAD), Math.cos(st.az * RAD)];
    for (let n = 0; n < N; n++) {
      let lit = Math.cos((st.az - nAz[n]) * RAD) > 0;
      const p = pts[n], zp = z[n]; tick++;
      for (let s = 0; s <= maxDist && lit; s += C * 0.7) {
        if (s * tanA > maxTop - zp) break;
        const qx = p[0] + d[0] * s, qy = p[1] + d[1] * s;
        for (let di = -1; di <= 1 && lit; di++) for (let dj = -1; dj <= 1 && lit; dj++) {
          const ids = grid.get(`${Math.floor(qx / C) + di},${Math.floor(qy / C) + dj}`); if (!ids) continue;
          for (const k of ids) {
            if (stamp[k] === tick) continue; stamp[k] = tick;
            const pr = prisms[k], dh = pr.top - zp; if (dh <= 0) continue;
            const t = rayEnter(p, d, pr.ring);
            if (t < Infinity && t > 0.01 && t * tanA < dh) { lit = false; break; }
          }
        }
      }
      if (lit) { total[n] += st.dt; cur[n] += st.dt; if (cur[n] > run[n]) run[n] = cur[n]; } else cur[n] = 0;
    }
  }
  return { run, total };
}

/* ---------------- baholash ---------------- */
export interface InsolNorm { /** uzluksiz talab, soat (95-band: 2,0) */ need: number }
/** 95-band: faqat uzluksiz davr hisoblanadi (eski 0331-16 8.5 «uzlukli +0,5» — bekor; egasi qarori 30.10: tugma olib tashlandi) */
export const roomOk = (run: number, _total: number, n: InsolNorm) => run >= n.need - 1e-6;
/** 94-band: kamida nechta xona (1–3 xonali — 1, 4–5 xonali — 2) */
export const roomsNeeded = (k: number) => (k >= 4 ? 2 : 1);
/** 15-band: gʻarbga (200–290°) qaragan yashash xonasi — yoʻl qoʻyilmaydi (istisnosiz; eski 9.2 istisnolari bekor) */
export const westAllowed = (_k: number) => 0;
/** 15-band, 2-xatboshi: janub / janubi-sharq / sharq — sektorlar ±22,5°: 67,5° ≤ az < 200° (200° dan — gʻarb taqiqi) */
export const isSE = (a: number) => a >= 67.5 && a < 200;
/** 15-band: janub/janubi-sharq/sharqqa qarashi shart boʻlgan xonalar soni (2 xonali — 1, 3 xonali — 2; 1 va 4–5 xonali — meʼyorda aytilmagan → 0) */
export const seNeeded = (k: number) => (k === 2 ? 1 : k === 3 ? 2 : 0);

/* ---------------- loyiha boʻyicha ---------------- */
import type { Project } from './doc';

/** Kvartiralar jamlanmasi: turlari boʻyicha soni, oʻrtacha maydoni, miksdan tashqari */
export function aptSummary(plans: SecPlan[]): { total: number; forced: number; byK: { k: number; n: number; share: number; area: number }[] } {
  const byK = new Map<number, { n: number; area: number }>(); let total = 0, forced = 0;
  for (const pl of plans) { const nf = pl.f1 - pl.f0; for (const a of pl.layout.apts) { total += nf; if (a.forced) forced += nf; const e = byK.get(a.rooms) ?? { n: 0, area: 0 }; e.n += nf; e.area += (a.area ?? aptArea(a.mods.length, pl.halfDepth)) * nf; byK.set(a.rooms, e); } }
  return { total, forced, byK: [1, 2, 3, 4].map(k => { const e = byK.get(k); return { k, n: e?.n ?? 0, share: total && e ? e.n / total : 0, area: e && e.n ? e.area / e.n : 0 }; }) };
}
import { frame } from './geo';
import { useDef } from './uses';

export interface SecPlan { bid: string; ring: XY[]; layout: Layout; /** 05.11: konstruktiv toʻr (seysmik boʻlmalar, oʻqlar) — barcha qavatlar uchun bitta */ grid?: StructGrid; /** qoʻlda tahrir: qoʻllandi yoki bino oʻzgargani uchun eskirdi */ edited?: 'ok' | 'eskirgan'; /** tahrirdan oldingi (generatsiya qilingan) reja */ genPlan?: RulePlan; /** turar joy qavatlari [f0, f1) — bino pastidan */ f0: number; f1: number; z0: number; /** seksiya yarim chuqurligi, m (kvartira maydoni taxmini uchun) */ halfDepth: number; /** hovli markazi (variantlar uchun) */ court?: XY | null }

const SKIP = new Set(['stilobat', 'uy', 'taunhaus']);

/** Tahrir kaliti: oyoq izi, kvartira miksi va oʻlchami — shulardan biri oʻzgarsa saqlangan tahrir eskiradi */
export function planKey(doc: Project, b: { footprint: [number, number][] }): string {
  const s = JSON.stringify([b.footprint.map(p => [Math.round(p[0] * 1e6), Math.round(p[1] * 1e6)]), doc.settings.aptMix, doc.settings.aptSize ?? 'M']);
  let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}
/** 02.11 (egasi: «sahna, Chizmadon va Varaqlar juda ogʻir»): reja hujjat oʻzgarmaguncha qayta hisoblanmaydi — panel, albom, varaqlar
 * har chizishda chaqiradi. Hujjat oʻzgarmas (har oʻzgarishda yangi obyekt): binolar, joylashuv va sozlamalar boʻyicha kesh */
let aptMemo: { k: unknown[]; v: SecPlan[] } | null = null;
export function planApartments(doc: Project): SecPlan[] {
  const k = [doc.buildings, doc.origin, doc.settings];
  if (aptMemo && aptMemo.k.every((x, i) => x === k[i])) return aptMemo.v;
  const v = planApartmentsRaw(doc); aptMemo = { k, v }; return v;
}
/** Turar joy seksiyalari rejasi (uylar, taunhauslar va stilobat — kvartirali emas) */
function planApartmentsRaw(doc: Project): SecPlan[] {
  // 04.11 (Murad Buildings sinovi, 7-band: maqsad 20/40/30/10, natija 37/34/21/8): har seksiya oʻz miksiga yaqinlashtiriladi, lekin
  // burchak va kalta seksiyalar kichik kvartiralarga moyil — loyiha boʻyicha jami miks maqsaddan > 5 punkt farq qilsa, seksiyalarga
  // beriladigan miks teskari tomonga tuzatilib (×0,4…×2,5) qayta rejalanadi; jami farqi kichigi olinadi
  const want = doc.settings.aptMix, sw = want.reduce((a, b) => a + b, 0) || 1, W = want.map(x => x / sw);
  const dev = (pl: SecPlan[]) => { const sm = aptSummary(pl); return sm.total ? sm.byK.reduce((t, e, i) => t + Math.abs(e.share - (W[i] ?? 0)), 0) / 2 : 0; };
  let best = planWithMix(doc, want), bd = dev(best);
  let mix: number[] = want;
  for (let it = 0; it < 2 && bd > 0.05; it++) {
    const real = aptSummary(best).byK.map(e => e.share);
    mix = mix.map((m, i) => W[i] > 0 ? m * Math.min(2.5, Math.max(0.4, W[i] / Math.max(0.03, real[i] ?? 0))) : 0);
    const p = planWithMix(doc, mix), d = dev(p); if (d < bd - 0.005) { best = p; bd = d; } else break;
  }
  return best;
}
function planWithMix(doc: Project, mix: number[]): SecPlan[] {
  const fr = frame(doc.origin);
  const all = doc.buildings.filter(b => !SKIP.has(b.gen?.kind ?? '')).map(b => {
    const r = b.footprint.map(fr.toLocal); let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const p of r) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    return { b, r, bb: [x0, y0, x1, y1] };
  });
  const inside = (p: XY, r: XY[]) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) if ((r[i][1] > p[1]) !== (r[j][1] > p[1]) && p[0] < (r[j][0] - r[i][0]) * (p[1] - r[i][1]) / (r[j][1] - r[i][1]) + r[i][0]) c = !c; return c; };
  const out: SecPlan[] = [];
  // hovli tomoni: uchastka (yoki barcha binolar) markazi — yadro va kirish shu tomonda
  const site = doc.site?.rings[0]?.map(fr.toLocal);
  const pts = site && site.length >= 3 ? site : all.flatMap(x => x.r);
  const court: XY | null = pts.length ? [pts.reduce((t, p) => t + p[0], 0) / pts.length, pts.reduce((t, p) => t + p[1], 0) / pts.length] : null;
  for (const s of all) {
    const b = s.b; if (useDef(b.use).res <= 0 || b.floors - b.nonRes < 1) continue;
    const z0 = b.z0 ?? 0, top = z0 + b.floors;
    // berk devor: qoʻshni seksiya shu sathda tegib tursa
    const blindAt = (p: XY) => all.some(o => o !== s && p[0] >= o.bb[0] && p[0] <= o.bb[2] && p[1] >= o.bb[1] && p[1] <= o.bb[3] && (o.b.z0 ?? 0) < top && (o.b.z0 ?? 0) + o.b.floors > z0 + b.nonRes && inside(p, o.r));
    // 05.11: antiseysmik choklar avval (konstruktiv toʻr, QMQ 3.1.3) — reja seksiyalari chok chizigʻiga moslanadi, chok xonadan oʻtmaydi (3.1.4)
    const gOpts = { sys: doc.settings.construct ?? 'monolit', seismic: doc.settings.seismic ?? 8, H: bLevels(doc.settings, b).top, floors: b.floors } as const;
    const joints = structGrid(s.r, null, gOpts).joints;
    const size = doc.settings.aptSize ?? 'M', layout = layoutSection(s.r, blindAt, mix, MOD_W, size, court, joints, { system: systemOf(gOpts.sys), seismic: gOpts.seismic });
    // qoʻlda tahrir: kalit mos boʻlsa — tahrirlangan reja
    let edited: 'ok' | 'eskirgan' | undefined, genPlan: RulePlan | undefined;
    if (b.planEdit) {
      if (b.planEdit.key === planKey(doc, b) && layout.plan) {
        genPlan = layout.plan;
        layout.plan = applyEdit(layout.plan, { apts: b.planEdit.apts.map(a => ({ ring: a.ring.map(fr.toLocal), rooms: a.rooms, ...(a.inner ? { inner: a.inner } : {}) })), rooms: b.planEdit.rooms.map(q => ({ ring: q.ring.map(fr.toLocal), kind: q.kind })) }, layout.mods, size);
        layout.apts = aptsOf(layout.plan, layout.mods); edited = 'ok';
      } else edited = 'eskirgan';
    }
    // 04.11 (egasi): 1 xonalilar — studiya formati (loyiha sozlamasi); kvartiraning oʻz tanlovi (inner.studio) ustun
    if (doc.settings.studio1 && layout.plan) for (const a of layout.plan.apts) if ((a.rooms || 1) <= 1 && a.inner?.studio == null) a.inner = { ...(a.inner ?? {}), studio: true };
    // 05.11: ShNQ 2.08.01-24, 230-band — liftga tutash yashash xonasi boʻlsa ichki rejaning ikkinchi varianti (qoʻlda tahrir qilinmagan rejada)
    if (layout.plan && edited !== 'ok') fixLiftAdj(layout.plan, layout.mods);
    const halfDepth = Math.max(4, Math.min(9, sectionDepth(s.r, layout.mods) / 2));
    // 05.11: konstruktiv toʻr — hujjat sozlamalari (tizim, seysmiklik) va shu seksiya rejasidan (yadro, kvartira devorlari — langarlar)
    const grid = layout.plan ? structGrid(s.r, layout.plan, gOpts) : undefined;
    // 05.11: fasad modullari toʻrning barcha oʻqlari (raqamli va harfli) fasadni kesgan joylarda boʻlinadi — deraza hech qachon oʻq ustida emas (T2)
    if (grid && layout.plan && layout.plan.axisLines?.length) {
      const gl: [XY, XY][] = grid.blocks.flatMap(b => [...b.x.filter(a => a.kind !== 'sub').map(a => [ptOf(b, a.pos, b.v0), ptOf(b, a.pos, b.v1)] as [XY, XY]), ...b.y.map(a => [ptOf(b, b.u0, a.pos), ptOf(b, b.u1, a.pos)] as [XY, XY])]);
      const m3 = facadeMods(s.r, blindAt, MOD_W, gl, stepSet(grid.system, grid.seismic));
      if (m3.length) { layout.mods = m3; finishPlan(layout.plan, m3, size, true); layout.apts = aptsOf(layout.plan, m3); }
    }
    if (layout.apts.length) out.push({ bid: b.id, ring: s.r, layout, ...(grid ? { grid } : {}), f0: b.nonRes, f1: b.floors, z0, halfDepth, court, ...(edited ? { edited } : {}), ...(genPlan ? { genPlan } : {}) });
  }
  return out;
}

/** Seksiya chuqurligi: modul oʻrtasidan ichki normal boʻylab qarshi devorgacha masofa — 30-protsentil (L shaklda tor qanot eni) */
export function sectionDepth(ring: XY[], mods: Module[]): number {
  const r = signedArea(ring) < 0 ? [...ring].reverse() : ring, ds: number[] = [];
  for (const m of mods) {
    if (m.blind) continue;
    const dx = m.b[0] - m.a[0], dy = m.b[1] - m.a[1], l = Math.hypot(dx, dy) || 1, n: XY = [-dy / l, dx / l], p: XY = [(m.a[0] + m.b[0]) / 2 + n[0] * 0.05, (m.a[1] + m.b[1]) / 2 + n[1] * 0.05];
    let best = Infinity;
    for (let i = 0; i < r.length; i++) {
      const a = r[i], b = r[(i + 1) % r.length], ex = b[0] - a[0], ey = b[1] - a[1], den = n[0] * ey - n[1] * ex; if (Math.abs(den) < 1e-9) continue;
      const t = ((a[0] - p[0]) * ey - (a[1] - p[1]) * ex) / den, u = ((a[0] - p[0]) * n[1] - (a[1] - p[1]) * n[0]) / den;
      if (t > 0.1 && u >= 0 && u <= 1 && t < best) best = t;
    }
    if (isFinite(best)) ds.push(best);
  }
  if (!ds.length) return obb2(r).S;
  ds.sort((a, b) => a - b); return ds[Math.floor(ds.length * 0.3)];   // pastki kvartil — L shaklda tor qanot eni olinsin
}

/** Hisob nuqtalari: har seksiya × turar qavat × kvartiraga tegishli modul */
/** Deraza nuqtalari — koʻr boʻlmagan BARCHA modullar (oshxona, qolgan modullar ham; egasi 30.10: hamma oyna koʻrinsin, reja tahrirlangach ham) */
export function windowPoints(plans: SecPlan[]): { sec: number; f: number; m: number }[] {
  const out: { sec: number; f: number; m: number }[] = [];
  plans.forEach((pl, sec) => {
    for (let f = pl.f0; f < pl.f1; f++) for (let m = 0; m < pl.layout.mods.length; m++) if (!pl.layout.mods[m].blind) out.push({ sec, f, m });
  });
  return out;
}

export interface AptStats {
  apts: number; insolOk: number; westOk: number; /** 15-band 2-xatboshi: janub/janubi-sharq/sharq talabi bajarilgan kvartiralar */ seOk: number; bothOk: number; rooms: number; roomsOk: number;
  byRooms: { k: number; n: number; ok: number }[];
  /** seksiyalar boʻyicha: kvartiralar va mos emaslari */
  bySec: { bid: string; apts: number; bad: number; west: number }[];
  /** har nuqta holati: 0 — yashash xonasi mos (uzluksiz), 1 — faqat uzlukli (eski 8.5 boʻyicha mos boʻlardi; 0102-25 boʻyicha mos emas), 2 — mos emas, 3 — yordamchi xona; west — 15-band buzilgan kvartira xonasi (1 — gʻarbga, 2 — janub/sharq yetarli emas) */
  cls: Uint8Array; west: Uint8Array;
}

export function evaluateApts(plans: SecPlan[], pts: { sec: number; f: number; m: number }[], run: Float32Array, total: Float32Array, norm: InsolNorm): AptStats {
  const idx = new Map<string, number>(); pts.forEach((p, i) => idx.set(`${p.sec}|${p.f}|${p.m}`, i));
  const cls = new Uint8Array(pts.length).fill(3), west = new Uint8Array(pts.length);
  const byK = new Map<number, { n: number; ok: number }>(), bySec: AptStats['bySec'] = [];
  let apts = 0, insolOk = 0, westOk = 0, seOk = 0, bothOk = 0, rooms = 0, roomsOk = 0;
  plans.forEach((pl, sec) => {
    const S = { bid: pl.bid, apts: 0, bad: 0, west: 0 };
    for (const a of pl.layout.apts) {
      const wBad = a.living.filter(m => isWest(pl.layout.mods[m].az)).length > westAllowed(a.rooms);
      const sBad = a.living.filter(m => isSE(pl.layout.mods[m].az)).length < seNeeded(a.rooms);
      for (let f = pl.f0; f < pl.f1; f++) {
        let ok = 0;
        for (const m of a.living) {
          const i = idx.get(`${sec}|${f}|${m}`)!; rooms++;
          const good = roomOk(run[i], total[i], norm); if (good) { ok++; roomsOk++; }
          cls[i] = run[i] >= norm.need - 1e-6 ? 0 : total[i] >= norm.need + 0.5 - 1e-6 ? 1 : 2; if (wBad && isWest(pl.layout.mods[m].az)) west[i] = 1; else if (sBad) west[i] = 2;
        }
        const iOk = ok >= roomsNeeded(a.rooms);
        apts++; S.apts++; if (iOk) insolOk++; if (!wBad) westOk++; if (!sBad) seOk++; if (iOk && !wBad && !sBad) bothOk++; else S.bad++; if (wBad || sBad) S.west++;
        const e = byK.get(a.rooms) ?? { n: 0, ok: 0 }; e.n++; if (iOk && !wBad && !sBad) e.ok++; byK.set(a.rooms, e);
      }
    }
    bySec.push(S);
  });
  return { apts, insolOk, westOk, seOk, bothOk, rooms, roomsOk, byRooms: [...byK.entries()].sort((a, b) => a[0] - b[0]).map(([k, v]) => ({ k, ...v })), bySec, cls, west };
}
