import { test, expect } from 'vitest';
import { suggest, ELEM, fitout, blockRing, bearing, type Block, type ElKey } from '../../src/bogshunos/dastur';

const sportA = (p: Partial<Record<ElKey, number>>) => (Object.keys(p) as ElKey[]).filter(k => ELEM[k].zone === 'sport_yangi').reduce((s, k) => s + (p[k] ?? 0) * ELEM[k].w * ELEM[k].d, 0);

test('xiyobon va tarixiy makonda sport sukut boʻyicha qoʻyilmaydi', () => {
  const x = suggest('xiyobon', 6.3, 600, { pitch: 0, play: 0, tarixiy: false });
  expect(sportA(x.prog)).toBe(0); expect(x.prog.sokin_bog).toBeGreaterThan(0);
  const t = suggest('tuman', 6.3, 600, { pitch: 0, play: 0, tarixiy: true });
  expect(sportA(t.prog)).toBe(0); expect(t.prog.bolalar_k ?? 0).toBe(0);
});

test('tuman bogʻi: sport 33-jadval ehtiyojidan va maydonning 4 % idan oshmaydi; mavjud maydon ayiriladi', () => {
  const a = suggest('tuman', 12, 1200, { pitch: 0, play: 0, tarixiy: false });
  expect(a.sportNeed).toBe(Math.min(Math.round(3800 * 1.2), Math.round(12 * 400)));
  expect(sportA(a.prog)).toBeGreaterThan(0); expect(sportA(a.prog)).toBeLessThanOrEqual(a.sportNeed * 1.1);
  const b = suggest('tuman', 12, 1200, { pitch: 5000, play: 1, tarixiy: false });
  expect(b.sportNeed).toBe(0); expect(sportA(b.prog)).toBe(0); expect(b.prog.bolalar_k ?? 0).toBe(0);
});

test('blok geometriyasi va jihozlash: basketbolda 2 halqa, belgilar bor; burilganda maydon saqlanadi', () => {
  const b: Block = { id: 'b0', el: 'basket', p: [10, 20], a: 105 * Math.PI / 180, rule: '' };
  const r = blockRing(b), area = Math.abs(r.reduce((s, p, i) => { const q = r[(i + 1) % 4]; return s + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2;
  expect(area).toBeCloseTo(ELEM.basket.w * ELEM.basket.d, 3);
  expect(Math.round(bearing(b.a))).toBe(165);   // 345° oʻqi (165° bilan bir chiziq)
  const f = fitout(b);
  expect(f.furn.filter(x => x.id === 'basket')).toHaveLength(2); expect(f.marks.length).toBeGreaterThan(5);
  // barcha jihoz blok chegarasidan 1 m dan uzoqqa chiqmaydi
  for (const x of f.furn) { const du = (x.p[0] - b.p[0]) * Math.cos(b.a) + (x.p[1] - b.p[1]) * Math.sin(b.a), dv = -(x.p[0] - b.p[0]) * Math.sin(b.a) + (x.p[1] - b.p[1]) * Math.cos(b.a); expect(Math.abs(du)).toBeLessThanOrEqual(ELEM.basket.w / 2 + 1); expect(Math.abs(dv)).toBeLessThanOrEqual(ELEM.basket.d / 2 + 1); }
  for (const k of Object.keys(ELEM) as ElKey[]) expect(() => fitout({ ...b, el: k })).not.toThrow();
});

import { varProg } from '../../src/bogshunos/dastur';
test('variant xarakteri: Saqlovchi — shovqinli elementsiz, Faol — toʻliq, Tabiiy — qattiq sport oʻrniga sokin', () => {
  const P = suggest('tuman', 12, 1200, { pitch: 0, play: 0, tarixiy: false }).prog;
  expect(varProg('B', P)).toEqual(P);
  const A = varProg('A', P), C = varProg('C', P);
  expect(sportA(A)).toBe(0); expect(A.it_maydon ?? 0).toBe(0); expect(A.workout).toBe(1); expect(A.bolalar_m).toBe(P.bolalar_m);
  expect(sportA(C)).toBe(0); expect(C.skeyt ?? 0).toBe(0); expect(C.piknik).toBe((P.piknik ?? 0) + 1); expect(C.gulzor).toBe((P.gulzor ?? 0) + 1);
});
