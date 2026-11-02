/**
 * Albom uchun sukut toʻplami (02.11, egasi: «albom uchun varaqlarga sukut boʻyicha tahlil va boshqa varaqlar oʻtmadi;
 * har qavat rejasi shart emas — tipik qavat va birinchi qavat, yakka uylar boʻlsa — ularning rejalari»).
 *
 *  - koʻp qavatli binolar: bir xil binolar (oʻlchami, qavati, seksiyalari) bitta tur — har turdan 1-qavat va tipik qavat;
 *  - past qavatli uylar: tur (shakli, oʻlchami, qavati) — har turdan har qavat rejasi (uyda 1–3 qavat).
 * Sof funksiyalar: Varaqlar (sukut varaqlari) va Chizmadon (materiallar) bir xil roʻyxatdan foydalanadi.
 */
import type { Project } from './doc';
import { frame, obb2, type XY } from './geo';
import type { SecPlan } from './apartments';
import { floorGroups } from './floorplan';

export const MAX_APT_TYPES = 6, MAX_HOUSE_TYPES = 6;

export interface AptPick { bi: number; /** floorGroups indeksi */ gi: number; kind: 'first' | 'typical'; /** shu turdagi binolar soni */ n: number }
/** Bir xil binolar — bitta tur; har turdan 1-qavat va tipik qavat guruhi */
export function aptPicks(plans: SecPlan[], max = MAX_APT_TYPES): AptPick[] {
  const seen = new Map<string, number>(), reps: number[] = [];
  plans.forEach((pl, bi) => {
    const o = obb2(pl.ring), key = `${Math.round(o.L)}|${Math.round(o.S)}|${pl.f1}|${pl.ring.length}`;
    if (seen.has(key)) { seen.set(key, seen.get(key)! + 1); return; }
    seen.set(key, 1); reps.push(bi);
  });
  const keyOf = (bi: number) => { const pl = plans[bi], o = obb2(pl.ring); return `${Math.round(o.L)}|${Math.round(o.S)}|${pl.f1}|${pl.ring.length}`; };
  const out: AptPick[] = [];
  for (const bi of reps.slice(0, max)) {
    const gs = floorGroups(plans[bi]); if (!gs.length) continue;
    const ti = gs.findIndex(g => g.type === 'typical'), n = seen.get(keyOf(bi)) ?? 1;
    out.push({ bi, gi: 0, kind: 'first', n });
    if (ti > 0) out.push({ bi, gi: ti, kind: 'typical', n });
  }
  return out;
}

export interface HouseType { key: string; name: string; bid: string; n: number; ring: XY[]; plot: XY[]; floors: number; hovli: boolean; joint: boolean }
/** Past qavatli uy turlari (Hajmlar → «Uy rejalari» bilan bir xil kalit: turi, oʻlchami, qavati) */
export function houseTypes(doc: Project, max = MAX_HOUSE_TYPES): HouseType[] {
  const fr = frame(doc.origin), out: HouseType[] = [];
  for (const b of doc.buildings) {
    if (!b.gen?.plot) continue;
    const ring = b.footprint.map(fr.toLocal), plot = b.gen.plot.map(fr.toLocal);
    if (ring.length < 4) continue;
    const L01 = Math.hypot(ring[1][0] - ring[0][0], ring[1][1] - ring[0][1]), L12 = Math.hypot(ring[2][0] - ring[1][0], ring[2][1] - ring[1][1]);
    const hovli = ring.length === 6, name = hovli ? 'Hovli uy' : b.gen.kind === 'taunhaus' ? 'Bloklangan uy' : ring.length === 4 && plot.some(q => [ring[0], ring[1]].some(r => Math.hypot(q[0] - r[0], q[1] - r[1]) < 0.2)) ? 'Juft uy' : 'Yakka uy';
    const key = `${name}|${L01.toFixed(0)}|${L12.toFixed(0)}|${b.floors}`, t = out.find(x => x.key === key);
    if (t) { t.n++; continue; }
    if (out.length < max) out.push({ key, name, bid: b.id, n: 1, ring, plot, floors: hovli ? 1 : b.floors, hovli, joint: !!b.joint });
  }
  return out;
}
