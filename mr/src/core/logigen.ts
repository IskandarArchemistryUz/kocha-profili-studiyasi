/**
 * Logistika kvartali generatori (02.11, egasi: «logistika turlari alohida generatsiya boʻladimi?» — ha).
 *
 * Har tur uchun bitta bir qavatli katta oraliqli bino + yuk mashinalari hovlisi (apron) + dok darvozalar + tirkama turargohi;
 * yuk terminalida — temir yoʻl tomonda shoxobcha (berk yoʻl) va yuklash platformasi.
 * ShNQ 2.07.01-23 va SanQvaN 0103-25 da omborlar bino oʻlchamlari, apron chuqurligi, dok qadami yoʻq — barcha oʻlchamlar ANDOZA
 * (xalqaro amaliyot: zal balandligi 8–12 m; yarim tirkamali avtopoyezd 16,5 m, apron 35 m — orqaga yurib dokka kirish va manevr; dok qadami 4 m;
 * tirkama joyi 3,6 × 16 m; shoxobcha — 1 iz + 4 m platforma ≈ 10 m). Aniq qiymat — ShNQ 2.09.02-19 (papkada yoʻq) va texnologik loyiha.
 * Kvartal shaklidan qatʼi nazar, uzun qirra yoʻnalishida toʻgʻri toʻrtburchak «bino + apron» toʻplami joylanadi.
 */
import type { XY } from './geo';
import { freeRect } from './labels';
import { logiType } from './logistics';

export interface LogiProfile { /** zal balandligi, m */ hall: number; maxL: number; maxD: number; minD: number; docks: 0 | 1 | 2; apron: number; trailers: boolean; rail?: boolean; note: string }
/** Tur boʻyicha andozalar (ANDOZA — matnda yoʻq) */
export const LOGI_PROFILE: Record<string, LogiProfile> = {
  tarqatish: { hall: 12, maxL: 240, maxD: 120, minD: 40, docks: 1, apron: 35, trailers: true, note: 'tarqatish markazi: bir tomonlama doklar, ichki balandlik 10–12 m (stellajlar)' },
  sovutgich: { hall: 10, maxL: 150, maxD: 72, minD: 30, docks: 1, apron: 35, trailers: true, note: 'sovutgichli ombor: sendvich-panel izolyatsiya, germetik dok shlyuzlari, kompressor xonasi alohida' },
  sabzavot: { hall: 8, maxL: 150, maxD: 60, minD: 30, docks: 1, apron: 35, trailers: true, note: 'sabzavot-meva ombori: kameralar (harorat va namlik), saralash zali dok tomonda' },
  krossdok: { hall: 9, maxL: 200, maxD: 36, minD: 24, docks: 2, apron: 35, trailers: false, note: 'kross-dok: tor korpus (24–36 m), doklar ikki tomonda — kiruvchi va chiquvchi oqim' },
  terminal: { hall: 10, maxL: 240, maxD: 60, minD: 30, docks: 1, apron: 35, trailers: true, rail: true, note: 'yuk terminali: temir yoʻl tomonda shoxobcha va platforma, avtomobil tomonda doklar' },
  qurilish: { hall: 8, maxL: 72, maxD: 30, minD: 18, docks: 1, apron: 25, trailers: false, note: 'qurilish materiallari: yopiq ombor kichik, qolgan hovli — ochiq saqlash maydoni' },
  yoqilgi: { hall: 4.5, maxL: 30, maxD: 15, minD: 12, docks: 0, apron: 25, trailers: false, note: 'yoqilgʻi ombori: bino — operator va nasos xonasi; rezervuarlar va quyish estakadasi texnologik loyiha boʻyicha' },
};
export const DOCK_PITCH = 4, APRON_MIN = 25, TRAILER_W = 3.6, TRAILER_L = 16, SPUR_W = 10;

export interface LogiOut {
  sections: { ring: XY[]; docks: { edge: number; n: number }[] }[];
  apron: XY[][]; trailers: XY[][]; spur?: XY[]; notes: string[]; hall: number;
}

const inside = (p: XY, r: XY[]) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) if ((r[i][1] > p[1]) !== (r[j][1] > p[1]) && p[0] < (r[j][0] - r[i][0]) * (p[1] - r[i][1]) / (r[j][1] - r[i][1]) + r[i][0]) c = !c; return c; };
const segX = (a: XY, b: XY, c: XY, d: XY) => { const o = (p: XY, q: XY, r: XY) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])); return o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0; };
/** toʻrtburchak toʻliq koʻpburchak ichida (uchlari ichida, qirralar kesishmaydi) */
const fits = (q: XY[], A: XY[]) => q.every(p => inside(p, A)) && !q.some((a, i) => A.some((c, k) => segX(a, q[(i + 1) % q.length], c, A[(k + 1) % A.length])));

