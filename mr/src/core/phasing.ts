/**
 * 12.11 (eski navbat, 6-band): qurilish navbatlarini taklif qilish. Norma: ShNQ 2.07.01-23, 195 va 410-bandlar (navbatlab qurish).
 * Usul (AMALIYOT, egasi tasdiqlagan — `claude/albom-boblar-kcap-06-11.md`, `claude/cheklovlar-navbat-narx-arxitektura.md` 6-boʻlim):
 *  1) infratuzilma birinchi — loyiha koʻchalari 1-navbatda (binolar navbatiga bogʻlanmaydi);
 *  2) har parselga kirish — mavjud koʻchadan yoki oldingi navbat koʻchasidan: tashqi chegaraga (mavjud koʻchaga) yaqin kvartallardan ichkariga;
 *  3) qurilish transporti aholi yashayotgan parsellar orqali oʻtmaydi — keyingi navbatlar oldingilarning ortida (ichkarida) emas, loyiha koʻchalari orqali;
 *  4) ijtimoiy obyektlar (maktab, MTM, poliklinika) uy bilan bir navbatda — 1-navbatda;
 *  5) har navbatda umumiy maydon (GFA) taxminan teng.
 * Kvartal — bir butun (bitta navbatda); kvartallar navbatlar sonidan kam boʻlsa — binolar alohida.
 */
import type { Project } from './doc';
import { frame, centroid, area, type XY } from './geo';
import { computePlan, pointIn } from './plan';
import { useDef } from './uses';

const segD = (p: XY, a: XY, b: XY) => { const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy, t = L ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L)) : 0; return Math.hypot(a[0] + dx * t - p[0], a[1] + dy * t - p[1]); };

export interface StagePlan { stage: Map<string, number>; groups: { ids: string[]; gfa: number; dist: number; social: boolean; stage: number }[] }

/** Binolarni n navbatga taqsimlash (n = 2…5) */
export function proposeStages(doc: Project, n: number): StagePlan {
  n = Math.max(1, Math.min(5, Math.round(n)));
  const fr = frame(doc.origin), plan = computePlan(doc), site = doc.site?.rings[0].map(fr.toLocal) ?? null;
  const bs = doc.buildings.filter(b => b.floors > 0);
  const byKey = new Map<string, typeof bs>();
  for (const b of bs) { const c = centroid(b.footprint.map(fr.toLocal)), bi = plan.blocks.findIndex(k => pointIn(c, k.rings)); const key = bi >= 0 ? `k${bi}` : `b${b.id}`; byKey.set(key, [...(byKey.get(key) ?? []), b]); }
  const edgeDist = (p: XY) => { if (!site) return 0; let m = Infinity; for (let i = 0; i < site.length; i++) m = Math.min(m, segD(p, site[i], site[(i + 1) % site.length])); return m; };
  // kvartallar navbatlar sonidan kam boʻlsa (masalan, butun uchastka bitta kvartal) — har bino alohida guruh
  let keys = [...byKey.values()];
  if (keys.filter(g => !g.every(b => useDef(b.use).group === 'Ijtimoiy')).length < n) keys = bs.map(b => [b]);
  const groups = keys.map(g => {
    const rs = g.map(b => b.footprint.map(fr.toLocal)), gfa = g.reduce((t, b, i) => t + Math.abs(area(rs[i])) * b.floors, 0);
    const dist = Math.min(...rs.flatMap(r => r.map(edgeDist)));
    const social = g.every(b => useDef(b.use).group === 'Ijtimoiy');
    return { ids: g.map(b => b.id), gfa, dist, social, stage: 1 };
  });
  const res = groups.filter(g => !g.social).sort((a, b) => a.dist - b.dist || b.gfa - a.gfa);
  const tot = res.reduce((t, g) => t + g.gfa, 0) || 1; let acc = 0;
  for (const g of res) { g.stage = Math.min(n, Math.floor((acc + g.gfa / 2) / (tot / n)) + 1); acc += g.gfa; }
  const stage = new Map<string, number>();
  for (const g of groups) for (const id of g.ids) { const b = bs.find(x => x.id === id)!; stage.set(id, useDef(b.use).group === 'Ijtimoiy' ? 1 : g.stage); }
  return { stage, groups };
}
