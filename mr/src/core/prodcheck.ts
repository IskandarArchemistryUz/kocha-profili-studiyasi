/**
 * Ishlab chiqarish zonalari tekshiruvi (02.11) — ShNQ 2.07.01-23:
 *  - 146-band: ishlab chiqarish zonasi va korxonalar SMZ ichida turar joy, mehmonxona, yotoqxona, bogʻ-dala hovli, MTM, maktab,
 *    sport inshootlari va boshqa jamoat binolari joylashtirilmaydi;
 *  - 147-band: turar joy va ishlab chiqarish zonalarini aralash joylashtirish mumkin emas (oraligʻida koʻcha yoki yashil tasma yoʻq — tutash);
 *  - 174-band: aholiga kundalik xizmat bilan bogʻliq boʻlmagan omborlar — transport tugunlari, tashqi avtomobil va temir yoʻl yonida.
 * SMZ — core/logistics.ts (tur boʻyicha; matnda boʻlmagan qiymat — ANDOZA).
 */
import polygonClipping, { type Polygon } from 'polygon-clipping';
import type { Project } from './doc';
import { frame, type XY } from './geo';
import { computePlan } from './plan';
import { bufferLocal } from './limits';
import { prodSzz, logiType } from './logistics';
import { profileById } from './profiles';
import { useDef, type Use } from './uses';

export const PROD: readonly Use[] = ['logistika', 'sanoat', 'kommunal', 'transport'];
/** 146-band roʻyxati (ilova funksiyalari) */
export const DENY_146: readonly Use[] = ['turar', 'yakka', 'aralash', 'mehmonxona', 'maktab', 'mtm', 'sport'];
export const NEAR_174 = 300;   // m — tashqi yoʻl / temir yoʻlgacha «yonida» (TAXMIN: matnda masofa yoʻq)

const close = (r: XY[]): [number, number][] => [...r, r[0]].map(p => [p[0], p[1]]);
const area2 = (r: [number, number][]) => { let a = 0; for (let i = 1; i < r.length; i++) a += r[i - 1][0] * r[i][1] - r[i][0] * r[i - 1][1]; return Math.abs(a) / 2; };
const mpA = (mp: [number, number][][][]) => mp.reduce((t, p) => t + area2(p[0]) - p.slice(1).reduce((u, h) => u + area2(h), 0), 0);
const segD = (p: XY, a: XY, b: XY) => { const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2)); return Math.hypot(a[0] + dx * t - p[0], a[1] + dy * t - p[1]); };
/** ikki halqa orasidagi eng qisqa masofa (uchdan qirragacha) */
function ringDist(a: XY[], b: XY[]): number { let d = Infinity; for (const [P, Q] of [[a, b], [b, a]]) for (const p of P) for (let i = 0; i < Q.length; i++) d = Math.min(d, segD(p, Q[i], Q[(i + 1) % Q.length])); return d; }

export interface ProdZone { block: number; use: Use; sub?: string; szz: number; ref: string; flag: string; rings: XY[][] }
export interface ProdChecks { zones: ProdZone[]; p146: { bid: string; use: Use }[]; p147: { res: number; prod: number; d: number }[]; p174: { block: number; d: number }[]; zoneRings: XY[][] }

let memo: { k: unknown[]; v: ProdChecks } | null = null;
export function prodChecks(doc: Project): ProdChecks {
  const k = [doc.zones, doc.parcels, doc.buildings, doc.streets, doc.site, doc.limits, doc.origin];
  if (memo && memo.k.every((x, i) => x === k[i])) return memo.v;
  const v = raw(doc); memo = { k, v }; return v;
}
function raw(doc: Project): ProdChecks {
  const out: ProdChecks = { zones: [], p146: [], p147: [], p174: [], zoneRings: [] };
  if (!doc.site) return out;
  const plan = computePlan(doc), fr = frame(doc.origin);
  plan.blocks.forEach((b, i) => {
    if (!PROD.includes(b.use)) return;
    const z = doc.zones.find(q => q.id === b.labelId), s = prodSzz(b.use, z?.sub); if (!s) return;
    out.zones.push({ block: i, use: b.use, ...(z?.sub ? { sub: z.sub } : {}), szz: s.szz, ref: s.ref, flag: s.flag, rings: b.rings });
  });
  if (!out.zones.length) return out;
  // 146: SMZ (blok + bufer) ichidagi taqiqlangan binolar
  for (const z of out.zones) {
    const mp = bufferLocal(z.rings[0], z.szz, true);
    out.zoneRings.push(...mp.map(p => p[0].slice(0, -1).map(q => [q[0], q[1]] as XY)));
    for (const bd of doc.buildings) {
      if (!DENY_146.includes(bd.use) && !(useDef(bd.use).res > 0)) continue;
      const fp: Polygon = [close(bd.footprint.map(fr.toLocal))];
      let a = 0; try { a = mpA(polygonClipping.intersection(fp, mp) as never); } catch { /* */ }
      if (a >= 1 && !out.p146.some(x => x.bid === bd.id)) out.p146.push({ bid: bd.id, use: bd.use });
    }
  }
  // 147: turar joy kvartali ishlab chiqarish kvartaliga tutash (oraliq < 6 m — koʻcha yoki yashil tasma yoʻq)
  plan.blocks.forEach((b, i) => {
    if (!(useDef(b.use).res > 0)) return;
    for (const z of out.zones) { const d = ringDist(b.rings[0], z.rings[0]); if (d < 6) out.p147.push({ res: i, prod: z.block, d }); }
  });
  // 174: logistika — tashqi (magistral) koʻcha yoki temir yoʻl yonida
  const major = doc.streets.filter(s => /magistral/.test(profileById(s.profile).cat ?? '')).map(s => s.axis.map(fr.toLocal));
  const rails = (doc.limits ?? []).filter(l => l.kind === 'temiryol' && l.rings?.[0]).map(l => l.rings![0].map(fr.toLocal));
  for (const z of out.zones) {
    if (z.use !== 'logistika') continue;
    let dRoad = Infinity, dRail = Infinity;
    for (const ax of major) for (const p of z.rings[0]) for (let i = 1; i < ax.length; i++) dRoad = Math.min(dRoad, segD(p, ax[i - 1], ax[i]));
    for (const r of rails) dRail = Math.min(dRail, ringDist(z.rings[0], r));
    // yuk terminali — temir yoʻl yonida (≤ 150 m, TAXMIN); qolganlari — magistral koʻcha yoki temir yoʻl (≤ 300 m, TAXMIN)
    const d = logiType(z.sub).rail ? dRail : Math.min(dRoad, dRail), lim = logiType(z.sub).rail ? 150 : NEAR_174;
    if (d > lim) out.p174.push({ block: z.block, d });
  }
  return out;
}
