/* Normativ narx kalkulyatori — sahifa. Hisob: js/normativ-narx.js (server bilan umumiy).
   Matnlar: oʻzbekcha asl → [inglizcha, ruscha]; boshqa tillar — inglizcha. Sahifa holati URL # da (ulashish uchun). */
import { normativeCost, catalog, NormError } from './normativ-narx.js';

const T = {
  'Normativ narx': ['Standard design fee', 'Нормативная стоимость'],
  'Shaharsozlik hujjatini ishlab chiqish narxi — Qurilish va uy-joy kommunal xoʻjaligi vazirining 2024-yil 26-avgustdagi 1-son buyrugʻi bilan tasdiqlangan uslubiy qoʻllanma boʻyicha. Har bir raqam band raqami bilan.':
    ['The cost of preparing urban planning documents under the methodological guide approved by Order No. 1 of the Minister of Construction and Housing of 26 August 2024. Every figure cites its clause.',
     'Стоимость разработки градостроительной документации по методическому пособию, утверждённому приказом министра строительства и ЖКХ № 1 от 26 августа 2024 года. Каждая цифра — с номером пункта.'],
  'Hujjat turi': ['Document type', 'Вид документации'],
  'Koʻrsatkich': ['Size', 'Показатель'],
  'Hudud maqomi': ['Location status', 'Статус территории'],
  'Masshtab': ['Scale', 'Масштаб'],
  'Bosh rejaga tuzatish': ['Master plan revision', 'Корректировка генплана'],
  'Murakkablashtiruvchi omillar': ['Complicating factors', 'Усложняющие факторы'],
  'Qoʻshimcha ishlar': ['Additional work', 'Дополнительные работы'],
  'Ikki bosqichda: konsepsiya + asosiy loyiha': ['Two stages: concept + main project', 'В две стадии: концепция + основной проект'],
  'Hisob parametrlari': ['Calculation parameters', 'Параметры расчёта'],
  'Hisob parametrlari: BHM, KIS, QQS': ['Calculation parameters: BCA, social tax, VAT', 'Параметры расчёта: БРВ, КСН, НДС'],
  'BHM, soʻm': ['BCA, UZS', 'БРВ, сум'],
  'KIS': ['Social tax k', 'КСН'],
  'QQS, %': ['VAT, %', 'НДС, %'],
  'Jami, QQS bilan': ['Total incl. VAT', 'Итого с НДС'],
  'mln soʻm': ['mln UZS', 'млн сум'],
  'mlrd soʻm': ['bn UZS', 'млрд сум'],
  'soʻm': ['UZS', 'сум'],
  'Asosiy narx': ['Base fee', 'Базовая стоимость'],
  'Koeffitsiyentlar': ['Coefficients', 'Коэффициенты'],
  'Ikki bosqich': ['Two stages', 'Две стадии'],
  'konsepsiya / TIA': ['concept / FS', 'концепция / ТЭО'],
  'asosiy loyiha': ['main project', 'основной проект'],
  'QQSsiz': ['Excl. VAT', 'Без НДС'],
  'QQS': ['VAT', 'НДС'],
  'Nusxa olish': ['Copy', 'Копировать'],
  'Nusxa olindi': ['Copied', 'Скопировано'],
  'Havolani ulashish': ['Share link', 'Поделиться ссылкой'],
  'Havola nusxalandi': ['Link copied', 'Ссылка скопирована'],
  'Archemistry Lab da shu uchastka uchun loyiha shifti': ['Archemistry Lab project cap for this site', 'Потолок проекта Archemistry Lab для этого участка'],
  'tanga': ['coins', 'монет'],
  'Narxlar →': ['Pricing →', 'Цены →'],
  'Hisobga nima kirmaydi?': ['What is not included?', 'Что не входит в расчёт?'],
  'Qoʻllanmaning 2-bandi boʻyicha: topografik syomka, boshlangʻich maʼlumotlarni yigʻish, loyihalash topshirigʻini tayyorlash, variantlar (konsepsiya va TIA dan tashqari), ilmiy-tadqiqot, arxeologiya, tarixiy-arxitektura tayanch rejasi, xavfli geologik jarayonlardan himoya inshootlari, fuqaro muhofazasi tadbirlari. Xizmat safari xarajatlari alohida qoʻshiladi (10-band).':
    ['Per clause 2 of the guide: topographic survey, collecting source data, preparing the design brief, alternative options (except concept and feasibility study), research, archaeology, the historical-architectural base plan, protection structures against hazardous geological processes, civil defence measures. Travel costs are added separately (clause 10).',
     'По пункту 2 пособия: топосъёмка, сбор исходных данных, подготовка задания на проектирование, варианты (кроме концепции и ТЭО), НИР, археология, историко-архитектурный опорный план, защитные сооружения от опасных геологических процессов, мероприятия ГО. Командировочные добавляются отдельно (п. 10).'],
  'Koeffitsiyentlar qanday qoʻshiladi?': ['How are coefficients combined?', 'Как суммируются коэффициенты?'],
  '6-band: bir nechta koeffitsiyent qoʻllanganda faqat kasr qismlari qoʻshiladi. Masalan, Toshkent 1,3, seysmik 1,15 va M 1:1000 1,25 → 1 + 0,30 + 0,15 + 0,25 = 1,70. Pasaytiruvchi koeffitsiyentlar (0,7; 0,8) uchun ayirma manfiy olinadi — bu talqin.':
    ['Clause 6: when several coefficients apply, only their fractional parts are added. E.g. Tashkent 1.3, seismic 1.15 and 1:1000 scale 1.25 → 1 + 0.30 + 0.15 + 0.25 = 1.70. For reducing coefficients (0.7; 0.8) the difference is taken as negative — an interpretation.',
     'Пункт 6: при нескольких коэффициентах складываются только их дробные части. Например, Ташкент 1,3, сейсмика 1,15 и М 1:1000 1,25 → 1 + 0,30 + 0,15 + 0,25 = 1,70. Для понижающих (0,7; 0,8) разность берётся отрицательной — это толкование.'],
  'KIS nima?': ['What is the social tax coefficient?', 'Что такое КСН?'],
  'Formuladagi ijtimoiy soliq koeffitsiyenti. Qoʻllanmada uning qiymati berilmagan; bu yerda 2026-yildagi 12 % ijtimoiy soliq stavkasi boʻyicha 1,12 olingan. Byudjet tashkilotlari uchun stavka 25 %. Qiymatni «Hisob parametrlari»da oʻzgartirish mumkin.':
    ['The social tax coefficient in the formula. The guide does not give its value; 1.12 is used here, based on the 12% social tax rate in 2026. For budget organisations the rate is 25%. You can change it under “Calculation parameters”.',
     'Коэффициент социального налога в формуле. В пособии значение не указано; здесь принято 1,12 по ставке социального налога 12 % в 2026 году. Для бюджетных организаций ставка 25 %. Значение можно изменить в «Параметрах расчёта».'],
  'Manba': ['Source', 'Источник'],
  'Qurilish va UJKX vazirining 26.08.2024 dagi 1-son buyrugʻi, Adliya vazirligida 27.09.2024 da 3556-raqam bilan roʻyxatga olingan.':
    ['Order No. 1 of the Minister of Construction and Housing of 26.08.2024, registered by the Ministry of Justice on 27.09.2024 under No. 3556.',
     'Приказ министра строительства и ЖКХ № 1 от 26.08.2024, зарегистрирован Минюстом 27.09.2024 за № 3556.'],
  'Hisob yordamchi va maʼlumot uchun. Shartnoma narxi tomonlar kelishuvi bilan belgilanadi.':
    ['This calculation is indicative. The contract price is agreed between the parties.', 'Расчёт справочный. Цена договора определяется соглашением сторон.'],
  'TALQIN': ['INTERPRETATION', 'ТОЛКОВАНИЕ'],
  'Qoʻllanmada raqam yoʻq; 12 % ijtimoiy soliq deb olindi': ['Not given in the guide; 12% social tax assumed', 'В пособии нет значения; принят соцналог 12 %'],
  '6-band: K = 1 + Σ(kᵢ − 1)': ['Clause 6: K = 1 + Σ(kᵢ − 1)', 'Пункт 6: K = 1 + Σ(kᵢ − 1)'],
  // turlar
  'Master reja / BRL — shahar, shaharcha': ['Master plan / detailed plan — city, town', 'Мастер-план / ПДП — город, посёлок'],
  'BRL — qishloq, ovul, mahalla': ['Detailed plan — village, mahalla', 'ПДП — село, аул, махалля'],
  'Shahar hududini rejalashtirish tarhi': ['City area planning scheme', 'Схема планировки городской территории'],
  'Aholi punktining bosh rejasi': ['Settlement master plan (genplan)', 'Генеральный план населённого пункта'],
  'Qishloq, mahalla rivojlantirish sxemasi': ['Village / mahalla development scheme', 'Схема развития села, махалли'],
  'Sanoat hududi, maxsus iqtisodiy zona': ['Industrial area, special economic zone', 'Промзона, СЭЗ'],
  // birliklar
  'ga': ['ha', 'га'], 'ming kishi': ['thousand people', 'тыс. чел.'], 'ming ga': ['thousand ha', 'тыс. га'],
  // hudud / masshtab / tuzatish
  'Boshqa': ['Other', 'Прочие'], 'Tuman markazi': ['District centre', 'Райцентр'], 'Viloyat markazi': ['Regional centre', 'Областной центр'], 'Toshkent': ['Tashkent', 'Ташкент'],
  'M 1:2000': ['1:2000', 'М 1:2000'], 'M 1:1000': ['1:1000', 'М 1:1000'], 'M 1:500': ['1:500', 'М 1:500'],
  'Yangi': ['New', 'Новый'], 'Tasdiqdan ≤ 10 yil': ['≤ 10 years since approval', '≤ 10 лет после утверждения'], 'Tasdiqdan > 10 yil': ['> 10 years since approval', '> 10 лет после утверждения'],
  // omillar
  'Tarixiy, kurort yoki jamoat markazi': ['Historic, resort or civic centre', 'Исторический, курортный или общественный центр'],
  'Shahar markazi': ['City centre', 'Центр города'],
  'Iqtisodiy tahlil': ['Economic analysis', 'Экономический анализ'],
  'Geografik toʻsiq bilan boʻlingan': ['Split by a geographic barrier', 'Разделён географическим барьером'],
  'Seysmiklik 8 ball va undan yuqori': ['Seismicity 8+ points', 'Сейсмичность 8 баллов и выше'],
  'Foydali qazilmalar': ['Mineral deposits', 'Полезные ископаемые'],
  'Qisqartirilgan hajm': ['Reduced scope', 'Сокращённый объём'],
  '5 dan ortiq yirik korxona': ['More than 5 large enterprises', 'Более 5 крупных предприятий'],
  // qoʻshimcha ishlar
  'Ekologiya va atrof-muhitga taʼsir': ['Environmental impact assessment', 'Экология и ОВОС'],
  '3D, I toifa': ['3D, category I', '3D, I категория'], '3D, II toifa': ['3D, category II', '3D, II категория'],
  'Taqdimot': ['Presentation', 'Презентация'], 'Internetga joylash': ['Publishing online', 'Размещение в интернете'],
  // xatolar
  'Koʻrsatkichni kiriting': ['Enter the size', 'Введите показатель'],
  'Bu hujjat turi 20 ga dan boshlanadi (16-band, 3-qator)': ['This document type starts at 20 ha (clause 16, row 3)', 'Этот вид начинается с 20 га (п. 16, строка 3)'],
};

