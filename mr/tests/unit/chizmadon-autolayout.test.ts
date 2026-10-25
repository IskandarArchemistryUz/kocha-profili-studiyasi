import { describe, it, expect } from 'vitest';
import { LAYOUTS, layoutFrame, slotRect, buildLayoutPage } from '../../src/chizmadon/layouts';
import { tryFill, paginate, applyOv, structural, cost, accepts, dropReject, placements, familyById, cells, type Material } from '../../src/chizmadon/autolayout';

/** Prototipdagi «Loyihadan» toʻplami: sarlavha + 3 chegara + legenda + pasport + 3 diagramma + matn */
const mats = (): Material[] => ([
  { id: 'title', role: 'title', name: 'Sarlavha', title: 'Hudud tahlili' },
  { id: 'loc0', role: 'locator', level: 0, name: 'Davlat chegarasi', title: 'Davlat' },
  { id: 'loc1', role: 'locator', level: 1, name: 'Viloyat chegarasi', title: 'Viloyat' },
  { id: 'loc2', role: 'locator', level: 2, name: 'Tuman chegarasi', title: 'Tuman' },
  { id: 'legend', role: 'legend', name: 'Shartli belgilar', title: 'Shartli belgilar' },
  { id: 'pass', role: 'table', kind: 'passport', name: 'Hudud pasporti', title: 'Hudud pasporti' },
  { id: 'sun', role: 'chart', kind: 'sunpath', name: 'Quyosh yoʻli', title: 'Quyosh yoʻli' },
  { id: 'izoh', role: 'text', kind: 'note', name: 'Xulosa matni', title: 'Loyihaga xulosa' },
  { id: 'day', role: 'chart', kind: 'daylight', name: 'Kun uzunligi', title: 'Kun uzunligi' },
  { id: 'temp', role: 'chart', kind: 'temp', name: 'Harorat', title: 'Harorat' },
] as Omit<Material, 'visible' | 'accent' | 'scale'>[]).map(e => ({ visible: true, accent: null, scale: 1, ...e }));

describe('Chizmadon — maketlar kutubxonasi', () => {
  it('8 oila, 83 varaq turi (+ 3 ta kvartirografiya); har katak roli maʼlum', () => {
    expect(LAYOUTS.families).toHaveLength(8);
    expect(LAYOUTS.families.reduce((a, f) => a + f.pages.length, 0)).toBe(83);
    for (const f of LAYOUTS.families) {
      for (const k of f.formats) expect(LAYOUTS.formats[k], `${f.id}:${k}`).toBeTruthy();
      for (const p of f.pages) for (const s of p.slots) expect(LAYOUTS.roles[s.role], `${p.id}:${s.role}`).toBeTruthy();
    }
  });
  it('har katak toʻr ichida va varaq chegarasidan chiqmaydi (hamma format)', () => {
    for (const f of LAYOUTS.families) for (const fmt of f.formats) for (const p of f.pages) {
      const fr = layoutFrame(f, p, fmt), R = f.orient === 'L' ? 8 : 16;
      for (const s of p.slots) {
        if (s.fx == null) { expect((s.c ?? 0) + (s.cs ?? 1)).toBeLessThanOrEqual(12); expect((s.r ?? 0) + (s.rs ?? 1)).toBeLessThanOrEqual(R); }
        const r = slotRect(fr, s);
        expect(r.x).toBeGreaterThanOrEqual(-1e-6); expect(r.y).toBeGreaterThanOrEqual(-1e-6);
        expect(r.x + r.w).toBeLessThanOrEqual(fr.W + 1e-6); expect(r.y + r.h).toBeLessThanOrEqual(fr.H + 1e-6);
        expect(r.w).toBeGreaterThan(0); expect(r.h).toBeGreaterThan(0);
      }
    }
  });
  it('format almashsa — faqat oʻlcham: A3 → A2 da katak nisbati bir xil (A1 — plakat hoshiyasi)', () => {
    const f = familyById('mr'), p = f.pages.find(x => x.id === 'mr-map-l')!, s = p.slots[2];
    const a = slotRect(layoutFrame(f, p, 'A3L'), s), b = slotRect(layoutFrame(f, p, 'A2L'), s);
    expect(b.w / a.w).toBeCloseTo(594 / 420, 2); expect(b.x / b.w).toBeCloseTo(a.x / a.w, 2);
  });
  it('buildLayoutPage: har katak — preset «slot:<rol>» bilan', () => {
    const p = buildLayoutPage('mr', 'mr-passport', 'A3L', { title: 'T', place: 'P', date: '2026', author: '' });
    expect(p.tpl).toBe('L:mr/mr-passport'); expect(p.paper).toBe('A3');
    expect(p.els.some(e => e.preset === 'slot:locator')).toBe(true);
  });
});

