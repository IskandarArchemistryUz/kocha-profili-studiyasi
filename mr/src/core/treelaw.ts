/* Daraxtlar huquqiy rejimi — Oʻzbekiston (Toshkent reyestri bilan) · 23.11.2026 · docs/daraxt-normalar-toshkent.md
 *
 * Master reja / Bogʻshunos: loyiha bilan toʻqnashgan har bir mavjud daraxt uchun
 * huquqiy qaror, ruxsatnoma toʻlovi (BHM koeffitsiyentida) va kompensatsiyaviy ekish.
 * Raqamlar faqat quyidagi hujjatlardan (matn lex.uz dan 23.11.2026 da oʻqildi):
 *
 *  PF-5863  — Prezident Farmoni, 30.10.2019: moratoriy joriy etildi.
 *  PF-46    — Prezident Farmoni, 30.12.2021, 2-band: moratoriy muddatsiz uzaytirildi.
 *  VMQ-93   — VM qarori 18.02.2020 № 93, ilova: qimmatbaho navlar roʻyxati
 *             (VMQ-342 tahririda, 130 band, I–IV toifa).
 *  VMQ-464  — VM qarori 22.08.2022 № 464, 1-ilova Nizom: 3 (tushunchalar), 5 (moratoriy),
 *             23 (100 yoshdan oshgan daraxtlar), 31, 31¹, 32, 33, 37-bandlar.
 *  VMQ-86   — VM qarori 22.02.2022 № 86, Yagona nizom 15-ilova (pasport), VMQ-342 tahririda:
 *             6 (arizani koʻrish yigʻimi), 7 (toʻlov jadvali), 9 (kompensatsiya), 12-izoh.
 *  VMQ-342  — VM qarori 30.06.2026 № 342, 2-band (koʻchirish ≤ 15 sm, mavsum, 3 yil parvarish).
 *  ShNQ 2.07.01-23, 485-band, 35-jadval — bino/inshoot/tarmoqdan daraxt poyasigacha masofa.
 *
 * Teglar: N — normadan; T — taxmin (manba yoʻq yoki talqin); REVIEW — qaror mutaxassisga.
 * Bu vosita ruxsatnoma bermaydi: yakuniy qaror — Ekologiya qoʻmitasi hududiy boʻlinmasi
 * (VMQ-464, 32-band «a»: joyiga chiqib oʻrganish, jamoatchilik eshituvi).
 */

export const DOCS = {
  'PF-5863': { title: 'Prezident Farmoni PF-5863, 30.10.2019', url: 'https://president.uz/ru/lists/view/2987' },
  'PF-46':   { title: 'Prezident Farmoni PF-46, 30.12.2021', url: 'https://lex.uz/docs/5801449' },
  'VMQ-93':  { title: 'VM qarori № 93, 18.02.2020 (ilova — VMQ-342 tahririda)', url: 'https://lex.uz/docs/-8298612' },
  'VMQ-464': { title: 'VM qarori № 464, 22.08.2022, 1-ilova (Nizom)', url: 'https://lex.uz/docs/-6165732' },
  'VMQ-86':  { title: 'VM qarori № 86, 22.02.2022, Yagona nizom 15-ilova (VMQ-342 tahririda)', url: 'https://lex.uz/docs/-8298612' },
  'VMQ-342': { title: 'VM qarori № 342, 30.06.2026 (kuchga kirgan: 01.07.2026)', url: 'https://lex.uz/docs/-8298612' },
  'ShNQ-2.07.01-23': { title: 'ShNQ 2.07.01-23, 485-band, 35-jadval', url: '' },
} as const;
export type DocId = keyof typeof DOCS;
export interface Cite { doc: DocId; band: string }

/* ---------- 1. Bazaviy hisoblash miqdori ---------- */
/** BHM, soʻm — 01.09.2026 dan 440 000 (Prezident farmoni, 2026-iyun; buxgalter.uz, gov.uz).
 *  Sozlamada tahrirlanadi: toʻlov ruxsatnoma berilgan kundagi BHM bilan hisoblanadi. */
export const BHM_DEFAULT = { som: 440_000, from: '2026-09-01', src: 'buxgalter.uz — «2026 yil 1 sentyabrdan boshlab qanday BHM…»' };

