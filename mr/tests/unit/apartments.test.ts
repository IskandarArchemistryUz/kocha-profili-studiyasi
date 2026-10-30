import { describe, it, expect } from 'vitest';
import { layoutSection, windowSun, roomOk, westAllowed, roomsNeeded, planApartments, windowPoints, evaluateApts, isWest, isSE, seNeeded, planKey } from '../../src/core/apartments';
import { editMerge, sharedAny } from '../../src/core/sectionplan';
import { migrate } from '../../src/core/doc';
import { daySteps } from '../../src/core/sun';
import { blankProject, type Project } from '../../src/core/doc';
import { frame, type XY } from '../../src/core/geo';

const rect = (x0: number, y0: number, x1: number, y1: number): XY[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];

describe('Kvartiralar', () => {
  it('sharq–gʻarb choʻziq seksiya: modullar, kvartiralar, oshxona shimolga', () => {
    const L = layoutSection(rect(0, 0, 40, 12), () => false);
    expect(L.mods.length).toBe(12 + 12 + 3 + 3); // 40/3,3 → 12; 12/3,3 → 3 (har tomonda)
    const used = L.apts.flatMap(a => a.mods);
    expect(new Set(used).size).toBe(used.length);           // modul ikki kvartiraga tegmaydi
    for (const a of L.apts) {
      expect(a.living.length).toBe(a.rooms);
      expect(a.mods.length).toBeGreaterThanOrEqual(a.rooms);
      // janub va shimolga ochiq kvartirada yashash xonalari shimolga qaramaydi, agar janubda joy boʻlsa
      const azs = a.mods.map(m => L.mods[m].az);
      if (azs.some(z => Math.abs(z - 180) < 1) && azs.filter(z => Math.abs(z - 180) < 1).length >= a.rooms) expect(a.living.every(m => Math.abs(L.mods[m].az - 180) < 1)).toBe(true);
    }
  });
  it('qoʻshni seksiyaga tegib turgan devor — berk, kvartiralar u yerga deraza ochmaydi', () => {
    const L = layoutSection(rect(0, 0, 30, 12), p => p[0] > 30);
    expect(L.mods.filter(m => Math.abs(m.az - 90) < 1).every(m => m.blind)).toBe(true);
    expect(L.mods.filter(m => Math.abs(m.az - 90) > 1).every(m => !m.blind)).toBe(true);
    expect(L.apts.every(a => a.mods.every(i => !L.mods[i].blind))).toBe(true);
  });
  it('miks: 100 % ikki xonali → hammasi 2 xonali (oxirgisidan tashqari)', () => {
    const L = layoutSection(rect(0, 0, 60, 12), () => false, [0, 100, 0, 0]);
    expect(L.apts.filter(a => a.rooms === 2).length).toBeGreaterThanOrEqual(L.apts.length * 0.6);
  });
  it('meʼyor qoidalari — SanQvaN 0102-25 (94, 95, 15-bandlar)', () => {
    const n = { need: 2.0 };
    expect(roomOk(2.0, 2.0, n)).toBe(true); expect(roomOk(1.9, 3.0, n)).toBe(false);   /* 95: faqat uzluksiz; uzlukli jami hisobga olinmaydi */
    expect(roomOk(1.9, 3.0, { need: 2.0, old85: true })).toBe(true);                     /* eski 0331-16 8.5 rejimi — ixtiyoriy */
    expect(roomsNeeded(1)).toBe(1); expect(roomsNeeded(3)).toBe(1); expect(roomsNeeded(4)).toBe(2); expect(roomsNeeded(5)).toBe(2);   /* 94 */
    expect(westAllowed(1)).toBe(0); expect(westAllowed(2)).toBe(0); expect(westAllowed(3)).toBe(0);   /* 15: istisnosiz */
    expect(isWest(270)).toBe(true); expect(isWest(200)).toBe(true); expect(isWest(290)).toBe(true); expect(isWest(180)).toBe(false); expect(isWest(300)).toBe(false);
    expect(seNeeded(1)).toBe(0); expect(seNeeded(2)).toBe(1); expect(seNeeded(3)).toBe(2); expect(seNeeded(4)).toBe(0);   /* 15, 2-xatboshi */
    expect(isSE(90)).toBe(true); expect(isSE(135)).toBe(true); expect(isSE(180)).toBe(true); expect(isSE(60)).toBe(false); expect(isSE(200)).toBe(false);
  });
  it('deraza: janub fasadi ochiq joyda ≥ 2 soat uzluksiz, shimol fasadi bahorda quyosh olmaydi, toʻsiq qisqartiradi', () => {
    const steps = daySteps(2026, 3, 22, 41.31, 69.28, 10);
    const free = windowSun([[0, -0.3], [0, 12.3]], [5, 5], [180, 0], [], steps);
    expect(free.run[0]).toBeGreaterThan(5); expect(free.total[1]).toBe(0);
    // janubda 20 m masofada 30 m balandlikdagi devor
    const wall = [{ ring: rect(-60, -30, 60, -20), top: 30 }];
    const sh = windowSun([[0, -0.3]], [5], [180], wall, steps);
    expect(sh.run[0]).toBeLessThan(free.run[0]);
  });
  it('loyiha: rejadagi kvartiralar va baholash', () => {
    const p: Project = blankProject('t'); const fr = frame(p.origin);
    p.buildings = [
      { id: 'a', footprint: rect(0, 0, 45, 14).map(fr.toGeo), floors: 9, nonRes: 1, use: 'turar' },
      { id: 'b', footprint: rect(0, -40, 45, -26).map(fr.toGeo), floors: 9, nonRes: 0, use: 'turar' },
      { id: 'c', footprint: rect(100, 0, 110, 10).map(fr.toGeo), floors: 3, nonRes: 3, use: 'savdo' },
    ];
    const plans = planApartments(p);
    expect(plans.map(x => x.bid)).toEqual(['a', 'b']);
    expect(plans[0].f0).toBe(1);
    const pts = windowPoints(plans), N = pts.length;
    const run = new Float32Array(N).fill(3), total = new Float32Array(N).fill(3);
    const st = evaluateApts(plans, pts, run, total, { need: 2.0 });
    const perFloor = plans.map(x => x.layout.apts.length);
    expect(st.apts).toBe(perFloor[0] * 8 + perFloor[1] * 9);
    expect(st.insolOk).toBe(st.apts);
    const dark = evaluateApts(plans, pts, new Float32Array(N), new Float32Array(N), { need: 2.0 });
    expect(dark.insolOk).toBe(0); expect(dark.cls.some(c => c === 2)).toBe(true);
  });
});

