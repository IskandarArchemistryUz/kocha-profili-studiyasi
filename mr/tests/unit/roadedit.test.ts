import { describe, it, expect } from 'vitest';
import { vtxOp, applyRoadEdits } from '../../src/core/roadedit';
import { apply } from '../../src/core/commands';
import { migrate, blankProject } from '../../src/core/doc';
import type { LngLat } from '../../src/core/doc';

const P = [[0, 0], [1, 0], [2, 0], [3, 0]] as LngLat[];
describe('Nuqta boʻyicha yoʻl tahriri (31.10)', () => {
  it('vtxOp: oʻchirish, qisqartirish, boʻlish, kesma', () => {
    expect(vtxOp(P, 1, 'del')).toEqual([[[0, 0], [2, 0], [3, 0]]]);
    expect(vtxOp(P.slice(0, 2), 0, 'del')).toBeNull();
    expect(vtxOp(P, 2, 'cutHead')).toEqual([[[2, 0], [3, 0]]]);
    expect(vtxOp(P, 0, 'cutHead')).toBeNull();
    expect(vtxOp(P, 1, 'cutTail')).toEqual([[[0, 0], [1, 0]]]);
    expect(vtxOp(P, 3, 'cutTail')).toBeNull();
    expect(vtxOp(P, 1, 'split')).toEqual([[[0, 0], [1, 0]], [[1, 0], [2, 0], [3, 0]]]);
    expect(vtxOp(P, 1, 'dropSeg')).toEqual([[[0, 0], [1, 0]], [[2, 0], [3, 0]]]);
    expect(vtxOp(P, 0, 'dropSeg')).toEqual([[[1, 0], [2, 0], [3, 0]]]);   // bitta nuqtali boʻlak tashlanadi
  });
  it('applyRoadEdits: tahrirlangan yoʻl boʻlaklarga almashadi; buyruq va migratsiya', () => {
    const roads = [{ id: 5, pts: P, w: 6 }, { id: 6, pts: P, w: 6 }];
    const out = applyRoadEdits(roads, [{ id: 5, parts: [P.slice(0, 2), P.slice(2)] }]);
    expect(out.map(r => [r.id, r.part, r.pts.length])).toEqual([[5, 0, 2], [5, 1, 2], [6, undefined, 4]]);
    let d = blankProject('t');
    d = apply(d, { type: 'setRoadEdit', id: 5, parts: [P.slice(1)] });
    expect(d.roadEdits).toEqual([{ id: 5, parts: [P.slice(1)] }]);
    expect(migrate(JSON.parse(JSON.stringify(d))).roadEdits).toEqual(d.roadEdits);
    d = apply(d, { type: 'setRoadEdit', id: 5, parts: null });
    expect(d.roadEdits).toBeUndefined();
  });
});
