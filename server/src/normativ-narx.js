/* Shaharsozlik hujjatlarini ishlab chiqishning normativ narxi — kalkulyator.
 *
 * Manba: Oʻzbekiston Respublikasi qurilish va uy-joy kommunal xoʻjaligi vazirining 2024-yil 26-avgustdagi 1-son
 * buyrugʻiga ilova — «Shaharsozlik hujjatlarini ishlab chiqish narxlarini aniqlash boʻyicha uslubiy qoʻllanma»
 * (AV ro'yxat raqami 3556, 27.09.2024). https://lex.uz/pdffile/7121901
 *
 * Formula (8-band): Q = Ab × BHM × KIS.
 * Har raqam yonida band va belgi: NORMA — matnda aniq; TALQIN — matnni ilovaga moslab oʻqish (egasi tasdiqlaydi).
 *
 * Mustaqil modul: prices.js / app.js ga bogʻlanmagan (marshrut keyin alohida PR bilan ulanadi).
 */

/** BHM, soʻm — 2026-yil 1-sentabrdan. Hisob kunidagi qiymat qoʻllanadi (8-band) — chaqiruvchi oʻzgartira oladi. */
export const BHM_DEFAULT = 440000;
/** KIS — ijtimoiy soliq koeffitsiyenti. Qoʻllanmada raqam berilmagan: 12 % ijtimoiy soliq → 1,12 (TALQIN). */
export const KIS_DEFAULT = 1.12;
/** QQS — 10-band: hisoblangan narxga qoʻshiladi. */
export const QQS_DEFAULT = 0.12;

/* Ab jadvallari: [yuqori chegara (shu jumladan), Ab]. Chegaradan past qiymati yoʻq qatorlar — min. */
export const TABLES = Object.freeze({
  // 16-band, 1-qator: shahar (shaharcha) hududini batafsil rejalashtirish loyihasi va master reja, ga
  brl: { ref: '16-band, 1', unit: 'ga', rows: [[30, 633], [50, 778], [100, 1115], [250, 1636], [500, 2441], [Infinity, 2921]] },
  // 16-band, 2-qator: shahar hududlarini rejalashtirish tarhlari (BRL tarkibida), ming kishi
  shaharTarhi: { ref: '16-band, 2', unit: 'ming kishi', rows: [[100, 621], [250, 823], [500, 1307], [Infinity, 1582]] },
  // 16-band, 3-qator: qishloq, ovul, mahalla hududlarini batafsil rejalashtirish, ga (20 ga dan boshlanadi)
  qishloqBrl: { ref: '16-band, 3', unit: 'ga', min: 20, rows: [[30, 343], [50, 505], [100, 727], [150, 1136], [300, 1176], [Infinity, 1350]] },
  // 13-band, 2-qator: aholi punktining bosh rejasi (bir bosqichli), ming kishi
  boshReja: { ref: '13-band, 2', unit: 'ming kishi', rows: [[1, 368], [2, 389], [5, 465], [10, 600], [25, 895], [50, 1284], [100, 2137], [250, 3223], [500, 4805], [750, 5523], [1000, 6647], [Infinity, 7158]] },
  // 13-band, 4-qator: qishloq, ovul, mahalla hududlarini shaharsozlik jihatidan rivojlantirish sxemalari, ming ga
  qishloqSxema: { ref: '13-band, 4', unit: 'ming ga', rows: [[4, 591], [10, 792], [20, 1037], [Infinity, 1149]] },
  // 13-band, 6-qator: sanoat hududi / maxsus iqtisodiy zona rejalashtirish loyihasi, ga
  sanoat: { ref: '13-band, 6', unit: 'ga', rows: [[50, 800], [100, 1193], [250, 1783], [500, 2186], [Infinity, 2981]] },
  // 22-band: bir marotaba mualliflik nazorati, loyihaviy aholi, kishi
  nazorat: { ref: '22-band', unit: 'kishi', rows: [[20000, 90], [50000, 120], [250000, 250], [500000, 550], [Infinity, 1000]] },
});

