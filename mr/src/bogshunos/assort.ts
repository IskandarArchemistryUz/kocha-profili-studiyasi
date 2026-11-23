/**
 * Bogʻshunos — Toshkent (II-A zonasi) assortimenti: 1979-yilgi tavsiya roʻyxati, POWO bilan boyitilgan
 * (`claude/bogshunos-src/assortiment-1979-II-A-boyitilgan.csv`, 14.11.2026). Faqat II-A da «+» belgilangan daraxt va butalar.
 * Ailanthus altissima (invaziv) roʻyxatdan chiqarilgan. Belgilar asl jadvaldagidek:
 *  kattalik: Д1 > 20 m, Д2 15–20, Д3 10–15, Д4 < 10 (daraxt); К — kolonnasimon; Кв/Кс/Кн — baland/oʻrta/past buta;
 *  namlik: Т — talabchan, НТ — talabchan emas; shoʻr: С — chidamli, Н — chidamsiz; yorugʻlik: СВ — yorugʻsevar, ТВ — soyaga chidamli, СТ — oraliq;
 *  sovuq/issiq: М — chidamli, С — oʻrta, Н/У — chidamsiz/chidamli (asl jadval kodlari); umr: Д — uzoq, С — oʻrta, М — qisqa; oʻsish: Б — tez, С — oʻrta, М — sekin.
 * reg — Toshkent daraxtlar reyestrida soni (14.11). native — POWO boʻyicha Oʻzbekistonda mahalliy.
 */
