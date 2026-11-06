/**
 * 07.11 (c69, egasi: «yongʻin yoʻllari koʻchalarga negadir ulanmayapti»).
 * Hovlidagi yongʻin-qutqaruv yoʻlagi kvartal chetida (qizil chiziqda yoki uchastka chegarasida) tugar edi — qizil chiziq bilan
 * qatnov qismi orasidagi trotuar va yashil tasma ustida yoʻl yoʻq edi, mashina koʻchadan kira olmasdi.
 * Bu modul yoʻlakning kvartal chetidagi «ogʻzi»ni (mouth) topadi va uni eng yaqin qatnov qismigacha davom ettiradi:
 * trotuar va yashil tasma orqali oʻtish (pasaytirilgan bordyur), qatnov qismiga tutashishda burilish yoylari.
 *
 * Normalar (ShNQ 2.07.01-23, joriy tahrir): 340-band — oʻtish yoʻllarida yongʻin-qutqaruv mashinalarining yetib borishi;
 * 666-band — binoning butun uzunligi boʻylab yetib kelish; 667-band — eni (3,5 / 4,2 / 6,0 m).
 * Tutashish yoyi radiusi 6 m — ANDOZA (normada yongʻin mashinasi yoʻlagining koʻchaga tutashish radiusi berilmagan;
 * 341-banddagi 15 m — koʻcha va yoʻllar qatnov qismlari uchun). Boshi berk boʻlak — 335-band (boshi berk tor koʻcha: 12 × 12 m
 * aylanish maydonchasi) oʻxshatish boʻyicha — TALQIN.
 */
import type { XY } from './geo';

export type MP = XY[][][];
/** tutashish (bordyur) yoyi radiusi, m — ANDOZA */
export const FIRE_LINK_R = 6;
/** kvartal chetidan qatnov qismigacha qidirish masofasi, m — ANDOZA (qizil chiziqdan qatnov chetigacha odatda 4–20 m) */
export const FIRE_LINK_MAX = 30;
/** boshi berk boʻlakdagi aylanish maydonchasi tomoni, m — 335-band (oʻxshatish, TALQIN) */
export const FIRE_TURN = 12;

export interface FireMouth {
  /** ogʻiz markazi (kvartal chetida) */ p: XY;
  /** tashqariga (koʻcha tomon) birlik vektor */ n: XY;
  /** ogʻiz eni, m */ w: number;
  /** qatnov qismigacha masofa (topilgan boʻlsa) */ t?: number;
  /** uchastka chegarasida (loyiha koʻchasi emas — mavjud koʻcha tomoni) */ site?: boolean;
}

const open = (r: XY[]): XY[] => (r.length > 1 && r[0][0] === r[r.length - 1][0] && r[0][1] === r[r.length - 1][1] ? r.slice(0, -1) : r);
function segD(p: XY, a: XY, b: XY): { d: number; q: XY } {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy, t = L ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L)) : 0;
  const q: XY = [a[0] + dx * t, a[1] + dy * t]; return { d: Math.hypot(q[0] - p[0], q[1] - p[1]), q };
}
function ringNear(p: XY, r: XY[]): { d: number; a: XY; b: XY } {
  let best = { d: Infinity, a: r[0], b: r[0] };
  for (let i = 0; i < r.length; i++) { const a = r[i], b = r[(i + 1) % r.length], s = segD(p, a, b); if (s.d < best.d) best = { d: s.d, a, b }; }
  return best;
}
export function pip(p: XY, r: XY[]): boolean {
  let ins = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const a = r[i], b = r[j]; if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) ins = !ins; }
  return ins;
}
const inPoly = (p: XY, poly: XY[][]): boolean => !!poly[0] && pip(p, open(poly[0])) && !poly.slice(1).some(h => pip(p, open(h)));
export const inMP = (p: XY, mp: MP): boolean => mp.some(poly => inPoly(p, poly));

