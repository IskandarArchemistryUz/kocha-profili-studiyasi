import { describe, it, expect } from 'vitest';
import { decide, balance, feeCoef, speciesLaw, minDist, VALUABLE, REG, UZ_ALIAS } from '../../src/core/treelaw';
import { loadRegistry, inRegistry } from '../../src/core/trees';
import { blankProject, migrate } from '../../src/core/doc';
import { frame } from '../../src/core/geo';
import { apply } from '../../src/core/commands';
import { sheetSvg, SHEET_DEFAULT, treeSum, treeRows } from '../../src/core/sheet';

const T = (name: string, dbh: number, conflict: 'dog' | 'masofa' | null = 'dog', extra = {}) => decide({ name, dbh, conflict, ...extra });

describe('Daraxtlar huquqi — VMQ-86 15-ilova toʻlov jadvali', () => {
  it('chegaralar va 64 sm dan keyin +0,5 / sm', () => {
    expect(feeCoef(4, false)).toBe(0.2); expect(feeCoef(4.1, true)).toBe(0.6);
    expect(feeCoef(64, false)).toBe(10.5); expect(feeCoef(66, true)).toBe(15.5);
  });
});

describe('Turlar — VMQ-93 roʻyxati (VMQ-342 tahririda) va kam qimmatli roʻyxat', () => {
  it('130 band; Qizil kitob — 97–102', () => {
    expect(VALUABLE.length).toBe(130);
    expect(VALUABLE.filter(v => v.cat === 'III').map(v => v.n)).toEqual([97, 98, 99, 100, 101, 102]);
  });
  it('reyestr nomlari: ruscha va oʻzbekcha (tutuq belgisi farqi bilan)', () => {
    expect(speciesLaw('Платан восточный').cls).toBe('qizil_kitob');
    expect(speciesLaw('Sharq chinori').cls).toBe('qizil_kitob');
    expect(speciesLaw('Eldor qaragʹay').item?.n).toBe(51);   // reyestrda U+02B9
    expect(speciesLaw('Yuksak aylant').cls).toBe('kam_qimmatli');
    expect(speciesLaw('Sovun daraxti').cls).toBe('ziddiyat');
    expect(speciesLaw('Gilos').cls).toBe('nomalum');
    expect(speciesLaw('Ель').cls).toBe('nomalum');
    expect(speciesLaw('Туя западная Колумна').cls).toBe('qimmatbaho');
  });
  it('har UZ_ALIAS REG kalitiga olib boradi', () => {
    expect(Object.values(UZ_ALIAS).filter(ru => !(ru in REG))).toEqual([]);
  });
});

describe('Qaror', () => {
  it('Qizil kitob — har qanday diametrda loyiha oʻzgaradi', () => {
    expect(T('Sharq chinori', 10).decision).toBe('loyiha_ozgaradi');
  });
  it('qimmatbaho: ≤ 15 sm koʻchiriladi (3 yil), katta — loyiha oʻzgaradi yoki Prezident hujjati', () => {
    const a = T('Eldor qaragʻay', 12); expect([a.decision, a.feeBhm, a.careYears]).toEqual(['kochiriladi', 1.0, 3]);
    expect(T('Eldor qaragʻay', 30).decision).toBe('loyiha_ozgaradi');
    expect(T('Eldor qaragʻay', 30, 'dog', { stateProject: true }).decision).toBe('prezident_hujjati');
  });
  it('kam qimmatli: katta — kesiladi + toʻlov + 10 koʻchat; kichik — koʻchiriladi', () => {
    const a = T('Yuksak aylant', 30); expect([a.decision, a.feeBhm, a.compSaplings]).toEqual(['kesiladi', 2.3, 10]);
    expect(T('Yuksak aylant', 14).decision).toBe('kochiriladi');
  });
  it('nomaʼlum tur va diametrsiz — REVIEW; toʻqnashuvsiz — saqlanadi', () => {
    expect(T('Gilos', 30).tag).toBe('REVIEW'); expect(T('Yuksak aylant', 0).decision).toBe('review');
    expect(T('Grek yongʻogʻi', 40, null).decision).toBe('saqlanadi');
  });
  it('35-jadval 1-izoh: toj > 5 m — masofa oshiriladi (T)', () => {
    expect(minDist('bino', 4)).toEqual({ m: 5, tag: 'N' }); expect(minDist('bino', 9)).toEqual({ m: 7, tag: 'T' });
  });
  it('balans: soʻmda BHM 440 000 bilan', () => {
    const b = balance([T('Yuksak aylant', 30), T('Yuksak aylant', 50), T('Sharq chinori', 60)]);
    expect([b.by.kesiladi, b.by.loyiha_ozgaradi, b.compSaplings, b.feeBhm, b.feeSom]).toEqual([2, 1, 20, 9.5, 4_180_000]);
  });
});

