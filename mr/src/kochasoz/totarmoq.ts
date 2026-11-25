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

export interface StreetIn { id: string; axis: LngLat[]; profile: Profile; name: string }

/** nuqtadan kesmagacha masofa, m */
function segDist(p: LngLat, a: LngLat, b: LngLat): number {
  const k = Math.cos(p[1] * rad) * rad * R, ky = rad * R;
  const ax = (a[0] - p[0]) * k, ay = (a[1] - p[1]) * ky, bx = (b[0] - p[0]) * k, by = (b[1] - p[1]) * ky, dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy;
  const t = L ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / L)) : 0;
  return Math.hypot(ax + dx * t, ay + dy * t);
}
/** Uch boshqa koʻchaga «tegib turgan» hisoblanadigan masofa (m): oʻsha koʻcha koridori ichida (yarim eni + 1 m), kamida 3 m */
export const touchTol = (half?: number) => Math.max(WELD_TOL, (half ?? 0) + 1);
/**
 * Ichki uchlar (kalit `lng,lat`): boshqa loyiha koʻchasiga tutashgan uch — loyiha ichidagi chorraha.
 * Ular OSM ga ulanmaydi (soʻrov ham ketmaydi): avval uchastka ichidagi eski yoʻlga yopishib qolishi mumkin edi.
 * 25.11: «tutashgan» — uch boshqa koʻchaning KORIDORI ichida (half — yarim eni). Master rejada koʻcha koʻpincha boshqa
 * koʻchaning chetigacha chiziladi (oʻqigacha emas): chizmada ulangan, lekin oʻqdan 5–20 m narida.
 */
export function innerEnds(streets: { id: string; axis: LngLat[]; half?: number }[], tol?: number): Set<string> {
  const out = new Set<string>();
  for (const s of streets) for (const e of [s.axis[0], s.axis[s.axis.length - 1]]) {
    if (streets.some(o => o !== s && o.axis.some((q, i) => i > 0 && segDist(e, o.axis[i - 1], q) <= (tol ?? touchTol(o.half))))) out.add(e.join(','));
  }
  return out;
}
/** OSM ga ulanadigan (tashqi) uchlar — takrorsiz */
export function outerEnds(streets: { id: string; axis: LngLat[]; half?: number }[]): LngLat[] {
  const inner = innerEnds(streets), seen = new Set<string>(), out: LngLat[] = [];
  for (const s of streets) for (const e of [s.axis[0], s.axis[s.axis.length - 1]]) { const k = e.join(','); if (!inner.has(k) && !seen.has(k)) { seen.add(k); out.push(e); } }
  return out;
}
/** Tarmoq chizigʻi (ulashdan oldin): loyiha koʻchasi yoki OSM yoʻlining boʻlagi */
/** half — koʻchaning yarim eni (m): boshqa koʻcha uchi shu koridor ichida tugasa — tutashgan */
export interface RawLine { id: string; line: LngLat[]; preset: string; st?: St[]; name?: string; osm?: true; half?: number }

