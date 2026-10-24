import { describe, it, expect } from 'vitest';
import { blockBounds, blocksOf, worstOf, INDS } from '../../src/joyshunos/blocks';
import { routeFromLine, analyzeSlices, catOf, along, type SRoad, type SBld } from '../../src/joyshunos/street';
import type { XY } from '../../src/core/geo';

describe('Koʻcha tahlili — bloklar', () => {
  it('chegaralar: chorrahalar, qisqa boʻlak qoʻshiladi, uzun blok teng boʻlinadi', () => {
    expect(blockBounds(400, [200])).toEqual([[0, 200], [200, 400]]);
    // 15 m li boʻlak (200–215) qoʻshnisiga qoʻshiladi
    expect(blockBounds(400, [200, 215]).map(b => b.map(Math.round))).toEqual([[0, 200], [200, 400]]);
    // boshidagi 10 m — keyingisiga
    expect(blockBounds(300, [10, 150]).map(b => b.map(Math.round))).toEqual([[0, 150], [150, 300]]);
    // 600 m chorrahasiz → 3 × 200 m (≤ 250)
    expect(blockBounds(600, []).map(b => b.map(Math.round))).toEqual([[0, 200], [200, 400], [400, 600]]);
    expect(blockBounds(0, [])).toEqual([]);
  });
  it('eng ogʻir baho', () => {
    expect(worstOf(['g', 'u', 'w'])).toBe('w');
    expect(worstOf(['i', 'u'])).toBe('u');
    expect(worstOf(['g', 'c', 'w'])).toBe('c');
  });
  it('blok koʻrsatkichlari: tor trotuar, oʻtish joyi oraligʻi, fasad, 14 katak', () => {
    // sharq-gʻarb koʻchasi 0…600 m, x = 300 da kesishma; gʻarbiy qismda binolar yaqin (fasad 6 m), sharqiy qismda uzoq (25 m)
    const roads: SRoad[] = [
      { id: 1, pts: [[-50, 0], [650, 0]], cls: 'tertiary', w: 10, name: 'Oybek' },
      { id: 2, pts: [[300, -200], [300, 200]], cls: 'residential', w: 7, name: 'Kesuvchi' },
    ];
    const blds: SBld[] = [];
    for (let x = 0; x < 290; x += 30) for (const sg of [1, -1]) blds.push({ ring: [[x, sg * 6], [x + 28, sg * 6], [x + 28, sg * 26], [x, sg * 26]] as XY[], h: 12 });
    for (let x = 310; x < 600; x += 60) for (const sg of [1, -1]) blds.push({ ring: [[x, sg * 25], [x + 30, sg * 25], [x + 30, sg * 45], [x, sg * 45]] as XY[], h: 12 });
    const rt = routeFromLine([[0, 0], [600, 0]], roads)!;
    expect(rt.junctions.map(Math.round)).toEqual([300]);
    const sl = analyzeSlices(rt, blds, [], null, 20, 80, roads);
    const pois = along(rt, [{ p: [50, 2], kind: 'crossing' }, { p: [580, 2], kind: 'crossing' }, { p: [100, 8], kind: 'stop' }], 25);
    const B = blocksOf({ rt, sl, pois, cat: catOf('tertiary'), sunOn: false });
    // har 300 m li qism 250 m dan uzun → ikkiga: 0–150, 150–300, 300–450, 450–600
    expect(B.map(b => [Math.round(b.s0), Math.round(b.s1)])).toEqual([[0, 150], [150, 300], [300, 450], [450, 600]]);
    for (const b of B) expect(Object.keys(b.cells).sort()).toEqual(INDS.map(d => d.id).sort());
    // gʻarbiy blok: fasadgacha 6 − 5 = 1 m < 2,25 m → jiddiy
    expect(B[0].cells.eni.lv).toBe('c');
    expect(B[0].cells.eni.src).toMatch(/ShNQ 2\.07\.06-24, 2-ilova 1-jadval/);
    // sharqiy blok: 25 − 5 = 20 m — trotuar sigʻishi mumkin, lekin oʻzi oʻlchanmagan → nomaʼlum
    expect(B[2].cells.eni.lv).toBe('u');
    // oʻtish joylari 50 va 580 m: oraliq 530 m > 500 → ikkala blokda jiddiy
    expect(B[0].cells.otish.lv).toBe('c'); expect(B[0].cells.otish.v).toBe('530 m');
    // fasad uzluksizligi: gʻarbda yuqori, sharqda (60 m dan 30 m bino, 20 m chekinish) pastroq
    expect(B[0].cells.fasad.lv).toBe('g');
    expect(['w', 'c']).toContain(B[2].cells.fasad.lv);
    // soya hisoblanmagan — nomaʼlum; video talab qiladigan koʻrsatkichlar — nomaʼlum
    expect(B[0].cells.soya.lv).toBe('u');
    expect(B[0].cells.tezlik.lv).toBe('u');
    expect(B[0].worst).toBe('c');
    // boshqa davlatda ShNQ — andoza: «jiddiy» emas, «eʼtibor»
    const BI = blocksOf({ rt, sl, pois, cat: catOf('tertiary'), sunOn: false, norms: 'intl' });
    expect(BI[0].cells.eni.lv).toBe('w'); expect(BI[0].cells.eni.src).toMatch(/bu hududda meʼyor emas/);
    expect(BI[0].cells.otish.lv).toBe('w');
  });
  it('sanoq kiritilsa — oqim va piyoda maʼlumot sifatida', () => {
    const roads: SRoad[] = [{ id: 1, pts: [[0, 0], [200, 0]], cls: 'residential', w: 7 }];
    const rt = routeFromLine([[0, 0], [200, 0]], roads)!;
    const sl = analyzeSlices(rt, [], [], null, 20, 80, roads);
    const [b] = blocksOf({ rt, sl, pois: [], cat: catOf('residential'), sunOn: false, counts: { car: 800, ped: 300 }, maxspeed: 60 });
    expect(b.cells.oqim.lv).toBe('i'); expect(b.cells.oqim.v).toBe('800');
    expect(b.cells.zichlik.lv).toBe('i');
    expect(b.cells.tezlik.v).toBe('≤ 60');
    expect(b.cells.otish.lv).toBe('u');   // OSM da oʻtish joyi yoʻq
  });
});