export type Grp = 'igna' | 'barg' | 'buta';
export interface Sp { g: Grp; ru: string; lat: string; size: string; water: 'Т' | 'НТ'; salt: 'С' | 'Н'; light: string; life: string; growth: string; native: boolean; reg: number; user?: boolean; fam?: string }
type Row = [Grp, string, string, string, 'Т' | 'НТ', 'С' | 'Н', string, string, string, 0 | 1, number];
const R: Row[] = [
  ['igna', 'Биота восточная', 'Platycladus orientalis', 'Д1', 'Т', 'С', 'СВ', 'Д', 'М', 0, 59255],
  ['igna', 'Ель колючая', 'Picea pungens', 'Д1', 'Т', 'Н', 'СВ', 'Д', 'М', 0, 0],
  ['igna', 'Кипарис аризонский', 'Cupressus arizonica', 'Д1', 'Т', 'Н', 'СВ', 'Д', 'С', 0, 29738],
  ['igna', 'Кипарис болотный', 'Taxodium distichum', 'Д1', 'Т', 'Н', 'СВ', 'Д', 'С', 0, 0],
  ['igna', 'Можжевельник виргинский', 'Juniperus virginiana', 'Д1', 'НТ', 'С', 'СВ', 'Д', 'С', 0, 277437],
  ['igna', 'Можжевельник зарафшанский', 'Juniperus seravschanica', 'Д2', 'НТ', 'Н', 'СВ', 'Д', 'М', 1, 0],
  ['igna', 'Сосна крымская', 'Pinus nigra subsp. pallasiana', 'Д1', 'НТ', 'С', 'СВ', 'Д', 'Б', 0, 28066],
  ['igna', 'Сосна черная австрийская', 'Pinus nigra', 'Д1', 'НТ', 'Н', 'СВ', 'Д', 'С', 0, 0],
  ['igna', 'Туя западная', 'Thuja occidentalis', 'Д1К', 'Т', 'Н', 'ТВ', 'Д', 'М', 0, 25888],
  ['barg', 'Абрикос обыкновенный', 'Prunus armeniaca', 'Д3', 'НТ', 'С', 'СВ', 'Д', 'Б', 1, 144661],
  ['barg', 'Альбиция ленкоранская', 'Albizia julibrissin', 'Д3', 'Т', 'Н', 'СВ', 'М', 'С', 0, 5766],
  ['barg', 'Багряник канадский', 'Cercis canadensis', 'Д3', 'НТ', 'Н', 'ТВ', 'М', 'М', 0, 4237],
  ['barg', 'Береза бородавчатая', 'Betula pendula', 'Д1', 'Т', 'Н', 'СВ', 'Д', 'С', 1, 4756],
  ['barg', 'Боярышник туркестанский', 'Crataegus turkestanica', 'Д4', 'НТ', 'Н', 'СТ', 'М', 'М', 1, 0],
  ['barg', 'Боярышник крупноплодный', 'Crataegus pontica', 'Д4', 'НТ', 'Н', 'СВ', 'С', 'С', 1, 0],
  ['barg', 'Бундук канадский', 'Gymnocladus dioicus', 'Д1', 'НТ', 'Н', 'СВ', 'М', 'С', 0, 0],
  ['barg', 'Вяз листоватый, карагач', 'Ulmus minor', 'Д1', 'НТ', 'С', 'ТВ', 'С', 'Б', 1, 23856],
  ['barg', 'Гледичия обыкновенная', 'Gleditsia triacanthos', 'Д1', 'НТ', 'С', 'СВ', 'С', 'Б', 0, 11469],
  ['barg', 'Дуб каштанолистный', 'Quercus castaneifolia', 'Д1', 'Т', 'Н', 'СВ', 'Д', 'С', 0, 6326],
  ['barg', 'Дуб обыкновенный', 'Quercus robur', 'Д1', 'НТ', 'С', 'СВ', 'Д', 'Б', 0, 25055],
  ['barg', 'Зизифус (унаби)', 'Ziziphus jujuba', 'Д4К', 'НТ', 'С', 'СВ', 'С', 'С', 0, 868],
  ['barg', 'Ива белая', 'Salix alba', 'Д2', 'Т', 'С', 'СВ', 'Д', 'Б', 1, 0],
  ['barg', 'Ива вавилонская', 'Salix babylonica', 'Д2', 'Т', 'Н', 'СВ', 'С', 'Б', 0, 0],
  ['barg', 'Каркас западный', 'Celtis occidentalis', 'Д1', 'НТ', 'С', 'ТВ', 'С', 'С', 0, 0],
  ['barg', 'Катальпа прекрасная', 'Catalpa speciosa', 'Д1', 'Т', 'С', 'ТВ', 'С', 'Б', 0, 16509],
  ['barg', 'Каштан конский', 'Aesculus hippocastanum', 'Д1', 'Т', 'Н', 'ТВ', 'С', 'С', 0, 30444],
  ['barg', 'Клен остролистный', 'Acer platanoides', 'Д1', 'Т', 'Н', 'ТВ', 'С', 'С', 1, 0],
  ['barg', 'Клен полевой', 'Acer campestre', 'Д2', 'НТ', 'С', 'ТВ', 'С', 'С', 0, 12845],
  ['barg', 'Клен Семенова', 'Acer semenovii', 'Д1К', 'НТ', 'С', 'ТВ', 'С', 'С', 1, 165],
  ['barg', 'Клен татарский', 'Acer tataricum', 'Д4', 'НТ', 'С', 'ТВ', 'С', 'С', 1, 0],
  ['barg', 'Липа крупнолистная', 'Tilia platyphyllos', 'Д1', 'Т', 'Н', 'ТВ', 'С', 'С', 0, 0],
  ['barg', 'Липа серебристая', 'Tilia tomentosa', 'Д2', 'НТ', 'Н', 'ТВ', 'С', 'М', 0, 0],
  ['barg', 'Мыльное дерево (кельрейтерия)', 'Koelreuteria paniculata', 'Д2', 'НТ', 'С', 'СВ', 'С', 'С', 0, 2361],
  ['barg', 'Орех грецкий', 'Juglans regia', 'Д1', 'Т', 'Н', 'СВ', 'Д', 'С', 0, 42244],
  ['barg', 'Платан восточный (чинар)', 'Platanus orientalis', 'Д1', 'Т', 'С', 'СВ', 'Д', 'Б', 0, 48708],
  ['barg', 'Софора японская', 'Styphnolobium japonicum', 'Д1', 'НТ', 'С', 'СТ', 'С', 'С', 0, 90597],
  ['barg', 'Тополь туркестанский', 'Populus alba', 'Д1', 'Т', 'С', 'СВ', 'С', 'Б', 1, 35695],
  ['barg', 'Тюльпанное дерево', 'Liriodendron tulipifera', 'Д1', 'Т', 'Н', 'СВ', 'Д', 'С', 0, 5716],
  ['barg', 'Фисташка туполистная', 'Pistacia atlantica', 'Д2', 'НТ', 'Н', 'СВ', 'Д', 'М', 0, 0],
  ['barg', 'Шелковица белая', 'Morus alba', 'Д1', 'НТ', 'С', 'ТВ', 'С', 'Б', 0, 113310],
  ['barg', 'Яблоня Недзвецкого', 'Malus niedzwetzkyana', 'Д3', 'НТ', 'С', 'ТВ', 'С', 'М', 1, 0],
  ['barg', 'Ясень обыкновенный', 'Fraxinus excelsior', 'Д1', 'НТ', 'С', 'ТВ', 'С', 'Б', 0, 61890],
  ['buta', 'Барбарис обыкновенный', 'Berberis vulgaris', 'Кв', 'НТ', 'Н', 'СВ', 'М', 'Б', 1, 0],
  ['buta', 'Гранат обыкновенный', 'Punica granatum', 'Кв', 'НТ', 'Н', 'СВ', 'М', 'С', 0, 0],
  ['buta', 'Жимолость мелколистная', 'Lonicera microphylla', 'Кс', 'НТ', 'Н', 'ТВ', 'С', 'Б', 1, 0],
  ['buta', 'Кизильник кистецветковый', 'Cotoneaster racemiflorus', 'Кс', 'НТ', 'Н', 'ТВ', 'С', 'С', 1, 0],
  ['buta', 'Лох узколистный (джида)', 'Elaeagnus angustifolia', 'КвД', 'НТ', 'С', 'СВ', 'С', 'Б', 1, 805],
  ['buta', 'Миндаль бухарский', 'Prunus bucharica', 'Кс', 'НТ', 'Н', 'СВ', 'М', 'С', 1, 0],
  ['buta', 'Облепиха крушиноподобная', 'Hippophae rhamnoides', 'Кв', 'НТ', 'С', 'СВ', 'С', 'С', 1, 0],
  ['buta', 'Роза собачья', 'Rosa canina', 'Кс', 'Т', 'С', 'ТВ', 'С', 'Б', 1, 0],
  ['buta', 'Сирень обыкновенная', 'Syringa vulgaris', 'Кв', 'Т', 'Н', 'СТ', 'С', 'Б', 0, 0],
  ['buta', 'Скумпия', 'Cotinus coggygria', 'КвД', 'НТ', 'Н', 'СВ', 'Д', 'Б', 0, 0],
  ['buta', 'Спирея средняя', 'Spiraea media', 'Кс', 'НТ', 'Н', 'СТ', 'М', 'Б', 1, 0],
  ['buta', 'Сумах дубильный', 'Rhus coriaria', 'Кс', 'НТ', 'С', 'СВ', 'С', 'С', 1, 0],
  ['buta', 'Тамарикс ветвистый', 'Tamarix ramosissima', 'Кв', 'НТ', 'С', 'СВ', 'С', 'С', 1, 0],
];
/** Asosiy (1979 II-A) roʻyxat — oʻzgarmaydi */
export const BASE: Sp[] = R.map(([g, ru, lat, size, water, salt, light, life, growth, native, reg]) => ({ g, ru, lat, size, water, salt, light, life, growth, native: !!native, reg }));
/** Ishchi assortiment: BASE − oʻchirilganlar + foydalanuvchi turlari (setUserAssort bilan yangilanadi; ekish, tahrir va albom shundan oladi) */
export const ASSORT: Sp[] = BASE.slice();
export const ASSORT_CITE = 'Assortiment: 1979-yil tavsiyasi, II-A zona (Toshkent), POWO (Kew) boʻyicha nomlar va mahalliylik tekshirilgan (14.11.2026)';