/* Tuzatish koeffitsiyentlari. group — bir guruhdan bittasi (hudud maqomi, masshtab). */
const K_BRL = Object.freeze({ // 17-band (BRL va master reja; shahar tarhi, qishloq BRL ham shu bobda)
  tarixiy:      { k: 1.10, ref: '17-band, 1', label: 'Tarixiy-madaniy yodgorlik, kurort-rekreatsion, umumiy jamoat markazi' },
  markaz:       { k: 1.20, ref: '17-band, 2', label: 'Shahar markazi' },
  m1000:        { k: 1.25, ref: '17-band, 3', label: 'Grafika M 1:1000', group: 'masshtab' },
  m500:         { k: 1.50, ref: '17-band, 3', label: 'Grafika M 1:500', group: 'masshtab' },
  iqtisodiy:    { k: 1.25, ref: '17-band, 4', label: 'Master rejada hududning iqtisodiy tahlili' },
  tosiq:        { k: 1.10, ref: '17-band, 5', label: 'Hudud geografik toʻsiq bilan 2+ qismga boʻlingan' },
  toshkent:     { k: 1.30, ref: '17-band, 7', label: 'Toshkent shahri va atrofidagi aholi punktlari', group: 'hudud' },
  viloyat:      { k: 1.20, ref: '17-band, 8', label: 'Viloyat markazi, respublika/viloyatga boʻysunuvchi shahar, kurort', group: 'hudud' },
  tuman:        { k: 1.10, ref: '17-band, 9', label: 'Tuman markazi', group: 'hudud' },
  seysmik:      { k: 1.15, ref: '17-band, 10', label: 'Seysmikligi 8 ball va undan yuqori' },
  qazilma:      { k: 1.15, ref: '17-band, 11', label: 'Sanoat ahamiyatidagi foydali qazilmalar' },
});
const K_BOSH = Object.freeze({ // 14-band (bosh reja va 13-band loyihalari)
  toshkent:     { k: 1.30, ref: '14-band, 1', label: 'Toshkent shahri va atrofidagi aholi punktlari', group: 'hudud' },
  viloyat:      { k: 1.20, ref: '14-band, 2', label: 'Viloyat markazi, respublika/viloyatga boʻysunuvchi shahar, kurort', group: 'hudud' },
  tuman:        { k: 1.10, ref: '14-band, 3', label: 'Tuman markazi', group: 'hudud' },
  seysmik:      { k: 1.15, ref: '14-band, 4', label: 'Seysmikligi 8 ball va undan yuqori' },
  qazilma:      { k: 1.15, ref: '14-band, 5', label: 'Sanoat ahamiyatidagi foydali qazilmalar' },
  qisqartirilgan:{ k: 0.70, ref: '14-band, 6', label: 'Qisqartirilgan hajmdagi bosh reja' },
  korxonalar:   { k: 1.15, ref: '14-band, 7', label: '5 dan ortiq yirik korxona' },
  tosiq:        { k: 1.20, ref: '14-band, 8', label: 'Hudud geografik toʻsiq bilan 2+ qismga boʻlingan' },
  tuzatish10:   { k: 0.80, ref: '14-band, 9', label: 'Bosh rejaga tuzatish (tasdiqdan ≤ 10 yil)', group: 'tuzatish' },
  tuzatish10p:  { k: 0.90, ref: '14-band, 9', label: 'Bosh rejaga tuzatish (tasdiqdan > 10 yil)', group: 'tuzatish' },
});

/** Hujjat turi → jadval va koeffitsiyentlar toʻplami */
const TYPES = Object.freeze({
  brl:          { table: 'brl', k: K_BRL },
  shaharTarhi:  { table: 'shaharTarhi', k: K_BRL },
  qishloqBrl:   { table: 'qishloqBrl', k: K_BRL },
  boshReja:     { table: 'boshReja', k: K_BOSH },
  qishloqSxema: { table: 'qishloqSxema', k: K_BOSH },
  sanoat:       { table: 'sanoat', k: K_BOSH },
});

/* Qoʻshimcha ishlar — asosiy narxga ulush sifatida (koʻpaytuvchi emas). */
export const EXTRAS = Object.freeze({
  ekologiyaBrl:  { share: 0.15, ref: '17-band, 6', label: 'Ekologiya va atrof-muhitga taʼsirni baholash (BRL / master reja)' },
  ekologiyaBosh: { share: 0.25, ref: '14-band, 10', label: 'Ekologiya va atrof-muhitga taʼsirni baholash (bosh reja, sanoat hududi)' },
  '3d-1':        { share: 0.10, ref: '19-band, III', label: '3D-materiallar, I toifa' },
  '3d-2':        { share: 0.15, ref: '19-band, III', label: '3D-materiallar, II toifa' },
  taqdimot:      { share: 0.10, ref: '20-band', label: 'Taqdimot materiallari' },
  internet:      { share: 0.05, ref: '20-band', label: 'Internet va axborot dasturlariga joylashtirish' },
});

export class NormError extends Error {}

/** Jadvaldan Ab: yuqori chegarasi qiymatdan katta yoki teng birinchi qator. */
export function abOf(tableId, value) {
  const t = TABLES[tableId];
  if (!t) throw new NormError(`nomaʼlum jadval: ${tableId}`);
  const v = Number(value);
  if (!Number.isFinite(v) || v <= 0) throw new NormError('koʻrsatkich notoʻgʻri');
  if (t.min != null && v < t.min) return null; // jadvalda yoʻq (masalan qishloq BRL < 20 ga)
  for (const [upTo, ab] of t.rows) if (v <= upTo) return ab;
  return null;
}

/**
 * Koeffitsiyentlarni birlashtirish — 6-band: «faqat kasr qismi qoʻshiladi».
 * Ilova: K = 1 + Σ (kᵢ − 1). Pasaytiruvchi (0,7; 0,8) uchun ayirma manfiy — TALQIN.
 */
