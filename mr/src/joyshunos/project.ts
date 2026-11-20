/**
 * 20.11 (egasi, Qamashi albomi): Joyshunos Master reja loyihasi ichida ochilganda tahlillar faqat mavjud (OSM) binolar bilan
 * hisoblanardi — loyiha binolari shamol, quyosh, koʻrinish, shovqin va odamlar oqimiga kirmasdi. Endi «Loyiha binolari» rejimi:
 * uchastka ichidagi OSM binolari olib tashlanadi, oʻrniga loyiha binolari (balandligi — qavatlar × qavat balandligi) qoʻyiladi.
 * Rejim loyiha ichida (?p=) va loyihada bino boʻlsa sukut boʻyicha yoqilgan; tanlov loyihaga ajratilgan holda saqlanadi.
 */
import type { LngLat } from '../core/doc';
import type { ContextBundle } from '../context/load';
import type { CtxBuilding } from '../context/osm';
import { bLevels } from '../core/levels';

export interface ProjBuildings { id: string; name: string; site: LngLat[] | null; blds: CtxBuilding[] }

/** nuqta koʻpburchak ichidami (geografik koordinatada, kichik hudud uchun yetarli) */
export function inRing(p: LngLat, r: LngLat[]): boolean {
  let ins = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const [xi, yi] = r[i], [xj, yj] = r[j];
    if ((yi > p[1]) !== (yj > p[1]) && p[0] < (xj - xi) * (p[1] - yi) / (yj - yi) + xi) ins = !ins;
  }
  return ins;
}
const centroid = (r: LngLat[]): LngLat => [r.reduce((a, q) => a + q[0], 0) / r.length, r.reduce((a, q) => a + q[1], 0) / r.length];

/** Loyiha hujjatidan tahlil binolari */
export function projBuildings(d: { id: string; name: string; site?: { rings: LngLat[][] } | null; settings: Parameters<typeof bLevels>[0]; buildings: { footprint: LngLat[]; floors: number; nonRes: number; z0?: number; use: string }[] }): ProjBuildings {
  const blds: CtxBuilding[] = d.buildings.filter(b => b.footprint.length >= 3).map((b, i) => ({
    id: -(i + 1), rings: [b.footprint], h: Math.max(3, bLevels(d.settings, b).top), hSrc: 'loyiha', kind: b.use,
  }));
  return { id: d.id, name: d.name, site: d.site?.rings[0] ?? null, blds };
}

/** Kontekst toʻplamiga loyiha binolarini qoʻyish: uchastka ichidagi (markazi ichida) OSM binolari olib tashlanadi */
export function withProject(b: ContextBundle, P: ProjBuildings | null): ContextBundle {
  if (!P || !P.blds.length) return b;
  const site = P.site;
  const keep = site ? b.osm.buildings.filter(x => { const r = x.rings[0]; return !r || r.length < 3 || !inRing(centroid(r), site); }) : b.osm.buildings;
  return { ...b, osm: { ...b.osm, buildings: [...keep, ...P.blds] } };
}
