/**
 * 25.11 (egasi: «chorrahada master reja chorrahasi ochilmadi»): Koʻchasoz C (Chorraha) uchun LOYIHA ICHIDAGI chorrahalar.
 * Avval C faqat loyiha koʻchasi uchi mavjud OSM yoʻliga tutashgan joyni olardi; loyiha koʻchalari oʻzaro kesishgan
 * yoki tutashgan chorraha (Master rejada chizilgani) umuman ochilmasdi.
 *
 * Loyiha koʻchalari `weld` (totarmoq.ts) bilan tarmoqqa ulanadi — Tarmoq (A) dagi aynan oʻsha tugunlar; har ≥ 3 tarmoqli
 * tugun `findNode` (node.ts) qoidasi bilan oʻqiladi: asosiy koʻcha — yuqori toifa va eng toʻgʻri juft, kesishuvchi — qolgani,
 * burchak va yoʻq tarmoq (T-chorraha) — haqiqiy geometriyadan. OSM soʻrovi kerak emas.
 */
import { weld, type RawLine } from './totarmoq';
import { findNode, type LL, type NodeResult, type OsmEl } from './node';

export interface ProjStreet { id: string; axis: LL[]; cat: string; half?: number }
/** main / cross — loyiha koʻchasi id lari (asosiy va kesishuvchi) */
export interface ProjNode { r: NodeResult; main: string; cross: string }

/** Master reja toifasi → findNode darajasi (OSM toifasi orqali): magistral asosiy koʻcha boʻladi */
const HW: Record<string, string> = { 'shahar-magistral-3': 'secondary', 'tuman-magistral': 'tertiary', mahalliy: 'residential', otish: 'living_street', piyoda: 'living_street' };

/** Loyiha ichidagi chorrahalar: koʻp tarmoqlisi va yuqori toifalisi birinchi */
export function projectNodes(streets: ProjStreet[]): ProjNode[] {
  const raws: RawLine[] = streets.filter(s => s.axis.length >= 2).map(s => ({ id: `s_${s.id}`, line: s.axis.slice(), preset: 'custom', half: s.half }));
  const { nodes, edges } = weld(raws);
  const sidOf = (eid: string) => eid.slice(2).replace(/~\d+$/, ''), cat = new Map(streets.map(s => [s.id, s.cat]));
  const els: OsmEl[] = [], nid = new Map<string, number>(); let seq = 1;
  for (const n of nodes) { const id = seq++; nid.set(n.id, id); els.push({ type: 'node', id, lon: n.ll[0], lat: n.ll[1] }); }
  const wsid = new Map<number, string>();
  edges.forEach((e, i) => {
    const mid = (e.pts ?? []).map(p => { const id = seq++; els.push({ type: 'node', id, lon: p[1], lat: p[0] }); return id; });
    const sid = sidOf(e.id);
    wsid.set(i + 1, sid);
    els.push({ type: 'way', id: i + 1, nodes: [nid.get(e.a)!, ...mid, nid.get(e.b)!], tags: { highway: HW[cat.get(sid) ?? ''] ?? 'residential', name: sid } });
  });
  const out: ProjNode[] = [];
  for (const n of nodes) {
    if (edges.filter(e => e.a === n.id || e.b === n.id).length < 3) continue;
    const r = findNode(els, n.ll, 1); if (!r || !r.cross[0]) continue;
    out.push({ r, main: wsid.get(r.main[0].way)!, cross: wsid.get(r.cross[0].way)! });
  }
  return out.sort((a, b) => b.r.arms.length - a.r.arms.length || b.r.main[0].rank - a.r.main[0].rank);
}
