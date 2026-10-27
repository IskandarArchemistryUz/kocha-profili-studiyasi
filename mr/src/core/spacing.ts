/**
 * Binolar orasidagi masofa va ustma-ust tushish (27.10).
 * 1) Qayta generatsiyada shu kvartal/parsel hududidagi ESKI avtomatik binolar (boshqa guruh — masalan, kvartal parsellarga
 *    boʻlinishidan oldingi yoki koʻchalar oʻzgarguncha yaratilgan) olib tashlanadi — yangilari ustiga qurilmaydi.
 * 2) Tekshiruv: ShNQ 2.07.01-23, 79-band 2-jadval (claude/archemistry-bloklar-va-normalar.md):
 *    — uzun (parallel) tomonlar orasi seysmik 8+ ballda ≥ 2·Hmax (izoh 8);
 *    — toretslar orasi (H1+H2)·0,3 (derazali) … (H1+H2)·0,15 (derazasiz), I–II darajada ≥ 6 m.
 *    Deraza bor-yoʻqligi maʼlum emas: 0,15 dan kam — buzilish, 0,15…0,3 — koʻrib chiqish.
 */
import polygonClipping, { type Polygon } from 'polygon-clipping';
import type { Project } from './doc';
import { frame, signedArea, type XY } from './geo';

const P = (r: XY[]): Polygon => [[...r, r[0]].map(p => [p[0], p[1]] as [number, number])];
const mpArea = (mp: [number, number][][][]) => mp.reduce((t, p) => t + p.reduce((s, r, k) => s + (k ? -1 : 1) * Math.abs(signedArea(r.slice(0, -1) as XY[])), 0), 0);
type BB = [number, number, number, number];
const bbOf = (r: XY[]): BB => { let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity; for (const [x, y] of r) { a = Math.min(a, x); b = Math.min(b, y); c = Math.max(c, x); d = Math.max(d, y); } return [a, b, c, d]; };
const bbHit = (a: BB, b: BB, m = 0) => a[0] - m < b[2] && b[0] - m < a[2] && a[1] - m < b[3] && b[1] - m < a[3];
const cen = (r: XY[]): XY => { let x = 0, y = 0; for (const p of r) { x += p[0]; y += p[1]; } return [x / r.length, y / r.length]; };
function inside(p: XY, r: XY[]): boolean { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) if ((r[i][1] > p[1]) !== (r[j][1] > p[1]) && p[0] < (r[j][0] - r[i][0]) * (p[1] - r[i][1]) / (r[j][1] - r[i][1]) + r[i][0]) c = !c; return c; }

export function overlapArea(a: XY[], b: XY[]): number {
  if (!bbHit(bbOf(a), bbOf(b))) return 0;
  try { return mpArea(polygonClipping.intersection(P(a), P(b))); } catch { return 0; }
}

/**
 * Qayta generatsiyada almashtiriladigan eski avtomatik binolar: boshqa guruhga tegishli, markazi shu hududda
 * yoki yangi seksiyalar bilan ustma-ust (> 1 m²). Qoʻlda chizilgan binolar (gen yoʻq) tegilmaydi.
 */
export function staleGen(doc: Project, grp: string, area: XY[], fresh: XY[][]): { bids: string[]; gids: string[] } {
  const fr = frame(doc.origin), bids: string[] = [], gone = new Set<string>();
  const fb = fresh.map(bbOf);
  for (const b of doc.buildings) {
    if (!b.gen || b.gen.grp === grp) continue;
    const r = b.footprint.map(fr.toLocal);
    const hit = inside(cen(r), area) || fresh.some((f, i) => bbHit(bbOf(r), fb[i]) && overlapArea(r, f) > 1);
    if (hit) { bids.push(b.id); gone.add(b.gen.grp); }
  }
  // shu guruhning binosi qolmagan avtoturargohi ham ketadi
  const left = new Set(doc.buildings.filter(b => b.gen && !bids.includes(b.id)).map(b => b.gen!.grp));
  const gids = doc.garages.filter(g => g.grp !== grp && ((gone.has(g.grp) && !left.has(g.grp)) || inside(cen(g.ring.map(fr.toLocal)), area))).map(g => g.id);
  return { bids, gids };
}

