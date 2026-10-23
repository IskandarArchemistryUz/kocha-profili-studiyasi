/**
 * 20-band: «Qavat rejasi» varagʻi — ish chizmalaridagidek (egasining eskizi, 23.10):
 *   - chizma maydonida chap-yuqorida reja nomi va masshtabi, ostida reja (kvartiralar raqamlangan);
 *   - oʻng-yuqori burchakda bitta navigatsiya sxemasi: genplan — uchastka (daha) toʻqroq, blok (tutash seksiyalar) yanada
 *     toʻqroq, koʻrsatilgan seksiya — qora; shimol strelkasi sxemada (rejaga mos burilishda);
 *   - kvartiralar eksplikatsiyasi — varaqning oʻng ustunida (shartli belgilar ostida).
 * Navigatsiya sxemasi — umumiy uslub (`navScheme`), boshqa varaq va oynalarda ham shu koʻrinishda.
 */
import { obb2, centroid, type XY } from './geo';
import { frame } from './geo';
import type { Project } from './doc';
import type { SecPlan } from './apartments';
import { computePlan, pointIn } from './plan';
import { floorPlanSvg, floorGroups, groupName, FLOOR_NAME, floorTypeOf, APT_FILL, type PlanOpts } from './floorplan';
import { sharedEdge } from './sectionplan';
import type { LegendItem } from './sheet';
import type { Bal } from './facade';

export interface AptSheet { name: string; label: string; legend: LegendItem[]; rows: { n: number; rooms: number; area: number }[]; body: (vx: number, vy: number, vw: number, vh: number) => string; side: (x: number, y: number, w: number, yMax: number) => string; /** reja burilishida shimol, ° (soat strelkasi boʻyicha, 0 — tepaga) */ north: number }

const n2 = (v: number) => v.toFixed(2);
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const fm = (v: number, d = 1) => v.toFixed(d).replace('.', ',');

/** Qaysi qavat guruhi: berilmasa — turar (typical) guruh */
export function sheetGroup(pl: SecPlan, gi?: number): { gi: number; from: number; to: number } {
  const gs = floorGroups(pl), def = Math.max(0, gs.findIndex(g => g.type === 'typical'));
  const i = gi != null && gi >= 0 && gi < gs.length ? gi : def;
  return { gi: i, from: gs[i].from, to: gs[i].to };
}

/** Navigatsiya sxemasi ranglari — hamma joyda bir xil */
export const NAV = { site: '#f7f6f2', block: '#ffffff', blockLine: '#c9c5bc', other: '#e6e3dc', otherLine: '#a9a49b', plot: '#c4bfb4', plotLine: '#3a3936', group: '#8e8a82', cur: '#1d1d1b', frame: '#1d1d1b' };

/** Bitta panel: halqalar burilgan holda qutiga sigʻdiriladi (focus — qaysi halqalar koʻrinishi kerak) */
function navPanel(out: string[], bx: number, by: number, bw: number, bh: number, T: (p: XY) => XY, focus: XY[][], layers: { rs: XY[][]; fill: string; stroke: string; sw: number; dash?: string }[]): void {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const r of focus) for (const p of r) { const q = T(p); x0 = Math.min(x0, q[0]); y0 = Math.min(y0, q[1]); x1 = Math.max(x1, q[0]); y1 = Math.max(y1, q[1]); }
  if (!isFinite(x0)) return;
  const pad = 2.5, k = Math.min((bw - 2 * pad) / (x1 - x0 || 1), (bh - 2 * pad) / (y1 - y0 || 1));
  const ox = bx + (bw - (x1 - x0) * k) / 2, oy = by + (bh - (y1 - y0) * k) / 2;
  const P = (p: XY) => { const q = T(p); return `${n2(ox + (q[0] - x0) * k)} ${n2(oy + (y1 - q[1]) * k)}`; };
  const D = (rs: XY[][]) => rs.map(r => r.map((p, i) => `${i ? 'L' : 'M'}${P(p)}`).join('') + 'Z').join('');
  const id = `nv${Math.round(bx * 10)}_${Math.round(by * 10)}`;
  out.push(`<clipPath id="${id}"><rect x="${n2(bx)}" y="${n2(by)}" width="${n2(bw)}" height="${n2(bh)}"/></clipPath><g clip-path="url(#${id})">`);
  for (const L of layers) if (L.rs.length) out.push(`<path d="${D(L.rs)}" fill="${L.fill}" stroke="${L.stroke}" stroke-width="${L.sw}"${L.dash ? ` stroke-dasharray="${L.dash}"` : ''} fill-rule="evenodd" stroke-linejoin="round"/>`);
  out.push('</g>');
}