export function combineK(list) {
  const sum = list.reduce((s, k) => s + (k - 1), 0);
  return Math.round((1 + sum) * 10000) / 10000;
}

const round = (x) => Math.round(x);

/**
 * Normativ narx.
 * @param {object} p
 * @param {string} p.type  brl | shaharTarhi | qishloqBrl | boshReja | qishloqSxema | sanoat
 * @param {number} p.value koʻrsatkich (jadval birligida: ga, ming kishi, ming ga)
 * @param {string[]} [p.factors] koeffitsiyent kalitlari (masalan ['toshkent','seysmik','m1000'])
 * @param {string[]} [p.extras] EXTRAS kalitlari
 * @param {boolean} [p.twoStage] 9-band: konsepsiya/TIA + asosiy loyiha → ×1,25 (32 % / 68 %)
 * @param {number} [p.bhm] [p.kis] [p.qqs]
 */
export function normativeCost(p = {}) {
  const T = TYPES[p.type];
  if (!T) throw new NormError(`nomaʼlum hujjat turi: ${p.type}`);
  const bhm = p.bhm ?? BHM_DEFAULT, kis = p.kis ?? KIS_DEFAULT, qqs = p.qqs ?? QQS_DEFAULT;
  if (!(bhm > 0) || !(kis >= 1) || !(qqs >= 0)) throw new NormError('BHM / KIS / QQS notoʻgʻri');

  const ab = abOf(T.table, p.value);
  if (ab == null) throw new NormError(`${TABLES[T.table].ref}: ${p.value} ${TABLES[T.table].unit} uchun jadvalda qiymat yoʻq`);

  const used = [], groups = new Set();
  for (const key of [...new Set(p.factors || [])]) {
    const f = T.k[key];
    if (!f) throw new NormError(`bu hujjat turi uchun nomaʼlum koeffitsiyent: ${key}`);
    if (f.group) {
      if (groups.has(f.group)) throw new NormError(`bitta guruhdan bitta koeffitsiyent: ${f.group}`);
      groups.add(f.group);
    }
    used.push({ key, ...f });
  }
  const K = combineK(used.map(f => f.k));
  const stage = p.twoStage ? 1.25 : 1;

  const base = ab * bhm * kis;          // 8-band
  const main = base * K * stage;         // 6, 9-band
  const extras = [...new Set(p.extras || [])].map(key => {
    const e = EXTRAS[key];
    if (!e) throw new NormError(`nomaʼlum qoʻshimcha ish: ${key}`);
    return { key, ...e, uzs: round(main * e.share) };
  });
  const net = main + extras.reduce((s, e) => s + e.uzs, 0);

  return {
    type: p.type, ref: TABLES[T.table].ref, value: Number(p.value), unit: TABLES[T.table].unit,
    ab, bhm, kis, K, factors: used, twoStage: !!p.twoStage,
    stages: p.twoStage ? { konsepsiya: round(main * 0.32), asosiy: round(main * 0.68) } : null,
    base: round(base), main: round(main), extras,
    net: round(net), qqs: round(net * qqs), total: round(net * (1 + qqs)),
    flags: [
      { what: 'KIS', flag: p.kis == null ? 'TALQIN' : 'FOYDALANUVCHI', note: 'Qoʻllanmada raqam yoʻq; 12 % ijtimoiy soliq deb olindi' },
      ...(used.length > 1 ? [{ what: 'K', flag: 'TALQIN', note: '6-band: K = 1 + Σ(kᵢ − 1)' }] : []),
    ],
    excluded: '2-band: topografiya, boshlangʻich maʼlumot, topshiriq, variantlar, ilmiy-tadqiqot, arxeologiya va boshqalar kirmaydi',
    source: 'Qurilish va UJKX vazirining 26.08.2024 dagi 1-son buyrugʻi (AV 3556, 27.09.2024), lex.uz/pdffile/7121901',
  };
}

/** Mualliflik nazorati (22–23-band): Ab × BHM × KIS × marta. */
export function supervisionCost({ population, times = 1, bhm = BHM_DEFAULT, kis = KIS_DEFAULT } = {}) {
  const ab = abOf('nazorat', population);
  const n = Math.max(1, Math.round(Number(times) || 1));
  return { ab, times: n, uzs: round(ab * bhm * kis * n), ref: '22–23-band' };
}

/** Kalkulyator interfeysi uchun: hujjat turlari va ularning koeffitsiyentlari roʻyxati. */
export function catalog() {
  const types = {};
  for (const [id, T] of Object.entries(TYPES)) {
    const t = TABLES[T.table];
    types[id] = { ref: t.ref, unit: t.unit, min: t.min ?? null, factors: Object.fromEntries(Object.entries(T.k).map(([k, f]) => [k, { k: f.k, ref: f.ref, label: f.label, group: f.group ?? null }])) };
  }
  return { types, extras: EXTRAS, bhm: BHM_DEFAULT, kis: KIS_DEFAULT, qqs: QQS_DEFAULT };
}
