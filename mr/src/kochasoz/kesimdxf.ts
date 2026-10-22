/**
 * Koʻchasoz kesimi (B · «Koʻndalang kesim») → DXF: metr, 1:1, (0,0) — chap qizil chiziq × yer sathi, Y — yuqoriga.
 * Ekrandagi SVG dan olinadi: har path/text da data-ly (CAD qatlami) va data-bk (siluet nusxasi) bor — b.ts.
 * Toʻldirish → HATCH (SOLID, true color), kontur → LWPOLYLINE, matn → TEXT, siluetlar → BLOCK + INSERT,
 * zona enlari va qizil chiziqlar orasi → haqiqiy DIMENSION. UI (tugmalar, tanlov belgisi) — eksportga kirmaydi.
 */
type Pt = [number, number];
interface Ent { kind: 'poly'; rings: { pts: Pt[]; closed: boolean }[]; fill: number | null; stroke: number | null; dash: boolean }
interface TEnt { kind: 'text'; p: Pt; h: number; s: string; align: 0 | 1 | 2; color: number }
type AnyEnt = Ent | TEnt;

export interface KesimOpts { sil: boolean; util: boolean; legend: boolean; bld: boolean; title: boolean }
export const KESIM_OPTS_DEF: KesimOpts = { sil: true, util: true, legend: true, bld: true, title: true };

const SIL_LAYERS = new Set(['KS_PEOPLE', 'KS_CARS', 'KS_TREES', 'KS_FURNITURE']);
const BLOCK_WORD: Record<string, string> = { KS_PEOPLE: 'ODAM', KS_CARS: 'TRANSPORT', KS_TREES: 'DARAXT', KS_FURNITURE: 'JIHOZ' };

/* ---------- SVG path → nuqtalar (egri chiziqlar 0,02 m aniqlikda boʻlinadi) ---------- */
function flatten(d: string, tolPx: number): { pts: Pt[]; closed: boolean }[] {
  const tok = d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g) ?? [];
  const out: { pts: Pt[]; closed: boolean }[] = []; let cur: Pt[] = [], x = 0, y = 0, sx = 0, sy = 0, cmd = '', i = 0, lcx = 0, lcy = 0, lq: Pt | null = null;
  const num = () => parseFloat(tok[i++]);
  const push = (p: Pt) => cur.push(p);
  const start = () => { if (cur.length > 1) out.push({ pts: cur, closed: false }); cur = []; };
  const seg = (L: number) => Math.max(2, Math.min(64, Math.ceil(L / Math.max(0.05, tolPx))));
  const cubic = (x1: number, y1: number, x2: number, y2: number, x3: number, y3: number) => {
    const n = seg(Math.hypot(x1 - x, y1 - y) + Math.hypot(x2 - x1, y2 - y1) + Math.hypot(x3 - x2, y3 - y2));
    for (let k = 1; k <= n; k++) { const t = k / n, u = 1 - t; push([u * u * u * x + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3, u * u * u * y + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3]); }
    lcx = x2; lcy = y2; x = x3; y = y3;
  };
  const quad = (x1: number, y1: number, x2: number, y2: number) => {
    const n = seg(Math.hypot(x1 - x, y1 - y) + Math.hypot(x2 - x1, y2 - y1));
    for (let k = 1; k <= n; k++) { const t = k / n, u = 1 - t; push([u * u * x + 2 * u * t * x1 + t * t * x2, u * u * y + 2 * u * t * y1 + t * t * y2]); }
    lq = [x1, y1]; x = x2; y = y2;
  };
  const arc = (rx: number, ry: number, phi: number, fa: number, fs: number, x2: number, y2: number) => {
    if (!rx || !ry) { push([x2, y2]); x = x2; y = y2; return; }
    rx = Math.abs(rx); ry = Math.abs(ry); const p = phi * Math.PI / 180, c = Math.cos(p), s = Math.sin(p);
    const dx = (x - x2) / 2, dy = (y - y2) / 2, x1p = c * dx + s * dy, y1p = -s * dx + c * dy;
    const lam = x1p * x1p / (rx * rx) + y1p * y1p / (ry * ry); if (lam > 1) { rx *= Math.sqrt(lam); ry *= Math.sqrt(lam); }
    const num2 = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p, den = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
    const k = (fa === fs ? -1 : 1) * Math.sqrt(Math.max(0, num2 / (den || 1)));
    const cxp = k * rx * y1p / ry, cyp = -k * ry * x1p / rx, cx = c * cxp - s * cyp + (x + x2) / 2, cy = s * cxp + c * cyp + (y + y2) / 2;
    const ang = (ux: number, uy: number, vx: number, vy: number) => { const a = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy); return a; };
    const t1 = ang(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry); let dt = ang((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
    if (!fs && dt > 0) dt -= 2 * Math.PI; else if (fs && dt < 0) dt += 2 * Math.PI;
    const n = seg(Math.abs(dt) * Math.max(rx, ry));
    for (let j = 1; j <= n; j++) { const t = t1 + dt * j / n; push([cx + rx * Math.cos(t) * c - ry * Math.sin(t) * s, cy + rx * Math.cos(t) * s + ry * Math.sin(t) * c]); }
    x = x2; y = y2;
  };
  while (i < tok.length) {
    if (/[a-zA-Z]/.test(tok[i])) cmd = tok[i++];
    const rel = cmd === cmd.toLowerCase(), C = cmd.toUpperCase(), ox = rel ? x : 0, oy = rel ? y : 0;
    if (C !== 'C' && C !== 'S') { lcx = NaN; }
    if (C !== 'Q' && C !== 'T') lq = null;
    switch (C) {
      case 'M': { start(); x = ox + num(); y = oy + num(); sx = x; sy = y; push([x, y]); cmd = rel ? 'l' : 'L'; break; }
      case 'L': { x = ox + num(); y = oy + num(); push([x, y]); break; }
      case 'H': { x = (rel ? x : 0) + num(); push([x, y]); break; }
      case 'V': { y = (rel ? y : 0) + num(); push([x, y]); break; }
      case 'C': { const a = num() + ox, b = num() + oy, c2 = num() + ox, d2 = num() + oy, e = num() + ox, f = num() + oy; cubic(a, b, c2, d2, e, f); break; }
      case 'S': { const rx1 = Number.isNaN(lcx) ? x : 2 * x - lcx, ry1 = Number.isNaN(lcx) ? y : 2 * y - lcy, c2 = num() + ox, d2 = num() + oy, e = num() + ox, f = num() + oy; cubic(rx1, ry1, c2, d2, e, f); break; }
      case 'Q': { const a = num() + ox, b = num() + oy, e = num() + ox, f = num() + oy; quad(a, b, e, f); break; }
      case 'T': { const c1: Pt = lq ? [2 * x - lq[0], 2 * y - lq[1]] : [x, y], e = num() + ox, f = num() + oy; quad(c1[0], c1[1], e, f); break; }
      case 'A': { const rx = num(), ry = num(), ph = num(), fa = num(), fs = num(), e = num() + ox, f = num() + oy; arc(rx, ry, ph, fa, fs, e, f); break; }
      case 'Z': { if (cur.length > 1) out.push({ pts: cur, closed: true }); cur = []; x = sx; y = sy; break; }
      default: i++;
    }
  }
  if (cur.length > 1) out.push({ pts: cur, closed: false });
  return out;
}

