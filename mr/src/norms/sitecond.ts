/**
 * 12.11 (meʼyorlar toʻplami, 3-bosqich, 1-band): «Uchastka shartlari» tekshiruvlari.
 * Har bir kiritilgan raqam — alohida majburiy qoida (har ikki toʻplamda); boʻsh maydon qoida bermaydi.
 * Manba — foydalanuvchi yozgan hujjat va band (zonalash, GPZU/APZ, bayonnoma, brif).
 * Yon va orqa chegara: uchastkaning koʻcha qirrasiga tutashgan qoʻshni qirrasi — yon, tutashmagani — orqa (TALQIN);
 * koʻcha qirrasi yoʻq uchastkada barcha qoʻshni qirralar — yon.
 */
import type { Derived } from '../core/derive';
import type { Project } from '../core/doc';
import { bLevels } from '../core/levels';
import { frame, type XY } from '../core/geo';
import { computePlan } from '../core/plan';
import { edgeKinds } from '../core/setback';
import { profileById, profileWidth } from '../core/profiles';
import { closestSeg, needSeg, type Result, type Source, type Where } from './rules';
import type { SiteCond } from './sets';

const nm = (v: number, dg = 1) => (Math.round(v * 10 ** dg) / 10 ** dg).toString().replace('.', ',');
const SC_IDS = ['site-far', 'site-cover', 'site-h', 'site-sb-street', 'site-sb-side', 'site-sb-rear', 'site-gap', 'site-park', 'site-green'] as const;
export type SiteRuleId = typeof SC_IDS[number];
export const isSiteRule = (id: string): boolean => (SC_IDS as readonly string[]).includes(id);

function segDist(p: XY, a: XY, b: XY): { d: number; q: XY } {
  const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2)), q: XY = [a[0] + dx * t, a[1] + dy * t];
  return { d: Math.hypot(p[0] - q[0], p[1] - q[1]), q };
}