describe('Chizmadon — avto-joylashtirish', () => {
  it('rol mosligi: xarita katagi chegarani oladi, jadvalni olmaydi', () => {
    expect(accepts('map', 'locator')).toBe(true); expect(accepts('map', 'table')).toBe(false);
    expect(dropReject({ role: 'map' }, mats()[5])).toBe('Asosiy xarita');
    expect(dropReject({ role: 'map' }, mats()[2])).toBeNull();
  });
  it('tryFill: katta katakka davlat, kichik sxemaga — tuman (daraja > 0)', () => {
    const f = familyById('kz'), p = f.pages.find(x => x.id === 'kz-check-map2')!; // map 6×8 + map_small 2×4
    const r = tryFill(p, mats(), f);
    const mapK = p.slots.findIndex(s => s.role === 'map'), smK = p.slots.findIndex(s => s.role === 'map_small');
    expect(r.assign.get(mapK)?.id).toBe('loc0');
    expect(r.assign.get(smK)?.id).toBe('loc2');
    expect(r.score).toBeGreaterThan(0);
  });
  it('tryFill: boʻsh asosiy katak ball ayiradi', () => {
    const f = familyById('mr'), p = f.pages.find(x => x.id === 'mr-lots')!;
    const full = tryFill(p, mats(), f), half = tryFill(p, mats().filter(m => m.role !== 'table'), f);
    expect(half.empty.size).toBe(1); expect(half.score).toBeLessThan(full.score);
  });
  it('strukturaviy varaqlar sahifalashga kirmaydi', () => {
    const f = familyById('mr');
    expect(f.pages.filter(structural).map(p => p.id)).toEqual(['mr-cover', 'mr-toc', 'mr-chapter']);
    const PG = paginate(f, mats());
    expect(PG.pages.every(pk => !structural(pk.page))).toBe(true);
  });
  it('Master reja albomi: hamma material joylanadi, ≤ 4 varaq, sarlavha chrome da', () => {
    const PG = paginate(familyById('mr'), mats());
    expect(PG.left).toEqual([]);
    expect(PG.pages.length).toBeGreaterThan(0); expect(PG.pages.length).toBeLessThanOrEqual(4);
    expect(PG.titleEl?.id).toBe('title');
    const placed = Object.keys(placements(PG));
    expect(placed.sort()).toEqual(mats().filter(m => m.role !== 'title').map(m => m.id).sort());
    expect(PG.pages[0].alts!.length).toBeGreaterThan(1);
  });
  it('7 oilaning hammasi xatosiz sahifalanadi; plakatlar — bitta varaq', () => {
    for (const f of LAYOUTS.families) {
      const PG = paginate(f, mats());
      expect(PG.pages.length, f.id).toBeGreaterThan(0);
      if (f.chrome === 'poster') expect(PG.pages.length).toBe(1);
      // har material koʻpi bilan bir marta
      const ids = PG.pages.flatMap(pk => [...pk.assign.values()].map(e => e.id));
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
  it('maʼlum kamchilik: Konkurs plansheti — landshaft hammasini sigʻdira olmaydi (ogohlantirish)', () => {
    const PG = paginate(familyById('kl'), mats());
    expect(PG.left.length).toBeGreaterThan(0);
  });
  it('yashirin material joylanmaydi; boʻsh roʻyxat — varaq yoʻq', () => {
    const m = mats(); m.find(x => x.id === 'sun')!.visible = false;
    expect(placements(paginate(familyById('mr'), m)).sun).toBeUndefined();
    expect(paginate(familyById('mr'), m.map(x => ({ ...x, visible: false }))).pages).toEqual([]);
  });
  it('varaq turini majburlash', () => {
    const f = familyById('mr'), PG = paginate(f, mats(), { 0: 'mr-lots' });
    expect(PG.pages[0].page.id).toBe('mr-lots');
  });
  it('narx: varaq qoʻshilsa +60, joysiz asosiy material +500, kichik +45', () => {
    const a = cost({ seq: [], pool: [], score: 0 });
    expect(cost({ seq: [{} as never], pool: [], score: 0 }) - a).toBe(60);
    expect(cost({ seq: [], pool: [mats()[1]], score: 0 }) - a).toBe(500);
    expect(cost({ seq: [], pool: [mats()[4]], score: 0 }) - a).toBe(45);
  });
});

describe('Chizmadon — materialni katakka sudrash (applyOv)', () => {
  const big = (PG: ReturnType<typeof paginate>) => {
    for (let pi = 0; pi < PG.pages.length; pi++) { const s = PG.pages[pi].page.slots; const k = s.findIndex((q, kk) => q.role === 'map' || (q.role === 'locator' && cells(q) >= 20) || (q.role === 'figure' && kk >= 0)); if (k >= 0 && accepts(s[k].role, 'locator')) return { pi, k }; }
    return null;
  };
  it('viloyat chegarasini katta xarita katagiga — joy almashadi', () => {
    const m = mats(), PG = paginate(familyById('mr'), m), t = big(PG)!;
    expect(t).toBeTruthy();
    const before = PG.pages[t.pi].assign.get(t.k)!, from = placements(PG).loc1;
    const kept = applyOv(PG, [{ a: 'loc1', pi: t.pi, k: t.k }], m);
    expect(kept).toHaveLength(1);
    expect(PG.pages[t.pi].assign.get(t.k)!.id).toBe('loc1');
    if (before.id !== 'loc1') expect(PG.pages[from.pi].assign.get(from.k)!.id).toBe(before.id); // almashdi
    expect(new Set(Object.keys(placements(PG))).size).toBe(Object.keys(placements(PG)).length);
  });
  it('jadvalni xarita katagiga — mos emas, amal tashlanadi', () => {
    const m = mats(), PG = paginate(familyById('mr'), m), t = big(PG)!;
    const before = PG.pages[t.pi].assign.get(t.k)!.id;
    expect(applyOv(PG, [{ a: 'pass', pi: t.pi, k: t.k }], m)).toEqual([]);
    expect(PG.pages[t.pi].assign.get(t.k)!.id).toBe(before);
  });
  it('joysiz materialni katakka — joysizlar roʻyxatidan chiqadi, eskisi unga tushadi', () => {
    const m = mats(), f = familyById('kl'), PG = paginate(f, m);
    const lost = PG.left.find(e => e.role === 'locator' || e.role === 'chart');
    if (!lost) return;
    const pk = PG.pages[0], k = pk.page.slots.findIndex((s, kk) => pk.assign.has(kk) && accepts(s.role, lost.role));
    const old = pk.assign.get(k)!;
    applyOv(PG, [{ a: lost.id, pi: 0, k }], m);
    expect(pk.assign.get(k)!.id).toBe(lost.id);
    expect(PG.left.some(e => e.id === old.id)).toBe(true);
    expect(PG.left.some(e => e.id === lost.id)).toBe(false);
  });
});

import { TPL_MAP } from '../../src/chizmadon/migrate';
describe('Chizmadon — eski 24 namuna → 8 oila (koʻchirish jadvali)', () => {
  it('har eski namuna uchun mavjud oila va varaq turi, boʻshliq yoʻq', () => {
    expect(Object.keys(TPL_MAP)).toHaveLength(24);
    for (const [id, m] of Object.entries(TPL_MAP)) {
      const f = LAYOUTS.families.find(x => x.id === m.fam);
      expect(f, id).toBeTruthy(); expect(f!.pages.some(p => p.id === m.page), `${id} → ${m.page}`).toBe(true);
    }
    expect(Object.values(TPL_MAP).filter(m => m.q === 'boʻshliq')).toHaveLength(0);
  });
});

describe('29–30, 28-bandlar', () => {
  it('KZ (Qoʻmita) maketida «Xulosa matni» joysiz qolmaydi — tekshiruv katagiga tushadi', () => {
    const m = [...mats(), { id: 'p:plan:bosh', role: 'plan', name: 'Bosh reja', title: 'Bosh reja', visible: true, accent: null, scale: 1 }, { id: 'p:plan', role: 'plan', name: 'Zona', title: 'Zona', visible: true, accent: null, scale: 1 }] as Material[];
    const P = paginate(familyById('kz')!, m);
    expect(P.left.map(e => e.id)).not.toContain('izoh');
  });
});

describe('29-band (25.10): kvartirografiya — reja chapda, eksplikatsiya shu varaqning oʻng panelida', () => {
  it('juft jadval oʻz rejasi bilan bitta varaqqa tushadi', () => {
    const base = mats().filter(e => e.id !== 'izoh');
    const m = [...base,
      { id: 'p:plan:bosh', role: 'plan', name: 'Bosh reja', title: 'Bosh reja', visible: true, accent: null, scale: 1 },
      { id: 'p:apt:b1', role: 'plan', name: 'Kvartirografiya · 1-bino', title: 'K', visible: true, accent: null, scale: 1 },
      { id: 'p:aptx:b1', role: 'table', kind: 'expl', name: 'Xonadonlar eksplikatsiyasi · 1-bino', title: 'E', visible: true, accent: null, scale: 1, pair: 'p:apt:b1' },
    ] as Material[];
    for (const fid of ['mr', 'kz', 'tq', 'st']) {
      const fam = familyById(fid)!; expect(fam.id).toBe(fid);
      const P = paginate(fam, m);
      const pg = P.pages.find(p => [...p.assign.values()].some(e => e.id === 'p:aptx:b1'));
      expect(pg, fid).toBeTruthy();
      expect([...pg!.assign.values()].some(e => e.id === 'p:apt:b1'), fid).toBe(true);
    }
  });
});

describe('Chizmadon tahlili (25.10, 1-bosqich): kvartirografiya varagʻi — reja katta, sxema va eksplikatsiya alohida', () => {
  const m = () => [...mats().filter(e => e.id !== 'izoh'),
    { id: 'p:plan:bosh', role: 'plan', name: 'Bosh reja', title: 'Bosh reja', visible: true, accent: null, scale: 1 },
    { id: 'p:apt:b1', role: 'plan', name: 'Kvartirografiya · 1-bino', title: 'K', visible: true, accent: null, scale: 1 },
    { id: 'p:aptnav:b1', role: 'locator', kind: 'aptnav', level: 3, minor: true, name: 'Vaziyat sxemasi · 1-bino', title: 'V', visible: true, accent: null, scale: 1, pair: 'p:apt:b1' },
    { id: 'p:aptx:b1', role: 'table', kind: 'expl', name: 'Xonadonlar eksplikatsiyasi · 1-bino', title: 'E', visible: true, accent: null, scale: 1, pair: 'p:apt:b1' },
  ] as Material[];
  it('kz, mr, st: reja «Kvartirografiya» varagʻining katta katagida, sxema — kichik xaritada, jadval — oʻngda; bosh reja u yerga tushmaydi', () => {
    for (const fid of ['kz', 'mr', 'st']) {
      const P = paginate(familyById(fid)!, m());
      const pg = P.pages.find(p => p.page.id === `${fid}-apt`);
      expect(pg, fid).toBeTruthy();
      const at = (id: string) => pg!.page.slots[[...pg!.assign.entries()].find(([, e]) => e.id === id)?.[0] ?? -1]?.role;
      expect(at('p:apt:b1'), fid).toBe('map');
      expect(at('p:aptnav:b1'), fid).toBe('map_small');
      expect(at('p:aptx:b1'), fid).toBe('table');
      expect(P.pages.some(p => [...p.assign.values()].some(e => e.id === 'p:plan:bosh')), fid).toBe(true);
    }
  });
  it('sxema boshqa rejaning varagʻiga tushmaydi; joy topilmasa — kichik jarima (asosiy material emas)', () => {
    const P = paginate(familyById('tq')!, m());
    const pg = P.pages.find(p => [...p.assign.values()].some(e => e.id === 'p:aptnav:b1'));
    if (pg) expect([...pg.assign.values()].some(e => e.id === 'p:apt:b1')).toBe(true);
  });
});