type XY = [number, number];
/** nuqtaning siniq chiziqdagi proyeksiyasi: masofa, yoʻl boʻylab oʻrni (m), nuqta */
function projOn(P: XY[], q: XY): { d: number; s: number; pt: XY } {
  let best = { d: Infinity, s: 0, pt: P[0] }, acc = 0;
  for (let i = 0; i + 1 < P.length; i++) {
    const a = P[i], b = P[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy, L = Math.sqrt(L2);
    const t = L2 ? Math.max(0, Math.min(1, ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / L2)) : 0;
    const pt: XY = [a[0] + dx * t, a[1] + dy * t], d = Math.hypot(pt[0] - q[0], pt[1] - q[1]);
    if (d < best.d) best = { d, s: acc + L * t, pt };
    acc += L;
  }
  return best;
}
const lenOf = (P: XY[]) => { let a = 0; for (let i = 0; i + 1 < P.length; i++) a += Math.hypot(P[i + 1][0] - P[i][0], P[i + 1][1] - P[i][1]); return a; };
/** siniq chiziqning s0…s1 (m) oraligʻi */
function cutLine(P: XY[], s0: number, s1: number): XY[] {
  const out: XY[] = []; let acc = 0;
  const at = (i: number, s: number): XY => { const a = P[i], b = P[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, t = (s - acc) / L; return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; };
  for (let i = 0; i + 1 < P.length; i++) {
    const L = Math.hypot(P[i + 1][0] - P[i][0], P[i + 1][1] - P[i][1]), e = acc + L;
    if (e >= s0 && acc <= s1) {
      if (!out.length) out.push(s0 <= acc ? P[i] : at(i, s0));
      if (s1 < e) { out.push(at(i, s1)); return out; }
      out.push(P[i + 1]);
    }
    acc = e;
  }
  return out;
}

/** Ulash chegaralari (m): uch boshqa koʻchaga shuncha yaqin boʻlsa — tutashgan; shundan yaqin nuqtalar — bitta tugun */
export const WELD_TOL = 3, WELD_MERGE = 2;
/**
 * 25.11 (egasi: «yoʻllar bir-biriga ulanmayapti»): chiziqlar toʻplami → tarmoq (tugunlar va qirralar).
 * Avval faqat uchlari ≤ 2 m boʻlgan koʻchalar ulanardi; boshqa koʻchaning OʻRTASIGA tushgan uch (T-chorraha) va
 * bir-birini KESIB oʻtgan koʻchalar tugunsiz qolardi — xaritada ustma-ust, lekin chorrahasiz.
 *  1) uch boshqa chiziq koridori ichida (yarim eni + 1 m, kamida WELD_TOL): uch oʻsha chiziq oʻqiga yetkaziladi, chiziq shu
 *     joyda boʻlinadi — Master rejada koʻcha boshqa koʻchaning chetigacha chizilgan boʻlsa ham ulanadi;
 *  2) kesishuv (≥ 15°): ikkala chiziq kesishish nuqtasida boʻlinadi. Ikki OSM yoʻli — faqat `junc` (OSM dagi umumiy
 *     tugun) yonida: koʻprik va tunnel ostidan oʻtgan yoʻl chorraha emas;
 *  3) boʻlaklar: birinchisi oʻz id sini saqlaydi, keyingilari `id~1`, `id~2`…
 * Tugun id si — koordinatadan (≈ 1 m katak): koʻcha qoʻshilsa ham boshqa tugunlar id si oʻzgarmaydi.
 */
export function weld(raws: RawLine[], junc: LngLat[] = []): { nodes: MrNode[]; edges: MrEdge[] } {
  const nodes: MrNode[] = [], edges: MrEdge[] = [];
  const live = raws.filter(r => r.line.length >= 2);
  if (!live.length) return { nodes, edges };
  const o = live[0].line[0], kx = Math.cos(o[1] * rad) * rad * R, ky = rad * R;
  const xy = (p: LngLat): XY => [(p[0] - o[0]) * kx, (p[1] - o[1]) * ky], ll = (q: XY): LngLat => [o[0] + q[0] / kx, o[1] + q[1] / ky];
  // boʻlinish joylari NUQTA sifatida saqlanadi: chiziq uchi keyin surilsa ham (oʻz tutashuviga yetkazilsa) joyi oʻzgarmaydi
  const L = live.map(r => r.line.map(xy)), brk: XY[][] = live.map(() => []), J = junc.map(xy);
  const near = (a: XY, b: XY, d: number) => Math.hypot(a[0] - b[0], a[1] - b[1]) < d;
  // 1) uchlar: boshqa chiziq koridori ichida tugagan uch oʻsha chiziq oʻqiga yetkaziladi (oʻz yoʻnalishi boʻylab)
  // ikki oʻtish: birinchi oʻtishda surilgan uchga tayangan boshqa uchlar ikkinchisida joyiga tushadi
  for (let pass = 0; pass < 2; pass++) for (let i = 0; i < L.length; i++) for (const ei of [0, -1]) {
    const P = L[i], k = ei ? P.length - 1 : 0, kin = ei ? P.length - 2 : 1; let hit: { j: number; d: number; s: number; pt: XY; tol: number } | null = null;
    for (let j = 0; j < L.length; j++) {
      if (j === i) continue;
      const tol = touchTol(live[j].half), r = projOn(L[j], P[k]);
      if (r.d <= tol && (!hit || r.d / tol < hit.d / hit.tol)) hit = { j, ...r, tol };
    }
    if (!hit) continue;
    const Q = L[hit.j], T = lenOf(Q), E = P[k], I = P[kin], dl = Math.hypot(E[0] - I[0], E[1] - I[1]);
    if (hit.d > 0.05 && dl > 0.5) {   // oʻqqa perpendikulyar emas — koʻcha oʻz yoʻnalishida davom ettiriladi (yoki ortiqchasi kesiladi)
      const ux = (E[0] - I[0]) / dl, uy = (E[1] - I[1]) / dl, reach = hit.tol * 3; let best: { t: number; s: number; pt: XY } | null = null, sq = 0;
      for (let b = 0; b + 1 < Q.length; b++) {
        const q1 = Q[b], q2 = Q[b + 1], sx = q2[0] - q1[0], sy = q2[1] - q1[1], lq = Math.hypot(sx, sy), den = ux * sy - uy * sx;
        if (lq && Math.abs(den) / lq >= 0.26) {
          const t = ((q1[0] - E[0]) * sy - (q1[1] - E[1]) * sx) / den, u = ((q1[0] - E[0]) * uy - (q1[1] - E[1]) * ux) / den;
          if (u >= 0 && u <= 1 && Math.abs(t) <= reach && t > 0.5 - dl && (!best || Math.abs(t) < Math.abs(best.t))) best = { t, s: sq + lq * u, pt: [E[0] + ux * t, E[1] + uy * t] };
        }
        sq += lq;
      }
      if (best) { hit.s = best.s; hit.pt = best.pt; }
    }
    // qolgan qisqa «dum» (oʻz yarim enidan qisqa) — chorraha emas: uchlar birlashadi (burchak)
    const stub = Math.max(WELD_MERGE, live[i].half ?? 0);
    if (hit.s < stub) P[k] = Q[0];
    else if (hit.s > T - stub) P[k] = Q[Q.length - 1];
    else { P[k] = hit.pt; brk[hit.j].push(hit.pt); }
  }
  // 2) kesishuvlar
  for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
    const P = L[i], Q = L[j];
    for (let a = 0; a + 1 < P.length; a++) {
      const p1 = P[a], p2 = P[a + 1], r: XY = [p2[0] - p1[0], p2[1] - p1[1]], lp = Math.hypot(r[0], r[1]);
      for (let b = 0; b + 1 < Q.length; b++) {
        const q1 = Q[b], q2 = Q[b + 1], s: XY = [q2[0] - q1[0], q2[1] - q1[1]], lq = Math.hypot(s[0], s[1]), den = r[0] * s[1] - r[1] * s[0];
        if (lp && lq && Math.abs(den) / (lp * lq) >= 0.26) {
          const t = ((q1[0] - p1[0]) * s[1] - (q1[1] - p1[1]) * s[0]) / den, u = ((q1[0] - p1[0]) * r[1] - (q1[1] - p1[1]) * r[0]) / den;
          if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
            const X: XY = [p1[0] + r[0] * t, p1[1] + r[1] * t];
            const atEnd = [P[0], P[P.length - 1], Q[0], Q[Q.length - 1]].some(e => near(e, X, WELD_MERGE));
            const both = live[i].osm && live[j].osm;
            if (!atEnd && (!both || J.some(c => near(c, X, 1.5)))) { brk[i].push(X); brk[j].push(X); }
          }
        }
      }
    }
  }
  // 3) tugunlar va qirralar
  const node = (q: XY): string => {
    const f = nodes.find(n => near(xy(n.ll), q, WELD_MERGE)); if (f) return f.id;
    const p = ll(q); let id = `n${Math.round(p[1] * 1e5)}_${Math.round(p[0] * 1e5)}`;
    while (nodes.some(n => n.id === id)) id += 'x';
    nodes.push({ id, ll: p }); return id;
  };
  live.forEach((r, i) => {
    const P = L[i], T = lenOf(P), cuts: number[] = [0];
    for (const s of brk[i].map(q => projOn(P, q)).filter(r => r.d < WELD_MERGE).map(r => r.s).sort((a, b) => a - b)) if (s - cuts[cuts.length - 1] >= WELD_MERGE && T - s >= WELD_MERGE) cuts.push(s);
    cuts.push(T);
    let n = 0;
    for (let c = 0; c + 1 < cuts.length; c++) {
      const part = cutLine(P, cuts[c], cuts[c + 1]); if (part.length < 2) continue;
      const a = node(part[0]), b = node(part[part.length - 1]); if (a === b) continue;
      edges.push({ id: n ? `${r.id}~${n}` : r.id, a, b, preset: r.preset, ...(r.st ? { st: r.st } : {}), pts: part.slice(1, -1).map(q => { const p = ll(q); return [p[1], p[0]] as [number, number]; }), ...(r.name ? { name: r.name } : {}), ...(r.osm ? { osm: true as const } : {}) });
      n++;
    }
  });
  return { nodes, edges };
}

