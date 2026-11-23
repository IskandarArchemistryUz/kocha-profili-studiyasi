/**
 * Bogʻshunos — jihozlar (MAF) va qoplama konstruksiyalari («pirog») kutubxonasi (15.11.2026).
 *
 * Oʻlchamlar — tipik qiymatlar (T): aniq oʻlcham tanlangan ishlab chiqaruvchi katalogidan olinadi.
 * Meʼyorga bogʻliq qiymatlar manbasi bilan:
 *  · yongʻin-qutqaruv oʻtish yoʻli qoplamasi yongʻin mashinasi ogʻirligiga hisoblanadi — ShNQ 2.07.01-23, 672-band (N);
 *  · bolalar oʻyin jihozlari xavfsizlik zonasi — EN 1176-1 (A), mahalliy standart bilan tekshirilsin.
 * Qoplama qatlam qalinliklari — tipik konstruksiya (T); ishchi loyihada grunt sharoiti va yuklama hisobi bilan aniqlanadi.
 * Narx — narx kitobida (cost.ts), har jihoz uchun alohida band.
 *
 * src 'A' — oʻlcham xorijiy ishlab chiqaruvchi maʼlumotidan (umumiy diapazon); qolgani — tipik (T).
 * Belgi — Bogʻshunosning oʻz minimalistik belgisi; hech qanday ishlab chiqaruvchi nomi, dizayni yoki rasmi ishlatilmaydi.
 */
