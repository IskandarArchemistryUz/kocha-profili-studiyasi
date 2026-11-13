/**
 * «Kesim va fasad N–N» varagʻi (13.11, egasi: master reja atrof bilan qanday koʻrinadi): kesilgan binolar — qora,
 * chiziq ortidagilar — fasad (uzoqlashgan sari ochroq), loyiha — rangli, atrof — kulrang, daraxtlar, yer profili,
 * balandlik va masofa shkalalari, uchastka chegarasi. Oʻng ustunda — loyiha va atrof balandliklari solishtiruvi.
 */
import type { Project } from './doc';
import type { LegendItem, SheetCtx, SheetInner } from './sheet';
import { silhouette, type SilGeom, type SilItem } from './siluet';
import SILH_RAW from '../ui/silh.json';

/** Shtaffaj — Koʻcha profilidagi siluetlar (silh.json: balandlik 100 birlik, eni w) */
const SILH = SILH_RAW as Record<string, { w: number; d: string }>;
function silhP(id: string, cx: number, foot: number, hMm: number, attrs: string, flip = false): string {
  const sp = SILH[id]; if (!sp || !(hMm > 0)) return '';
  const k = hMm / 100, w = sp.w * k;
  const tf = flip ? `translate(${n2(cx + w / 2)} ${n2(foot - hMm)}) scale(${-k} ${k})` : `translate(${n2(cx - w / 2)} ${n2(foot - hMm)}) scale(${k})`;
  return `<path d="${sp.d}" transform="${tf}" ${attrs}/>`;
}

const n2 = (v: number) => (Math.round(v * 100) / 100).toString();
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const f1 = (v: number) => (Math.round(v * 10) / 10).toString().replace('.', ',');
/** Masshtablar: GOST 2.302 qatori + 1:2000, 1:2500, 1:4000, 1:5000 (bosh reja amaliyoti — andoza; 1:4000 — 13.11, 700–800 m li kesim A3 da 1:5000 ga tushib ketmasin) */
const SCALES = [200, 400, 500, 800, 1000, 2000, 2500, 4000, 5000, 10000];
/** 13.11 kanvas (K-03 «Kesim»): kesilgan — oq, qalin qora kontur va orayopmalar; koʻrinadigan loyiha — och qum rang; atrof — och kulrang */
const K = { cut: 0.45, slab: 0.22, ground: 0.55, vis: '#ece6dc', visLine: '#8a8075', back: '#ebe8e1', tree: '#a9b89a', ink: '#1d1d1b' };

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

/** 13.11 (egasi kanvasdagi uslublarni tanladi, K-01…K-05): varaq uslubi */
export type SilStyle = 'kesim' | 'siluet' | 'rangli' | 'juft' | 'aksent' | 'shahar';
export const SIL_STYLES: { id: SilStyle; name: string; sub: string }[] = [
  { id: 'kesim', name: 'Kesim', sub: 'oq kesim, qalin kontur' },
  { id: 'siluet', name: 'Siluet', sub: 'atrof qora, loyiha oq' },
  { id: 'rangli', name: 'Rangli fasad', sub: 'deraza ritmi, kulrang orqa plan' },
  { id: 'juft', name: 'Fasad + kesim', sub: 'bir chiziqning ikkisi' },
  { id: 'aksent', name: 'Aksent', sub: 'kulrang, daraxt va odam — bir rang' },
  { id: 'shahar', name: 'Shahar silueti', sub: 'yer qatlami, dominantalar' },
];
const ACC = '#d4483b', ACC2 = '#c53b2f';
/** Rangli fasad: funksiya boʻyicha devor rangi (kanvas K-02) */
const wallOf = (use?: string) => /maktab|bogcha|bog.cha|mtm|poliklinika|shifoxona|ijtimoiy|madaniy|sport/.test(use ?? '') ? '#f0d9c8' : /ofis|savdo|mehmonxona|biznes/.test(use ?? '') ? '#dfe5e8' : '#efe5d6';
type Mode = Exclude<SilStyle, 'juft'> | 'fasad';

