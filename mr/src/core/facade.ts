/**
 * Fasad elementlari: deraza va balkon turlari (Bino studiyasi — js/bino3d.js toʻplamidan).
 * Oʻlchamlar — konseptual taqdimot uchun (modul eni ~3,3 m, qavat balandligi loyiha sozlamasidan); ishchi chizma emas.
 */
export type Win = 'klassik' | 'kvadrat' | 'fransuz' | 'ravoq' | 'lenta' | 'panorama';
export type Bal = 'yoq' | 'ochiq' | 'shisha' | 'lodjiya' | 'fransuz' | 'uzluksiz';

/** w — modul enidan ulush, sill/head — poldan tokcha va tepa balandligi (m), arch — yarim doira tepa */
export const WINS: { id: Win; name: string; note: string; w: number; sill: number; head: number; arch?: boolean }[] = [
  { id: 'klassik', name: 'Klassik', note: 'alohida derazalar, 1,6 × 1,5 m', w: 0.5, sill: 0.9, head: 2.4 },
  { id: 'kvadrat', name: 'Kichik kvadrat', note: 'sovet panel / issiq iqlim, 1,2 × 1,2 m', w: 0.38, sill: 1.0, head: 2.2 },
  { id: 'fransuz', name: 'Fransuz (baland)', note: 'poldan, tor va baland, 1,3 × 2,4 m', w: 0.4, sill: 0.1, head: 2.5 },
  { id: 'ravoq', name: 'Ravoqli', note: 'yarim doira tepali — sharqona, neoklassik', w: 0.42, sill: 0.8, head: 2.55, arch: true },
  { id: 'lenta', name: 'Lenta', note: 'gorizontal uzluksiz', w: 0.86, sill: 0.9, head: 2.3 },
  { id: 'panorama', name: 'Panorama', note: 'poldan shiftgacha', w: 0.9, sill: 0.1, head: 2.85 },
];
export const BALS: { id: Bal; name: string; note: string }[] = [
  { id: 'yoq', name: 'Yoʻq', note: '' },
  { id: 'ochiq', name: 'Ochiq balkon', note: 'plita 1,2 m + metall panjara, har 2-modulda' },
  { id: 'shisha', name: 'Shisha toʻsiqli', note: 'plita 1,2 m + shisha parapet' },
  { id: 'lodjiya', name: 'Lodjiya', note: 'yon devorlar va oynalangan old qism, 0,7 m' },
  { id: 'fransuz', name: 'Fransuz balkoni', note: 'deraza oldida panjara, 0,3 m' },
  { id: 'uzluksiz', name: 'Uzluksiz terrasa', note: 'butun fasad boʻylab 1,5 m (yarus)' },
];
export const isWin = (v: unknown): v is Win => WINS.some(x => x.id === v);

/**
 * Parametrik joylashuv (qavat × modul toʻri boʻyicha): derazalar — qator, shaxmat (har qavatda yarim modul siljish), juft, ritm (2 + boʻsh),
 * tasodifiy (bino id siga bogʻliq — har safar bir xil), gradient (pastdan tepaga kengayadi); balkonlar — qaysi modul/qavatda.
 */
