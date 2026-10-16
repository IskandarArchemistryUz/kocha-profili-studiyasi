/**
 * Koʻcha koʻndalang kesimi — Koʻcha profili studiyasidagi (js/app.js, sectionSVG) chizma uslubi:
 * binolar konturi va qavat chiziqlari, koʻtarilgan trotuar, siluetlar (piyodalar, daraxtlar, velosipedchi,
 * yengil mashina, avtobus, tramvay), tasma kengliklari va nomlari. Sof SVG matn — panelda va hisobotda.
 * Siluetlar: silh.json (studiyadagi bilan bir xil manba).
 */
import type { Part, PartKind } from '../core/profiles';
import SILH_RAW from './silh.json';

const SILH = SILH_RAW as Record<string, { w: number; d: string }>;
const INK = '#141414';
const SURF: Record<PartKind, string> = { trotuar: '#ECE9E2', yashil: '#D9E6CC', ajratuvchi: '#D9E6CC', velo: '#CDE2D4', parkovka: '#DDDCD8', qatnov: '#DDDCD8', avtobus: '#E8DDD7', tramvay: '#E8DDD7' };
export const PART_NAME: Record<PartKind, string> = { trotuar: 'Piyoda', yashil: 'Yashil', ajratuvchi: 'Ajratuvchi', velo: 'Velo', parkovka: 'Parkovka', qatnov: 'Qatnov', avtobus: 'Avtobus', tramvay: 'Tramvay' };
const PPL = ['6b', '1', '7', '16', '6e', '17', '22', '6a'];
const n1 = (v: number) => (Math.round(v * 100) / 100).toString().replace('.', ',');

function silh(id: string, cx: number, foot: number, hM: number, sc: number, o: { fill?: string; stroke?: string; sw?: number; flip?: boolean } = {}): string {
  const s = SILH[id]; if (!s) return '';
  const k = hM * sc / 100, wp = s.w * k;
  const tf = o.flip ? `translate(${(cx + wp / 2).toFixed(1)} ${(foot - hM * sc).toFixed(1)}) scale(${(-k).toFixed(4)} ${k.toFixed(4)})` : `translate(${(cx - wp / 2).toFixed(1)} ${(foot - hM * sc).toFixed(1)}) scale(${k.toFixed(4)})`;
  return `<path d="${s.d}" transform="${tf}" fill="${o.fill ?? '#80858a'}"${o.stroke ? ` stroke="${o.stroke}" stroke-width="${o.sw ?? 0.9}" vector-effect="non-scaling-stroke" stroke-linejoin="round"` : ''}/>`;
}

/** Qatnov qismini qatorlarga ajratish (har qatorda mashina) */
const expand = (parts: Part[]): { k: PartKind; w: number; lane?: boolean }[] => parts.flatMap(p => p.k === 'qatnov' && (p.lanes ?? 1) > 1 ? Array.from({ length: p.lanes! }, (_, i) => ({ k: p.k, w: p.w / p.lanes!, lane: i > 0 })) : [{ k: p.k, w: p.w }]);

/**
 * W — chizma eni (px), compact — roʻyxat uchun (nomlarsiz, pastroq).
 * Balandlik masshtabdan: 9,5 m osmon + 50 px oʻlchamlar.
 */
