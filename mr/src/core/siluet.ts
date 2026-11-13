/**
 * 13.11 (egasi): «master rejani kesib atrof bilan qanday koʻrinyapti — shuni koʻrish uchun» kesim va fasad.
 * Sahnada ixtiyoriy chiziq A → B va koʻrish tomoni: chiziq kesgan binolar — kesim (qora), chiziq ortidagi `depth` m gacha
 * binolar — fasad (uzoqlashgan sari ochroq), loyiha binolari — rangli, atrof (OSM) — kulrang. Yer — relyef toʻridan (bor boʻlsa).
 * Chiziq koʻcha boʻylab qoʻyilsa — koʻchaning toʻliq fasadi (razvertka). Barcha koordinatalar — mahalliy metr.
 */
import type { Project, SiteSection } from './doc';
import { frame } from './geo';
import { bLevels } from './levels';
import type { SheetCtx } from './sheet';
import type { ReliefGrid } from './relief';

type XY = [number, number];
export interface SilItem { kind: 'loyiha' | 'atrof' | 'daraxt'; cut: boolean; s0: number; s1: number; z0: number; h: number; d: number; floors?: number; id: string; /** daraxt siluet turi (silh.json) */ sp?: string; /** loyiha binosi funksiyasi va noturar pastki qavatlar (rangli fasad uchun) */ use?: string; nonRes?: number }
/** Kesim chizigʻidagi odam (shtaffaj): s — joyi, sp — silh.json siluet kaliti */
export interface SilPerson { s: number; sp: string; flip: boolean }
export interface SilGeom {
  sec: SiteSection; A: XY; B: XY; u: XY; n: XY; L: number; depth: number;
  /** chizish tartibida: uzoqdan yaqinga, keyin kesimlar */
  items: SilItem[];
  /** yer profili (s, z) — z nisbiy (eng past nuqta 0) */
  ground: [number, number][];
  /** uchastka chegarasi chiziqni kesgan nuqtalar (s) */
  site: number[];
  /** orqa relyef (ufq): har s da koʻrish chuqurligidagi eng baland yer, z ≥ ground — uzoqdagi binolar «havoda osilmasin» (13.11) */
  horizon: [number, number][];
  /** odamlar — kesim chizigʻi boʻylab, kesilgan binolar ichida emas */
  people: SilPerson[];
  /** ground z = 0 ning mutlaq balandligi, m (relyef yoʻq — null) */
  zAbs: number | null;
  /** ariq/daryo (OSM waterways) chiziqni kesgan joylar, s */
  water: number[];
}

/** Barqaror psevdotasodifiy son [0, 1) — kalit boʻyicha (har chizishda bir xil) */
function rnd(key: string): number { let h = 2166136261; for (let i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 16777619); } return ((h >>> 0) % 100000) / 100000; }
const TREE_SP = ['31', '32', '31', '33', '32'];
const PEOPLE_SP = ['6b', '1', '7', '16', '6e', '17', '22', '6a', '0', '3', '11'];

export const SEC_LABELS = '123456789';
export const nextSecLabel = (doc: Project): string => { const used = new Set((doc.sections ?? []).map(s => s.label)); return [...SEC_LABELS].find(l => !used.has(l)) ?? '9'; };

/** Relyef toʻridan bilinear balandlik (toʻrdan tashqarida — null) */
export function heightAt(g: ReliefGrid | null | undefined, p: XY): number | null {
  if (!g) return null;
  const fx = (p[0] - (g.c0[0] - g.radius)) / g.step, fy = (p[1] - (g.c0[1] - g.radius)) / g.step;
  if (fx < 0 || fy < 0 || fx > g.n - 1 || fy > g.n - 1) return null;
  const i = Math.min(g.n - 2, Math.floor(fx)), j = Math.min(g.n - 2, Math.floor(fy)), tx = fx - i, ty = fy - j, H = (a: number, b: number) => g.h[b * g.n + a];
  return H(i, j) * (1 - tx) * (1 - ty) + H(i + 1, j) * tx * (1 - ty) + H(i, j + 1) * (1 - tx) * ty + H(i + 1, j + 1) * tx * ty;
}