/** CSS rang → 0xRRGGBB (null — yoʻq yoki toʻliq shaffof) */
let cctx: CanvasRenderingContext2D | null = null;
function color(v: string | null): number | null {
  if (!v || v === 'none' || v === 'transparent') return null;
  cctx ??= document.createElement('canvas').getContext('2d');
  if (!cctx) return null;
  cctx.fillStyle = '#000'; cctx.fillStyle = v; const s = String(cctx.fillStyle);
  if (s.startsWith('#')) return parseInt(s.slice(1), 16);
  const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null;
  const [r, g, b, a] = m[1].split(',').map(Number); if (a !== undefined && a < 0.05) return null;
  return (r << 16) | (g << 8) | b;
}

export interface KesimData { svg: SVGSVGElement; widths: number[]; rl: number; name: string }

/** Ekrandagi kesimdan entitylar (metrda) */
export function collect(svg: SVGSVGElement, o: KesimOpts): { ents: { ly: string; bk: string; e: AnyEnt }[]; px: number; dimY: number; totY: number } | null {
  const x0 = parseFloat(svg.dataset.x0 ?? ''), px = parseFloat(svg.dataset.px ?? ''), G = parseFloat(svg.dataset.g ?? '');
  if (!Number.isFinite(x0) || !Number.isFinite(px) || !Number.isFinite(G) || px <= 0) return null;
  const inv = svg.getScreenCTM()?.inverse(); if (!inv) return null;
  const M = (x: number, y: number): Pt => [(x - x0) / px, (G - y) / px];
  const skip = (ly: string) => !ly || ly === 'UI' || ly === 'DIMROW' || (!o.sil && SIL_LAYERS.has(ly)) || (!o.util && ly.startsWith('KS_UTILITIES')) || (!o.legend && ly === 'KS_LEGEND') || (!o.bld && ly === 'KS_BUILDINGS') || (!o.title && ly === 'KS_TEXT');
  const ents: { ly: string; bk: string; e: AnyEnt }[] = [];
  svg.querySelectorAll<SVGPathElement>('path[data-ly]').forEach(el => {
    const ly = el.dataset.ly ?? ''; if (skip(ly)) return;
    const op = parseFloat(el.getAttribute('opacity') ?? '1'); if (op <= 0.02) return;
    const fill = color(el.getAttribute('fill')), sw = parseFloat(el.getAttribute('stroke-width') ?? '0'), stroke = sw > 0 ? color(el.getAttribute('stroke')) : null;
    if (fill == null && stroke == null) return;
    const ctm = el.getScreenCTM(); if (!ctm) return; const m = inv.multiply(ctm);
    const k = Math.hypot(m.a, m.b) || 1;   // element birligi → viewBox birligi
    const rings = flatten(el.getAttribute('d') ?? '', 0.02 * px / k).map(r => ({ closed: r.closed, pts: r.pts.map(([x, y]) => M(m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f)) }));
    if (!rings.length) return;
    ents.push({ ly, bk: el.dataset.bk ?? '', e: { kind: 'poly', rings, fill, stroke, dash: !!el.getAttribute('stroke-dasharray') } });
  });
  svg.querySelectorAll<SVGTextElement>('text[data-ly]').forEach(el => {
    const ly = el.dataset.ly ?? ''; if (skip(ly)) return;
    const s = (el.textContent ?? '').trim(); if (!s) return;
    const fs = parseFloat(el.getAttribute('font-size') ?? '10'), an = el.getAttribute('text-anchor');
    const ctm = el.getScreenCTM(); if (!ctm) return; const m = inv.multiply(ctm), x = parseFloat(el.getAttribute('x') ?? '0'), y = parseFloat(el.getAttribute('y') ?? '0');
    ents.push({ ly, bk: el.dataset.bk ?? '', e: { kind: 'text', p: M(m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f), h: fs * 0.72 / px, s, align: an === 'end' ? 2 : an === 'middle' ? 1 : 0, color: color(el.getAttribute('fill')) ?? 0x141414 } });
  });
  const d1 = parseFloat(svg.dataset.d1 ?? ''), d3 = parseFloat(svg.dataset.d3 ?? '');
  return { ents, px, dimY: (G - d1) / px, totY: (G - d3) / px };
}

