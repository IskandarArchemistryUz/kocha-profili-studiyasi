/**
 * c77 (egasi 11.11): varaqdagi aksonometriya muharriri — qatlamlarni yoqish/oʻchirish, qatlam ranglari, binolar materiali,
 * alohida bino rangi/materiali va tom yozuvlari. Sozlama varaqda saqlanadi (SheetOpts.axo.edit); yoʻq boʻlsa — rasm avvalgidek.
 * Faqat koʻrinish: hisob, meʼyor va loyiha maʼlumoti oʻzgarmaydi. Sof maʼlumot — DOM va three.js ga bogʻliq emas.
 *
 * Ustuvorlik (bino rangi): alohida bino rangi → «Loyiha binolari» qatlami rangi → material rangi (faqat semantik boʻlmagan
 * namunalarda) → namunaning oʻz rangi. Semantik namunalar (funksiya, qavatlilik, kontekst, demontaj) rangi faqat foydalanuvchi
 * aniq rang berganda almashadi; material ularda faqat yuza xossasini (gʻadir-budurlik, metall, shaffoflik) beradi.
 */

export type AxoLayerId = 'loyiha' | 'atrof' | 'daraxt' | 'yol' | 'suv' | 'relyef' | 'uchastka' | 'fon';
export interface AxoLayerDef { id: AxoLayerId; name: string; sw: string[] }
/** Qatlamlar: tartib — panelda; sw — 7 ta tayyor namuna (ANDOZA, normada yoʻq) */
export const AXO_LAYERS: AxoLayerDef[] = [
  { id: 'loyiha', name: 'Loyiha binolari', sw: ['#ffffff', '#f3ede2', '#e8d5bf', '#d9a77f', '#c0643a', '#8fa7b8', '#5f6b7a'] },
  { id: 'atrof', name: 'Atrof binolari', sw: ['#ffffff', '#f4f3f1', '#e6e4df', '#d7d4cd', '#bdbab3', '#a3a09a', '#8c8a85'] },
  { id: 'daraxt', name: 'Daraxtlar', sw: ['#d3e6bf', '#b2da8a', '#9ccc65', '#7fa65a', '#5e8c3f', '#cbd9bf', '#a9b878'] },
  { id: 'yol', name: 'Yoʻllar va bordyurlar', sw: ['#ffffff', '#f1efea', '#dfddd8', '#c9c6bf', '#9a9893', '#585b62', '#3d4147'] },
  { id: 'suv', name: 'Suv', sw: ['#e3eef3', '#cfdfe8', '#b7d3e6', '#9cc3df', '#6fa8d0', '#4a86b8', '#2f5f8a'] },
  { id: 'relyef', name: 'Relyef', sw: ['#ffffff', '#fbfaf8', '#f4f3f1', '#efece5', '#e9e6df', '#e3e8d3', '#d9d2c3'] },
  { id: 'uchastka', name: 'Uchastka chegaralari', sw: ['#c0643a', '#9a8a68', '#b9b5ad', '#6b6964', '#1d1d1b', '#2a6fb0', '#d9534f'] },
  { id: 'fon', name: 'Fon', sw: ['#ffffff', '#fafaf8', '#f6f5f2', '#f1efea', '#eef2f4', '#e9ecef', '#1d1d1b'] },
];
export const AXO_LAYER_IDS = AXO_LAYERS.map(l => l.id);
const isLayer = (v: unknown): v is AxoLayerId => typeof v === 'string' && (AXO_LAYER_IDS as string[]).includes(v);

