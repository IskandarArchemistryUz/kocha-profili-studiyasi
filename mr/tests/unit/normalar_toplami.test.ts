import { describe, it, expect } from 'vitest';
import { generate, DEFAULT_GEN, type Typology } from '../../src/core/generator';
import { boundaryNeed } from '../../src/core/setback';
import { RULES, abroadRules, OFF_NOTE, type Result } from '../../src/norms/rules';
import { RULE_KIND, levelOf, adgSep, adgMaxH, facingMaxH, adgHalf, adgMaxHHalf } from '../../src/norms/sets';
import { avoidObstacles } from '../../src/core/genfix';
import type { GenSection } from '../../src/core/generator';
import type { XY } from '../../src/core/geo';

/** 11.11: meʼyorlar toʻplamlari, 1-bosqich (claude/normalar-toplamlar-inventar-11-11.md) */
const sq = (w: number, h: number): XY[] => [[0, 0], [w, 0], [w, h], [0, h]];
const H3 = 3;

describe('Meʼyorlar toʻplami — tasnif', () => {
  it('RULES dagi har bir qoida A/B/C/D dan biriga ajratilgan (54 ta; 11.11: fire-666-low)', () => {
    const ids = RULES.map(r => r.id);
    expect(ids.filter(id => !RULE_KIND[id])).toEqual([]);
    expect(Object.keys(RULE_KIND).filter(id => !ids.includes(id))).toEqual([]);
    expect(ids).toHaveLength(54);
  });
  it('daraja: UZ — majburiy; intl — B oʻchiq, A/C/D tavsiya; tasniflanmagan — null', () => {
    expect(levelOf('fire-56', 'UZ')).toBe('majburiy');
    expect(levelOf('school', 'UZ')).toBe('majburiy');
    expect(levelOf('school', 'intl')).toBe('ochiq');
    expect(levelOf('fire-56', 'intl')).toBe('tavsiya');
    expect(levelOf('density-84', 'intl')).toBe('tavsiya');
    expect(levelOf('elu-1050', 'intl')).toBe('tavsiya');
    expect(levelOf('insol-x', 'intl')).toBeNull();
  });
});

describe('ADG 3F-1 andozasi', () => {
  it('binolar orasi: 12 / 18 / 24 m (yashash xonalari), 6 / 9 / 12 m (torets)', () => {
    expect([adgSep(12), adgSep(25), adgSep(40)]).toEqual([12, 18, 24]);
    expect([adgSep(12, false), adgSep(25, false), adgSep(40, false)]).toEqual([6, 9, 12]);
    expect([adgMaxH(11), adgMaxH(12), adgMaxH(20), adgMaxH(24)]).toEqual([0, 12, 25, Infinity]);
  });
  it('UZ: facingMaxH avvalgi formula bilan bir xil (2·H; torets d < 6 → 0, aks holda d / 0,3)', () => {
    expect(facingMaxH(undefined, 40, true, 2)).toBe(20);
    expect(facingMaxH('UZ', 40, true, 1)).toBe(40);
    expect(facingMaxH('UZ', 5, false, 2)).toBe(0);
    expect(facingMaxH('UZ', 12, false, 2)).toBeCloseTo(20);
  });
  it('chekinish: UZ oʻzgarmagan, intl — koʻcha 0 (qoʻlda), qoʻshni ADG yarmi', () => {
    expect(boundaryNeed('kocha', 40, true, 0)).toBe(10);
    expect(boundaryNeed('kocha', 40, true, 0, 'intl')).toBe(0);
    expect(boundaryNeed('qoshni', 40, true, 0, 'intl')).toBe(12);
    expect(boundaryNeed('qoshni', 20, false, 0, 'intl')).toBe(4.5);
  });
});

