/**
 * Funksiyalar (zonalar) katalogi — yagona taʼrif: nomi, guruhi, rangi, turar joy ulushi, generator uchun odatiy qavatlar.
 * Ijtimoiy funksiyalar (maktab, MTM) keyin aholi soniga nisbatan ShNQ 2.07.01-23 boʻyicha tekshiriladi.
 */
export type Use = 'turar' | 'yakka' | 'aralash' | 'maktab' | 'mtm' | 'poliklinika' | 'ijtimoiy' | 'savdo' | 'ofis' | 'mehmonxona' | 'sport' | 'yashil' | 'maydon' | 'avtoturargoh' | 'texnik';

export interface UseDef { id: Use; name: string; group: string; color: number; base: number; res: number; floors?: [number, number]; build: boolean }

export const USES: UseDef[] = [
  { id: 'turar', name: 'Koʻp qavatli turar joy', group: 'Turar joy', color: 0xf3d9a4, base: 0xa8756b, res: 1, build: true },
  { id: 'yakka', name: 'Yakka uylar', group: 'Turar joy', color: 0xf6e7b8, base: 0xa8756b, res: 1, floors: [2, 2], build: true },
  { id: 'aralash', name: 'Aralash (pasti savdo)', group: 'Turar joy', color: 0xf0b48a, base: 0xa8756b, res: 0.7, build: true },
  { id: 'maktab', name: 'Maktab', group: 'Ijtimoiy', color: 0xf5c26b, base: 0xc0873b, res: 0, floors: [3, 4], build: true },
  { id: 'mtm', name: 'MTM (bogʻcha)', group: 'Ijtimoiy', color: 0xf8dc6c, base: 0xc0a03b, res: 0, floors: [2, 3], build: true },
  { id: 'poliklinika', name: 'Poliklinika', group: 'Ijtimoiy', color: 0x7fc6b8, base: 0x3f8f80, res: 0, floors: [3, 5], build: true },
  { id: 'ijtimoiy', name: 'Boshqa ijtimoiy', group: 'Ijtimoiy', color: 0xa9c8ea, base: 0x6f8fb0, res: 0, floors: [2, 5], build: true },
  { id: 'savdo', name: 'Savdo', group: 'Tijorat', color: 0xe99a9a, base: 0xb05f5f, res: 0, floors: [1, 3], build: true },
  { id: 'ofis', name: 'Ofis', group: 'Tijorat', color: 0x8fa6d6, base: 0x4f68a0, res: 0, build: true },
  { id: 'mehmonxona', name: 'Mehmonxona', group: 'Tijorat', color: 0xb99ad6, base: 0x7a5aa0, res: 0, build: true },
  { id: 'sport', name: 'Sport', group: 'Ochiq joy', color: 0x8fcfe0, base: 0x4f8fa0, res: 0, build: false },
  { id: 'yashil', name: 'Park / bogʻ', group: 'Ochiq joy', color: 0xa8d08d, base: 0x7da36a, res: 0, build: false },
  { id: 'maydon', name: 'Skver / maydon', group: 'Ochiq joy', color: 0xe3d9c6, base: 0xa89f8e, res: 0, build: false },
  { id: 'avtoturargoh', name: 'Avtoturargoh', group: 'Texnik', color: 0xb9bcc2, base: 0x6f7378, res: 0, build: false },
  { id: 'texnik', name: 'Muhandislik', group: 'Texnik', color: 0xc9c3b8, base: 0x8f8a80, res: 0, build: false },
];

export const useDef = (u: string): UseDef => USES.find(x => x.id === u) ?? USES[0];
export const isUse = (u: unknown): u is Use => typeof u === 'string' && USES.some(x => x.id === u);
