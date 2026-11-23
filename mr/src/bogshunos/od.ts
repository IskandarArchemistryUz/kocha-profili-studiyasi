/**
 * Bogʻshunos — manba va manzillar (OD) qoidalar bilan: qoʻlda koordinata yoʻq.
 * Tashqi (attr):
 *  · metro kirishi — chegaradan ≤ 900 m eng yaqini, vazn 5 (T);
 *  · avtobus bekatlari — ≤ 320 m, vazn 1,2 (T);
 *  · turar joy — GHS-POP katakchalari, chegaradan 60–700 m, 8 sektor (45°) boʻyicha; ulushi ≥ 8 % boʻlgan sektor → aholi ogʻirlik
 *    markazi, vazn 1,5 + 1,5 · ulush / eng katta ulush (T, Python prototipda 2,5–3,0);
 *  · ijtimoiy obyektlar (shifoxona, poliklinika, universitet, maktab) — ≤ 500 m, 200 m ichida klaster, vazn 1 + 0,3 · n (≤ 2,5) (T).
 * Ichki (inner):
 *  · koʻl terrasasi (suvga ≤ 40 m bino oldida) — 3; amfiteatr (suvga qaragan 8–25 % qiyalik) — 2;
 *  · mavjud bolalar maydonchalari — 3; mavjud sport maydonlari — 2; bogʻ ichidagi kafe/restoran yoki eng katta bino — 1,5.
 */
import type { BgData, BgFeat, MPoly, XY } from './types';
import type { Ctx } from './analyze';
import { distance, distLine, ptInPoly, strokeLine } from './grid';
import { amphitheatre, terrace, type Attr } from './design';

const cen = (f: BgFeat): XY => { const g = f.kind === 'pg' ? (f.g as MPoly)[0][0] : (f.g as XY[]); let x = 0, y = 0; for (const p of g) { x += p[0]; y += p[1]; } return [x / g.length, y / g.length]; };
const SECT = ['sharq', 'shimoli-sharq', 'shimol', 'shimoli-gʻarb', 'gʻarb', 'janubi-gʻarb', 'janub', 'janubi-sharq'];

