/**
 * «Kesim va fasad N–N» varagʻi (13.11, egasi: master reja atrof bilan qanday koʻrinadi): kesilgan binolar — qora,
 * chiziq ortidagilar — fasad (uzoqlashgan sari ochroq), loyiha — rangli, atrof — kulrang, daraxtlar, yer profili,
 * balandlik va masofa shkalalari, uchastka chegarasi. Oʻng ustunda — loyiha va atrof balandliklari solishtiruvi.
 */
import type { Project } from './doc';
import type { LegendItem, SheetCtx, SheetInner } from './sheet';
import { silhouette, type SilGeom, type SilItem } from './siluet';

const n2 = (v: number) => (Math.round(v * 100) / 100).toString();
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const f1 = (v: number) => (Math.round(v * 10) / 10).toString().replace('.', ',');
/** Masshtablar: GOST 2.302 qatori + 1:2000, 1:2500, 1:5000 (bosh reja amaliyoti — andoza) */
const SCALES = [200, 400, 500, 800, 1000, 2000, 2500, 5000, 10000];
const COL = { loyiha: [217, 119, 74], atrof: [150, 147, 139], daraxt: [150, 186, 128] } as const;
const mix = (c: readonly number[], t: number) => `rgb(${c.map(v => Math.round(v + (255 - v) * t)).join(',')})`;

function top(g: SilGeom): number { return Math.max(15, ...g.items.map(i => i.z0 + i.h), ...g.ground.map(p => p[1])) + 4; }

export function silScale(g: SilGeom, vw: number, vh: number): number {
  const H = top(g);
  return SCALES.find(N => g.L * 1000 / N <= vw * 0.96 && H * 1000 / N + 26 <= vh * 0.86) ?? 10000;
}

/** Loyiha va atrof balandliklari (fasad chuqurligidagi binolar, maydonga tortilgan emas — har bino bir marta) */
export function silStats(g: SilGeom): { loyiha: { n: number; max: number; med: number; fl: number }; atrof: { n: number; max: number; med: number } } {
  const pick = (k: 'loyiha' | 'atrof') => { const m = new Map<string, SilItem>(); for (const i of g.items) if (i.kind === k && !m.has(i.id)) m.set(i.id, i); return [...m.values()]; };
  const med = (a: number[]) => { if (!a.length) return 0; const s = a.slice().sort((x, y) => x - y), k = s.length >> 1; return s.length % 2 ? s[k] : (s[k - 1] + s[k]) / 2; };
  const P = pick('loyiha'), C = pick('atrof');
  return { loyiha: { n: P.length, max: Math.max(0, ...P.map(i => i.h)), med: med(P.map(i => i.h)), fl: Math.max(0, ...P.map(i => i.floors ?? 0)) }, atrof: { n: C.length, max: Math.max(0, ...C.map(i => i.h)), med: med(C.map(i => i.h)) } };
}