export type AxoMatId = 'maket' | 'gips' | 'yogoch' | 'beton' | 'shisha';
/** Yengil material: rang + gʻadir-budurlik, metall, shaffoflik (tekstura yoʻq) — ANDOZA qiymatlar */
export interface AxoMat { id: AxoMatId; name: string; color: number; rough: number; metal: number; opacity: number }
export const AXO_MATS: AxoMat[] = [
  { id: 'maket', name: 'Matt maket', color: 0xf3efe7, rough: 1, metal: 0, opacity: 1 },
  { id: 'gips', name: 'Gips', color: 0xfbfaf6, rough: 0.92, metal: 0, opacity: 1 },
  { id: 'yogoch', name: 'Yogʻoch', color: 0xc9a27a, rough: 0.72, metal: 0, opacity: 1 },
  { id: 'beton', name: 'Beton', color: 0xb8b5ae, rough: 0.95, metal: 0, opacity: 1 },
  { id: 'shisha', name: 'Shisha fasad', color: 0xa9c7d8, rough: 0.18, metal: 0.1, opacity: 0.62 },
];
const isMat = (v: unknown): v is AxoMatId => typeof v === 'string' && AXO_MATS.some(m => m.id === v);
export const axoMat = (id?: string | null): AxoMat | null => AXO_MATS.find(m => m.id === id) ?? null;

export interface AxoBld { col?: string; mat?: AxoMatId; text?: string }
export interface AxoRoof { floors?: boolean; num?: boolean; name?: boolean }
/** Varaq sozlamasi (SheetOpts.axo.edit). Hamma maydon ixtiyoriy — yoʻq maydon «andoza» (namunaning oʻzi) */
export interface AxoEdit {
  /** yashirilgan qatlamlar */
  hide?: AxoLayerId[];
  /** qatlam rangi (#rrggbb); daraxt uchun — «rang» rejimi */
  col?: Partial<Record<AxoLayerId, string>>;
  /** daraxtlar: «xira» — sahnaning xira palitrasi (sceneTreeCols kabi); yoʻq — shablonning yorqin ranglari */
  trees?: 'xira';
  /** binolar materiali (hammasi uchun) */
  mat?: AxoMatId;
  /** alohida bino (id boʻyicha): fasad rangi, materiali, tom yozuvi matni (nom oʻrniga) */
  bld?: Record<string, AxoBld>;
  /** tom yozuvlari: qavatlar soni, bino raqami, bino nomi */
  roof?: AxoRoof;
}

const HEX6 = /^#[0-9a-f]{6}$/i;
const hex = (v: unknown): string | undefined => (typeof v === 'string' && HEX6.test(v) ? v.toLowerCase() : undefined);
const clean = <T extends object>(o: T): T | undefined => { const r = Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== false && v !== '')) as T; return Object.keys(r).length ? r : undefined; };

/** Saqlangan qiymatni tozalash: notoʻgʻri maydonlar tashlanadi; boʻsh sozlama — undefined (eski varaq bilan bir xil) */
export function normAxoEdit(x: unknown): AxoEdit | undefined {
  if (!x || typeof x !== 'object') return undefined;
  const o = x as Record<string, unknown>, out: AxoEdit = {};
  if (Array.isArray(o.hide)) { const h = [...new Set(o.hide.filter(isLayer))]; if (h.length) out.hide = AXO_LAYER_IDS.filter(id => h.includes(id)); }
  if (o.col && typeof o.col === 'object') { const c = clean(Object.fromEntries(Object.entries(o.col as Record<string, unknown>).filter(([k]) => isLayer(k)).map(([k, v]) => [k, hex(v)]))); if (c) out.col = c; }
  if (o.trees === 'xira') out.trees = 'xira';
  if (isMat(o.mat)) out.mat = o.mat;
  if (o.bld && typeof o.bld === 'object') {
    const b: Record<string, AxoBld> = {};
    for (const [id, v] of Object.entries(o.bld as Record<string, unknown>)) {
      if (!v || typeof v !== 'object') continue; const q = v as Record<string, unknown>;
      const t = typeof q.text === 'string' ? q.text.trim().slice(0, 60) : undefined;
      const e = clean<AxoBld>({ col: hex(q.col), mat: isMat(q.mat) ? q.mat : undefined, text: t || undefined }); if (e) b[id] = e;
    }
    if (Object.keys(b).length) out.bld = b;
  }
  if (o.roof && typeof o.roof === 'object') { const r = o.roof as Record<string, unknown>; const c = clean<AxoRoof>({ floors: r.floors === true, num: r.num === true, name: r.name === true }); if (c) out.roof = c; }
  return Object.keys(out).length ? out : undefined;
}
/** Kesh kaliti (rasm qayta olinishi uchun) */
export const axoEditKey = (e?: AxoEdit): string => (e ? JSON.stringify(normAxoEdit(e) ?? {}) : '');
/** Nechta sozlama oʻzgartirilgan (panel sarlavhasida) */
export function axoEditCount(e?: AxoEdit): number {
  const n = normAxoEdit(e); if (!n) return 0;
  return (n.hide?.length ?? 0) + Object.keys(n.col ?? {}).length + (n.trees ? 1 : 0) + (n.mat ? 1 : 0) + Object.keys(n.bld ?? {}).length + Object.keys(n.roof ?? {}).length;
}

