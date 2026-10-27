/* Narx jadvali — narxlar.html dagi «Nimaga tanga sarflanadi» roʻyxati bilan bir xil (andoza, qoralama).
   Narx faqat shu yerda hisoblanadi: brauzer yuborgan narxga ishonilmaydi. */

/**
 * Narx modeli D (egasi tasdiqladi, 28.10.2026; simulyatsiya — project claude/narx-simulyatsiya-28-10.md):
 *  - har amal = asosiy narx × k, k = max(1, √(uchastka ga / 3)) — Master reja amallari (mr: true);
 *  - Koʻchasoz va Joyshunos — koeffitsiyentsiz;
 *  - loyiha shifti: bitta loyihada jami sarf PROJECT_CAP dan oshmaydi, undan keyin — bepul;
 *  - haftasiga 1 ta ogʻir hisob bepul; generatsiya — har loyihada 3 tasi bepul.
 * id → { coins, mr }
 */
export const ITEMS = Object.freeze({
  // Master reja (mr: true → × k)
  'mr.album':     { coins: 20, mr: true },  // Albom — hamma varaqlar, PDF
  'mr.dxf':       { coins: 12, mr: true },  // DXF — reja
  'mr.dxf3d':     { coins: 12, mr: true },  // DXF — 3D
  'mr.glb':       { coins: 8,  mr: true },  // GLB yoki OBJ
  'mr.tik':       { coins: 6,  mr: true },  // TIK — Excel
  'mr.norm':      { coins: 5,  mr: true },  // Meʼyoriy tekshiruv — PDF hisobot
  'mr.ifc':       { coins: 15, mr: true },  // IFC4
  'mr.sheet':     { coins: 4,  mr: true },  // Varaq — PDF yoki SVG
  'mr.axo':       { coins: 4,  mr: true },  // Aksonometriya — SVG
  'mr.floors':    { coins: 8,  mr: true },  // Qavat rejalari
  'mr.png':       { coins: 2,  mr: true },  // PNG — toza
  'mr.site':      { coins: 10, mr: true },  // 3 ga dan katta uchastkani ochish (bepul — 3 ga gacha), loyiha va pogʻona uchun bir marta
  // Chizmadon
  'chz.album':    { coins: 15, mr: true },  // Chizmadon albomi — PDF / PPTX
  // Koʻchasoz
  'ks.section':   { coins: 3,  mr: false }, // toza kesim varagʻi
  'ks.a3':        { coins: 5,  mr: false }, // A3 albom varagʻi
  'ks.dxf':       { coins: 5,  mr: false },
  // Joyshunos
  'joy.passport': { coins: 5,  mr: false }, // toza pasport PDF
  'joy.axo':      { coins: 5,  mr: false }, // aksonometriya SVG
  // Atrof eksporti
  'ctx.4':        { coins: 2,  mr: false },
  'ctx.8':        { coins: 4,  mr: false },
});

/** Ogʻir hisoblar: haftasiga TRIALS_PER_WEEK tasi bepul (hamma turi birga), keyin narx × k. gen — alohida: har loyihada GEN_FREE tasi bepul. */
export const TRIALS = Object.freeze({
  'wind':  { coins: 5, mr: true },  // shamol oqimi
  'sun':   { coins: 4, mr: true },  // insolyatsiya / soya
  'flats': { coins: 6, mr: true },  // xonadonlar hisobi
  'area':  { coins: 1, mr: false }, // yangi hudud (Joyshunos)
  'gen':   { coins: 1, mr: true },  // «Variant taklif qil»
});
export const TRIALS_PER_WEEK = 1;
export const GEN_FREE = 3;

/** Loyiha shifti (tanga): «paket» narxi × 1,5 / 3 000 soʻm — uchastka maydoni boʻyicha */
export function projectCap(ha) {
  const a = Number(ha) || 0;
  return a <= 3 ? 195 : a <= 10 ? 245 : a <= 25 ? 345 : a <= 60 ? 495 : a <= 150 ? 745 : 1000;
}

/** Toʻplamlar (soʻm, USD) — narxlar sahifasidagi kartalar */
export const PACKS = Object.freeze([
  { id: 'p10',   coins: 10,   uzs: 39000,   usd: 4 },
  { id: 'p30',   coins: 30,   uzs: 99000,   usd: 10 },
  { id: 'p100',  coins: 100,  uzs: 290000,  usd: 25 },
  { id: 'p300',  coins: 300,  uzs: 690000,  usd: 59 },
  { id: 'p1000', coins: 1000, uzs: 2000000, usd: 169 },
]);

/** Uchastka maydoni (ga) → koeffitsiyent k = max(1, √(ga / 3)), 0,1 gacha yaxlitlangan */
export function areaK(ha) {
  const a = Number(ha);
  if (!Number.isFinite(a) || a < 0) throw new PriceError('maydon notoʻgʻri');
  return Math.round(Math.max(1, Math.sqrt(a / 3)) * 10) / 10;
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