describe('Generator — toʻplam boʻyicha', () => {
  const T: Typology[] = ['perimetr', 'qatorlar', 'minora', 'blok_minora'];
  it("UZ: norms yoʻq va norms: 'UZ' — natija aynan bir xil (Oʻzbekistonda hech narsa oʻzgarmaydi)", () => {
    for (const typology of T) for (const seismic of [7, 8, 9]) for (const [w, h] of [[90, 90], [160, 120], [220, 70]]) {
      const g = { ...DEFAULT_GEN, typology, maxF: 16, seismic, parking: 'yer_usti' as const };
      const a = generate(sq(w, h), g, H3), b = generate(sq(w, h), { ...g, norms: 'UZ' }, H3);
      expect(JSON.stringify(b)).toBe(JSON.stringify(a));
    }
  }, 120_000);
  it('intl qatorlar: oraliq ADG (16 qavat → 24 m), UZ da 2·Hmax — xorijda zichroq', () => {
    const g = { ...DEFAULT_GEN, typology: 'qatorlar' as const, maxF: 16, minF: 16 };
    const uz = generate(sq(120, 200), g, H3), intl = generate(sq(120, 200), { ...g, norms: 'intl' }, H3);
    expect(intl.notes.join()).toContain('orasi 24 m');
    expect(intl.notes.join()).not.toContain('79-band');
    expect(intl.sections.length).toBeGreaterThan(uz.sections.length);
  });
  it('intl perimetr: tor hovli ADG boʻyicha cheklanadi, ShNQ izohi yoʻq', () => {
    const r = generate(sq(70, 70), { ...DEFAULT_GEN, maxF: 20, norms: 'intl' }, H3);
    expect(r.notes.join()).not.toContain('79-band');
    for (const s of r.sections) expect(s.floors).toBeGreaterThan(0);
  });
  it('intl parkovka: 29-jadval talabi va 30-jadval izohi yoʻq', () => {
    const r = generate(sq(160, 120), { ...DEFAULT_GEN, maxF: 9, parking: 'yer_usti', norms: 'intl' }, H3);
    expect(r.notes.join()).not.toContain('29-jadval');
    expect(r.notes.join()).not.toContain('30-jadval');
    expect(r.parking?.need).toBeUndefined();
  });
});

describe('Hisobot — xorijda B oʻchiq', () => {
  const R = (id: string, status: Result['status']): Result => ({ id, title: id, status, source: { doc: 'ShNQ 2.07.01-23', clause: '1', edition: '2023', verified: true }, fix: { id: 'mtm', label: 'x', hint: 'y' } });
  it('B → na, «Tuzat» yoʻq; A → review; UZ oʻzgarmaydi', () => {
    const rs = [R('school', 'fail'), R('fire-56', 'fail')];
    expect(abroadRules(rs, 'UZ')).toBe(rs);
    const [b, a] = abroadRules(rs, 'intl');
    expect(b.status).toBe('na'); expect(b.fix).toBeUndefined(); expect(b.note).toContain(OFF_NOTE);
    expect(a.status).toBe('review'); expect(a.fix).toBeDefined();
  });
});

describe('Mavjud (saqlanadigan) bino yonida — avoidObstacles', () => {
  // seksiya 0..60 × 0..15, fasadi shimolga (y+); mavjud bino 30 m shimolda, 30 m (10 qavat) baland
  const sec = (): GenSection => ({ ring: [[0, 0], [60, 0], [60, 15], [0, 15]], floors: 16, kind: 'oddiy', nonRes: 0, face: { p: [30, 15], n: [0, 1] } });
  const obs = [{ ring: [[0, 45], [60, 45], [60, 60], [0, 60]] as XY[], h: 30 }];
  it('ADG ulushlari: 6 / 9 / 12 m; qolgan ulushdan balandlik', () => {
    expect([adgHalf(12), adgHalf(20), adgHalf(30)]).toEqual([6, 9, 12]);
    expect([adgMaxHHalf(5), adgMaxHHalf(6), adgMaxHHalf(9), adgMaxHHalf(12)]).toEqual([0, 12, 25, Infinity]);
  });
  it('UZ: 30 m masofa, mavjud bino 30 m — 2·H > d → seksiya olinadi (oʻzgarishsiz)', () => {
    const n: string[] = []; expect(avoidObstacles([sec()], obs, 5, H3, n)).toHaveLength(0);
    expect(n.join()).toContain('8-izoh');
  });
  it('intl: 30 m − mavjud binoning ulushi 12 m = 18 m ≥ 12 → yangi bino cheklanmaydi', () => {
    const n: string[] = [], r = avoidObstacles([sec()], obs, 5, H3, n, 6, 2, 'intl');
    expect(r).toHaveLength(1); expect(r[0].floors).toBe(16); expect(n.join()).not.toContain('izoh');
  });
  it('intl: 20 m — qolgan ulush 8 m → H ≤ 12 m (4 qavat); minF 5 sigʻmaydi → olinadi, minF 3 → 4 qavat', () => {
    const near = [{ ...obs[0], ring: obs[0].ring.map(p => [p[0], p[1] - 10] as XY) }];
    expect(avoidObstacles([sec()], near, 5, H3, [], 6, 2, 'intl')).toHaveLength(0);
    const n: string[] = [], r = avoidObstacles([sec()], near, 3, H3, n, 6, 2, 'intl');
    expect(r[0].floors).toBe(4); expect(n.join()).toContain('xalqaro andoza');
  });
});