/** Rang va mazmun semantikasi bor namunalar — ularda material rangi namuna rangini bosmaydi */
export const SEMANTIC_LOOKS = ['funksiya', 'qavatlilik', 'kontekst', 'demontaj'];

/** Sahnaga beriladigan tayyor koʻrsatma (sonlar — 0xrrggbb) */
export interface AxoApply {
  hide: AxoLayerId[];
  col: Partial<Record<AxoLayerId, number>>;
  /** daraxtlar: «xira» yoki aniq rang (col.daraxt); null — shablon */
  trees: 'xira' | 'rang' | null;
  /** hamma loyiha binolari materiali */
  mat: AxoMat | null;
  /** semantik namuna (funksiya, qavatlilik, kontekst, demontaj): material rangi namuna rangini bosmaydi */
  sem: boolean;
  /** alohida binolar: rang (null — umumiy qoida) va material */
  bld: Record<string, { col: number | null; mat: AxoMat | null }>;
  /** tom yozuvlari: badge — faqat qavatlar soni (sahnadagi qavat yorligʻi uslubida); prio — toʻqnashuvda ustunlik */
  labels: { bid: string; text: string; badge: boolean; prio: number }[];
}
export interface AxoBuilding { id: string; floors: number; z0?: number; use: string }
type Tf = (s: string, v: Record<string, string | number>) => string;
const num = (h: string) => parseInt(h.slice(1), 16);

/**
 * Sozlama → sahna koʻrsatmasi. null — hech narsa oʻzgarmaydi (eski varaqlar: rasm aynan avvalgidek).
 * useName — bino nomi (funksiya nomi, tarjima qilingan); n — bino raqami (doc.buildings tartibida, 1 dan).
 */
export function resolveAxo(e: AxoEdit | undefined, look: string | undefined, blds: AxoBuilding[], useName: (u: string) => string, tf: Tf): AxoApply | null {
  const n = normAxoEdit(e); if (!n) return null;
  const col: AxoApply['col'] = {}; for (const [k, v] of Object.entries(n.col ?? {})) col[k as AxoLayerId] = num(v!);
  const sem = SEMANTIC_LOOKS.includes(look ?? 'oq'), M = axoMat(n.mat);
  const bld: AxoApply['bld'] = {};
  for (const [id, b] of Object.entries(n.bld ?? {})) if (b.col || b.mat) bld[id] = { col: b.col ? num(b.col) : null, mat: axoMat(b.mat) };
  const R = n.roof ?? {}, labels: AxoApply['labels'] = [];
  if (!n.hide?.includes('loyiha')) blds.forEach((b, i) => {
    if (!(b.floors > 0)) return;
    const custom = n.bld?.[b.id]?.text, parts: string[] = [];
    if (R.num) parts.push(`№ ${i + 1}`);
    if (custom) parts.push(custom); else if (R.name) parts.push(useName(b.use));
    if (R.floors) parts.push(tf('${n} qavat', { n: (b.z0 ?? 0) + b.floors }));
    if (!parts.length) return;
    const badge = parts.length === 1 && !!R.floors && !R.num && !custom && !R.name;
    labels.push({ bid: b.id, text: badge ? String((b.z0 ?? 0) + b.floors) : parts.join(' · '), badge, prio: (custom ? 1000 : 0) + (b.z0 ?? 0) + b.floors });
  });
  return {
    hide: n.hide ?? [], col,
    trees: n.col?.daraxt ? 'rang' : n.trees === 'xira' ? 'xira' : null,
    mat: M, sem, bld, labels,
  };
}
/** Bitta bino uchun yakuniy rang va material (null — namunaning oʻzi) */
export function bldPaint(A: AxoApply, bid: string): { color: number | null; mat: AxoMat | null } {
  const b = A.bld[bid], mat = b?.mat ?? A.mat;
  return { color: b?.col ?? A.col.loyiha ?? (!A.sem && mat ? mat.color : null), mat };
}

