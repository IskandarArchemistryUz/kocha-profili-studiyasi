/**
 * 04.11 (Murad Buildings sinovi, 1-band — «generator oʻz chiqargan variantda meʼyorni buzadi»): generatsiyadan keyin meʼyoriy
 * qoidalarning oʻzi ishga tushiriladi va avtomatik (generatsiya qilingan) binolar tuzatiladi — qavat tushiriladi yoki seksiya
 * olib tashlanadi. Qoʻlda chizilgan va mavjud binolarga tegilmaydi. Hal boʻlmagan juftlar — izohda (sababi bilan).
 *
 *  - spacing-79 (ShNQ 2.07.01-23, 79-band, 2-jadval, 8-izoh): ustma-ust — kichigi olinadi; masofa yetmasa — balandrogʻi talabga
 *    yetguncha pasaytiriladi (talab Hmax ga mutanosib); 6 m dan yaqin — kichigi olinadi;
 *  - fire-56 (641, 642, 649, 652-bandlar, 56-jadval): talab balandlikka bogʻliq emas — kichigi olinadi;
 *  - redline-79 (79-band, 2-jadval: H × 0,25): qavat 4·d gacha tushiriladi, 3 qavatdan kam boʻlsa — olinadi;
 *  - street-overlap: koʻcha koridoriga tushgan avtomatik bino olinadi;
 *  - seismic-height (QMQ 2.01.03-19, 3.1-jadval): qavat chegaragacha.
 */
import type { Project } from './doc';
import { apply } from './commands';
import { spacingIssues, type SpacingPair } from './spacing';
import { firePairs } from './firedist';
import { bLevels } from './levels';
import { frame, area, type XY } from './geo';
import { computePlan } from './plan';
import { derive, polyDist } from './derive';
import { useDef } from './uses';
import { heightLimit, tallMax, checkBlock, jointOpt } from './seysmik';

type B = Project['buildings'][number];
export interface RepairResult { doc: Project; lowered: number; removed: number; joints: number; left: string[]; notes: string[] }

/** spacing-79 qoidasida «mos emas» hisoblanadigan juftlar (norms/rules.ts bilan bir xil tanlov) */
export function failingSpacing(doc: Project): SpacingPair[] {
  return spacingIssues(doc).pairs.filter(p => p.kind === 'ustma-ust' || p.kind === 'uzun' || p.kind === 'yakka' || (p.kind === 'uzun-torets' && !p.red) || (p.kind === 'torets' && !p.red && p.d < p.need - 0.5));
}

/** H ≤ maxH boʻladigan eng koʻp qavat (bLevels boʻyicha: 1-qavat balandligi, stilobat va h.k. hisobga olinadi) */
function floorsUnder(doc: Project, b: B, maxH: number): number {
  let f = b.floors;
  while (f > 1 && bLevels(doc.settings, { ...b, floors: f }).top > maxH + 0.05) f--;
  return f;
}