const TYPES = [
  { id: 'brl', name: 'Master reja / BRL — shahar, shaharcha', def: 16 },
  { id: 'qishloqBrl', name: 'BRL — qishloq, ovul, mahalla', def: 25 },
  { id: 'shaharTarhi', name: 'Shahar hududini rejalashtirish tarhi', def: 150 },
  { id: 'boshReja', name: 'Aholi punktining bosh rejasi', def: 30 },
  { id: 'qishloqSxema', name: 'Qishloq, mahalla rivojlantirish sxemasi', def: 5 },
  { id: 'sanoat', name: 'Sanoat hududi, maxsus iqtisodiy zona', def: 80 },
];
const HUDUD = [['', 'Boshqa'], ['tuman', 'Tuman markazi'], ['viloyat', 'Viloyat markazi'], ['toshkent', 'Toshkent']];
const MASSHTAB = [['', 'M 1:2000'], ['m1000', 'M 1:1000'], ['m500', 'M 1:500']];
const TUZATISH = [['', 'Yangi'], ['tuzatish10', 'Tasdiqdan ≤ 10 yil'], ['tuzatish10p', 'Tasdiqdan > 10 yil']];
const FACTOR_NAMES = {
  tarixiy: 'Tarixiy, kurort yoki jamoat markazi', markaz: 'Shahar markazi', iqtisodiy: 'Iqtisodiy tahlil',
  tosiq: 'Geografik toʻsiq bilan boʻlingan', seysmik: 'Seysmiklik 8 ball va undan yuqori', qazilma: 'Foydali qazilmalar',
  qisqartirilgan: 'Qisqartirilgan hajm', korxonalar: '5 dan ortiq yirik korxona',
};
const EXTRA_NAMES = {
  ekologiyaBrl: 'Ekologiya va atrof-muhitga taʼsir', ekologiyaBosh: 'Ekologiya va atrof-muhitga taʼsir',
  '3d-1': '3D, I toifa', '3d-2': '3D, II toifa', taqdimot: 'Taqdimot', internet: 'Internetga joylash',
};
const BRL_LIKE = new Set(['brl', 'qishloqBrl', 'shaharTarhi']);