function densify(r: XY[], step: number): XY[] {
  const out: XY[] = [];
  for (let i = 0; i < r.length; i++) {
    const a = r[i], b = r[(i + 1) % r.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]), k = Math.max(1, Math.ceil(L / step));
    for (let j = 0; j < k; j++) out.push([a[0] + (b[0] - a[0]) * j / k, a[1] + (b[1] - a[1]) * j / k]);
  }
  return out;
}

/**
 * Yoʻlakning kvartal chetidagi ogʻizlari: yoʻlak konturining kvartal chetiga (≤ tol) tegib turgan uzluksiz boʻlaklari.
 * `edge` — kvartal tashqi halqasi, `site` — uchastka halqasi (ogʻiz uchastka chegarasida boʻlsa — mavjud koʻcha tomoni).
 */
export function fireMouths(lane: MP, edge: XY[], site?: XY[] | null, tol = 1.5): FireMouth[] {
  const E = open(edge), S = site ? open(site) : null, out: FireMouth[] = [];
  for (const poly of lane) {
    const R = poly[0] ? densify(open(poly[0]), 0.5) : []; if (R.length < 4) continue;
    const on = R.map(q => ringNear(q, E).d < tol);
    if (on.every(Boolean)) continue;
    const s0 = on.findIndex(v => !v);   // boʻlaklar halqa boʻylab uzluksiz — «yoʻq» nuqtadan boshlab aylanamiz
    let run: XY[] = [];
    const flush = () => {
      if (run.length >= 4) {
        const a = run[0], b = run[run.length - 1], w = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (w >= 2) {
          const p0: XY = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], nb = ringNear(p0, E), p = segD(p0, nb.a, nb.b).q;   // ogʻiz markazi — chetning oʻzida
          const ex = nb.b[0] - nb.a[0], ey = nb.b[1] - nb.a[1], L = Math.hypot(ex, ey) || 1;
          let n: XY = [-ey / L, ex / L];
          if (pip([p[0] + n[0] * 1.5, p[1] + n[1] * 1.5], E)) n = [-n[0], -n[1]];   // tashqariga
          const onSite = !!S && ringNear(p, S).d < tol;
          if (!out.some(m => Math.hypot(m.p[0] - p[0], m.p[1] - p[1]) < 3)) out.push({ p, n, w, ...(onSite ? { site: true } : {}) });
        }
      }
      run = [];
    };
    for (let k = 0; k < R.length; k++) { const i = (s0 + k) % R.length; if (on[i]) run.push(R[i]); else flush(); }
    flush();
  }
  return out;
}

/** ogʻizdan tashqariga qatnov qismigacha masofa (topilmasa — undefined) */
export function reachCarriage(m: FireMouth, carriage: MP, max = FIRE_LINK_MAX): number | undefined {
  if (!carriage.length) return undefined;
  const half = Math.min(m.w, 8) / 2, e: XY = [-m.n[1], m.n[0]];
  for (let t = 0; t <= max; t += 0.5) {
    const c: XY = [m.p[0] + m.n[0] * t, m.p[1] + m.n[1] * t];
    // ogʻiz markazi va ikki cheti — qaysi biri birinchi qatnov qismiga yetsa
    if (inMP(c, carriage) || inMP([c[0] + e[0] * half * 0.6, c[1] + e[1] * half * 0.6], carriage) || inMP([c[0] - e[0] * half * 0.6, c[1] - e[1] * half * 0.6], carriage)) return t;
  }
  return undefined;
}

/**
 * Ogʻizdan qatnov qismigacha oʻtish (pasaytirilgan bordyur bilan): eni — ogʻiz eni (≤ 8 m), qatnov chetida ikki tomonda R radiusli yoy.
 * Qaytaradi: oʻtish poligoni va bordyur (pasaytirilgan) chizigʻi.
 */
