/**
 * Joyshunos buyruqlari (faqat oʻqish). Nomlar server/src/agent-tools.js (JOY) dagi bilan bir xil.
 * Raqamlar — Joyshunos allaqachon hisoblagani: ekrandagi pasport kartalari (hisobot bilan bir xil), xizmatlar va narx kataklari.
 * Yangi hisob mantiqi yoʻq.
 */
import type { Tools } from './loop';
import type { ClauseRes } from './api';
import type { RepCard } from '../joyshunos/report';

type LngLat = [number, number];
/** core/services.ts dagi Svc bilan bir xil */
type Svc = 'mtm' | 'maktab' | 'poliklinika' | 'dorixona' | 'savdo' | 'sport' | 'mahalla' | 'bekat' | 'metro';

export interface JoySvc { kind: Svc; count_in_radius: number; nearest_osm_m: number | null; nearest_added_m: number | null; norm_radius_m: number; status: 'ok' | 'far' | 'own' | 'none' }
export interface JoyNarx { category: string; date: string; in_city: boolean; listings: number; median: number | null; p25: number | null; p75: number | null; rank_pct: number | null; city_median: number | null; city_listings: number | null; unit: string; cell_m: number }

export interface JoyHost {
  center(): LngLat;
  radius(): number;
  address(): string | null;
  /** yoqilgan qatlamlar (id, nomi) */
  layers(): { id: string; name: string }[];
  /** ekrandagi pasport kartalari — hisobotdagi bilan bir xil matn */
  cards(): RepCard[];
  /** xizmatlar qatlami: null — qatlam oʻchiq; 'load' — yuklanmoqda */
  services(): JoySvc[] | null | 'load';
  /** narx qatlami: null — oʻchiq; 'load' — yuklanmoqda */
  narx(): JoyNarx | null | 'load' | 'nodata';
  clause?(doc: string, clause: string): Promise<ClauseRes>;
  /** faqat koʻrinish: xarita palitrasi va ranglari; foydalanuvchi bir bosishda qaytaradi */
  setMapStyle?(p: MapStyleIn): { applied: MapStyleIn; previous: MapStyleIn };
}
export interface MapStyleIn { palette?: string; labels?: boolean; bg?: string; bld?: string; bl?: string; road?: string; park?: string; water?: string; label?: string }
const HEX = /^#[0-9a-f]{6}$/i;
const PALS = ['arch', 'line', 'fig', 'dark', 'pastel', 'beton', 'gisht', 'qum', 'oq', 'kok'];

const now = () => new Date().toISOString();
const r1 = (v: number | null, d = 0): number | null => (v == null || !Number.isFinite(v) ? null : Math.round(v * 10 ** d) / 10 ** d);
const WANT: Record<string, Svc[]> = {
  school: ['maktab'], kindergarten: ['mtm'], clinic: ['poliklinika', 'dorixona'], shop: ['savdo'], transit: ['bekat', 'metro'], sport: ['sport'],
};

