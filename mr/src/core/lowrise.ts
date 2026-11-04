/**
 * Past qavatli uylar (31.10): avval uchastka (parsel), keyin uy dogʻi — koʻp qavatli seksiyalar qoidasidan alohida.
 * Qoidalar — loyiha hujjati «past-qavatli-uylar-qoidalari»:
 *  ShNQ 2.07.01-23: 74-band — tomorqa ≥ 200 m²; 75-band — yakka uy uchastkasi 400 m²; 96-band — uchastkaning ≥ 30 % koʻkalamzor;
 *   100-band — chegaradan turar joy devorigacha ≥ 3 m; 101-band — chegaradosh uylar bloklanishi mumkin (yon masofa 0);
 *  Strelka katalogi, 3-bob: bloklangan qator — ≤ 100 m va 10–15 uy, blok eni ≥ 3,6 (optimal ≥ 6) m, kirishdan qizil chiziqqacha 2–7 m;
 *  ShNQ 2.07.01-23, 56-jadval — qatorlar orasidagi yongʻin masofasi 6–15 m (bu yerda 8 m — I–III daraja, C0–C1 oraligʻi).
 * Uylar kvartal chetlari (qizil chiziq) boʻylab yoki ixtiyoriy chiziq boʻylab qoʻyiladi.
 */
import polygonClipping, { type MultiPolygon, type Polygon } from 'polygon-clipping';
import { signedArea, type XY } from './geo';