/**
 * Navigatsiya sxemasi (egasi, 23.10): bitta ramkada ikki panel —
 *   chapda kichik genplan: hudud chegarasi qizil, uchastka (daha) toʻq;
 *   oʻngda sal kattaroq blok (daha) rejasi: undagi seksiyalar, koʻrsatilgan seksiya qora.
 * Ikkalasi reja bilan bir xil burilishda, shimol strelkasi bilan. Hamma joyda shu uslub.
 */
export function navScheme(x: number, y: number, w: number, h: number, T: (p: XY) => XY, northDeg: number, d: { site: XY[][]; blocks: XY[][]; others: XY[][]; plot: XY[][]; group: XY[][]; cur: XY[][]; inPlot?: XY[][] }, title: string, keys: [string, string, string]): string {
  const out: string[] = [], th = 5, kh = 5, by = y + th, bh = h - th - kh, lw = w * 0.4;
  out.push(`<rect x="${n2(x)}" y="${n2(y)}" width="${n2(w)}" height="${n2(h)}" fill="#ffffff" stroke="${NAV.frame}" stroke-width="0.3"/>`);
  out.push(`<text x="${n2(x + 2)}" y="${n2(y + 3.6)}" font-size="2.6" font-weight="700" letter-spacing="0.2" fill="#1d1d1b">${esc(title.toUpperCase())}</text>`);
  out.push(`<path d="M${n2(x)} ${n2(by)}H${n2(x + w)}M${n2(x + lw)} ${n2(by)}V${n2(by + bh)}M${n2(x)} ${n2(by + bh)}H${n2(x + w)}" stroke="#d9d6cf" stroke-width="0.2"/>`);
  // 1) genplan: hudud chegarasi qizil, uchastka toʻq
  navPanel(out, x, by, lw, bh, T, [...d.site, ...d.blocks], [
    { rs: d.blocks, fill: NAV.block, stroke: NAV.blockLine, sw: 0.12 },
    { rs: d.plot, fill: NAV.plot, stroke: 'none', sw: 0 },
    { rs: d.others, fill: '#d9d5cc', stroke: '#8a857c', sw: 0.08 },
    { rs: [...(d.inPlot ?? []), ...d.group, ...d.cur], fill: '#4a4843', stroke: '#1d1d1b', sw: 0.08 },
    { rs: d.plot, fill: 'none', stroke: NAV.plotLine, sw: 0.25 },
    { rs: d.site, fill: 'none', stroke: '#d0342c', sw: 0.45 },
  ]);
  // 2) blok: seksiyalar, koʻrsatilgani qora
  const inPlot = d.plot.length ? d.plot : d.cur;
  navPanel(out, x + lw, by, w - lw, bh, T, inPlot, [
    { rs: d.plot, fill: NAV.site, stroke: '#6b6760', sw: 0.3 },
    { rs: d.inPlot ?? d.others, fill: '#ffffff', stroke: '#6b6760', sw: 0.18 },
    { rs: d.group, fill: NAV.other, stroke: '#6b6760', sw: 0.18 },
    { rs: d.cur, fill: NAV.cur, stroke: NAV.cur, sw: 0.2 },
  ]);
  // shimol — sarlavha qatorida, oʻngda
  out.push(`<text x="${n2(x + w - 6.2)}" y="${n2(y + 3.6)}" font-size="1.9" font-weight="700" text-anchor="end" fill="#1d1d1b">N</text><g transform="translate(${n2(x + w - 3.4)} ${n2(y + 2.5)}) rotate(${n2(-northDeg)})"><path d="M0 -2L0.9 1.1L0 0.4L-0.9 1.1Z" fill="#1d1d1b"/></g>`);
  // izoh
  const ky = y + h - kh + 3.4; let kx = x + 2;
  const key = (sw: string, t: string) => { out.push(sw, `<text x="${n2(kx + 4)}" y="${n2(ky)}" font-size="2" fill="#3a3936">${esc(t)}</text>`); kx += 6 + t.length * 1.05; };
  key(`<path d="M${n2(kx)} ${n2(ky - 1)}H${n2(kx + 3)}" stroke="#d0342c" stroke-width="0.5"/>`, keys[0]);
  key(`<rect x="${n2(kx)}" y="${n2(ky - 2.2)}" width="3" height="2.4" fill="${NAV.plot}" stroke="${NAV.cur}" stroke-width="0.15"/>`, keys[1]);
  key(`<rect x="${n2(kx)}" y="${n2(ky - 2.2)}" width="3" height="2.4" fill="${NAV.cur}"/>`, keys[2]);
  return out.join('');
}

