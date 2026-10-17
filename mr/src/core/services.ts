/**
 * Xizmat koʻrsatish radiuslari — ShNQ 2.07.01-23, 539-band, 38-jadval (shahar aholi punktlari; asl matndan).
 * Masofa — piyoda yoʻllar tarmogʻi boʻylab (OSM koʻchalari va yoʻlkalari + loyiha koʻchalari), toʻgʻri chiziq emas.
 * Turar joy seksiyasidan eng yaqin tarmoq nuqtasigacha va obyekt uchastkasi chegarasidan tarmoqqacha boʻlgan
 * masofa toʻgʻri chiziq bilan qoʻshiladi (hovli ichidan chiqish).
 */
import type { XY } from './geo';

export type Svc = 'mtm' | 'maktab' | 'poliklinika' | 'dorixona' | 'savdo' | 'sport' | 'mahalla' | 'bekat' | 'metro';

export interface SvcDef { id: Svc; name: string; r: number; note: string }
/** 38-jadval, shahar aholi punktlari ustuni; bekatlar — 382–383-band */
export const SERVICES: SvcDef[] = [
  { id: 'mtm', name: 'MTM (bogʻcha)', r: 300, note: '300 m; past zichlikdagi (1–2 qavatli, tomorqali) hududda 500 m' },
  { id: 'maktab', name: 'Maktab', r: 500, note: 'II bosqich (V–IX) 500 m; I bosqich (I–IV) 300 m, III bosqich (X–XI) 800 m' },
  { id: 'poliklinika', name: 'Poliklinika', r: 1500, note: '1500 m' },
  { id: 'dorixona', name: 'Dorixona', r: 500, note: '500 m; past zichlikda 800 m' },
  { id: 'savdo', name: 'Kundalik savdo', r: 500, note: 'mahalliy markazlar, kundalik qatnov 300–500 m (yuqori chegara olindi)' },
  { id: 'sport', name: 'Sport, sogʻlomlashtirish', r: 500, note: 'hordiq va jismoniy-sogʻlomlashtirish obyektlari 500 m' },
  { id: 'mahalla', name: 'Mahalla markazi', r: 500, note: 'jamoat idoralari 500 m' },
  { id: 'bekat', name: 'Jamoat transporti bekati', r: 400, note: '382-band: uy yoki ishxonadan bekatgacha ≤ 400 m; 383-band: umumshahar markazida ≤ 250 m, dam olish zonalarida ≤ 800 m. Avtobus, trolleybus, tramvay' },
  { id: 'metro', name: 'Metro bekati (kirish)', r: 800, note: 'ShNQ da metro uchun alohida radius berilmagan; 800 m (≈ 10 min piyoda) — taxmin, xalqaro amaliyot. Manba — metro kirishlari' },
];
export const svcDef = (k: Svc) => SERVICES.find(s => s.id === k)!;

/* ---------------- piyoda tarmogʻi ---------------- */
export interface Net { xy: XY[]; adj: { to: number; w: number }[][]; segs: [number, number][]; grid: Map<string, number[]>; C: number }

const key = (p: XY) => `${Math.round(p[0] * 2)},${Math.round(p[1] * 2)}`;

