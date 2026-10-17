import { describe, it, expect } from 'vitest';
import { corridorOutlines } from '../../src/core/plan';
import { trimAtRoads, projectStreetsGeo, asTargets, curbFillets } from '../../src/scene/streets3d';
import type { XY } from '../../src/core/geo';

const segX = (r: XY[][], x0: number, x1: number) => r.flat().filter(p => Math.abs(p[0] - x0) < 1e-6 || Math.abs(p[0] - x1) < 1e-6);
describe('koʻchalar ulanishi', () => {
  it('T-ulanish: qizil chiziqlar kesishmaydi — bitta kontur, oʻtuvchi koʻcha chizigʻi kirish joyida uzilgan', () => {
    const out = corridorOutlines([{ axis: [[-100, 0], [100, 0]], half: 7.5 }, { axis: [[0, 0], [0, 80]], half: 5 }]);
    expect(out.length).toBe(1);
    const r = out[0];
    // y = 7,5 chizigʻida x ∈ (−5, 5) oraligʻida nuqta yoʻq (kirish ochiq), lekin x = ±5 da burchak bor
    const top = r.filter(p => Math.abs(p[1] - 7.5) < 1e-6).map(p => p[0]).sort((a, b) => a - b);
    expect(top.some(x => Math.abs(x - 5) < 1e-6)).toBe(true); expect(top.some(x => Math.abs(x + 5) < 1e-6)).toBe(true);
    expect(top.some(x => x > -4.9 && x < 4.9)).toBe(false);
    // kirgan koʻcha chizigʻi koridor ichida davom etmaydi: (0, 3) nuqtasi kontur nuqtasi emas
    expect(r.some(p => Math.abs(p[0]) < 1e-6 && p[1] < 7)).toBe(false);
  });
  it('X-kesishma: toʻrtta burchak, chiziqlar oʻzaro kesib oʻtmaydi', () => {
    const out = corridorOutlines([{ axis: [[-50, 0], [50, 0]], half: 5 }, { axis: [[0, -50], [0, 50]], half: 5 }]);
    expect(out.length).toBe(1);
    const corners = out[0].filter(p => Math.abs(Math.abs(p[0]) - 5) < 1e-6 && Math.abs(Math.abs(p[1]) - 5) < 1e-6);
    expect(corners.length).toBe(4);
  });
  it('OSM yoʻlga ulangan uch: trotuar/daraxt qismi yoʻlning tashqi chetida, qatnov qismi asfaltga kiradi', () => {
    const osm = [{ pts: [[-200, 0], [200, 0]] as XY[], cls: 'secondary', w: 13 }];
    const t = trimAtRoads([[0, 80], [0, 0]], asTargets(osm));   // uch — OSM oʻqida
    expect(t.body[1][1]).toBeCloseTo(6.5 + 4, 1);     // w/2 + trotuar (secondary: 4 m)
    expect(t.road[1][1]).toBeCloseTo(6.5 - 0.3, 1);   // asfaltga 0,3 m
    expect(t.body[0]).toEqual([0, 80]);                // ulanmagan uch oʻzgarmaydi
    // daraxtlar OSM yoʻl ichida yoʻq
    const g = projectStreetsGeo([{ id: 's', axis: [[0, 80], [0, 0]], parts: [{ k: 'trotuar', w: 2 }, { k: 'yashil', w: 2 }, { k: 'qatnov', w: 6, lanes: 2 }, { k: 'yashil', w: 2 }, { k: 'trotuar', w: 2 }] as never }], () => 0, osm);
    expect(g.trees.every(p => p[1] > 10.5)).toBe(true);
    void segX;
  });
  it('bordyur kesigi: ikki burchak yoyi, yoʻl asfalti cheti va kiruvchi asfalt cheti orasida', () => {
    // kiruvchi koʻcha y oʻqi boʻylab pastga (0,80)→(0,0); asfalt ±3; yoʻl y=0, w=13 → cheti y=6,5
    const f = curbFillets([0, 0], [0, 80], -3, 3, { pts: [[-200, 0], [200, 0]], w: 13, sw: 4 });
    expect(f.length).toBe(2);
    for (const poly of f) {
      expect(poly[0][1]).toBeCloseTo(6.5, 3);                          // burchak yoʻl chetida
      expect(Math.abs(poly[0][0])).toBeCloseTo(3, 3);                  // va kiruvchi asfalt chetida
      expect(poly.every(p => p[1] >= 6.5 - 1e-6 && Math.abs(p[0]) >= 3 - 1e-6)).toBe(true);   // yoy tashqi burchakda (trotuar tomonida)
      expect(Math.max(...poly.map(p => Math.abs(p[0])))).toBeCloseTo(9, 1);                   // R = 6 → tangent 6 m
    }
  });
  it('OSM yoʻlga ulanmagan uch — qisqarmaydi', () => {
    const t = trimAtRoads([[0, 80], [0, 30]], asTargets([{ pts: [[-200, 0], [200, 0]] as XY[], cls: 'residential', w: 7 }]));
    expect(t.body).toEqual([[0, 80], [0, 30]]);
  });
});

describe('qizil chiziq OSM yoʻl zonasini kesib oʻtmaydi', () => {
  it('yoʻldan oʻtib ketgan uch — kontur yoʻl chetida (w/2 + trotuar) tugaydi', () => {
    // koʻcha (0,80)→(0,−4): uchi OSM oʻqidan (y=0) 4 m oʻtgan; OSM secondary w=13, trotuar 4 → zona ±10,5
    const out = corridorOutlines([{ axis: [[0, 80], [0, -4]], half: 5 }], [{ axis: [[-200, 0], [200, 0]], half: 10.5 }]);
    expect(out.length).toBe(1);
    const minY = Math.min(...out[0].map(p => p[1]));
    expect(minY).toBeCloseTo(10.5, 3);
  });
  it('yoʻlni kesib oʻtuvchi koʻcha — ikki boʻlak, yoʻl zonasida kontur yoʻq', () => {
    const out = corridorOutlines([{ axis: [[0, 80], [0, -80]], half: 5 }], [{ axis: [[-200, 0], [200, 0]], half: 10.5 }]);
    expect(out.length).toBe(2);
    expect(out.every(r => r.every(p => Math.abs(p[1]) >= 10.5 - 1e-6))).toBe(true);
  });
});

import { splitOutside } from '../../src/scene/streets3d';
describe('yoʻlni kesib oʻtuvchi koʻcha — trotuar yoʻl zonasida yoʻq', () => {
  it('ikki boʻlak, zona (±10,5) ichida nuqta yoʻq', () => {
    const parts = splitOutside([[0, 80], [0, -80]], [{ pts: [[-200, 0], [200, 0]], w: 13, sw: 4 }]);
    expect(parts.length).toBe(2);
    expect(parts.every(p => p.every(q => Math.abs(q[1]) >= 10.4))).toBe(true);
    expect(parts[0][0]).toEqual([0, 80]); expect(parts[1][parts[1].length - 1]).toEqual([0, -80]);
  });
  it('yoʻlga tegmasa — oʻzgarmaydi', () => {
    expect(splitOutside([[0, 80], [0, 30]], [{ pts: [[-200, 0], [200, 0]], w: 13, sw: 4 }])).toEqual([[[0, 80], [0, 30]]]);
  });
});
