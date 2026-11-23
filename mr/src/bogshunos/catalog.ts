/**
 * Bogʻshunos — yoʻl turlari va zona turlari katalogi (15.11.2026): tahrir asboblari, xarita, albom, yoritish va smeta shu yerdan oladi.
 * Kenglik — loyiha boshlangʻich qiymati (T), asbob panelida oʻzgartiriladi; normaga bogʻliq qiymatlar manbasi bilan:
 *  · velo yoʻlak: ShNQ 2.07.01-23, 404-band — oqim yoʻnalishida ≥ 1,2 m, qarama-qarshi ≥ 1,5 m; ikki yoʻnalishli 3,0 m (T);
 *  · yongʻin-qutqaruv oʻtish yoʻli (pojarniy proyezd): ShNQ 2.07.01-23, 667-band (N) — bino balandligi ≤ 13 m — 3,5 m; 13–46 m — 4,2 m;
 *    > 46 m — 6,0 m; qoplama yongʻin mashinasi ogʻirligiga (672-band); kelish joyi va bino orasida qator daraxt ekilmaydi (676-band).
 */
export type Tier = 'aralash' | 'asosiy' | 'ikkinchi' | 'soqmoq' | 'sohil' | 'rampa' | 'zina' | 'promenada' | 'velo' | 'yugurish' | 'pastil' | 'ekotropa' | 'servis';
export interface TierDef { n: string; w: number; c: string; surf: string; light: 'ustun' | 'past' | null; role: 'mark' | 'yon'; price: string; draw: boolean; src: 'T' | 'N' | 'A' }
export const TIERS: Record<Tier, TierDef> = {
  asosiy: { n: 'Asosiy xiyobon', w: 4.5, c: '#e6d8bd', surf: 'tosh plitka', light: 'ustun', role: 'mark', price: 'yol_asosiy', draw: true, src: 'T' },
  ikkinchi: { n: 'Ikkinchi darajali yoʻl', w: 3, c: '#ece1cc', surf: 'plitka', light: 'ustun', role: 'yon', price: 'yol_ikkinchi', draw: true, src: 'T' },
  soqmoq: { n: 'Soʻqmoq', w: 1.8, c: '#f2eadb', surf: 'shagʻal', light: null, role: 'yon', price: 'yol_soqmoq', draw: true, src: 'T' },
  promenada: { n: 'Promenada (sohil boʻyi)', w: 6, c: '#e3d2b2', surf: 'tosh', light: 'ustun', role: 'mark', price: 'yol_promenada', draw: true, src: 'T' },
  velo: { n: 'Velo yoʻlak (ikki yoʻnalish)', w: 3, c: '#c9dbe6', surf: 'asfalt (rangli)', light: 'ustun', role: 'yon', price: 'yol_velo', draw: true, src: 'N' },
  yugurish: { n: 'Yugurish yoʻlagi', w: 2, c: '#e7b9a4', surf: 'rezina qoplama', light: 'past', role: 'yon', price: 'yol_yugurish', draw: true, src: 'T' },
  pastil: { n: 'Yogʻoch pastil (botqoq ustidan)', w: 2, c: '#cfb38c', surf: 'yogʻoch / kompozit', light: 'past', role: 'yon', price: 'yol_sohil', draw: true, src: 'T' },
  ekotropa: { n: 'Ekotropa (tabiiy)', w: 1.2, c: '#efe6cf', surf: 'mulcha', light: null, role: 'yon', price: 'yol_soqmoq', draw: true, src: 'T' },
  aralash: { n: 'Piyoda-velo aralash yoʻli', w: 4, c: '#d6dcc8', surf: 'asfaltbeton', light: 'ustun', role: 'yon', price: 'yol_velo', draw: true, src: 'T' },
  servis: { n: 'Yongʻin-qutqaruv oʻtish yoʻli', w: 3.5, c: '#d9d4cb', surf: 'beton plitka (gazon panjara)', light: null, role: 'yon', price: 'yol_servis', draw: true, src: 'N' },
  sohil: { n: 'Sohil yoʻli', w: 2.4, c: '#dfd2b8', surf: 'yogʻoch / kompozit', light: 'past', role: 'yon', price: 'yol_sohil', draw: false, src: 'T' },
  rampa: { n: 'Rampa (5–8 %)', w: 3, c: '#e9cf9e', surf: 'beton', light: 'ustun', role: 'mark', price: 'zina_rampa', draw: false, src: 'T' },
  zina: { n: 'Zina (> 8 %)', w: 3, c: '#d9b37a', surf: 'tosh', light: 'past', role: 'mark', price: 'zina_rampa', draw: false, src: 'T' },
};
export const TIER_ORD: Tier[] = ['ekotropa', 'soqmoq', 'yugurish', 'pastil', 'sohil', 'servis', 'velo', 'aralash', 'ikkinchi', 'promenada', 'asosiy', 'rampa', 'zina'];

