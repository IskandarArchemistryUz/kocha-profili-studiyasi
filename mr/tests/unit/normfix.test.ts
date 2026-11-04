import { describe, it, expect } from 'vitest';
import { blankProject } from '../../src/core/doc';
import { apply } from '../../src/core/commands';
import { frame, type XY } from '../../src/core/geo';
import { repairGen, failingSpacing } from '../../src/core/normfix';
import { firePairs } from '../../src/core/firedist';

/**
 * 04.11 (Murad Buildings sinovi, 1-band): generator chiqargan variantda meʼyor buzilmasin — generatsiyadan keyin qoidalar
 * ishga tushadi va avtomatik binolar tuzatiladi; qoʻlda chizilgan binolarga tegilmaydi (hal boʻlmagani «left» da).
 */
function doc2(dy: number, floors: number, gen: boolean) {
  let d = blankProject('t'); d = { ...d, settings: { ...d.settings, seismic: 8 } }; const fr = frame(d.origin);
  const rect = (y: number): XY[] => [[0, y], [60, y], [60, y + 15], [0, y + 15]];
  const ring = (r: XY[]) => r.map(fr.toGeo);
  if (gen) d = apply(d, { type: 'replaceGroup', grp: 'g1', sections: [{ footprint: ring(rect(0)), floors, nonRes: 0, use: 'turar', kind: 'oddiy' }, { footprint: ring(rect(15 + dy)), floors, nonRes: 0, use: 'turar', kind: 'oddiy' }] } as any);
  else for (const y of [0, 15 + dy]) d = apply(d, { type: 'addBuilding', footprint: ring(rect(y)), floors, nonRes: 0 } as any);
  return d;
}

describe('generatsiyadan keyin meʼyorga moslash (core/normfix)', () => {
  it('uzun tarzlar orasi 2·Hmax dan kam — balandrogʻi pasaytiriladi, «mos emas» qolmaydi', () => {
    const d = doc2(40, 16, true);
    expect(failingSpacing(d).length).toBeGreaterThan(0);
    const r = repairGen(d);
    expect(failingSpacing(r.doc)).toEqual([]);
    expect(r.lowered + r.removed).toBeGreaterThan(0);
    expect(r.doc.buildings.length).toBeGreaterThan(0);
    // qavat pasaytirilgan bino «qoʻlda tahrirlangan» deb belgilanmaydi (qayta generatsiyada soʻralmasin)
    expect(r.doc.buildings.every(b => !b.gen?.edited)).toBe(true);
  });
  it('6 m dan yaqin (yongʻin masofasi, 56-jadval) — kichigi olib tashlanadi', () => {
    const d = doc2(3, 9, true);
    const r = repairGen(d);
    expect(firePairs(r.doc).pairs).toEqual([]);
    expect(failingSpacing(r.doc)).toEqual([]);
    expect(r.removed).toBeGreaterThan(0);
  });
  it('qoʻlda chizilgan binolarga tegilmaydi — sabab izohda', () => {
    const d = doc2(40, 16, false);
    const r = repairGen(d);
    expect(r.lowered + r.removed).toBe(0);
    expect(r.left).toContain('spacing-79');
    expect(r.notes.join(' ')).toContain('Avtomatik tuzatilmadi');
  });
});
