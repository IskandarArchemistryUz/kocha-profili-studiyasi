import { describe, it, expect } from 'vitest';
import { intersections, entryChecks, autoEntry, autoShafts, entryRing, worstCheck, ringDist, NEED, type EntryEnv } from '../../src/core/parkentry';
import { autoEntries, entryReport, entryEnv } from '../../src/core/parkenv';
import { blankProject, type Building, type Garage, type Project } from '../../src/core/doc';
import { frame, type XY } from '../../src/core/geo';
import { RULES } from '../../src/norms/rules';
import { derive } from '../../src/core/derive';

const sq = (x: number, y: number, w: number, h: number): XY[] => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
const O: [number, number] = [69.28, 41.31];
const fr = frame(O);
/** kvartal 0..100 × 0..80; janubda magistral (y = −15), gʻarbda mahalliy (x = −10) — chorraha (−10, −15) */
const env0 = (): EntryEnv => ({ block: sq(0, 0, 100, 80), streets: [{ axis: [[-60, -15], [160, -15]], w: 30, main: true }, { axis: [[-10, -60], [-10, 140]], w: 20, main: false }], stops: [], windows: [], edu: [], rest: [], buildings: [] });

describe('avtoturargoh kirish-chiqishi (05.11): 414, 415-bandlar', () => {
  it('chorrahalar: kesishma va tutashgan uch, magistral belgisi', () => {
    const x = intersections(env0().streets); expect(x).toHaveLength(1); expect(x[0].main).toBe(true); expect(x[0].p[0]).toBeCloseTo(-10); expect(x[0].p[1]).toBeCloseTo(-15);
    const t = intersections([{ axis: [[0, 0], [100, 0]], w: 20, main: false }, { axis: [[50, 1], [50, 80]], w: 20, main: false }]);   // uchi oʻqqa 1 m da tutashgan
    expect(t).toHaveLength(1); expect(t[0].main).toBe(false);
  });
  it('tekshiruvlar: magistral chorrahadan 50, bekatdan 5, yer ostida deraza / hudud / maydoncha 15 m', () => {
    const env = { ...env0(), stops: [[40, -2]] as XY[], windows: [sq(0, 30, 40, 15)], edu: [sq(60, 40, 40, 40)], rest: [sq(45, 5, 10, 10)] };
    const near = entryChecks([5, 2], env, true);   // chorrahadan ≈ 22,7 m; deraza (0,30)-gacha 28 m
    const ch = near.find(c => c.kind === 'chorraha')!; expect(ch.need).toBe(NEED.main); expect(ch.ok).toBe(false); expect(ch.d).toBeCloseTo(Math.hypot(15, 17), 1);
    const far = entryChecks([95, 2], env, true);
    expect(far.find(c => c.kind === 'chorraha')?.ok ?? true).toBe(true);   // 106 m — talab + 30 dan uzoq, roʻyxatga kirmaydi
    expect(far.find(c => c.kind === 'hudud')!.ok).toBe(true);    // (95,2) → hudud (60..100, 40..80) 38 m
    expect(entryChecks([70, 30], env, true).find(c => c.kind === 'hudud')!.ok).toBe(false);   // 10 m < 15
    const st = entryChecks([42, 2], env, true); expect(st.find(c => c.kind === 'bekat')!.ok).toBe(false);
    expect(entryChecks([42, 2], env, false).some(c => c.kind === 'deraza' || c.kind === 'maydoncha')).toBe(false);   // yer usti — faqat 414
    expect(entryChecks([50, 12], env, true, 'shaxta').some(c => c.kind === 'chorraha')).toBe(false);   // shaxta — faqat 415 / SanPiN
    expect(worstCheck(st)!.kind).toBe('maydoncha');   // 4,2 / 15 < 4,5 / 5
    expect(worstCheck(entryChecks([42, 2], env, false))!.kind).toBe('bekat');
  });
  it('avtomatik pandus: koʻchaga qaragan qirrada, magistral chorrahadan uzoqda; shaxtalar garaj ichida, binodan uzoq', () => {
    const env = env0(), gar = sq(5, 5, 90, 70);
    const e = autoEntry(gar, env, true)!; expect(e.kind).toBe('rampa');
    expect(e.at[1]).toBeCloseTo(5, 1);                                    // janubiy qirra (magistral tomon)
    expect(Math.hypot(e.at[0] + 10, e.at[1] + 15)).toBeGreaterThanOrEqual(50);
    expect(Math.abs(Math.sin(e.dir!) + 1)).toBeLessThan(0.05);           // yoʻnalish — janubga (koʻchaga)
    const sh = autoShafts(gar, { ...env, buildings: [sq(5, 5, 30, 70)], windows: [sq(5, 5, 30, 70)] }, 2); expect(sh).toHaveLength(2);
    for (const s of sh) { expect(s.kind).toBe('shaxta'); expect(s.edge).toBeUndefined(); expect(s.at[0]).toBeGreaterThanOrEqual(35 + 15); expect(s.at[0]).toBeLessThan(95); }
    expect(autoShafts(sq(0, 0, 50, 50), env)).toHaveLength(2);         // 2 500 m² → 2 ta (har 2 000 m² ga 1 — ANDOZA)
  });
  it('05.11: shaxta va pandus maydoncha (sport ham) ustiga tushmaydi; joy yoʻq — garaj chetida, koʻcha tomonda (edge)', () => {
    const env = env0(), gar = sq(5, 5, 90, 70), sport = sq(40, 20, 50, 50);
    const sh = autoShafts(gar, { ...env, rest: [sport] }, 3);
    for (const s of sh) { expect(ringDist(s.at, sport).d).toBeGreaterThanOrEqual(15); expect(s.edge).toBeUndefined(); }
    // hamma joy maydonchalarga 15 m dan yaqin — chetga, koʻcha (janub, y = 5) tomoniga
    const full = autoShafts(gar, { ...env, rest: [sq(15, 15, 70, 50)] });
    expect(full).toHaveLength(1); expect(full[0].edge).toBe(true); expect(full[0].at[1]).toBeCloseTo(5, 1);
    expect(ringDist(full[0].at, sq(15, 15, 70, 50)).d).toBeGreaterThan(0);
    const e = autoEntry(gar, { ...env, rest: [sq(5, 5, 90, 20)] }, false)!;   // janubiy chet maydoncha bilan band
    expect(ringDist(e.at, sq(5, 5, 90, 20)).d).toBeGreaterThanOrEqual(1);
  });
  it('pandus izi 6 × 3,5 m (at — tashqi uch), shaxta 2 × 2', () => {
    const r = entryRing({ at: [10, 10], dir: -Math.PI / 2, kind: 'rampa' });
    expect(Math.hypot(r[1][0] - r[0][0], r[1][1] - r[0][1])).toBeCloseTo(3.5); expect(Math.hypot(r[2][0] - r[1][0], r[2][1] - r[1][1])).toBeCloseTo(6);
    expect(r.every(p => p[1] >= 9.99)).toBe(true);   // ichkariga (shimolga) choʻziladi
    expect(entryRing({ at: [0, 0], kind: 'shaxta' })).toEqual([[-1, -1], [1, -1], [1, 1], [-1, 1]]);
  });
  it('qoidalar: kirish yoʻq — koʻrib chiqish; qoʻyilgan — masofalar boʻyicha mos / mos emas', () => {
    const base = blankProject('t'), ring = sq(5, 5, 90, 70);
    const g = (entries?: Garage['entries']): Garage => ({ id: 'g1', grp: 'b1', kind: 'yer_osti', ring: ring.map(fr.toGeo), levels: 1, spaces: 120, ...(entries ? { entries } : {}) });
    const house = (y: number): Building => ({ id: 'h' + y, footprint: sq(20, y, 40, 14).map(fr.toGeo), floors: 9, nonRes: 0, use: 'turar', gen: { grp: 'b1', kind: 'oddiy' } } as Building);
    const doc = (gg: Garage, bs: Building[]): Project => ({ ...base, origin: O, buildings: bs, garages: [gg], streets: [{ id: 's1', axis: [[-60, -15], [160, -15]].map(p => fr.toGeo(p as XY)), profile: 'tuman-40' }, { id: 's2', axis: [[-10, -60], [-10, 140]].map(p => fr.toGeo(p as XY)), profile: 'mahalla-15' }],
      settings: { ...base.settings, yards: false }, site: { rings: [sq(0, 0, 100, 80).map(fr.toGeo)] } as Project['site'] });
    const ev = (id: string, d: Project) => RULES.find(r => r.id === id)!.evaluate(derive(d), d);
    expect(ev('ug-park-415', doc(g(), [house(40)])).status).toBe('review');
    expect(ev('park-414', doc(g(), [house(40)])).status).toBe('review');
    const d0 = doc(g(), [house(40)]), es = autoEntries(d0, d0.garages[0]);
    expect(es.filter(e => e.kind === 'rampa')).toHaveLength(1); expect(es.filter(e => e.kind === 'shaxta').length).toBeGreaterThanOrEqual(1);
    const toG = (e: typeof es[number]) => ({ at: fr.toGeo(e.at), kind: e.kind, ...(e.dir != null ? { dir: e.dir } : {}) });
    const d1 = doc(g(es.map(toG)), [house(40)]);
    expect(ev('park-414', d1).status).toBe('pass'); expect(ev('ug-park-415', d1).status).toBe('pass');
    expect(entryReport(d1, d1.garages[0]).every(r => !r.worst || r.worst.ok)).toBe(true);
    // uy pandusdan 8 m da (y = 13..27, kirish y ≈ 5) → 415-band mos emas; where — nuqta va kesma
    const d2 = doc(g([toG(es[0])]), [house(13)]), r2 = ev('ug-park-415', d2);
    expect(r2.status).toBe('fail'); expect(r2.where?.pts).toHaveLength(1); expect(r2.where?.need?.labels?.[0].text).toContain('≥ 15 m');
    // magistral chorrahaga 30 m: (−10,−15) → kirish (10, 5) ≈ 28 m → 414 mos emas
    const d3 = doc(g([{ at: fr.toGeo([10, 5]), kind: 'rampa', dir: -Math.PI / 2 }]), [house(40)]);
    expect(ev('park-414', d3).status).toBe('fail');
    // garaj chetidagi shaxta (edge) uyga 8 m — mos emas emas, koʻrib chiqish
    const d4 = doc(g([toG(es[0]), { at: fr.toGeo([40, 5]), kind: 'shaxta', edge: true }]), [house(13)].map(b => ({ ...b, id: 'h4', footprint: sq(20, 13, 40, 14).map(fr.toGeo) })));
    const r4 = ev('ug-park-415', { ...d4, garages: [{ ...d4.garages[0], entries: [{ at: fr.toGeo([90, 5]), kind: 'rampa', dir: -Math.PI / 2 }, { at: fr.toGeo([40, 5]), kind: 'shaxta', edge: true }] }] });
    expect(r4.status).toBe('review');
  });
});