export function crossing(m: FireMouth, t: number, R0 = FIRE_LINK_R, o: { half?: number; inner?: number } = {}): { poly: XY[]; curb: [XY, XY] } {
  const L = o.half ?? Math.max(1.75, Math.min(m.w, 8) / 2), n = m.n, e: XY = [-n[1], n[0]], R = Math.max(0.5, Math.min(R0, t)), k = 6, s0 = -(o.inner ?? 0.5);
  const P = (s: number, u: number): XY => [m.p[0] + n[0] * s + e[0] * u, m.p[1] + n[1] * s + e[1] * u];
  const side = (sg: 1 | -1): XY[] => {
    const pts: XY[] = [P(s0, sg * L), P(t - R, sg * L)];
    const c = P(t - R, sg * (L + R));   // yoy markazi: tashqi tomonda
    for (let j = 1; j <= k; j++) { const th = (Math.PI / 2) * j / k; pts.push([c[0] - e[0] * sg * R * Math.cos(th) + n[0] * R * Math.sin(th), c[1] - e[1] * sg * R * Math.cos(th) + n[1] * R * Math.sin(th)]); }
    pts.push(P(t + 0.4, sg * (L + R)));
    return pts;
  };
  const a = side(1), b = side(-1).reverse();
  return { poly: [...a, ...b], curb: [P(t, L + R), P(t, -(L + R))] };
}

/**
 * Koʻcha qatnov qismlari (loyiha koʻchalari): profil tasmalaridan qatnov / avtobus / tramvay boʻlaklari oʻq boʻylab.
 * `corr` — koridor quruvchi (plan.corridor), `off` — oʻqni siljitish (plan.offsetLine).
 */
export function carriageOf(streets: { axis: XY[]; parts: { k: string; w: number }[] }[], corr: (axis: XY[], half: number) => MP, off: (axis: XY[], d: number) => XY[]): MP {
  const out: MP = [];
  for (const s of streets) {
    if (s.axis.length < 2) continue;
    const W = s.parts.reduce((t, p) => t + p.w, 0); let c = -W / 2;
    for (const p of s.parts) {
      if (/^(qatnov|avtobus|tramvay)$/.test(p.k)) { const mid = c + p.w / 2; for (const poly of corr(Math.abs(mid) < 1e-6 ? s.axis : off(s.axis, mid), p.w / 2 + 0.05)) out.push(poly); }
      c += p.w;
    }
  }
  return out;
}

/**
 * Yoʻlak konturini kvartal chetida ochish: halqaning kvartal (yoki uchastka) chetida yotgan qirralari chizilmaydi —
 * ogʻiz «yopiq qopqoq» boʻlib koʻrinmasin. Qaytaradi: ochiq polilyniyalar.
 */
export function openOnEdge(r: XY[], edges: XY[][], tol = 0.4, mouths: { p: XY; r: number }[] = []): XY[][] {
  const R = open(r), n = R.length; if (n < 2) return [];
  // ogʻiz yaqinida (chetdan ≤ 3 m) — yumaloqlash qoldigʻi «quloqcha»lari ham chizilmaydi
  const onE = (a: XY, b: XY): boolean => { const m: XY = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], d = Math.min(...edges.filter(E => E.length > 1).map(E => ringNear(m, open(E)).d));
    return d < tol || (d < 3 && mouths.some(q => Math.hypot(m[0] - q.p[0], m[1] - q.p[1]) < q.r)); };
  const cut = R.map((a, i) => onE(a, R[(i + 1) % n]));
  if (!cut.some(Boolean)) return [[...R, R[0]]];
  const s0 = cut.findIndex(Boolean), out: XY[][] = []; let cur: XY[] = [];
  for (let k = 1; k <= n; k++) {
    const i = (s0 + k) % n;
    if (cut[i]) { if (cur.length >= 2) out.push(cur); cur = []; continue; }
    if (!cur.length) cur.push(R[i]);
    cur.push(R[(i + 1) % n]);
  }
  if (cur.length >= 2) out.push(cur);
  return out;
}