export function sectionSvg(parts: Part[], W = 300, _H = 0, dims = true, compact = W <= 320): string {
  // masshtab: kenglikka sigʻadi, lekin balandlik eni ~0,4 dan oshmasin (tor koʻchada chetlarda binolar kengayadi)
  const total = parts.reduce((s, p) => s + p.w, 0) || 1, m0 = compact ? 14 : 24, sc = Math.min((W - 2 * m0) / total, W / (compact ? 26 : 15)), x0 = (W - total * sc) / 2;
  const skyM = compact ? 7.5 : 9.5, base = (compact ? 8 : 16) + skyM * sc, H = base + (dims ? (compact ? 30 : 50) : 10);
  let surf = '', kerb = '', back = '', mid = '', front = '', lab = '', ticks = '', path = '';
  // binolar — kontur va qavat chiziqlari
  const bh = Math.min(base - 4, 7 * sc), xr = x0 + total * sc + 4;
  ([[0, x0 - 4], [xr, W - xr]] as const).forEach(([bx, bw]) => {
    if (bw <= 0) return;
    back += `<rect x="${bx.toFixed(1)}" y="${(base - bh).toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" fill="#f4f3f1" stroke="${INK}" stroke-width=".9"/>`;
    for (let f = 1; f * 3.3 * sc < bh - 2; f++) back += `<line x1="${bx.toFixed(1)}" y1="${(base - f * 3.3 * sc).toFixed(1)}" x2="${(bx + bw).toFixed(1)}" y2="${(base - f * 3.3 * sc).toFixed(1)}" stroke="${INK}" stroke-width=".4" opacity=".35"/>`;
  });
  let x = x0;
  // oʻlchamlar asl tasmalar boʻyicha, siluetlar — qatorlar boʻyicha
  const E = expand(parts);
  E.forEach((e, i) => {
    const w = e.w * sc, cx = x + w / 2, raised = e.k === 'trotuar' || e.k === 'yashil' || e.k === 'ajratuvchi';
    const top = raised ? base - 0.15 * sc : base, m = (v: number) => v * sc;
    surf += `<rect x="${x.toFixed(1)}" y="${top.toFixed(1)}" width="${w.toFixed(1)}" height="${(base + 8 - top).toFixed(1)}" fill="${SURF[e.k]}"/>`;
    path += `${path ? 'L' : 'M'}${x.toFixed(1)} ${top.toFixed(1)}L${(x + w).toFixed(1)} ${top.toFixed(1)}`;
    if (e.lane) kerb += `<line x1="${x.toFixed(1)}" y1="${(base - 0.4).toFixed(1)}" x2="${x.toFixed(1)}" y2="${(base + 3).toFixed(1)}" stroke="#fff" stroke-width="1.2" stroke-dasharray="2 2"/>`;
    if (e.k === 'qatnov' || (e.k === 'parkovka' && e.w >= 1.8)) front += silh('F_car', cx, top, 1.45, sc, { fill: '#fff', stroke: INK });
    if (e.k === 'avtobus') front += silh('F_bus', cx, top, 3.15, sc, { fill: '#fff', stroke: INK });
    if (e.k === 'tramvay') {
      front += silh('F_tram', cx, top, 4.4, sc, { fill: '#fff', stroke: INK });
      kerb += `<line x1="${(cx - m(0.72)).toFixed(1)}" y1="${top}" x2="${(cx - m(0.72)).toFixed(1)}" y2="${top + 2}" stroke="${INK}" stroke-width="2"/><line x1="${(cx + m(0.72)).toFixed(1)}" y1="${top}" x2="${(cx + m(0.72)).toFixed(1)}" y2="${top + 2}" stroke="${INK}" stroke-width="2"/>`;
    }
    if (e.k === 'velo') { const n = e.w >= 2.6 ? 2 : 1; for (let j = 0; j < n; j++) front += silh('F_cyclist', x + w * (j + 1) / (n + 1), top, 1.78, sc); }
    if (e.k === 'trotuar') { const n = Math.max(1, Math.min(3, Math.floor(e.w / 1.4))); for (let j = 0; j < n; j++) front += silh(PPL[(i * 3 + j) % PPL.length], x + w * (j + 1) / (n + 1), top, 1.72, sc, { flip: (i + j) % 2 === 1 }); }
    if ((e.k === 'yashil' && e.w >= 0.8) || (e.k === 'ajratuvchi' && e.w >= 1.5)) mid += silh(i % 2 ? '32' : '31', cx, top, e.k === 'ajratuvchi' ? 4.6 : 6.6, sc, { fill: '#cfdcbf', stroke: '#93ab80', sw: 0.6 });
    else if (e.k === 'yashil' || e.k === 'ajratuvchi') mid += silh('45', cx, top, 0.7, sc, { fill: '#b9cfa6' });
    x += w;
  });
  // tasma chegaralari, kengliklari va nomlari
  if (dims) {
    let xx = x0;
    parts.forEach(p => {
      const w = p.w * sc, cx = xx + w / 2;
      ticks += `<line x1="${xx.toFixed(1)}" y1="${base + 11}" x2="${xx.toFixed(1)}" y2="${base + 17}" stroke="currentColor" stroke-width=".7"/>`;
      if (w >= (compact ? 14 : 16)) lab += `<text x="${cx.toFixed(1)}" y="${base + (compact ? 26 : 28)}" font-size="${compact ? 8.5 : 10}" text-anchor="middle" font-family="Archivo, system-ui, sans-serif" fill="currentColor">${n1(p.w)}${p.lanes && p.lanes > 1 && !compact ? ` (${p.lanes})` : ''}</text>`;
      if (!compact && w >= 34) lab += `<text x="${cx.toFixed(1)}" y="${base + 41}" font-size="9" text-anchor="middle" fill="currentColor" opacity=".7">${PART_NAME[p.k]}</text>`;
      xx += w;
    });
    ticks += `<line x1="${xx.toFixed(1)}" y1="${base + 11}" x2="${xx.toFixed(1)}" y2="${base + 17}" stroke="currentColor" stroke-width=".7"/><line x1="${x0}" y1="${base + 14}" x2="${xx.toFixed(1)}" y2="${base + 14}" stroke="currentColor" stroke-width=".6"/>`;
  }
  const ground = `<path d="M0 ${base.toFixed(1)}H${x0}${path.replace(/^M/, 'L')}L${x.toFixed(1)} ${base.toFixed(1)}L${W} ${base.toFixed(1)}" fill="none" stroke="${INK}" stroke-width="1.3" stroke-linejoin="round"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H.toFixed(1)}" width="100%" role="img" aria-label="Koʻcha kesimi, ${n1(total)} m" font-family="Archivo, system-ui, sans-serif" style="color:#3a3936">${back}${surf}${ground}${kerb}${mid}${front}${ticks}${lab}</svg>`;
}