/* Model D loyiha shifti — server/src/prices.js projectCap bilan bir xil (oʻzgarsa, ikkalasi ham). 1 tanga ≈ 2 900 soʻm (100 tangalik toʻplam). */
const projectCap = a => a <= 3 ? 195 : a <= 10 ? 245 : a <= 25 ? 345 : a <= 60 ? 495 : a <= 150 ? 745 : 1000;
const COIN_UZS = 2900;

const CAT = catalog();
const lang = () => document.documentElement.lang || 'uz';
const tr = s => { const l = lang(); if (l === 'uz') return s; const v = T[s]; return v ? v[l === 'ru' ? 1 : 0] : s; };
const loc = () => (lang() === 'en' ? 'en-US' : 'ru-RU');
const fmt = (n, d = 0) => Number(n).toLocaleString(loc(), { minimumFractionDigits: d, maximumFractionDigits: d });
const big = v => v >= 1e9 ? [fmt(v / 1e9, 2), tr('mlrd soʻm')] : [fmt(v / 1e6, 1), tr('mln soʻm')];
const rf = r => { const l = lang(); return l === 'uz' ? r : String(r).replace(/(\d[\d–, ]*)-band/g, l === 'ru' ? 'п. $1' : 'cl. $1').replace(/-qator/g, l === 'ru' ? ' стр.' : ' row'); };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* holat */
const S = { type: 'brl', value: 16, hudud: 'toshkent', masshtab: '', tuzatish: '', f: new Set(), x: new Set(), two: false, bhm: CAT.bhm, kis: CAT.kis, qqs: CAT.qqs * 100 };
function readHash() {
  try {
    const p = new URLSearchParams(location.hash.slice(1));
    if (p.get('t') && TYPES.some(t => t.id === p.get('t'))) S.type = p.get('t');
    if (p.get('v')) S.value = Number(p.get('v'));
    if (p.has('h')) S.hudud = p.get('h');
    if (p.has('m')) S.masshtab = p.get('m');
    if (p.has('u')) S.tuzatish = p.get('u');
    if (p.get('f')) S.f = new Set(p.get('f').split(','));
    if (p.get('x')) S.x = new Set(p.get('x').split(','));
    S.two = p.get('2') === '1';
    if (p.get('bhm')) S.bhm = Number(p.get('bhm'));
    if (p.get('kis')) S.kis = Number(p.get('kis'));
    if (p.get('qqs')) S.qqs = Number(p.get('qqs'));
  } catch (e) { /* buzilgan havola — sukut */ }
}
function writeHash() {
  const p = new URLSearchParams({ t: S.type, v: S.value, h: S.hudud });
  if (S.masshtab) p.set('m', S.masshtab);
  if (S.tuzatish) p.set('u', S.tuzatish);
  if (S.f.size) p.set('f', [...S.f].join(','));
  if (S.x.size) p.set('x', [...S.x].join(','));
  if (S.two) p.set('2', '1');
  if (S.bhm !== CAT.bhm) p.set('bhm', S.bhm);
  if (S.kis !== CAT.kis) p.set('kis', S.kis);
  if (S.qqs !== CAT.qqs * 100) p.set('qqs', S.qqs);
  history.replaceState(null, '', '#' + p.toString());
}

