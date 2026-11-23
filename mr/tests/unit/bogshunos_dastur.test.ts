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

test('bolalar maydoni: xavfsizlik zonalari bir-birini kesmaydi va blokdan chiqmaydi; xizmat elementlari taklifda bor', () => {
  for (const el of ['bolalar_k', 'bolalar_m'] as ElKey[]) {
    const b: Block = { id: 'b', el, p: [0, 0], a: 0, rule: '' }, S = fitout(b).safe;
    for (let i = 0; i < S.length; i++) { expect(Math.abs(S[i].p[0]) + S[i].r).toBeLessThanOrEqual(ELEM[el].w / 2 + 0.01); expect(Math.abs(S[i].p[1]) + S[i].r).toBeLessThanOrEqual(ELEM[el].d / 2 + 0.01);
      for (let j = i + 1; j < S.length; j++) expect(Math.hypot(S[i].p[0] - S[j].p[0], S[i].p[1] - S[j].p[1])).toBeGreaterThanOrEqual(S[i].r + S[j].r - 0.01); }
  }
  const t = suggest('tuman', 12, 1200, { pitch: 0, play: 0, tarixiy: false }).prog;
  expect(t.wc).toBe(3); expect(t.kafe).toBe(1); expect(t.ijara).toBe(1); expect(t.kirish).toBe(3);
  const x = suggest('xiyobon', 6.3, 600, { pitch: 0, play: 0, tarixiy: true }).prog;
  expect(x.wc).toBe(2); expect(x.kafe ?? 0).toBe(0);
});

import { qc } from '../../src/bogshunos/nazorat';
import { Grid } from '../../src/bogshunos/grid';
test('loyiha tekshiruvi: ustma-ust va chegaradan chiqqan elementlar xato; toza loyihada xato yoʻq', () => {
  const G = new Grid(-60, -60, 2, 60, 60), C: any = { G, site: G.u8().fill(1), water: G.u8(), bld: G.u8() };
  for (let k = 0; k < G.n; k++) { const x = -60 + (k % 60) * 2 + 1; if (x > 50) C.site[k] = 0; }
  const A: any = { areaHa: 1.2, minOk: true, minHa: 0.5, toilets: 1, visitors: { N1: 800, perHa: 40, q: 100 } };
  const hard = G.u8(); for (let k = 0; k < G.n; k++) { const y = -60 + Math.floor(k / 60) * 2 + 1; if (Math.abs(y) < 2) hard[k] = 1; }
  const m = { greenPct: 80, conflict: 0, conflictBig: 0, mgnOver: 0, zina: 0, rampa: 0 };
  const mk = (blocks: Block[], fixed: any[] = []): any => ({ V: { m, blocks, miss: [], fixed }, masks: { hard } });
  const st = (r: ReturnType<typeof qc>, k: string) => r.find(x => x.k.startsWith(k))?.s;
  const ok = qc(C, A, mk([{ id: 'b1', el: 'wc', p: [0, 8], a: 0, rule: '' }, { id: 'b2', el: 'gulzor', p: [-30, 12], a: 0, rule: '' }]));
  expect(ok.filter(r => r.s === 'xato')).toEqual([]);
  const bad = qc(C, A, mk([{ id: 'b1', el: 'basket', p: [0, 20], a: 0, rule: '' }, { id: 'b2', el: 'basket', p: [4, 22], a: 0, rule: '' }, { id: 'b3', el: 'gulzor', p: [52, 10], a: 0, rule: '' }, { id: 'b4', el: 'piknik', p: [-30, 50], a: 0, rule: '' }], [{ p: [0, 20], name: 'Haykal', r: 18, t: 'haykal' }]));
  expect(st(bad, 'Bir-birining')).toBe('xato'); expect(st(bad, 'Chegaradan')).toBe('xato'); expect(st(bad, 'Yoʻlga')).toBe('xato'); expect(st(bad, 'Saqlanadigan')).toBe('xato'); expect(st(bad, 'Hojatxonalar')).toBe('ogoh');
});


import { dodge } from '../../src/bogshunos/design';
import { fitArea, type Prog } from '../../src/bogshunos/dastur';
test('yoʻl yirik daraxt tanasidan chetga suriladi; uzoqdagi qismi joyida qoladi', () => {
  const g: [number, number][] = [[-30, 0], [30, 0]], t = { p: [0, 0.5] as [number, number], d: 60 };
  const r = dodge(g, [t], 3), dMin = Math.min(...r.map(q => Math.hypot(q[0] - t.p[0], q[1] - t.p[1])));
  expect(dMin).toBeGreaterThanOrEqual(3 / 2 + 1.2);
  expect(r[0]).toEqual([-30, 0]); expect(r[r.length - 1]).toEqual([30, 0]);
  expect(dodge(g, [{ p: [0, 20], d: 60 }], 3)).toBe(g);
});
test('kichik bogʻda dastur izi maydonning 12 % idan oshmaydi; kirish saqlanadi', () => {
  const P: Prog = { kirish: 1, workout: 1, bolalar_k: 1, bolalar_m: 1, piknik: 2, sokin_bog: 2, gulzor: 2 };
  const cut = fitArea(P, 0.78), foot = (Object.keys(P) as ElKey[]).reduce((s, k) => s + (P[k] ?? 0) * ELEM[k].w * ELEM[k].d, 0);
  expect(cut.length).toBeGreaterThan(0); expect(foot).toBeLessThanOrEqual(0.78 * 10000 * 0.12); expect(P.kirish).toBe(1);
  expect(suggest('tuman', 15, 6000, { pitch: 0, play: 0, tarixiy: false }).prog.wc).toBe(5);
});