/** 06.11 (c61): ShNQ 2.05.07-24, 10-band — binoda joylashgan yer osti avtoturargohi kirish-chiqishidan oʻz binosigacha masofa belgilanmaydi */
describe('ug-park-415: oʻz binosi (ShNQ 2.05.07-24, 10-band)', () => {
  it('garaj bino ostida — pandus oʻz binosiga yaqin boʻlsa ham mos emas emas; shaxta oʻz binosidan tekshiriladi; manba — 0350-17 siz', () => {
    const base = blankProject('t'), ring = sq(20, 20, 40, 10);
    const g: Garage = { id: 'g1', grp: 'b1', kind: 'yer_osti', ring: ring.map(fr.toGeo), levels: 1, spaces: 40, entries: [{ at: fr.toGeo([25, 20]), kind: 'rampa', dir: -Math.PI / 2 }] };
    const host: Building = { id: 'h', footprint: sq(15, 15, 55, 25).map(fr.toGeo), floors: 9, nonRes: 0, use: 'turar' } as Building;
    const d: Project = { ...base, origin: O, buildings: [host], garages: [g], settings: { ...base.settings, yards: false }, site: { rings: [sq(0, 0, 100, 80).map(fr.toGeo)] } as Project['site'] };
    const env = entryEnv(d, g); expect(env.windows).toHaveLength(0); expect(env.host).toHaveLength(1);
    const ev = (x: Project) => RULES.find(r => r.id === 'ug-park-415')!.evaluate(derive(x), x);
    expect(ev(d).status).toBe('pass'); expect(ev(d).note).toContain('2.05.07-24');
    const sh: Project = { ...d, garages: [{ ...g, entries: [...g.entries!, { at: fr.toGeo([40, 25]), kind: 'shaxta' }] }] };
    expect(ev(sh).status).toBe('fail');
    expect(RULES.find(r => r.id === 'ug-park-415')!.source.doc).not.toContain('0350');
  });
});
