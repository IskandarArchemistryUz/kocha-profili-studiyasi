/**
 * 19.11 (egasi: «aynan loyihaga tegishli joyni qilish kerak, random emas»): Koʻchasoz «Tarmoq» (tarmoq.html, harakat modeli
 * «Sinash») loyiha ichidan ochilsa — loyiha koʻchalari (oʻq, profil kesimi) va ularning uchi tutashgan haqiqiy OSM yoʻli
 * (±80 m) tarmoqqa tushadi. Uzatish — `kps_mr_doc` (js/studio-mrsync.js oʻqiydi).
 */
import type { LngLat } from '../core/doc';
import type { Profile } from '../core/profiles';
import type { OsmEl } from './node';
import { tr } from '../i18n';

export const MR_DOC = 'kps_mr_doc';
type St = [string, number, number];
export interface MrNode { id: string; ll: LngLat }
export interface MrEdge { id: string; a: string; b: string; preset: string; st?: St[]; pts?: [number, number][]; name?: string; osm?: true }
/** 19.11 (egasi: «loyiha joyida eski OSM binolari qolib ketyapti»): uchastka (eski binolar yopiladi) va loyiha binolari — [lat, lng] */
export interface MrBld { r: [number, number][]; f: number }
export interface MrDoc { pid: string; name: string; nodes: MrNode[]; edges: MrEdge[]; at: number; site?: [number, number][][]; bld?: MrBld[] }

const R = 6371008.8, rad = Math.PI / 180;
const dist = (a: LngLat, b: LngLat) => Math.hypot((b[0] - a[0]) * Math.cos((a[1] + b[1]) / 2 * rad) * rad * R, (b[1] - a[1]) * rad * R);

/** Master reja profili → tarmoq kesimi (js/app.js DK turlari; yoʻnalish: chap yarmi −1, oʻng yarmi +1) */
export function profileStrips(p: Profile): St[] {
  const K: Record<string, string> = { trotuar: 'walk', yashil: 'green', velo: 'bike', parkovka: 'park', qatnov: 'lane', ajratuvchi: 'median', avtobus: 'bus', tramvay: 'tram' };
  const parts: [string, number, boolean][] = [];
  for (const q of p.parts) {
    const k = K[q.k]; if (!k || !(q.w > 0)) continue;
    const n = q.k === 'qatnov' || q.k === 'avtobus' || q.k === 'tramvay' ? Math.max(1, q.lanes ?? Math.round(q.w / 3.5)) : 1;
    for (let i = 0; i < n; i++) parts.push([k, q.w / n, k === 'lane' || k === 'bus' || k === 'tram' || k === 'bike']);
  }
  const tot = parts.reduce((a, x) => a + x[1], 0); let cum = 0;
  return parts.map(([k, w, road]) => { const m = cum + w / 2; cum += w; return [k, Math.round(w * 100) / 100, road ? (m < tot / 2 ? -1 : 1) : 0] as St; });
}

/** OSM teglari → tarmoq andozasi (boʻlaklar soni va bir tomonlamalik) */
export function osmPreset(t: Record<string, string>): string {
  const one = t.oneway === 'yes' || t.oneway === '1' || t.junction === 'roundabout', n = +(t.lanes ?? 0), hw = (t.highway ?? '').replace(/_link$/, '');
  if (one) return n >= 3 ? 'one3' : n === 2 || ['primary', 'secondary', 'trunk'].includes(hw) ? 'one2' : 'one1';
  if (n >= 6 || hw === 'trunk') return 'r6';
  if (n >= 4 || hw === 'primary' || hw === 'secondary') return 'r4';
  if (hw === 'residential' || hw === 'unclassified' || hw === 'living_street') return 'res1';
  return 'r2';
}