/** Kvartal ichidagi eng katta oriyentirlangan toʻrtburchak: uzun qirra yoʻnalishida, kerak boʻlsa freeRect */
function longest(r: XY[]): number { let ang = 0, bl = -1; for (let i = 0; i < r.length; i++) { const a = r[i], b = r[(i + 1) % r.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L > bl) { bl = L; ang = Math.atan2(b[1] - a[1], b[0] - a[0]); } } return ang; }
/** ang berilsa — shu yoʻnalishda (temir yoʻlga parallel), aks holda kvartalning eng uzun qirrasi boʻyicha */
function frameRect(A: XY[], ang0?: number): { o: XY; u: XY; v: XY; w: number; h: number } | null {
  const ang = ang0 ?? longest(A);
  const u: XY = [Math.cos(ang), Math.sin(ang)], v: XY = [-u[1], u[0]];
  const P = A.map(p => [p[0] * u[0] + p[1] * u[1], p[0] * v[0] + p[1] * v[1]] as XY);
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity; for (const p of P) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
  const at = (x: number, y: number): XY => [u[0] * x + v[0] * y, u[1] * x + v[1] * y];
  // markazdan kichraytirib (toʻgʻri toʻrtburchak kvartal — birinchi qadamda)
  for (let k = 0; k < 14; k++) {
    const f = Math.pow(0.93, k), w = (x1 - x0) * f, h = (y1 - y0) * f, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, o = at(cx - w / 2, cy - h / 2);
    const q: XY[] = [o, at(cx + w / 2, cy - h / 2), at(cx + w / 2, cy + h / 2), at(cx - w / 2, cy + h / 2)];
    if (fits(q, A)) return { o, u, v, w, h };
  }
  const fr = freeRect([A], [], 0); if (!fr || fr.w < 20 || fr.h < 20) return null;
  const U: XY = [Math.cos(fr.ang), Math.sin(fr.ang)], V: XY = [-U[1], U[0]];
  return { o: [fr.c[0] - U[0] * fr.w / 2 - V[0] * fr.h / 2, fr.c[1] - U[1] * fr.w / 2 - V[1] * fr.h / 2], u: U, v: V, w: fr.w, h: fr.h };
}

/**
 * A — chekinishdan keyingi kvartal (mahalliy metr); sub — logistika turi; rails — yaqin temir yoʻl (oʻq yoki kontur, mahalliy metr).
 * null — sigʻmadi (chaqiruvchi oddiy ombor blokiga qaytadi).
 */