export interface SpacingPair { a: string; b: string; kind: 'ustma-ust' | 'uzun' | 'uzun-torets' | 'torets' | 'otish'; d: number; need: number; soft?: number; /** aniq koeffitsiyent (derazalar maʼlum) */ k?: number; ha: number; hb: number }
/** Uchastkadagi binolar juftlari: ustma-ust, uzun tomonlar va toretslar orasidagi masofa */
export function spacingIssues(doc: Project): { pairs: SpacingPair[]; checked: number } {
  const fr = frame(doc.origin), fh = doc.settings.floorHeight;
  const B = doc.buildings.map(b => { const r = b.footprint.map(fr.toLocal); return { b, r, bb: bbOf(r), H: ((b.z0 ?? 0) + b.floors) * fh }; });
  const out: SpacingPair[] = []; let checked = 0;
  for (let i = 0; i < B.length; i++) for (let j = i + 1; j < B.length; j++) {
    const x = B[i], y = B[j], Hm = Math.max(x.H, y.H);
    if (!bbHit(x.bb, y.bb, 2 * Hm + 1)) continue;
    // stilobat ustidagi seksiya / bitta guruhning qoʻshni seksiyalari — bitta bino
    if ((x.b.z0 || y.b.z0) && x.b.gen && y.b.gen && x.b.gen.grp === y.b.gen.grp) continue;
    const ov = overlapArea(x.r, y.r);
    if (ov > 1) { out.push({ a: x.b.id, b: y.b.id, kind: 'ustma-ust', d: 0, need: 0, ha: x.H, hb: y.H }); continue; }
    const g = gapInfo(x.r, y.r);
    if (g.d < 0.5) continue;                                      // umumiy devor — bitta bino seksiyalari
    if (Math.min(x.b.floors, y.b.floors) < 3) continue;            // 2-jadval — 3 va undan yuqori qavatli binolar
    checked++;
    if (g.parallel >= 10) { const need = 2 * Hm; if (g.d < need - 0.5) out.push({ a: x.b.id, b: y.b.id, kind: 'uzun', d: g.d, need, ha: x.H, hb: y.H }); }
    else if (g.la !== g.lb) {
      // derazali uzun tomon ↔ torets: 2·Hmax·0,3, ≥ 6 m (2-jadval)
      const need = Math.max(6, 0.6 * Hm); if (g.d < need - 0.5) out.push({ a: x.b.id, b: y.b.id, kind: 'uzun-torets', d: g.d, need, ha: x.H, hb: y.H });
    } else {
      // toretslar: generatsiya derazasiz devorlarni belgilagan boʻlsa — aniq koeffitsiyent (0,3 / 0,25 / 0,15), aks holda 0,15 … 0,3
      const wa = x.b.gen ? !x.b.gen.blind?.includes(g.ia) : null, wb = y.b.gen ? !y.b.gen.blind?.includes(g.ib) : null;
      const pass = !!x.b.gen && x.b.gen.grp === y.b.gen?.grp && g.d <= 7.5;
      if (wa !== null && wb !== null) {
        const k = wa && wb ? 0.3 : wa || wb ? 0.25 : 0.15, need = Math.max(6, (x.H + y.H) * k);
        if (g.d < need - 0.5) out.push({ a: x.b.id, b: y.b.id, kind: pass ? 'otish' : 'torets', d: g.d, need, ha: x.H, hb: y.H, k });
      } else {
        const need = Math.max(6, (x.H + y.H) * 0.15), soft = Math.max(6, (x.H + y.H) * 0.3);
        if (g.d < soft - 0.5) out.push({ a: x.b.id, b: y.b.id, kind: pass ? 'otish' : 'torets', d: g.d, need, soft, ha: x.H, hb: y.H });
      }
    }
  }
  return { pairs: out, checked };
}