export type LowKind = 'yakka' | 'taunhaus' | 'juft' | 'hovli' | 'klaster';
export interface LowHouse { ring: XY[]; plot: XY[]; floors: number; kind: 'uy' | 'taunhaus'; /** yashil (bogʻ) ulushi uchastkada */ green: number; /** L uy antiseysmik chok bilan ikki boʻlmaga ajratilgan (QMQ 2.01.03-19, 3.1.3) */ joint?: boolean }
export interface LowParams { plotW: number; plotD: number; front: number; side: number; depth: number; maxW: number; floors: number; rowMax: number; rowLen: number; gap: number; minPlot: number }
export const LOW: Record<LowKind, LowParams> = {
  // yakka: uchastka 20 × 22 = 440 m² (75-band ≥ 400), oldi 5 m (Strelka 2–7), yon 3 m (100-band), uy 10–12 m
  yakka: { plotW: 20, plotD: 22, front: 5, side: 3, depth: 10, maxW: 12, floors: 2, rowMax: 0, rowLen: 0, gap: 0, minPlot: 400 },
  // taunhaus: blok eni 6,5 m (Strelka: ≥ 6 optimal), chuqurligi 11,5 m, uchastka 6,5 × 30 ≈ 195 m² → 31 m (≥ 200, 74-band); qator ≤ 15 uy va ≤ 100 m, oraliq 8 m
  taunhaus: { plotW: 6.5, plotD: 31, front: 5, side: 0, depth: 11.5, maxW: 6.5, floors: 3, rowMax: 15, rowLen: 100, gap: 8, minPlot: 200 },
  // juft: ikki xonadonli uy (106-band) — har uchastka 11 × 28 = 308 m², uylar umumiy devor bilan (101-band), tashqi yon 3 m (100-band);
  // juftlar orasi 3 + 3 = 6 m (56-jadval, I–III daraja C0 — 6 m)
  juft: { plotW: 11, plotD: 28, front: 5, side: 3, depth: 11, maxW: 8, floors: 2, rowMax: 0, rowLen: 0, gap: 0, minPlot: 200 },
  // hovli uy (oʻzbek tipi): uchastka 22 × 25 = 550 m²; L shakl — koʻcha qanoti (15 × 6,5 m) va yon qanot (6,5 × 18 m) chap chegarada
  // bloklangan (101-band), hovli janub/ichkari tomonda; qoʻshni uygacha 22 − 15 = 7 m (56-jadval ≥ 6)
  // 04.11 (audit, 100-band): chegaradan turar joy devorigacha ≥ 3 m — old tomon 3 m (avval 2)
  hovli: { plotW: 22, plotD: 25, front: 3, side: 0, depth: 18, maxW: 15, floors: 1, rowMax: 0, rowLen: 0, gap: 0, minPlot: 400 },
  // klaster (hovli-tahlil K-01, K-03): berk koʻcha (6 m, kechasi darvoza) ikki tomonida 15 × 15 m hovli modullari (Kingo uylari),
  // har modulda L shakl uy (koʻcha qanoti 11 × 5,5, yon qanot 5,5 × 11,5 — chiqib turgan qism 6,0 m, QMQ 2.01.03-19, 3.1.1) berk koʻcha tomonida; chuqurligi ≤ rowMax qator
  // 04.11 (audit, 100-band): old tomon 3 m (avval 1), orqa tomonda ham 3 m — modul chuqurligi 17,5 m (11,5 + 3 + 3)
  klaster: { plotW: 15, plotD: 17.5, front: 3, side: 0, depth: 11.5, maxW: 11, floors: 1, rowMax: 3, rowLen: 0, gap: 6, minPlot: 200 },
};
/** Uy dogʻi uchastka ichida (mahalliy u, v): halqa va «chegaragacha masofa» tekshiruvi uchun toʻrtburchak; i — uchastka tartib raqami */
function houseOf(kind: LowKind, P: LowParams, u0: number, u1: number, i: number, first: boolean): { ring: [number, number][]; marg: [number, number][]; hw: number } {
  if (kind === 'juft') {
    const left = i % 2 === 0, hw = P.maxW, h0 = left ? u1 - hw : u0;   // juftning chap uyi oʻng chegaraga, oʻngdagisi chap chegaraga yopishgan
    const r: [number, number][] = [[h0, P.front], [h0 + hw, P.front], [h0 + hw, P.front + P.depth], [h0, P.front + P.depth]];
    const m0 = left ? h0 - P.side : h0, m1 = left ? h0 + hw : h0 + hw + P.side;
    return { ring: r, marg: [[m0 + 0.01, P.front], [m1 - 0.01, P.front], [m1 - 0.01, P.front + P.depth + 3], [m0 + 0.01, P.front + P.depth + 3]], hw };
  }
  if (kind === 'hovli') {
    const f = P.front, a = 15, b = 6.5, c = 18;
    const r: [number, number][] = [[u0, f], [u0 + a, f], [u0 + a, f + b], [u0 + b, f + b], [u0 + b, f + c], [u0, f + c]];
    return { ring: r, marg: [[u0 + 0.01, f], [u0 + a + 3, f], [u0 + a + 3, f + c + 3], [u0 + 0.01, f + c + 3]], hw: a };
  }
  // 04.11 (audit, 100-band): bloklanmagan chet — uchastka chegarasidan devorgacha ≥ 3 m; qator chetidagi uchastka shu 3 m ga kengroq (alongSeg)
  if (kind === 'taunhaus') { const l = first ? 3 : 0, hw2 = P.maxW, h02 = u0 + l; return { ring: [[h02, P.front], [h02 + hw2, P.front], [h02 + hw2, P.front + P.depth], [h02, P.front + P.depth]], marg: [[h02 + 0.01, P.front], [h02 + hw2 - 0.01, P.front], [h02 + hw2 - 0.01, P.front + P.depth + 3], [h02 + 0.01, P.front + P.depth + 3]], hw: hw2 }; }
  const sideL = P.side, hw = Math.min(P.maxW, P.plotW - sideL - P.side);
  const h0 = u0 + (P.plotW - hw) / 2, m = P.side;
  return { ring: [[h0, P.front], [h0 + hw, P.front], [h0 + hw, P.front + P.depth], [h0, P.front + P.depth]], marg: [[h0 - m + 0.01, P.front], [h0 + hw + m - 0.01, P.front], [h0 + hw + m - 0.01, P.front + P.depth + Math.max(m, 3)], [h0 - m + 0.01, P.front + P.depth + Math.max(m, 3)]], hw };
}

const close = (r: XY[]): [number, number][] => [...r, r[0]].map(p => [p[0], p[1]]);
const open = (r: [number, number][]): XY[] => r.slice(0, -1).map(p => [p[0], p[1]] as XY);
const areaOf = (r: XY[]) => Math.abs(signedArea(r));
const mpArea = (mp: MultiPolygon) => mp.reduce((s, p) => s + areaOf(open(p[0])) - p.slice(1).reduce((t, h) => t + areaOf(open(h)), 0), 0);
const tryOp = <T>(f: () => T, fb: T): T => { try { return f(); } catch { return fb; } };
const pin = (p: XY, r: XY[]) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) if ((r[i][1] > p[1]) !== (r[j][1] > p[1]) && p[0] < (r[j][0] - r[i][0]) * (p[1] - r[i][1]) / (r[j][1] - r[i][1]) + r[i][0]) c = !c; return c; };