import { derive } from '../../src/core/derive';
describe('Hosilaviy: stilobat', () => {
  it('stilobat ustidagi seksiya dogʻi qurilish zichligiga ikki marta qoʻshilmaydi', () => {
    const p: Project = blankProject('t'); const fr = frame(p.origin);
    p.site = { rings: [rect(-50, -50, 50, 50).map(fr.toGeo)] };
    p.buildings = [
      { id: 's', footprint: rect(-40, -40, 40, 40).map(fr.toGeo), floors: 2, nonRes: 2, use: 'savdo', gen: { grp: 'g', kind: 'stilobat' } },
      { id: 't', footprint: rect(-10, -10, 10, 10).map(fr.toGeo), floors: 10, nonRes: 0, use: 'turar', z0: 2 },
    ];
    const d = derive(p);
    expect(d.gsi).toBeCloseTo(0.64, 2);
    expect(d.gfa).toBeCloseTo(6400 * 2 + 400 * 10, -1);
  });
});

import { evaluateAll } from '../../src/norms/rules';
import { mtmNeedPerThousand, demoRow } from '../../src/core/demography';
describe('39-jadval va 542-band', () => {
  it('MTM binosi loyiha koʻchasi qizil chizigʻidan 25 m dan yaqin — mos emas', () => {
    const p: Project = blankProject('t'); const fr = frame(p.origin);
    p.site = { rings: [rect(-150, -150, 150, 150).map(fr.toGeo)] };
    p.streets = [{ id: 's', axis: [[-150, 0], [150, 0]].map(q => fr.toGeo(q as XY)), profile: 'mahalla-15' }];   // qizil chiziqlar y = ±7,5
    p.buildings = [
      { id: 'm', footprint: rect(-20, 20, 20, 40).map(fr.toGeo), floors: 2, nonRes: 0, use: 'mtm' },   // 12,5 m
      { id: 'k', footprint: rect(-20, -80, 20, -40).map(fr.toGeo), floors: 3, nonRes: 0, use: 'maktab' }, // 32,5 m
    ];
    const d = derive(p), r = evaluateAll(d, p).find(x => x.id === 'red-line-39')!;
    expect(d.redLineSocial.find(x => x.bid === 'm')!.d).toBeCloseTo(12.5, 1);
    expect(d.redLineSocial.find(x => x.bid === 'k')!.d).toBeCloseTo(32.5, 1);
    expect(r.status).toBe('fail');
  });
  it('MTM ehtiyoji (542-band) oqilona oraliqda', () => {
    const r = demoRow('1726')!, need = mtmNeedPerThousand(r);
    expect(need).toBeGreaterThan(60); expect(need).toBeLessThan(140);
  });
  it('qoʻlda tahrirlangan reja saqlanadi, qoʻllanadi va bino oʻzgarsa eskiradi', () => {
    const p: Project = blankProject('t'); const fr = frame(p.origin);
    p.buildings = [{ id: 'a', footprint: rect(0, 0, 38, 15).map(fr.toGeo), floors: 9, nonRes: 0, use: 'turar' }];
    const [s0] = planApartments(p), pl = s0.layout.plan!, n0 = pl.apts.length;
    // yonma-yon ikki kvartira (birinchisi yadro yonida boʻlishi mumkin — juftni qidiramiz)
    const i0 = pl.apts.findIndex((a, k) => pl.apts.some((b, l) => l !== k && sharedAny(a.ring, [b.ring]).len > 2));
    const j = pl.apts.findIndex((b, k) => k !== i0 && sharedAny(pl.apts[i0].ring, [b.ring]).len > 2);
    const m = editMerge(pl, i0, j, s0.layout.mods); expect(m.ok).toBe(true); if (!m.ok) return;
    p.buildings[0].planEdit = { key: planKey(p, p.buildings[0]), apts: m.plan.apts.map(a => ({ ring: a.ring.map(fr.toGeo), rooms: a.rooms })), rooms: m.plan.rooms.map(q => ({ ring: q.ring.map(fr.toGeo), kind: q.kind })) };
    const q = migrate(JSON.parse(JSON.stringify(p)));   // sxema orqali saqlanadi
    const [s1] = planApartments(q); expect(s1.edited).toBe('ok'); expect(s1.layout.apts.length).toBe(n0 - 1); expect(s1.genPlan!.apts.length).toBe(n0);
    q.settings = { ...q.settings, aptMix: [100, 0, 0, 0] };
    expect(planApartments(q)[0].edited).toBe('eskirgan');
  });
});