/** Eng yaqin masofa va qarama-qarshi parallel qirralarning bir-birini «koʻradigan» qismi uzunligi (≤ 15°) */
function gapInfo(a: XY[], b: XY[]): { d: number; parallel: number; ia: number; ib: number; la: boolean; lb: boolean } {
  let d = Infinity, par = 0;
  const E = (r: XY[]) => r.map((p, i) => { const q = r[(i + 1) % r.length]; return [p, q, isLong(r, p, q)] as [XY, XY, boolean]; });
  const ea = E(a), eb = E(b), cand: { d: number; i: number; j: number; anti: number }[] = [];
  ea.forEach(([p, q, la], i) => eb.forEach(([s, t, lb], j) => {
    const dd = segD(p, q, s, t); d = Math.min(d, dd);
    const u = [q[0] - p[0], q[1] - p[1]], v = [t[0] - s[0], t[1] - s[1]], lu = Math.hypot(u[0], u[1]), lv = Math.hypot(v[0], v[1]);
    cand.push({ d: dd, i, j, anti: lu && lv ? (u[0] * v[0] + u[1] * v[1]) / lu / lv : 0 });
    if (!la || !lb) return;
    const cos = Math.abs(u[0] * v[0] + u[1] * v[1]) / lu / lv; if (cos < 0.966) return;
    const ux = u[0] / lu, uy = u[1] / lu, ts = [(s[0] - p[0]) * ux + (s[1] - p[1]) * uy, (t[0] - p[0]) * ux + (t[1] - p[1]) * uy];
    const ov = Math.min(lu, Math.max(...ts)) - Math.max(0, Math.min(...ts));
    if (ov > par) par = ov;
  }));
  // eng yaqin juftlar ichidan — bir-biriga qaragani (CCW halqalarda qarama-qarshi yoʻnalish)
  const near = cand.filter(c => c.d <= d + 0.3).sort((x, y) => x.anti - y.anti)[0] ?? { i: 0, j: 0 };
  return { d, parallel: par, ia: near.i, ib: near.j, la: ea[near.i]?.[2] ?? false, lb: eb[near.j]?.[2] ?? false };
}
/** Uzun tomon: qirra uzunligi bino qalinligidan (qirra oʻrtasidan ichkariga) ≥ 1,5 marta — torets va nuqtali minora emas */
function isLong(r: XY[], p: XY, q: XY): boolean {
  const L = Math.hypot(q[0] - p[0], q[1] - p[1]); if (L < 8) return false;
  const u: XY = [(q[0] - p[0]) / L, (q[1] - p[1]) / L], m: XY = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
  let th = Infinity;
  for (const n of [[-u[1], u[0]], [u[1], -u[0]]] as XY[]) for (let i = 0; i < r.length; i++) {
    const a = r[i], b = r[(i + 1) % r.length], e: XY = [b[0] - a[0], b[1] - a[1]], den = n[0] * e[1] - n[1] * e[0]; if (Math.abs(den) < 1e-9) continue;
    const w: XY = [a[0] - m[0], a[1] - m[1]], t = (w[0] * e[1] - w[1] * e[0]) / den, k = (w[0] * n[1] - w[1] * n[0]) / den;
    if (t > 0.3 && k >= 0 && k <= 1) th = Math.min(th, t);
  }
  return Number.isFinite(th) && L >= 1.5 * th;
}
function segD(p: XY, q: XY, s: XY, t: XY): number {
  const x = (a: XY, b: XY, c: XY, e: XY) => { const o = (u: XY, v: XY, w: XY) => (v[0] - u[0]) * (w[1] - u[1]) - (v[1] - u[1]) * (w[0] - u[0]); return o(a, b, c) * o(a, b, e) < 0 && o(c, e, a) * o(c, e, b) < 0; };
  if (x(p, q, s, t)) return 0;
  return Math.min(pd(p, s, t), pd(q, s, t), pd(s, p, q), pd(t, p, q));
}
function pd(p: XY, a: XY, b: XY): number {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy, k = L ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L)) : 0;
  return Math.hypot(p[0] - a[0] - dx * k, p[1] - a[1] - dy * k);
}