/** Turkum → oila (APG IV; R22 xilma-xillik tekshiruvi uchun) */
export const FAMILY: Record<string, string> = {
  Platycladus: 'Cupressaceae', Juniperus: 'Cupressaceae', Cupressus: 'Cupressaceae', Taxodium: 'Cupressaceae', Thuja: 'Cupressaceae', Picea: 'Pinaceae', Pinus: 'Pinaceae',
  Prunus: 'Rosaceae', Crataegus: 'Rosaceae', Malus: 'Rosaceae', Cotoneaster: 'Rosaceae', Rosa: 'Rosaceae', Spiraea: 'Rosaceae', Cydonia: 'Rosaceae',
  Albizia: 'Fabaceae', Cercis: 'Fabaceae', Gymnocladus: 'Fabaceae', Gleditsia: 'Fabaceae', Styphnolobium: 'Fabaceae', Robinia: 'Fabaceae',
  Betula: 'Betulaceae', Ulmus: 'Ulmaceae', Quercus: 'Fagaceae', Ziziphus: 'Rhamnaceae', Salix: 'Salicaceae', Populus: 'Salicaceae', Celtis: 'Cannabaceae',
  Catalpa: 'Bignoniaceae', Aesculus: 'Sapindaceae', Acer: 'Sapindaceae', Koelreuteria: 'Sapindaceae', Tilia: 'Malvaceae', Juglans: 'Juglandaceae', Platanus: 'Platanaceae',
  Liriodendron: 'Magnoliaceae', Pistacia: 'Anacardiaceae', Rhus: 'Anacardiaceae', Cotinus: 'Anacardiaceae', Morus: 'Moraceae', Fraxinus: 'Oleaceae', Syringa: 'Oleaceae',
  Berberis: 'Berberidaceae', Punica: 'Lythraceae', Lonicera: 'Caprifoliaceae', Elaeagnus: 'Elaeagnaceae', Hippophae: 'Elaeagnaceae', Tamarix: 'Tamaricaceae', Ailanthus: 'Simaroubaceae',
  Paulownia: 'Paulowniaceae', Diospyros: 'Ebenaceae', Maclura: 'Moraceae', Broussonetia: 'Moraceae', Magnolia: 'Magnoliaceae', Chitalpa: 'Bignoniaceae', Metasequoia: 'Cupressaceae',
};
export const genus = (lat: string) => lat.split(' ')[0];

