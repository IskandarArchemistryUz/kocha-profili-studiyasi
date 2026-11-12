/**
 * «Koʻcha profili A–A» varagʻi (12.11, kanvas maketi «Varaq»): koʻcha kesimi standart masshtabda (GOST 2.302),
 * qismlar, qizil chiziqlar, ikki tomondagi binolar (Master rejadan: masofa, qavatlar, balandlik), oʻlcham zanjirlari.
 * Oʻng ustunda — profil tarkibi. Hammasi mm da (varaq birligi).
 */
import type { Project } from './doc';
import type { LegendItem, SheetInner } from './sheet';
import { cutGeom, type CutGeom, type CutSide } from './streetcut';
import type { PartKind } from './profiles';
import { STD_SCALES } from './aptsheet';

const n2 = (v: number) => (Math.round(v * 100) / 100).toString();
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const f2 = (v: number) => v.toFixed(2).replace('.', ',');
const f1 = (v: number) => (Math.round(v * 10) / 10).toString().replace('.', ',');

/** qism ranglari (maket bilan bir xil) va yuzasi balandligi, m */
export const CUT_COL: Record<PartKind, string> = { trotuar: '#ebe2cf', yashil: '#7fb0a8', velo: '#d98a78', parkovka: '#a3a6ad', qatnov: '#6b6e75', ajratuvchi: '#b9c4a6', avtobus: '#bf5a4d', tramvay: '#b8894f' };
const RAISE: Record<PartKind, number> = { trotuar: 0.15, yashil: 0.15, velo: 0.1, parkovka: 0, qatnov: 0, ajratuvchi: 0.15, avtobus: 0, tramvay: 0 };
export const CUT_NAME: Record<PartKind, string> = { trotuar: 'Trotuar', yashil: 'Yashil tasma', velo: 'Velo yoʻlak', parkovka: 'Avtoturargoh', qatnov: 'Harakat boʻlaklari', ajratuvchi: 'Ajratuvchi tasma', avtobus: 'Avtobus boʻlagi', tramvay: 'Tramvay' };

/** Bino koʻrsatiladigan chuqurlik, m (qolgani uzilish belgisi bilan) */
const DEPTH_MAX = 10;

function extent(g: CutGeom): { xl: number; xr: number; top: number } {
  const side = (s: CutSide | null) => (s ? s.dist + Math.min(s.depth, DEPTH_MAX) + 2 : 8);
  return { xl: -(g.W / 2 + side(g.left)), xr: g.W / 2 + side(g.right), top: Math.max(12, g.left?.H ?? 0, g.right?.H ?? 0) + 3 };
}

/** Katakka sigʻadigan eng yirik standart masshtab (chizma ~ 62 % balandlik, pastda oʻlchamlar) */
export function cutScale(g: CutGeom, vw: number, vh: number): number {
  const e = extent(g), need = (N: number) => ({ w: (e.xr - e.xl) * 1000 / N, h: e.top * 1000 / N + 46 });
  return STD_SCALES.find(N => { const r = need(N); return r.w <= vw * 0.94 && r.h <= vh * 0.9; }) ?? 1000;
}

