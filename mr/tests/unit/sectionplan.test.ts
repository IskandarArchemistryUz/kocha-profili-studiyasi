import { describe, it, expect } from 'vitest';
import { layoutSection } from '../../src/core/apartments';
import { rulePlan, rectify, planChecks, sharedAny, editMerge, editSplit, editShift, editRooms, editKind, editRoomToApt, type RulePlan } from '../../src/core/sectionplan';
import { area, obb2, type XY } from '../../src/core/geo';
import polygonClipping from 'polygon-clipping';

const rect = (x0: number, y0: number, x1: number, y1: number): XY[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
const modsOf = (ring: XY[]) => layoutSection(ring, () => false).mods;
const plan = (ring: XY[], mix = [20, 40, 30, 10], court: XY | null = null) => rulePlan(ring, modsOf(ring), mix, 'M', court);
const cl = (r: XY[]) => [[...r, r[0]].map(p => [Math.round(p[0] * 1000) / 1000, Math.round(p[1] * 1000) / 1000] as [number, number])];
const ov = (a: XY[], b: XY[]) => polygonClipping.intersection(cl(a) as never, cl(b) as never).reduce((s, p) => s + area(p[0] as XY[]), 0);

/** Asosiy qoidalar: har kvartira oʻz seksiyasi koridoriga eshik, deraza, yorugʻ; ustma-ust emas; seksiya MOP i bitta boʻlak, yadroli */
function rules(pl: RulePlan, ring: XY[]) {
  expect(pl.apts.length).toBeGreaterThan(0);
  const ch = planChecks(pl, 25, modsOf(ring));
  for (const id of ['mop', 'win', 'light', 'stairs', 'corr', 'lift', 'len']) expect([id, ch.find(c => c.id === id)!.ok]).toEqual([id, true]);
  pl.sections.forEach(s => {
    if (!s.apts.length) return;
    expect(s.mop.length).toBe(1);                                  // seksiya koridori — bitta boʻlak
    expect(s.stairs.length).toBeGreaterThanOrEqual(1);
    for (const st of s.stairs) expect(sharedAny(st, s.mop).len).toBeGreaterThanOrEqual(0.9);
    for (const i of s.apts) expect(sharedAny(pl.apts[i].ring, s.mop).len).toBeGreaterThanOrEqual(0.9);
  });
  for (const q of pl.rooms) expect(sharedAny(q.ring, pl.sections[q.sec].mop).len).toBeGreaterThanOrEqual(0.9);   // texnik xonaga ham koridordan kirish
  // turli seksiyalar koridorlari bir-biriga ulanmagan
  for (let i = 0; i < pl.sections.length; i++) for (let j = i + 1; j < pl.sections.length; j++) for (const a of pl.sections[i].mop) for (const b of pl.sections[j].mop) expect(sharedAny(a, [b]).len).toBeLessThan(0.3);
  for (let i = 0; i < pl.apts.length; i++) {
    for (let j = i + 1; j < pl.apts.length; j++) expect(ov(pl.apts[i].ring, pl.apts[j].ring)).toBeLessThan(0.3);
    for (const m of [...pl.mop, ...pl.stairs, ...pl.lifts]) expect(ov(pl.apts[i].ring, m)).toBeLessThan(0.3);
  }
  const sum = [...pl.apts.map(a => a.ring), ...pl.mop, ...pl.stairs, ...pl.lifts, ...pl.rest, ...pl.fireWalls, ...pl.rooms.map(q => q.ring)].reduce((s, q) => s + area(q), 0);
  expect(Math.abs(sum - area(ring))).toBeLessThan(area(ring) * 0.03);
  return pl;
}
const cenOf = (q: XY[]): XY => [q.reduce((s, p) => s + p[0], 0) / q.length, q.reduce((s, p) => s + p[1], 0) / q.length];

describe('Seksiyali reja (qoida boʻyicha)', () => {
  it('33 × 15 — bitta seksiya, yadro hovli tomonida', () => {
    const r = rect(0, 0, 33, 15), pl = rules(plan(r, undefined, [16, 60]), r);
    expect(pl.sections.length).toBe(1); expect(cenOf(pl.stairs[0])[1]).toBeGreaterThan(7.5);   // hovli — shimolda (y > 7,5)
  });
  it('24 × 12 — ikki tomonlama (12 m qanot: markaziy koridor, kvartira chuqurligi 5,2 m — 30.10); 24 × 10 — bir tomonlama', () => { const r = rect(0, 0, 24, 12); expect(rules(plan(r), r).kind).toBe('ikki'); const r2 = rect(0, 0, 24, 10); expect(rules(plan(r2), r2).kind).toBe('bir'); });
  it('72 × 15 — uch seksiya (25–30 m), uzun umumiy koridor yoʻq', () => {
    const r = rect(0, 0, 72, 15), pl = rules(plan(r), r);
    expect(pl.sections.length).toBe(3); expect(pl.corridorLen).toBeLessThan(30); expect(pl.fireWalls.length).toBeGreaterThan(0);
  });
  it('burchak seksiya: yadro ichki burchakda, zina hovli fasadida', () => {
    const r: XY[] = [[0, 0], [23, 0], [23, 15], [15, 15], [15, 23], [0, 23]], pl = rules(plan(r), r);
    expect(pl.sections.length).toBe(1); expect(pl.sections[0].corner).toBe(true);
    const c = cenOf(pl.stairs[0]); expect(Math.hypot(c[0] - 15, c[1] - 15)).toBeLessThan(6);   // ichki burchak (15; 15) yonida
  });
  it('katta L — burchak + qoʻl seksiyalari', () => {
    const r: XY[] = [[0, 0], [45, 0], [45, 15], [15, 15], [15, 40], [0, 40]], pl = rules(plan(r), r);
    expect(pl.sections.length).toBeGreaterThanOrEqual(2); expect(pl.sections.some(s => s.corner)).toBe(true);
    for (const s of pl.sections) expect(s.apts.length).toBeLessThanOrEqual(9);
  });
  it('T — tana alohida, uzun qanot tutashuvda boʻlinadi, yadrolar derazasiz joyda', () => {
    const r: XY[] = [[0, 0], [50, 0], [50, 15], [32, 15], [32, 38], [18, 38], [18, 15], [0, 15]], pl = rules(plan(r), r);
    expect(pl.sections.length).toBe(3);
  });
  it('trapetsiya — yadro bino ichida', () => {
    const r: XY[] = [[0, 0], [45, 0], [25, 16], [0, 16]], pl = rules(plan(r), r);
    for (const st of [...pl.stairs, ...pl.lifts]) expect(Math.abs(ov(st, r) - area(st))).toBeLessThan(0.3);
  });
  it('mayda kesikli minora — bitta seksiya, bitta yadro (kesik alohida seksiya emas)', () => {
    const r: XY[] = [[0, 0], [6.4, -20.15], [20.68, -15.64], [12.7, 9.49], [4.36, -2.91]], pl = rules(plan(r, [40, 30, 20, 10], [-40, 10]), r);
    expect(pl.sections.length).toBe(1); expect(pl.fireWalls.length).toBe(0);
  });
  it('burilgan 40 × 16', () => { const a = 0.5, r = rect(0, 0, 40, 16).map(p => [p[0] * Math.cos(a) - p[1] * Math.sin(a), p[0] * Math.sin(a) + p[1] * Math.cos(a)] as XY); rules(plan(r), r); });
  it('qoʻlda tahrir: birlashtirish, boʻlish, devorni surish, xonalar, texnik — qoidalar saqlanadi', () => {
    const r = rect(0, 0, 38, 15), mods = modsOf(r), pl = rulePlan(r, mods, [20, 40, 30, 10], 'M', [19, 40]), n0 = pl.apts.length;
    const nb = (i: number) => pl.apts.findIndex((b, j) => j !== i && b.sec === pl.apts[i].sec && sharedAny(pl.apts[i].ring, [b.ring]).len > 2);
    const i = pl.apts.findIndex((_, k) => nb(k) >= 0), j = nb(i);
    const m = editMerge(pl, i, j, mods); expect(m.ok).toBe(true); if (!m.ok) return;
    expect(m.plan.apts.length).toBe(n0 - 1); rules(m.plan, r);
    const big = i;   // birlashtirilgan kvartira — qayta ikkiga
    const sp = editSplit(m.plan, big, mods); expect(sp.ok).toBe(true); if (sp.ok) { expect(sp.plan.apts.length).toBe(n0); rules(sp.plan, r); }
    const sh = editShift(pl, i, j, 3.3, mods); if (sh.ok) { expect(sh.plan.apts[i].area).toBeGreaterThan(pl.apts[i].area); rules(sh.plan, r); } else expect(sh.why).toBeTruthy();
    expect(editRooms(pl, i, 9, mods).ok).toBe(false);
    const tx = editKind(pl, i, 'texnik', mods); expect(tx.ok).toBe(true); if (tx.ok) { expect(tx.plan.rooms.length).toBe(pl.rooms.length + 1); const back = editRoomToApt(tx.plan, tx.plan.rooms.length - 1, mods); expect(back.ok).toBe(true); }
    expect(editMerge(pl, 0, 0, mods).ok).toBe(false);
  });
});

describe('qiyshiq va choʻziq (30.10): toʻgʻrilash va shakl qoidasi', () => {
  const skewL = (deg: number, d = 15): XY[] => { const t = Math.tan(deg * Math.PI / 180); return ([[0, 0], [48, 0], [48, d], [d, d], [d, 36], [0, 36]] as XY[]).map(([x, y], i) => [x + (i >= 4 ? y * t : 0), y + (i === 1 || i === 2 ? x * t * 0.5 : 0)] as XY); };
  it('toʻgʻri shakl — toʻgʻrilanmaydi; 2–3° qiyshiq — toʻgʻri burchakli, maydon ±10 %', () => {
    expect(rectify(rect(0, 0, 40, 15))).toBeNull();
    for (const deg of [2, 3]) {
      const r = skewL(deg), R = rectify(r)!;
      expect(R).not.toBeNull();
      expect(Math.abs(area(R) - area(r)) / area(r)).toBeLessThan(0.1);
      // barcha qirralar oʻzaro parallel yoki tik
      const ang = R.map((p, i) => { const q = R[(i + 1) % R.length]; return Math.atan2(q[1] - p[1], q[0] - p[0]); });
      for (const a of ang) expect(Math.min(...[0, 1, 2, 3, 4].map(k => Math.abs(((a - ang[0]) - k * Math.PI / 2 + 4 * Math.PI) % (2 * Math.PI))))).toBeLessThan(0.01);
    }
  });
  it('qiyshiq L: ponasimon qoldiq kvartiralarga (lodjiya), kvartiralar asl kontur ichida, qoidalar bajariladi', () => {
    const r = skewL(3), pl = plan(r);
    rules(pl, r);
    expect(pl.apts.some(a => a.loggia?.length)).toBe(true);
    const A = area(r), inside = pl.apts.reduce((t, a) => t + ov(a.ring, r), 0), all = pl.apts.reduce((t, a) => t + a.area, 0);
    expect(Math.abs(inside - all)).toBeLessThan(0.5);
    expect(all / A).toBeGreaterThan(0.7);
  });
  it('choʻziq kvartiralar kamaydi: 18 m qanotli L da eni:boʻyi > 1:3,2 kvartira ≤ 1 (avval 2)', () => {
    // (burchak seksiyasida 2-zina yoʻqligi — 5.13 — oldindan bor muammo, burchak shabloni bilan hal qilinadi; bu yerda tekshirilmaydi)
    const r: XY[] = [[0, 0], [48, 0], [48, 18], [18, 18], [18, 36], [0, 36]], pl = plan(r);
    for (const a of pl.apts) expect(sharedAny(a.ring, pl.sections[a.sec].mop).len).toBeGreaterThanOrEqual(0.9);
    const el = pl.apts.map(a => { const o = obb2(a.ring); return o.L / o.S; });
    expect(el.filter(e => e > 3.2).length).toBeLessThanOrEqual(1);
  });
});

describe('burchak seksiyasi (30.10): katta kvartira boʻlinadi, > 500 m² da ikkinchi zina', () => {
  for (const d of [15, 18]) it(`L 48×36 · ${d} m: ≤ 135 m² (avval 148), 5.13 bajariladi, qoidalar`, () => {
    const r: XY[] = [[0, 0], [48, 0], [48, d], [d, d], [d, 36], [0, 36]], pl = plan(r);
    expect(Math.max(...pl.apts.map(a => a.area))).toBeLessThanOrEqual(135);
    const ch = planChecks(pl, 25, modsOf(r));
    expect(ch.find(c => c.id === 'stairs')!.ok).toBe(true);
    expect(ch.find(c => c.id === 'light')!.ok).toBe(true);
    for (const a of pl.apts) expect(sharedAny(a.ring, pl.sections[a.sec].mop).len).toBeGreaterThanOrEqual(0.9);
    for (const s of pl.sections) for (const st of s.stairs) expect(sharedAny(st, s.mop).len).toBeGreaterThanOrEqual(0.9);
  });
});