/** Bitta lenta: orqa relyef → binolar va daraxtlar (uzoqdan yaqinga, kesimlar oxirida) → yer → odamlar */
function strip(g: SilGeom, m: Mode, X: (s: number) => number, Y: (z: number) => number, k: number, gy: number, hid: string): string {
  const o: string[] = [];
  const gp = g.ground.map(([s, z]) => `${n2(X(s))} ${n2(Y(z))}`).join('L');
  const hp = g.horizon.map(([s, z]) => `${n2(X(s))} ${n2(Y(z))}`).join('L');
  const gr = g.ground.slice().reverse().map(([s, z]) => `${n2(X(s))} ${n2(Y(z))}`).join('L');
  const back = { kesim: K.back, fasad: '#e9e6df', siluet: '#d9d9d9', rangli: '#e6e3dc', aksent: '#f1e4e2', shahar: '#e0ddd7' }[m];
  if (g.horizon.some((h, i) => h[1] > g.ground[i][1] + 0.05)) o.push(`<path data-sil="relyef-orqa" d="M${hp}L${gr}Z" fill="${back}"/><path d="M${hp}" fill="none" stroke="#9a9a9a" stroke-width="0.08"/>`);
  const cutAs = m === 'kesim' || m === 'aksent' || m === 'shahar' || m === 'siluet';   // fasad/rangli: kesilgan bino ham fasad sifatida
  const items = cutAs ? g.items : g.items.filter(i => !i.cut || !g.items.some(j => !j.cut && j.id === i.id)).map(i => i.cut ? { ...i, cut: false } : i);
  for (const it of items) {
    const x0 = X(it.s0), w = Math.max(0.15, (it.s1 - it.s0) * k), t = Math.min(1, Math.max(0, it.d / g.depth));
    if (it.kind === 'daraxt') {
      if (m === 'shahar' && it.d > 60) continue;
      const cx = X((it.s0 + it.s1) / 2), hm = it.h * k, sp = it.sp ?? '31';
      const a = m === 'siluet' ? `fill="#ffffff" stroke="#2b2b2b" stroke-width="0.08" stroke-opacity="${n2(1 - 0.6 * t)}"`
        : m === 'rangli' ? `fill="#8e9693" fill-opacity="${n2(0.55 - 0.35 * t)}"`
        : m === 'fasad' ? `fill="#9fae8f" fill-opacity="${n2(0.7 - 0.45 * t)}"`
        : m === 'aksent' ? `fill="${ACC}" fill-opacity="${n2(0.62 - 0.4 * t)}"`
        : m === 'shahar' ? 'fill="#7f8c7a" fill-opacity="0.7"'
        : `fill="${K.tree}" fill-opacity="${n2(0.78 - 0.5 * t)}"`;
      o.push(silhP(sp, cx, Y(it.z0), hm, `data-sil="daraxt" ${a}`));
      continue;
    }
    const yb = Y(it.z0), hh = it.h * k, lo = it.kind === 'loyiha';
    const R = (attrs: string) => `<rect data-sil="${it.kind}${it.cut ? '-kesim' : ''}" x="${n2(x0)}" y="${n2(yb - hh)}" width="${n2(w)}" height="${n2(hh)}" ${attrs}/>`;
    const floors = (stroke: string, sw: number, op = 1) => { const fl = lo ? (it.floors ?? 0) : Math.round(it.h / 3.2); if (fl < 2 || hh / fl < 0.5) return ''; const fh = hh / fl; let d = ''; for (let i = 1; i < fl; i++) d += `M${n2(x0)} ${n2(yb - i * fh)}h${n2(w)}`; return `<path d="${d}" stroke="${stroke}" stroke-width="${sw}" stroke-opacity="${op}"/>`; };
    if (m === 'kesim') {
      if (it.cut) { o.push(R(`fill="${lo ? '#ffffff' : '#f4f3ef'}" stroke="${lo ? K.ink : '#5d5a53'}" stroke-width="${lo ? K.cut : 0.35}"`), floors(lo ? K.ink : '#5d5a53', lo ? K.slab : 0.15)); continue; }
      if (lo) o.push(R(`fill="${K.vis}" fill-opacity="${n2(1 - 0.4 * t)}" stroke="${K.visLine}" stroke-opacity="${n2(1 - 0.5 * t)}" stroke-width="0.1"`), it.d < 60 && hh / (it.floors || 1) > 1.1 ? floors(K.visLine, 0.08, 0.45) : '');
      else { const c = Math.round(225 + 22 * t); o.push(R(`fill="rgb(${c},${c},${c})" fill-opacity="${n2(1 - 0.5 * t)}" stroke="#c9c9c9" stroke-width="0.05"`)); }
    } else if (m === 'siluet') {
      if (lo) o.push(R(`fill="#ffffff" stroke="#111111" stroke-width="${it.cut ? 0.3 : 0.18}"`), floors('#111111', 0.04));
      else { const c = Math.round(40 + 70 * t); o.push(R(`fill="rgb(${c},${c},${c})" stroke="#ffffff" stroke-width="0.06"`)); }
    } else if (m === 'rangli' || m === 'fasad') {
      if (lo) {
        o.push(R(`fill="${wallOf(it.use)}" stroke="#6b5b4b" stroke-width="0.1"`));
        // deraza ritmi: 3,6 m qadam, 1,5 m eni; pastki noturar qavat — vitrina
        const fl = it.floors ?? 1, fh = hh / Math.max(1, fl), ww = 1.5 * k, st = 3.6 * k, n = Math.max(1, Math.floor((w - 0.8 * k) / st)), pad = (w - n * st) / 2;
        if (fh > 0.6 && st > 0.9) {
          let d = '', v = '';
          for (let f = 0; f < fl; f++) {
            const y1 = yb - f * fh - fh * 0.82, y0 = yb - f * fh - fh * 0.32;
            if (f < (it.nonRes ?? 0)) { v += `M${n2(x0 + 0.6 * k)} ${n2(yb - (f + 1) * fh + fh * 0.08)}h${n2(w - 1.2 * k)}v${n2(fh * 0.84)}h${n2(-(w - 1.2 * k))}Z`; continue; }
            for (let i = 0; i < n; i++) { const cx = x0 + pad + st * (i + 0.5); d += `M${n2(cx - ww / 2)} ${n2(y1)}h${n2(ww)}v${n2(y0 - y1)}h${n2(-ww)}Z`; }
          }
          if (d) o.push(`<path data-sil="deraza" d="${d}" fill="#8fa1a8"/>`);
          if (v) o.push(`<path d="${v}" fill="#6f8790"/>`);
        }
      } else { const c = Math.round(205 + 35 * t); o.push(R(`fill="rgb(${c},${c},${c - 2})" fill-opacity="${n2(1 - 0.5 * t)}" stroke="#b0b0b0" stroke-width="0.05"`)); }
    } else if (m === 'aksent') {
      if (it.cut) o.push(R('fill="#ffffff" stroke="#6d6d6d" stroke-width="0.35"'));
      else o.push(R(`fill="#ffffff" stroke="${lo ? '#bdbdbd' : '#dadada'}" stroke-width="${lo ? 0.07 : 0.05}"`));
    } else {   // shahar
      if (lo) o.push(R(`fill="${ACC2}" stroke="#ffffff" stroke-width="0.05"`));
      else { const c = Math.round(70 + 110 * t); o.push(R(`fill="rgb(${c},${c},${c})"`)); }
    }
  }
  // yer
  const base = gy + (m === 'shahar' ? 8 : 4), earth = `M${gp}L${n2(X(g.L))} ${n2(base)}L${n2(X(0))} ${n2(base)}Z`;
  const ef = { kesim: `url(#${hid})`, fasad: '#f3f1ec', siluet: '#ffffff', rangli: '#f3f1ec', aksent: '#f6eceb', shahar: '#cfccc6' }[m];
  const el = { kesim: [K.ink, K.ground], fasad: ['#222', 0.5], siluet: ['#111', 0.7], rangli: ['#222', 0.55], aksent: ['#9a9a9a', 0.35], shahar: ['#555', 0.3] }[m];
  o.push(`<path d="${earth}" fill="${ef}"/><path d="M${gp}" fill="none" stroke="${el[0]}" stroke-width="${el[1]}"/>`);
  // odamlar 1,75 m — Koʻcha profili siluetlari
  if (m !== 'shahar' && 1.75 * k >= 0.5) {
    const pc = m === 'aksent' ? ACC : m === 'rangli' ? '#3d3d3d' : m === 'fasad' ? '#4a4a4a' : K.ink;
    for (const p of g.people) o.push(silhP(p.sp, X(p.s), Y(g.ground.reduce((a, b) => Math.abs(b[0] - p.s) < Math.abs(a[0] - p.s) ? b : a)[1]), 1.75 * k, `data-sil="odam" fill="${pc}"`, p.flip));
  }
  return o.join('');
}