/** DXF 420 (true color): 0x00RRGGBB butun son */
const hex = (c: number) => String(c & 0xffffff);

export async function kesimDxf(K: KesimData, o: KesimOpts = KESIM_OPTS_DEF): Promise<string | null> {
  const C = collect(K.svg, o); if (!C) return null;
  const X = await import('@tarikjabiri/dxf');
  const w = new X.DxfWriter();
  w.setUnits(X.Units.Meters);
  w.addLType('KS_DASH', '__ __ __', [0.5, -0.3]);
  const layers = new Set(C.ents.map(e => e.ly)); layers.add('KS_DIM');
  for (const L of [...layers].sort()) w.addLayer(L, L === 'KS_RED_LINE' ? 1 : 7, 'CONTINUOUS');
  // oʻlcham uslubi — metrda (matn 0,25 m, ikki kasr, nuqta)
  const ds = w.addDimStyle('KS') as unknown as Record<string, number | string>;
  Object.assign(ds, { DIMTXT: 0.25, DIMASZ: 0.15, DIMEXO: 0.1, DIMEXE: 0.15, DIMGAP: 0.06, DIMDEC: 2, DIMDSEP: 46, DIMTAD: 1, DIMZIN: 0, DIMSCALE: 1, DIMLUNIT: 2, DIMTIH: 0, DIMTOH: 0 });

  type Target = { addLWPolyline: typeof w.addLWPolyline; addHatch: typeof w.addHatch; addText: typeof w.addText };
  const emit = (T: Target, e: AnyEnt, layerName: string, dx = 0, dy = 0) => {
    if (e.kind === 'text') {
      const p = X.point3d(e.p[0] - dx, e.p[1] - dy);
      T.addText(p, e.h, e.s, { layerName, trueColor: hex(e.color), horizontalAlignment: e.align, verticalAlignment: X.TextVerticalAlignment.BaseLine, ...(e.align ? { secondAlignmentPoint: p } : {}) });
      return;
    }
    if (e.fill != null) {
      const bp = new X.HatchBoundaryPaths();
      for (const r of e.rings) if (r.pts.length >= 3) bp.addPolylineBoundary(new X.HatchPolylineBoundary(r.pts.map(q => X.vertex(q[0] - dx, q[1] - dy))));
      if (bp.length) T.addHatch(bp, X.pattern({ name: X.HatchPredefinedPatterns.SOLID }), { layerName, trueColor: hex(e.fill) } as never);
    }
    if (e.stroke != null) for (const r of e.rings) T.addLWPolyline(r.pts.map(q => ({ point: X.point2d(q[0] - dx, q[1] - dy) })), { layerName, trueColor: hex(e.stroke), flags: r.closed ? X.LWPolylineFlags.Closed : X.LWPolylineFlags.None, ...(e.dash ? { lineType: 'KS_DASH' } : {}) });
  };

  // siluetlar — bloklar: bir xil shakl (nisbiy geometriya + ranglar) bitta blok
  const groups = new Map<string, { ly: string; e: AnyEnt }[]>();
  for (const it of C.ents) if (it.bk) { const g = groups.get(it.bk); if (g) g.push(it); else groups.set(it.bk, [it]); }
  const defs = new Map<string, string>(), cnt: Record<string, number> = {};
  for (const [, items] of groups) {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity;
    for (const { e } of items) { const pts = e.kind === 'text' ? [e.p] : e.rings.flatMap(r => r.pts); for (const p of pts) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); } }
    const ax = (x0 + x1) / 2, ay = y0, ly = items[0].ly;
    const r3 = (v: number) => Math.round(v * 1000);
    const sig = JSON.stringify(items.map(({ e }) => e.kind === 'text' ? ['t', e.s, r3(e.p[0] - ax), r3(e.p[1] - ay)] : [e.fill, e.stroke, e.rings.map(r => r.pts.map(p => [r3(p[0] - ax), r3(p[1] - ay)]))]));
    let name = defs.get(sig);
    if (!name) {
      const wd = BLOCK_WORD[ly] ?? 'BLOK'; cnt[wd] = (cnt[wd] ?? 0) + 1; name = `KS_${wd}_${cnt[wd]}`; defs.set(sig, name);
      const b = w.addBlock(name) as unknown as Target;
      for (const { e } of items) emit(b, e, '0', ax, ay);
    }
    w.addInsert(name, X.point3d(ax, ay), { layerName: ly });
  }
  for (const it of C.ents) if (!it.bk) emit(w as unknown as Target, it.e, it.ly);

  // haqiqiy oʻlchamlar: har zona eni va qizil chiziqlar orasi
  let acc = 0; const xs = [0, ...K.widths.map(v => (acc += v))];
  /* DIMENSION ning koʻrinadigan chizmasi (blok): oʻlcham chizigʻi, chiqish chiziqlari, 45° belgilar, matn — CAD uni oʻqiydi,
     tahrirlanganda «KS» uslubi boʻyicha qayta chizadi */
  let dn = 0;
  const dim = (a: number, b: number, y: number) => {
    const name = `KS_DIMBLK_${++dn}`, B = w.addBlock(name) as unknown as Target & { addLine: typeof w.addLine }, o = { layerName: '0', trueColor: hex(0x2f2e2b) }, t = 0.12;
    B.addLine(X.point3d(a, y), X.point3d(b, y), o);
    for (const x of [a, b]) { B.addLine(X.point3d(x, -0.1), X.point3d(x, y - 0.15), o); B.addLine(X.point3d(x - t, y - t), X.point3d(x + t, y + t), o); }
    const v = (b - a).toFixed(2), m = X.point3d((a + b) / 2, y + 0.06);
    B.addText(m, 0.25, v, { ...o, horizontalAlignment: X.TextHorizontalAlignment.Center, verticalAlignment: X.TextVerticalAlignment.BaseLine, secondAlignmentPoint: m });
    w.addLinearDim(X.point3d(a, 0), X.point3d(b, 0), { layerName: 'KS_DIM', styleName: 'KS', offset: y, blockName: name, middlePoint: m, ActualMeasurement: b - a } as never);
  };
  if (Number.isFinite(C.dimY)) for (let i = 1; i < xs.length; i++) dim(xs[i - 1], xs[i], C.dimY);
  if (Number.isFinite(C.totY)) dim(0, K.rl, C.totY);
  // ASCII dan tashqari belgilar (ʻ, –, ·, −, kirill) — DXF \\U+XXXX koʻrinishida: kodirovkaga bogʻliq emas (AutoCAD, Archicad, eski oʻquvchilar)
  return w.stringify().replace(/[^\x00-\x7f]/g, ch => '\\U+' + ch.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0'));
}