/** Koʻpburchakni yarim tekislik f(p) ≥ 0 bilan qirqish (Sutherland–Hodgman) */
function clipHalf(r: XY[], f: (p: XY) => number): XY[] {
  const out: XY[] = [];
  for (let i = 0; i < r.length; i++) {
    const a = r[i], b = r[(i + 1) % r.length], fa = f(a), fb = f(b);
    if (fa >= 0) out.push(a);
    if ((fa >= 0) !== (fb >= 0)) { const t = fa / (fa - fb); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
  }
  return out;
}

/** Chiziq (d = 0) koʻpburchak ichida qolgan s oraliqlari */
function cutSpans(r: XY[], S: (p: XY) => number, D: (p: XY) => number): [number, number][] {
  const xs: number[] = [];
  for (let i = 0; i < r.length; i++) {
    const a = r[i], b = r[(i + 1) % r.length], da = D(a), db = D(b);
    if ((da > 0) !== (db > 0)) { const t = da / (da - db); xs.push(S(a) + (S(b) - S(a)) * t); }
  }
  xs.sort((x, y) => x - y);
  const out: [number, number][] = [];
  for (let i = 0; i + 1 < xs.length; i += 2) out.push([xs[i], xs[i + 1]]);
  return out;
}

export function silhouette(doc: Project, ctx: SheetCtx | null, sec: SiteSection): SilGeom | null {
  const fr = frame(doc.origin), A = fr.toLocal(sec.a) as XY, B = fr.toLocal(sec.b) as XY;
  const L = Math.hypot(B[0] - A[0], B[1] - A[1]); if (L < 5) return null;
  const u: XY = [(B[0] - A[0]) / L, (B[1] - A[1]) / L], look = sec.look === -1 ? -1 : 1, n: XY = [-u[1] * look, u[0] * look], depth = Math.max(10, sec.depth);
  const S = (p: XY) => (p[0] - A[0]) * u[0] + (p[1] - A[1]) * u[1], D = (p: XY) => (p[0] - A[0]) * n[0] + (p[1] - A[1]) * n[1];
  const terr = ctx?.terrain ?? null;
  // yer profili: chiziq boʻylab 2–5 m qadam
  const steps = Math.max(2, Math.min(400, Math.round(L / 3))), raw: [number, number | null][] = [];
  for (let i = 0; i <= steps; i++) { const s = L * i / steps; raw.push([s, heightAt(terr, [A[0] + u[0] * s, A[1] + u[1] * s])]); }
  const known = raw.filter(r => r[1] != null) as [number, number][];
  const zref = known.length ? Math.min(...known.map(r => r[1])) : 0;
  const ground: [number, number][] = known.length > 1 ? raw.map(([s, z]) => [s, (z ?? zref) - zref]) : [[0, 0], [L, 0]];
  const zAt = (p: XY): number => { const z = heightAt(terr, p); return z == null ? 0 : z - zref; };

  const items: SilItem[] = [];
  const add = (id: string, ring: XY[], h: number, kind: 'loyiha' | 'atrof', floors?: number, use?: string, nonRes?: number) => {
    if (ring.length < 3 || !(h > 0)) return;
    let r = clipHalf(ring, D); r = clipHalf(r, p => depth - D(p)); r = clipHalf(r, S); r = clipHalf(r, p => L - S(p));
    if (r.length < 3) return;
    const ss = r.map(S), ds = r.map(D), s0 = Math.min(...ss), s1 = Math.max(...ss); if (s1 - s0 < 0.3) return;
    const c: XY = [r.reduce((t, p) => t + p[0], 0) / r.length, r.reduce((t, p) => t + p[1], 0) / r.length], z0 = Math.min(zAt(c), ...r.map(zAt));
    items.push({ kind, cut: false, s0, s1, z0, h, d: Math.min(...ds), floors, id, ...(use ? { use } : {}), ...(nonRes ? { nonRes } : {}) });
    for (const [a, b] of cutSpans(ring, S, D)) { const c0 = Math.max(0, a), c1 = Math.min(L, b); if (c1 - c0 > 0.2) items.push({ kind, cut: true, s0: c0, s1: c1, z0, h, d: 0, floors, id, ...(use ? { use } : {}), ...(nonRes ? { nonRes } : {}) }); }
  };
  for (const b of doc.buildings) if (b.floors > 0) add(b.id, b.footprint.map(q => fr.toLocal(q) as XY), bLevels(doc.settings, b).top, 'loyiha', b.floors, b.use, b.nonRes);
  for (const b of ctx?.buildings ?? []) if (b.rings[0]) add(`osm${b.id}`, b.rings[0], b.h, 'atrof');
  // daraxtlar (atrof): toj ~ 8 m, eng yaqin 600 tasi
  const trees = (ctx?.trees ?? []).map(p => ({ p, s: S(p), d: D(p) })).filter(t => t.d >= 0 && t.d <= depth && t.s >= 0 && t.s <= L).sort((a, b) => a.d - b.d).slice(0, 600);
  for (const [i, t] of trees.entries()) { const r = rnd(`${Math.round(t.p[0] * 10)}:${Math.round(t.p[1] * 10)}`), h = 7 + 6 * r; items.push({ kind: 'daraxt', cut: false, s0: t.s - h * 0.32, s1: t.s + h * 0.32, z0: zAt(t.p), h, d: t.d, id: `t${i}`, sp: TREE_SP[Math.floor(r * 997) % TREE_SP.length] }); }
  items.sort((a, b) => (a.cut === b.cut ? b.d - a.d : a.cut ? 1 : -1));

  const site: number[] = [];
  const ring = doc.site?.rings[0]?.map(q => fr.toLocal(q) as XY);
  if (ring) for (const [a, b] of cutSpans(ring, S, D)) { if (a >= 0 && a <= L) site.push(a); if (b >= 0 && b <= L) site.push(b); }
  // orqa relyef: chiziqdan depth gacha (≤ 30 qadam) eng baland yer
  const dStep = Math.max(10, depth / 30);
  const horizon: [number, number][] = ground.map(([s, z]) => {
    let m = z;
    for (let d = dStep; d <= depth + 0.01; d += dStep) { const h = heightAt(terr, [A[0] + u[0] * s + n[0] * d, A[1] + u[1] * s + n[1] * d]); if (h != null && h - zref > m) m = h - zref; }
    return [s, m];
  });
  // odamlar: har 18–55 m da, kesilgan bino ichida emas
  const cuts = items.filter(i => i.cut);
  const people: SilPerson[] = [];
  for (let s = 6 + 14 * rnd(`${sec.id}p`), k = 0; s < L - 4; k++) {
    if (!cuts.some(c => s > c.s0 - 1.5 && s < c.s1 + 1.5)) { const r = rnd(`${sec.id}:${k}`); people.push({ s, sp: PEOPLE_SP[Math.floor(r * 1009) % PEOPLE_SP.length], flip: r > 0.5 }); }
    s += 18 + 37 * rnd(`${sec.id}s${k}`);
  }
  const water: number[] = [];
  for (const w of ctx?.waterways ?? []) for (let i = 0; i + 1 < w.pts.length; i++) {
    const a = w.pts[i], b = w.pts[i + 1], da = D(a), db = D(b);
    if ((da > 0) !== (db > 0)) { const t = da / (da - db), s = S(a) + (S(b) - S(a)) * t; if (s >= 0 && s <= L) water.push(s); }
  }
  return { sec, A, B, u, n, L, depth, items, ground, site: site.sort((x, y) => x - y), horizon, people, zAbs: known.length > 1 ? zref : null, water: water.sort((x, y) => x - y) };
}
