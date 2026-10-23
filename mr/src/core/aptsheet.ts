/**
 * 20-band: «Qavat rejasi» varagʻi — ish chizmalaridagidek: bitta varaqda bitta qavat (yoki bir xil qavatlar guruhi) rejasi,
 * kvartiralar raqamlangan; oʻng ustunda navigatsiya sxemalari (master reja — daha va bino belgilangan; daha sxemasi —
 * bino belgilangan) va kvartiralar eksplikatsiyasi jadvali. Sxemalar reja bilan bir xil burilishda (shimol strelkasi bilan).
 */
import { obb2, centroid, type XY } from './geo';
import { frame } from './geo';
import type { Project } from './doc';
import type { SecPlan } from './apartments';
import { computePlan, pointIn } from './plan';
import { floorPlanSvg, floorGroups, groupName, APT_FILL, type PlanOpts } from './floorplan';
import type { LegendItem } from './sheet';
import type { Bal } from './facade';

export interface AptSheet { name: string; label: string; legend: LegendItem[]; rows: { n: number; rooms: number; area: number }[]; body: (vx: number, vy: number, vw: number, vh: number) => string }

const n2 = (v: number) => v.toFixed(2);
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const fm = (v: number, d = 1) => v.toFixed(d).replace('.', ',');

/** Qaysi qavat guruhi: berilmasa — turar (typical) guruh */
export function sheetGroup(pl: SecPlan, gi?: number): { gi: number; from: number; to: number } {
  const gs = floorGroups(pl), def = Math.max(0, gs.findIndex(g => g.type === 'typical'));
  const i = gi != null && gi >= 0 && gi < gs.length ? gi : def;
  return { gi: i, from: gs[i].from, to: gs[i].to };
}

