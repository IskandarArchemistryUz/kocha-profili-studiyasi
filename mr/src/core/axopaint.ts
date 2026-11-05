/**
 * Aksonometriya varagʻi uslublari (claude/aksonometriya-uslublar-tahlil.md, 2-bosqich: 1, 4, 5, 6-uslublar).
 * 1 — «Funksiya ranglari» (avvaldan bor, sahna uslubi `funksiya`).
 * 4 — Qavatlilik: 5 sinfli ketma-ket palitra (sinf chegaralari — ANDOZA, normada yoʻq).
 * 5 — Loyiha va kontekst: hammasi oq, loyiha binolari qalin urgʻu konturda, kontekst ingichka kulrangda.
 * 6 — Saqlanadi va buziladi: saqlanadigan mavjud binolar kulrang, buziladiganlar shaffof qizil iz (avvaldan), yangi — urgʻu rangida.
 * Faqat koʻrinish — loyiha, hisob va meʼyorlar oʻzgarmaydi.
 */
export type AxoPaint = 'qavatlilik' | 'kontekst' | 'demontaj';

/** Urgʻu rangi (relyef halqasi va uchastka bilan bir oila) */
export const ACCENT = 0xc0643a;
/** Yangi bino — urgʻu rangining ochroq toni (oq maket ustida aniq ajralsin) */
export const NEW_COL = 0xe2a184;
/** Saqlanadigan mavjud bino */
export const KEPT_COL = 0xbdb9b0;
/** Buziladigan — avvalgi sahna rangi (shaffof qizil) */
export const GONE_COL = 0xd9534f;

/** Qavatlilik sinflari: [eng koʻp qavat, rang, yorliq] — ANDOZA */
export const FLOOR_CLASSES: [number, number, string][] = [
  [3, 0xf3e3b5, '1–3'],
  [5, 0xf0c27b, '4–5'],
  [9, 0xe2945a, '6–9'],
  [16, 0xc0643a, '10–16'],
  [Infinity, 0x7a3b22, '17+'],
];
export const floorClass = (floors: number): number => { const k = FLOOR_CLASSES.findIndex(([m]) => floors <= m); return k < 0 ? FLOOR_CLASSES.length - 1 : k; };

/** Loyiha binosi rangi (null — sahnaning odatiy oq maket rangi) */
export function paintColor(p: AxoPaint, floors: number): number | null {
  if (p === 'qavatlilik') return FLOOR_CLASSES[floorClass(floors)][1];
  if (p === 'demontaj') return NEW_COL;
  return 0xffffff;
}
/** Loyiha binosi qirralari: kontekst uslubida — qalin urgʻu; boshqasida odatiy */
export const paintEdge = (p: AxoPaint): { color: number; opacity: number } | null => (p === 'kontekst' ? { color: ACCENT, opacity: 1 } : null);

export interface LegendItem { color: number; label: string; hatch?: boolean }
/** Legenda: faqat sahnada bor toifalar (qoida 6) */
export function paintLegend(p: AxoPaint, project: { floors: number }[], kept: number, gone: number): LegendItem[] {
  if (p === 'qavatlilik') {
    const has = new Set(project.map(b => floorClass(b.floors)));
    return FLOOR_CLASSES.map(([, c, l], i) => ({ color: c, label: `${l}`, i })).filter(x => has.has(x.i)).map(({ color, label }) => ({ color, label }));
  }
  if (p === 'kontekst') return [...(project.length ? [{ color: ACCENT, label: 'Loyiha' }] : []), { color: 0xd7d4cd, label: 'Atrof (mavjud)' }];
  return [
    ...(project.length ? [{ color: NEW_COL, label: 'Yangi' }] : []),
    ...(kept ? [{ color: KEPT_COL, label: 'Saqlanadi' }] : []),
    ...(gone ? [{ color: GONE_COL, label: 'Buziladi', hatch: true }] : []),
  ];
}