/* tur oʻzgarganda — shu turga tegishli boʻlmagan tanlovlarni tashlash */
function factorsOfType() { return CAT.types[S.type].factors; }
function cleanForType() {
  const F = factorsOfType();
  for (const k of [...S.f]) if (!F[k] || F[k].group) S.f.delete(k);
  if (!F.m1000) S.masshtab = '';
  if (!F.tuzatish10) S.tuzatish = '';
  const ok = BRL_LIKE.has(S.type) ? 'ekologiyaBrl' : 'ekologiyaBosh';
  for (const k of [...S.x]) if (k.startsWith('ekologiya') && k !== ok) { S.x.delete(k); S.x.add(ok); }
}

function compute() {
  const factors = [...S.f];
  if (S.hudud) factors.push(S.hudud);
  if (S.masshtab) factors.push(S.masshtab);
  if (S.tuzatish) factors.push(S.tuzatish);
  return normativeCost({ type: S.type, value: S.value, factors, extras: [...S.x], twoStage: S.two, bhm: S.bhm, kis: S.kis, qqs: S.qqs / 100 });
}

/* ——— chizish ——— */
const $ = s => document.querySelector(s);
const seg = (name, opts, cur) => `<div class="nn-seg${opts.length === 3 && opts.every(([, l]) => tr(l).length <= 10) ? ' n3' : ''}" role="radiogroup">${opts.map(([v, l]) => `<button type="button" role="radio" aria-checked="${v === cur}" class="${v === cur ? 'on' : ''}" data-seg="${name}" data-v="${v}">${esc(tr(l))}</button>`).join('')}</div>`;
const chip = (kind, key, label, k, on) => `<button type="button" class="nn-chip${on ? ' on' : ''}" aria-pressed="${on}" data-${kind}="${key}">${esc(tr(label))}<span class="ck">${k}</span></button>`;
const kStr = k => (k >= 1 ? '×' : '×') + fmt(k, 2).replace(/0$/, '');