export function joyTools(H: JoyHost): Tools {
  const area = () => ({ center_lat: r1(H.center()[1], 5), center_lon: r1(H.center()[0], 5), radius_m: H.radius(), walk_min: Math.max(1, Math.round(H.radius() / 83)), address: H.address() });
  return {
    project_summary: () => ({
      service: 'Joyshunos', area: area(), layers_on: H.layers(),
      cards: H.cards().map(c => ({ id: c.id, name: c.name, headline: c.big })),
      computed_at: now(), source: 'Joyshunos (brauzerda, ochiq maʼlumotlar)',
    }),
    joyshunos_layers: () => {
      const cs = H.cards();
      return {
        area: area(),
        layers: cs.map(c => ({ id: c.id, name: c.name, headline: c.big, details: c.text, norms: c.norms.map(n => ({ indicator: n.k, value: n.v, limit: n.lim, ok: n.ok })), data_source: c.src || c.chip, beta: c.beta })),
        note: cs.length ? 'Numbers are exactly as shown on the passport cards. Beta layers are estimates — say so.' : 'No layer card has data yet: ask the user to switch on layers (left panel) and wait for them to load.',
        computed_at: now(),
      };
    },
    nearby_services: (i) => {
      const s = H.services();
      if (s === null) return { available: false, message: 'The «Xizmatlar» (services) layer is off. Ask the user to switch it on in the left panel.' };
      if (s === 'load') return { available: false, message: 'Services are still loading from OSM — ask the user to wait a few seconds and ask again.' };
      const kind = String(i.kind ?? 'all');
      if (kind === 'park') return { available: false, message: 'Parks are not part of the services layer. Use joyshunos_layers (greenery/surface cards) if switched on.' };
      const ks = kind === 'all' ? null : WANT[kind];
      const items = s.filter(x => !ks || ks.includes(x.kind)).map(x => ({
        kind: x.kind, count_within_radius: x.count_in_radius, nearest_osm_m: r1(x.nearest_osm_m), nearest_user_added_m: r1(x.nearest_added_m),
        norm_radius_m: x.norm_radius_m,
        status: x.status === 'ok' ? 'within_norm_radius' : x.status === 'far' ? 'farther_than_norm_radius' : x.status === 'own' ? 'only_user_added_not_in_norm' : 'not_found_in_data',
      }));
      return {
        area: area(), items,
        norm_source: 'ShNQ 2.07.01-23, 38-jadval (service radius); bus stop — 382-band. Distances are straight-line.',
        data_note: 'OSM is incomplete: treat counts as "at least". If not_found_in_data, say "not found in OSM data — check on site", never "there is none".',
        computed_at: now(), source: 'OpenStreetMap (Overpass) + user-added objects',
      };
    },
    price_hex_summary: () => {
      const n = H.narx();
      if (n === null) return { available: false, message: 'The «Narx» (prices) layer is off. Ask the user to switch it on in the left panel.' };
      if (n === 'load') return { available: false, message: 'Price data is still loading — ask the user to wait and ask again.' };
      if (n === 'nodata') return { available: false, message: 'No price data for this category.' };
      return {
        area: area(), category: n.category, data_date: n.date, in_city_coverage: n.in_city, cell_size_m: n.cell_m,
        cell: { listings: n.listings, median: n.median, p25: n.p25, p75: n.p75, more_expensive_than_pct_of_city_cells: n.rank_pct },
        city: { median: n.city_median, listings: n.city_listings }, unit: n.unit,
        data_note: 'Asking prices from uybor.uz listings, not transaction prices; cells with fewer than 5 listings show no price.',
        computed_at: now(), source: 'uybor.uz listings (Archemistry monitoring)',
      };
    },
    get_norm_clause: async (i) => {
      let lib: ClauseRes | null = null;
      try { lib = H.clause ? await H.clause(String(i.doc ?? ''), String(i.clause ?? '')) : null; } catch { lib = null; }
      if (lib?.found) return { found: true, doc: lib.doc, clause: lib.clause, edition: lib.edition, source: lib.source, verbatim_text: lib.text, amendments: lib.amend ?? [], text_note: 'Quote verbatim_text exactly (you may shorten with …). Cite doc, clause and edition.' };
      return { found: false, doc: i.doc ?? null, clause: i.clause ?? null, library_coverage: lib?.coverage ?? null, message: 'This clause is not in the Lab library. Do not quote it; give only the document and clause number if the user needs it.' };
    },
    set_map_style: (i) => {
      if (!H.setMapStyle) return { ok: false, message: 'Map style cannot be changed here.' };
      const p: MapStyleIn = {}, bad: string[] = [];
      if (typeof i.palette === 'string') { if (PALS.includes(i.palette)) p.palette = i.palette; else bad.push('palette'); }
      if (typeof i.labels === 'boolean') p.labels = i.labels;
      for (const k of ['bg', 'bld', 'bl', 'road', 'park', 'water', 'label'] as const) if (i[k] != null) { if (typeof i[k] === 'string' && HEX.test(i[k] as string)) p[k] = (i[k] as string).toLowerCase(); else bad.push(k); }
      if (!Object.keys(p).length) return { ok: false, message: 'Nothing to change: give a palette or #rrggbb colours.', rejected: bad };
      const r = H.setMapStyle(p);
      return { ok: true, applied: r.applied, previous: r.previous, rejected: bad, note: 'Only the map view changed. The user can press «Bekor qilish» to restore the previous look.' };
    },
    price_estimate: () => ({ available: false, message: 'Joyshunos analysis is free; the advisor question price is shown on the send button.' }),
  };
}
