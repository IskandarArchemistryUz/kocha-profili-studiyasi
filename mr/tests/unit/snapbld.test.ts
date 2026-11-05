import { describe, it, expect } from 'vitest';
import { snapMove, snapPush, edgeSize, pushForSize, ringGap, type XY } from '../../src/core/snapbld';
import { pushEdge } from '../../src/core/tiers';

const rect = (x: number, y: number, w: number, h: number): XY[] => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
const mv = (r: XY[], dx: number, dy: number): XY[] => r.map(p => [p[0] + dx, p[1] + dy]);

describe('05.11: binoni sudrashda yopishish (snapbld)', () => {
  it('roʻpara devor 1 m ichida — umumiy devor, burchak tekislanadi', () => {
    const a = rect(0, 0, 30, 15), b = rect(31.2, 0.8, 30, 15);   // 1,2 m oraliq, 0,8 m pastga siljigan
    const s = snapMove(b, [a]);
    expect(s.kind).toBe('qirra');
    const r = mv(b, s.dx, s.dy);
    expect(r[0][0]).toBeCloseTo(30, 6); expect(r[0][1]).toBeCloseTo(0, 6);
    expect(ringGap(r, a)).toBeCloseTo(0, 6);
  });
  it('uzoqda (tol dan katta) — yopishmaydi', () => {
    const s = snapMove(rect(34, 3, 30, 15), [rect(0, 0, 30, 15)]);
    expect(s.kind).toBeNull(); expect(s.dx).toBe(0);
  });
  it('fasad chizigʻi bir tekis: yonma-yon binolar old devori', () => {
    const a = rect(0, 0, 30, 15), b = rect(40, 0.9, 30, 15);
    const s = snapMove(b, [a]);
    expect(s.dy).toBeCloseTo(-0.9, 6);
  });
  it('devor surish: qoʻshni parallel devor tekisligiga yopishadi', () => {
    const a = rect(0, 0, 30, 15), b = rect(40, 0, 30, 15);
    // a ning sharqiy devori (1-qirra) 9 m ga — qoʻshnigacha 10 m
    expect(snapPush(a, 1, 9, [b]).d).toBeCloseTo(10, 6);
    expect(snapPush(a, 1, 5, [b]).d).toBe(5);
  });
  it('aniq oʻlcham: devor normali boʻyicha oʻlcham va surish masofasi', () => {
    const a = rect(0, 0, 30, 15);
    expect(edgeSize(a, 1)).toBeCloseTo(30, 6);
    expect(edgeSize(a, 2)).toBeCloseTo(15, 6);
    const d = pushForSize(a, 1, 18), r = pushEdge(a, 1, d)!;
    expect(edgeSize(r, 1)).toBeCloseTo(18, 6);
    // soat yoʻnalishida berilgan halqa ham
    const cw = [...a].reverse();
    const r2 = pushEdge(cw, 0, pushForSize(cw, 0, 20))!;
    expect(edgeSize(r2, 0)).toBeCloseTo(20, 6);
  });
});