function renderForm() {
  const F = factorsOfType();
  const t = CAT.types[S.type];
  const tp = TYPES.find(x => x.id === S.type);
  const fkeys = Object.keys(F).filter(k => !F[k].group);
  const exKeys = Object.keys(CAT.extras).filter(k => !k.startsWith('ekologiya') || k === (BRL_LIKE.has(S.type) ? 'ekologiyaBrl' : 'ekologiyaBosh'));
  $('#form').innerHTML = `
    <div class="f"><div class="lb"><b>${esc(tr('Hujjat turi'))}</b></div>
      <select id="type" aria-label="${esc(tr('Hujjat turi'))}">${TYPES.map(x => `<option value="${x.id}"${x.id === S.type ? ' selected' : ''}>${esc(tr(x.name))}</option>`).join('')}</select></div>
    <div class="f"><div class="lb"><b>${esc(tr('Koʻrsatkich'))}</b><span>${esc(rf(t.ref))}</span></div>
      <label class="num"><input id="val" type="number" inputmode="decimal" min="0" step="any" value="${S.value}" aria-label="${esc(tr('Koʻrsatkich'))}"><span>${esc(tr(t.unit))}</span></label>
      ${t.min ? `<p class="hint">${esc(tr('Bu hujjat turi 20 ga dan boshlanadi (16-band, 3-qator)'))}</p>` : ''}</div>
    <div class="f"><div class="lb"><b>${esc(tr('Hudud maqomi'))}</b><span>${esc(rf(BRL_LIKE.has(S.type) ? '17-band, 7–9' : '14-band, 1–3'))}</span></div>${seg('hudud', HUDUD, S.hudud)}</div>
    ${F.m1000 ? `<div class="f"><div class="lb"><b>${esc(tr('Masshtab'))}</b><span>${esc(rf('17-band, 3'))}</span></div>${seg('masshtab', MASSHTAB, S.masshtab)}</div>` : ''}
    ${F.tuzatish10 ? `<div class="f"><div class="lb"><b>${esc(tr('Bosh rejaga tuzatish'))}</b><span>${esc(rf('14-band, 9'))}</span></div>${seg('tuzatish', TUZATISH, S.tuzatish)}</div>` : ''}
    <div class="f"><div class="lb"><b>${esc(tr('Murakkablashtiruvchi omillar'))}</b><span>${esc(rf(BRL_LIKE.has(S.type) ? '17-band' : '14-band'))}</span></div>
      <div class="nn-chips">${fkeys.map(k => chip('f', k, FACTOR_NAMES[k] || F[k].label, kStr(F[k].k), S.f.has(k))).join('')}</div></div>
    <div class="f"><div class="lb"><b>${esc(tr('Qoʻshimcha ishlar'))}</b><span>${esc(rf('14, 17, 19, 20-band'))}</span></div>
      <div class="nn-chips">${exKeys.map(k => chip('x', k, EXTRA_NAMES[k], '+' + fmt(CAT.extras[k].share * 100) + '%', S.x.has(k))).join('')}
      ${chip('two', '1', 'Ikki bosqichda: konsepsiya + asosiy loyiha', '×1,25', S.two)}</div></div>
    <div class="f"><details class="adv"${(S.bhm !== CAT.bhm || S.kis !== CAT.kis || S.qqs !== CAT.qqs * 100) ? ' open' : ''}><summary>${esc(tr('Hisob parametrlari: BHM, KIS, QQS'))} ▾</summary>
      <div class="params"><label>${esc(tr('BHM, soʻm'))}<input id="bhm" type="number" min="1" step="1000" value="${S.bhm}"></label>
      <label>${esc(tr('KIS'))}<input id="kis" type="number" min="1" step="0.01" value="${S.kis}"></label>
      <label>${esc(tr('QQS, %'))}<input id="qqs" type="number" min="0" step="1" value="${S.qqs}"></label></div></details></div>`;
}