/** OSM yoʻli boʻylab nuqtadan ±len m (yoʻnalish: way tartibida oldinga va orqaga) */
function cutAround(line: LngLat[], i: number, at: LngLat, len: number): [LngLat[], LngLat[]] {
  const walk = (dir: 1 | -1): LngLat[] => {
    const out: LngLat[] = []; let prev = at, acc = 0;
    for (let j = dir > 0 ? i + 1 : i; j >= 0 && j < line.length; j += dir) {
      const c = line[j], d = dist(prev, c);
      if (acc + d >= len) { const f = (len - acc) / d; out.push([prev[0] + (c[0] - prev[0]) * f, prev[1] + (c[1] - prev[1]) * f]); return out; }
      out.push(c); acc += d; prev = c;
    }
    return acc >= 8 ? out : [];
  };
  return [walk(1), walk(-1)];
}

export interface StreetIn { id: string; axis: LngLat[]; profile: Profile; name: string }

/** nuqtadan kesmagacha masofa, m */
function segDist(p: LngLat, a: LngLat, b: LngLat): number {
  const k = Math.cos(p[1] * rad) * rad * R, ky = rad * R;
  const ax = (a[0] - p[0]) * k, ay = (a[1] - p[1]) * ky, bx = (b[0] - p[0]) * k, by = (b[1] - p[1]) * ky, dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy;
  const t = L ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / L)) : 0;
  return Math.hypot(ax + dx * t, ay + dy * t);
}
/**
 * Ichki uchlar (kalit `lng,lat`): boshqa loyiha koʻchasiga ≤ 3 m tutashgan uch — loyiha ichidagi chorraha.
 * Ular OSM ga ulanmaydi (soʻrov ham ketmaydi): avval uchastka ichidagi eski yoʻlga yopishib qolishi mumkin edi.
 */
export function innerEnds(streets: { id: string; axis: LngLat[] }[], tol = 3): Set<string> {
  const out = new Set<string>();
  for (const s of streets) for (const e of [s.axis[0], s.axis[s.axis.length - 1]]) {
    if (streets.some(o => o !== s && o.axis.some((q, i) => i > 0 && segDist(e, o.axis[i - 1], q) <= tol))) out.add(e.join(','));
  }
  return out;
}
/** OSM ga ulanadigan (tashqi) uchlar — takrorsiz */
export function outerEnds(streets: { id: string; axis: LngLat[] }[]): LngLat[] {
  const inner = innerEnds(streets), seen = new Set<string>(), out: LngLat[] = [];
  for (const s of streets) for (const e of [s.axis[0], s.axis[s.axis.length - 1]]) { const k = e.join(','); if (!inner.has(k) && !seen.has(k)) { seen.add(k); out.push(e); } }
  return out;
}
/**
 * Loyiha koʻchalari + OSM (har uch atrofidagi Overpass javobi) → tarmoq hujjati.
 * Uchlar 2 m gacha yaqin boʻlsa bitta tugun (loyiha ichidagi chorrahalar); uch OSM yoʻliga ≤ 45 m boʻlsa —
 * uch yoʻl oʻqidagi tutashuv nuqtasiga koʻchadi va yoʻl shu nuqtada ikki tarmoqqa boʻlinadi.
 */
