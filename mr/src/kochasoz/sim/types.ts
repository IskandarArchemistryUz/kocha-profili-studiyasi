/* Koʻchasoz · Harakat modeli (Vissim/Visum-lite) — umumiy turlar.
   Birliklar: metr, soniya, m/s. Strategiya: claude/harakat-modeli-strategiya-12-11.md (loyiha hujjati). */

export type XY = [number, number];

/** Transport va harakat turlari. */
export type AgentType = 'car' | 'bus' | 'mini' | 'tram' | 'bike' | 'scoot';
/** Harakat yoʻnalishi: L — chapga, U — chapga razvorot orqali, T — toʻgʻri, R — oʻngga, V — velo yoʻlak, M — tramvay. */
export type Move = 'L' | 'U' | 'T' | 'R' | 'V' | 'M';
/** Boʻlak: A — ichki, B — chetki, P — chap choʻntak, V — velo yoʻlak, M — tramvay yoʻli. */
export type Lane = 'A' | 'B' | 'P' | 'V' | 'M';

export interface TypeSpec {
  /** uzunlik, m */ len: number;
  /** erkin tezlik, m/s */ v0: number;
  /** IDM tezlanish, m/s² */ a: number;
  /** yoʻlovchi soni (odam-kechikish uchun) */ occ: number;
  name: string;
}

/** Andoza qiymatlar — kalibrlanmagan. Manba: prototip (Design kanvas, 1-doska). */
export const TYPES: Record<AgentType, TypeSpec> = {
  car: { len: 4.5, v0: 13.9, a: 1.5, occ: 1.3, name: 'Yengil mashina' },
  bus: { len: 12, v0: 12, a: 1.0, occ: 40, name: 'Avtobus' },
  mini: { len: 6, v0: 13, a: 1.3, occ: 10, name: 'Marshrutka' },
  tram: { len: 30, v0: 11, a: 1.0, occ: 120, name: 'Tramvay' },
  bike: { len: 1.8, v0: 4.5, a: 1.0, occ: 1, name: 'Velosiped' },
  scoot: { len: 1.5, v0: 6, a: 1.5, occ: 1, name: 'Samokat, moped' },
};

/** Tarmoq (yondashuv) ichidagi zona: shu oraliqda agent qaysi tarmoq va boʻlakda ekani. */
export interface Zone {
  /** tarmoq indeksi 0..3 (shimol, sharq, janub, gʻarb) */ k: number;
  lane: Lane;
  /** zona boshlanadigan yoʻl masofasi (path s), m */ s0: number;
  /** zona boshidagi tarmoq-koordinata (yondashuv boshidan), m */ d0: number;
  /** toʻxtash chizigʻi (path s), m */ stopS: number;
  /** zona tugashi (path s), m */ sEnd: number;
  /** signal uchun harakat */ m: 'L' | 'T' | 'R';
  /** shu s dan keyin agent choʻntakda (P) */ pocketS: number | null;
}

/** Piyoda oʻtish joyini kesib oʻtish nuqtasi. */
export interface Crossing {
  /** path s, m */ s: number;
  /** oʻtish joyi (tarmoq) indeksi */ j: number;
  /** oʻtish joyi boʻylab koordinata, m */ x: number;
}

export interface Path {
  key: string;
  k: number;
  m: Move;
  lane0: Lane;
  pts: XY[];
  cum: number[];
  len: number;
  zones: Zone[];
  cross: Crossing[];
  /** chiqish tarmogʻi */ exit: number;
  /** erkin harakat vaqti, s (chapga ketuvchi uchun — toʻgʻridan-toʻgʻri chap burilish vaqti) */ free: number;
  /** razvorot yoyi boshlanishi (path s) va markazi — faqat U */
  uS?: number;
  uC?: XY;
}

/** Trotuar boʻylab yuruvchi samokat yoʻli (xavf qatlami). */
export interface SideRoute {
  k: number;
  pts: XY[];
  cum: number[];
  len: number;
  /** kesib oʻtiladigan oʻtish joyi */ j: number;
  s1: number; s2: number; x1: number; x2: number;
}

export interface Geometry {
  /** boʻlak eni, m */ laneW: number;
  /** tugun yarim eni, m */ H: number;
  /** oʻtish joyi boshlanishi va oxiri (oʻtish joyi koordinatasida), m */ xwFrom: number; xwTo: number;
  /** orolcha joyi (oʻtish joyi koordinatasida), m */ islandX: number;
  paths: Record<string, Path>;
  side: SideRoute[];
}

export type Pocket = 0 | 30 | 60;
export type Mode3 = 'off' | 'mixed' | 'lane';

export interface Scenario {
  /** har tarmoqqa mashina, mash./soat */ demand: number;
  /** svetofor sikli, s */ cycle: number;
  /** chap choʻntak uzunligi, m (0 — yoʻq) */ pocket: Pocket;
  /** chapga taqiq + razvorot (2 faza) */ ban: boolean;
  /** qoʻshimcha seksiya (oʻngga strelka) */ extra: boolean;
  /** piyoda, kishi/soat har oʻtishda */ ped: number;
  /** xavfsizlik orolchasi */ island: boolean;
  bike: Mode3;
  bus: Mode3;
  mini: boolean;
  tram: boolean;
  /** xavf qatlami: trotuardagi samokat (hisobga kirmaydi) */
  scoot: 'off' | 'side' | 'lane';
  /** tasodif urugʻi */ seed: number;
}

export const DEFAULT_SCENARIO: Scenario = {
  demand: 600, cycle: 90, pocket: 60, ban: false, extra: false, ped: 300, island: false,
  bike: 'lane', bus: 'mixed', mini: true, tram: false, scoot: 'off', seed: 1,
};

/** Andoza oqimlar (har tarmoqqa, soatiga). */
export const RATES = { bus: 12, mini: 20, bike: 100, tram: 10, scoot: 120 };
/** Andoza burilish ulushlari. */
export const TURNS = { L: 0.2, T: 0.65, R: 0.15 };