let last = null;
function renderResult() {
  let r = null, err = null;
  try { r = compute(); } catch (e) { err = e instanceof NormError ? e.message : String(e); }
  last = r;
  const box = $('#res');
  if (!r) {
    const t = CAT.types[S.type];
    const msg = !(S.value > 0) ? tr('Koʻrsatkichni kiriting') : (t.min && S.value < t.min) ? tr('Bu hujjat turi 20 ga dan boshlanadi (16-band, 3-qator)') : err;
    box.innerHTML = `<span class="cap">${esc(tr('Jami, QQS bilan'))}</span><div class="big">—</div><div class="err">${esc(msg)}</div>`;
    $('#anchor').innerHTML = '';
    $('#mbar').innerHTML = `<span>${esc(tr('Jami, QQS bilan'))}</span><b>—</b>`;
    return;
  }
  const [bv, bu] = big(r.total);
  const kList = r.factors.map(f => fmt(f.k, 2)).join(' · ');
  const rows = [
    [tr('Asosiy narx'), '8-band', `${fmt(r.ab)} × ${fmt(r.bhm)} × ${fmt(r.kis, 2)}`, r.base],
    ...(r.factors.length ? [[tr('Koeffitsiyentlar'), '6-band', `K = ${fmt(r.K, 2)}`, r.base * (r.K - 1)]] : []),
    ...(r.twoStage ? [[tr('Ikki bosqich'), '9-band', '×1,25', r.main - r.base * r.K]] : []),
    ...r.extras.map(e => [tr(EXTRA_NAMES[e.key]), e.ref, '+' + fmt(e.share * 100) + '%', e.uzs]),
  ];
  box.innerHTML = `
    <span class="cap">${esc(tr('Jami, QQS bilan'))}</span>
    <div class="big">${bv}<small>${esc(bu)}</small></div>
    <div class="exact">${fmt(r.total)} ${esc(tr('soʻm'))}</div>
    <ul class="rows">
      ${rows.map(([k, ref, f, v]) => `<li><span class="k">${esc(k)}<em>${esc(rf(ref))} · ${esc(f)}</em></span><span class="v">${fmt(v)}</span></li>`).join('')}
      ${r.stages ? `<li><span class="k">${esc(tr('konsepsiya / TIA'))} 32 % · ${esc(tr('asosiy loyiha'))} 68 %<em>${esc(rf('9-band'))}</em></span><span class="v">${fmt(r.stages.konsepsiya / 1e6, 1)} / ${fmt(r.stages.asosiy / 1e6, 1)}</span></li>` : ''}
      <li><span class="k">${esc(tr('QQSsiz'))}</span><span class="v">${fmt(r.net)}</span></li>
      <li><span class="k">${esc(tr('QQS'))} ${fmt(S.qqs)} %<em>${esc(rf('10-band'))}</em></span><span class="v">${fmt(r.qqs)}</span></li>
      <li class="tot"><span class="k">${esc(tr('Jami, QQS bilan'))}</span><span class="v">${fmt(r.total)}</span></li>
    </ul>
    <p class="formula">Q = Ab ${fmt(r.ab)} × BHM ${fmt(r.bhm)} × KIS ${fmt(r.kis, 2)}${r.factors.length ? ` × K ${fmt(r.K, 2)}` : ''}${r.twoStage ? ' × 1,25' : ''}${kList ? `<br>K: ${kList}` : ''}</p>
    <div class="flags">${r.flags.filter(f => f.flag === 'TALQIN').map(f => `<div class="flag"><b>${esc(tr('TALQIN'))}</b>${esc(f.what)} — ${esc(tr(f.note))}</div>`).join('')}</div>
    <div class="acts"><button type="button" class="btn" id="copy">${esc(tr('Nusxa olish'))}</button><button type="button" class="btn ghost" id="share">${esc(tr('Havolani ulashish'))}</button></div>`;
  $('#mbar').innerHTML = `<span>${esc(tr('Jami, QQS bilan'))}</span><b>${bv} ${esc(bu)}</b>`;
  $('#anchor').innerHTML = S.type === 'brl'
    ? `${esc(tr('Archemistry Lab da shu uchastka uchun loyiha shifti'))}: <b>${projectCap(S.value)} ${esc(tr('tanga'))}</b> ≈ ${fmt(projectCap(S.value) * COIN_UZS / 1e6, 2)} ${esc(tr('mln soʻm'))}. <a href="narxlar.html">${esc(tr('Narxlar →'))}</a>`
    : '';
}