export function targets(C: Ctx, data: BgData): { attr: Attr[]; inner: Attr[]; why: string[] } {
  const B = C.boundary, ring = [...B, B[0]], inS = (p: XY) => ptInPoly(p, [B]), dB = (p: XY) => (inS(p) ? 0 : distLine(p, ring));
  const attr: Attr[] = [], inner: Attr[] = [], why: string[] = [];
  // metro
  const metro = data.osm.filter(f => f.v === 'subway_entrance' || (f.k === 'railway' && f.v === 'station')).map(f => ({ f, d: dB(cen(f)) })).filter(x => x.d <= 900).sort((a, b) => a.d - b.d)[0];
  if (metro) { attr.push({ name: `Metro «${metro.f.name ?? ''}»`, p: cen(metro.f), w: 5 }); why.push(`metro: ${Math.round(metro.d)} m`); }
  // bekatlar
  // bir nomli platformalar (ikki tomon, bir necha marshrut) 150 m ichida bitta bekat sifatida birlashtiriladi
  const st: { name: string; p: XY; n: number }[] = [];
  for (const f of data.osm.filter(f => f.k === 'highway' && f.v === 'bus_stop')) { const p = cen(f); if (dB(p) > 320) continue; const nm = f.name ?? ''; const s = st.find(q => q.name === nm && Math.hypot(q.p[0] - p[0], q.p[1] - p[1]) < 150); if (s) { s.p = [(s.p[0] * s.n + p[0]) / (s.n + 1), (s.p[1] * s.n + p[1]) / (s.n + 1)]; s.n++; } else st.push({ name: nm, p, n: 1 }); }
  for (const s of st) attr.push({ name: `Bekat «${s.name}»`, p: s.p, w: 1.2 });
  // turar joy sektorlari
  let cx = 0, cy = 0; for (const p of B) { cx += p[0]; cy += p[1]; } cx /= B.length; cy /= B.length;
  const sec = Array.from({ length: 8 }, () => ({ n: 0, x: 0, y: 0 })); let tot = 0;
  for (const c of data.pop) { const d = dB(c.p); if (d < 60 || d > 700) continue; const a = Math.atan2(c.p[1] - cy, c.p[0] - cx), s = ((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8; sec[s].n += c.n; sec[s].x += c.p[0] * c.n; sec[s].y += c.p[1] * c.n; tot += c.n; }
  const mx = Math.max(...sec.map(s => s.n));
  sec.forEach((s, i) => { const sh = s.n / (tot || 1); if (sh >= 0.08) { attr.push({ name: `Turar joy (${SECT[i]})`, p: [s.x / s.n, s.y / s.n], w: Math.round((1.5 + 1.5 * s.n / mx) * 10) / 10 }); why.push(`turar joy ${SECT[i]}: ${Math.round(s.n)} kishi (${Math.round(sh * 100)} %)`); } });
  // ijtimoiy obyektlar — klaster
  const soc = data.osm.filter(f => f.k === 'amenity' && ['hospital', 'clinic', 'university', 'college', 'school'].includes(f.v) && (f.kind === 'pt' || f.kind === 'pg')).map(f => ({ f, p: cen(f) })).filter(x => { const d = dB(x.p); return d > 0 && d <= 500; });
  const cl: { p: XY; n: number; names: string[] }[] = [];
  for (const s of soc) { const c = cl.find(q => Math.hypot(q.p[0] - s.p[0], q.p[1] - s.p[1]) < 200); if (c) { c.p = [(c.p[0] * c.n + s.p[0]) / (c.n + 1), (c.p[1] * c.n + s.p[1]) / (c.n + 1)]; c.n++; c.names.push(s.f.name ?? ''); } else cl.push({ p: s.p, n: 1, names: [s.f.name ?? ''] }); }
  for (const c of cl) attr.push({ name: `Ijtimoiy: ${c.names.filter(Boolean).slice(0, 2).join(', ') || c.names.length + ' obyekt'}`, p: c.p, w: Math.min(2.5, 1 + 0.3 * c.n) });
  // ichki manzillar
  const G = C.G, dW = distance(G, C.water), bigRpa = G.u8(); for (const t of C.trees) if (t.d >= 40) strokeLine(G, bigRpa, [t.p, t.p], 2 * t.rpa);
  const ter = terrace(C, dW); if (ter) inner.push({ name: 'Koʻl terrasasi', p: ter.c, w: 3 });
  const am = amphitheatre(C, dW, bigRpa, G.u8()); if (am) inner.push({ name: 'Amfiteatr', p: am.c, w: 2 });
  C.playgrounds.forEach((p, i) => inner.push({ name: `Bolalar maydoni ${i + 1}`, p: ringC(p[0][0]), w: 3 }));
  C.pitches.forEach((p, i) => inner.push({ name: `Sport ${i + 1}`, p: ringC(p[0][0]), w: 2 }));
  const cafes = data.osm.filter(f => f.k === 'amenity' && ['cafe', 'restaurant'].includes(f.v) && inS(cen(f)));
  if (cafes.length) cafes.forEach(f => inner.push({ name: `Kafe «${f.name ?? ''}»`, p: cen(f), w: 1.5 }));
  else if (C.blds.length) { const b = [...C.blds].sort((a, b2) => ar(b2[0][0]) - ar(a[0][0]))[0]; inner.push({ name: 'Asosiy bino', p: ringC(b[0][0]), w: 1.5 }); }
  return { attr, inner, why };
}
const ringC = (r: XY[]): XY => { let x = 0, y = 0; for (const p of r) { x += p[0]; y += p[1]; } return [x / r.length, y / r.length]; };
const ar = (r: XY[]) => { let a = 0; for (let k = 0; k < r.length; k++) { const p = r[k], q = r[(k + 1) % r.length]; a += p[0] * q[1] - q[0] * p[1]; } return Math.abs(a / 2); };