/** Tutash seksiyalar (umumiy devor ≥ 1 m) — bitta blok */
function groupOf(rings: { id: string; r: XY[] }[], id: string): Set<string> {
  const seen = new Set([id]), q = [id];
  while (q.length) {
    const a = rings.find(x => x.id === q.pop()); if (!a) continue;
    for (const b of rings) if (!seen.has(b.id) && sharedEdge(a.r, b.r, 0.3).len >= 1) { seen.add(b.id); q.push(b.id); }
  }
  return seen;
}

export function aptSheet(doc: Project, plans: SecPlan[], bi: number, gi: number | undefined, look: 'rang' | 'bir', tr: (s: string) => string, opt: (pl: SecPlan) => { fh?: number; bal?: Bal | null } = () => ({})): AptSheet {
  const pl = plans[bi], G = sheetGroup(pl, gi), nFl = G.to - G.from + 1;
  const name = `${tr(`${bi + 1}-bino`)} · ${tr(groupName(G))}`;
  const U = obb2(pl.ring).U, V: XY = [-U[1], U[0]], T = (p: XY): XY => [p[0] * U[0] + p[1] * U[1], p[0] * V[0] + p[1] * V[1]];
  // shimol (mahalliy +y) rejada (y pastga) — soat strelkasi boʻyicha burchak = atan2(U₁, U₀); northDeg — uning manfiysi (rotate(-northDeg))
  const northDeg = -Math.atan2(U[1], U[0]) * 180 / Math.PI;
  const fr = frame(doc.origin), site = doc.site?.rings.map(r => r.map(fr.toLocal)) ?? [];
  const blds = doc.buildings.map(b => ({ id: b.id, r: b.footprint.map(fr.toLocal) }));
  const plan = computePlan(doc), c0 = centroid(pl.ring), blk = plan.blocks.find(b => pointIn(c0, b.rings)) ?? null;
  const inBlk = blk ? blds.filter(b => pointIn(centroid(b.r), blk.rings)) : blds;
  const grp = groupOf(inBlk, pl.bid);
  // reja (bitta qavat) — kvartiralar raqamli
  const base: PlanOpts = { scale: 100, dims: true, title: '', floor: G.from, num: true, bare: true, ...opt(pl) };
  const probe = floorPlanSvg(pl, base), rows = probe.apts.map((a, i) => ({ n: i + 1, rooms: a.rooms, area: a.area }));
  const legend: LegendItem[] = look === 'bir' ? [] : [1, 2, 3, 4].filter(k => rows.some(r => Math.min(4, r.rooms) === k)).map(k => ({ type: 'fill' as const, fill: APT_FILL[k], label: `${k} ${tr('xonali')}` }));
  let label = 'M 1:100';
  const ft = floorTypeOf(pl, G.from);

  const body = (vx: number, vy: number, vw: number, vh: number): string => {
    const out: string[] = [];
    // navigatsiya sxemasi — oʻng-yuqori burchakda
    const nw = Math.max(80, Math.min(120, vw * 0.32)), nh = nw * 0.6, nx = vx + vw - nw - 2, ny = vy + 2;
    // reja: sarlavha ostida, navigatsiya sxemasi bilan toʻqnashmaydigan joyda (avval yonida, sigʻmasa — ostida)
    const tH = 12, top = vy + tH, availH = vh - tH - 2, availW = vw - 4;
    let res = probe, sc = 100;
    for (const s of [50, 100, 200, 500, 1000]) {
      const r = s === 100 ? probe : floorPlanSvg(pl, { ...base, scale: s }); sc = s; res = r;
      // sxema bilan kesishmasin: reja oʻng chetidan sxemagacha joy yoki reja sxema ostidan boshlanadi
      const okSide = r.widthMm <= availW - nw - 4 && r.heightMm <= availH, okBelow = r.widthMm <= availW && r.heightMm <= vh - (nh + 6) - 2;
      if (okSide || okBelow) break;
    }
    label = `M 1:${sc}`;
    let svg = res.svg.replace(/^<\?xml[^>]*>\s*/, '');
    if (look === 'bir') for (const c of Object.values(APT_FILL)) svg = svg.split(c).join('#ffffff');
    const side = res.widthMm <= availW - nw - 4;
    // reja boʻsh maydon markazida
    const ax = vx + 2, ay = side ? top : Math.max(top, ny + nh + 4), aw = side ? availW - nw - 4 : availW, ah = vy + vh - ay - 2;
    const k = Math.min(1, aw / res.widthMm, ah / res.heightMm), ww = res.widthMm * k, hh = res.heightMm * k, px = ax + (aw - ww) / 2, py = ay + (ah - hh) / 2;
    // sarlavha: reja nomi va masshtab (chap-yuqori)
    out.push(`<text x="${n2(vx + 2)}" y="${n2(vy + 6)}" font-size="4.2" font-weight="700" fill="#1d1d1b">${esc(tr(`${groupName(G)} rejasi`))}</text>`);
    out.push(`<text x="${n2(vx + 2)}" y="${n2(vy + 10.5)}" font-size="2.8" fill="#55524b">${esc(label)} · ${esc(tr(`${bi + 1}-bino`))} · ${esc(tr(FLOOR_NAME[ft]))}</text>`);
    out.push(`<path d="M${n2(vx + 2)} ${n2(vy + 12)}H${n2(vx + Math.min(110, vw * 0.4))}" stroke="#1d1d1b" stroke-width="0.4"/>`);
    out.push(svg.replace(/^<svg /, `<svg x="${n2(px)}" y="${n2(py)}" `).replace(/width="[\d.]+mm" height="[\d.]+mm"/, `width="${n2(ww)}" height="${n2(hh)}"`));
    out.push(navScheme(nx, ny, nw, nh, T, northDeg, {
      site, blocks: plan.blocks.flatMap(b => b.rings), others: blds.filter(b => !grp.has(b.id)).map(b => b.r),
      plot: blk?.rings ?? [], group: inBlk.filter(b => grp.has(b.id) && b.id !== pl.bid).map(b => b.r), cur: [pl.ring], inPlot: inBlk.filter(b => !grp.has(b.id)).map(b => b.r),
    }, tr('Vaziyat sxemasi'), [tr('hudud chegarasi'), tr('uchastka'), tr('seksiya')]));
    return out.join('');
  };

  /** eksplikatsiya — varaqning oʻng ustunida */
  const sideCol = (x: number, y0: number, w: number, yMax: number): string => {
    const out: string[] = []; let y = y0;
    out.push(`<text x="${n2(x)}" y="${n2(y + 3.5)}" font-size="3" font-weight="700" fill="#1d1d1b">${esc(tr('Kvartiralar eksplikatsiyasi'))}</text>`); y += 6;
    const rh = 4, c1 = x + 7, c2 = x + w - 6;
    const row = (cells: [string, string, string], bold = false, fill = '') => {
      if (fill) out.push(`<rect x="${n2(x)}" y="${n2(y)}" width="${n2(w)}" height="${rh}" fill="${fill}"/>`);
      const fw = bold ? ' font-weight="700"' : '';
      out.push(`<text x="${n2(x + 1)}" y="${n2(y + 2.9)}" font-size="2.3"${fw} fill="#1d1d1b">${esc(cells[0])}</text><text x="${n2(c1)}" y="${n2(y + 2.9)}" font-size="2.3"${fw} fill="#1d1d1b">${esc(cells[1])}</text><text x="${n2(c2)}" y="${n2(y + 2.9)}" font-size="2.3"${fw} text-anchor="end" fill="#1d1d1b">${esc(cells[2])}</text>`);
      out.push(`<path d="M${n2(x)} ${n2(y + rh)}H${n2(x + w)}" stroke="#c9c5bc" stroke-width="0.15"/>`); y += rh;
    };
    out.push(`<path d="M${n2(x)} ${n2(y)}H${n2(x + w)}" stroke="#1d1d1b" stroke-width="0.35"/>`);
    row(['№', tr('Turi'), tr('Maydoni, m²')], true, '#f3f1ec');
    const maxRows = Math.max(1, Math.floor((yMax - y - 4 * rh - 4) / rh));
    rows.slice(0, maxRows).forEach(r => {
      if (look !== 'bir') out.push(`<rect x="${n2(x + w - 4)}" y="${n2(y + 0.8)}" width="3.2" height="2.4" fill="${APT_FILL[Math.min(4, r.rooms)]}" stroke="#141414" stroke-width="0.12"/>`);
      row([String(r.n), `${r.rooms} ${tr('xonali')}`, fm(r.area)]);
    });
    if (rows.length > maxRows) row([`… +${rows.length - maxRows}`, '', '']);
    const tot = rows.reduce((t, r) => t + r.area, 0);
    out.push(`<path d="M${n2(x)} ${n2(y)}H${n2(x + w)}" stroke="#1d1d1b" stroke-width="0.35"/>`);
    row([tr('Jami'), `${rows.length} ${tr('kvartira')}`, fm(tot)], true);
    if (nFl > 1) row([`×${nFl}`, `${rows.length * nFl} ${tr('kvartira')}`, fm(tot * nFl)], true);
    out.push(`<text x="${n2(x)}" y="${n2(y + 3.2)}" font-size="1.9" fill="#6b6965">${esc(tr('Maydon — rejadagi × 0,85 (devorlar), balkonsiz; taxmin'))}</text>`);
    return out.join('');
  };
  return { name, get label() { return label; }, legend, rows, body, side: sideCol, north: -northDeg } as AptSheet;
}
