/**
 * Master reja buyruqlari (faqat oʻqish). Nomlar server/src/agent-tools.js dagi bilan bir xil boʻlishi shart.
 * Har natija: raqam — birligi bilan, manba — qaysi hisobdan. Yangi hisob mantiqi yoʻq: Editor allaqachon hisoblaganini oladi.
 */
import type { Project } from '../core/doc';
import type { Derived } from '../core/derive';
import type { Result } from '../norms/rules';
import type { TepRow } from '../core/tep';
import { frame, ringLocal, area } from '../core/geo';
import type { Tools } from './loop';

export interface MrHost {
  doc(): Project;
  derived(): Derived | null;
  /** hamma meʼyoriy natijalar (Editor.allRules — xorij toʻplami va konsepsiya rejimi qoʻllangan) */
  rules(): Result[];
  tep(): TepRow[];
  normSet(): string;
  step(): string;
  /** sahnada belgilash; nechta obyekt topilgani */
  highlight(ids: string[]): number;
  /** narx (server /quote) */
  quote?(action: string): Promise<{ coins: number; k: number }>;
}

const r1 = (v: number, d = 1): number => Math.round(v * 10 ** d) / 10 ** d;
const num = (v: unknown, d = 2): unknown => (typeof v === 'number' && Number.isFinite(v) ? r1(v, d) : v ?? null);
const now = () => new Date().toISOString();
const polyLen = (a: [number, number][]) => a.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - a[i][0], p[1] - a[i][1]), 0);
const S = (s: unknown) => String(s ?? '').toLowerCase().replace(/[\s.\-–ʻʼ'`]+/g, '');
/** «86», «86-band», «Jadval 5» → raqamlar va soʻzlar */
const tokens = (s: string) => (s.toLowerCase().match(/\d+[¹²³]?|[a-zʻʼ]+/g) ?? []).filter(t => !['band', 'bandi', 'bandlar', 'clause', 'п'].includes(t));

export function ruleOut(r: Result) {
  return {
    id: r.id, title: r.title, status: r.status.toUpperCase(),
    value: num(r.value, r.digits ?? 2), unit: r.unit ?? null, required: r.limit ?? null, deviation_pct: num(r.delta, 1),
    doc: r.source.doc, clause: r.source.clause, edition: r.source.edition, source_verified: r.source.verified,
    note: r.note ?? null, objects: r.where?.bids?.slice(0, 40) ?? [], suggested_fix: r.fix ? { label: r.fix.label, hint: r.fix.hint } : null,
  };
}

export function mrTools(H: MrHost): Tools {
  const fr = () => frame(H.doc().origin);
  const bArea = (b: Project['buildings'][number]) => area(ringLocal(fr(), b.footprint));
  return {
    project_summary: () => {
      const doc = H.doc(), d = H.derived(), rs = H.rules().filter(r => r.status !== 'na');
      return {
        service: 'Master reja', project: doc.name, current_step: H.step(), norm_set: H.normSet(),
        site_ha: d ? r1(d.siteHa, 2) : null, has_site: !!doc.site,
        counts: { buildings: doc.buildings.length, streets: doc.streets.length, parcels: doc.parcels.length, zones: doc.zones.length, constraints: doc.limits?.length ?? 0 },
        key: d ? { population: Math.round(d.population), density_per_ha: Math.round(d.density), gfa_m2: Math.round(d.gfa), far: r1(d.far, 2), gsi: r1(d.gsi, 2), avg_floors: r1(d.avgFloors, 1), green_share_pct: r1(d.greenShare * 100, 1) } : null,
        checks: { FAIL: rs.filter(r => r.status === 'fail').length, REVIEW: rs.filter(r => r.status === 'review').length, PASS: rs.filter(r => r.status === 'pass').length },
        computed_at: now(), source: 'Lab hisobi (brauzerda)',
      };
    },
    get_tep: () => ({ rows: H.tep().map(t => ({ group: t.g, name: t.name, value: num(t.v, 2), unit: t.unit, note: t.note ?? null })), computed_at: now(), source: 'TEP jadvali (core/tep.ts)' }),
    run_norm_check: (i) => {
      const want = String(i.status ?? 'ALL').toUpperCase();
      const rs = H.rules().filter(r => r.status !== 'na' && (want === 'ALL' || r.status.toUpperCase() === want));
      return { norm_set: H.normSet(), items: rs.map(ruleOut), total: rs.length, computed_at: now(), source: 'Meʼyorlar dvigateli (norms/rules.ts)' };
    },
    get_norm_clause: (i) => {
      const doc = S(i.doc), want = tokens(String(i.clause ?? ''));
      const hit = H.rules().filter(r => (!doc || S(r.source.doc).includes(doc) || doc.includes(S(r.source.doc)))
        && want.length && want.every(t => tokens(r.source.clause).includes(t)));
      if (!hit.length) return { found: false, doc: i.doc ?? null, clause: i.clause ?? null, message: 'No Lab rule is linked to this clause; its text is not in the Lab library. Do not quote it.' };
      const s = hit[0].source;
      return {
        found: true, doc: s.doc, clause: s.clause, edition: s.edition, source_verified: s.verified,
        verbatim_text: null, text_note: 'Verbatim clause text is not yet in the Lab library: do not quote; state the clause number and the requirement from the rule data below.',
        rules: hit.map(r => ({ id: r.id, title: r.title, required: r.limit ?? null, unit: r.unit ?? null, status: r.status.toUpperCase(), note: r.note ?? null })),
      };
    },
    list_objects: (i) => {
      const doc = H.doc(), lim = Math.max(1, Math.min(100, Number(i.limit) || 50)), kind = String(i.kind ?? 'building');
      let items: unknown[];
      if (kind === 'street') items = doc.streets.map(s => ({ id: s.id, profile: s.profile, length_m: Math.round(polyLen(ringLocal(fr(), s.axis))), from_osm: !!s.osm }));
      else if (kind === 'parcel') items = doc.parcels.map(p => ({ id: p.id, block: p.block, use: p.use, area_m2: Math.round(area(ringLocal(fr(), p.rings[0] ?? []))) }));
      else if (kind === 'block') items = doc.zones.map(z => ({ id: z.id, use: z.use, sub: z.sub ?? null }));
      else if (kind === 'social') items = [
        ...doc.buildings.filter(b => ['maktab', 'mtm', 'poliklinika', 'ijtimoiy', 'sport'].includes(b.use)).map(b => ({ id: b.id, use: b.use, floors: b.floors, footprint_m2: Math.round(bArea(b)), placed_by: 'project' })),
        ...doc.pois.map(p => ({ id: p.id, use: p.kind, name: p.name ?? null, placed_by: 'user_marked_existing' })),
      ];
      else items = doc.buildings.map(b => { const f = bArea(b); return { id: b.id, use: b.use, floors: b.floors, non_res_floors: b.nonRes, footprint_m2: Math.round(f), floor_area_m2: Math.round(f * b.floors), stage: b.stage ?? 1, generated: !!b.gen }; });
      return { kind, total: items.length, items: items.slice(0, lim), truncated: items.length > lim };
    },
    get_object: (i) => {
      const id = String(i.id ?? ''), doc = H.doc();
      const b = doc.buildings.find(x => x.id === id);
      if (b) { const f = bArea(b); return { kind: 'building', id, use: b.use, floors: b.floors, non_res_floors: b.nonRes, footprint_m2: Math.round(f), floor_area_m2: Math.round(f * b.floors), stage: b.stage ?? 1, tiers: b.tiers?.length ?? 0, checks: H.rules().filter(r => r.where?.bids?.includes(id) && r.status !== 'pass' && r.status !== 'na').map(ruleOut) }; }
      const s = doc.streets.find(x => x.id === id); if (s) return { kind: 'street', id, profile: s.profile, points: s.axis.length };
      const p = doc.parcels.find(x => x.id === id); if (p) return { kind: 'parcel', id, block: p.block, use: p.use, area_m2: Math.round(area(ringLocal(fr(), p.rings[0] ?? []))) };
      const z = doc.zones.find(x => x.id === id); if (z) return { kind: 'block', id, use: z.use, sub: z.sub ?? null };
      return { found: false, id, message: 'not found in the project' };
    },
    get_constraints: () => {
      const doc = H.doc(), d = H.derived();
      return {
        items: (doc.limits ?? []).map(l => ({ id: l.id, kind: l.kind, status: l.status, ...(l.kv ? { kv: l.kv } : {}), ...(l.sub ? { sub: l.sub } : {}) })),
        land_balance_ha: d?.balance ? Object.fromEntries(Object.entries(d.balance).filter(([, v]) => typeof v === 'number').map(([k, v]) => [k, r1(v as number, 2)])) : null,
        kept_existing_buildings: doc.keep.length,
        source: 'Mavjud holat va cheklovlar (core/limits.ts)',
      };
    },
    highlight: (i) => {
      const ids = (Array.isArray(i.ids) ? i.ids : []).map(String).slice(0, 50);
      const n = H.highlight(ids);
      return { highlighted: n, requested: ids.length, note: n < ids.length ? 'only buildings can be highlighted for now' : undefined };
    },
    price_estimate: async (i) => {
      if (!H.quote) return { available: false };
      const q = await H.quote(String(i.action ?? ''));
      return { action: i.action, coins: q.coins, area_k: q.k, source: 'server narx jadvali (/quote)' };
    },
  };
}
