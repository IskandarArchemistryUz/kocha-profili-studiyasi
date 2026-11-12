/**
 * «Qurilish navbatlari ketma-ketligi» varagʻi (12.11, eski navbat 6-band 2-qismi; namuna — egasi yuborgan KCAP brifi, «Phasing»):
 * har navbat — alohida kichik reja (kataklar). Oldingi navbatlar toʻq kulrang (qurilgan), joriy navbat — navbat rangida,
 * keyingilari — shtrix kontur. Har katak ostida jamlanma (binolar, GFA, xonadonlar); pastda jamlanma GFA ustunlari.
 * Navbat raqamlari — binoning stage maydonidan (qoʻlda yoki «Navbatlarni taklif qilish»dan). Uslub — AMALIYOT.
 */
import type { Project } from './doc';
import type { LegendItem, SheetInner } from './sheet';
import { STAGE_COL, stageOf } from './sheet';
import { frame, area, type XY } from './geo';
import { derive } from './derive';
import { corridor } from './plan';
import { profileById, profileWidth } from './profiles';

const n2 = (v: number) => (Math.round(v * 100) / 100).toString();
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const tf2 = (s: string, v: Record<string, unknown>) => s.replace(/\$\{(\w+)\}/g, (_m, e: string) => String(v[e]));
const m2 = (v: number) => Math.round(v).toLocaleString('ru-RU').replace(/ /g, ' ');
const BUILT = '#4a4844';

export interface StageSum { st: number; n: number; gfa: number; apts: number; cumGfa: number }

/** Navbatlar boʻyicha jamlanma (faqat qavati bor binolar) */
export function stageSums(doc: Project): StageSum[] {
  const fr = frame(doc.origin), bs = doc.buildings.filter(b => b.floors > 0), used = [...new Set(bs.map(stageOf))].sort((a, b) => a - b);
  let cum = 0;
  return used.map(st => {
    const xs = bs.filter(b => stageOf(b) === st), gfa = xs.reduce((t, b) => t + area(b.footprint.map(fr.toLocal)) * b.floors, 0);
    cum += gfa;
    return { st, n: xs.length, gfa, apts: Math.round(derive({ ...doc, buildings: xs }).apartments ?? 0), cumGfa: cum };
  });
}

/** Katak joylashuvi: n ta katak eng katta oʻlchamda (qatorlar × ustunlar) */
function grid(n: number, w: number, h: number, aspect: number): { cols: number; rows: number } {
  let best = { cols: n, rows: 1, s: 0 };
  for (let cols = 1; cols <= n; cols++) {
    const rows = Math.ceil(n / cols), cw = w / cols, ch = h / rows - 14, s = Math.min(cw, ch * aspect);
    if (s > best.s) best = { cols, rows, s };
  }
  return best;
}

