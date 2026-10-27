/* Narx jadvali — narxlar.html dagi «Nimaga tanga sarflanadi» roʻyxati bilan bir xil (andoza, qoralama).
   Narx faqat shu yerda hisoblanadi: brauzer yuborgan narxga ishonilmaydi. */

/** id → { coins, mr } ; mr: true — koeffitsiyent qoʻllanadigan Master reja fayli.
    Narxlar sahifasi: «Koeffitsiyent Master reja toza fayllariga qoʻllanadi: albom, DXF, IFC, TIK, hisobot». */
export const ITEMS = Object.freeze({
  // Master reja (mr: true → ×1 / ×1,5 / ×2)
  'mr.album':     { coins: 12, mr: true },  // Albom — hamma varaqlar, PDF
  'mr.dxf':       { coins: 8,  mr: true },  // DXF — reja
  'mr.dxf3d':     { coins: 8,  mr: true },  // DXF — 3D
  'mr.glb':       { coins: 8,  mr: false },  // GLB yoki OBJ
  'mr.tik':       { coins: 3,  mr: true },  // TIK — Excel
  'mr.norm':      { coins: 5,  mr: true },  // Meʼyoriy tekshiruv — PDF hisobot
  'mr.ifc':       { coins: 10, mr: true },  // IFC4
  'mr.sheet':     { coins: 5,  mr: false },  // Varaq — PDF yoki SVG
  'mr.axo':       { coins: 5,  mr: false },  // Aksonometriya — SVG
  'mr.floors':    { coins: 10, mr: false },  // Qavat rejalari
  'mr.png':       { coins: 1,  mr: false }, // PNG — toza
  'mr.site':      { coins: 10, mr: true },  // 3 ga dan katta uchastkani ochish (bepul — 3 ga gacha; egasi qarori 27.10), loyiha va pogʻona uchun bir marta
  // Chizmadon
  'chz.album':    { coins: 10, mr: false }, // Chizmadon albomi — PDF / PPTX
  // Koʻchasoz
  'ks.section':   { coins: 3,  mr: false }, // toza kesim varagʻi
  'ks.a3':        { coins: 5,  mr: false }, // A3 albom varagʻi
  'ks.dxf':       { coins: 5,  mr: false },
  // Joyshunos
  'joy.passport': { coins: 5,  mr: false }, // toza pasport PDF
  'joy.axo':      { coins: 5,  mr: false }, // aksonometriya SVG
  // Atrof eksporti (1 km² — haftalik sinov ichida)
  'ctx.4':        { coins: 2,  mr: false },
  'ctx.8':        { coins: 4,  mr: false },
});

/** Serverdagi ogʻir hisoblar: haftasiga 3 tasi bepul, keyin shu narx */
export const TRIALS = Object.freeze({
  'area':  1, // yangi hudud (1 km² gacha atrof)
  'flats': 2, // xonadonlar hisobi
  'wind':  2, // shamol oqimi
});
export const TRIALS_PER_WEEK = 3;

/** Toʻplamlar (soʻm, USD) — narxlar sahifasidagi kartalar */
export const PACKS = Object.freeze([
  { id: 'p10',  coins: 10,  uzs: 39000,  usd: 4 },
  { id: 'p30',  coins: 30,  uzs: 99000,  usd: 10 },
  { id: 'p100', coins: 100, uzs: 290000, usd: 25 },
  { id: 'p300', coins: 300, uzs: 690000, usd: 59 },
]);

/** Uchastka maydoni (ga) → koeffitsiyent: ≤ 15 → 1, 15–60 → 1,5, > 60 → 2 */
export function areaK(ha) {
  const a = Number(ha);
  if (!Number.isFinite(a) || a < 0) throw new PriceError('maydon notoʻgʻri');
  return a <= 15 ? 1 : a <= 60 ? 1.5 : 2;
}

export class PriceError extends Error {}

/** Toʻplam narxi: MR fayllar yigʻindisi × k (yaxlitlanadi) + qolganlari. Takroriy id bir marta hisoblanadi. */
export function priceOf(items, areaHa = 0) {
  if (!Array.isArray(items) || !items.length || items.length > 30) throw new PriceError('fayllar roʻyxati notoʻgʻri');
  const uniq = [...new Set(items)].sort();
  let mr = 0, rest = 0;
  for (const id of uniq) {
    const it = ITEMS[id];
    if (!it) throw new PriceError(`nomaʼlum fayl: ${id}`);
    if (it.mr) mr += it.coins; else rest += it.coins;
  }
  const k = mr ? areaK(areaHa) : 1;
  return { items: uniq, k, coins: Math.round(mr * k) + rest };
}