/**
 * Loyiha koʻchalari + OSM (har uch atrofidagi Overpass javobi) → tarmoq hujjati.
 * Uch OSM yoʻliga ≤ 45 m boʻlsa — uch yoʻl oʻqidagi tutashuv nuqtasiga koʻchadi; yoʻlning barcha tutashuvlar
 * oraligʻi va ikki chetidan ±80 m tarmoqqa tushadi (25.11: avval bitta yoʻlga tutashgan ikkinchi koʻcha ulanmay qolardi).
 * Soʻng hammasi `weld` bilan ulanadi: T-tutashuv, kesishuv va umumiy uchlar — chorraha tuguni.
 */
export function buildMrDoc(pid: string, name: string, streets: StreetIn[], osmAt: (end: LngLat) => OsmEl[] | null, join: (els: OsmEl[], end: LngLat, inn: LngLat) => { at: LngLat; main: [{ way: number }, unknown] } | null): MrDoc {
  const raws: RawLine[] = [], ways = new Map<number, { line: LngLat[]; tags: Record<string, string>; at: LngLat[] }>(), seen = new Set<OsmEl[]>();
  for (const s of streets) {
    const ax = s.axis.slice();
    for (const [ei, ii] of [[0, 1], [ax.length - 1, ax.length - 2]] as const) {
      const els = osmAt(ax[ei]); if (!els) continue;
      seen.add(els);
      const r = join(els, ax[ei], ax[ii]); if (!r) continue;
      const wid = r.main[0].way; let W = ways.get(wid);
      if (!W) {
        const w = els.find(e => e.type === 'way' && e.id === wid); if (!w?.nodes) continue;
        const nm = new Map<number, LngLat>(); for (const e of els) if (e.type === 'node' && e.lat != null && e.lon != null) nm.set(e.id, [e.lon, e.lat]);
        W = { line: w.nodes.map(id => nm.get(id)).filter((x): x is LngLat => !!x), tags: w.tags ?? {}, at: [] };
        if (W.line.length < 2) continue;
        ways.set(wid, W);
      }
      ax[ei] = r.at;   // uch yoʻl oʻqiga
      W.at.push(r.at);
    }
    const st = profileStrips(s.profile);
    raws.push({ id: `s_${s.id}`, line: ax, preset: 'custom', st, name: s.name, half: st.reduce((a, x) => a + x[1], 0) / 2 });
  }
  for (const [wid, W] of ways) {
    const o = W.line[0], kx = Math.cos(o[1] * rad) * rad * R, ky = rad * R;
    const P = W.line.map((p): XY => [(p[0] - o[0]) * kx, (p[1] - o[1]) * ky]), T = lenOf(P);
    const ss = W.at.map(p => projOn(P, [(p[0] - o[0]) * kx, (p[1] - o[1]) * ky]).s), mn = Math.min(...ss), mx = Math.max(...ss);
    // chetdagi 8 m dan qisqa qoldiq tarmoqqa tushmaydi (avvalgi qoida)
    const lo = mn - 80 > 0 ? mn - 80 : mn >= 8 ? 0 : mn, hi = mx + 80 < T ? mx + 80 : T - mx >= 8 ? T : mx;
    if (hi - lo < 1) continue;
    const part = cutLine(P, lo, hi); if (part.length < 2) continue;
    raws.push({ id: `o${wid}`, line: part.map((q): LngLat => [o[0] + q[0] / kx, o[1] + q[1] / ky]), preset: osmPreset(W.tags), ...(W.tags.name ? { name: W.tags.name } : {}), osm: true });
  }
  // OSM dagi haqiqiy chorrahalar: ikki va undan ortiq yoʻlga tegishli tugunlar
  const use = new Map<number, number>(), pos = new Map<number, LngLat>(), done = new Set<number>();
  for (const els of seen) for (const e of els) {
    if (e.type === 'node' && e.lat != null && e.lon != null) pos.set(e.id, [e.lon, e.lat]);
    else if (e.type === 'way' && e.nodes && !done.has(e.id)) { done.add(e.id); for (const n of new Set(e.nodes)) use.set(n, (use.get(n) ?? 0) + 1); }
  }
  const junc: LngLat[] = []; for (const [id, c] of use) if (c >= 2) { const p = pos.get(id); if (p) junc.push(p); }
  const { nodes, edges } = weld(raws, junc);
  return { pid, name, nodes, edges, at: Date.now() };
}