function summary(r) {
  const tp = TYPES.find(x => x.id === S.type);
  const lines = [
    `${tr('Normativ narx')} — ${tr(tp.name)}, ${fmt(S.value, S.value % 1 ? 1 : 0)} ${tr(CAT.types[S.type].unit)}`,
    `Q = ${fmt(r.ab)} × ${fmt(r.bhm)} × ${fmt(r.kis, 2)}${r.factors.length ? ` × ${fmt(r.K, 2)}` : ''}${r.twoStage ? ' × 1,25' : ''}`,
    ...r.factors.map(f => `  ${f.ref}: ${f.label} — ${fmt(f.k, 2)}`),
    ...r.extras.map(e => `  ${e.ref}: ${e.label} — ${fmt(e.uzs)}`),
    `${tr('QQSsiz')}: ${fmt(r.net)} ${tr('soʻm')}`,
    `${tr('QQS')} ${fmt(S.qqs)} %: ${fmt(r.qqs)} ${tr('soʻm')}`,
    `${tr('Jami, QQS bilan')}: ${fmt(r.total)} ${tr('soʻm')}`,
    `${tr('Manba')}: ${tr('Qurilish va UJKX vazirining 26.08.2024 dagi 1-son buyrugʻi, Adliya vazirligida 27.09.2024 da 3556-raqam bilan roʻyxatga olingan.')} https://lex.uz/pdffile/7121901`,
  ];
  return lines.join('\n');
}