/** Yetuk toj diametri, m — kattalik sinfidan (P: dendrologik oʻrtacha; turga qarab aniqlanadi) */
export const CROWN: Record<string, number> = { Д1: 12, Д2: 9, Д3: 7, Д4: 5, Д1К: 4, Д2К: 3, Д4К: 4, Кв: 3, КвД: 4, Кс: 2, Кн: 1.2 };
export const crownOf = (size: string) => CROWN[size] ?? 6;

/**
 * Fasllar (fenologiya, Toshkent iqlimi) — umumiy dendrologik maʼlumot, P: mahalliy kuzatuv bilan aniqlanadi.
 * f — gullash oylari, a — kuzgi barg rangi (#), e — doim yashil, fr — meva oylari (manzarali/qushlar uchun).
 */
export interface Phen { f?: number[]; a?: string; e?: boolean; fr?: number[]; fc?: string }
export const PHEN: Record<string, Phen> = {
  'Platycladus orientalis': { e: true }, 'Picea pungens': { e: true }, 'Cupressus arizonica': { e: true }, 'Juniperus virginiana': { e: true, fr: [9, 10, 11, 12] }, 'Juniperus seravschanica': { e: true, fr: [9, 10, 11] },
  'Pinus nigra subsp. pallasiana': { e: true }, 'Pinus nigra': { e: true }, 'Thuja occidentalis': { e: true }, 'Taxodium distichum': { a: '#b5652b' },
  'Prunus armeniaca': { f: [3, 4], fc: '#f4d6dc', fr: [6, 7], a: '#d9a23a' }, 'Albizia julibrissin': { f: [6, 7, 8], fc: '#f29bb8' }, 'Cercis canadensis': { f: [4], fc: '#c86fa8', a: '#e0c04a' },
  'Betula pendula': { a: '#e6c64a' }, 'Crataegus turkestanica': { f: [5], fc: '#f3f0e6', fr: [8, 9, 10], a: '#c2552e' }, 'Crataegus pontica': { f: [5], fc: '#f3f0e6', fr: [8, 9, 10] },
  'Gymnocladus dioicus': { a: '#d9b54a' }, 'Ulmus minor': { a: '#d9b54a' }, 'Gleditsia triacanthos': { a: '#e8c84a' }, 'Quercus castaneifolia': { a: '#9c7a3a' }, 'Quercus robur': { a: '#9c6a2a' },
  'Ziziphus jujuba': { fr: [9, 10], a: '#e2c24a' }, 'Salix alba': { a: '#d9c45a' }, 'Salix babylonica': { a: '#d9c45a' }, 'Celtis occidentalis': { a: '#d9c45a', fr: [9, 10] },
  'Catalpa speciosa': { f: [5, 6], fc: '#f6f2ea' }, 'Aesculus hippocastanum': { f: [4, 5], fc: '#f6f2ea', a: '#c58a3a' }, 'Acer platanoides': { f: [4], fc: '#d7e07a', a: '#e8b23a' },
  'Acer campestre': { a: '#e8c23a' }, 'Acer semenovii': { a: '#d2452e' }, 'Acer tataricum': { a: '#d2452e' }, 'Tilia platyphyllos': { f: [6], fc: '#e8e49a', a: '#d9c45a' }, 'Tilia tomentosa': { f: [6, 7], fc: '#e8e49a' },
  'Koelreuteria paniculata': { f: [6, 7], fc: '#f0d23a', a: '#e0a23a' }, 'Juglans regia': { fr: [9, 10], a: '#c9a24a' }, 'Platanus orientalis': { a: '#c58a3a' }, 'Styphnolobium japonicum': { f: [7, 8], fc: '#efe9c2' },
  'Populus alba': { a: '#e2d35a' }, 'Liriodendron tulipifera': { f: [5, 6], fc: '#e6d27a', a: '#e8c23a' }, 'Pistacia atlantica': { a: '#c2452e' }, 'Morus alba': { fr: [5, 6], a: '#e2c24a' },
  'Malus niedzwetzkyana': { f: [4, 5], fc: '#d2557e', fr: [9, 10], a: '#a8452e' }, 'Fraxinus excelsior': { a: '#d9c45a' },
  'Berberis vulgaris': { f: [5], fc: '#f0d23a', fr: [9, 10, 11], a: '#c2452e' }, 'Punica granatum': { f: [5, 6, 7], fc: '#e2452e', fr: [9, 10] }, 'Lonicera microphylla': { f: [5], fc: '#f3f0e6', fr: [7, 8] },
  'Cotoneaster racemiflorus': { f: [5], fc: '#f3f0e6', fr: [8, 9, 10], a: '#c2452e' }, 'Elaeagnus angustifolia': { f: [5, 6], fc: '#f0d23a', fr: [9, 10] }, 'Prunus bucharica': { f: [3, 4], fc: '#f4d6dc' },
  'Hippophae rhamnoides': { fr: [8, 9, 10, 11] }, 'Rosa canina': { f: [5, 6], fc: '#f4c2cc', fr: [9, 10, 11] }, 'Syringa vulgaris': { f: [4, 5], fc: '#b58ad2' }, 'Cotinus coggygria': { f: [6, 7], fc: '#d8b2c8', a: '#c2452e' },
  'Spiraea media': { f: [5], fc: '#f3f0e6' }, 'Rhus coriaria': { f: [6, 7], fc: '#e8e49a', a: '#c2452e' }, 'Tamarix ramosissima': { f: [5, 6, 7, 8, 9], fc: '#e8a6c2' },
};