/** OSM uchun eng koʻp kutish (ms): javob boʻlmasa Tarmoq loyiha koʻchalari va hududi bilan baribir ochiladi */
export const OSM_WAIT = 25_000;

/**
 * 25.11 (egasi: «tarmoq sekinroq ochildi»): tashqi uchlar atrofidagi OSM yoʻllari — bitta Overpass soʻrovi, javobi shu
 * loyiha va shu uchlar uchun 7 kun brauzerda saqlanadi (`ks_osm@<loyiha>`). Koʻchalar uchi oʻzgarmagan boʻlsa Tarmoq va
 * Chorraha keyingi safar kutmasdan ochiladi. wait — kutish chegarasi (ms): oʻtib ketsa null (soʻrov fonda davom etib, keshga tushadi).
 */
const OSM_TTL = 7 * 864e5;
const endsKey = (ends: LngLat[]) => ends.map(e => `${e[0].toFixed(5)},${e[1].toFixed(5)}`).sort().join(';');
export async function osmEnds(pid: string, ends: LngLat[]): Promise<OsmEl[]>;
export async function osmEnds(pid: string, ends: LngLat[], wait: number): Promise<OsmEl[] | null>;
export async function osmEnds(pid: string, ends: LngLat[], wait?: number): Promise<OsmEl[] | null> {
  const key = `ks_osm@${pid}`, k = endsKey(ends);
  try { const c = JSON.parse(localStorage.getItem(key) || 'null') as { k: string; t: number; els: OsmEl[] } | null; if (c && c.k === k && Date.now() - c.t < OSM_TTL && Array.isArray(c.els)) return c.els; } catch { /* */ }
  const { overpass } = await import('../context/load'), N = await import('./node');
  const q = overpass(N.nodesQuery(ends, 50), fetch.bind(globalThis), () => {}).then(j => {
    const els = ((j as { elements?: OsmEl[] }).elements || []).map(e => (e.type === 'way' ? { type: e.type, id: e.id, nodes: e.nodes, tags: e.tags } : { type: e.type, id: e.id, lat: e.lat, lon: e.lon }) as OsmEl);
    try { localStorage.setItem(key, JSON.stringify({ k, t: Date.now(), els })); } catch { /* joy yoʻq — keshsiz */ }
    return els;
  });
  if (wait == null) return q;
  return Promise.race([q.catch(() => null), new Promise<null>(r => setTimeout(() => r(null), wait))]);
}

/** Koʻchasoz loyiha ichida ochilganda — OSM javobini oldindan (fonda) olib qoʻyish: «Tarmoq» bosilganda kutilmaydi */
export async function warmOsm(pid: string): Promise<void> {
  try {
    const { getProject } = await import('../storage/db'), doc = await getProject(pid);
    const P = await import('../core/profiles'); P.setUserProfiles(doc?.profiles ?? []);
    const st = (doc?.streets || []).filter(x => x.axis && x.axis.length >= 2), ends = outerEnds(st.map(x => ({ id: x.id, axis: x.axis, half: P.profileWidth(P.profileById(x.profile)) / 2 })));
    if (ends.length) await osmEnds(pid, ends);
  } catch { /* fon ishi — xato koʻrsatilmaydi */ }
}

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
        const sth = st.map((x, i) => ({ id: x.id, axis: x.axis, half: P.profileWidth(streets[i].profile) / 2 }));
        inner = innerEnds(sth);
        const ends = outerEnds(sth);
        if (ends.length) els = await osmEnds(pid, ends, OSM_WAIT);
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