function renderStatic() {
  document.querySelectorAll('[data-k]').forEach(el => { el.textContent = tr(el.getAttribute('data-k')); });
  document.title = tr('Normativ narx') + ' · Archemistry Lab';
}
function renderAll() { renderStatic(); renderForm(); renderResult(); }
function update(form) { writeHash(); if (form) renderForm(); renderResult(); }

/* ——— hodisalar ——— */
document.addEventListener('click', async e => {
  const b = e.target.closest('button'); if (!b || !b.closest('.nn')) return;
  if (b.dataset.seg) { S[b.dataset.seg] = b.dataset.v; update(true); return; }
  if (b.dataset.f) { S.f.has(b.dataset.f) ? S.f.delete(b.dataset.f) : S.f.add(b.dataset.f); update(true); return; }
  if (b.dataset.x) { S.x.has(b.dataset.x) ? S.x.delete(b.dataset.x) : S.x.add(b.dataset.x); update(true); return; }
  if (b.dataset.two) { S.two = !S.two; update(true); return; }
  if (b.id === 'mbar') { $('#res').scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
  if (b.id === 'copy' && last) { try { await navigator.clipboard.writeText(summary(last)); b.textContent = tr('Nusxa olindi'); } catch (er) { /* clipboard yoʻq */ } return; }
  if (b.id === 'share') { try { await navigator.clipboard.writeText(location.href); b.textContent = tr('Havola nusxalandi'); } catch (er) { /* clipboard yoʻq */ } }
});
document.addEventListener('change', e => {
  if (e.target.id === 'type') { S.type = e.target.value; S.value = TYPES.find(x => x.id === S.type).def; cleanForType(); update(true); }
});
document.addEventListener('input', e => {
  const id = e.target.id, v = Number(e.target.value);
  if (id === 'val') { S.value = v; update(false); }
  else if (id === 'bhm' && v > 0) { S.bhm = v; update(false); }
  else if (id === 'kis' && v >= 1) { S.kis = v; update(false); }
  else if (id === 'qqs' && v >= 0) { S.qqs = v; update(false); }
});
/* til almashsa (site.js <html lang> ni oʻzgartiradi) — qayta chizish */
new MutationObserver(renderAll).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });

readHash(); cleanForType(); renderAll();