export type FCat = 'orindiq' | 'stol' | 'urna' | 'soya' | 'suv' | 'velo' | 'yorug' | 'oyin' | 'sport' | 'gul' | 'chegara' | 'axborot' | 'xizmat' | 'sanat';
export const FCATS: Record<FCat, { n: string; c: string }> = {
  orindiq: { n: 'Oʻrindiqlar', c: '#b07a4a' }, stol: { n: 'Stol va piknik', c: '#9c6b3e' }, urna: { n: 'Urna va chiqindi', c: '#6d6a63' },
  soya: { n: 'Soyabon va pergola', c: '#c79a5a' }, suv: { n: 'Suv va favvora', c: '#4f93b8' }, velo: { n: 'Velo va mikromobillik', c: '#3f7fa8' },
  yorug: { n: 'Yoritish', c: '#d9a520' }, oyin: { n: 'Bolalar oʻyin jihozlari', c: '#e2763c' }, sport: { n: 'Sport va workout', c: '#7d5bb5' },
  gul: { n: 'Gul tuvak va qutilar', c: '#7aa34a' }, chegara: { n: 'Toʻsiq, bordyur, bollard', c: '#8a847a' }, axborot: { n: 'Axborot va navigatsiya', c: '#3f6b8f' },
  xizmat: { n: 'Xizmat obyektlari', c: '#857f74' }, sanat: { n: 'Sanʼat va tabiat elementlari', c: '#a0784f' },
};
/** w × d × h, m (T); r — xavfsizlik / foydalanish zonasi radiusi, m; shape — plan belgisi */
export interface Furn { id: string; cat: FCat; n: string; w: number; d: number; h: number; mat: string; shape: 'rect' | 'circle' | 'line'; r?: number; mgn?: boolean; note?: string; src?: 'T' | 'A' }
export const FURN: Furn[] = [
  // oʻrindiqlar
  { id: 'skameyka', cat: 'orindiq', n: 'Skameyka suyanchiqli', w: 1.8, d: 0.65, h: 0.8, mat: 'yogʻoch + metall', shape: 'rect', mgn: true, note: 'tirsaklikli — keksalar uchun' },
  { id: 'skameyka_s', cat: 'orindiq', n: 'Skameyka suyanchiqsiz', w: 1.8, d: 0.45, h: 0.45, mat: 'yogʻoch + beton', shape: 'rect' },
  { id: 'skameyka_u', cat: 'orindiq', n: 'Uzun skameyka (modul)', w: 4, d: 0.6, h: 0.45, mat: 'beton + yogʻoch', shape: 'rect' },
  { id: 'skameyka_d', cat: 'orindiq', n: 'Daraxt atrofi skameykasi', w: 2.4, d: 2.4, h: 0.45, mat: 'yogʻoch', shape: 'circle' },
  { id: 'shezlong', cat: 'orindiq', n: 'Shezlong', w: 1.9, d: 0.7, h: 0.6, mat: 'yogʻoch', shape: 'rect' },
  { id: 'kreslo', cat: 'orindiq', n: 'Koʻchma kreslo', w: 0.6, d: 0.6, h: 0.8, mat: 'metall', shape: 'rect' },
  { id: 'tapchan', cat: 'orindiq', n: 'Soʻri (tapchan)', w: 2.5, d: 2.5, h: 0.5, mat: 'yogʻoch', shape: 'rect', note: 'mahalliy anʼana' },
  { id: 'pogona', cat: 'orindiq', n: 'Oʻtirish pogʻonasi', w: 3, d: 0.9, h: 0.45, mat: 'beton / tosh', shape: 'rect' },
  { id: 'gamak', cat: 'orindiq', n: 'Gamak (ustunlar bilan)', w: 3.5, d: 1.2, h: 1.8, mat: 'metall + toʻqima', shape: 'rect' },
  // stol
  { id: 'piknik_stol', cat: 'stol', n: 'Piknik stoli (skameykalar bilan)', w: 1.8, d: 1.6, h: 0.75, mat: 'yogʻoch', shape: 'rect' },
  { id: 'piknik_mgn', cat: 'stol', n: 'Piknik stoli (aravacha joyi bilan)', w: 2.2, d: 1.6, h: 0.75, mat: 'yogʻoch', shape: 'rect', mgn: true },
  { id: 'shaxmat', cat: 'stol', n: 'Shaxmat stoli', w: 1.6, d: 1.6, h: 0.75, mat: 'beton', shape: 'circle' },
  { id: 'uzun_stol', cat: 'stol', n: 'Uzun jamoa stoli', w: 6, d: 1, h: 0.75, mat: 'yogʻoch', shape: 'rect' },
  { id: 'mangal', cat: 'stol', n: 'Mangal joyi', w: 1.2, d: 0.8, h: 0.9, mat: 'metall', shape: 'rect' },
  // urna
  { id: 'urna', cat: 'urna', n: 'Urna', w: 0.5, d: 0.5, h: 0.9, mat: 'metall', shape: 'circle' },
  { id: 'urna_2', cat: 'urna', n: 'Saralash urnasi (2–3 boʻlim)', w: 1.2, d: 0.45, h: 1, mat: 'metall', shape: 'rect' },
  { id: 'it_urna', cat: 'urna', n: 'It chiqindisi qutisi', w: 0.4, d: 0.4, h: 1.1, mat: 'metall', shape: 'circle' },
  // soya
  { id: 'soyabon', cat: 'soya', n: 'Soyabon (doira)', w: 4, d: 4, h: 3, mat: 'toʻqima', shape: 'circle' },
  { id: 'pergola', cat: 'soya', n: 'Pergola', w: 6, d: 4, h: 3, mat: 'yogʻoch / metall', shape: 'rect' },
  { id: 'pergola_l', cat: 'soya', n: 'Uzun pergola (galereya)', w: 12, d: 3, h: 3, mat: 'metall + chirmoviq', shape: 'rect' },
  { id: 'shiypon', cat: 'soya', n: 'Shiypon (ayvon)', w: 6, d: 6, h: 3.5, mat: 'yogʻoch', shape: 'rect', note: 'mahalliy anʼana' },
  { id: 'tent', cat: 'soya', n: 'Taranglangan tent (parus)', w: 8, d: 6, h: 4, mat: 'toʻqima', shape: 'rect' },
  // suv
  { id: 'ichimlik', cat: 'suv', n: 'Ichimlik favvorasi', w: 0.5, d: 0.5, h: 1, mat: 'metall', shape: 'circle', mgn: true },
  { id: 'favvora', cat: 'suv', n: 'Favvora (hovuz bilan)', w: 6, d: 6, h: 1, mat: 'tosh', shape: 'circle' },
  { id: 'quruq_favvora', cat: 'suv', n: 'Quruq favvora (yer sathida)', w: 8, d: 8, h: 0, mat: 'granit', shape: 'rect' },
  { id: 'tuman', cat: 'suv', n: 'Tuman sepgich (sovutish)', w: 0.3, d: 0.3, h: 3, mat: 'metall', shape: 'circle', note: 'issiq kunlar uchun' },
  { id: 'ariq', cat: 'suv', n: 'Ariq (ochiq kanal)', w: 1, d: 1, h: 0.4, mat: 'beton / tosh', shape: 'line' },
  // velo
  { id: 'velo_turargoh', cat: 'velo', n: 'Velo turargoh (5 joy)', w: 3.5, d: 2, h: 0.8, mat: 'metall', shape: 'rect' },
  { id: 'velo_ilmoq', cat: 'velo', n: 'Velo ilmogʻi', w: 0.8, d: 0.1, h: 0.8, mat: 'metall', shape: 'rect' },
  { id: 'samokat', cat: 'velo', n: 'Samokat va ijara joyi', w: 4, d: 1.5, h: 0.1, mat: 'belgilash', shape: 'rect' },
  { id: 'velo_tamir', cat: 'velo', n: 'Velo taʼmirlash ustuni', w: 0.6, d: 0.6, h: 1.4, mat: 'metall', shape: 'circle' },
  // yorug
  { id: 'ustun_4', cat: 'yorug', n: 'Yoritish ustuni 4 m', w: 0.3, d: 0.3, h: 4, mat: 'metall', shape: 'circle' },
  { id: 'bollard_ch', cat: 'yorug', n: 'Past yoritkich (bollard)', w: 0.2, d: 0.2, h: 1, mat: 'metall', shape: 'circle' },
  { id: 'proyektor', cat: 'yorug', n: 'Daraxt yoritgichi (yerdagi)', w: 0.3, d: 0.3, h: 0.1, mat: 'metall', shape: 'circle' },
  { id: 'girlyanda', cat: 'yorug', n: 'Gʻirlyanda tizimi (ustunlar)', w: 10, d: 0.3, h: 4, mat: 'metall', shape: 'line' },
  // oyin
  { id: 'arg', cat: 'oyin', n: 'Arg‘imchoq (2 oʻrin)', w: 3.5, d: 1.6, h: 2.4, mat: 'metall + yogʻoch', shape: 'rect', r: 3.5, note: 'xavfsizlik zonasi — EN 1176 (A)' },
  { id: 'tepalik', cat: 'oyin', n: 'Tepalik (sirpanchiq)', w: 4, d: 1.5, h: 2.5, mat: 'metall', shape: 'rect', r: 2.5 },
  { id: 'qumdon', cat: 'oyin', n: 'Qumdon', w: 3, d: 3, h: 0.3, mat: 'yogʻoch', shape: 'rect' },
  { id: 'majmua', cat: 'oyin', n: 'Oʻyin majmuasi', w: 8, d: 6, h: 3.5, mat: 'yogʻoch + metall', shape: 'rect', r: 2 },
  { id: 'batut', cat: 'oyin', n: 'Yerga koʻmilgan batut', w: 2, d: 2, h: 0, mat: 'rezina', shape: 'circle', r: 1.5 },
  { id: 'karusel', cat: 'oyin', n: 'Karusel (inklyuziv)', w: 2.5, d: 2.5, h: 0.6, mat: 'metall', shape: 'circle', r: 2, mgn: true },
  { id: 'tabiiy_oyin', cat: 'oyin', n: 'Tabiiy oʻyin (xoda, tosh)', w: 6, d: 4, h: 0.8, mat: 'yogʻoch, tosh', shape: 'rect' },
  // sport
  { id: 'turnik', cat: 'sport', n: 'Turnik va brus majmuasi', w: 6, d: 3, h: 2.5, mat: 'metall', shape: 'rect', r: 1.5 },
  { id: 'trenajyor', cat: 'sport', n: 'Koʻcha trenajyori', w: 1.5, d: 1, h: 1.5, mat: 'metall', shape: 'rect', r: 1 },
  { id: 'tennis_stol', cat: 'sport', n: 'Stol tennisi', w: 2.74, d: 1.53, h: 0.76, mat: 'beton', shape: 'rect', r: 2, note: 'stol oʻlchami — ITTF qoidasi (A)' },
  { id: 'basket', cat: 'sport', n: 'Basketbol halqasi (3×3)', w: 1.8, d: 1.2, h: 3.05, mat: 'metall', shape: 'rect', note: 'halqa balandligi 3,05 m — FIBA (A)' },
  // gul
  { id: 'tuvak_d', cat: 'gul', n: 'Gul tuvak (doira)', w: 1.2, d: 1.2, h: 0.6, mat: 'beton', shape: 'circle' },
  { id: 'tuvak_t', cat: 'gul', n: 'Gul qutisi (toʻrtburchak)', w: 2, d: 0.8, h: 0.6, mat: 'korten', shape: 'rect' },
  { id: 'daraxt_panjara', cat: 'gul', n: 'Daraxt atrofi panjarasi', w: 1.5, d: 1.5, h: 0, mat: 'choʻyan', shape: 'rect' },
  { id: 'baland_gryadka', cat: 'gul', n: 'Baland ekin qutisi', w: 2.4, d: 1.2, h: 0.7, mat: 'yogʻoch', shape: 'rect', mgn: true, note: 'aravachadagi kishi ham ishlay oladi' },
  // chegara
  { id: 'bollard', cat: 'chegara', n: 'Bollard (avtomobil toʻsigʻi)', w: 0.2, d: 0.2, h: 0.9, mat: 'metall / beton', shape: 'circle' },
  { id: 'panjara', cat: 'chegara', n: 'Past panjara', w: 2, d: 0.05, h: 0.6, mat: 'metall', shape: 'line' },
  { id: 'devor_o', cat: 'chegara', n: 'Oʻtirsa boʻladigan devor', w: 3, d: 0.5, h: 0.45, mat: 'tosh', shape: 'line' },
  { id: 'gabion', cat: 'chegara', n: 'Gabion', w: 2, d: 0.5, h: 1, mat: 'tosh + toʻr', shape: 'line' },
  // axborot
  { id: 'stend', cat: 'axborot', n: 'Axborot stendi (xarita)', w: 1.2, d: 0.2, h: 2.2, mat: 'metall', shape: 'rect' },
  { id: 'korsatkich', cat: 'axborot', n: 'Yoʻl koʻrsatkich', w: 0.3, d: 0.3, h: 2.5, mat: 'metall', shape: 'circle' },
  { id: 'taktil', cat: 'axborot', n: 'Taktil xarita', w: 0.8, d: 0.6, h: 1, mat: 'bronza', shape: 'rect', mgn: true },
  { id: 'qushlar_tablo', cat: 'axborot', n: 'Tabiat taʼrifi tablosi', w: 0.8, d: 0.1, h: 1.2, mat: 'yogʻoch', shape: 'rect' },
  // xizmat
  { id: 'kiosk', cat: 'xizmat', n: 'Kiosk', w: 3, d: 2.5, h: 3, mat: 'yogʻoch / metall', shape: 'rect' },
  { id: 'wc_modul', cat: 'xizmat', n: 'Hojatxona moduli (MGN bilan)', w: 4, d: 3, h: 3, mat: 'modul', shape: 'rect', mgn: true },
  { id: 'kafe', cat: 'xizmat', n: 'Kafe paviloni', w: 10, d: 8, h: 4, mat: 'yogʻoch + shisha', shape: 'rect' },
  { id: 'ijara', cat: 'xizmat', n: 'Ijara punkti (velo, qayiq)', w: 4, d: 3, h: 3, mat: 'yogʻoch', shape: 'rect' },
  // sanat
  { id: 'haykal', cat: 'sanat', n: 'Haykal / art-obyekt', w: 2, d: 2, h: 3, mat: 'turli', shape: 'circle' },
  { id: 'tosh', cat: 'sanat', n: 'Katta tosh (valun)', w: 1.5, d: 1.2, h: 0.8, mat: 'tabiiy tosh', shape: 'circle' },
  { id: 'qush_uya', cat: 'sanat', n: 'Qush uyasi / hasharot mehmonxonasi', w: 1, d: 0.4, h: 1.8, mat: 'yogʻoch', shape: 'rect' },
  { id: 'koprikcha', cat: 'sanat', n: 'Yogʻoch koʻprikcha', w: 6, d: 2, h: 0.5, mat: 'yogʻoch', shape: 'rect' },
  /* ---- qoʻshimcha turlar (15.11.2026) ---- */
  // oʻrindiqlar
  { id: 'terrasa_orin', cat: 'orindiq', n: 'Pogʻonali oʻtirish terrasasi (2–3 qavat)', w: 3, d: 1.6, h: 0.87, mat: 'yogʻoch + korten', shape: 'rect', src: 'A', note: 'balandliklar 47 / 87 / 126 sm' },
  { id: 'divan_skameyka', cat: 'orindiq', n: 'Divan-skameyka (keng, suyanchiq va tirsaklik)', w: 2.28, d: 0.5, h: 0.42, mat: 'yogʻoch + metall', shape: 'rect', src: 'A', mgn: true, note: 'eni 142 / 228 sm, chuqurligi 50, oʻtirish 42 sm' },
  { id: 'skameyka_aylana', cat: 'orindiq', n: 'Aylana skameyka (ochiq markaz)', w: 3, d: 3, h: 0.45, mat: 'yogʻoch', shape: 'circle', src: 'A', note: 'diametr 1,5–4 m; ochiq markaz skeytga qarshi' },
  { id: 'skameyka_egri', cat: 'orindiq', n: 'Egri modulli skameyka', w: 4, d: 0.6, h: 0.45, mat: 'yogʻoch + metall', shape: 'rect', src: 'A', note: 'segment ≤ 2 m; radius ixtiyoriy — yoʻl va gulzor egriligiga' },
  { id: 'skameyka_beton', cat: 'orindiq', n: 'Monolit beton skameyka (UHPC)', w: 2.95, d: 0.8, h: 0.45, mat: 'yuqori mustahkam beton', shape: 'rect', src: 'A', note: '220 / 295 × 80 sm, 45 sm; vandalga chidamli' },
  { id: 'beton_puf', cat: 'orindiq', n: 'Beton puf (doira / olti burchak)', w: 0.6, d: 0.6, h: 0.45, mat: 'beton', shape: 'circle' },
  { id: 'gul_orindiq', cat: 'orindiq', n: 'Gul qutisi-oʻrindiq (yashil orolcha)', w: 2.3, d: 2.3, h: 0.47, mat: 'korten + yogʻoch', shape: 'rect', src: 'A', note: '180 × 180 / 230 × 230 × 47 sm' },
  { id: 'kochma_orol', cat: 'orindiq', n: 'Koʻchma yashil orol (gul + oʻrindiq)', w: 3, d: 1.5, h: 0.47, mat: 'korten + yogʻoch', shape: 'rect', src: 'A', note: '1,5 m modul; oʻrindiq orol ustidan 42 sm — vaqtinchalik va bosqichli loyiha uchun' },
  { id: 'podium', cat: 'orindiq', n: 'Oʻtirish podiumi (platforma)', w: 3, d: 1.5, h: 0.47, mat: 'yogʻoch + korten', shape: 'rect', src: 'A', note: 'balandligi 47 / 62 sm, uzunligi ≤ 3 m' },
  { id: 'yotish', cat: 'orindiq', n: 'Toʻlqinsimon yotish oʻrindigʻi', w: 2, d: 0.7, h: 0.45, mat: 'yogʻoch + metall', shape: 'rect' },
  { id: 'arg_divan', cat: 'orindiq', n: 'Argʻimchoq-divan (A-ramka)', w: 2.2, d: 1.6, h: 2.2, mat: 'metall', shape: 'rect', r: 1.5 },
  { id: 'xoda_orindiq', cat: 'orindiq', n: 'Xoda oʻrindiq (yirik brus)', w: 3, d: 0.3, h: 0.45, mat: 'qayta ishlangan yogʻoch', shape: 'rect', src: 'A', note: 'brus ~30 × 30 sm; tabiiy bogʻda «yiqilgan daraxt» oʻrindigʻi' },
  { id: 'tayanch', cat: 'orindiq', n: 'Suyanish panjarasi (leaning rail)', w: 1.8, d: 0.3, h: 1.05, mat: 'metall + yogʻoch', shape: 'line', src: 'A', note: 'uzunligi 1,8 m; bekat va tor joylar uchun' },
  { id: 'yakka_orin', cat: 'orindiq', n: 'Yakka oʻrindiq (mahkamlangan kreslo)', w: 0.7, d: 0.7, h: 0.8, mat: 'metall + yogʻoch', shape: 'rect', mgn: true },
  { id: 'quyosh_orin', cat: 'orindiq', n: 'Quyosh panelli skameyka (USB, yoritish)', w: 2, d: 0.6, h: 0.45, mat: 'metall + PV panel', shape: 'rect' },
  { id: 'tosh_orin', cat: 'orindiq', n: 'Erkin shakl tosh oʻrindiq', w: 2.5, d: 1.5, h: 0.45, mat: 'qayta tiklangan tosh', shape: 'circle' },
  // stol
  { id: 'stol_aylana', cat: 'stol', n: 'Aylana stol + halqa skameyka', w: 2.2, d: 2.2, h: 0.75, mat: 'yogʻoch + metall', shape: 'circle', src: 'A', note: 'stol Ø1,5 m, umumiy Ø≈2,2 m; Ø4 m varianti — 18 kishi' },
  { id: 'stol_tik', cat: 'stol', n: 'Tik turib foydalanish stoli', w: 2, d: 0.8, h: 1.05, mat: 'metall + yogʻoch', shape: 'rect' },
  { id: 'stol_birikkan', cat: 'stol', n: 'Oʻrindiqlari biriktirilgan stol (4–6 kishi)', w: 2, d: 2, h: 0.75, mat: 'metall + HPL', shape: 'circle', mgn: true, note: 'aravacha uchun bitta oʻrin boʻsh' },
  { id: 'stol_ish', cat: 'stol', n: 'Quyosh tomli ish stoli (zaryad)', w: 2, d: 1.6, h: 2.5, mat: 'metall + PV panel', shape: 'rect', src: 'A', note: 'tom 78″ × 63″ (≈ 2,0 × 1,6 m)' },
  { id: 'stol_tomli', cat: 'stol', n: 'Tomli stol-skameyka', w: 2.4, d: 2, h: 2.4, mat: 'metall + HPL', shape: 'rect' },
  { id: 'olov', cat: 'stol', n: 'Olov oʻchogʻi (gulxan joyi)', w: 1.2, d: 1.2, h: 0.45, mat: 'metall / tosh', shape: 'circle', r: 2, note: 'yongʻin xavfsizligi qoidalari bilan; daraxt tojidan uzoq' },
  // urna
  { id: 'urna_3', cat: 'urna', n: 'Saralash urnasi — 3 oqim (chiqindi, qayta ishlash, organik)', w: 1.5, d: 0.5, h: 1.1, mat: 'metall', shape: 'rect' },
  { id: 'urna_beton', cat: 'urna', n: 'Beton urna (yopqichli)', w: 0.6, d: 0.6, h: 0.9, mat: 'beton + metall', shape: 'circle' },
  { id: 'kuldon', cat: 'urna', n: 'Kuldon (alohida)', w: 0.3, d: 0.3, h: 1, mat: 'metall', shape: 'circle' },
  // soya
  { id: 'soya_modul', cat: 'soya', n: 'Modulli soya konstruksiyasi (lamel)', w: 5, d: 5, h: 3.2, mat: 'metall + alyuminiy', shape: 'rect' },
  { id: 'soyabon_pv', cat: 'soya', n: 'Quyosh panelli soyabon', w: 2.7, d: 2.7, h: 2.6, mat: 'toʻqima + PV', shape: 'circle', src: 'A', note: 'diametr 9 ft (≈ 2,7 m)' },
  { id: 'shelter', cat: 'soya', n: 'Yomgʻir panohi (yopiq shiypon)', w: 4, d: 3, h: 2.8, mat: 'yogʻoch / metall', shape: 'rect', note: 'tomi sedum bilan koʻkalamlashtirilishi mumkin' },
  { id: 'chirmoviq_ustun', cat: 'soya', n: 'Chirmoviq ustuni (tik koʻkalamzor)', w: 1.2, d: 1.2, h: 4.5, mat: 'korten / poʻlat', shape: 'circle', src: 'A', note: 'baland. 4,5 / 6 m; tuproq uchun 0,5 × 0,5 m kifoya — tor koʻchada ham' },
  // suv
  { id: 'ichimlik_it', cat: 'suv', n: 'Ichimlik favvorasi + it uchun idish', w: 0.6, d: 0.6, h: 1, mat: 'metall', shape: 'circle', mgn: true },
  { id: 'suv_kanalcha', cat: 'suv', n: 'Yuza suv kanalchasi (ariq-panjara)', w: 1, d: 0.3, h: 0, mat: 'poʻlat panjara', shape: 'line', note: 'yomgʻir suvini yomgʻir bogʻiga olib boradi' },
  // velo
  { id: 'velo_spiral', cat: 'velo', n: 'Spiral velo turargoh', w: 3, d: 1.2, h: 0.8, mat: 'metall', shape: 'rect' },
  { id: 'velo_shiypon', cat: 'velo', n: 'Tomli velo turargoh', w: 6, d: 2.5, h: 2.5, mat: 'yogʻoch / metall', shape: 'rect' },
  { id: 'samokat_doira', cat: 'velo', n: 'Samokat turargohi (aylana)', w: 1.6, d: 1.6, h: 0.9, mat: 'metall', shape: 'circle' },
  { id: 'velo_qator', cat: 'velo', n: 'Velo ilmoqlari qatori (relsda)', w: 2.5, d: 0.6, h: 0.9, mat: 'metall + yogʻoch', shape: 'line', src: 'A', note: 'oraliq 20″ / 30″ (0,5 / 0,76 m), relsda 2–5 ta' },
  // yorug
  { id: 'yorug_tros', cat: 'yorug', n: 'Trosga osilgan yoritkich (daraxtlar orasida)', w: 10, d: 0.3, h: 5, mat: 'tros + LED', shape: 'line', note: 'ustunsiz — daraxtlar yoki binolar orasida' },
  { id: 'yorug_past', cat: 'yorug', n: 'Yoʻlak chirogʻi 0,9 m', w: 0.25, d: 0.25, h: 0.9, mat: 'alyuminiy + LED', shape: 'circle', src: 'A', note: 'balandligi 3 ft (≈ 0,9 m)' },
  { id: 'ustun_3', cat: 'yorug', n: 'Piyoda hududi ustuni 3–5 m', w: 0.3, d: 0.3, h: 3.7, mat: 'alyuminiy + LED', shape: 'circle', src: 'A', note: 'ustun 10–16 ft (3,0–4,9 m)' },
  { id: 'ustun_pv', cat: 'yorug', n: 'Quyosh panelli ustun (tarmoqsiz)', w: 0.4, d: 0.4, h: 4.5, mat: 'alyuminiy + PV', shape: 'circle', note: 'kabel tortish qimmat joylarda — tarmoqlar moduliga taʼsir qiladi' },
  { id: 'yorug_chiziq', cat: 'yorug', n: 'Yerga oʻrnatilgan chiziqli LED', w: 3, d: 0.1, h: 0, mat: 'poʻlat + LED', shape: 'line' },
  { id: 'tutqich_led', cat: 'yorug', n: 'Yoritilgan tutqich (zina, rampa)', w: 3, d: 0.1, h: 0.9, mat: 'poʻlat + LED', shape: 'line', mgn: true },
  // oyin
  { id: 'oyin_tepacha', cat: 'oyin', n: 'Beton oʻyin tepachalari (< 0,75 m)', w: 4, d: 3, h: 0.7, mat: 'beton', shape: 'rect', src: 'A', note: 'balandligi 75 sm dan past' },
  // sport
  { id: 'workout_modul', cat: 'sport', n: 'Oʻz vazni bilan mashq moduli (5 element)', w: 8, d: 3, h: 2.3, mat: 'metall', shape: 'rect', r: 1.5 },
  { id: 'skeyt_el', cat: 'sport', n: 'Skeyt elementi (beton toʻlqin, oʻrindiq ham)', w: 6, d: 3, h: 0.8, mat: 'oq beton', shape: 'rect' },
  // gul
  { id: 'tuvak_konus', cat: 'gul', n: 'Katta konus tuvak (daraxt uchun)', w: 2.4, d: 2.4, h: 1, mat: 'korten / kompozit', shape: 'circle', src: 'A', note: 'Ø2,15 / 2,4 m; daraxt balandligi ≤ 6–10 m' },
  { id: 'daraxt_quti', cat: 'gul', n: 'Daraxt qutisi (korten, ≤ 5 m³ tuproq)', w: 2, d: 2, h: 1, mat: 'korten 4 mm', shape: 'rect', src: 'A', note: 'devor 4 mm, tuproq ≤ 5 m³; yer osti tarmoqlari ustida' },
  { id: 'tuvak_modul', cat: 'gul', n: 'Modulli gul qutisi (nishabga rostlanadi)', w: 2, d: 1, h: 0.6, mat: 'poʻlat / yogʻoch', shape: 'rect' },
  { id: 'gul_toshiq', cat: 'gul', n: 'Gul qutisi-toʻsiq (avtomobilga qarshi)', w: 1.5, d: 0.8, h: 0.8, mat: 'UHPC beton', shape: 'rect' },
  // chegara
  { id: 'bollard_led', cat: 'chegara', n: 'Yoritilgan bollard 0,75–0,9 m', w: 0.25, d: 0.25, h: 0.9, mat: 'korten + LED', shape: 'circle', src: 'A', note: 'balandligi 75–90 sm' },
  { id: 'bollard_velo', cat: 'chegara', n: 'Bollard-velo ilmogʻi', w: 0.6, d: 0.1, h: 0.9, mat: 'metall', shape: 'line' },
  { id: 'chiziq_panel', cat: 'chegara', n: 'Landshaft chegara paneli (korten chiziq)', w: 3, d: 0.02, h: 0.15, mat: 'korten', shape: 'line', note: 'maysa va qoplama chegarasi' },
  { id: 'daraxt_grati', cat: 'gul', n: 'Daraxt panjarasi (poʻlat lenta)', w: 1.8, d: 1.8, h: 0, mat: 'poʻlat', shape: 'rect' },
  // axborot
  { id: 'e_stend', cat: 'axborot', n: 'Raqamli e-paper stend (quyosh)', w: 1, d: 0.4, h: 2.2, mat: 'metall + PV', shape: 'rect', src: 'A', note: 'ekran 32″' },
  { id: 'elon_ustun', cat: 'axborot', n: 'Eʼlon ustuni (mahalla)', w: 0.8, d: 0.8, h: 2.5, mat: 'metall', shape: 'circle' },
  { id: 'displey', cat: 'axborot', n: 'Ikki tomonlama axborot paneli', w: 0.8, d: 0.3, h: 2, mat: 'beton + metall', shape: 'rect', src: 'A', note: 'panel 600 × 1400 mm' },
  // xizmat
  { id: 'bekat', cat: 'xizmat', n: 'Bekat paviloni (oʻrindiq bilan)', w: 4, d: 1.6, h: 2.6, mat: 'metall + shisha', shape: 'rect' },
  { id: 'parklet', cat: 'xizmat', n: 'Parklet (avtoturargoh oʻrnida)', w: 6, d: 2, h: 0.15, mat: 'yogʻoch pastil', shape: 'rect', note: 'balandligi rostlanadigan tayanchlarda; suv tagidan oqadi' },
  { id: 'zaryad', cat: 'xizmat', n: 'Quyosh zaryad stansiyasi', w: 2, d: 2, h: 2.5, mat: 'metall + PV', shape: 'rect' },
  { id: 'iskala', cat: 'xizmat', n: 'Iskala (qayiq / suv taksi)', w: 10, d: 2.5, h: 0.4, mat: 'yogʻoch', shape: 'rect' },
  { id: 'kuzatuv_konsol', cat: 'xizmat', n: 'Suv ustidagi kuzatuv konsoli', w: 6, d: 4, h: 0.5, mat: 'poʻlat + yogʻoch', shape: 'rect', note: 'toʻsiq 1,1 m; konsol ≤ 6 m' },
  // sanʼat va tabiat
  { id: 'koprik_korten', cat: 'sanat', n: 'Piyoda koʻprigi (korten)', w: 8, d: 3, h: 1.1, mat: 'korten + yogʻoch', shape: 'rect', src: 'A', note: 'sahn ≤ 3 × 8 m; oraliq ≤ 16 m, eni 2 / 3 m' },
  { id: 'kozgu', cat: 'sanat', n: 'Shahar koʻzgusi (art-obyekt)', w: 2, d: 0.6, h: 2.2, mat: 'beton + zanglamas poʻlat', shape: 'rect' },
  { id: 'qayta_material', cat: 'sanat', n: 'Qayta ishlatilgan sanoat elementi (rels, plita, toʻsin)', w: 4, d: 1, h: 0.5, mat: 'mavjud material', shape: 'rect', note: 'hududdagi buzilgan materialdan — gabion, oʻrindiq, iz' },
];
export const furnById = (id: string) => FURN.find(f => f.id === id);