/** Bitta toʻgʻri chiziq boʻlagi (a → b) boʻylab, chap tomonga (ichkariga) uchastkalar va uylar; free — joylash mumkin boʻlgan hudud */
function alongSeg(a: XY, b: XY, free: MultiPolygon, P: LowParams, kind: LowKind, out: LowHouse[], floors: number): MultiPolygon {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < P.plotW) return [];
  const U: XY = [(b[0] - a[0]) / L, (b[1] - a[1]) / L], N: XY = [-U[1], U[0]];
  const W = (u: number, v: number): XY => [a[0] + U[0] * u + N[0] * v, a[1] + U[1] * u + N[1] * v];
  const strip: Polygon = [close([W(0, -0.5), W(L, -0.5), W(L, P.plotD), W(0, P.plotD)])];
  const zone = tryOp(() => polygonClipping.intersection(strip, free), [] as MultiPolygon);
  if (!zone.length) return [];
  const inZone = (p: XY) => zone.some(q => pin(p, open(q[0])) && !q.slice(1).some(h => pin(p, open(h))));
  // chiziq boʻylab uchastkalar; taunhaus — qatorlar (≤ rowMax uy, ≤ rowLen m), orasida gap
  let u = 0, inRow = 0, rowStart = 0, nPl = 0;
  const used: Polygon[] = [];
  /** u0 dan boshlab kengligi pw uchastka va uy: sigʻadimi (≥ 85 % toʻgʻri toʻrtburchak, ≥ minPlot, uy va chegara masofalari ichida) */
  const tryAt = (u0: number, pw: number, first: boolean, i: number) => {
    const u1 = u0 + pw; if (u1 > L + 1e-6) return null;
    const slab: Polygon = [close([W(u0, -0.5), W(u1, -0.5), W(u1, P.plotD), W(u0, P.plotD)])];
    const pl = tryOp(() => polygonClipping.intersection(slab, zone), [] as MultiPolygon), plotA = mpArea(pl);
    const H = houseOf(kind, P, u0, u1, i, first), house = H.ring.map(([x, y]) => W(x, y));
    const ok = pl.length === 1 && plotA >= Math.max(P.minPlot * 0.98, 0.85 * pw * P.plotD) && house.every(inZone) && H.marg.every(([x, y]) => pin(W(x, y), open(pl[0][0])));
    return ok ? { u1, pl, plotA, house, hw: H.hw } : null;
  };
  while (u + P.plotW <= L + 1e-6) {
    if (kind === 'taunhaus' && (inRow >= P.rowMax || u + P.plotW - rowStart > P.rowLen)) { u += P.gap; inRow = 0; rowStart = u; continue; }
    let r: ReturnType<typeof tryAt> = null, last = false;
    if (kind === 'taunhaus') {
      // 04.11 (audit, 100-band): qator chetidagi uchastka 3 m kengroq — bloklanmagan devordan chegaragacha ≥ 3 m (101-band: ichki devorlar bloklangan)
      const first = inRow === 0, w0 = P.plotW + (first ? 3 : 0);
      const nextOk = inRow + 1 < P.rowMax && u + w0 + P.plotW - rowStart <= P.rowLen && !!tryAt(u + w0, P.plotW + 3, false, nPl + 1);   // keyingisi (hech boʻlmasa oxirgi sifatida) sigʻadimi
      last = !nextOk;
      r = tryAt(u, w0 + (last ? 3 : 0), first, nPl);
      if (!r && !last) { r = tryAt(u, w0 + 3, first, nPl); last = !!r; }
    } else r = tryAt(u, P.plotW, inRow === 0, nPl);
    if (!r) {
      if (kind === 'taunhaus' && inRow > 0) { inRow = 0; rowStart = u + P.plotW; }
      // juft: juftning ikkinchisi sigʻmasa — birinchisi ham olinadi (yolgʻiz yarim uy qolmasin)
      if (kind === 'juft' && nPl % 2 === 1) { out.pop(); used.pop(); nPl--; }
      u += kind === 'taunhaus' || kind === 'juft' ? P.plotW : P.plotW / 2;
      continue;
    }
    const plot = open(r.pl[0][0]);
    out.push({ ring: r.house, plot, floors, kind: kind === 'taunhaus' ? 'taunhaus' : 'uy', ...(kind === 'hovli' ? { joint: true } : {}), green: Math.max(0, 1 - (areaOf(r.house) + P.front * Math.min(3, r.hw)) / r.plotA) });
    used.push(r.pl[0]);
    inRow++; nPl++; u = r.u1;
    if (last) { u += P.gap; inRow = 0; rowStart = u; }
  }
  if (kind === 'juft' && nPl % 2 === 1) { out.pop(); used.pop(); }
  return used.length ? tryOp(() => polygonClipping.union(used[0], ...used.slice(1)), [] as MultiPolygon) : [];
}


