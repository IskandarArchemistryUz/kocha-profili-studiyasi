/**
 * Avtoturargoh kirish-chiqishi uchun muhit (core/parkentry EntryEnv) — loyiha hujjatidan: koʻchalar (toifasi bilan), bekatlar
 * (qoʻlda qoʻshilgan POI), turar va jamoat binolari, taʼlim va davolash uchastkalari, dam olish maydonchalari.
 * OSM kontekst bekatlari bu yerda yoʻq (qoidalar faqat hujjatni koʻradi) — ochiq masala.
 */
import polygonClipping from 'polygon-clipping';
import type { Project, Garage } from './doc';
import { frame, type XY } from './geo';
import { profileById, profileWidth } from './profiles';
import { computePlan } from './plan';
import { landscape } from './landscape';
import { useDef } from './uses';
import { autoEntry, autoShafts, entryChecks, worstCheck, type EntryEnv, type EntryLocal, type EntryCheck } from './parkentry';

const PUB = new Set(['maktab', 'mtm', 'poliklinika', 'ijtimoiy', 'mamuriy', 'savdo', 'ofis', 'mehmonxona', 'sport', 'aralash']);
const EDU = new Set(['maktab', 'mtm', 'poliklinika']);
const ringA = (r: XY[]): number => { let a = 0; for (let i = 0; i < r.length; i++) { const p = r[i], q = r[(i + 1) % r.length]; a += p[0] * q[1] - q[0] * p[1]; } return Math.abs(a) / 2; };
const cl = (r: XY[]): [number, number][] => [...r, r[0]].map(p => [p[0], p[1]]);
/** ikki halqa kesishmasi maydoni, m² */
function overlapA(a: XY[], b: XY[]): number { try { return (polygonClipping.intersection([cl(a)], [cl(b)]) as [number, number][][][]).reduce((t, p) => t + ringA(p[0].slice(0, -1) as XY[]) - p.slice(1).reduce((u, h) => u + ringA(h.slice(0, -1) as XY[]), 0), 0); } catch { return 0; } }
const cOf = (r: XY[]): XY => [r.reduce((t, p) => t + p[0], 0) / r.length, r.reduce((t, p) => t + p[1], 0) / r.length];
const inR = (p: XY, r: XY[]): boolean => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) if ((r[i][1] > p[1]) !== (r[j][1] > p[1]) && p[0] < (r[j][0] - r[i][0]) * (p[1] - r[i][1]) / (r[j][1] - r[i][1]) + r[i][0]) c = !c; return c; };

export function entryEnv(doc: Project, g: Garage): EntryEnv {
  const fr = frame(doc.origin), plan = computePlan(doc), r = g.ring.map(fr.toLocal), c = cOf(r);
  const blk = plan.blocks.find(b => inR(c, b.rings[0]));
  const own = new Set(doc.buildings.filter(b => b.gen?.grp === g.grp && (b.use === 'avtoturargoh' || b.gen?.kind === 'stilobat')).map(b => b.id));
  const streets = doc.streets.filter(s => s.axis.length >= 2).map(s => { const p = profileById(s.profile); return { axis: s.axis.map(fr.toLocal), w: profileWidth(p), main: p.cat === 'tuman-magistral' || p.cat === 'shahar-magistral-3' }; });
  const stops = doc.pois.filter(q => q.kind === 'bekat' || q.kind === 'metro').map(q => fr.toLocal(q.at));
  const bs = doc.buildings.filter(b => !own.has(b.id) && b.floors > 0).map(b => ({ b, r: b.footprint.map(fr.toLocal) }));
  // 06.11 (c61): ShNQ 2.05.07-24, 10-band — binoda joylashgan yer osti avtoturargohi kirish-chiqishidan oʻz binosigacha masofa belgilanmaydi.
  // Oʻz binosi — garaj maydonining kamida yarmi ostida joylashgan bino (garaj binoda joylashgan, TALQIN; hovli ostidagi umumiy garajda
  // binolar oʻz binosi hisoblanmaydi); shaxtalar uchun oʻz binosi ham tekshiriladi (10-band faqat kirish-chiqish haqida)
  const ug = isUg(g), gA = ringA(r), host = (x: { r: XY[] }) => ug && gA > 0 && overlapA(x.r, r) >= 0.5 * gA;
  const wins = bs.filter(x => useDef(x.b.use).res > 0 || PUB.has(x.b.use)), windows = wins.filter(x => !host(x)).map(x => x.r), hostW = wins.filter(host).map(x => x.r);
  const edu = plan.blocks.filter(b => EDU.has(b.use)).map(b => b.rings[0]);
  // TALQIN (oldingi 0350-17, 6.4.1-jadval 8-izohidagi «площадки отдыха» — 0103-25 da yoʻq; AMALIYOT): bolalar, kattalar va sport maydonchalari (xoʻjalik emas)
  const rest = doc.settings.yards ? landscape(doc).flatMap(y => [...y.play.filter(p => p.kind !== 'xojalik').map(p => p.ring), ...(y.sport ?? []).map(q => q.ring)]) : [];
  return { block: blk?.rings[0] ?? r, streets, stops, windows, edu, rest, buildings: bs.map(x => x.r), ...(hostW.length ? { host: hostW } : {}) };
}

export const isUg = (g: Garage) => g.kind === 'yer_osti';
/** 414-band barcha avtoturargohlarga; 415 — yer ostiga */
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
