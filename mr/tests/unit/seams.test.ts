import { describe, it, expect } from 'vitest';
import { seams, seamEdges } from '../../src/core/seams';
import type { XY } from '../../src/core/geo';
const rect = (x0: number, y0: number, x1: number, y1: number): XY[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
const len = (s: [number, number, number][]) => { let t = 0; for (let i = 0; i < s.length; i += 2) t += Math.hypot(s[i + 1][0] - s[i][0], s[i + 1][1] - s[i][1], s[i + 1][2] - s[i][2]); return t; };

describe('Seksiya choklari', () => {
  it('bir xil balandlik: umumiy devor va tom choki chizilmaydi', () => {
    const A = { ring: rect(0, 0, 30, 15), base: 0, top: 36 }, B = { ring: rect(30, 0, 60, 15), base: 0, top: 36 };
    const [sa] = seams([A, B]);
    expect(sa.edgeTop[1]).toBe(36);                          // sharqiy qirra (30,0)-(30,15) B ga tegadi
    const e = seamEdges(A, sa);
    // tepada: 3 ta qirra (30+15+30), pastda 3 ta, vertikal: 2 ta tashqi burchak (36+36); umumiy burchaklarda yoʻq
    expect(len(e)).toBeCloseTo(2 * 75 + 72, 3);
  });
  it('past qoʻshni: farq qismi chiziladi', () => {
    const A = { ring: rect(0, 0, 30, 15), base: 0, top: 36 }, B = { ring: rect(30, 0, 60, 15), base: 0, top: 15 };
    const [sa, sb] = seams([A, B]);
    const ea = seamEdges(A, sa), eb = seamEdges(B, sb);
    expect(ea.some(p => p[0] === 30 && p[2] === 15)).toBe(true);   // A ning burchagida 15 m dan yuqorisi
    expect(len(eb)).toBeCloseTo(2 * 75 + 2 * 15, 3);                // B: umumiy devor chizilmaydi, tepasi A ga tegadi
  });
  it('stilobat ustidagi minora qoʻshni hisoblanmaydi', () => {
    const P = { ring: rect(0, 0, 60, 40), base: 0, top: 7 }, T = { ring: rect(10, 10, 30, 30), base: 7, top: 50 };
    const [sp, st] = seams([P, T]);
    expect(sp.edgeTop.every(v => v === -Infinity)).toBe(true); expect(st.edgeTop.every(v => v === -Infinity)).toBe(true);
  });
});