/**
 * Klaster: koʻcha qirrasi boʻylab har 2·15 + 6 = 36 m da bitta berk koʻcha (perpendikulyar, 6 m) va uning ikki tomonida 15 × 15 m
 * uchastkalar (≤ rowMax qator). Uy — L shakl, berk koʻcha tomonida (koʻcha qanoti) va uchastkaning shimolroq chetida (yon qanot) —
 * hovli quyoshga ochiladi (K-03, Kingo). Hovli uyi rejasi (lowplan) uchun halqa koʻcha qanoti qirrasidan boshlanadi.
 */
function clusterSeg(a: XY, b: XY, free: MultiPolygon, P: LowParams, out: LowHouse[], floors: number): MultiPolygon {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]), cw = 2 * P.plotW + P.gap; if (L < cw) return [];
  const U: XY = [(b[0] - a[0]) / L, (b[1] - a[1]) / L], N: XY = [-U[1], U[0]];
  const W = (u: number, v: number): XY => [a[0] + U[0] * u + N[0] * v, a[1] + U[1] * u + N[1] * v];
  const zone = tryOp(() => polygonClipping.intersection([close([W(0, -0.5), W(L, -0.5), W(L, P.plotD * P.rowMax + 1), W(0, P.plotD * P.rowMax + 1)])], free), [] as MultiPolygon);
  if (!zone.length) return [];
  const inZone = (p: XY) => zone.some(q => pin(p, open(q[0])) && !q.slice(1).some(h => pin(p, open(h))));
  const used: Polygon[] = [];
  const bw = 5.5, A = P.maxW, C = P.depth, f = P.front;
  for (let s = (L - Math.floor(L / cw) * cw) / 2; s + cw <= L + 1e-6; s += cw) {
    let rows = 0;
    for (let k = 0; k < P.rowMax; k++) { const ok = [[s, k * P.plotD], [s + cw, k * P.plotD], [s + cw, (k + 1) * P.plotD], [s, (k + 1) * P.plotD]].every(([u, v]) => inZone(W(u + (u === s ? 0.01 : -0.01), v + (k === 0 && v === 0 ? 0.01 : -0.01)))); if (!ok) break; rows++; }
    if (rows < 1) continue;
    const lane0 = s + P.plotW, lane1 = lane0 + P.gap;
    for (let k = 0; k < rows; k++) for (const left of [true, false]) {
      const v0 = k * P.plotD, v1 = v0 + P.plotD, u0 = left ? s : lane1, u1 = left ? lane0 : s + cw;
      const plot = [W(u0, v0), W(u1, v0), W(u1, v1), W(u0, v1)];
      // uchastka mahalliy tizimi: x — berk koʻcha boʻylab, y — berk koʻchadan ichkariga; yon qanot shimolroq (dunyo y kattaroq) uchida
      const ex = left ? lane0 : lane1, dir = left ? -1 : 1;
      const lo = W(ex, v0), hi = W(ex, v1), northEnd = hi[1] >= lo[1] ? v1 : v0, xs = northEnd === v1 ? -1 : 1;   // x yoʻnalishi: yon qanot tomondan
      const Q = (x: number, y: number): XY => W(ex + dir * y, northEnd + xs * x);
      const ring: XY[] = [Q(A, f), Q(0, f), Q(0, f + C), Q(bw, f + C), Q(bw, f + bw), Q(A, f + bw)];
      // halqa birinchi qirrasi — koʻcha (berk koʻcha) qanoti
      out.push({ ring, plot, floors, kind: 'uy', green: Math.max(0, 1 - areaOf(ring) / (P.plotW * P.plotD)) });
      used.push([close(plot)]);
    }
    used.push([close([W(lane0, 0), W(lane1, 0), W(lane1, rows * P.plotD), W(lane0, rows * P.plotD)])]);
  }
  return used.length ? tryOp(() => polygonClipping.union(used[0], ...used.slice(1)), [] as MultiPolygon) : [];
}