/** kiritilgan shartlar boʻyicha natijalar (boʻsh shart — natija yoʻq) */
export function siteCondResults(d: Derived, doc: Project): Result[] {
  const c: SiteCond | undefined = doc.settings.siteCond; if (!c) return [];
  const src: Source = { doc: c.src || 'Uchastka shartlari', clause: 'kiritilgan qiymat', edition: '—', verified: true };
  const out: Result[] = [], R = (id: SiteRuleId, title: string, r: Omit<Result, 'id' | 'title' | 'source'>) => out.push({ id, title, source: src, ...r });
  const fr = frame(doc.origin), bs = doc.buildings.filter(b => b.floors > 0), loc = new Map(bs.map(b => [b.id, b.footprint.map(fr.toLocal)]));
  const top = (b: Project['buildings'][number]) => bLevels(doc.settings, b).top;

  if (c.far !== undefined) {
    if (d.siteHa <= 0 || !bs.length) R('site-far', 'UMN (FAR) — uchastka sharti', { status: 'na', limit: `≤ ${nm(c.far, 2)}`, note: 'Uchastka yoki binolar yoʻq.' });
    else R('site-far', 'UMN (FAR) — uchastka sharti', { status: d.far <= c.far + 0.005 ? 'pass' : 'fail', value: d.far, digits: 2, limit: `≤ ${nm(c.far, 2)}`, delta: d.far > c.far ? (d.far / c.far - 1) * 100 : undefined,
      note: 'Barcha binolar yer usti qavatlari maydoni / butun uchastka (koʻchalar bilan).' });
  }
  if (c.cover !== undefined) {
    const v = d.gsi * 100;
    if (d.siteHa <= 0 || !bs.length) R('site-cover', 'Qurilish zichligi — uchastka sharti', { status: 'na', unit: '%', limit: `≤ ${nm(c.cover, 0)}`, note: 'Uchastka yoki binolar yoʻq.' });
    else R('site-cover', 'Qurilish zichligi — uchastka sharti', { status: v <= c.cover + 0.05 ? 'pass' : 'fail', value: v, digits: 1, unit: '%', limit: `≤ ${nm(c.cover, 0)}`, delta: v > c.cover ? (v / c.cover - 1) * 100 : undefined,
      note: 'Binolar qurilish dogʻi / uchastka maydoni.' });
  }
  if (c.hMax !== undefined) {
    const lim = c.hMax, bad = bs.filter(b => top(b) > lim + 0.05), hi = bs.reduce((m, b) => Math.max(m, top(b)), 0);
    if (!bs.length) R('site-h', 'Balandlik — uchastka sharti', { status: 'na', unit: 'm', limit: `≤ ${nm(lim)}`, note: 'Binolar yoʻq.' });
    else R('site-h', 'Balandlik — uchastka sharti', { status: bad.length ? 'fail' : 'pass', value: hi, digits: 1, unit: 'm', limit: `≤ ${nm(lim)}`, ...(bad.length ? { where: { bids: bad.map(b => b.id) } } : {}),
      note: bad.length ? `Shartdan baland binolar: ${bad.length}. Balandlik — yer sathidan eng yuqori qavat tom yopmasigacha.` : 'Balandlik — yer sathidan eng yuqori qavat tom yopmasigacha.' });
  }
  const plan = (c.sbStreet ?? c.sbSide ?? c.sbRear) !== undefined ? computePlan(doc) : null;
  if (c.sbStreet !== undefined && plan) {
    const need = c.sbStreet, bad: { id: string; d: number; seg: [XY, XY] }[] = []; let n = 0;
    if (!plan.corridors.length) R('site-sb-street', 'Koʻcha tomoni chekinishi — uchastka sharti', { status: 'na', unit: 'm', limit: `≥ ${nm(need)}`, note: 'Loyiha koʻchalari yoʻq — qizil chiziq maʼlum emas.' });
    else {
      for (const b of bs) { const r = loc.get(b.id)!; n++; let best: [XY, XY] | null = null, bd = Infinity;
        for (const poly of plan.corridors) for (const ring of poly) { const sg = closestSeg(r, ring), l = Math.hypot(sg[1][0] - sg[0][0], sg[1][1] - sg[0][1]); if (l < bd) { bd = l; best = sg; } }
        if (best && bd < need - 0.3) bad.push({ id: b.id, d: bd, seg: best }); }
      if (!n) R('site-sb-street', 'Koʻcha tomoni chekinishi — uchastka sharti', { status: 'na', unit: 'm', limit: `≥ ${nm(need)}`, note: 'Binolar yoʻq.' });
      else { const w = bad.reduce<typeof bad[number] | null>((a, x) => !a || x.d < a.d ? x : a, null);
        const where: Where | undefined = bad.length ? { bids: bad.map(x => x.id), segs: bad.map(x => x.seg), need: { segs: bad.map(x => needSeg(x.seg[1], x.seg[0], need)) } } : undefined;
        R('site-sb-street', 'Koʻcha tomoni chekinishi — uchastka sharti', { status: bad.length ? 'fail' : 'pass', value: bad.length, unit: `/ ${n} bino`, limit: `≥ ${nm(need)} m`, ...(where ? { where } : {}),
          note: `Binodan loyiha koʻchasi qizil chizigʻigacha.${w ? ` Eng yaqini ${nm(w.d)} m.` : ''}` }); }
    }
  }
  if ((c.sbSide !== undefined || c.sbRear !== undefined) && plan) {
    const streets = doc.streets.map(s => ({ axis: s.axis.map(fr.toLocal), w: profileWidth(profileById(s.profile)) }));
    const side: [XY, XY][] = [], rear: [XY, XY][] = [];
    for (const b of plan.blocks) {
      const ring = b.rings[0], ks = edgeKinds(ring, streets, doc.siteEdges ?? 'kocha'), anyK = ks.includes('kocha');
      ring.forEach((p, i) => { if (ks[i] !== 'qoshni') return; const e: [XY, XY] = [p, ring[(i + 1) % ring.length]];
        const adj = ks[(i + ring.length - 1) % ring.length] === 'kocha' || ks[(i + 1) % ring.length] === 'kocha'; (!anyK || adj ? side : rear).push(e); });
    }
    const chk = (id: SiteRuleId, title: string, edges: [XY, XY][], need: number | undefined, what: string) => {
      if (need === undefined) return;
      if (!edges.length) { R(id, title, { status: 'na', unit: 'm', limit: `≥ ${nm(need)}`, note: `${what} qoʻshni chegara qirrasi yoʻq (uchastka chetlari: Hajmlar → Qoʻshimcha sozlamalar → «Uchastka chetlari»).` }); return; }
      const bad: { id: string; d: number; seg: [XY, XY] }[] = []; let n = 0;
      for (const b of bs) { const r = loc.get(b.id)!; let best = { d: Infinity, p: r[0], q: r[0] }; n++;
        for (const [a, e] of edges) for (const p of r) { const x = segDist(p, a, e); if (x.d < best.d) best = { d: x.d, p, q: x.q }; }
        if (best.d < need - 0.3) bad.push({ id: b.id, d: best.d, seg: [best.p, best.q] }); }
      if (!n) { R(id, title, { status: 'na', unit: 'm', limit: `≥ ${nm(need)}`, note: 'Binolar yoʻq.' }); return; }
      const w = bad.reduce<typeof bad[number] | null>((a, x) => !a || x.d < a.d ? x : a, null);
      R(id, title, { status: bad.length ? 'fail' : 'pass', value: bad.length, unit: `/ ${n} bino`, limit: `≥ ${nm(need)} m`, ...(bad.length ? { where: { bids: bad.map(x => x.id), segs: bad.map(x => x.seg), need: { segs: bad.map(x => needSeg(x.seg[1], x.seg[0], need)) } } } : {}),
        note: `${what} qoʻshni chegara qirralari: ${edges.length}.${w ? ` Eng yaqini ${nm(w.d)} m.` : ''} Yon — koʻcha qirrasiga tutashgan, orqa — tutashmagan (TALQIN).` });
    };
    chk('site-sb-side', 'Yon tomoni chekinishi — uchastka sharti', side, c.sbSide, 'Yon');
    chk('site-sb-rear', 'Orqa tomoni chekinishi — uchastka sharti', rear, c.sbRear, 'Orqa');
  }
  if (c.gap !== undefined) {
    const need = c.gap, bad: { a: string; b: string; d: number; seg: [XY, XY] }[] = []; let n = 0;
    for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) {
      const A = loc.get(bs[i].id)!, B = loc.get(bs[j].id)!, sg = closestSeg(A, B), dd = Math.hypot(sg[1][0] - sg[0][0], sg[1][1] - sg[0][1]);
      if (dd < 0.5 || dd > need * 3 + 30) continue;   // tutash (bir bino seksiyalari) va uzoq juftlar hisobga olinmaydi
      n++; if (dd < need - 0.3) bad.push({ a: bs[i].id, b: bs[j].id, d: dd, seg: sg });
    }
    if (bs.length < 2) R('site-gap', 'Binolar orasi — uchastka sharti', { status: 'na', unit: 'juft', limit: `≥ ${nm(need)} m`, note: 'Binolar yoʻq.' });
    else { const w = bad.reduce<typeof bad[number] | null>((a, x) => !a || x.d < a.d ? x : a, null);
      R('site-gap', 'Binolar orasi — uchastka sharti', { status: bad.length ? 'fail' : 'pass', value: bad.length, unit: 'juft', limit: `≥ ${nm(need)} m`, ...(bad.length ? { where: { bids: [...new Set(bad.flatMap(x => [x.a, x.b]))], segs: bad.map(x => x.seg) } } : {}),
        note: `Tekshirilgan yaqin juftlar: ${n}; tutash binolar (oraliq < 0,5 m) hisobga olinmaydi.${w ? ` Eng yaqini ${nm(w.d)} m.` : ''}` }); }
  }
  if (c.parkMin !== undefined || c.parkMax !== undefined) {
    const lim = c.parkMin !== undefined && c.parkMax !== undefined ? `${nm(c.parkMin, 2)}–${nm(c.parkMax, 2)}` : c.parkMin !== undefined ? `≥ ${nm(c.parkMin, 2)}` : `≤ ${nm(c.parkMax!, 2)}`;
    if (d.apartments <= 0) R('site-park', 'Parkovka xonadonga — uchastka sharti', { status: 'na', unit: 'joy/xon.', limit: lim, note: 'Xonadonlar yoʻq.' });
    else { const v = d.parkingProv / d.apartments, lo = c.parkMin ?? -Infinity, hi = c.parkMax ?? Infinity;
      R('site-park', 'Parkovka xonadonga — uchastka sharti', { status: v >= lo - 0.005 && v <= hi + 0.005 ? 'pass' : 'fail', value: v, digits: 2, unit: 'joy/xon.', limit: lim,
        note: `Mavjud joylar ${Math.round(d.parkingProv)} / xonadonlar ${Math.round(d.apartments)}.` }); }
  }
  if (c.green !== undefined) {
    const v = d.greenShareTotal * 100;
    if (d.greenBase <= 0) R('site-green', 'Yashil ulush — uchastka sharti', { status: 'na', unit: '%', limit: `≥ ${nm(c.green, 0)}` });
    else R('site-green', 'Yashil ulush — uchastka sharti', { status: v >= c.green - 0.05 ? 'pass' : 'fail', value: v, digits: 1, unit: '%', limit: `≥ ${nm(c.green, 0)}`, delta: v < c.green ? (v / c.green - 1) * 100 : undefined,
      note: 'Yashil hudud (kvartallar va hovli maysasi) / turar joy zonasi — 86-band hisobi bilan bir xil.' });
  }
  return out;
}
