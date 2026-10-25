import { describe, it, expect } from 'vitest';
import { PolygonTool, RectTool, parseLen, parseWH } from '../../src/ui/tools';
import { area, type XY } from '../../src/core/geo';

const scene = { setPreview: () => {}, screenDist: () => 999 } as never;
const ev = { timeStamp: 0, clientX: 0, clientY: 0, detail: 1 } as PointerEvent;
const key = (t: { key(e: KeyboardEvent): boolean }, s: string) => { for (const k of s) t.key({ key: k } as KeyboardEvent); };
const enter = (t: { key(e: KeyboardEvent): boolean }) => t.key({ key: 'Enter' } as KeyboardEvent);

describe('Qoʻlda chizish — oʻlcham bilan (egasi, 25.10)', () => {
  it('yozuvni tahlil qilish', () => {
    expect(parseLen('32')).toEqual({ len: 32, ang: null });
    expect(parseLen('32,5<90')).toEqual({ len: 32.5, ang: 90 });
    expect(parseLen('abc')).toBeNull(); expect(parseLen('0')).toBeNull();
    expect(parseWH('32x18')).toEqual([32, 18]); expect(parseWH('32*18,5')).toEqual([32, 18.5]); expect(parseWH('32')).toBeNull();
  });
  it('erkin shakl: klaviaturadan 40<0, 30<90, 40<180 va Enter — 40 × 30 m', () => {
    let got: XY[] | null = null;
    const t = new PolygonTool(scene, r => { got = r; }, () => {});
    t.click([100, 200], ev);
    key(t, '40<0'); enter(t); key(t, '30<90'); enter(t); key(t, '40<180'); enter(t);
    enter(t);
    expect(got).not.toBeNull(); expect(area(got!)).toBeCloseTo(1200, 3);
    expect(got!.map(p => p.map(v => Math.round(v)))).toContainEqual([140, 230]);
  });
  it('erkin shakl: burchaksiz — kursor yoʻnalishida; panel (addSide); nuqtasiz — xato', () => {
    const errs: string[] = []; let got: XY[] | null = null;
    const t = new PolygonTool(scene, r => { got = r; }, m => errs.push(m));
    expect(t.addSide(10)).toBe(false); expect(errs[0]).toMatch(/birinchi nuqta/);
    t.click([0, 0], ev); t.move([0, 5]);           // kursor shimolda
    expect(t.addSide(20)).toBe(true);               // → (0, 20)
    t.move([10, 20]); t.addSide(25);                // → (25, 20)
    t.move([25, 0]); t.addSide(20);                 // → (25, 0)
    enter(t);
    expect(area(got!)).toBeCloseTo(500, 3);
    // Backspace yozuvni oʻchiradi, nuqtani emas
    const t2 = new PolygonTool(scene, () => {}, () => {}); t2.click([0, 0], ev); key(t2, '12'); t2.key({ key: 'Backspace' } as KeyboardEvent);
    expect(t2.buf).toBe('1'); expect(t2.started).toBe(true);
  });
  it('toʻrtburchak: birinchi burchak, «32x18» Enter — kursor tomonga', () => {
    let got: XY[] | null = null;
    const t = new RectTool(scene, r => { got = r; }, () => {});
    t.click([50, 50]); t.move([40, 60]);            // kursor gʻarbi-shimolda
    key(t, '32x18'); enter(t);
    expect(area(got!)).toBeCloseTo(576, 3);
    const xs = got!.map(p => p[0]), ys = got!.map(p => p[1]);
    expect(Math.min(...xs)).toBeCloseTo(18); expect(Math.max(...ys)).toBeCloseTo(68);
  });
});