/**
 * 04.11 (egasi: 56-jadval — past uylar orasidagi yongʻin masofasi): qoʻshni uylar orasi `fire` m dan kam boʻlmasin.
 * fire — ShNQ 2.07.01-23, 56-jadval (olovbardoshlik sinfi, 9+ ballda 649-band +20 %); tegishli oʻlchamlar kengaytiriladi:
 * yakka — yon masofa fire/2 (uchastka eni shunga koʻra); juft — juftlar orasi (tashqi yon) fire/2; hovli — uchastka eni 15 + fire;
 * taunhaus — qatorlar orasi; klaster — orqa chegaragacha fire/2 va qatorlar oraligʻi.
 */
export function lowFit(kind: LowKind, fire = 6): LowParams {
  const P = LOW[kind], h = fire / 2;
  if (kind === 'yakka') { const side = Math.max(P.side, h); return { ...P, side, plotW: Math.max(P.plotW, P.maxW + 2 * side), plotD: Math.max(P.plotD, P.front + P.depth + side) }; }
  if (kind === 'juft') { const side = Math.max(P.side, h); return { ...P, side, plotW: Math.max(P.plotW, P.maxW + side) }; }
  if (kind === 'hovli') return { ...P, plotW: Math.max(P.plotW, 15 + fire), plotD: Math.max(P.plotD, P.front + 18 + h) };
  if (kind === 'taunhaus') return { ...P, gap: Math.max(P.gap, fire) };
  return { ...P, plotW: Math.max(P.plotW, P.front + P.depth + h), plotD: Math.max(P.plotD, P.maxW + fire) };
}

/** Halqalar orasidagi eng kichik masofa (kesishsa — 0) */
function rd(a: XY[], b: XY[]): number {
  if (a.some(p => pin(p, b)) || b.some(p => pin(p, a))) return 0;
  const sg = (p: XY, q: XY, x: XY) => { const dx = q[0] - p[0], dy = q[1] - p[1], L = dx * dx + dy * dy, t = L ? Math.max(0, Math.min(1, ((x[0] - p[0]) * dx + (x[1] - p[1]) * dy) / L)) : 0; return Math.hypot(x[0] - p[0] - dx * t, x[1] - p[1] - dy * t); };
  let d = Infinity;
  for (let i = 0; i < a.length; i++) for (const x of b) d = Math.min(d, sg(a[i], a[(i + 1) % a.length], x));
  for (let i = 0; i < b.length; i++) for (const x of a) d = Math.min(d, sg(b[i], b[(i + 1) % b.length], x));
  return d;
}
/** Burchaklarda (qoʻshni qirralar uchastkalari) yongʻin masofasi yetmagan uylar olib tashlanadi; bloklangan (tegib turgan) uylar — bitta bino */
function fireThin(out: LowHouse[], fire: number): number {
  const keep: LowHouse[] = []; let n = 0;
  for (const h of out) {
    const bad = keep.some(k => { const d = rd(h.ring, k.ring); return d >= 0.5 && d < fire - 0.05 && !keep.some(m => m !== k && rd(m.ring, k.ring) < 0.5 && rd(m.ring, h.ring) < 0.5); });
    if (bad) n++; else keep.push(h);
  }
  out.splice(0, out.length, ...keep); return n;
}