/* ---------- 2. Qimmatbaho navlar roʻyxati (VMQ-93 ilovasi, VMQ-342 tahririda) ---------- */
/** I — yogʻochbop; II — manzarali; III — Qizil kitob; IV — butalar */
export type Cat = 'I' | 'II' | 'III' | 'IV';
export interface Valuable { n: number; uz: string; lat: string; cat: Cat }
const V = (n: number, uz: string, lat: string, cat: Cat): Valuable => ({ n, uz, lat, cat });
// Lotincha nomlar hujjatdagi yozuvda (imlo xatolari bilan) — moslash `lat` boʻyicha emas, `REG` jadvali orqali.
export const VALUABLE: Valuable[] = [
  V(1, 'Grek yongʻogʻi', 'Juglans regia', 'I'), V(2, 'Silliq qayragʻoch', 'Ulmus laevis', 'I'),
  V(3, 'Yalangʻoch qayragʻoch', 'Ulmus glabra', 'I'), V(4, 'Past boʻyli qayragʻoch, qayragʻoch', 'Ulmus pumila', 'I'),
  V(5, 'Kavkaz qatrongʻisi, tugʻdona', 'Celtis caucasica', 'I'), V(6, 'Tukli zarang', 'Acer pubescens', 'I'),
  V(7, 'Sekvoya', 'Sequoia sempervirens', 'I'), V(8, 'Oddiy eman', 'Quercus robur', 'I'),
  V(9, 'Chinorsimon zarang', 'Acer platanoides', 'I'), V(10, 'Oq akatsiya', 'Robinia pseudoacacia', 'I'),
  V(11, 'Glidichiya', 'Gleditsia triacanthos', 'I'), V(12, 'Ginkgo biloba', 'Ginkgo biloba', 'I'),
  V(13, 'Shumtol', 'Fraxinus raibocarpa', 'I'), V(14, 'Suriya qora shumtoli', 'Fraxinus syriaca', 'I'),
  V(15, 'Oddiy qaragʻay', 'Pinus sylvestris', 'I'), V(16, 'Gʻarb tuyasi', 'Thuja occidentalis', 'I'),
  V(17, 'Meliya azedarax', 'Melia azedarach', 'I'), V(18, 'Pavlovniya', 'Paulownia tomentosa', 'I'),
  V(19, 'Koʻkbargli terak, turangʻil', 'Populus pruinosa', 'I'), V(20, 'Oq tut (balxi)', 'Morus alba', 'I'),
  V(21, 'Gʻarb chinori', 'Platanus occidentalis', 'I'), V(22, 'Zarang bargli chinor', 'Platanus × acerifolia', 'I'),
  V(23, 'Yirik mevali eman', 'Quercus macrocarpa', 'I'), V(24, 'Pensilvaniya shumtoli', 'Fraxinus pennsylvanica', 'I'),
  V(25, 'Amerika shumtoli', 'Fraxinus americana', 'I'), V(26, 'Sugʻd shumtoli', 'Fraxinus sogdiana', 'I'),
  V(27, 'Virgin xurmosi', 'Diospyros virginiana', 'I'), V(28, 'Kashtan bargli eman', 'Quercus castaneifolia', 'I'),
  V(29, 'Poʻkakli eman', 'Quercus suber', 'I'), V(30, 'Soxta chinor bargli zarang', 'Acer pseudoplatanus', 'I'),
  V(31, 'Qandli zarang', 'Acer saccharinum', 'I'), V(32, 'Dala zarangi', 'Acer campestre', 'I'),
  V(33, 'Turkiston archasi, oʻrik archa', 'Juniperus turkestanica', 'II'), V(34, 'Yarim sharsimon archa, saur archa', 'Juniperus semiglobosa', 'II'),
  V(35, 'Zarafshon archasi', 'Juniperus seravschanica', 'II'), V(36, 'Soqolchali qayin', 'Betula pendula', 'II'),
  V(37, 'Tyanshan qayini', 'Betula tianschanica', 'II'), V(38, 'Kapyu toli', 'Salix capusii', 'II'),
  V(39, 'Androsov qayragʻochi, sadaqayragʻoch', 'Ulmus androssowii', 'II'), V(40, 'Qora tut, shotut', 'Morus nigra', 'II'),
  V(41, 'Semenov zarangi', 'Acer semenovii', 'II'), V(42, 'Kanada argʻuvoni', 'Cercis canadensis', 'II'),
  V(43, 'Lenkaran akatsiyasi', 'Albizia julibrissin', 'II'), V(44, 'Yuraksimon juka', 'Tilia cordata', 'II'),
  V(45, 'Terisimon skumpiya', 'Cotinus coggygria', 'II'), V(46, 'Supurgi kyolreyteriya', 'Koelreuteria paniculata', 'II'),
  V(47, 'Soxta kashtan', 'Aesculus hippocastanum', 'II'), V(48, 'Brussonetiya', 'Broussonetia papyrifera', 'II'),
  V(49, 'Turkiston zarangi', 'Acer turkestanicum', 'II'), V(50, 'Qoraqaragʻay', 'Pinus nigra', 'II'),
  V(51, 'Eldor qaragʻayi', 'Pinus eldarica', 'II'), V(52, 'Qrim qaragʻayi', 'Pinus nigra pallasiana', 'II'),
  V(53, 'Tikoni koʻk qaragʻay', 'Picea pungens', 'II'), V(54, 'Shrenk qaragʻayi', 'Picea schrenkiana', 'II'),
  V(55, 'Kedr, Gimalay kedri', 'Thuja plicata (hujjatda)', 'II'), V(56, 'Kazak archasi', 'Juniperus sabina', 'II'),
  V(57, 'Doimiy yashil kiparis', 'Cupressus sempervirens', 'II'), V(58, 'Xitoy metasekvoyasi', 'Metasequoia glyptostroboides', 'II'),
  V(59, 'Lola daraxti', 'Liriodendron tulipifera', 'II'), V(60, 'Yirik gulli magnoliya', 'Magnolia grandiflora', 'II'),
  V(61, 'Magnoliya', 'Magnolia', 'II'), V(62, 'Toʻq sariq maklyura', 'Maclura pomifera', 'II'),
  V(63, 'Choʻziq bargli tol', 'Salix linearifolia', 'II'), V(64, 'Majnuntol', 'Salix babylonica', 'II'),
  V(65, 'Uzun barg jiyda', 'Elaeagnus angustifolia', 'II'), V(66, 'Sharq jiydasi', 'Elaeagnus orientalis', 'II'),
  V(67, 'Goʻzal katalpa', 'Catalpa bignonioides', 'II'), V(68, 'Sivers olmasi, yovvoyi olma', 'Malus sieversii', 'II'),
  V(69, 'Fors qizilchetani', 'Sorbus persica', 'II'), V(70, 'Tyanshan qizilchetani', 'Sorbus tianschanica', 'II'),
  V(71, 'Turkiston chetani', 'Sorbus turkestanica', 'II'), V(72, 'Turkiston doʻlanasi, qizil doʻlana', 'Crataegus turkestanica', 'II'),
  V(73, 'Buxoro bodomi, yovvoyi bodom', 'Amygdalus bucharica', 'II'), V(74, 'Yirik bargli joʻka', 'Tilia platyphyllos', 'II'),
  V(75, 'Tuxumsimon bargli katalpa', 'Catalpa ovata', 'II'), V(76, 'Xilokatalpa', 'Chitalpa tashkentensis', 'II'),
  V(77, 'Pissardi olxoʻrisi', 'Prunus pissardii', 'II'), V(78, 'Qizil zarang', 'Acer rubrum', 'II'),
  V(79, 'Sulanja magnoliyasi', 'Magnolia × soulangeana', 'II'), V(80, 'Yapon zarangi', 'Acer palmatum', 'II'),
  V(81, 'Baland boʻyli archa', 'Juniperus excelsa', 'II'), V(82, 'Kavkaz oqqaragʻayi', 'Abies nordmanniana', 'II'),
  V(83, 'Mevali zarnab', 'Taxus baccata', 'II'), V(84, 'Soxta sarv', 'Chamaecyparis lawsoniana', 'II'),
  V(85, 'Arizona sarvisi', 'Cupressus arizonica', 'II'), V(86, 'Gʻarb tuyasi sharsimon formasi', 'Thuja occidentalis f. globosa', 'II'),
  V(87, 'Ustunsimon tuya «Columna»', 'Thuja occidentalis f. columna', 'II'), V(88, 'Doim yashil sekvoya', 'Sequoia sempervirens', 'II'),
  V(89, 'Uzun bargli archa', 'Juniperus oblonga', 'II'), V(90, 'Tangachabargli archa', 'Juniperus squamata', 'II'),
  V(91, 'Togʻ qaragʻayi «Mops»', 'Pinus mugo f. Mops', 'II'), V(92, 'Atlas kedri «Glauca»', 'Cedrus atlantica f. glauca', 'II'),
  V(93, 'Kazak archa «variegata»', 'Juniperus sabina f. variegata', 'II'), V(94, 'Kazak archa «fastigata»', 'Juniperus sabina f. fastigiata', 'II'),
  V(95, 'Buramasimon tuya', 'Thuja plicata', 'II'), V(96, 'Sharq qoraqaragʻayi', 'Picea orientalis', 'II'),
  V(97, 'Sharq chinori, chinor', 'Platanus orientalis', 'III'), V(98, 'Oʻrta Osiyo noki, nashvati', 'Pyrus asiae-mediae', 'III'),
  V(99, 'Kavkaz xurmosi', 'Diospyros lotus', 'III'), V(100, 'Yovvoyi chilonjiyda', 'Ziziphus jujuba', 'III'),
  V(101, 'Binafsha gulli argʻuvon', 'Cercis griffithii', 'III'), V(102, 'Oshlovchi totum', 'Rhus coriaria', 'III'),
  V(103, 'Forzitsiya', 'Forsythia', 'IV'), V(104, 'Hind sireni', 'Lagerstroemia indica', 'IV'),
  V(105, 'Yapon toli', 'Chaenomeles japonica', 'IV'), V(106, 'Pirakanta', 'Pyracantha', 'IV'),
  V(107, 'Spireya', 'Spiraea', 'IV'), V(108, 'Gibiskus', 'Hibiscus', 'IV'),
  V(109, 'Beresklet', 'Euonymus', 'IV'), V(110, 'Samshit', 'Buxus', 'IV'),
  V(111, 'Magoniya', 'Mahonia aquifolium', 'IV'), V(112, 'Qoraqad barbaris', 'Berberis', 'IV'),
  V(113, 'Siren', 'Syringa vulgaris', 'IV'), V(114, 'Jasmin', 'Jasminum officinale', 'IV'),
  V(115, 'Oq saksovul', 'Haloxylon persicum', 'IV'), V(116, 'Qora saksovul', 'Haloxylon ammodendron', 'IV'),
  V(117, 'Yaltiroq bargli ligistrum', 'Ligustrum lucidum', 'IV'), V(118, 'Togʻ murch', 'Vitex agnus-castus', 'IV'),
  V(119, 'Yuliana zirki', 'Berberis julianae', 'IV'), V(120, 'Ispan droki', 'Spartium junceum', 'IV'),
  V(121, 'Yorqin qizil pirakanta', 'Pyracantha coccinea', 'IV'), V(122, 'David budleyasi', 'Buddleja davidii', 'IV'),
  V(123, 'Oddiy padub', 'Ilex aquifolium', 'IV'), V(124, 'Asl lavr', 'Laurus nobilis', 'IV'),
  V(125, 'Sambut guli', 'Nerium oleander', 'IV'), V(126, 'Jannat daraxti', 'Caesalpinia pulcherrima', 'IV'),
  V(127, 'Madaniy nandina', 'Nandina domestica', 'IV'), V(128, 'Fotiniya', 'Photinia × fraseri', 'IV'),
  V(129, 'Olcha bargli lavr', 'Prunus laurocerasus', 'IV'), V(130, 'Koʻp rangli veygeliya', 'Weigela floribunda', 'IV'),
];
const VBY = new Map(VALUABLE.map(v => [v.n, v]));