export function logiLayout(A: XY[], sub: string | undefined, rails: XY[][] = []): LogiOut | null {
  const t = logiType(sub), P = LOGI_PROFILE[t.id] ?? LOGI_PROFILE.tarqatish;
  // yuk terminali: bino va shoxobcha eng yaqin temir yoʻlga parallel
  let railAng: number | undefined;
  if (P.rail && rails.length) {
    const c: XY = [A.reduce((s, p) => s + p[0], 0) / A.length, A.reduce((s, p) => s + p[1], 0) / A.length];
    const dOf = (r: XY[]) => Math.min(...r.map(p => Math.hypot(p[0] - c[0], p[1] - c[1])));
    railAng = longest([...rails].sort((a, b) => dOf(a) - dOf(b))[0]);
  }
  let F = frameRect(A, railAng), aligned = railAng != null;
  if (aligned && (!F || F.h < P.minD + APRON_MIN + SPUR_W)) { F = frameRect(A); aligned = false; }   // temir yoʻl yoʻnalishida sigʻmadi
  if (!F) return null;
  const { u, v } = F; let { w: W, h: H, o } = F;
  // yoʻnalish: chuqurlik (v) boʻyicha joy koʻproq boʻlsin — uzun tomon bino uzunligi
  let U = u, V = v; if (H > W && !aligned) { o = [o[0] + u[0] * W, o[1] + u[1] * W]; U = v; V = [-u[0], -u[1]]; [W, H] = [H, W]; }
  const at = (x: number, y: number): XY => [o[0] + U[0] * x + V[0] * y, o[1] + U[1] * x + V[1] * y];
  const rect = (x0: number, y0: number, x1: number, y1: number): XY[] => [at(x0, y0), at(x1, y0), at(x1, y1), at(x0, y1)];
  const notes: string[] = [];
  // temir yoʻl tomoni (faqat yuk terminali): toʻrtburchakning qaysi uzun tomoni temir yoʻlga yaqin
  let railSide: 0 | 1 | null = null;
  if (P.rail) {
    const pts = rails.flat();
    if (pts.length) {
      const yOf = (p: XY) => (p[0] - o[0]) * V[0] + (p[1] - o[1]) * V[1];
      const ys = pts.map(yOf), near0 = Math.min(...ys.map(y => Math.abs(y))), near1 = Math.min(...ys.map(y => Math.abs(y - H)));
      railSide = near0 <= near1 ? 0 : 1;
    } else notes.push('Yuk terminali: yaqin temir yoʻl topilmadi — shoxobcha chizilmadi (174-band: terminal temir yoʻl yonida boʻladi)');
  }
  // chuqurlik taqsimoti: [shoxobcha] [apron] bino [apron] [tirkamalar]
  let apron = P.apron;
  const rail = railSide != null ? SPUR_W : 0, aprons = P.docks === 2 ? 2 : 1;
  let D = Math.min(P.maxD, H - rail - aprons * apron);
  if (D < P.minD) { apron = Math.max(APRON_MIN, (H - rail - P.minD) / aprons); D = Math.min(P.maxD, H - rail - aprons * apron); }
  if (D < P.minD) return null;
  const left = H - rail - aprons * apron - D, trailers = P.trailers && left >= TRAILER_L + 2;
  const L = Math.min(P.maxL, W), x0 = (W - L) / 2, x1 = x0 + L;
  // yaxlit toʻplam pastdan (y = 0) yuqoriga; temir yoʻl yuqorida boʻlsa — teskari tartib
  const order: ('spur' | 'apron' | 'bld' | 'apron2' | 'trl')[] = P.docks === 2 ? ['apron', 'bld', 'apron2'] : railSide != null ? ['trl', 'apron', 'bld', 'spur'] : ['trl', 'apron', 'bld'];
  if (railSide === 0) order.reverse();
  const size = { spur: rail, apron, bld: D, apron2: apron, trl: trailers ? TRAILER_L + 2 : 0 };
  const used = order.reduce((s, k) => s + size[k], 0); let y = (H - used) / 2;
  const out: LogiOut = { sections: [], apron: [], trailers: [], notes, hall: P.hall };
  let bldY0 = 0;
  for (const k of order) {
    const h = size[k]; if (!h) continue;
    if (k === 'bld') bldY0 = y;
    else if (k === 'apron' || k === 'apron2') out.apron.push(rect(x0, y, x1, y + h));
    else if (k === 'trl') {
      // tirkama joylari apron chetida, yaxlit qator (3,6 × 16 m)
      const n = Math.floor((L - 4) / TRAILER_W), xs = x0 + (L - n * TRAILER_W) / 2, near = order.indexOf('trl') < order.indexOf('apron');
      const ya = near ? y + 2 : y, yb = ya + TRAILER_L;
      for (let i = 0; i < n; i++) out.trailers.push(rect(xs + i * TRAILER_W, ya, xs + (i + 1) * TRAILER_W, yb));
    } else if (k === 'spur') {
      // iz oʻqi platformadan 4 m tashqarida, kvartal chetigacha davom etadi (berk yoʻl)
      const ys = railSide === 0 ? y + 3 : y + h - 3;
      out.spur = [at(0, ys), at(W, ys)];
    }
    y += h;
  }
  // bino: dok darvozalari apron tomonda — ring qirrasi 0 (pastki, y = bldY0) va 2 (yuqori)
  const ring = rect(x0, bldY0, x1, bldY0 + D), nDock = Math.max(0, Math.floor((L - 12) / DOCK_PITCH));
  const below = order.indexOf('apron') < order.indexOf('bld'), docks: { edge: number; n: number }[] = [];
  if (P.docks >= 1) docks.push({ edge: below ? 0 : 2, n: nDock });
  if (P.docks === 2) docks.push({ edge: below ? 2 : 0, n: nDock });
  out.sections.push({ ring, docks });
  const r0 = (x: number) => String(Math.round(x));
  notes.push(`${t.name}: bino ${r0(L)} × ${r0(D)} m, 1 qavat, balandligi ${String(P.hall).replace('.', ',')} m; ${P.docks ? `${docks.reduce((s, d) => s + d.n, 0)} dok darvoza (qadam ${DOCK_PITCH} m)` : 'doksiz'}; apron ${r0(apron)} m${aprons === 2 ? ' × 2' : ''}${trailers ? `; ${out.trailers.length} tirkama joyi (3,6 × 16 m)` : ''}${out.spur ? '; temir yoʻl shoxobchasi va platforma' : ''} — ANDOZA`);
  notes.push(P.note);
  return out;
}
