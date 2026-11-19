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

export interface AptPick { bi: number; /** floorGroups indeksi */ gi: number; kind: 'first' | 'typical'; /** shu turdagi binolar soni */ n: number; /** 19.11: shu reja takrorlanadigan binolar (indekslar, birinchisi — bi) */ members: number[] }
/**
 * Bir xil reja — bitta tur; har turdan 1-qavat va tipik qavat guruhi.
 * 19.11 (egasi: «seksiya ham, plan ham bir xil boʻlsa — bitta umumiy varaq»): kalit — oyoq izi oʻlchami (0,5 m), shakli,
 * 1-qavat funksiyasi (f0) va kvartiralar ketma-ketligi; qavatlar soni kalitga kirmaydi (7 va 9 qavatli bir xil seksiya — bitta reja).
 */
export function aptKey(pl: SecPlan): string {
  const o = obb2(pl.ring), h = (v: number) => Math.round(v * 2) / 2;
  return `${h(o.L)}|${h(o.S)}|${pl.ring.length}|${pl.f0}|${(pl.layout?.apts ?? []).map(a => a.rooms).join('')}`;
}
export function aptPicks(plans: SecPlan[], max = MAX_APT_TYPES): AptPick[] {
  const groups = new Map<string, number[]>();
  plans.forEach((pl, bi) => { const k = aptKey(pl), g = groups.get(k); if (g) g.push(bi); else groups.set(k, [bi]); });
  const out: AptPick[] = [];
  for (const members of [...groups.values()].slice(0, max)) {
    const bi = members[0], gs = floorGroups(plans[bi]); if (!gs.length) continue;
    const ti = gs.findIndex(g => g.type === 'typical'), n = members.length;
    out.push({ bi, gi: 0, kind: 'first', n, members });
    if (ti > 0) out.push({ bi, gi: ti, kind: 'typical', n, members });
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