/* ---------- foydalanuvchi assortimenti (15.11.2026) ----------
 * Foydalanuvchi oʻz pitomnigi yoki loyiha talabi boʻyicha turlarni oʻchiradi va yangi tur qoʻshadi (nomi, guruhi, kattalik sinfi,
 * namlik talabi, mahalliyligi, fasllari). Kiritilgan qiymatlar — foydalanuvchi maʼlumoti (P); assortiment manbasi albomda koʻrsatiladi. */
export interface UserSp { lat: string; ru: string; g: Grp; size: string; water: 'Т' | 'НТ'; native: boolean; fam?: string; ph?: Phen }
export interface UserAssort { add: UserSp[]; off: string[] }
const PHEN0: Record<string, Phen> = { ...PHEN };
/** Ishchi roʻyxatni qayta yigʻish. Har guruhdan (igna / barg / buta) kamida bitta tur qoladi — boʻlmasa asosiy roʻyxat qaytariladi. */
export function setUserAssort(u?: UserAssort | null): { warn: string[] } {
  const off = new Set(u?.off ?? []), warn: string[] = [];
  const add: Sp[] = (u?.add ?? []).filter(x => x.lat.trim()).map(x => ({ g: x.g, ru: x.ru || x.lat, lat: x.lat.trim(), size: x.size, water: x.water, salt: 'Н', light: 'СТ', life: 'С', growth: 'С', native: x.native, reg: 0, user: true, fam: x.fam }));
  let list = [...BASE.filter(x => !off.has(x.lat)), ...add.filter(x => !BASE.some(b => b.lat === x.lat))];
  const trees = (l: Sp[]) => l.filter(x => x.g !== 'buta');
  if (!trees(list).length) { warn.push('Barcha daraxtlar oʻchirilgan — asosiy roʻyxat daraxtlari qaytarildi'); list = [...list, ...BASE.filter(x => x.g !== 'buta')]; }
  if (!list.some(x => x.g === 'buta')) { warn.push('Barcha butalar oʻchirilgan — asosiy roʻyxat butalari qaytarildi'); list = [...list, ...BASE.filter(x => x.g === 'buta')]; }
  ASSORT.length = 0; ASSORT.push(...list);
  for (const k of Object.keys(PHEN)) if (!(k in PHEN0)) delete PHEN[k];
  for (const x of u?.add ?? []) { if (x.ph) PHEN[x.lat.trim()] = x.ph; if (x.fam) FAMILY[genus(x.lat.trim())] ??= x.fam; }
  return { warn };
}
