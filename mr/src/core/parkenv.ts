/**
 * Avtoturargoh kirish-chiqishi uchun muhit (core/parkentry EntryEnv) — loyiha hujjatidan: koʻchalar (toifasi bilan), bekatlar
 * (qoʻlda qoʻshilgan POI), turar va jamoat binolari, taʼlim va davolash uchastkalari, dam olish maydonchalari.
 * OSM kontekst bekatlari bu yerda yoʻq (qoidalar faqat hujjatni koʻradi) — ochiq masala.
 */
import type { Project, Garage } from './doc';
import { frame, type XY } from './geo';
import { profileById, profileWidth } from './profiles';
import { computePlan } from './plan';
import { landscape } from './landscape';
import { useDef } from './uses';
import { autoEntry, autoShafts, entryChecks, worstCheck, type EntryEnv, type EntryLocal, type EntryCheck } from './parkentry';

const PUB = new Set(['maktab', 'mtm', 'poliklinika', 'ijtimoiy', 'mamuriy', 'savdo', 'ofis', 'mehmonxona', 'sport', 'aralash']);
const EDU = new Set(['maktab', 'mtm', 'poliklinika']);
const cOf = (r: XY[]): XY => [r.reduce((t, p) => t + p[0], 0) / r.length, r.reduce((t, p) => t + p[1], 0) / r.length];
const inR = (p: XY, r: XY[]): boolean => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) if ((r[i][1] > p[1]) !== (r[j][1] > p[1]) && p[0] < (r[j][0] - r[i][0]) * (p[1] - r[i][1]) / (r[j][1] - r[i][1]) + r[i][0]) c = !c; return c; };

export function entryEnv(doc: Project, g: Garage): EntryEnv {
  const fr = frame(doc.origin), plan = computePlan(doc), r = g.ring.map(fr.toLocal), c = cOf(r);
  const blk = plan.blocks.find(b => inR(c, b.rings[0]));
  const own = new Set(doc.buildings.filter(b => b.gen?.grp === g.grp && (b.use === 'avtoturargoh' || b.gen?.kind === 'stilobat')).map(b => b.id));
  const streets = doc.streets.filter(s => s.axis.length >= 2).map(s => { const p = profileById(s.profile); return { axis: s.axis.map(fr.toLocal), w: profileWidth(p), main: p.cat === 'tuman-magistral' || p.cat === 'shahar-magistral-3' }; });
  const stops = doc.pois.filter(q => q.kind === 'bekat' || q.kind === 'metro').map(q => fr.toLocal(q.at));
  const bs = doc.buildings.filter(b => !own.has(b.id) && b.floors > 0).map(b => ({ b, r: b.footprint.map(fr.toLocal) }));
  const windows = bs.filter(x => useDef(x.b.use).res > 0 || PUB.has(x.b.use)).map(x => x.r);
  const edu = plan.blocks.filter(b => EDU.has(b.use)).map(b => b.rings[0]);
  // TALQIN (SanPiN 6.4.1, 8-izoh «площадки отдыха»): bolalar, kattalar va sport maydonchalari (xoʻjalik emas), sport parklari ham
  const rest = doc.settings.yards ? landscape(doc).flatMap(y => [...y.play.filter(p => p.kind !== 'xojalik').map(p => p.ring), ...(y.sport ?? []).map(q => q.ring)]) : [];
  return { block: blk?.rings[0] ?? r, streets, stops, windows, edu, rest, buildings: bs.map(x => x.r) };
}

export const isUg = (g: Garage) => g.kind === 'yer_osti';
/** 414-band barcha avtoturargohlarga; 415 va SanPiN 8-izoh — yer ostiga */
export const hasEntryRules = (g: Garage) => !g.truck && (g.kind === 'yer_osti' || g.kind === 'stilobat' || g.kind === 'kop_qavatli');

export function entriesLocal(doc: Project, g: Garage): EntryLocal[] { const fr = frame(doc.origin); return (g.entries ?? []).map(e => ({ at: fr.toLocal(e.at), kind: e.kind, ...(e.dir != null ? { dir: e.dir } : {}), ...(e.edge ? { edge: true as const } : {}) })); }

/** Avtomatik: pandus (koʻp qavatlida — mavjud pandus yoʻlagining tashqi uchi) + yer ostida shamollatish shaxtalari */
export function autoEntries(doc: Project, g: Garage): EntryLocal[] {
  const fr = frame(doc.origin), env = entryEnv(doc, g), r = g.ring.map(fr.toLocal), ug = isUg(g), out: EntryLocal[] = [];
  if (g.kind === 'kop_qavatli' && g.ramps?.length) {
    // pandus yoʻlagi — toʻrtburchak; kvartal chegarasiga yaqin uchi — kirish
    const q = g.ramps[0].map(fr.toLocal), e0: XY = [(q[0][0] + q[3][0]) / 2, (q[0][1] + q[3][1]) / 2], e1: XY = [(q[1][0] + q[2][0]) / 2, (q[1][1] + q[2][1]) / 2];
    const dB = (p: XY) => { let m = Infinity; for (let i = 0; i < env.block.length; i++) { const a = env.block[i], b = env.block[(i + 1) % env.block.length], dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L)); m = Math.min(m, Math.hypot(p[0] - a[0] - dx * t, p[1] - a[1] - dy * t)); } return m; };
    const out0 = dB(e0) <= dB(e1) ? e0 : e1, inn = out0 === e0 ? e1 : e0;
    out.push({ at: out0, kind: 'rampa', dir: Math.atan2(out0[1] - inn[1], out0[0] - inn[0]) });
  } else { const e = autoEntry(r, env, ug); if (e) out.push(e); }
  if (ug) out.push(...autoShafts(r, env));
  return out;
}

export interface EntryReport { e: EntryLocal; checks: EntryCheck[]; worst: EntryCheck | null }
export function entryReport(doc: Project, g: Garage): EntryReport[] {
  const env = entryEnv(doc, g), ug = isUg(g);
  return entriesLocal(doc, g).map(e => { const checks = entryChecks(e.at, env, ug, e.kind); return { e, checks, worst: worstCheck(checks) }; });
}
