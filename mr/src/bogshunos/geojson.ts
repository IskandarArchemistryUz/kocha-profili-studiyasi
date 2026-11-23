/**
 * Bogʻshunos — natijalarni xarita (MapLibre) uchun GeoJSON ga: mahalliy metr → WGS84 (core/geo frame).
 * Cheklovlar va nishab — toʻr niqobidan kontur (grid.contour) orqali poligonlar.
 */
import { frame } from '../core/geo';
import type { LngLat } from '../core/doc';
import type { BgSite, Ring, Variant, XY } from './types';
import type { Ctx } from './analyze';
import { contour } from './grid';
import { furnById, FCATS } from './library';
import { speciesLaw } from '../core/treelaw';
/** 23.11: kesishga moratoriy ostidagi toifalar (qimmatbaho, Qizil kitob, ziddiyatli) — xaritada toʻq yashil */
const QCLS = new Set(['qizil_kitob', 'qimmatbaho', 'ziddiyat']);

type FC = { type: 'FeatureCollection'; features: unknown[] };
const fc = (features: unknown[]): FC => ({ type: 'FeatureCollection', features });

export function toGeo(site: BgSite) {
  const F = frame(site.origin), g = (p: XY): LngLat => { const q = F.toGeo(p); return [+q[0].toFixed(7), +q[1].toFixed(7)]; };
  const ring = (r: Ring) => { const c = r.map(g); c.push(c[0]); return c; };
  /** Bitta niqob qiymati boʻyicha poligonlar (har halqa alohida — teshiklar evenodd boʻlmagani uchun kontur halqalari alohida qatlam sifatida) */
  const maskFC = (C: Ctx, m: Uint8Array, props: Record<string, unknown>) => contour(C.G, m, 2).map(r => ({ type: 'Feature', properties: props, geometry: { type: 'Polygon', coordinates: [ring(r)] } }));
  return {
    g,
    boundary: (): FC => fc([{ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [ring(site.boundary)] } }]),
    trees: (C: Ctx): FC => fc(C.trees.map(t => ({ type: 'Feature', properties: { sp: t.sp, d: t.d, c: t.c, h: t.h, inv: t.sp === 'Yuksak aylant' ? 1 : 0, q: QCLS.has(speciesLaw(t.sp).cls) ? 1 : 0 }, geometry: { type: 'Point', coordinates: g(t.p) } }))),
    classes: (C: Ctx, cls: Uint8Array): FC => { const out: unknown[] = []; for (const v of [0, 1, 2]) { const m = C.G.u8(); for (let k = 0; k < C.G.n; k++) m[k] = cls[k] === v ? 1 : 0; out.push(...maskFC(C, m, { c: v })); } return fc(out); },
    slope: (C: Ctx): FC => { const out: unknown[] = []; const B: [number, number, number][] = [[0, 5, 0], [5, 8, 1], [8, 12, 2], [12, 999, 3]]; for (const [a, b, v] of B) { const m = C.G.u8(); for (let k = 0; k < C.G.n; k++) m[k] = C.site[k] && !C.water[k] && ((C.S[k] > a && C.S[k] <= b) || (a === 0 && C.S[k] === 0)) ? 1 : 0; out.push(...maskFC(C, m, { c: v })); } return fc(out); },
    variant: (V: Variant): { paths: FC; prog: FC; pts: FC; furn: FC; marks: FC } => ({
      marks: fc((V.marks ?? []).map(l => ({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: l.map(g) } }))),
      paths: fc([...V.paths.map(p => ({ type: 'Feature', properties: { tier: p.tier, w: p.w, st: p.style ?? 'yaxlit' }, geometry: { type: 'LineString', coordinates: p.g.map(g) } })), ...V.bridges.map(b => ({ type: 'Feature', properties: { tier: 'kopri', w: b.w, st: 'yaxlit' }, geometry: { type: 'LineString', coordinates: b.g.map(g) } }))]),
      prog: fc(Object.entries(V.prog).flatMap(([k, mp]) => mp.map(poly => ({ type: 'Feature', properties: { k }, geometry: { type: 'Polygon', coordinates: poly.map(ring) } })))),
      pts: fc([...V.gates.map(q => ({ type: 'Feature', properties: { t: 'gate', main: q.main ? 1 : 0 }, geometry: { type: 'Point', coordinates: g(q.p) } })), ...V.items.map((it, i) => ({ type: 'Feature', properties: { t: 'item', n: String(i + 1), name: it.name, rule: it.rule }, geometry: { type: 'Point', coordinates: g(it.p) } }))]),
      furn: fc((V.furn ?? []).flatMap(fu => { const f = furnById(fu.id); if (!f) return []; const w = Math.max(f.w, 0.5), d = Math.max(f.d, 0.5), c = Math.cos(fu.a), s = Math.sin(fu.a);
        const r: XY[] = f.shape === 'circle' ? Array.from({ length: 16 }, (_, i) => [fu.p[0] + Math.cos(i / 16 * 2 * Math.PI) * w / 2, fu.p[1] + Math.sin(i / 16 * 2 * Math.PI) * w / 2] as XY) : ([[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]] as XY[]).map(([u, v]) => [fu.p[0] + u * c - v * s, fu.p[1] + u * s + v * c] as XY);
        return [{ type: 'Feature', properties: { id: fu.id, c: FCATS[f.cat].c, s: Math.max(f.w, f.d) }, geometry: { type: 'Polygon', coordinates: [ring(r)] } }]; })),
    }),
  };
}