export function repairGen(doc0: Project, opts: { grps?: Set<string>; maxIter?: number } = {}): RepairResult {
  let doc = doc0; let lowered = 0, removed = 0;
  const mine = (id: string): B | null => { const b = doc.buildings.find(x => x.id === id); return b && b.gen && b.gen.kind !== 'arka' && (!opts.grps || opts.grps.has(b.gen.grp)) ? b : null; };
  const areaOf = (b: B) => { const fr = frame(doc.origin); return Math.abs(area(b.footprint.map(fr.toLocal))); };
  const H = (b: B) => bLevels(doc.settings, b).top;
  const del = (b: B) => { doc = apply(doc, { type: 'removeBuilding', id: b.id }); removed++; };
  const setF = (b: B, f: number) => { if (f >= b.floors) return false; doc = apply(doc, { type: 'updateBuilding', id: b.id, patch: { floors: f, gen: b.gen } }); lowered++;   /* gen bilan — «qoʻlda tahrirlangan» belgisi qoʻyilmaydi */ return true; };
  let left: string[] = [];
  // 0) seysmik boʻlma (QMQ 2.01.03-19, 3.1-jadval, 3.1.1): uzun yoki chiqib turgan bino — chok bilan tuzatilsa, chok qoʻyiladi («Antiseysmik chok» tugmasi kabi)
  let joints = 0;
  { const sys = doc.settings.construct ?? 'monolit', ball = doc.settings.seismic, fr0 = frame(doc.origin), ok = (c: ReturnType<typeof checkBlock>) => c.lenOk && c.projOk;
    for (const b0 of doc.buildings) { const b = mine(b0.id); if (!b || b.joint || b.gen?.kind === 'stilobat') continue; const r = b.footprint.map(fr0.toLocal) as XY[];
      if (!ok(checkBlock(r, sys, ball)) && ok(checkBlock(r, sys, ball, true, jointOpt(b, doc.buildings, fr0.toLocal, sys)))) { doc = apply(doc, { type: 'updateBuilding', id: b.id, patch: { joint: true, gen: b.gen } }); joints++; } } }
  for (let it = 0; it < (opts.maxIter ?? 8); it++) {
    let changed = false; left = [];
    const gone = new Set<string>();
    const pick = (ids: string[]) => ids.map(mine).filter((b): b is B => !!b && !gone.has(b.id));
    // 1) koʻcha koridori
    for (const x of derive(doc).streetOverlap) { const b = pick([x.bid])[0]; if (b) { del(b); gone.add(b.id); changed = true; } else left.push('street-overlap'); }
    // 2) seysmik balandlik (3.1-jadval)
    const lim = heightLimit(doc.settings.construct ?? 'monolit', doc.settings.seismic);
    // 04.11: monolit — ShNQ 2.01.06-25 (≤ 100 m, alohida seysmik hisob — «koʻrib chiqish»); boshqa tizimlar — 3.1-jadval
    const tm = tallMax(doc.settings.construct ?? 'monolit');
    if (lim?.f != null) for (const b of doc.buildings) { const m = pick([b.id])[0]; if (!m || m.gen?.kind === 'stilobat') continue; const capF = tm != null ? floorsUnder(doc, m, tm) : Math.min(lim.f - (m.z0 ?? 0), lim.h != null ? floorsUnder(doc, m, lim.h) : m.floors); if (m.floors > capF && capF >= 1) { if (setF(m, capF)) changed = true; } }
    // 3) binolar orasi (79-band)
    for (const p of failingSpacing(doc)) {
      const c = pick([p.a, p.b]); if (!c.length) { left.push('spacing-79'); continue; }
      if (p.kind === 'ustma-ust' || p.need <= 6.01 || p.d < 6 - 0.05) { const s = c.reduce((a, b) => (areaOf(b) < areaOf(a) ? b : a)); del(s); gone.add(s.id); changed = true; continue; }
      const t = c.reduce((a, b) => (H(b) > H(a) ? b : a)), Hmax = Math.max(p.ha, p.hb), target = Hmax * (p.d / p.need) - 0.1;
      const f = floorsUnder(doc, t, target);
      if (f >= 3 && setF(t, f)) { gone.add(t.id); changed = true; } else { del(t); gone.add(t.id); changed = true; }
    }
    // 4) yongʻin masofasi (56-jadval) — talab balandlikka bogʻliq emas
    for (const p of firePairs(doc).pairs) {
      const c = pick([p.a, p.b]); if (!c.length) { left.push('fire-56'); continue; }
      const s = c.reduce((a, b) => (areaOf(b) < areaOf(a) ? b : a)); del(s); gone.add(s.id); changed = true;
    }
    // 5) qizil chiziqqacha H × 0,25 (3+ qavatli turar joy)
    const plan = computePlan(doc), fr = frame(doc.origin);
    if (plan.corridors.length) for (const b0 of doc.buildings) {
      const b = pick([b0.id])[0]; if (!b || b.floors < 3 || useDef(b.use).res <= 0) continue;
      const r = b.footprint.map(fr.toLocal) as XY[]; let d = Infinity; for (const poly of plan.corridors) d = Math.min(d, polyDist(r, poly));
      if (!Number.isFinite(d) || d >= H(b) * 0.25 - 0.3) continue;
      const f = floorsUnder(doc, b, 4 * d - 0.1);
      if (f >= 3 && setF(b, f)) { gone.add(b.id); changed = true; } else { del(b); gone.add(b.id); changed = true; }
    }
    if (!changed) break;
  }
  const notes: string[] = [];
  if (joints) notes.push(`Meʼyorga moslash: ${joints} ta binoga antiseysmik chok qoʻyildi (QMQ 2.01.03-19, 3.1-jadval: boʻlma uzunligi va chiqib turgan qism)`);
  if (lowered) notes.push(`Meʼyorga moslash: ${lowered} ta seksiyaning qavati pasaytirildi (79-band 2-jadval: binolar orasi ≥ 2·Hmax, qizil chiziqqacha H × 0,25; QMQ 2.01.03-19, 3.1-jadval)`);
  if (removed) notes.push(`Meʼyorga moslash: ${removed} ta seksiya olib tashlandi (ustma-ust, 6 m dan yaqin, yongʻin masofasi — 56-jadval, yoki koʻcha koridorida)`);
  const lc = [...new Set(left)];
  if (lc.length) notes.push(`Avtomatik tuzatilmadi (qoʻlda chizilgan yoki mavjud binolar orasida): ${lc.join(', ')}`);
  return { doc, lowered, removed, joints, left: lc, notes };
}