/** Zona turlari: hard — qattiq qoplama (koʻkalamzor ulushiga kirmaydi); hab — fauna moduli uchun yashash muhiti */
export type ZoneKind = 'maydon' | 'bolalar' | 'sport_yangi' | 'otloq' | 'yomgir_bogi' | 'botqoq' | 'gulzor' | 'piknik' | 'it_maydon' | 'workout' | 'suv_oyin' | 'skeyt' | 'tadbir' | 'jamoat_bogi' | 'mevazor' | 'sokin_bog' | 'avtoturargoh' | 'xizmat' | 'swale' | 'suv_maydon' | 'tozalash' | 'qumlik' | 'ormoncha' | 'tepalik' | 'yovvoyi' | 'oyin_tabiiy' | 'sohil_pogona';
export interface ZoneDef { n: string; c: string; hard: boolean; price: string; hab: 'otloq' | 'maysa' | 'buta' | 'daraxt' | 'botqoq' | null; d?: string }
export const ZONES: Record<ZoneKind, ZoneDef> = {
  maydon: { n: 'Maydon / kirish maydonchasi', c: '#e2d6c2', hard: true, price: 'z_maydon', hab: null },
  bolalar: { n: 'Bolalar maydoni', c: '#f4c98f', hard: false, price: 'bolalar', hab: null },
  sport_yangi: { n: 'Sport maydoni', c: '#a891cf', hard: true, price: 'sport', hab: null },
  workout: { n: 'Workout va trenajyorlar', c: '#b8a3d9', hard: true, price: 'z_workout', hab: null },
  skeyt: { n: 'Skeyt-park', c: '#cfc7d9', hard: true, price: 'z_skeyt', hab: null },
  suv_oyin: { n: 'Suv oʻyin maydoni (favvora)', c: '#a9d4e6', hard: true, price: 'z_suv_oyin', hab: null },
  tadbir: { n: 'Tadbir maydoni (sahna oldi maysa)', c: '#cfe0b4', hard: false, price: 'maysa', hab: 'maysa' },
  piknik: { n: 'Piknik joyi', c: '#dbe7bf', hard: false, price: 'z_piknik', hab: 'maysa' },
  it_maydon: { n: 'It sayr maydoni (toʻsiqli)', c: '#e4dcc0', hard: false, price: 'z_it', hab: null },
  otloq: { n: 'Oʻtloq (kam oʻriladigan)', c: '#e3ecc4', hard: false, price: 'otloq', hab: 'otloq' },
  gulzor: { n: 'Gulzor (koʻp yillik oʻsimliklar)', c: '#f0c6d2', hard: false, price: 'z_gulzor', hab: 'otloq' },
  sokin_bog: { n: 'Sokin bogʻ', c: '#c6dcc0', hard: false, price: 'z_gulzor', hab: 'buta' },
  jamoat_bogi: { n: 'Jamoat bogʻi (mahalla ekinzori)', c: '#d8e2a8', hard: false, price: 'z_jamoat', hab: 'otloq' },
  mevazor: { n: 'Mevazor', c: '#bcd69a', hard: false, price: 'z_mevazor', hab: 'daraxt' },
  yomgir_bogi: { n: 'Yomgʻir bogʻi', c: '#a9cdb9', hard: false, price: 'yomgir', hab: 'botqoq' },
  botqoq: { n: 'Botqoq qirgʻoq', c: '#b9d9cf', hard: false, price: 'botqoq', hab: 'botqoq' },
  avtoturargoh: { n: 'Avtoturargoh', c: '#cfcac3', hard: true, price: 'z_avto', hab: null },
  xizmat: { n: 'Xizmat obyekti', c: '#d5d0c8', hard: true, price: 'z_xizmat', hab: null },
  /* xalqaro amaliyotdagi takrorlanadigan yechimlar (15.11.2026) */
  swale: { n: 'Swale (chiziqli yomgʻir ariqchasi)', c: '#9fcbb4', hard: false, price: 'yomgir', hab: 'botqoq', d: 'Yoʻl boʻylab uzluksiz halqa: yomgʻir suvini yigʻadi, salqin va nam muhit beradi' },
  suv_maydon: { n: 'Suv bosadigan maydon (water square)', c: '#b7d3df', hard: true, price: 'z_suv_maydon', hab: null, d: 'Odatda skeyt / oʻyin maydoni, kuchli yomgʻirda vaqtincha suv havzasi' },
  tozalash: { n: 'Tozalash hovuzi (yomgʻir suvi)', c: '#8fbfcf', hard: false, price: 'z_tozalash', hab: 'botqoq', d: 'Suv koʻl yoki kanalga tushishidan oldin tindiriladi; yoʻl hovuz ustidan oʻtadi' },
  qumlik: { n: 'Qumli / shagʻalli sohil', c: '#eee0b8', hard: false, price: 'z_qumlik', hab: 'otloq', d: 'Shagʻal va qum oʻsimliklari bilan yumshoq qirgʻoq; suvga bevosita kirish' },
  ormoncha: { n: 'Zich oʻrmoncha (biologik boshpana)', c: '#8fb87a', hard: false, price: 'z_ormoncha', hab: 'daraxt', d: 'Koʻp qatlamli zich ekish: daraxt, buta, oʻt qatlami; maktab va bolalar maydoni yonida' },
  tepalik: { n: 'Manzara tepaligi (yer haykali)', c: '#d8e3b0', hard: false, price: 'z_tepalik', hab: 'maysa', d: 'Qazilgan tuproqdan koʻtarilgan tepa: manzara nuqtasi, shamol va shovqin toʻsigʻi, yer balansi' },
  yovvoyi: { n: 'Yovvoyi tiklanish (yorilgan qoplama)', c: '#cfd8a8', hard: false, price: 'z_yovvoyi', hab: 'otloq', d: 'Mavjud asfalt yoki beton toʻliq buzilmaydi — kesik va yoriqlardan tabiiy suksessiya' },
  oyin_tabiiy: { n: 'Erkin oʻyin hududi (tabiiy elementlar)', c: '#f0cf9f', hard: false, price: 'bolalar', hab: null, d: 'Tayyor jihoz oʻrniga tepacha, xoda, tosh, suv — bola oʻzi oʻyin oʻylab topadi' },
  sohil_pogona: { n: 'Suvga tushuvchi pogʻonalar', c: '#e3c9a3', hard: true, price: 'z_pogona', hab: null, d: 'Keng zinapoya-oʻtirgʻich: suv sathi oʻzgarsa ham ishlaydi' },
};
export const ZONE_GROUPS: [string, ZoneKind[]][] = [
  ['Faol dam olish', ['bolalar', 'oyin_tabiiy', 'sport_yangi', 'workout', 'skeyt', 'suv_oyin', 'tadbir']],
  ['Sokin dam olish', ['piknik', 'sokin_bog', 'it_maydon', 'tepalik']],
  ['Koʻkalamzor', ['otloq', 'gulzor', 'mevazor', 'jamoat_bogi', 'ormoncha', 'yovvoyi']],
  ['Suv va ekologiya', ['yomgir_bogi', 'swale', 'botqoq', 'tozalash', 'suv_maydon', 'qumlik', 'sohil_pogona']],
  ['Qattiq qoplama va xizmat', ['maydon', 'avtoturargoh', 'xizmat']],
];
export const ZONE_HARD = (Object.keys(ZONES) as ZoneKind[]).filter(k => ZONES[k].hard);