/** Kam qimmatli turlar — VMQ-86, 15-ilova, 7-band jadval sarlavhasi (roʻyxat «va boshqalar» bilan tugaydi — yopiq emas). */
export const LESS_VALUABLE_TEXT = 'oddiy archa, virgin archa (mojjevelnik), sharq biotasi, aylant (sassiq daraxt), ipak akatsiya, sovun daraxti, qogʻoz daraxti, oq tol, qora tol, yapon soforasi, oq terak, koʻk terak, qora terak, Turkiston teragi, mirza terak, togʻ terak, oddiy shirin bodom, oʻrik, olma, naʼmatak, chakanda, qandim, yulgʻun, oddiy zirk va boshqalar';

/* ---------- 3. Toshkent reyestri nomlari → huquqiy toifa ---------- */
/** Kalit — reyestrdagi `name_ru` (oʻzbekcha `name_oz` — UZ_ALIAS orqali) (23.11 da 74 527 daraxtli namunadan, 168 tur). Qiymat:
 *  number — VMQ-93 roʻyxatidagi band; 'kam' — 15-ilova kam qimmatli roʻyxatida nomi bor;
 *  'ikki' — ikkala roʻyxatda ham bor (huquqiy ziddiyat, qimmatbaho deb olinadi + REVIEW);
 *  roʻyxatda yoʻq turlar kalitda yoʻq → 'nomalum'. */