export function cutSheet(doc: Project, cutId: string | undefined, tr: (s: string) => string, vw0: number, vh0: number): SheetInner {
  const cut = (doc.cuts ?? []).find(c => c.id === cutId) ?? doc.cuts?.[0];
  const g = cut ? cutGeom(doc, cut) : null;
  if (!g) return { label: 'M —', name: 'Koʻcha profili', body: (vx, vy, vw, vh) => `<text x="${n2(vx + vw / 2)}" y="${n2(vy + vh / 2)}" font-size="5" text-anchor="middle" fill="#6b6965">${esc(tr('Kesim chizigʻi yoʻq: Koʻchalar → koʻchani tanlang → «Kesim chizigʻini qoʻyish»'))}</text>` };
  const N = cutScale(g, vw0, vh0), k = 1000 / N, L = g.cut.label, sn = doc.streets.findIndex(s => s.id === g.cut.street) + 1;
  const name = `${tr('Koʻcha profili')} ${L}–${L}`;
  const kinds = [...new Set(g.profile.parts.map(p => p.k))];
  const legend: LegendItem[] = [...kinds.map(kd => ({ type: 'fill' as const, fill: CUT_COL[kd], label: tr(CUT_NAME[kd]) })), { type: 'dash', stroke: '#c0392b', label: tr('Qizil chiziq') }, { type: 'fill', fill: '#f4f3f0', stroke: '#1d1d1b', label: tr('Bino (Master reja)') }];

  const body = (vx: number, vy: number, vw: number, vh: number): string => {
    const e = extent(g), dw = (e.xr - e.xl) * k, ox = vx + (vw - dw) / 2 - e.xl * k;
    const dh = e.top * k + 44, gy = vy + Math.max(16, (vh - dh) / 2) + e.top * k;   // yer sathi (chizma katak oʻrtasida)
    const X = (m: number) => ox + m * k, Y = (m: number) => gy - m * k;
    const o: string[] = [];
    o.push(`<text x="${n2(vx + 2)}" y="${n2(vy + 6)}" font-size="4.2" font-weight="700" fill="#1d1d1b">${esc(`${tr('Kesim')} ${L}–${L} · ${tr('Koʻcha')} ${sn}`)}</text>`,
      `<text x="${n2(vx + 2)}" y="${n2(vy + 11)}" font-size="2.5" fill="#55524b">${esc(`${tr(g.profile.name)} · ${tr('qizil chiziqlar orasi')} ${f1(g.W)} m · M 1:${N}`)}</text>`);
    // binolar
    for (const [s, sg] of [[g.left, -1], [g.right, 1]] as [CutSide | null, number][]) {
      if (!s) continue;
      const f = g.W / 2 + s.dist, d = Math.min(s.depth, DEPTH_MAX), x0 = X(sg * f), x1 = X(sg * (f + d)), xa = Math.min(x0, x1), w = Math.abs(x1 - x0), h = s.H * k;
      o.push(`<rect data-cut-bld="${sg < 0 ? 'l' : 'r'}" x="${n2(xa)}" y="${n2(gy - h)}" width="${n2(w)}" height="${n2(h)}" fill="#f4f3f0" stroke="#1d1d1b" stroke-width="0.35"/>`);
      const fh = s.H / Math.max(1, s.floors);
      for (let i = 1; i < s.floors; i++) o.push(`<path d="M${n2(xa)} ${n2(Y(i * fh))}H${n2(xa + w)}" stroke="#c9c6bf" stroke-width="0.2"/>`);
      if (s.depth > DEPTH_MAX) { const xb = sg < 0 ? xa : xa + w; o.push(`<path d="M${n2(xb)} ${n2(gy - h - 2)}l${n2(-sg * 1.2)} ${n2(h * 0.45)}l${n2(sg * 2.4)} 2l${n2(-sg * 1.2)} ${n2(h * 0.55)}" fill="none" stroke="#1d1d1b" stroke-width="0.25"/>`); }
      o.push(`<text x="${n2(xa + w / 2)}" y="${n2(gy - h - 2)}" font-size="2.5" text-anchor="middle" fill="#1d1d1b">${esc(`${s.floors} ${tr('qavat')} · ${f1(s.H)} m`)}</text>`);
    }
    // yer
    o.push(`<path d="M${n2(X(e.xl))} ${n2(gy)}H${n2(X(e.xr))}" stroke="#1d1d1b" stroke-width="0.5"/>`);
    // qismlar
    let x = -g.W / 2; const cuts: number[] = [x];
    for (const p of g.profile.parts) {
      const x0 = X(x), x1 = X(x + p.w), r = Math.max(0.6, (RAISE[p.k] + 0.25) * k);
      o.push(`<rect data-cut-part="${p.k}" x="${n2(x0)}" y="${n2(gy - r)}" width="${n2(x1 - x0)}" height="${n2(r)}" fill="${CUT_COL[p.k]}" stroke="#1d1d1b" stroke-width="0.15"/>`);
      const lanes = p.lanes ?? 1, lw = (x1 - x0) / lanes;
      for (let i = 1; i < lanes; i++) o.push(`<path d="M${n2(x0 + i * lw)} ${n2(gy - r - 0.2)}v-0.6" stroke="#ffffff" stroke-width="0.35"/>`);
      // daraxt (yashil ≥ 1,5 m, ajratuvchi ≥ 2 m), avtomobil, piyoda — masshtabli siluetlar
      const cx = (x0 + x1) / 2;
      if ((p.k === 'yashil' && p.w >= 1.5) || (p.k === 'ajratuvchi' && p.w >= 2)) o.push(`<path d="M${n2(cx)} ${n2(gy - r)}V${n2(Y(3))}" stroke="#6b5a3d" stroke-width="${n2(Math.max(0.3, 0.3 * k))}"/><ellipse cx="${n2(cx)}" cy="${n2(Y(6))}" rx="${n2(2.6 * k)}" ry="${n2(3.2 * k)}" fill="#cfe2c0" stroke="#6f9f4c" stroke-width="0.25"/>`);
      if (p.k === 'qatnov' || p.k === 'parkovka' || p.k === 'avtobus') for (let i = 0; i < lanes; i++) if (p.k !== 'qatnov' || i % 2 === 0) { const c = x0 + (i + 0.5) * lw, cw = (p.k === 'avtobus' ? 2.5 : 1.8) * k, ch = (p.k === 'avtobus' ? 3 : 1.5) * k; o.push(`<rect x="${n2(c - cw / 2)}" y="${n2(gy - r - ch)}" width="${n2(cw)}" height="${n2(ch)}" rx="${n2(0.3 * k)}" fill="none" stroke="#1d1d1b" stroke-width="0.25"/>`); }
      if (p.k === 'trotuar' && p.w >= 1.5) o.push(`<circle cx="${n2(cx)}" cy="${n2(Y(1.6))}" r="${n2(0.13 * k + 0.1)}" fill="none" stroke="#1d1d1b" stroke-width="0.2"/><path d="M${n2(cx)} ${n2(Y(1.45))}V${n2(Y(0.8))}l${n2(-0.2 * k)} ${n2(0.8 * k - r)}M${n2(cx)} ${n2(Y(0.8))}l${n2(0.2 * k)} ${n2(0.8 * k - r)}" fill="none" stroke="#1d1d1b" stroke-width="0.2"/>`);
      x += p.w; cuts.push(x);
    }
    // qizil chiziqlar
    const ht = Y(e.top - 1);
    for (const m of [-g.W / 2, g.W / 2]) o.push(`<path d="M${n2(X(m))} ${n2(gy + 2)}V${n2(ht)}" stroke="#c0392b" stroke-width="0.35" stroke-dasharray="3 1.2 0.6 1.2"/>`);
    // oʻlcham zanjiri: qismlar
    const tick = (xx: number, yy: number) => `<path d="M${n2(xx - 0.9)} ${n2(yy + 0.9)}l1.8 -1.8M${n2(xx)} ${n2(yy - 1.6)}v3.2" stroke="#1d1d1b" stroke-width="0.25"/>`;
    const y1 = gy + 9, y2 = gy + 19;
    o.push(`<path d="M${n2(X(cuts[0]))} ${n2(y1)}H${n2(X(cuts[cuts.length - 1]))}" stroke="#1d1d1b" stroke-width="0.25"/>`, ...cuts.map(c => tick(X(c), y1)));
    g.profile.parts.forEach((p, i) => {
      const a = X(cuts[i]), b = X(cuts[i + 1]), mid = (a + b) / 2, narrow = b - a < 9;
      o.push(narrow ? `<text transform="translate(${n2(mid + 0.8)} ${n2(y1 - 1.2)}) rotate(-90)" font-size="2.5" fill="#1d1d1b">${f2(p.w)}</text>` : `<text x="${n2(mid)}" y="${n2(y1 - 1.2)}" font-size="2.5" text-anchor="middle" fill="#1d1d1b">${f2(p.w)}</text>`);
      if (!narrow || b - a >= 5) o.push(`<text x="${n2(mid)}" y="${n2(y2 + 8)}" font-size="2.5" text-anchor="middle" fill="#55524b">${esc(tr(CUT_NAME[p.k]).split(' ')[0].toLowerCase())}</text>`);
    });
    // umumiy kenglik va binogacha masofa
    o.push(`<path d="M${n2(X(-g.W / 2))} ${n2(y2)}H${n2(X(g.W / 2))}" stroke="#1d1d1b" stroke-width="0.25"/>`, tick(X(-g.W / 2), y2), tick(X(g.W / 2), y2),
      `<text x="${n2(X(0))}" y="${n2(y2 - 1.2)}" font-size="2.5" font-weight="700" text-anchor="middle" fill="#1d1d1b">${esc(`${f2(g.W)} — ${tr('qizil chiziqlar orasi')}`)}</text>`);
    for (const [s, sg] of [[g.left, -1], [g.right, 1]] as [CutSide | null, number][]) {
      if (!s || s.dist < 0.3) continue;
      const a = X(sg * g.W / 2), b = X(sg * (g.W / 2 + s.dist));
      o.push(`<path d="M${n2(a)} ${n2(y2)}H${n2(b)}" stroke="#1d1d1b" stroke-width="0.25"/>`, tick(b, y2), `<text x="${n2((a + b) / 2)}" y="${n2(y2 - 1.2)}" font-size="2.5" text-anchor="middle" fill="#1d1d1b">${f2(s.dist)}</text>`);
    }
    // kesim belgisi
    o.push(`<g transform="translate(${n2(vx + vw - 22)} ${n2(vy + 2)})"><circle cx="5" cy="5" r="4.2" fill="#1d1d1b"/><text x="5" y="6.6" font-size="4.4" font-weight="700" text-anchor="middle" fill="#ffffff">${esc(L)}</text></g>`);
    return o.join('');
  };

  // oʻng ustun: profil tarkibi
  const side = (x: number, y: number, w: number): string => {
    const agg = new Map<PartKind, { n: number; w: number; lanes: number }>();
    for (const p of g.profile.parts) { const a = agg.get(p.k) ?? { n: 0, w: 0, lanes: 0 }; a.n++; a.w += p.w; a.lanes += p.lanes ?? 1; agg.set(p.k, a); }
    const o: string[] = [`<text x="${n2(x)}" y="${n2(y + 3)}" font-size="2.5" font-weight="700" fill="#1d1d1b">${esc(tr('Profil tarkibi'))}</text>`];
    let yy = y + 8;
    for (const [kd, a] of agg) {
      const v = kd === 'qatnov' || kd === 'avtobus' || kd === 'tramvay' ? `${a.lanes} × ${f2(a.w / a.lanes)}` : a.n > 1 ? `${a.n} × ${f2(a.w / a.n)}` : f2(a.w);
      o.push(`<text x="${n2(x)}" y="${n2(yy)}" font-size="2.5" fill="#1d1d1b">${esc(tr(CUT_NAME[kd]))}</text><text x="${n2(x + w)}" y="${n2(yy)}" font-size="2.5" text-anchor="end" font-family="IBM Plex Mono, monospace" fill="#1d1d1b">${v}</text>`);
      yy += 4;
    }
    o.push(`<path d="M${n2(x)} ${n2(yy - 2.6)}H${n2(x + w)}" stroke="#1d1d1b" stroke-width="0.2"/><text x="${n2(x)}" y="${n2(yy + 1)}" font-size="2.5" font-weight="700" fill="#1d1d1b">${esc(tr('Jami'))}</text><text x="${n2(x + w)}" y="${n2(yy + 1)}" font-size="2.5" font-weight="700" text-anchor="end" font-family="IBM Plex Mono, monospace" fill="#1d1d1b">${f2(g.W)}</text>`);
    yy += 7;
    o.push(`<text x="${n2(x)}" y="${n2(yy)}" font-size="2.5" fill="#55524b">${esc(tr('Manba: koʻcha profili (Koʻchasoz) · binolar — Master reja'))}</text>`);
    return o.join('');
  };
  return { label: `M 1:${N}`, name, legend, body, side };
}