/** Chiziqlar (siniq) → graf. join — loyiha koʻchalari uchlari eng yaqin tugunga ulanadigan masofa, m */
export function buildNet(lines: XY[][], extra: XY[][] = [], join = 25): Net {
  const xy: XY[] = [], ids = new Map<string, number>(), adj: Net['adj'] = [], segs: [number, number][] = [];
  const node = (p: XY) => { const k = key(p); let i = ids.get(k); if (i == null) { i = xy.length; ids.set(k, i); xy.push(p); adj.push([]); } return i; };
  const edge = (a: number, b: number) => { if (a === b) return; const w = Math.hypot(xy[a][0] - xy[b][0], xy[a][1] - xy[b][1]); adj[a].push({ to: b, w }); adj[b].push({ to: a, w }); segs.push([a, b]); };
  for (const l of lines) for (let i = 1; i < l.length; i++) edge(node(l[i - 1]), node(l[i]));
  const base = xy.length;
  const ex: number[][] = extra.map(l => l.map(node));
  ex.forEach(n => { for (let i = 1; i < n.length; i++) edge(n[i - 1], n[i]); });
  // loyiha koʻchasining har tuguni eng yaqin mavjud tugunga (≤ join m) ulanadi
  for (const n of ex) for (const i of n) {
    let best = -1, bd = join;
    for (let j = 0; j < base; j++) { const d = Math.hypot(xy[i][0] - xy[j][0], xy[i][1] - xy[j][1]); if (d < bd) { bd = d; best = j; } }
    if (best >= 0) edge(i, best);
  }
  const C = 50, grid = new Map<string, number[]>();
  segs.forEach(([a, b], s) => {
    const x0 = Math.min(xy[a][0], xy[b][0]), x1 = Math.max(xy[a][0], xy[b][0]), y0 = Math.min(xy[a][1], xy[b][1]), y1 = Math.max(xy[a][1], xy[b][1]);
    for (let i = Math.floor(x0 / C); i <= Math.floor(x1 / C); i++) for (let j = Math.floor(y0 / C); j <= Math.floor(y1 / C); j++) { const k = `${i},${j}`; (grid.get(k) || grid.set(k, []).get(k)!).push(s); }
  });
  return { xy, adj, segs, grid, C };
}

export interface Snap { seg: number; q: XY; d: number }
/** Nuqtani eng yaqin qirraga proyeksiyalash (maxD m gacha) */
export function snap(net: Net, p: XY, maxD = 300): Snap | null {
  let best = null as Snap | null;
  const r = Math.ceil(maxD / net.C), ci = Math.floor(p[0] / net.C), cj = Math.floor(p[1] / net.C), seen = new Set<number>();
  for (let ring = 0; ring <= r; ring++) {
    for (let i = ci - ring; i <= ci + ring; i++) for (let j = cj - ring; j <= cj + ring; j++) {
      if (Math.max(Math.abs(i - ci), Math.abs(j - cj)) !== ring) continue;
      for (const s of net.grid.get(`${i},${j}`) ?? []) {
        if (seen.has(s)) continue; seen.add(s);
        const a = net.xy[net.segs[s][0]], b = net.xy[net.segs[s][1]], dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy;
        const t = L2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2)) : 0, q: XY = [a[0] + dx * t, a[1] + dy * t], d = Math.hypot(p[0] - q[0], p[1] - q[1]);
        if (d <= maxD && (!best || d < best.d)) best = { seg: s, q, d };
      }
    }
    if (best && best.d < ring * net.C) break; // keyingi halqalar yaqinroq boʻlolmaydi
  }
  return best;
}