/**
 * Yozuvlar toʻqnashuvi (ekran pikselida): ustunlik boʻyicha navbat bilan joylanadi; band boʻlsa — yuqoriga 1–3 qator suriladi,
 * baribir sigʻmasa — yashiriladi. Natija: har yozuv uchun siljish (yozuv balandligi birligida, 0 — joyida) yoki -1 (yashirin).
 */
export function placeLabels(rects: { x: number; y: number; w: number; h: number; prio: number }[], pad = 3): number[] {
  const out = rects.map(() => -1), taken: { x: number; y: number; w: number; h: number }[] = [];
  const hit = (a: { x: number; y: number; w: number; h: number }) => taken.some(b => a.x < b.x + b.w + pad && b.x < a.x + a.w + pad && a.y < b.y + b.h + pad && b.y < a.y + a.h + pad);
  rects.map((r, i) => ({ r, i })).sort((a, b) => b.r.prio - a.r.prio || a.i - b.i).forEach(({ r, i }) => {
    for (let j = 0; j < 4; j++) { const dy = j * (r.h + pad + 1), c = { x: r.x, y: r.y - dy, w: r.w, h: r.h }; if (!hit(c)) { taken.push(c); out[i] = dy / r.h; return; } }
  });
  return out;
}

/** Rasmdagi bino (tanlash uchun): koordinatalar 0..1 (rasm eni va boʻyiga nisbatan), top/bot — tom va asos halqasi, d — kameragacha */
export interface AxoPick { id: string; top: number[]; bot: number[]; d: number }
const pip = (x: number, y: number, P: number[]): boolean => {
  let ins = false; for (let i = 0, j = P.length - 2; i < P.length; j = i, i += 2) { const xi = P[i], yi = P[i + 1], xj = P[j], yj = P[j + 1]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) ins = !ins; }
  return ins;
};
/** Nuqtadagi bino: tom yoki devor (asos va tom halqalari orasidagi toʻrtburchaklar) ichida; bir nechta boʻlsa — kameraga eng yaqini */
export function hitPick(picks: AxoPick[], x: number, y: number): string | null {
  let best: AxoPick | null = null;
  for (const p of picks) {
    let hitIt = pip(x, y, p.top);
    for (let i = 0, n = p.top.length / 2; !hitIt && i < n; i++) { const k = (i + 1) % n; hitIt = pip(x, y, [p.bot[i * 2], p.bot[i * 2 + 1], p.bot[k * 2], p.bot[k * 2 + 1], p.top[k * 2], p.top[k * 2 + 1], p.top[i * 2], p.top[i * 2 + 1]]); }
    if (hitIt && (!best || p.d < best.d)) best = p;
  }
  return best?.id ?? null;
}

/**
 * «Barcha varaqlarga qoʻllash»: shu varaqning butun muharrir sozlamasi (qatlamlar, ranglar, material, daraxtlar, tom yozuvlari,
 * alohida binolar — rang, material va matn; bino id lari bitta loyihada bir xil) loyihaning barcha akso varaqlariga koʻchiriladi.
 * Namuna (look), kamera, soya va yozuvlar kaliti har varaqning oʻzida qoladi. Natija: yangi varaqlar va oʻzgargan varaqlar soni.
 */
export function copyAxoEdit<T extends { opts: Record<string, unknown> }>(sheets: T[], e: AxoEdit | undefined): { sheets: T[]; n: number } {
  const ed = normAxoEdit(e); let n = 0;
  const out = sheets.map(s => {
    if (s.opts.mode !== 'akso') return s; n++;
    const axo = { ...((s.opts.axo as Record<string, unknown> | undefined) ?? {}) };
    if (ed) axo.edit = structuredClone(ed); else delete axo.edit;
    return { ...s, opts: { ...s.opts, axo } };
  });
  return { sheets: out, n };
}