export type WinPat = 'qator' | 'shaxmat' | 'juft' | 'ritm' | 'tasodifiy' | 'gradient';
export type BalPat = 'har2' | 'hammasi' | 'shaxmat' | 'ustun' | 'qavat' | 'tasodifiy';
export const WIN_PATS: { id: WinPat; name: string; note: string }[] = [
  { id: 'qator', name: 'Qator', note: 'har modulda, ustma-ust' },
  { id: 'shaxmat', name: 'Shaxmat', note: 'har ikkinchi qavat yarim modul siljigan' },
  { id: 'juft', name: 'Juft', note: 'ikkitadan guruh, oraliq kengroq' },
  { id: 'ritm', name: 'Ritm 2+1', note: 'ikki deraza, bitta yaxlit devor' },
  { id: 'tasodifiy', name: 'Tasodifiy', note: 'kenglik va joy oʻzgaradi (bino boʻyicha barqaror)' },
  { id: 'gradient', name: 'Gradient', note: 'pastda tor, tepada keng' },
];
export const BAL_PATS: { id: BalPat; name: string; note: string }[] = [
  { id: 'har2', name: 'Har 2-modul', note: 'standart' },
  { id: 'hammasi', name: 'Har modul', note: '' },
  { id: 'shaxmat', name: 'Shaxmat', note: 'qavatma-qavat almashadi' },
  { id: 'ustun', name: 'Ustunlar', note: 'har 3-modulda vertikal' },
  { id: 'qavat', name: 'Har 2-qavat', note: 'yarus' },
  { id: 'tasodifiy', name: 'Tasodifiy', note: '~40 %' },
];
export const isWinPat = (v: unknown): v is WinPat => WIN_PATS.some(x => x.id === v);
export const isBalPat = (v: unknown): v is BalPat => BAL_PATS.some(x => x.id === v);
/** barqaror psevdotasodif [0, 1) */
export function hash01(...n: number[]): number { let h = 2166136261; for (const x of n) { h ^= Math.floor(x) + 0x9e3779b9; h = Math.imul(h, 16777619); h ^= h >>> 13; } return ((h >>> 0) % 100000) / 100000; }
export function strSeed(s: string): number { let h = 7; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 2654435761); return h >>> 0; }
/** j — modul, nm — modullar soni, f — qavat (absolyut), t — balandlik ulushi 0..1, k — qirra; on — deraza bormi, off — markaz siljishi (modul ulushida), wk — kenglik koeffitsiyenti */
export function winAt(p: WinPat | undefined, j: number, nm: number, f: number, t: number, seed: number, k: number): { on: boolean; off: number; wk: number } {
  switch (p) {
    case 'shaxmat': { const off = f % 2 ? 0.5 : 0; return { on: !(off && j === nm - 1), off, wk: 0.9 }; }
    case 'juft': return { on: true, off: j % 2 ? -0.17 : 0.17, wk: 0.72 };
    case 'ritm': return { on: j % 3 !== 2, off: j % 3 === 0 ? 0.12 : j % 3 === 1 ? -0.12 : 0, wk: 1.1 };
    case 'tasodifiy': { const r = hash01(seed, k, j, f); return { on: r > 0.14, off: (hash01(seed, k, j, f, 1) - 0.5) * 0.3, wk: 0.65 + 0.6 * hash01(seed, k, j, f, 2) }; }
    case 'gradient': return { on: true, off: 0, wk: 0.55 + 0.6 * Math.max(0, Math.min(1, t)) };
    default: return { on: true, off: 0, wk: 1 };
  }
}
export function balAt(p: BalPat | undefined, j: number, f: number, seed: number, k: number): boolean {
  switch (p) {
    case 'hammasi': return true;
    case 'shaxmat': return (j + f) % 2 === 0;
    case 'ustun': return j % 3 === 1;
    case 'qavat': return f % 2 === 0;
    case 'tasodifiy': return hash01(seed, k, j, f, 3) < 0.4;
    default: return j % 2 === 0;
  }
}
export const isBal = (v: unknown): v is Bal => BALS.some(x => x.id === v);
export const winDef = (id: Win) => WINS.find(x => x.id === id)!;

/** Kichik piktogramma (24×24 SVG yoʻllari) — panel tugmalari uchun */
export const WIN_ICON: Record<Win, string> = {
  klassik: '<rect x="3" y="4" width="18" height="16" rx="1"/><rect x="6" y="7" width="4" height="5"/><rect x="14" y="7" width="4" height="5"/><rect x="6" y="14" width="4" height="4"/><rect x="14" y="14" width="4" height="4"/>',
  kvadrat: '<rect x="3" y="4" width="18" height="16" rx="1"/><rect x="6.5" y="7.5" width="3" height="3"/><rect x="14.5" y="7.5" width="3" height="3"/><rect x="6.5" y="14" width="3" height="3"/><rect x="14.5" y="14" width="3" height="3"/>',
  fransuz: '<rect x="3" y="4" width="18" height="16" rx="1"/><rect x="6" y="6" width="3" height="6"/><rect x="15" y="6" width="3" height="6"/><rect x="6" y="13" width="3" height="6"/><rect x="15" y="13" width="3" height="6"/>',
  ravoq: '<rect x="3" y="4" width="18" height="16" rx="1"/><path d="M6 12V8.5a2 2 0 0 1 4 0V12Z"/><path d="M14 12V8.5a2 2 0 0 1 4 0V12Z"/><path d="M6 19v-3.5a2 2 0 0 1 4 0V19Z"/><path d="M14 19v-3.5a2 2 0 0 1 4 0V19Z"/>',
  lenta: '<rect x="3" y="4" width="18" height="16" rx="1"/><rect x="5" y="7" width="14" height="3"/><rect x="5" y="14" width="14" height="3"/>',
  panorama: '<rect x="3" y="4" width="18" height="16" rx="1"/><rect x="5" y="5.5" width="14" height="6"/><rect x="5" y="12.5" width="14" height="6"/>',
};
export const BAL_ICON: Record<Bal, string> = {
  yoq: '<rect x="4" y="4" width="16" height="16" rx="1"/><path d="M8 8h8M8 12h8M8 16h8" opacity=".5"/>',
  ochiq: '<path d="M4 4v16"/><path d="M4 13h13"/><path d="M17 13V8M14 13V8M11 13V8M8 13V8M4 8h13"/>',
  shisha: '<path d="M4 4v16"/><path d="M4 13h13"/><rect x="5" y="8" width="12" height="5" opacity=".6"/>',
  lodjiya: '<path d="M4 4v16"/><path d="M10 4v16M4 9h6M4 15h6"/><rect x="5" y="10" width="4" height="4"/>',
  fransuz: '<path d="M4 4v16"/><path d="M4 10h5M4 14h5M5.5 10v4M7.5 10v4"/>',
  uzluksiz: '<path d="M4 4v16"/><path d="M4 8h16M4 14h16"/><path d="M8 8V5M12 8V5M16 8V5M8 14v-3M12 14v-3M16 14v-3"/>',
};