export function silSheet(doc: Project, ctx: SheetCtx | null, secId: string | undefined, tr: (s: string) => string, vw0: number, vh0: number, style: SilStyle = 'kesim'): SheetInner {
  const sec = (doc.sections ?? []).find(c => c.id === secId) ?? doc.sections?.[0];
  const g = sec ? silhouette(doc, ctx, sec) : null;
  if (!g) return { label: 'M —', name: 'Kesim va fasad', body: (vx, vy, vw, vh) => `<text x="${n2(vx + vw / 2)}" y="${n2(vy + vh / 2)}" font-size="5" text-anchor="middle" fill="#6b6965">${esc(tr('Kesim chizigʻi yoʻq: Hajmlar → «Kesim va fasad» → «Chiziq chizish»'))}</text>` };
  const two = style === 'juft';
  const N = silScale(g, vw0, two ? vh0 / 2 : vh0), k = 1000 / N, Lb = g.sec.label, H = top(g);
  const name = `${tr('Kesim va fasad')} ${Lb}–${Lb}`;
  const LG: Record<SilStyle, LegendItem[]> = {
    kesim: [{ type: 'fill', fill: '#ffffff', stroke: K.ink, label: tr('Loyiha — kesim') }, { type: 'fill', fill: K.vis, stroke: K.visLine, label: tr('Loyiha — fasad') },
      { type: 'fill', fill: '#f4f3ef', stroke: '#5d5a53', label: tr('Atrof — kesim') }, { type: 'fill', fill: '#e4e4e2', stroke: '#c9c9c9', label: tr('Atrof — fasad') }],
    siluet: [{ type: 'fill', fill: '#ffffff', stroke: '#111111', label: tr('Loyiha') }, { type: 'fill', fill: '#333333', label: tr('Atrof (yaqin — toʻq, uzoq — och)') }],
    rangli: [{ type: 'fill', fill: '#efe5d6', stroke: '#6b5b4b', label: tr('Turar joy, aralash') }, { type: 'fill', fill: '#f0d9c8', stroke: '#6b5b4b', label: tr('Ijtimoiy') }, { type: 'fill', fill: '#dfe5e8', stroke: '#6b5b4b', label: tr('Ofis, savdo') }, { type: 'fill', fill: '#dcdcda', stroke: '#b0b0b0', label: tr('Atrof') }],
    juft: [{ type: 'fill', fill: '#efe5d6', stroke: '#6b5b4b', label: tr('Loyiha — fasad') }, { type: 'fill', fill: '#ffffff', stroke: K.ink, label: tr('Loyiha — kesim') }, { type: 'fill', fill: '#e4e4e2', stroke: '#c9c9c9', label: tr('Atrof') }],
    aksent: [{ type: 'fill', fill: '#ffffff', stroke: '#6d6d6d', label: tr('Kesilgan bino') }, { type: 'fill', fill: '#ffffff', stroke: '#bdbdbd', label: tr('Koʻrinadigan bino') }, { type: 'fill', fill: ACC, label: tr('Daraxtlar va odamlar') }],
    shahar: [{ type: 'fill', fill: ACC2, label: tr('Loyiha') }, { type: 'fill', fill: '#666666', label: tr('Atrof (yaqin — toʻq, uzoq — och)') }, { type: 'fill', fill: '#cfccc6', label: tr('Yer') }],
  };
  const legend: LegendItem[] = [...LG[style], { type: 'fill', fill: K.back, label: tr('Orqa relyef (koʻrinadigan yer)') }, ...(style === 'aksent' ? [] : [{ type: 'fill' as const, fill: K.tree, label: tr('Daraxtlar') }]), { type: 'dash', stroke: '#c0392b', label: tr('Uchastka chegarasi') }];
  const body = (vx: number, vy: number, vw: number, vh: number): string => {
    const o: string[] = [];
    o.push(`<text x="${n2(vx + 2)}" y="${n2(vy + 6)}" font-size="4.2" font-weight="700" fill="#1d1d1b">${esc(name)}</text>`,
      `<text x="${n2(vx + 2)}" y="${n2(vy + 11)}" font-size="2.5" fill="#55524b">${esc(`${tr('uzunligi')} ${Math.round(g.L)} m · ${tr('fasad chuqurligi')} ${Math.round(g.depth)} m · M 1:${N} · ${tr(SIL_STYLES.find(x => x.id === style)!.name)}`)}</text>`);
    const hid = `silH${Lb}`;
    o.push(`<defs><pattern id="${hid}" width="1.6" height="1.6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="1.6" height="1.6" fill="#f2f0eb"/><line x1="0" y1="0" x2="0" y2="1.6" stroke="#9b968c" stroke-width="0.18"/></pattern></defs>`);
    const dw = g.L * k, ox = vx + (vw - dw) / 2 + 4, dh = H * k + 22;
    const X = (s: number) => ox + s * k;
    const lanes: { m: Mode; title: string; gy: number }[] = two
      ? (() => { const hh2 = (vh - 14) / 2, gy1 = vy + 14 + Math.max(4, (hh2 - dh) / 2) + H * k; return [{ m: 'fasad' as Mode, title: `${tr('Fasad')} ${Lb}`, gy: gy1 }, { m: 'kesim' as Mode, title: `${tr('Kesim')} ${Lb}–${Lb}`, gy: gy1 + hh2 }]; })()
      : [{ m: style as Mode, title: '', gy: vy + Math.max(18, (vh - dh) / 2) + H * k }];
    for (const ln of lanes) {
      const gy = ln.gy, Y = (z: number) => gy - z * k;
      o.push(strip(g, ln.m, X, Y, k, gy, hid));
      if (ln.title) o.push(`<text x="${n2(X(0))}" y="${n2(gy + 15)}" font-size="3" font-weight="600" letter-spacing="0.3" fill="#1d1d1b">${esc(ln.title.toUpperCase())}</text>`);
      // kesilgan loyiha binolari ustida qavat soni
      if (ln.m === 'kesim' || ln.m === 'aksent') { const seen = new Set<string>(); for (const it of g.items) if (it.kind === 'loyiha' && it.cut && !seen.has(it.id) && (it.s1 - it.s0) * k > 3) { seen.add(it.id); o.push(`<text x="${n2(X((it.s0 + it.s1) / 2))}" y="${n2(Y(it.z0 + it.h) - 1.4)}" font-size="2.3" text-anchor="middle" fill="#1d1d1b">${esc(`${it.floors} ${tr('q.')}`)}</text>`); } }
      // shahar silueti: dominantalar (≥ 12 m, bir-biridan ≥ 18 mm)
      if (ln.m === 'shahar') {
        const used: number[] = [];
        for (const it of g.items.filter(i => i.kind === 'atrof' && !i.cut && i.h >= 12).sort((a, b) => b.h - a.h)) {
          const x = X((it.s0 + it.s1) / 2); if (used.some(u => Math.abs(u - x) < 18)) continue; used.push(x);
          const y = Y(it.z0 + it.h);
          o.push(`<path data-sil="dominanta" d="M${n2(x)} ${n2(y - 1)}V${n2(y - 9)}" stroke="#555" stroke-width="0.15"/><text x="${n2(x)}" y="${n2(y - 10)}" font-size="2.2" text-anchor="middle" fill="#333">${f1(it.h)} m</text>`);
          if (used.length >= 6) break;
        }
      }
      // uchastka chegarasi
      for (const s of g.site) o.push(`<path data-sil-site="1" d="M${n2(X(s))} ${n2(gy + 6)}V${n2(Y(H - 2))}" stroke="#c0392b" stroke-width="0.3" stroke-dasharray="3 1.2 0.6 1.2"/>`);
      if (g.site.length >= 2) { const a = X(g.site[0]), b = X(g.site[g.site.length - 1]); o.push(`<path d="M${n2(a)} ${n2(gy + 8)}H${n2(b)}" stroke="#c0392b" stroke-width="0.3"/><text x="${n2((a + b) / 2)}" y="${n2(gy + 7)}" font-size="2.4" text-anchor="middle" fill="#c0392b">${esc(tr('Uchastka'))}</text>`); }
      // balandlik shkalasi (chapda)
      const hs = H > 120 ? 20 : 10, xl = X(0) - 3;
      let sc = `M${n2(xl)} ${n2(gy)}V${n2(Y(Math.floor((H - 2) / hs) * hs))}`;
      for (let z = 0; z <= H - 2; z += hs) { sc += `M${n2(xl - 1)} ${n2(Y(z))}h1`; o.push(`<text x="${n2(xl - 1.6)}" y="${n2(Y(z) + 0.8)}" font-size="2.2" text-anchor="end" fill="#55524b">${z}</text>`); }
      o.push(`<path d="${sc}" stroke="#1d1d1b" stroke-width="0.2" fill="none"/>`);
      // masofa shkalasi (pastda) — juft uslubda faqat pastki lentada
      if (ln === lanes[lanes.length - 1]) {
        const ds = [10, 20, 50, 100, 200, 500].find(v => v * k >= 14) ?? 1000, yb = gy + (two ? 22 : 13);
        let dp = `M${n2(X(0))} ${n2(yb)}H${n2(X(g.L))}`;
        for (let s = 0; s <= g.L + 0.01; s += ds) { dp += `M${n2(X(s))} ${n2(yb - 0.8)}v1.6`; o.push(`<text x="${n2(X(s))}" y="${n2(yb + 3.6)}" font-size="2.2" text-anchor="middle" fill="#55524b">${Math.round(s)}</text>`); }
        o.push(`<path d="${dp}" stroke="#1d1d1b" stroke-width="0.2" fill="none"/>`);
      }
    }
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
