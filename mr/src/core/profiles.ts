/**
 * Koʻcha profillari va ularning ShNQ 2.07.01-23 boʻyicha tekshiruvi.
 * Manba (asl matndan, D:\Work\normalar): 310-band → 20-jadval (tasma kengligi, tasmalar soni, piyoda yoʻlagining eng kichik kengligi)
 * va 20-jadvalning 1-izohi (qizil chiziqlardagi kenglik: magistral yoʻllar 50–100, magistral koʻchalar 40–100,
 * mahalliy koʻcha va yoʻllar 15–30 m); 338-band (oʻtish yoʻli 5,5 m, trotuar 1,5 m); 404-band (velo yoʻlak ≥ 1,2 / 1,5 / 1,0 m).
 */
import { PRESET_PROFILES } from './presets';
export type PartKind = 'trotuar' | 'yashil' | 'velo' | 'parkovka' | 'qatnov' | 'ajratuvchi' | 'avtobus' | 'tramvay';
export interface Part { k: PartKind; w: number; lanes?: number }

/** ShNQ toifasi (20-jadval qatorlari) */
export type Cat = 'mahalliy' | 'tuman-magistral' | 'shahar-magistral-3' | 'otish' | 'piyoda';
export interface CatNorm { name: string; red?: [number, number]; lane?: [number, number]; lanes?: [number, number]; walk?: number; clause: string }

export const CATS: Record<Cat, CatNorm> = {
  mahalliy: { name: 'Mahalliy ahamiyatdagi koʻcha (turar joy hududi)', red: [15, 30], lane: [3.0, 3.5], lanes: [2, 4], walk: 2.0, clause: '310-band, 20-jadval; 1-izoh' },
  'tuman-magistral': { name: 'Tuman ahamiyatidagi magistral koʻcha', red: [40, 100], lane: [3.25, 3.75], lanes: [2, 4], walk: 2.25, clause: '310-band, 20-jadval; 1-izoh' },
  'shahar-magistral-3': { name: 'Shahar ahamiyatidagi magistral koʻcha, 3-sinf', red: [40, 100], lane: [3.25, 3.75], lanes: [4, 6], walk: 3.0, clause: '310-band, 20-jadval; 1-izoh' },
  otish: { name: 'Oʻtish yoʻli (kvartal ichi)', lane: [2.75, 3.5], lanes: [1, 2], walk: 1.5, clause: '338–339-bandlar' },
  piyoda: { name: 'Piyodalar koʻchasi', clause: '20-jadval: kenglik hisob-kitob boʻyicha' },
};

export interface Profile { id: string; name: string; note: string; cat: Cat; parts: Part[] }

const P = (k: PartKind, w: number, lanes?: number): Part => (lanes ? { k, w, lanes } : { k, w });

export const PROFILES: Profile[] = [
  { id: 'otish-8', name: 'Oʻtish yoʻli', note: 'kvartal ichi · 338-band', cat: 'otish', parts: [P('trotuar', 1.5), P('qatnov', 5.5, 2), P('trotuar', 1.5)] },
  { id: 'mahalla-15', name: 'Mahalla koʻchasi', note: 'sekin harakat, daraxtlar', cat: 'mahalliy', parts: [P('trotuar', 2.25), P('yashil', 2), P('qatnov', 6.5, 2), P('yashil', 2), P('trotuar', 2.25)] },
  { id: 'piyoda-12', name: 'Piyoda koʻchasi', note: 'transportsiz', cat: 'piyoda', parts: [P('trotuar', 4), P('yashil', 4), P('trotuar', 4)] },
  { id: 'turar-20', name: 'Turar joy koʻchasi', note: 'parkovka va daraxtlar', cat: 'mahalliy', parts: [P('trotuar', 2.5), P('yashil', 1.5), P('parkovka', 2.5), P('qatnov', 7, 2), P('parkovka', 2.5), P('yashil', 1.5), P('trotuar', 2.5)] },
  { id: 'tuman-40', name: 'Tuman magistrali', note: 'bulvar, velo yoʻlak, 2+2', cat: 'tuman-magistral', parts: [P('trotuar', 3), P('yashil', 6.5), P('velo', 1.5), P('qatnov', 7, 2), P('ajratuvchi', 4), P('qatnov', 7, 2), P('velo', 1.5), P('yashil', 6.5), P('trotuar', 3)] },
  { id: 'magistral-45', name: 'Shahar magistrali', note: '3-sinf, 3+3 qator', cat: 'shahar-magistral-3', parts: [P('trotuar', 4), P('yashil', 3), P('velo', 2), P('qatnov', 10.5, 3), P('ajratuvchi', 6), P('qatnov', 10.5, 3), P('velo', 2), P('yashil', 3), P('trotuar', 4)] },
];

/** eski (2-bosqich) profil id lari → yangilari */
const ALIAS: Record<string, string> = { 'servis-9': 'otish-8', 'mahalla-12': 'mahalla-15', 'tuman-30': 'tuman-40' };
export const profileById = (id: string): Profile => PROFILES.find(p => p.id === (ALIAS[id] ?? id)) ?? PRESET_PROFILES.find(p => p.id === id) ?? PROFILES[1];
export const profileWidth = (p: Profile): number => p.parts.reduce((s, x) => s + x.w, 0);

export interface Issue { what: string; value: string; norm: string }

/** Profilni toifasi meʼyoriga solishtirish; boʻsh roʻyxat — mos */
export function checkProfile(p: Profile): Issue[] {
  const n = CATS[p.cat], out: Issue[] = [], W = profileWidth(p), f = (v: number) => String(Math.round(v * 100) / 100).replace('.', ',');
  if (n.red && (W < n.red[0] || W > n.red[1])) out.push({ what: 'Qizil chiziqlardagi kenglik', value: `${f(W)} m`, norm: `${n.red[0]}–${n.red[1]} m` });
  const cw = p.parts.filter(x => x.k === 'qatnov'), lanes = cw.reduce((s, x) => s + (x.lanes ?? 1), 0);
  if (n.lanes && cw.length && (lanes < n.lanes[0] || lanes > n.lanes[1])) out.push({ what: 'Tasmalar soni (ikki yoʻnalishda)', value: String(lanes), norm: `${n.lanes[0]}–${n.lanes[1]}` });
  if (n.lane) for (const x of cw) { const lw = x.w / (x.lanes ?? 1); if (lw < n.lane[0] - 1e-6 || lw > n.lane[1] + 1e-6) out.push({ what: 'Tasma kengligi', value: `${f(lw)} m`, norm: `${f(n.lane[0])}–${f(n.lane[1])} m` }); }
  if (n.walk) for (const x of p.parts.filter(x => x.k === 'trotuar')) if (x.w < n.walk - 1e-6) out.push({ what: 'Piyoda yoʻlagi', value: `${f(x.w)} m`, norm: `≥ ${f(n.walk)} m` });
  for (const x of p.parts.filter(x => x.k === 'velo')) if (x.w < 1.0 - 1e-6) out.push({ what: 'Velo yoʻlak (404-band)', value: `${f(x.w)} m`, norm: '≥ 1,0 m (trotuar yonida)' });
  return out;
}