export function silSheet(doc: Project, ctx: SheetCtx | null, secId: string | undefined, tr: (s: string) => string, vw0: number, vh0: number): SheetInner {
  const sec = (doc.sections ?? []).find(c => c.id === secId) ?? doc.sections?.[0];
  const g = sec ? silhouette(doc, ctx, sec) : null;
  if (!g) return { label: 'M —', name: 'Kesim va fasad', body: (vx, vy, vw, vh) => `<text x="${n2(vx + vw / 2)}" y="${n2(vy + vh / 2)}" font-size="5" text-anchor="middle" fill="#6b6965">${esc(tr('Kesim chizigʻi yoʻq: Hajmlar → «Kesim va fasad» → «Chiziq chizish»'))}</text>` };
  const N = silScale(g, vw0, vh0), k = 1000 / N, Lb = g.sec.label, H = top(g);
  const name = `${tr('Kesim va fasad')} ${Lb}–${Lb}`;
  const legend: LegendItem[] = [
    { type: 'fill', fill: '#1d1d1b', label: tr('Loyiha — kesim') }, { type: 'fill', fill: mix(COL.loyiha, 0.15), stroke: '#1d1d1b', label: tr('Loyiha — fasad') },
    { type: 'fill', fill: '#5d5a53', label: tr('Atrof — kesim') }, { type: 'fill', fill: mix(COL.atrof, 0.35), stroke: '#1d1d1b', label: tr('Atrof — fasad') },
    { type: 'fill', fill: mix(COL.daraxt, 0.2), label: tr('Daraxtlar') }, { type: 'dash', stroke: '#c0392b', label: tr('Uchastka chegarasi') },
  ];
  const body = (vx: number, vy: number, vw: number, vh: number): string => {
    const dw = g.L * k, ox = vx + (vw - dw) / 2 + 4, dh = H * k + 22, gy = vy + Math.max(18, (vh - dh) / 2) + H * k;
    const X = (s: number) => ox + s * k, Y = (z: number) => gy - z * k;
    const o: string[] = [];
    o.push(`<text x="${n2(vx + 2)}" y="${n2(vy + 6)}" font-size="4.2" font-weight="700" fill="#1d1d1b">${esc(name)}</text>`,
      `<text x="${n2(vx + 2)}" y="${n2(vy + 11)}" font-size="2.5" fill="#55524b">${esc(`${tr('uzunligi')} ${Math.round(g.L)} m · ${tr('fasad chuqurligi')} ${Math.round(g.depth)} m · M 1:${N}`)}</text>`);
    // binolar va daraxtlar: uzoqdan yaqinga, keyin kesimlar
    for (const it of g.items) {
      const x0 = X(it.s0), w = Math.max(0.15, (it.s1 - it.s0) * k), t = Math.min(1, it.d / g.depth);
      if (it.kind === 'daraxt') {
        const cx = X((it.s0 + it.s1) / 2), r = 3 * k, zb = Y(it.z0);
        o.push(`<path d="M${n2(cx)} ${n2(zb)}V${n2(zb - 3.5 * k)}" stroke="${mix([107, 90, 61], 0.2 + 0.6 * t)}" stroke-width="${n2(Math.max(0.15, 0.35 * k))}"/><ellipse cx="${n2(cx)}" cy="${n2(zb - 5.5 * k)}" rx="${n2(r)}" ry="${n2(r * 1.15)}" fill="${mix(COL.daraxt, 0.15 + 0.6 * t)}" fill-opacity="0.85"/>`);
        continue;
      }
      const yb = Y(it.z0), hh = it.h * k;
      if (it.cut) { o.push(`<rect data-sil="${it.kind}-kesim" x="${n2(x0)}" y="${n2(yb - hh)}" width="${n2(w)}" height="${n2(hh)}" fill="${it.kind === 'loyiha' ? '#1d1d1b' : '#5d5a53'}"/>`); continue; }
      const c = it.kind === 'loyiha' ? mix(COL.loyiha, 0.1 + 0.6 * t) : mix(COL.atrof, 0.3 + 0.55 * t);
      o.push(`<rect data-sil="${it.kind}" x="${n2(x0)}" y="${n2(yb - hh)}" width="${n2(w)}" height="${n2(hh)}" fill="${c}" stroke="#1d1d1b" stroke-opacity="${n2(0.85 - 0.6 * t)}" stroke-width="0.18"/>`);
      // qavat chiziqlari — yaqin loyiha binolarida
      if (it.kind === 'loyiha' && it.floors && it.floors > 1 && it.d < 60 && hh / it.floors > 1.1) { const fh = hh / it.floors; let d = ''; for (let i = 1; i < it.floors; i++) d += `M${n2(x0)} ${n2(yb - i * fh)}h${n2(w)}`; o.push(`<path d="${d}" stroke="#ffffff" stroke-opacity="0.55" stroke-width="0.15"/>`); }
    }
    // yer
    const gp = g.ground.map(([s, z]) => `${n2(X(s))} ${n2(Y(z))}`).join('L');
    o.push(`<path d="M${gp}L${n2(X(g.L))} ${n2(gy + 4)}L${n2(X(0))} ${n2(gy + 4)}Z" fill="#ece7db"/><path d="M${gp}" fill="none" stroke="#1d1d1b" stroke-width="0.5"/>`);
    // kesilgan loyiha binolari ustida qavat soni
    const seen = new Set<string>();
    for (const it of g.items) if (it.kind === 'loyiha' && it.cut && !seen.has(it.id) && (it.s1 - it.s0) * k > 3) { seen.add(it.id); o.push(`<text x="${n2(X((it.s0 + it.s1) / 2))}" y="${n2(Y(it.z0 + it.h) - 1.4)}" font-size="2.3" text-anchor="middle" fill="#1d1d1b">${esc(`${it.floors} ${tr('q.')}`)}</text>`); }
    // uchastka chegarasi
    for (const s of g.site) o.push(`<path data-sil-site="1" d="M${n2(X(s))} ${n2(gy + 6)}V${n2(Y(H - 2))}" stroke="#c0392b" stroke-width="0.3" stroke-dasharray="3 1.2 0.6 1.2"/>`);
    if (g.site.length >= 2) { const a = X(g.site[0]), b = X(g.site[g.site.length - 1]); o.push(`<path d="M${n2(a)} ${n2(gy + 8)}H${n2(b)}" stroke="#c0392b" stroke-width="0.3"/><text x="${n2((a + b) / 2)}" y="${n2(gy + 7)}" font-size="2.4" text-anchor="middle" fill="#c0392b">${esc(tr('Uchastka'))}</text>`); }
    // balandlik shkalasi (chapda)
    const hs = H > 120 ? 20 : 10, xl = X(0) - 3;
    let sc = `M${n2(xl)} ${n2(gy)}V${n2(Y(Math.floor((H - 2) / hs) * hs))}`;
    for (let z = 0; z <= H - 2; z += hs) { sc += `M${n2(xl - 1)} ${n2(Y(z))}h1`; o.push(`<text x="${n2(xl - 1.6)}" y="${n2(Y(z) + 0.8)}" font-size="2.2" text-anchor="end" fill="#55524b">${z}</text>`); }
    o.push(`<path d="${sc}" stroke="#1d1d1b" stroke-width="0.2" fill="none"/>`);
    // masofa shkalasi (pastda)
    const ds = [10, 20, 50, 100, 200, 500].find(v => v * k >= 14) ?? 1000, yb = gy + 13;
    let dp = `M${n2(X(0))} ${n2(yb)}H${n2(X(g.L))}`;
    for (let s = 0; s <= g.L + 0.01; s += ds) { dp += `M${n2(X(s))} ${n2(yb - 0.8)}v1.6`; o.push(`<text x="${n2(X(s))}" y="${n2(yb + 3.6)}" font-size="2.2" text-anchor="middle" fill="#55524b">${Math.round(s)}</text>`); }
    o.push(`<path d="${dp}" stroke="#1d1d1b" stroke-width="0.2" fill="none"/>`);
    // kesim belgisi
    o.push(`<g transform="translate(${n2(vx + vw - 22)} ${n2(vy + 2)})"><circle cx="5" cy="5" r="4.2" fill="#1d1d1b"/><text x="5" y="6.6" font-size="4.4" font-weight="700" text-anchor="middle" fill="#ffffff">${esc(Lb)}</text></g>`);
    return o.join('');
  };
  const side = (x: number, y: number, w: number): string => {
    const st = silStats(g), row = (a: string, b: string, bold = false) => `<text x="${n2(x)}" y="${n2(y)}" font-size="2.5"${bold ? ' font-weight="700"' : ''} fill="#1d1d1b">${esc(a)}</text><text x="${n2(x + w)}" y="${n2(y)}" font-size="2.5" text-anchor="end" font-family="IBM Plex Mono, monospace"${bold ? ' font-weight="700"' : ''} fill="#1d1d1b">${esc(b)}</text>`;
    const o: string[] = [];
    o.push(row(tr('Balandliklar, m'), '', true)); y += 5;
    o.push(row(tr('Loyiha: eng baland'), `${f1(st.loyiha.max)} · ${st.loyiha.fl} ${tr('q.')}`)); y += 4;
    o.push(row(tr('Loyiha: mediana'), f1(st.loyiha.med))); y += 4;
    o.push(row(tr('Atrof: eng baland'), f1(st.atrof.max))); y += 4;
    o.push(row(tr('Atrof: mediana'), f1(st.atrof.med))); y += 4;
    if (st.atrof.med > 0 && st.loyiha.med > 0) { o.push(row(tr('Nisbat (mediana)'), `× ${f1(st.loyiha.med / st.atrof.med)}`, true)); y += 4; }
    y += 3;
    o.push(`<text x="${n2(x)}" y="${n2(y)}" font-size="2.3" fill="#55524b">${esc(tr('Manba: binolar — Master reja; atrof — OSM; relyef — AWS Terrain'))}</text>`);
    return o.join('');
  };
  return { label: `M 1:${N}`, name, legend, body, side };
}
