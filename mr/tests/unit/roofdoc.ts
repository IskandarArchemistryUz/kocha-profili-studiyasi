import { blankProject, migrate } from '../../src/core/doc';
import { apply } from '../../src/core/commands';
import { frame } from '../../src/core/geo';
export function styleTestDoc() {
  let p = blankProject('t'); const fr = frame(p.origin);
  const sq = (x: number) => [[x, 0], [x + 10, 0], [x + 10, 10], [x, 10]].map(q => fr.toGeo(q as [number, number]));
  p = { ...p, buildings: ['a', 'b', 'c'].map((id, i) => ({ id, footprint: sq(i * 20), floors: 5, nonRes: 0, use: 'turar' as const })) };
  let after = apply(p, { type: 'styleBuildings', ids: ['a', 'b'], roof: 'quyosh' });
  after = apply(after, { type: 'styleBuildings', ids: ['a'], mat: 'gisht' });
  return { after, migrated: migrate(JSON.parse(JSON.stringify(after))) };
}