describe('Toshkent reyestri — yuklash', () => {
  it('bbox boʻlaklari, takror nuqta va uchastkadan tashqarisi olinmaydi', async () => {
    const calls: string[] = [];
    const f = (async (u: string) => { calls.push(u); return { ok: true, json: async () => ({ trees: [[69.24, 41.31, 'Sharq chinori', 45, 9, 18, 1], [69.24, 41.31, 'Sharq chinori', 45, 9, 18, 1], [69.30, 41.31, 'Yuksak aylant', 20, 4, 8, 0]] }) }; }) as unknown as typeof fetch;
    const r = await loadRegistry([69.23, 41.30, 69.25, 41.32], 'https://api', f, ll => ll[0] < 69.26);
    expect(calls.length).toBe(4);
    expect(r).toEqual([{ at: [69.24, 41.31], src: 'reyestr', sp: 'Sharq chinori', d: 45, c: 9, h: 18, st: 'tasdiqlangan' }]);
    expect(inRegistry([69.24, 41.31])).toBe(true); expect(inRegistry([66.0, 38.9])).toBe(false);
  });
});

describe('«Daraxtlar xaritasi» varagʻi — huquqiy balans', () => {
  it('bino ostidagi chinor saqlanadi (moratoriy), aylant kesiladi, yosh qaragʻay koʻchiriladi', () => {
    let d = blankProject(); const fr = frame(d.origin), g = (x: number, y: number) => fr.toGeo([x, y]);
    d = { ...d, site: { rings: [[g(-50, -50), g(50, -50), g(50, 50), g(-50, 50)]] }, buildings: [{ id: 'b1', footprint: [g(0, 0), g(30, 0), g(30, 10), g(0, 10)], floors: 5, nonRes: 0, use: 'turar' } as any] };
    d = apply(d, { type: 'setTreeInv', trees: [
      { at: g(5, 5), sp: 'Sharq chinori', d: 60, c: 12, src: 'reyestr' }, { at: g(15, 5), sp: 'Yuksak aylant', d: 30, src: 'reyestr' },
      { at: g(25, 5), sp: 'Eldor qaragʻay', d: 10, src: 'reyestr' }, { at: g(5, 30) }] });
    const m = migrate(JSON.parse(JSON.stringify(d)));
    expect(m.treeInv?.[0]).toMatchObject({ c: 12, src: 'reyestr' });
    const t = treeSum(d, null, d.buildings.map(b => b.footprint.map(p => fr.toLocal(p) as [number, number])), d.site!.rings[0].map(p => fr.toLocal(p) as [number, number]), []);
    expect([t.cut.length, t.hold.length, t.move.length, t.reg]).toEqual([3, 1, 1, 3]);
    expect(t.lawBal?.compSaplings).toBe(10);
    const rows = treeRows(t).map(r => r.t);
    expect(rows).toContain('— loyiha oʻzgaradi: qimmatbaho tur, kesish taqiqlangan');
    const r = sheetSvg(d, null, { ...SHEET_DEFAULT, kind: 'daraxt' }, new Date(2026, 10, 23));
    expect(r.svg).toContain('id="Mavjud_moratoriy"'); expect(r.svg).toContain('id="Mavjud_kochiriladi"');
    expect(r.svg).toContain('Ruxsatnoma toʻlovi');
  });
});

describe('Bogʻshunos — huquqiy qaror (planting)', async () => {
  const { lawDecision, lawBalOf } = await import('../../src/bogshunos/planting');
  const { mustKeep } = await import('../../src/core/treelaw');
  it('qimmatbaho — yoʻl suriladi; ≤ 15 sm — koʻchiriladi; kam qimmatli — kesiladi; diametrsiz — saqlanadi', () => {
    expect(lawDecision(T('Sharq chinori', 80))).toBe('yol_suriladi');
    expect(lawDecision(T('Grek yongʻogʻi', 12))).toBe('kochiriladi');
    expect(lawDecision(T('Yuksak aylant', 30))).toBe('kesiladi');
    expect(lawDecision(T('Yuksak aylant', 0))).toBe('yol_suriladi');
  });
  it('invaziv Ailanthus: kichigi ham kesiladi (preferCut), toʻlov va 10 koʻchat bilan', () => {
    const r = decide({ name: 'Yuksak aylant', dbh: 10, conflict: 'dog', preferCut: true });
    expect([r.decision, r.feeBhm, r.compSaplings]).toEqual(['kesiladi', 0.4, 10]);
  });
  it('mustKeep va balans (null — saqlanadi)', () => {
    expect(mustKeep('Sharq chinori', 50)).toBe(true); expect(mustKeep('Yuksak aylant', 50)).toBe(false); expect(mustKeep('Eldor qaragʻay', 10)).toBe(false);
    expect(lawBalOf([null, null])).toBeNull();
    expect(lawBalOf([null, T('Yuksak aylant', 30)])?.compSaplings).toBe(10);
  });
});