type RegVal = number | 'kam' | { ikki: number; kam: string };
export const REG: Record<string, RegVal> = {
  'Сосна эльдарская': 51, 'Можжевельник виргинский': 'kam', 'Абрикос обыкновенный': 'kam', 'Яблоня домашняя': 'kam',
  'Шелковица белая': 20, 'Софора японская': 'kam', 'Ясень пенсильванский': 24, 'Платан восточный': 97,
  'Сосна обыкновенная': 15, 'Павловния войлочная': 18, 'Биота восточная': 'kam', 'Тополь черный': 'kam',
  'Орех грецкий': 1, 'Туя западная': 16, 'Туя западная Смарагд': 16, 'Сосна крымская': 52, 'Кипарис аризонский': 85,
  'Дуб черешчатый': 8, 'Айлант высочайший': 'kam', 'Конский каштан обыкновенный': 47, 'Тополь белый': 'kam',
  'Робиния ложноакациевая': 10, 'Сосна чёрная': 50, 'Катальпа бигнониевидная': 67, 'Катальпа прекрасная': 67,
  'Ясень американский': 25, 'Платан клёнолистный': 22, 'Шелковица чёрная': 40, 'Клён полевой': 32,
  'Вяз приземистый (карагач)': 4, 'Хурма кавказская': 99, 'Можжевельник обыкновенный': 'kam',
  'Сирень обыкновенная': 113, 'Тополь пирамидальный': 'kam', 'Платан западный': 21, 'Клён белый (ложноплатановый)': 30,
  'Миндаль обыкновенный': 'kam', 'Гибискус сирийский': 108, 'Тюльпановое дерево': 59, 'Гледичия трёхколючковая': 11,
  'Хурма виргинская': 27, 'Багрянник канадский': 42, 'Багрянник канадский (Forest Pansy)': 42,
  'Акация шелковая': { ikki: 43, kam: 'ipak akatsiya' }, 'Дуб каштанолистный': 28, 'Клён остролистный': 9,
  'Японское бумажное дерево': { ikki: 48, kam: 'qogʻoz daraxti' }, 'Берёза повислая (бородавчатая)': 36,
  'Магнолия крупноцветковая': 60, 'Ива белая': 'kam', 'Слива Писсарди': 77, 'Eль колючая': 53, 'Ель колючая': 53,
  'Ель колючая форма голубая': 53, 'Магнолия Суланджа': 79, 'Миндаль бухарский': 73, 'Ива плакучая': 64,
  'Кипарис вечнозелёный': 57, 'Кёльрейтерия метельчатая': { ikki: 46, kam: 'sovun daraxti' },
  'Яблоня лесная': 'kam', 'Яблоня ягодная': 'kam', 'Яблоня Недзвецкого': 'kam', 'Яблоня Сиверса': 68,
  'Лох узколистный': 65, 'Клён туркестанский': 49, 'Маклюра оранжевая': 62, 'Клён серебристый': 31,
  'Вяз гладкий': 2, 'Липа сердцевидная': 44, 'Унаби обыкновенная': 100, 'Лагерстрёмия индийская': 104,
  'Скумпия кожевенная': 45, 'Бирючина блестящая': 117, 'Можжевельник туркестанский': 33, 'Вяз шершавый': 3,
  'Метасеквойя глиптостробовидная': 58, 'Лох восточный': 66, 'Каркас кавказский': 5, 'Тополь сизый': 19,
  'Ясень сирийский': 14, 'Вяз Андросова': 39, 'Можжевельник полушаровидный': 34, 'Ель тяньшаньская': 54,
  'Гинкго двулопастный': 12, 'Хилокатальпа ташкентская': 76, 'Сумах дубильный': 102, 'Фотиния Фрезера': 128,
  'Боярышник туркестанский': 72, 'Падуб остролистный': 123, 'Ясень согдийский': 26, 'Можжевельник казацкий': 56,
  'Самшит мелколистный': 110, 'Магония падуболистная': 111, 'Багрянник Гриффита': 101,
  'Груша среднеазиатская': 98, 'Бересклет европейский': 109, 'Мелия ацедарах': 17,
  'Роза собачья, шиповник обыкновенный': 'kam',
};
/** Reyestr `name_oz` (lotin oʻzbekcha) → `REG` kaliti. Lab serveri `name_oz` ni qaytaradi (server/src/data/routes.js). */
export const UZ_ALIAS: Record<string, string> = {
  'Eldor qaragʻay': 'Сосна эльдарская', 'Virgin archasi': 'Можжевельник виргинский', 'Oʻrik': 'Абрикос обыкновенный',
  'Madaniy olma': 'Яблоня домашняя', 'Oq tut': 'Шелковица белая', 'Yapon soforasi': 'Софора японская',
  'Pensilvaniya shumtoli': 'Ясень пенсильванский', 'Sharq chinori': 'Платан восточный', 'Oddiy qaragʻay': 'Сосна обыкновенная',
  'Tolali pavlovniya': 'Павловния войлочная', 'Sharq biotasi': 'Биота восточная', 'Qora terak': 'Тополь черный',
  'Grek yongʻogʻi': 'Орех грецкий', 'Garb tuyasi': 'Туя западная', 'Gʻarb tuyasi': 'Туя западная', 'Gʻarb tuyasi Smaragd': 'Туя западная Смарагд',
  'Qrim qaragʻay': 'Сосна крымская', 'Arizon sarvi': 'Кипарис аризонский', 'Oddiy eman': 'Дуб черешчатый',
  'Yuksak aylant': 'Айлант высочайший', 'Oddiy soxta kashtan': 'Конский каштан обыкновенный', 'Oq terak': 'Тополь белый',
  'Oq akatsiya': 'Робиния ложноакациевая', 'Avstriya qaragʻayi': 'Сосна чёрная', 'Bignoniya katalpasi': 'Катальпа бигнониевидная',
  'Goʻzal katalpa': 'Катальпа прекрасная', 'Amerika shumtoli': 'Ясень американский', 'Zarang bargli chinor': 'Платан клёнолистный',
  'Qora tut (Shotut)': 'Шелковица чёрная', 'Dala zarangi': 'Клён полевой', 'Oddiy qayragʻoch': 'Вяз приземистый (карагач)',
  'Kavkaz xurmosi': 'Хурма кавказская', 'Oddiy archa': 'Можжевельник обыкновенный', 'Oddiy siren': 'Сирень обыкновенная',
  'Qora terak piramidal shakli': 'Тополь пирамидальный', 'Garb chinori': 'Платан западный', 'Oq zarangi': 'Клён белый (ложноплатановый)',
  'Oddiy shirin bodom': 'Миндаль обыкновенный', 'Suriya atirguli': 'Гибискус сирийский', 'Lola daraxti': 'Тюльпановое дерево',
  'Oddiy gledichiya': 'Гледичия трёхколючковая', 'Virgin xurmosi': 'Хурма виргинская', 'Kanada bagryannigi': 'Багрянник канадский',
  'Kanada bagryannigi (Forest Pansy)': 'Багрянник канадский', 'Ipak akatsiyasi': 'Акация шелковая', 'Kashtan bargli eman': 'Дуб каштанолистный',
  'Otkir bargli zarang': 'Клён остролистный', 'Yapon qogʻoz daraxti': 'Японское бумажное дерево', 'Oq qayin': 'Берёза повислая (бородавчатая)',
  'Yirik gulli magnoliya': 'Магнолия крупноцветковая', 'Oq tol': 'Ива белая', 'Pissarda olxoʻrisi': 'Слива Писсарди',
  'Tikoni qoraqaragʻay': 'Ель колючая', 'Tikoni koʻk qoraqaragʻay': 'Ель колючая форма голубая', 'Magnoliya Sulandja': 'Магнолия Суланджа',
  'Achchiq bodom': 'Миндаль бухарский', 'Majnun tol': 'Ива плакучая', 'Doim yashil sarv': 'Кипарис вечнозелёный',
  'Sovun daraxti': 'Кёльрейтерия метельчатая', 'Oʻrmon olmasi': 'Яблоня лесная', 'Rezavor mevali olma': 'Яблоня ягодная',
  'Qizilolma': 'Яблоня Недзвецкого', 'Yovvoyi olma': 'Яблоня Сиверса', 'Mayda bargli jiyda': 'Лох узколистный',
  'Turkiston zarangi': 'Клён туркестанский', 'Olovrangli maklyura': 'Маклюра оранжевая', 'Kumush zarang': 'Клён серебристый',
  'Silliq qayragʻoch': 'Вяз гладкий', 'Mayda bargli joʻka': 'Липа сердцевидная', 'Oddiy chilonjiyda': 'Унаби обыкновенная',
  'Hind nastarini': 'Лагерстрёмия индийская', 'Skumpiya': 'Скумпия кожевенная', 'Yaltiroq devorgul': 'Бирючина блестящая',
  'Oʻrikarcha': 'Можжевельник туркестанский', 'Oddiy naʻmatak': 'Роза собачья, шиповник обыкновенный', 'Yalangʻoch qayragʻoch': 'Вяз шершавый',
  'Glibtostrobussimon metasekvoya': 'Метасеквойя глиптостробовидная', 'Sharq jiydasi': 'Лох восточный', 'Kavkaz qatrangʻisi': 'Каркас кавказский',
  'Turangil terak': 'Тополь сизый', 'Suriya shumtoli': 'Ясень сирийский', 'Andrassov qayragʻochi': 'Вяз Андросова',
  'Saurarcha': 'Можжевельник полушаровидный', 'Tyan-Shan qoraqaragʻayi': 'Ель тяньшаньская', 'Ginkgo biloba': 'Гинкго двулопастный',
  'Toshkent xilokatalpasi': 'Хилокатальпа ташкентская', 'Oshlovchi totim': 'Сумах дубильный', 'Frezer fotiniyasi': 'Фотиния Фрезера',
  'Qizil doʻlana': 'Боярышник туркестанский', 'Oʻtkir bargli padub': 'Падуб остролистный', 'Soʻgʻdiyona shumtoli': 'Ясень согдийский',
  'Kazak archasi': 'Можжевельник казацкий', 'Maydabargli shamshod': 'Самшит мелколистный', 'Padubbargli magoniya': 'Магония падуболистная',
  'Griffit bagryannigi': 'Багрянник Гриффита', 'Orta Osiyo noki': 'Груша среднеазиатская', 'Oʻrta Osiyo noki': 'Груша среднеазиатская',
  'Evropa normushki': 'Бересклет европейский', 'Meliya atsedarax': 'Мелия ацедарах',
};
/** Taqqoslash uchun: kichik harf, tutuq belgilari (ʻ ʼ ʹ ' ’ ‘ `) olib tashlanadi, ё → е, boʻshliqlar yigʻiladi */
export const normName = (s: string): string => s.toLowerCase().replace(/[ʻʼʹ'’‘`]/g, '').replace(/ё/g, 'е').replace(/\s+/g, ' ').trim();
const IDX = new Map<string, RegVal>();
for (const [k, v] of Object.entries(REG)) IDX.set(normName(k), v);
for (const [uz, ru] of Object.entries(UZ_ALIAS)) { const v = REG[ru]; if (v !== undefined) IDX.set(normName(uz), v); }
const KEYS = [...IDX.keys()].sort((a, b) => b.length - a.length);
/** Aniq nom; yoki nom + shakl/nav qoʻshimchasi («… Smaragd», «… (Forest Pansy)»). Qisqa umumiy nom («Ель») mos kelmaydi. */
function regLookup(name: string): RegVal | undefined {
  const k = normName(name ?? '');
  if (!k) return undefined;
  const v = IDX.get(k); if (v !== undefined) return v;
  const hit = KEYS.find(r => k.startsWith(r + ' ') || k.startsWith(r + '('));
  return hit ? IDX.get(hit) : undefined;
}

export type LegalClass = 'qizil_kitob' | 'qimmatbaho' | 'kam_qimmatli' | 'ziddiyat' | 'nomalum';
export interface SpeciesLaw { cls: LegalClass; item?: Valuable; note?: string; tag: 'N' | 'T' | 'REVIEW' }
export function speciesLaw(name: string): SpeciesLaw {
  const r = regLookup(name);
  if (r === undefined) return { cls: 'nomalum', tag: 'REVIEW', note: 'Tur ikkala roʻyxatda ham nomi bilan yoʻq (kam qimmatli roʻyxat «va boshqalar» bilan tugaydi) — dendrolog / Ekologiya boshqarmasi aniqlaydi' };
  if (r === 'kam') return { cls: 'kam_qimmatli', tag: 'N' };
  if (typeof r === 'object') return { cls: 'ziddiyat', item: VBY.get(r.ikki), tag: 'REVIEW', note: `VMQ-93 ilovasi ${r.ikki}-bandida qimmatbaho, 15-ilovada «${r.kam}» kam qimmatli — qimmatbaho deb olinadi` };
  const it = VBY.get(r)!;
  return { cls: it.cat === 'III' ? 'qizil_kitob' : 'qimmatbaho', item: it, tag: 'N' };
}

/* ---------- 4. Toʻlov jadvali (VMQ-86, 15-ilova, 7-band) ---------- */
/** [diametr yuqori chegarasi, sm; kam qimmatli koef.; qimmatbaho koef.] — BHM ga nisbatan, bitta daraxt uchun.
 *  Qizil kitobdagi turlar jadvaldan chiqarilgan («bundan mustasno»). */
export const FEE: [number, number, number][] = [
  [4, 0.2, 0.4], [8, 0.3, 0.6], [12, 0.4, 1.0], [16, 0.6, 1.3], [20, 1.0, 1.8], [24, 1.5, 2.5],
  [28, 1.8, 3.5], [32, 2.3, 4.5], [36, 3.3, 5.5], [40, 4.4, 6.5], [44, 5.2, 8.0], [48, 6.2, 9.5],
  [52, 7.2, 10.5], [56, 8.2, 11.5], [60, 9.2, 13.5], [64, 10.5, 14.5],
];
/** 64 sm dan ortiq har bir sm uchun +0,5 (matnda bitta qoida — ikkala ustunga qoʻllanadi). */
export function feeCoef(dbhCm: number, valuable: boolean): number {
  const d = Math.max(0, dbhCm);
  for (const [up, kam, q] of FEE) if (d <= up) return valuable ? q : kam;
  const last = FEE[FEE.length - 1];
  return (valuable ? last[2] : last[1]) + 0.5 * Math.ceil(d - 64);
}
export const REVIEW_FEE_BHM = 0.3;      // 15-ilova, 6-band — har bir ariza uchun
export const TRANSPLANT_MAX_DBH = 15;   // VMQ-342 2-band; VMQ-464 8-band — daraxt, 1,3 m balandlikda
export const TRANSPLANT_MAX_SHRUB = 10; // buta, ildiz boʻgʻzida
export const COMP_PER_CUT = 10;         // 15-ilova 9 «b»; VMQ-464 32 «b» — 5 yillik koʻchat, ≥ 2 yil parvarish
export const CARE_TRANSPLANT_Y = 3;     // VMQ-342 2-band
export const HARDSCAPE_MIN_M = 0.2;     // VMQ-464 3-band «shikastlantirish» — ildiz boʻgʻzidan ≤ 20 sm qattiq qoplama

/* ---------- 5. ShNQ 2.07.01-23, 35-jadval — daraxt poyasigacha masofa, m ---------- */
export type Obstacle = 'bino' | 'tramvay' | 'trotuar' | 'qatnov' | 'ustun' | 'yonbagir' | 'tirgak' | 'gaz_kanal' | 'issiqlik' | 'suv_drenaj' | 'kabel';
export const DIST_35: Record<Obstacle, { tree: number; shrub: number | null; uz: string }> = {
  bino:      { tree: 5.0, shrub: 1.5, uz: 'Bino va inshootning tashqi devori' },
  tramvay:   { tree: 5.0, shrub: 3.0, uz: 'Tramvay yoʻlining cheti' },
  trotuar:   { tree: 0.7, shrub: 0.5, uz: 'Trotuar va bogʻ yoʻlkasi cheti' },
  qatnov:    { tree: 2.0, shrub: 1.0, uz: 'Koʻcha qatnov qismining cheti, yoʻl yoqasi yonbagʻri yoki ariq qirgʻogʻi' },
  ustun:     { tree: 4.0, shrub: null, uz: 'Yoritish tarmogʻi, tramvay ustuni, koʻprik tayanchi, estakada' },
  yonbagir:  { tree: 1.0, shrub: 0.5, uz: 'Yonbagʻir va terassa poyi' },
  tirgak:    { tree: 3.0, shrub: 1.0, uz: 'Tirgak devorning asosi yoki ichki qirrasi' },
  gaz_kanal: { tree: 1.5, shrub: null, uz: 'Gaz va kanalizatsiya tarmoqlari' },
  issiqlik:  { tree: 2.0, shrub: 1.0, uz: 'Isitish tarmogʻi' },
  suv_drenaj:{ tree: 2.0, shrub: null, uz: 'Suv va drenaj tarmoqlari' },
  kabel:     { tree: 2.0, shrub: 0.7, uz: 'Kuchlanish va aloqa kabeli' },
};
/** 35-jadval 1-izohi: normalar toj diametri ≤ 5 m daraxtlar uchun, kattalari uchun «oshirilishi kerak» —
 *  qancha oshirish normada yoʻq. Sukut: toj > 5 m boʻlsa masofaga (toj − 5)/2 qoʻshiladi (T). */
export function minDist(o: Obstacle, crownM: number, shrub = false): { m: number; tag: 'N' | 'T' } {
  const b = DIST_35[o], base = shrub ? (b.shrub ?? b.tree) : b.tree;
  if (shrub || !(crownM > 5)) return { m: base, tag: 'N' };
  return { m: base + (crownM - 5) / 2, tag: 'T' };
}

/* ---------- 6. Qaror ---------- */
export interface TreeIn { id?: string | number; name: string; dbh: number; crown?: number; shrub?: boolean;
  /** loyiha bilan toʻqnashuv: 'dog' — bino/yoʻl/qoplama dogʻi ostida; 'masofa' — 35-jadval masofasidan yaqin; null — yoʻq */
  conflict: 'dog' | 'masofa' | null; obstacle?: Obstacle; distM?: number;
  /** loyiha davlat dasturi / transport infratuzilmasi / yirik investitsiya / davlat ahamiyatidagi loyihami */
  stateProject?: boolean }
export type Decision = 'saqlanadi' | 'kochiriladi' | 'kesiladi' | 'loyiha_ozgaradi' | 'prezident_hujjati' | 'review';
export interface TreeOut { id?: string | number; law: SpeciesLaw; decision: Decision; tag: 'N' | 'T' | 'REVIEW';
  feeBhm: number; compSaplings: number; careYears: number; why: string; cite: Cite[] }

const C = (doc: DocId, band: string): Cite => ({ doc, band });
const MORATORIY = [C('PF-46', '2'), C('VMQ-464', '5, 31'), C('PF-5863', '—')];

export function decide(t: TreeIn): TreeOut {
  const law = speciesLaw(t.name);
  const lim = t.shrub ? TRANSPLANT_MAX_SHRUB : TRANSPLANT_MAX_DBH;
  const small = t.dbh > 0 && t.dbh <= lim;
  const out = (decision: Decision, tag: TreeOut['tag'], why: string, cite: Cite[], feeBhm = 0, comp = 0, care = 0): TreeOut =>
    ({ id: t.id, law, decision, tag: law.tag === 'REVIEW' && tag === 'N' ? 'REVIEW' : tag, feeBhm, compSaplings: comp, careYears: care, why, cite });

  if (!t.conflict) return out('saqlanadi', 'N', 'Loyiha bilan toʻqnashuv yoʻq', []);
  if (!(t.dbh > 0)) return out('review', 'REVIEW', 'Tana diametri reyestrda yoʻq — oʻlchash kerak', [C('VMQ-342', '2')]);

  const protectedSp = law.cls === 'qizil_kitob' || law.cls === 'qimmatbaho' || law.cls === 'ziddiyat';
  if (protectedSp) {
    if (law.cls === 'qizil_kitob') {
      // 15-ilova 7-band jadvali Qizil kitob turlarini chiqarib tashlaydi — oddiy ruxsatnoma tartibida koʻchirish/kesish yoʻq.
      return out('loyiha_ozgaradi', 'N', `Qizil kitob turi (${law.item!.uz}) — kesish moratoriy ostida, toʻlov jadvalidan chiqarilgan; loyiha daraxtni saqlab oʻzgaradi`, [...MORATORIY, C('VMQ-86', '15-ilova, 7')]);
    }
    if (small) return out('kochiriladi', 'N', `Qimmatbaho tur, d = ${t.dbh} sm ≤ ${lim} — ruxsatnoma bilan koʻchiriladi (kuz — 1-aprel, ildiz tuprogʻi bilan)`,
      [C('VMQ-342', '2'), C('VMQ-86', '15-ilova, 7, 9'), C('VMQ-464', '8, 33, 37')], feeCoef(t.dbh, true), 0, CARE_TRANSPLANT_Y);
    if (t.stateProject) return out('prezident_hujjati', 'N', `Qimmatbaho tur, d = ${t.dbh} sm > ${lim} — davlat ahamiyatidagi loyihada ham koʻchirish faqat Prezident hujjati bilan`, [C('VMQ-342', '2'), C('VMQ-86', '15-ilova, 12-izoh')]);
    return out('loyiha_ozgaradi', 'N', `Qimmatbaho tur, d = ${t.dbh} sm > ${lim} — kesish taqiqlangan (moratoriy), koʻchirish ruxsat etilgan oʻlchamdan katta; bino/yoʻl suriladi`, MORATORIY);
  }
  // kam qimmatli yoki nomaʼlum
  const tg: TreeOut['tag'] = law.cls === 'nomalum' ? 'REVIEW' : 'N';
  if (small) return out('kochiriladi', tg, `${law.cls === 'nomalum' ? 'Tur roʻyxatda yoʻq' : 'Kam qimmatli'}, d = ${t.dbh} sm ≤ ${lim} — avval koʻchirish koʻriladi (pasport 12-izoh V)`,
    [C('VMQ-86', '15-ilova, 7, 12-izoh V'), C('VMQ-342', '2')], feeCoef(t.dbh, false), 0, CARE_TRANSPLANT_Y);
  return out('kesiladi', tg, `${law.cls === 'nomalum' ? 'Tur roʻyxatda yoʻq (kam qimmatli deb olindi — T)' : 'Kam qimmatli'}, d = ${t.dbh} sm — ruxsatnoma, toʻlov va ${COMP_PER_CUT} ta 5 yillik koʻchat (≥ 2 yil parvarish)`,
    [C('VMQ-464', '31, 32 «b»'), C('VMQ-86', '15-ilova, 7, 9 «b»')], feeCoef(t.dbh, false), COMP_PER_CUT, 2);
}

/* ---------- 7. Balans ---------- */
export interface Balance { n: number; by: Record<Decision, number>; byClass: Record<LegalClass, number>;
  feeBhm: number; feeSom: number; reviewFeeSom: number; compSaplings: number; review: number }
export function balance(rows: TreeOut[], bhmSom = BHM_DEFAULT.som, applications = 1): Balance {
  const by = { saqlanadi: 0, kochiriladi: 0, kesiladi: 0, loyiha_ozgaradi: 0, prezident_hujjati: 0, review: 0 } as Record<Decision, number>;
  const byClass = { qizil_kitob: 0, qimmatbaho: 0, kam_qimmatli: 0, ziddiyat: 0, nomalum: 0 } as Record<LegalClass, number>;
  let fee = 0, comp = 0, rev = 0;
  for (const r of rows) { by[r.decision]++; byClass[r.law.cls]++; fee += r.feeBhm; comp += r.compSaplings; if (r.tag === 'REVIEW') rev++; }
  const feeBhm = Math.round(fee * 10) / 10;
  return { n: rows.length, by, byClass, feeBhm, feeSom: Math.round(feeBhm * bhmSom), reviewFeeSom: Math.round(applications * REVIEW_FEE_BHM * bhmSom), compSaplings: comp, review: rev };
}

/** 100 yoshdan oshgan daraxtlar — tabiat yodgorligi reyestri (VMQ-464, 23-band). Reyestrda yosh yoʻq → faqat ogohlantirish. */
export const AGE_NOTE = 'Yuz yoshdan oshgan daraxtlar tabiat yodgorligi sifatida alohida reyestrga olinadi (VMQ-464, 23-band); yosh reyestrda yoʻq — dendrolog baholaydi.';