/** Qoplama konstruksiyalari — yuqoridan pastga qatlamlar [nom, qalinlik mm] (T) */
export interface Pirog { id: string; n: string; layers: [string, number][]; load: 'piyoda' | 'velo' | 'avto'; note?: string }
export const PIROG: Pirog[] = [
  { id: 'plitka_p', n: 'Beton plitka — piyoda', load: 'piyoda', layers: [['beton plitka', 60], ['qum-sement aralashma', 30], ['shagʻal asos 20–40', 150], ['geotekstil', 0], ['zichlangan grunt', 0]] },
  { id: 'tosh_p', n: 'Tabiiy tosh — piyoda', load: 'piyoda', layers: [['granit plita', 50], ['sement-qum qorishma', 40], ['beton asos', 100], ['shagʻal', 150], ['zichlangan grunt', 0]] },
  { id: 'plitka_a', n: 'Beton plitka — avtomobil yuki', load: 'avto', layers: [['beton plitka', 80], ['qum-sement aralashma', 40], ['chaqiq tosh 20–40', 250], ['qum qatlami', 150], ['zichlangan grunt', 0]], note: 'yongʻin mashinasi yoʻli — yuk hisobi bilan (ShNQ 2.07.01-23, 672-band, N)' },
  { id: 'gazon_panjara', n: 'Gazon panjara (yongʻin yoʻli)', load: 'avto', layers: [['gazon panjara + tuproq-qum', 80], ['qum', 40], ['chaqiq tosh', 250], ['geotekstil', 0], ['zichlangan grunt', 0]], note: 'koʻkalamzorni saqlaydi; yuk — 672-band' },
  { id: 'asfalt_v', n: 'Asfaltbeton — velo', load: 'velo', layers: [['mayda donali asfaltbeton', 50], ['chaqiq tosh', 150], ['qum', 100], ['zichlangan grunt', 0]] },
  { id: 'rezina', n: 'Rezina qoplama (EPDM)', load: 'piyoda', layers: [['EPDM qatlami', 10], ['SBR qatlami', 30], ['asfaltbeton', 40], ['chaqiq tosh', 150], ['zichlangan grunt', 0]], note: 'yiqilish balandligiga qarab qalinlik — EN 1177 (A)' },
  { id: 'shagal', n: 'Shagʻal (granit chaqiq)', load: 'piyoda', layers: [['granit chaqiq 5–10', 50], ['chaqiq tosh 20–40', 100], ['geotekstil', 0], ['zichlangan grunt', 0]] },
  { id: 'mulcha', n: 'Mulcha (ekotropa)', load: 'piyoda', layers: [['qobiq mulchasi', 80], ['geotekstil', 0], ['grunt', 0]] },
  { id: 'yogoch', n: 'Yogʻoch / kompozit pastil', load: 'piyoda', layers: [['taxta / kompozit', 28], ['lagi', 50], ['tayanch ustunchalar', 0]], note: 'botqoq va qirgʻoq ustidan; havo aylanishi saqlanadi' },
  { id: 'suv_otkazuvchi', n: 'Suv oʻtkazuvchi plitka', load: 'piyoda', layers: [['gʻovak beton plitka', 80], ['mayda chaqiq 2–5', 40], ['chaqiq tosh 20–40', 200], ['geotekstil', 0], ['grunt', 0]], note: 'yomgʻir suvini yerga oʻtkazadi' },
  { id: 'gisht_maydasi', n: 'Maydalangan gʻisht + qum (tabiiy yoʻl)', load: 'piyoda', layers: [['maydalangan gʻisht / oxra qum', 60], ['chaqiq tosh 20–40', 120], ['geotekstil', 0], ['grunt', 0]], note: 'issiq rangli tabiiy yoʻl; qurilish chiqindisidan' },
  { id: 'klinker', n: 'Klinker gʻisht (tarmoqlar ustidagi chet tasma)', load: 'piyoda', layers: [['klinker gʻisht', 80], ['qum', 40], ['chaqiq tosh', 200], ['grunt', 0]], note: 'oson ochib qayta yotqiziladi — yer osti tarmoqlari shu tasma ostida' },
  { id: 'kompozit_plastik', n: 'Qayta ishlangan plastik taxta (pastil)', load: 'piyoda', layers: [['qayta ishlangan plastik taxta', 30], ['lagi', 60], ['vint qoziqlar', 0]], note: 'chirimaydi; plyaj, botqoq ustidan' },
  { id: 'asfalt_qayta', n: 'Mavjud asfalt (yorilgan, qayta ishlatilgan)', load: 'piyoda', layers: [['mavjud asfalt — ochiq yoriqlar', 0], ['yoriqlarda tuproq va oʻt', 0]], note: 'buzmasdan: oʻsimlik oʻsishi uchun yoriq va kesiklar' },
];
export const PIROG_OF: Record<string, string> = { aralash: 'asfalt_v', asosiy: 'tosh_p', ikkinchi: 'plitka_p', soqmoq: 'shagal', promenada: 'tosh_p', velo: 'asfalt_v', yugurish: 'rezina', pastil: 'yogoch', ekotropa: 'mulcha', servis: 'gazon_panjara', sohil: 'yogoch', rampa: 'plitka_p', zina: 'tosh_p' };