export function stageSheet(doc: Project, tr: (s: string) => string): SheetInner {
  const sums = stageSums(doc);
  const name = 'Qurilish navbatlari ketma-ketligi';
  if (!sums.length) return { label: 'M —', name, body: (vx, vy, vw, vh) => `<text x="${n2(vx + vw / 2)}" y="${n2(vy + vh / 2)}" font-size="5" text-anchor="middle" fill="#6b6965">${esc(tr('Binolar yoʻq'))}</text>` };
  const fr = frame(doc.origin), L = (r: [number, number][]) => r.map(p => fr.toLocal(p) as XY);
  const site = doc.site ? doc.site.rings.map(L) : [];
  const blds = doc.buildings.filter(b => b.floors > 0).map(b => ({ r: L(b.footprint), st: stageOf(b) }));
  const streets = doc.streets.flatMap(s => { try { return corridor(L(s.axis), profileWidth(profileById(s.profile)) / 2); } catch { return []; } });
  // umumiy chegaralar (uchastka, binolar)
  const pts = [...site.flat(), ...blds.flatMap(b => b.r)];
  const x0 = Math.min(...pts.map(p => p[0])), x1 = Math.max(...pts.map(p => p[0])), y0 = Math.min(...pts.map(p => p[1])), y1 = Math.max(...pts.map(p => p[1]));
  const pad = Math.max(x1 - x0, y1 - y0) * 0.06, bw = x1 - x0 + 2 * pad, bh = y1 - y0 + 2 * pad;
  const legend: LegendItem[] = [{ type: 'fill', fill: BUILT, stroke: '#1d1d1b', label: tr('Oldingi navbatlarda qurilgan') }, ...sums.map(s => ({ type: 'fill' as const, fill: STAGE_COL[s.st - 1], stroke: '#1d1d1b', label: tf2(tr('${n}-navbat'), { n: s.st }) })), { type: 'dash', stroke: '#9a978f', label: tr('Keyingi navbatlar') }, { type: 'dash', stroke: '#c0392b', label: tr('Uchastka chegarasi') }];

  const body = (vx: number, vy: number, vw: number, vh: number): string => {
    // jamlanma ustunlari: kataklar orasida boʻsh joy qolsa — oʻsha katakka, aks holda pastga
    const n = sums.length, gFree = grid(n + 1, vw, vh, bw / bh), inCell = gFree.cols * gFree.rows > n && n > 1;
    const chartH = inCell ? 0 : Math.min(46, vh * 0.2), gh = vh - chartH - (inCell ? 0 : 8), g = inCell ? gFree : grid(n, vw, gh, bw / bh);
    const cw = vw / g.cols, ch = gh / g.rows, k = Math.min((cw - 8) / bw, (ch - 22) / bh);
    const o: string[] = [];
    const path = (r: XY[], ox: number, oy: number) => 'M' + r.map(p => `${n2(ox + (p[0] - x0 + pad) * k)},${n2(oy + (y1 + pad - p[1]) * k)}`).join('L') + 'Z';
    sums.forEach((s, i) => {
      const c = i % g.cols, r = Math.floor(i / g.cols), px = vx + c * cw, py = vy + r * ch, ox = px + (cw - bw * k) / 2, oy = py + 12;
      o.push(`<g data-stage-panel="${s.st}">`);
      // sarlavha: katta raqam + nom
      o.push(`<circle cx="${n2(px + 6)}" cy="${n2(py + 5)}" r="4.2" fill="${STAGE_COL[s.st - 1]}" stroke="#1d1d1b" stroke-width="0.25"/><text x="${n2(px + 6)}" y="${n2(py + 6.7)}" font-size="4.6" font-weight="700" text-anchor="middle" fill="#1d1d1b">${s.st}</text>`,
        `<text x="${n2(px + 13)}" y="${n2(py + 6.6)}" font-size="3.6" font-weight="700" fill="#1d1d1b">${esc(tf2(tr('${n}-navbat'), { n: s.st }))}</text>`);
      for (const poly of streets) o.push(`<path d="${poly.map(ring => path(ring.slice(0, -1).map(q => [q[0], q[1]] as XY), ox, oy)).join('')}" fill="#e7e5e0" stroke="none"/>`);
      for (const ring of site) o.push(`<path d="${path(ring, ox, oy)}" fill="none" stroke="#c0392b" stroke-width="0.3" stroke-dasharray="1.6 0.8"/>`);
      for (const b of blds) {
        const d = path(b.r, ox, oy);
        if (b.st < s.st) o.push(`<path d="${d}" fill="${BUILT}" stroke="#1d1d1b" stroke-width="0.12"/>`);
        else if (b.st === s.st) o.push(`<path data-stage-cur="1" d="${d}" fill="${STAGE_COL[s.st - 1]}" stroke="#1d1d1b" stroke-width="0.25"/>`);
        else o.push(`<path d="${d}" fill="none" stroke="#9a978f" stroke-width="0.18" stroke-dasharray="0.8 0.5"/>`);
      }
      const ty = oy + bh * k + 5;
      o.push(`<text x="${n2(px + 4)}" y="${n2(ty)}" font-size="2.6" fill="#1d1d1b">${esc(`${tr('Binolar')}: ${s.n} · ${m2(s.gfa)} m²${s.apts ? ` · ${tr('xonadon')}: ${s.apts}` : ''}`)}</text>`);
      o.push('</g>');
    });
    // pastda: jamlanma GFA ustunlari (har navbat qoʻshgan ulush — oʻz rangida)
    const cx0 = inCell ? vx + (n % g.cols) * cw + 4 : vx, cy0 = inCell ? vy + Math.floor(n / g.cols) * ch : vy + vh - chartH, cwid = inCell ? cw - 8 : vw;
    const by = inCell ? cy0 + ch - 10 : vy + vh - 6, top = inCell ? cy0 + 22 : by - chartH + 12, tot = sums[sums.length - 1].cumGfa || 1, colW = Math.min(30, (cwid - 20) / n - 6);
    o.push(`<text x="${n2(cx0 + 2)}" y="${n2(top - 6)}" font-size="3" font-weight="700" fill="#1d1d1b">${esc(tr('Jamlanma umumiy maydon, m²'))}</text>`, `<path d="M${n2(cx0 + 2)} ${n2(by)}H${n2(cx0 + cwid - 2)}" stroke="#1d1d1b" stroke-width="0.3"/>`);
    sums.forEach((s, i) => {
      const x = cx0 + 10 + i * (colW + 6);
      let y = by;
      for (const q of sums.slice(0, i + 1)) { const hh = (q.gfa / tot) * (by - top); y -= hh; o.push(`<rect x="${n2(x)}" y="${n2(y)}" width="${n2(colW)}" height="${n2(hh)}" fill="${q.st === s.st ? STAGE_COL[q.st - 1] : BUILT}" stroke="#1d1d1b" stroke-width="0.15"/>`); }
      o.push(`<text x="${n2(x + colW / 2)}" y="${n2(y - 1.5)}" font-size="2.5" text-anchor="middle" fill="#1d1d1b">${Math.round((s.cumGfa / tot) * 100)} %</text>`,
        `<text x="${n2(x + colW / 2)}" y="${n2(by + 4)}" font-size="2.5" text-anchor="middle" fill="#55524b">${esc(tf2(tr('${n}-navbat'), { n: s.st }))}</text>`);
    });
    return o.join('');
  };

  const side = (x: number, y: number, w: number): string => {
    const o: string[] = [`<text x="${n2(x)}" y="${n2(y + 3)}" font-size="2.8" font-weight="700" fill="#1d1d1b">${esc(tr('Qurilish navbatlari'))}</text>`];
    let yy = y + 8;
    const row = (t: string, v: string, b = false) => { o.push(`<text x="${n2(x)}" y="${n2(yy)}" font-size="2.5"${b ? ' font-weight="700"' : ''} fill="#1d1d1b">${esc(t)}</text><text x="${n2(x + w)}" y="${n2(yy)}" font-size="2.5" text-anchor="end"${b ? ' font-weight="700"' : ''} fill="#1d1d1b">${esc(v)}</text>`); yy += 4; };
    for (const s of sums) {
      o.push(`<rect x="${n2(x)}" y="${n2(yy - 2.6)}" width="3.4" height="3" fill="${STAGE_COL[s.st - 1]}" stroke="#1d1d1b" stroke-width="0.15"/>`);
      o.push(`<text x="${n2(x + 5)}" y="${n2(yy)}" font-size="2.6" font-weight="700" fill="#1d1d1b">${esc(tf2(tr('${n}-navbat'), { n: s.st }))}</text>`); yy += 4;
      row(tr('Binolar soni'), String(s.n)); row(tr('Umumiy maydon (GFA), m²'), m2(s.gfa)); if (s.apts) row(tr('Xonadonlar'), String(s.apts));
      yy += 1.5;
    }
    if (sums.length > 1) { o.push(`<path d="M${n2(x)} ${n2(yy - 3)}H${n2(x + w)}" stroke="#1d1d1b" stroke-width="0.2"/>`); row(tr('Jami, m²'), m2(sums[sums.length - 1].cumGfa), true); const A = sums.reduce((t, s) => t + s.apts, 0); if (A) row(tr('Jami xonadonlar'), String(A), true); }
    return o.join('');
  };
  return { label: 'M —', name, legend, body, side };
}
