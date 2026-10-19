/**
 * Eski 24 namuna (templates.ts) → 7 maket oilasi (layouts.ts): koʻchirish jadvali. templates.ts hozircha oʻchirilmaydi —
 * erkin varaq sifatida «Varaqlar → Namuna» menyusida turibdi. Oʻchirish qarori — Iskandarda (Project: claude/chizmadon-namunalar-kochirish.md).
 *   aniq — bir xil vazifa va tarkib; yaqin — vazifa bir xil, tarkib yoki yoʻnalish farq qiladi; boʻshliq — 7 oilada mos tur yoʻq (taklif bilan).
 */
export type MapQ = 'aniq' | 'yaqin' | 'boʻshliq';
export interface TplMap { fam: string; page: string; q: MapQ; note: string }

export const TPL_MAP: Record<string, TplMap> = {
  /* Master reja albomi (7) */
  'mr-muqova': { fam: 'mr', page: 'mr-cover', q: 'aniq', note: 'Muqova: toʻliq render, ustida nom bloki.' },
  'mr-mundarija': { fam: 'mr', page: 'mr-toc', q: 'aniq', note: 'Mundarija ikki ustunda; «Mundarija avtomatik» — varaq nomlaridan.' },
  'mr-bolim': { fam: 'mr', page: 'mr-chapter', q: 'aniq', note: 'Boʻlim ajratgich: katta raqam va nom.' },
  'mr-bosh': { fam: 'mr', page: 'mr-map-l', q: 'aniq', note: 'Katta xarita + shartli belgilar (Vaziyat sxemasi maketi).' },
  'mr-tahlil4': { fam: 'mr', page: 'mr-diag4', q: 'aniq', note: '4 tahlil xaritasi, har biri ostida izoh.' },
  'mr-tik': { fam: 'kz', page: 'kz-finance', q: 'boʻshliq', note: 'mr oilasida «TIK jadvali + diagramma» yoʻq; eng yaqini — KZ «Moliyaviy model». Taklif: mr ga «mr-tik» turi.' },
  'mr-bosqich': { fam: 'mr', page: 'mr-phase', q: 'yaqin', note: 'Uch bosqich alohida xaritada emas — bitta xarita bosqichlar bilan va roʻyxat.' },
  /* APZ (3) */
  'apz-vaziyat': { fam: 'st', page: 'st-map', q: 'yaqin', note: 'A3 portret xarita varagʻi; vaziyat sxemasi izohi matn katagida.' },
  'apz-shartlar': { fam: 'st', page: 'st-table', q: 'aniq', note: 'Toʻliq varaq jadval (A4 portret).' },
  'apz-uchastka': { fam: 'mr', page: 'mr-lots', q: 'yaqin', note: 'Uchastkalar xaritasi + jadval; qizil chiziq — qoʻlda (xavf belgisi bilan).' },
  /* Planshet (3) */
  'pl-a1': { fam: 'kl', page: 'kl-hero', q: 'yaqin', note: 'Landshaft planshet: katta render, kesim, tahlil va matn.' },
  'pl-a0': { fam: 'kp', page: 'kp-plan', q: 'aniq', note: 'Portret planshet, bosh reja markazda.' },
  'pl-konkurs': { fam: 'kp', page: 'kp-render', q: 'aniq', note: 'Konkurs plansheti, shifr bilan (muallif koʻrsatilmaydi).' },
  /* Portfolio (5) */
  'pf-muqova': { fam: 'iu', page: 'iu-cover', q: 'yaqin', note: 'Portfolio oilasi yoʻq — ikki ustunli taqdimot muqovasi.' },
  'pf-katta': { fam: 'iu', page: 'iu-text-ph2', q: 'aniq', note: 'Katta foto + matn.' },
  'pf-tor': { fam: 'mr', page: 'mr-photos', q: 'yaqin', note: '4 × 2 foto toʻri (eski — 2 × 2).' },
  'pf-yoyma': { fam: 'tq', page: 'tq-full', q: 'aniq', note: 'Toʻliq varaq rasm.' },
  'pf-men': { fam: 'iu', page: 'iu-contact', q: 'aniq', note: 'Portret va 4 qator aloqa.' },
  /* Xalqaro fond hisoboti (6) */
  'xf-muqova': { fam: 'st', page: 'st-cover', q: 'aniq', note: 'Portret kitob muqovasi: rangli maydon, nom, foto tasma.' },
  'xf-mundarija': { fam: 'st', page: 'st-text', q: 'boʻshliq', note: 'st oilasida mundarija yoʻq. Taklif: «st-toc» (mundarija + qisqartmalar).' },
  'xf-xulosa': { fam: 'st', page: 'st-text', q: 'yaqin', note: 'Matn va koʻrsatkichlar varagʻi; asosiy fikr — kirish matni katagida.' },
  'xf-bob': { fam: 'st', page: 'st-chapter', q: 'aniq', note: 'Bob ajratgich: foto + katta raqam.' },
  'xf-jadval': { fam: 'st', page: 'st-table', q: 'aniq', note: 'Toʻliq varaq jadval.' },
  'xf-xarita': { fam: 'st', page: 'st-map', q: 'aniq', note: 'Xarita varagʻi + shartli belgilar.' },
};