export function buildMrDoc(pid: string, name: string, streets: StreetIn[], osmAt: (end: LngLat) => OsmEl[] | null, join: (els: OsmEl[], end: LngLat, inn: LngLat) => { at: LngLat; main: [{ way: number }, unknown] } | null): MrDoc {
  const nodes: MrNode[] = [], edges: MrEdge[] = [];
  const node = (ll: LngLat): string => { const f = nodes.find(n => dist(n.ll, ll) < 2); if (f) return f.id; const id = `n${nodes.length + 1}`; nodes.push({ id, ll }); return id; };
  const usedWays = new Set<number>();
  for (const s of streets) {
    const ax = s.axis.slice();
    for (const [ei, ii] of [[0, 1], [ax.length - 1, ax.length - 2]] as const) {
      const els = osmAt(ax[ei]); if (!els) continue;
      const r = join(els, ax[ei], ax[ii]); if (!r) continue;
      ax[ei] = r.at;   // uch yoʻl oʻqiga
      const wid = r.main[0].way; if (usedWays.has(wid)) continue; usedWays.add(wid);
      const w = els.find(e => e.type === 'way' && e.id === wid); if (!w?.nodes) continue;
      const nm = new Map<number, LngLat>(); for (const e of els) if (e.type === 'node' && e.lat != null && e.lon != null) nm.set(e.id, [e.lon, e.lat]);
      const line = w.nodes.map(id => nm.get(id)).filter((x): x is LngLat => !!x);
      let bi = 0, bd = Infinity; for (let i = 0; i + 1 < line.length; i++) { const d = Math.min(dist(line[i], r.at), dist(line[i + 1], r.at)); if (d < bd) { bd = d; bi = i; } }
      const [fw, bw] = cutAround(line, bi, r.at, 80), pre = osmPreset(w.tags ?? {}), nmTag = w.tags?.name;
      const c = node(r.at);
      for (const part of [fw, bw]) {
        if (!part.length) continue;
        const end = node(part[part.length - 1]);
        edges.push({ id: `o${wid}_${edges.length}`, a: c, b: end, preset: pre, pts: part.slice(0, -1).map(p => [p[1], p[0]] as [number, number]), ...(nmTag ? { name: nmTag } : {}), osm: true });
      }
    }
    const a = node(ax[0]), b = node(ax[ax.length - 1]);
    edges.push({ id: `s_${s.id}`, a, b, preset: 'custom', st: profileStrips(s.profile), pts: ax.slice(1, -1).map(p => [p[1], p[0]] as [number, number]), name: s.name });
  }
  return { pid, name, nodes, edges, at: Date.now() };
}

/** OSM uchun eng koʻp kutish (ms): javob boʻlmasa Tarmoq loyiha koʻchalari va hududi bilan baribir ochiladi */
export const OSM_WAIT = 25_000;

/**
 * Loyiha ichidan (?p=) Tarmoqni ochish; loyiha boʻlmasa — oddiy tarmoq.html.
 * 22.11: hudud va binolar koʻcha boʻlmasa ham uzatiladi; boshqa loyihadan qolgan `kps_mr_doc` ishlatilmaydi;
 * OSM — bitta soʻrov, ≤ OSM_WAIT.
 */
export async function openTarmoq(pid: string | null, toastFn?: (m: string) => void): Promise<void> {
  const base = '../tarmoq.html';
  if (!pid) { location.href = base; return; }
  try { localStorage.removeItem(MR_DOC); } catch { /* */ }
  try {
    toastFn?.(tr('Loyiha koʻchalari va atrofdagi OSM yoʻllari tayyorlanmoqda…'));
    const { getProject } = await import('../storage/db'), doc = await getProject(pid);
    if (doc) {
      const st = (doc.streets || []).filter(x => x.axis && x.axis.length >= 2);
      let streets: StreetIn[] = [], els: OsmEl[] | null = null, inner = new Set<string>();
      const N = await import('./node');
      if (st.length) {
        const P = await import('../core/profiles'); P.setUserProfiles(doc.profiles);
        streets = st.map((x, i) => { const pr = P.profileById(x.profile); return { id: x.id, axis: x.axis, profile: pr, name: (x as { name?: string }).name || `${pr.name} ${i + 1}` }; });
        inner = innerEnds(st);
        const ends = outerEnds(st);
        if (ends.length) {
          const { overpass } = await import('../context/load');
          const q = overpass(N.nodesQuery(ends, 50), fetch.bind(globalThis), () => {}).then(j => ((j as { elements?: OsmEl[] }).elements || []), () => null);
          els = await Promise.race([q, new Promise<null>(r => setTimeout(() => r(null), OSM_WAIT))]);
        }
      }
      const M = buildMrDoc(pid, doc.name, streets, e => (inner.has(e.join(',')) ? null : els), (x, end, inn) => N.joinNode(x, end, inn));
      const LL = (r: LngLat[]) => r.map(p => [p[1], p[0]] as [number, number]);
      M.site = (doc.site?.rings ?? []).filter(r => r.length >= 3).map(LL);
      M.bld = doc.buildings.filter(b => b.footprint.length >= 3).map(b => ({ r: LL(b.footprint), f: b.floors }));
      localStorage.setItem(MR_DOC, JSON.stringify(M));
    }
  } catch { /* tarmoq oʻz holati bilan ochiladi */ }
  location.href = `${base}?p=${encodeURIComponent(pid)}`;
}