export function aptSheet(doc: Project, plans: SecPlan[], bi: number, gi: number | undefined, look: 'rang' | 'bir', tr: (s: string) => string, opt: (pl: SecPlan) => { fh?: number; bal?: Bal | null } = () => ({})): AptSheet {
  const pl = plans[bi], G = sheetGroup(pl, gi), nFl = G.to - G.from + 1;
  const name = `${bi + 1}-bino · ${groupName(G)}`;
  const U = obb2(pl.ring).U, V: XY = [-U[1], U[0]], T = (p: XY): XY => [p[0] * U[0] + p[1] * U[1], p[0] * V[0] + p[1] * V[1]];
  const northDeg = Math.atan2(U[0], U[1]) * 180 / Math.PI;
  const fr = frame(doc.origin), site = doc.site?.rings.map(r => r.map(fr.toLocal)) ?? [];
  const blds = doc.buildings.map(b => ({ id: b.id, r: b.footprint.map(fr.toLocal) }));
  const plan = computePlan(doc), c0 = centroid(pl.ring), blk = plan.blocks.find(b => pointIn(c0, b.rings)) ?? null;
  const own = new Set(plans.filter(p => p.bid === pl.bid).map(() => pl.bid));
  // reja (bitta qavat) — kvartiralar raqamli
  const base: PlanOpts = { scale: 100, dims: true, title: '', floor: G.from, num: true, ...opt(pl) };
  const probe = floorPlanSvg(pl, base), rows = probe.apts.map((a, i) => ({ n: i + 1, rooms: a.rooms, area: a.area }));
  const legend: LegendItem[] = look === 'bir' ? [] : [1, 2, 3, 4].filter(k => rows.some(r => Math.min(4, r.rooms) === k)).map(k => ({ type: 'fill' as const, fill: APT_FILL[k], label: `${k} ${tr('xonali')}` }));
  let label = 'M 1:100';

  /** sxema: halqalar burilgan holda qutiga sigʻdiriladi */
  const scheme = (x: number, y: number, w: number, h: number, focus: XY[][], layers: { rings: XY[][]; fill: string; stroke: string; sw: number }[]): string => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const r of focus) for (const p of r) { const q = T(p); x0 = Math.min(x0, q[0]); y0 = Math.min(y0, q[1]); x1 = Math.max(x1, q[0]); y1 = Math.max(y1, q[1]); }
    if (!isFinite(x0)) return '';
    const pad = 3, k = Math.min((w - 2 * pad) / (x1 - x0 || 1), (h - 2 * pad) / (y1 - y0 || 1));
    const ox = x + (w - (x1 - x0) * k) / 2, oy = y + (h - (y1 - y0) * k) / 2;
    const P = (p: XY) => { const q = T(p); return `${n2(ox + (q[0] - x0) * k)} ${n2(oy + (y1 - q[1]) * k)}`; };
    const d = (rs: XY[][]) => rs.map(r => r.map((p, i) => `${i ? 'L' : 'M'}${P(p)}`).join('') + 'Z').join('');
    const out = [`<rect x="${n2(x)}" y="${n2(y)}" width="${n2(w)}" height="${n2(h)}" fill="#ffffff" stroke="#b9b5ab" stroke-width="0.25"/>`, `<clipPath id="cp${Math.round(x * 10)}_${Math.round(y * 10)}"><rect x="${n2(x)}" y="${n2(y)}" width="${n2(w)}" height="${n2(h)}"/></clipPath><g clip-path="url(#cp${Math.round(x * 10)}_${Math.round(y * 10)})">`];
    for (const L of layers) if (L.rings.length) out.push(`<path d="${d(L.rings)}" fill="${L.fill}" stroke="${L.stroke}" stroke-width="${L.sw}" fill-rule="evenodd"/>`);
    out.push('</g>');
    // shimol strelkasi (reja burilishiga mos)
    const ax = x + w - 4.5, ay = y + 5;
    out.push(`<g transform="translate(${n2(ax)} ${n2(ay)}) rotate(${n2(-northDeg)})"><path d="M0 -3L1.3 1.6L0 0.8L-1.3 1.6Z" fill="#1d1d1b"/><text y="-3.6" font-size="2" text-anchor="middle" fill="#1d1d1b">N</text></g>`);
    return out.join('');
  };

  const body = (vx: number, vy: number, vw: number, vh: number): string => {
    const cw = Math.max(62, Math.min(105, vw * 0.3)), gap = 6, mw = vw - cw - gap, out: string[] = [];
    // reja masshtabi: eng yirigi (sigʻadigani)
    let res = probe, sc = 100;
    for (const s of [50, 100, 200, 500, 1000]) { const r = s === 100 ? probe : floorPlanSvg(pl, { ...base, scale: s }); sc = s; res = r; if (r.widthMm <= mw && r.heightMm <= vh) break; }
    label = `M 1:${sc}`;
    let svg = res.svg.replace(/^<\?xml[^>]*>\s*/, '');
    if (look === 'bir') for (const c of Object.values(APT_FILL)) svg = svg.split(c).join('#ffffff');
    const k = Math.min(1, mw / res.widthMm, vh / res.heightMm), ww = res.widthMm * k, hh = res.heightMm * k;
    out.push(svg.replace(/^<svg /, `<svg x="${n2(vx + (mw - ww) / 2)}" y="${n2(vy + (vh - hh) / 2)}" `).replace(/width="[\d.]+mm" height="[\d.]+mm"/, `width="${n2(ww)}" height="${n2(hh)}"`));
    // ajratuvchi chiziq va oʻng ustun
    const x = vx + mw + gap / 2; out.push(`<path d="M${n2(x)} ${n2(vy)}V${n2(vy + vh)}" stroke="#d9d6cf" stroke-width="0.25"/>`);
    const cx = vx + mw + gap; let y = vy;
    const head = (t: string) => { out.push(`<text x="${n2(cx)}" y="${n2(y + 3)}" font-size="2.8" font-weight="700" fill="#1d1d1b">${esc(t)}</text>`); y += 5; };
    const sh = Math.min(cw * 0.62, (vh - 60) / 2);
    head(tr('Vaziyat sxemasi'));
    const all = [...site, ...plan.blocks.flatMap(b => b.rings), ...blds.map(b => b.r)];
    out.push(scheme(cx, y, cw, sh, all.length ? all : [pl.ring], [
      { rings: site, fill: '#f6f4ef', stroke: '#8e8a82', sw: 0.3 },
      { rings: plan.blocks.flatMap(b => b.rings), fill: '#ffffff', stroke: '#c9c5bc', sw: 0.2 },
      { rings: blk?.rings ?? [], fill: '#cfcac0', stroke: '#6b6760', sw: 0.35 },
      { rings: blds.map(b => b.r), fill: '#e2dfd8', stroke: '#9a958c', sw: 0.15 },
      { rings: [pl.ring], fill: '#1d1d1b', stroke: '#1d1d1b', sw: 0.2 },
    ]));
    y += sh + 2;
    out.push(`<text x="${n2(cx)}" y="${n2(y + 2)}" font-size="2.1" fill="#6b6965">${esc(tr('daha — kulrang, bino — qora'))}</text>`); y += 6;
    head(blk ? tr('Daha sxemasi') : tr('Bino sxemasi'));
    const inBlk = blk ? blds.filter(b => pointIn(centroid(b.r), blk.rings)) : blds.filter(b => b.id === pl.bid);
    out.push(scheme(cx, y, cw, sh, blk ? blk.rings : [pl.ring], [
      { rings: blk?.rings ?? [], fill: '#f6f4ef', stroke: '#8e8a82', sw: 0.3 },
      { rings: inBlk.filter(b => b.id !== pl.bid && !own.has(b.id)).map(b => b.r), fill: '#ffffff', stroke: '#6b6760', sw: 0.25 },
      { rings: [pl.ring], fill: '#1d1d1b', stroke: '#1d1d1b', sw: 0.25 },
    ]));
    y += sh + 2;
    out.push(`<text x="${n2(cx)}" y="${n2(y + 2)}" font-size="2.1" fill="#6b6965">${esc(`${bi + 1}-bino · ${groupName(G)}`)}</text>`); y += 7;
    // eksplikatsiya
    head(tr('Kvartiralar eksplikatsiyasi'));
    const cols = [0, 9, 26, cw], rh = 4.2;
    const row = (cells: string[], bold = false, fill = '') => {
      if (fill) out.push(`<rect x="${n2(cx)}" y="${n2(y)}" width="${n2(cw)}" height="${rh}" fill="${fill}"/>`);
      cells.forEach((c, i) => out.push(`<text x="${n2(cx + (i === 3 ? cw - 1 : cols[i] + 1))}" y="${n2(y + 3)}" font-size="2.3"${bold ? ' font-weight="700"' : ''}${i === 3 ? ' text-anchor="end"' : ''} fill="#1d1d1b">${esc(c)}</text>`));
      out.push(`<path d="M${n2(cx)} ${n2(y + rh)}H${n2(cx + cw)}" stroke="#b9b5ab" stroke-width="0.2"/>`); y += rh;
    };
    out.push(`<path d="M${n2(cx)} ${n2(y)}H${n2(cx + cw)}" stroke="#1d1d1b" stroke-width="0.35"/>`);
    row(['№', tr('Turi'), tr('Maydoni, m²'), ''], true, '#f3f1ec');
    const maxRows = Math.max(1, Math.floor((vy + vh - y - 3 * rh) / rh));
    rows.slice(0, maxRows).forEach(r => {
      if (look !== 'bir') out.push(`<rect x="${n2(cx + cw - 4.6)}" y="${n2(y + 0.9)}" width="3.6" height="2.4" fill="${APT_FILL[Math.min(4, r.rooms)]}" stroke="#141414" stroke-width="0.15"/>`);
      row([String(r.n), `${r.rooms} ${tr('xonali')}`, fm(r.area), '']);
    });
    if (rows.length > maxRows) row([`… +${rows.length - maxRows}`, '', '', '']);
    const tot = rows.reduce((t, r) => t + r.area, 0);
    out.push(`<path d="M${n2(cx)} ${n2(y)}H${n2(cx + cw)}" stroke="#1d1d1b" stroke-width="0.35"/>`);
    row([tr('Jami'), `${rows.length} ${tr('kvartira')}`, fm(tot), ''], true);
    if (nFl > 1) row([`× ${nFl} ${tr('qavat')}`, `${rows.length * nFl} ${tr('kvartira')}`, fm(tot * nFl), ''], true);
    out.push(`<text x="${n2(cx)}" y="${n2(y + 3.5)}" font-size="2" fill="#6b6965">${esc(tr('Maydon — rejadagi × 0,85 (devorlar), balkonsiz; taxmin'))}</text>`);
    return out.join('');
  };
  return { name, get label() { return label; }, legend, rows, body } as AptSheet;
}