/** Koʻp manbali Dijkstra: manbalar (nuqtalar) → har tugungacha eng qisqa piyoda masofa */
export function distances(net: Net, sources: XY[], limit = 3000): Float64Array {
  const D = new Float64Array(net.xy.length).fill(Infinity);
  const heap: [number, number][] = [];
  const push = (d: number, i: number) => { heap.push([d, i]); let k = heap.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
  const pop = (): [number, number] => { const top = heap[0], last = heap.pop()!; if (heap.length) { heap[0] = last; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return top; };
  for (const p of sources) {
    const s = snap(net, p); if (!s) continue;
    for (const n of net.segs[s.seg]) { const d = s.d + Math.hypot(net.xy[n][0] - s.q[0], net.xy[n][1] - s.q[1]); if (d < D[n]) { D[n] = d; push(d, n); } }
  }
  while (heap.length) {
    const [d, i] = pop(); if (d > D[i] || d > limit) continue;
    for (const e of net.adj[i]) { const nd = d + e.w; if (nd < D[e.to]) { D[e.to] = nd; push(nd, e.to); } }
  }
  return D;
}

/** Nuqtadan (tarmoqqa chiqib) eng yaqin manbagacha masofa */
export function distAt(net: Net, D: Float64Array, p: XY, sources: XY[] = []): number {
  const s = snap(net, p); if (!s) return Infinity;
  const [a, b] = net.segs[s.seg];
  let d = s.d + Math.min(D[a] + Math.hypot(net.xy[a][0] - s.q[0], net.xy[a][1] - s.q[1]), D[b] + Math.hypot(net.xy[b][0] - s.q[0], net.xy[b][1] - s.q[1]));
  // manba shu kvartalning oʻzida boʻlsa (tarmoqqa chiqmasdan) — toʻgʻri masofa
  for (const q of sources) d = Math.min(d, Math.hypot(p[0] - q[0], p[1] - q[1]) * 1.3);
  return d;
}

/** Halqa chegarasi boʻylab nuqtalar (uchastka chegarasidan manba) */
export function boundaryPts(r: XY[], step = 25): XY[] {
  const out: XY[] = [];
  for (let i = 0; i < r.length; i++) {
    const a = r[i], b = r[(i + 1) % r.length], l = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(l / step));
    for (let k = 0; k < n; k++) out.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]);
  }
  return out;
}

/** Piyodalar yura oladigan OSM yoʻl turlari (avtomagistral va unga kirish yoʻllari bundan mustasno) */
export const WALKABLE = (cls: string) => !/^(motorway|motorway_link|trunk_link|construction|proposed|raceway|bus_guideway)$/.test(cls);

/* ---------------- tahlil ---------------- */
/** r — shu seksiya uchun radiusni almashtirish (masalan bekat: hudud turi va relyef boʻyicha, core/transit.ts) */
export interface Demand { p: XY; w: number; bid: string; r?: Partial<Record<Svc, number>> }
/** r — asosiy (aholi vazni boʻyicha eng koʻp) radius; rd — har seksiya radiusi; rMin/rMax — oraligʻi */
export interface SvcResult { kind: Svc; r: number; rMin: number; rMax: number; rd: number[]; sources: number; share: number; dist: number[]; D: Float64Array; far: number }

/**
 * Har xizmat turi uchun: aholi (seksiyalar, vazni — turar joy GFA) ning radius ichidagi ulushi.
 * Tarmoqqa ulana olmagan manbalar (tarmoq chegarasidan tashqarida) — toʻgʻri masofa × 1,3.
 */
export function analyze(net: Net, demand: Demand[], sources: Record<Svc, { pts: XY[] }[]>): SvcResult[] {
  return SERVICES.map(def => {
    const objs = sources[def.id] ?? [], all = objs.flatMap(o => o.pts);
    const onNet = all.filter(p => snap(net, p)), off = all.filter(p => !snap(net, p));
    const rd = demand.map(d => d.r?.[def.id] ?? def.r), rMax = rd.length ? Math.max(...rd) : def.r, rMin = rd.length ? Math.min(...rd) : def.r;
    const D = distances(net, onNet, rMax * 3);
    let cov = 0, tot = 0;
    const wByR = new Map<number, number>();
    const dist = demand.map((d, i) => {
      let x = distAt(net, D, d.p, all.filter(q => Math.hypot(q[0] - d.p[0], q[1] - d.p[1]) < 60));
      for (const q of off) x = Math.min(x, Math.hypot(q[0] - d.p[0], q[1] - d.p[1]) * 1.3);
      tot += d.w; if (x <= rd[i]) cov += d.w; wByR.set(rd[i], (wByR.get(rd[i]) ?? 0) + d.w); return x;
    });
    const r = [...wByR].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]?.[0] ?? def.r;
    return { kind: def.id, r, rMin, rMax, rd, sources: objs.length, share: tot ? cov / tot : 0, dist, D, far: off.length };
  });
}
