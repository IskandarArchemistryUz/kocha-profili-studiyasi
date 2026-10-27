import { describe, it, expect } from 'vitest';
import { apply } from '../../src/core/commands';
import { blankProject, type Project } from '../../src/core/doc';

describe('koʻchani oʻchirish', () => {
  it('OSM dan olingan koʻcha oʻchirilsa — asl yoʻl ham qaytib chiqmaydi (removedRoads)', () => {
    let d = { ...blankProject('t'), streets: [{ id: 's1', axis: [[69.28, 41.31], [69.281, 41.31]] as [number, number][], profile: 'turar-20', osm: 555 }, { id: 's2', axis: [[69.28, 41.311], [69.281, 41.311]] as [number, number][], profile: 'turar-20' }] } as Project;
    d = apply(d, { type: 'removeStreet', id: 's1' });
    expect(d.removedRoads).toEqual([555]);
    d = apply(d, { type: 'removeStreet', id: 's2' });
    expect(d.removedRoads).toEqual([555]);
  });
});