/** Kvartal chetlari boʻylab (uzun qirralardan boshlab): har qirra — chiziq, burchaklarda uchastkalar ustma-ust tushmaydi */
/** floors — tanlangan qavat (1–3, kam qavatli: ShNQ 2.07.01-23, 2-band); berilmasa — tur boʻyicha odatiy */
export function lowriseBlock(block: XY[], kind: LowKind, floorsSel?: number, fire = 6): { houses: LowHouse[]; notes: string[] } {
  const P = lowFit(kind, fire), floors = floorsSel != null ? Math.max(1, Math.min(3, Math.round(floorsSel))) : P.floors;
  const ring = signedArea(block) < 0 ? block.slice().reverse() : block.slice();
  let free: MultiPolygon = [[close(ring)]];
  const edges = ring.map((p, i) => ({ a: p, b: ring[(i + 1) % ring.length], L: Math.hypot(ring[(i + 1) % ring.length][0] - p[0], ring[(i + 1) % ring.length][1] - p[1]) })).filter(e => e.L >= P.plotW).sort((x, y) => y.L - x.L);
  const out: LowHouse[] = [];
  for (const e of edges) {
    const used = kind === 'klaster' ? clusterSeg(e.a, e.b, free, P, out, floors) : alongSeg(e.a, e.b, free, P, kind, out, floors);
    if (used.length) free = tryOp(() => polygonClipping.difference(free, used), free);
  }
  const thin = fireThin(out, fire);
  const notes: string[] = [];
  if (thin) notes.push(`${thin} ta uy burchakda olib tashlandi: qoʻshni uygacha yongʻin masofasi ${String(fire).replace('.', ',')} m dan kam (ShNQ 2.07.01-23, 56-jadval)`);
  if (out.length) notes.push(kind === 'yakka'
    ? `Yakka uylar: ${out.length} ta, uchastka ${P.plotW} × ${P.plotD} m ≥ 400 m² (75-band), oldi ${P.front} m, yon ${P.side} m (100-band), ${floors} qavat`
    : kind === 'taunhaus' ? `Taunhauslar: ${out.length} ta blok, eni ${P.plotW} m, qator ≤ ${P.rowMax} uy va ≤ ${P.rowLen} m (Strelka), oraliq ${P.gap} m; uchastka ≥ 200 m² (74-band), ${floors} qavat`
    : kind === 'juft' ? `Juft uylar: ${out.length / 2} juft, uchastka ${P.plotW} × ${P.plotD} m, umumiy devor (101-band), tashqi yon ${P.side} m (100-band), juftlar orasi ${2 * P.side} m (56-jadval)`
    : kind === 'klaster' ? `Klaster: ${out.length} ta hovli uy berk koʻchalar atrofida — modul ${P.plotW} × ${P.plotD} m (Kingo, K-03), berk koʻcha ${P.gap} m, ≤ ${P.rowMax} qator (K-01), har hovli quyoshga ochiq`
    : `Hovli uylar: ${out.length} ta, uchastka ${P.plotW} × ${P.plotD} m, L shakl uy chap chegarada (101-band), hovli ichkarida, qoʻshnigacha ${P.plotW - 15} m (56-jadval)`);
  else notes.push('Past qavatli uylar sigʻmadi — kvartal qirralari juda qisqa yoki tor');
  return { houses: out, notes };
}

/** Ixtiyoriy siniq chiziq boʻylab (side: 1 — chap, −1 — oʻng tomonga); area — joylash mumkin boʻlgan hudud (masalan, kvartal) */
export function lowriseAlong(line: XY[], side: 1 | -1, kind: LowKind, area: XY[] | null, floorsSel?: number, fire = 6): LowHouse[] {
  const P = lowFit(kind, fire), floors = floorsSel != null ? Math.max(1, Math.min(3, Math.round(floorsSel))) : P.floors, out: LowHouse[] = [];
  const pts = side === 1 ? line : line.slice().reverse();
  let free: MultiPolygon = area ? [[close(signedArea(area) < 0 ? area.slice().reverse() : area)]] : [[close([[-1e5, -1e5], [1e5, -1e5], [1e5, 1e5], [-1e5, 1e5]])]];
  for (let i = 0; i + 1 < pts.length; i++) {
    const used = kind === 'klaster' ? clusterSeg(pts[i], pts[i + 1], free, P, out, floors) : alongSeg(pts[i], pts[i + 1], free, P, kind, out, floors);
    if (used.length) free = tryOp(() => polygonClipping.difference(free, used), free);
  }
  fireThin(out, fire);
  return out;
}
