/**
 * Koʻcha kesimi illyustratsiyasi (urban:STREET uslubida): binolar fasadi, trotuar (koʻtarilgan), daraxtlar, mashinalar,
 * avtobus, tramvay, velosipedchi, piyodalar va har tasma kengligi. Sof SVG matn — panelda va hisobotda ishlatiladi.
 */
import type { Part } from '../core/profiles';

const COL: Record<string, string> = { trotuar: '#e9e4da', yashil: '#c9dcb4', ajratuvchi: '#c9dcb4', velo: '#e9b9a9', parkovka: '#b9bbbf', qatnov: '#8c8f95', avtobus: '#c46a5d', tramvay: '#9a9a96' };
const n1 = (v: number) => (Math.round(v * 10) / 10).toString().replace('.', ',');

export function sectionSvg(parts: Part[], W = 300, H = 84, dims = true): string {
  const total = parts.reduce((s, p) => s + p.w, 0) || 1, fac = 10, k = (W - 2 * fac) / total, y0 = H - (dims ? 24 : 12), out: string[] = [];
  const raised = (kk: string) => kk === 'trotuar' || kk === 'yashil' || kk === 'ajratuvchi';
  // binolar
  out.push(`<rect x="0" y="${y0 - 44}" width="${fac}" height="44" fill="#ece9e3" stroke="#bdb8ad" stroke-width=".6"/><rect x="${W - fac}" y="${y0 - 44}" width="${fac}" height="44" fill="#ece9e3" stroke="#bdb8ad" stroke-width=".6"/>`);
  for (let i = 0; i < 4; i++) out.push(`<rect x="3" y="${y0 - 39 + i * 9}" width="4" height="5" fill="#cfd8de"/><rect x="${W - 7}" y="${y0 - 39 + i * 9}" width="4" height="5" fill="#cfd8de"/>`);
  let x = fac;
  parts.forEach((p, idx) => {
    const w = p.w * k, top = raised(p.k) ? y0 - 2.5 : y0;
    out.push(`<rect x="${x.toFixed(1)}" y="${top}" width="${w.toFixed(1)}" height="${H - top - (dims ? 14 : 4)}" fill="${COL[p.k] ?? '#ddd'}"/>`);
    const cx = x + w / 2;
    if (p.k === 'yashil' || p.k === 'ajratuvchi') {
      if (p.w >= 1.4) { const r = Math.min(13, Math.max(5, w * 0.55)); out.push(`<rect x="${(cx - 0.8).toFixed(1)}" y="${top - 16}" width="1.6" height="16" fill="#8a7358"/><circle cx="${cx.toFixed(1)}" cy="${top - 16 - r * 0.7}" r="${r.toFixed(1)}" fill="#a8c98e" stroke="#7aa35f" stroke-width=".6" opacity=".95"/>`); }
      else out.push(`<ellipse cx="${cx.toFixed(1)}" cy="${top - 2}" rx="${Math.max(1.5, w * 0.4).toFixed(1)}" ry="2.5" fill="#94bb79"/>`);
    }
    if (p.k === 'trotuar') { const n = Math.max(1, Math.min(3, Math.floor(p.w / 2.2))); for (let i = 0; i < n; i++) { const px = x + w * (i + 0.5) / n; out.push(`<circle cx="${px.toFixed(1)}" cy="${top - 13}" r="1.8" fill="#4a4a46"/><path d="M${px.toFixed(1)} ${top - 11}v6.5M${(px - 2).toFixed(1)} ${top}l2-5 2 5M${(px - 2.4).toFixed(1)} ${top - 8.5}h4.8" stroke="#4a4a46" stroke-width="1.1" fill="none"/>`); } }
    if (p.k === 'velo') out.push(`<circle cx="${(cx - 3).toFixed(1)}" cy="${top - 2.6}" r="2.4" fill="none" stroke="#3e3e3a" stroke-width=".9"/><circle cx="${(cx + 3).toFixed(1)}" cy="${top - 2.6}" r="2.4" fill="none" stroke="#3e3e3a" stroke-width=".9"/><path d="M${(cx - 3).toFixed(1)} ${top - 2.6}l3 -4 3 4M${cx.toFixed(1)} ${top - 6.6}v-3" stroke="#3e3e3a" stroke-width=".9" fill="none"/><circle cx="${cx.toFixed(1)}" cy="${top - 11}" r="1.6" fill="#3e3e3a"/>`);
    if (p.k === 'qatnov') { const L = p.lanes ?? 1, lw = w / L; for (let i = 0; i < L; i++) { const lx = x + lw * i; const cw = Math.min(lw * 0.72, 22); out.push(`<rect x="${(lx + (lw - cw) / 2).toFixed(1)}" y="${top - 8}" width="${cw.toFixed(1)}" height="6.5" rx="2" fill="${i % 2 ? '#e6e3dc' : '#ffffff'}" stroke="#55585e" stroke-width=".7"/><rect x="${(lx + (lw - cw) / 2 + cw * 0.22).toFixed(1)}" y="${top - 11}" width="${(cw * 0.56).toFixed(1)}" height="3.4" rx="1.4" fill="#cfd8de" stroke="#55585e" stroke-width=".6"/>`); if (i) out.push(`<path d="M${lx.toFixed(1)} ${top + 1}v6" stroke="#fff" stroke-width="1" stroke-dasharray="2 2"/>`); } }
    if (p.k === 'parkovka') { const cw = Math.min(w * 0.8, 18); out.push(`<rect x="${(cx - cw / 2).toFixed(1)}" y="${top - 7}" width="${cw.toFixed(1)}" height="5.5" rx="2" fill="#d9d6cf" stroke="#55585e" stroke-width=".7"/>`); }
    if (p.k === 'avtobus') { const bw = Math.min(w * 0.85, 26); out.push(`<rect x="${(cx - bw / 2).toFixed(1)}" y="${top - 17}" width="${bw.toFixed(1)}" height="15.5" rx="2.5" fill="#d8695a" stroke="#7b2f26" stroke-width=".7"/><rect x="${(cx - bw / 2 + 2).toFixed(1)}" y="${top - 15}" width="${(bw - 4).toFixed(1)}" height="5" fill="#f3e2df"/>`); }
    if (p.k === 'tramvay') { const bw = Math.min(w * 0.85, 26); out.push(`<rect x="${(cx - bw / 2).toFixed(1)}" y="${top - 18}" width="${bw.toFixed(1)}" height="16" rx="3" fill="#f2c94c" stroke="#7a6420" stroke-width=".7"/><path d="M${cx.toFixed(1)} ${top - 18}l-4 -6h8" stroke="#555" stroke-width=".8" fill="none"/><rect x="${(cx - bw / 2 + 2).toFixed(1)}" y="${top - 15.5}" width="${(bw - 4).toFixed(1)}" height="5" fill="#fbf2d0"/>`); }
    if (dims && w >= 14) out.push(`<text x="${cx.toFixed(1)}" y="${H - 3}" font-size="8" text-anchor="middle" fill="#6b6965">${n1(p.w)}</text>`);
    if (idx) out.push(`<path d="M${x.toFixed(1)} ${H - 13}v4" stroke="#b9b5ab" stroke-width=".6"/>`);
    x += w;
  });
  if (dims) out.push(`<path d="M${fac} ${H - 11}H${W - fac}" stroke="#b9b5ab" stroke-width=".6"/>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Koʻcha kesimi, ${n1(total)} m" font-family="IBM Plex Mono, monospace">${out.join('')}</svg>`;
}
