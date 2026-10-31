/**
 * Uch til (uz · en · ru). Manba: claude/i18n-master-reja.json → strings.json (kalit — koddagi asl oʻzbekcha satr,
 * qiymat — [uz, en, ru]; uz boʻsh boʻlsa kalitning oʻzi). ${…} joy egalari oʻzgarmaydi: kalitda ifoda matni
 * (masalan ${s.n}), tarjimada ham xuddi shu matn — qiymatlar shu nom boʻyicha joylashtiriladi.
 *
 *   t`${n}-qadam / 12`          — teg: ifodalar tartibi kalitdagi bilan bir xil deb olinadi
 *   tr('Oldingi')               — oddiy satr
 *   tf('${s.n}-qadam / 12', { 's.n': 3 })  — kalit va qiymatlar nom bilan
 */
import data from './strings.json';

/** 10 til: uz · en · ru — strings.json ichida; qolgan 7 tasi — ./lang/<til>.json (alohida yuklanadi, kalit → tarjima; yoʻq kalit — inglizcha) */
export type Lang = 'uz' | 'en' | 'ru' | 'es' | 'pt' | 'fr' | 'az' | 'uk' | 'tr' | 'kk';
type Ext = Exclude<Lang, 'uz' | 'en' | 'ru'>;
export const LANGS: { id: Lang; name: string; native: string }[] = [
  { id: 'uz', name: 'uz', native: 'Oʻzbekcha' }, { id: 'en', name: 'en', native: 'English' }, { id: 'ru', name: 'ru', native: 'Русский' },
  { id: 'es', name: 'es', native: 'Español' }, { id: 'pt', name: 'pt', native: 'Português (BR)' }, { id: 'fr', name: 'fr', native: 'Français' },
  { id: 'az', name: 'az', native: 'Azərbaycanca' }, { id: 'uk', name: 'uk', native: 'Українська' }, { id: 'tr', name: 'tr', native: 'Türkçe' }, { id: 'kk', name: 'kk', native: 'Қазақша' },
];
const IDS = LANGS.map(l => l.id) as string[];
export const isLang = (v: unknown): v is Lang => typeof v === 'string' && IDS.includes(v);
const KEY = 'mr-lang';
const S = (data as unknown as { strings: Record<string, [string, string, string]> }).strings;
const IDX: Partial<Record<Lang, number>> = { uz: 0, en: 1, ru: 2 };
const LOAD: Record<Ext, () => Promise<{ default: Record<string, string> }>> = {
  es: () => import('./lang/es.json'), pt: () => import('./lang/pt.json'), fr: () => import('./lang/fr.json'), az: () => import('./lang/az.json'),
  uk: () => import('./lang/uk.json'), tr: () => import('./lang/tr.json'), kk: () => import('./lang/kk.json'),
};
const EXT: Partial<Record<Lang, Record<string, string>>> = {};
async function ensure(l: Lang): Promise<void> {
  if (l in IDX || EXT[l]) return;
  try { EXT[l] = (await LOAD[l as Ext]()).default; } catch { EXT[l] = {}; }   // yuklanmasa — inglizcha zaxira
}

let lang: Lang = (() => { try { const v = localStorage.getItem(KEY) ?? localStorage.getItem('kps_lang'); if (isLang(v)) return v; } catch { /* */ } return 'en'; })();   // sukut — inglizcha; foydalanuvchi tanlovi saqlanadi
await ensure(lang);   // yangi tillar: lugʻat sahifa chizilishidan oldin yuklanadi
const subs = new Set<() => void>();

export const getLang = (): Lang => lang;
export function setLang(l: Lang): Promise<void> {
  if (l === lang) return Promise.resolve();
  const go = () => { lang = l; try { localStorage.setItem(KEY, l); localStorage.setItem('kps_lang', l); } catch { /* eski sahifalar (js/i18n.js) ham shu tilda */ } document.documentElement.lang = l; subs.forEach(f => f()); };
  if (l in IDX || EXT[l]) { go(); return Promise.resolve(); }   // uz/en/ru va yuklangan til — darhol (sinxron)
  return ensure(l).then(go);
}
export function onLang(f: () => void): () => void { subs.add(f); return () => subs.delete(f); }

/** ${…} boʻlaklarga ajratish: [matn, ifoda, matn, ifoda, …] */
const PH = /\$\{([^}]*)\}/g;
function raw(key: string): string {
  const v = S[key]; if (!v) return key;
  const i = IDX[lang]; if (i == null) return EXT[lang]?.[key] || v[1] || key;
  const t = v[i]; return lang === 'uz' ? uzTerms(t || key) : t || v[1] || key;   // oʻzbekcha qiymat berilgan boʻlsa ham atamalar lugʻati qoʻllanadi
}

/**
 * Atamalar lugʻati (claude/atamalar-lugat-uz-en-ru.md, 2026-10-17): eski atama → yangi.
 * Oʻzbekcha rejimda har satrga qoʻllanadi (kodda eski soʻz qolgan joylar ham yangi atama bilan chiqadi).
 */
const SFX = '(lar|lari|larining|larini|larida|laridan|lariga|larni|larga|larda|lardan|larning|dagi|ga|da|dan|ni|ning)?';
const cap = (src: string, up: string, lo: string) => (src === src.toUpperCase() ? up : lo);
type Rep = (...a: string[]) => string;
const UZT: [RegExp, string | Rep][] = [
  [/\b([Kk])vartira miksi\b/g, (_m, k) => cap(k, 'X', 'x') + 'onadonlar tarkibi'],
  [/\b([Kk])vartirasi\b/g, (_m, k) => cap(k, 'X', 'x') + 'onadoni'],
  [new RegExp('\\b([Kk])vartira' + SFX + '\\b', 'g'), (_m, k, x) => cap(k, 'X', 'x') + 'onadon' + (x ?? '')],
  [/\b([Kk])vartali\b/g, (_m, k) => cap(k, 'D', 'd') + 'ahasi'],
  [new RegExp('\\b([Kk])vartal(l)?' + SFX + '\\b', 'g'), (_m, k, _l, x) => cap(k, 'D', 'd') + 'aha' + (x ?? '')],
  [/\bTEP\b/g, 'TIK'],
  [/\b([Pp])arsellash(ni|ga|da)?\b/g, (_m, p, x) => cap(p, 'Y', 'y') + 'er uchastkalariga boʻlish' + (x ?? '')],
  [/\b([Pp])arsellar(i)?(ni|ga|da|dan|ning)?\b/g, (_m, p, _i, x) => cap(p, 'Y', 'y') + 'er uchastkalari' + (x ?? '')],
  [/\b([Pp])arsel(ga|ni|da|dan|ning|i)?\b/g, (_m, p, x) => cap(p, 'Y', 'y') + 'er uchastkasi' + (x && x !== 'i' ? x : '')],
  [/\b([Mm])eʼyoriy reyestr(da|ga|ni|i)?\b/g, (_m, m, x) => cap(m, 'M', 'm') + 'eʼyorlar roʻyxati' + (x && x !== 'i' ? x : '')],
  [/\b([Rr])eyestr(da|ga|ni|i)?\b/g, (_m, r, x) => cap(r, 'M', 'm') + 'eʼyorlar roʻyxati' + (x && x !== 'i' ? x : '')],
  [/\b([Pp])arkovkasi\b/g, (_m, p) => cap(p, 'A', 'a') + 'vtoturargohi'],
  [new RegExp('\\b([Pp])arkovka' + SFX + '\\b', 'g'), (_m, p, x) => cap(p, 'A', 'a') + 'vtoturargoh' + (x ?? '')],
  [/ \(pipetka\)/g, ''],
  [/\b([Pp])ipetka\b/g, (_m, p) => cap(p, 'U', 'u') + 'slub nusxasi'],
  [/\b([Qq])avat albomi\b/g, (_m, q) => q + 'avat rejalari'],
  [/\bGrafika oynasi/g, 'Varaqlar oynasi'],
  [/\b([Ll])odjiya(lar)?\b/g, (_m, l, x) => cap(l, 'I', 'i') + 'chki balkon' + (x ?? '')],
  [/\b([Nn])aves(lar)?\b/g, (_m, n, x) => cap(n, 'S', 's') + 'oyabon' + (x ?? '')],
  [/\b([Tt])aunhaus(lar)?\b/g, (_m, t) => cap(t, 'B', 'b') + 'loklangan uylar'],
  [/\b([Vv])illalar\b/g, (_m, v) => cap(v, 'H', 'h') + 'ovlili uylar'],
  // atamalar-tozalash.md «A» roʻyxati (2026-10-17 tasdiqlangan; 2026-10-31: «har atama oʻz tilida»)
  [/Koʻcha toʻri generatsiyasi/g, 'Koʻcha toʻrini avtomatik yaratish'],
  [/Seksiyalar generatsiyasi/g, 'Seksiyalarni avtomatik yaratish'],
  [/oxirgi bepul generatsiyasi/g, 'oxirgi bepul avtomatik yaratish'],
  [/(\d|\}) ta generatsiya\b/g, '$1 marta avtomatik yaratish'],
  [/\b([Gg])eneratsiya qil(ing|indi|ingan|insinmi|ish)\b/g, (_m, g, x) => cap(g, 'A', 'a') + 'vtomatik yarat' + ({ ing: 'ing', indi: 'ildi', ingan: 'ilgan', insinmi: 'ilsinmi', ish: 'ish' } as Record<string, string>)[x]],
  [/\b([Gg])eneratsiya(da|dan)\b/g, (_m, g, x) => cap(g, 'A', 'a') + 'vtomatik yaratish' + x],
  [/\bshundan generatsiya\b/g, 'shundan avtomatik'],
  [/\b([Gg])eneratsiya\b/g, (_m, g) => cap(g, 'A', 'a') + 'vtomatik yaratish'],
  [/\b([Gg])enerator\b/g, (_m, g) => cap(g, 'A', 'a') + 'vtomat'],
  [/\b([Kk])ontekst keshga yozilmadi/g, (_m, k) => cap(k, 'A', 'a') + 'trof saqlanmadi'],
  [/shaharsozlik konteksti/g, 'shaharsozlik muhiti'],
  [/\b([Kk])onteksti?\b/g, (_m, k) => cap(k, 'A', 'a') + 'trof'],
  [/\bkeshdagi\b/g, 'saqlangan'], [/\bKeshdan…/g, 'Saqlangan nusxadan…'],
  [/\btaktil plitka\b/g, 'taktil qoplama'],
  [/\bOpenFreeMap plitkalari(dan)?/g, (_m, x) => 'OpenFreeMap xarita boʻlaklari' + (x ?? '')],
  [/\bplitkalar(i)?\b/g, (_m, x) => 'xarita boʻlaklar' + (x ?? '')], [/(\d|\}) plitka…/g, '$1 boʻlak…'],
  [/\bOfis plitalari\b/g, 'Ofis bloklari'], [/\bkorpus (\d)/g, 'bino chuqurligi $1'], [/\bchuqur korpus\b/g, 'chuqur bino'], [/\b([Kk])orpus\b/g, (_m, k) => cap(k, 'B', 'b') + 'ino'],
  [/^Lenta( \(gorizontal\))?$/g, (_m, x) => 'Tasmasimon' + (x ?? '')], [/\blentada\b/g, 'tasmada'],
  [/\bRitm (\d)/g, 'Takror $1'], [/\britm,/g, 'takror,'], [/\bFasad ritmi\b/g, 'Fasad takrori'],
  [/^Gradient$/g, 'Oʻzgaruvchan'], [/\bgradient\./g, 'oʻzgaruvchan.'],
  [/\b([Ll])amellar\b/g, (_m, l) => cap(l, 'T', 't') + 'ik plastinkalar'],
  [/\(yarus\)/g, '(qator)'], [/\bavenyu\b/g, 'keng koʻcha'], [/^Mikrorayon$/g, 'Mavze'],
  [/\b([Pp])olosa(si|sini|sida)?\b/g, (_m, p, x) => cap(p, 'T', 't') + 'asma' + (x ?? '')],
  [/\bvelo trek\b/g, 'velo yoʻlak'], [/\bdublyorlar\b/g, 'yon yoʻllar'],
  [/\b([Zz])onalash\b/g, (_m, z) => z + 'onalashtirish'], [/\b([Ff])igure-ground\b/g, (_m, f) => cap(f, 'F', 'f') + 'igura-fon'],
  [/^Taroq \(finger-plan\)$/g, 'Taroqsimon'], [/^Hovlili \(atrium\)$/g, 'Ichki hovlili'], [/^Kompakt blok$/g, 'Ixcham blok'],
  [/\bGuruh yacheykalari\b/g, 'Guruh xonalari'], [/\balohida yacheyka\b/g, 'alohida guruh xonasi'],
  [/\bUMN \(FAR\)/g, 'UMN'],
  [/\b([Gg])enplan(da)?\b/g, (_m, g, x) => cap(g, 'B', 'b') + 'osh reja' + (x ?? '')],
  [/^Akso$/g, 'Aksonometriya'], [/^Persp$/g, 'Perspektiva'],
  [/^Grafika$/g, 'Varaqlar'], [/^Grafika: /g, 'Varaqlar: '], [/\bGrafika (muharriri|oynasini)/g, 'Varaqlar $1'],
  [/^Stilistik$/g, 'Sxematik'], [/^Funksional$/g, 'Funksiya ranglari'], [/\bSkrining:/g, 'Dastlabki baho:'],
  [/\(optimistik sxema;/g, '(eng yaxshi holat sxemasi;'], [/\(optimistik\)/g, '(eng yaxshi holat)'],
  // bino ichidagi koridor → yoʻlak (ShNQ 2.08.01-19, 2022 oʻzg.: «dahliz»; shaharsozlikdagi «yashil / avtobus / koʻcha koridori» oʻzgarmaydi)
  [/(?<!(?:Yashil|Avtobus|koʻcha|Koʻcha) )\b([Kk])oridor(lar|ga|dan|ida|idan|iga|i)?\b/g, (_m, k, x) => cap(k, 'Y', 'y') + ({ '': 'oʻlak', lar: 'oʻlaklar', ga: 'oʻlakka', dan: 'oʻlakdan', ida: 'oʻlagida', idan: 'oʻlagidan', iga: 'oʻlagiga', i: 'oʻlagi' } as Record<string, string>)[x ?? '']],
  [/Koʻcha studiyasidan/g, 'Koʻchasozdan'], [/\bkolyaska\b/g, 'aravacha'],
  [/\b([Tt])oretslar\b/g, (_m, t) => cap(t, 'B', 'b') + 'ino uchlari'], [/\b([Tt])orets\b/g, (_m, t) => cap(t, 'B', 'b') + 'ino uchi'],
];
const UZC = new Map<string, string>();
export function uzTerms(s: string): string {
  const c = UZC.get(s); if (c != null) return c;
  // ${…} ifodalari (joy egalari) oʻzgarmaydi — faqat matn qismlari
  const conv = (t: string) => { let o2 = t; for (const [re, to] of UZT) o2 = o2.replace(re, to as Rep); return o2; };
  const o = s.includes('${') ? s.split(/(\$\{[^}]*\})/).map((p, i) => (i % 2 ? p : conv(p))).join('') : conv(s);
  if (UZC.size > 5000) UZC.clear();
  UZC.set(s, o); return o;
}

/**
 * Oddiy satr. Aniq kalit topilmasa — tayyor (ifodalari qoʻyilgan) satr uchun:
 *  1) ${…} li kalitlar namunasi bilan solishtiriladi (ifoda oʻrnidagi qiymat ham tarjima qilinadi);
 *  2) « · » va «; » boʻyicha boʻlaklarga ajratib, har boʻlak alohida;
 *  3) son + birlik (ga, m², qavat, oʻrin, kishi/ga …) — glossariy boʻyicha.
 * Natija keshlanadi (til boʻyicha).
 */
/** Xizmat nomlari har tilda (sayt: js/site.js dagi BRAND bilan bir xil). Oʻzbekchada — asl nom. */
const BR = (ks: string, jy: string, ch: string): [RegExp, string][] => [[/Koʻchasoz\p{L}*/gu, ks], [/Joyshunos\p{L}*/gu, jy], [/Chizmadon\p{L}*/gu, ch]];
export const BRAND: Record<Exclude<Lang, 'uz'>, [RegExp, string][]> = {
  en: BR('Street Designer', 'Site Explorer', 'Sheet Studio'),
  ru: BR('Конструктор улиц', 'Анализ места', 'Студия листов'),
  es: BR('Diseñador de calles', 'Explorador del sitio', 'Estudio de láminas'),
  pt: BR('Designer de Ruas', 'Explorador do Terreno', 'Estúdio de Pranchas'),
  fr: BR('Concepteur de rues', 'Explorateur de site', 'Studio de planches'),
  az: BR('Küçə konstruktoru', 'Ərazi təhlili', 'Vərəq studiyası'),
  uk: BR('Конструктор вулиць', 'Аналіз місця', 'Студія аркушів'),
  tr: BR('Sokak Tasarımcısı', 'Alan Analizi', 'Pafta Stüdyosu'),
  kk: BR('Көше конструкторы', 'Орын талдауы', 'Парақтар студиясы'),
};
export function brand(s: string, l: Lang = lang): string {
  if (l === 'uz' || !s) return s;
  for (const [re, to] of BRAND[l]) s = s.replace(re, to);
  return s;
}

/** Tarjimasiz satrlarni yigʻish (faqat tekshiruv uchun): localStorage «i18n-miss» = 1 boʻlsa — window.__i18nMiss */
const MISS: Set<string> | null = (() => { try { if (localStorage.getItem('i18n-miss') === '1') { const s = new Set<string>(); (window as unknown as { __i18nMiss: Set<string> }).__i18nMiss = s; return s; } } catch { /* */ } return null; })();

export function tr(key: string): string {
  const O = OUTS[lang]; if (O.has(key)) return key;   // allaqachon tarjima qilingan matn — qayta tarjima qilinmaydi
  const r = brand(S[key] ? raw(key) : dyn(key, 0));
  if (MISS && r === key && lang !== 'uz' && /\p{L}{3}/u.test(key)) MISS.add(key);
  if (r !== key) { if (O.size > 20000) O.clear(); O.add(r); }
  return r;
}
const OUTS = Object.fromEntries(IDS.map(l => [l, new Set<string>()])) as Record<Lang, Set<string>>;

interface Tpl { re: RegExp; key: string; names: string[] }
let TPL: Tpl[] | null = null;
const esc = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function tpls(): Tpl[] {
  if (TPL) return TPL;
  TPL = [];
  for (const k of Object.keys(S)) {
    if (!k.includes('${')) continue;
    const lit = k.replace(PH, ''); if ((lit.match(/\p{L}/gu) ?? []).length < 3) continue;
    const names: string[] = []; let re = '^';
    let last = 0; k.replace(PH, (m, e: string, off: number) => { re += esc(k.slice(last, off)) + '(.+?)'; names.push(e); last = off + m.length; return m; });
    re += esc(k.slice(last)) + '$';
    try { TPL.push({ re: new RegExp(re, 's'), key: k, names }); } catch { /* */ }
  }
  TPL.sort((a, b) => b.key.replace(PH, '').length - a.key.replace(PH, '').length);
  return TPL;
}
/** Oʻzbekcha lotin nomi → kirill (rus matnida joy nomlari: tuman, shahar) — taxminiy, rasmiy ruscha shakl boʻlmasa */
export function cyr(s: string): string {
  const M: [RegExp, string][] = [[/[Oo][ʻ'‘’]/g, 'о'], [/[Gg][ʻ'‘’]/g, 'г'], [/[Ss]h/g, 'ш'], [/[Cc]h/g, 'ч'], [/[Yy]o/g, 'ё'], [/[Yy]u/g, 'ю'], [/[Yy]a/g, 'я'], [/[Yy]e/g, 'е'], [/ng/g, 'нг'], [/[ʼ’]/g, 'ъ']];
  let o = s; for (const [re, to] of M) o = o.replace(re, m => (m[0] === m[0].toUpperCase() ? to.toUpperCase().slice(0, 1) + to.slice(1) : to));
  const L: Record<string, string> = { a: 'а', b: 'б', d: 'д', e: 'е', f: 'ф', g: 'г', h: 'х', i: 'и', j: 'дж', k: 'к', l: 'л', m: 'м', n: 'н', o: 'о', p: 'п', q: 'к', r: 'р', s: 'с', t: 'т', u: 'у', v: 'в', x: 'х', y: 'й', z: 'з', c: 'ц', w: 'в' };
  return o.replace(/[A-Za-z]/g, ch => { const r = L[ch.toLowerCase()] ?? ch; return ch === ch.toUpperCase() ? r.charAt(0).toUpperCase() + r.slice(1) : r; });
}
type U = [RegExp, string | ((...a: string[]) => string)][];
/** Yangi tillar uchun birlik va hujjat qismlari (claude/atamalar-lugat + l10n GLOSSARY) */
interface UO { district: (a: string) => string; city: (a: string) => string; region: (a: string) => string; total: string; lane1: string; lanes: string; ha: string; pph: string; ppl: string; perP: string; perS: string; th: string; mln: string; fl: string; places: string; spaces: string; nfl: string; nbld: string; step: string; cl: string; mos: string; sec: string; apt: string; tbl: string; note: string; art: string; part: string; annex: string; cyr?: boolean }
function units(o: UO): U {
  const r = (t: string) => t;   // $1 — son
  const u: U = [
    [/^(.+) tumani( \(total\))?$/, (_m, a, b) => o.district(o.cyr ? cyr(a) : a) + (b ? ' ' + o.total : '')],
    [/^(.+) shahri( \(total\))?$/, (_m, a, b) => o.city(o.cyr ? cyr(a) : a) + (b ? ' ' + o.total : '')],
    [/^(.+) viloyati( \(total\))?$/, (_m, a, b) => o.region(a) + (b ? ' ' + o.total : '')],
    [/ ?\(total\)$/, ' ' + o.total],
    [/\b1 qator\b/g, o.lane1], [/(\d) qator\b/g, r(o.lanes)],
    [/kishi\/ga\b/g, o.pph], [/(\d) ga\b/g, '$1 ' + o.ha], [/\/ga\b/g, '/' + o.ha], [/\/kishi\b/g, o.perP], [/\/joy\b/g, o.perS],
    [/(\d) ming\b/g, o.th], [/(\d) mln\b/g, o.mln], [/(\d) kishi\b/g, o.ppl], [/(\d) qavat\b/g, o.fl], [/(\d) oʻrin\b/g, o.places], [/(\d) joy\b/g, o.spaces], [/(\d) ta\b/g, '$1'],
    [/(\d)-qavat\b/g, o.nfl], [/(\d)-bino\b/g, o.nbld], [/(\d)-qadam/g, o.step],
    [/(\d[\d.,–\s]*?)-bandlar\b/g, o.cl], [/(\d[\d.,–]*)-band\b/g, o.cl], [/(\d) mos\b/g, o.mos], [/(\d) seksiya\b/g, o.sec], [/(\d) xonadon\b/g, o.apt], [/(\d) kvartira\b/g, o.apt],
    [/(\d[\d.,–\s]*?)-jadvallar\b/g, o.tbl], [/(\d+)-jadval\b/g, o.tbl], [/(\d+)-izoh\b/g, o.note], [/(\d+)-modda\b/g, o.art], [/(\d+)-qism\b/g, o.part], [/(\d+)-ilova\b/g, o.annex],
  ];
  if (o.cyr) u.push([/(\d) m²/g, '$1 м²'], [/m²\//g, 'м²/'], [/(\d) km\b/g, '$1 км'], [/(\d) m\b/g, '$1 м'], [/ShNQ\b/g, 'ШНК'], [/SanQvaN\b/g, 'СанПиН'], [/QMQ\b/g, 'КМК'], [/OʻRQ-/g, 'ЗРУ-']);
  else u.push([/OʻRQ-/g, 'ZRU-']);
  return u;
}
const UNITS: Record<Exclude<Lang, 'uz'>, U> = {
  en: [[/^(.+) tumani( \(total\))?$/, '$1 district$2'], [/\b1 qator\b/g, '1 lane'], [/(\d) qator\b/g, '$1 lanes'], [/^(.+) shahri( \(total\))?$/, '$1 city$2'], [/^(.+) viloyati( \(total\))?$/, '$1 region$2'], [/\(total\)$/, '(total)'], [/(\d) ga\b/g, '$1 ha'], [/\/ga\b/g, '/ha'], [/\/kishi\b/g, '/person'], [/\/joy\b/g, '/space'], [/(\d) ming\b/g, '$1 thousand'], [/(\d) mln\b/g, '$1 mln'], [/kishi\/ga\b/g, 'people/ha'], [/(\d) kishi\b/g, '$1 people'], [/(\d) qavat\b/g, '$1 fl.'], [/(\d) oʻrin\b/g, '$1 places'], [/(\d) joy\b/g, '$1 spaces'], [/(\d) ta\b/g, '$1'], [/(\d)-qavat\b/g, 'floor $1'], [/(\d)-bino\b/g, 'building $1'], [/(\d)-qadam/g, 'step $1'], [/(\d[\d.,–\s]*?)-bandlar\b/g, 'cl. $1'], [/(\d[\d.,–]*)-band\b/g, 'cl. $1'], [/(\d) mos\b/g, '$1 pass'], [/(\d) seksiya\b/g, '$1 sections'], [/(\d) xonadon\b/g, '$1 apartments'], [/(\d) kvartira\b/g, '$1 apartments'], [/(\d[\d.,–\s]*?)-jadvallar\b/g, 'tables $1'], [/(\d+)-jadval\b/g, 'table $1'], [/(\d+)-izoh\b/g, 'note $1'], [/(\d+)-modda\b/g, 'art. $1'], [/(\d+)-qism\b/g, 'part $1'], [/(\d+)-ilova\b/g, 'annex $1'], [/OʻRQ-/g, 'ZRU-']],
  ru: [[/^(.+) tumani( \(total\))?$/, (_m, a, b) => `${cyr(a)} район${b ?? ''}`], [/^(.+) shahri( \(total\))?$/, (_m, a, b) => `г. ${cyr(a)}${b ?? ''}`], [/(\d) qator\b/g, '$1 пол.'], [/^(.+) viloyati( \(total\))?$/, '$1 область$2'], [/ \(total\)$/, ' (всего)'], [/(\d) m²/g, '$1 м²'], [/\/ga\b/g, '/га'], [/m²\//g, 'м²/'], [/\/kishi\b/g, '/чел.'], [/\/joy\b/g, '/место'], [/(\d) ming\b/g, '$1 тыс.'], [/(\d) mln\b/g, '$1 млн'], [/(\d) km\b/g, '$1 км'], [/(\d) m\b/g, '$1 м'], [/(\d) ga\b/g, '$1 га'], [/kishi\/ga\b/g, 'чел./га'], [/(\d) kishi\b/g, '$1 чел.'], [/(\d) qavat\b/g, '$1 эт.'], [/(\d) oʻrin\b/g, '$1 мест'], [/(\d) joy\b/g, '$1 мест'], [/(\d) ta\b/g, '$1'], [/(\d)-qavat\b/g, '$1-й этаж'], [/(\d)-bino\b/g, 'здание $1'], [/(\d)-qadam/g, 'шаг $1'], [/(\d[\d.,–\s]*?)-bandlar\b/g, 'п. $1'], [/(\d[\d.,–]*)-band\b/g, 'п. $1'], [/(\d) mos\b/g, '$1 соотв.'], [/(\d) seksiya\b/g, '$1 секций'], [/(\d) xonadon\b/g, '$1 кв.'], [/(\d) kvartira\b/g, '$1 кв.'], [/(\d[\d.,–\s]*?)-jadvallar\b/g, 'табл. $1'], [/(\d+)-jadval\b/g, 'табл. $1'], [/(\d+)-izoh\b/g, 'прим. $1'], [/(\d+)-modda\b/g, 'ст. $1'], [/(\d+)-qism\b/g, 'ч. $1'], [/(\d+)-ilova\b/g, 'прил. $1'], [/ShNQ\b/g, 'ШНК'], [/SanQvaN\b/g, 'СанПиН'], [/QMQ\b/g, 'КМК'], [/OʻRQ-/g, 'ЗРУ-']],
  es: units({ district: a => `distrito ${a}`, city: a => `ciudad de ${a}`, region: a => `región de ${a}`, total: '(total)', lane1: '1 carril', lanes: '$1 carriles', ha: 'ha', pph: 'hab./ha', ppl: '$1 hab.', perP: '/hab.', perS: '/plaza', th: '$1 mil', mln: '$1 M', fl: '$1 pl.', places: '$1 plazas', spaces: '$1 plazas', nfl: 'planta $1', nbld: 'edificio $1', step: 'paso $1', cl: 'apdo. $1', mos: '$1 cumplen', sec: '$1 secciones', apt: '$1 viviendas', tbl: 'tabla $1', note: 'nota $1', art: 'art. $1', part: 'parte $1', annex: 'anexo $1' }),
  pt: units({ district: a => `distrito ${a}`, city: a => `cidade de ${a}`, region: a => `região de ${a}`, total: '(total)', lane1: '1 faixa', lanes: '$1 faixas', ha: 'ha', pph: 'hab./ha', ppl: '$1 hab.', perP: '/hab.', perS: '/vaga', th: '$1 mil', mln: '$1 mi', fl: '$1 pav.', places: '$1 vagas', spaces: '$1 vagas', nfl: 'pavimento $1', nbld: 'edifício $1', step: 'etapa $1', cl: 'item $1', mos: '$1 conformes', sec: '$1 blocos', apt: '$1 unidades', tbl: 'tabela $1', note: 'nota $1', art: 'art. $1', part: 'parte $1', annex: 'anexo $1' }),
  fr: units({ district: a => `district de ${a}`, city: a => `ville de ${a}`, region: a => `région de ${a}`, total: '(total)', lane1: '1 voie', lanes: '$1 voies', ha: 'ha', pph: 'hab./ha', ppl: '$1 hab.', perP: '/hab.', perS: '/place', th: '$1 k', mln: '$1 M', fl: '$1 niv.', places: '$1 places', spaces: '$1 places', nfl: 'niveau $1', nbld: 'bâtiment $1', step: 'étape $1', cl: 'point $1', mos: '$1 conformes', sec: '$1 cages', apt: '$1 logements', tbl: 'tableau $1', note: 'note $1', art: 'art. $1', part: 'partie $1', annex: 'annexe $1' }),
  az: units({ district: a => `${a} rayonu`, city: a => `${a} şəhəri`, region: a => `${a} vilayəti`, total: '(cəmi)', lane1: '1 zolaq', lanes: '$1 zolaq', ha: 'ha', pph: 'nəf./ha', ppl: '$1 nəfər', perP: '/nəfər', perS: '/yer', th: '$1 min', mln: '$1 mln', fl: '$1 mərt.', places: '$1 yer', spaces: '$1 yer', nfl: 'mərtəbə $1', nbld: 'bina $1', step: 'addım $1', cl: 'bənd $1', mos: '$1 uyğun', sec: '$1 seksiya', apt: '$1 mənzil', tbl: 'cədvəl $1', note: 'qeyd $1', art: 'maddə $1', part: 'hissə $1', annex: 'əlavə $1' }),
  uk: units({ district: a => `${a} район`, city: a => `м. ${a}`, region: a => `${a} область`, total: '(усього)', lane1: '1 смуга', lanes: '$1 смуг', ha: 'га', pph: 'осіб/га', ppl: '$1 осіб', perP: '/особу', perS: '/місце', th: '$1 тис.', mln: '$1 млн', fl: '$1 пов.', places: '$1 місць', spaces: '$1 місць', nfl: 'поверх $1', nbld: 'будівля $1', step: 'крок $1', cl: 'п. $1', mos: '$1 відп.', sec: '$1 секцій', apt: '$1 кв.', tbl: 'табл. $1', note: 'прим. $1', art: 'ст. $1', part: 'ч. $1', annex: 'дод. $1', cyr: true }),
  tr: units({ district: a => `${a} ilçesi`, city: a => `${a} şehri`, region: a => `${a} vilayeti`, total: '(toplam)', lane1: '1 şerit', lanes: '$1 şerit', ha: 'ha', pph: 'kişi/ha', ppl: '$1 kişi', perP: '/kişi', perS: '/yer', th: '$1 bin', mln: '$1 mn', fl: '$1 kat', places: '$1 kişilik', spaces: '$1 yer', nfl: '$1. kat', nbld: 'bina $1', step: 'adım $1', cl: 'md. $1', mos: '$1 uygun', sec: '$1 blok', apt: '$1 daire', tbl: 'tablo $1', note: 'not $1', art: 'madde $1', part: 'kısım $1', annex: 'ek $1' }),
  kk: units({ district: a => `${a} ауданы`, city: a => `${a} қаласы`, region: a => `${a} облысы`, total: '(барлығы)', lane1: '1 жолақ', lanes: '$1 жолақ', ha: 'га', pph: 'адам/га', ppl: '$1 адам', perP: '/адам', perS: '/орын', th: '$1 мың', mln: '$1 млн', fl: '$1 қабат', places: '$1 орын', spaces: '$1 орын', nfl: '$1-қабат', nbld: '$1-ғимарат', step: '$1-қадам', cl: '$1-тармақ', mos: '$1 сәйкес', sec: '$1 секция', apt: '$1 пәтер', tbl: '$1-кесте', note: '$1-ескертпе', art: '$1-бап', part: '$1-бөлім', annex: '$1-қосымша', cyr: true }),
};

const CACHE = Object.fromEntries(IDS.map(l => [l, new Map<string, string>()])) as Record<Lang, Map<string, string>>;
function dyn(s: string, depth: number): string {
  if (!s || depth > 3 || !/\p{L}/u.test(s)) return s;
  const C = CACHE[lang]; const c = C.get(s); if (c != null) return c;
  let out: string | null = null;
  const t0 = s.trim();
  if (t0 !== s && S[t0]) out = s.replace(t0, raw(t0));
  // boshidagi tire yoki nuqta belgisi («— Koʻp qavatli turar joy»)
  if (out == null) { const lp = /^([—–·•-]\s+)(.+)$/s.exec(s); if (lp) { const r0 = S[lp[2]] ? raw(lp[2]) : dyn(lp[2], depth + 1); if (r0 !== lp[2]) out = lp[1] + r0; } }
  // boshidagi «+ » yoki oxiridagi « ·», «:» («+ Butalar», «Reja ·», « Bosh arxitektor:»)
  if (out == null) { const ap = /^(\s*\+\s+|\s+)?(.*?\p{L}.*?)(\s*[·:;,]\s*|\s+)?$/su.exec(s); if (ap && (ap[1] || ap[3])) { const r0 = S[ap[2]] ? raw(ap[2]) : dyn(ap[2], depth + 1); if (r0 !== ap[2]) out = (ap[1] || '') + r0 + (ap[3] || ''); } }
  // ‘ ' ` → ʻ va ortiqcha boʻshliq («Farg‘ona  viloyati»)
  if (out == null) { const n2 = s.replace(/(\p{L})[‘'`’](\p{L})/gu, (_m, x, y) => x + (/[gGoO]/.test(x) ? 'ʻ' : 'ʼ') + y).replace(/ {2,}/g, ' '); if (n2 !== s) { const r0 = S[n2] ? raw(n2) : dyn(n2, depth + 1); if (r0 !== n2) out = r0; } }
  if (out == null) for (const tp of tpls()) {
    const m = tp.re.exec(s); if (!m) continue;
    out = raw(tp.key).replace(PH, (_m, e: string) => { const i = tp.names.indexOf(e); if (i < 0) return `\${${e}}`; const v = m[i + 1]; return S[v] ? raw(v) : dyn(v, depth + 1); });
    break;
  }
  if (out == null) { const pm = /^(.+?)(\s*\([^()]*\))$/s.exec(s); if (pm) { const m0 = S[pm[1]] ? raw(pm[1]) : dyn(pm[1], depth + 1), inr = pm[2].trim().slice(1, -1), i0 = S[inr] ? raw(inr) : dyn(inr, depth + 1); if (m0 !== pm[1] || i0 !== inr) out = `${m0}${pm[2].startsWith(' ') ? ' ' : ''}(${i0})`; } }
  // oxiridagi son va birlik («Daraxt ↔ bino devori ≥ 5,0», «Tezkor 1», «Elektr kabeli 6–20 kV») — boshi tarjima qilinadi
  if (out == null) { const nm = /^(.*?\p{L}[^\d]*?)(\s*[≥≤<>=≈~]?\s*[-–]?\d[\d\s.,–×x-]*\s*(?:m²|m|km|%|kV|ga|kishi|qavat)?\.?)$/u.exec(s); if (nm && nm[1].trim() !== s) { const h0 = nm[1].trimEnd(), hs = nm[1].slice(h0.length), r0 = S[h0] ? raw(h0) : dyn(h0, depth + 1); if (r0 !== h0) out = r0 + hs + nm[2]; } }
  if (out == null) for (const sep of ['\n', ' · ', '; ', ' — ', ': ', ', ', ' / ', ' → ', ' ↔ ', ' ≥ ', ' ≤ ', '–', ' + ']) {
    if (!s.includes(sep)) continue;
    const parts = s.split(sep); const tp = parts.map(p => (S[p] ? raw(p) : dyn(p, depth + 1)));
    if (tp.some((x, i) => x !== parts[i])) { out = tp.join(sep); break; }
  }
  const none = out == null; if (none) out = s;
  let o: string = out as string;
  if (lang !== 'uz') for (const [re, to] of UNITS[lang]) o = o.replace(re, to as string);
  else o = uzTerms(o);
  if (none && o === s && MISS && depth > 0 && lang !== 'uz' && /\p{L}{3}/u.test(s)) MISS.add(s);   // tekshiruv: boʻlak ham tarjimasiz
  out = o;
  if (lang === 'en') out = out.replace(/(\d),(\d{1,2})(?!\d)/g, '$1.$2');
  if (C.size > 5000) C.clear();
  C.set(s, out); return out;
}

/** Kalit + nomlangan qiymatlar: kalitdagi ${ifoda} → qiymat */
export function tf(key: string, vals: Record<string, unknown>): string {
  return mark(raw(key).replace(PH, (_m, e: string) => (e in vals ? val(vals[e]) : `\${${e}}`)));
}
/** Joy egasidagi qiymat: matn boʻlsa — u ham tarjima qilinadi (funksiya nomi, holat va h.k.) */
const val = (v: unknown) => (typeof v === 'string' ? tr(v) : String(v));
const mark = (r: string) => { const O = OUTS[lang]; if (O.size > 20000) O.clear(); O.add(r); return r; };

/** Teg: t`Qavat ${n}` — kalit sifatida ${…} larni tartib bilan topadi */
export function t(strings: TemplateStringsArray, ...vals: unknown[]): string {
  const canon = strings.raw.join('\u0000');
  const key = CANON.get(canon);
  if (!key) return strings.raw.map((s, i) => s + (i < vals.length ? String(vals[i]) : '')).join('');
  // kalitdagi ifodalar tartibi → qiymatlar; tarjimada nom boʻyicha
  const names: string[] = []; key.replace(PH, (_m, e: string) => { names.push(e); return ''; });
  const byName: Record<string, unknown> = {}; names.forEach((n, i) => { byName[n] = vals[i]; });
  return mark(raw(key).replace(PH, (_m, e: string) => (e in byName ? val(byName[e]) : `\${${e}}`)));
}
/** ${…} oʻrniga \0 qoʻyilgan kalit → asl kalit (teg uchun) */
const CANON = new Map<string, string>();
for (const k of Object.keys(S)) if (k.includes('${')) CANON.set(k.replace(PH, '\u0000'), k);

if (typeof document !== 'undefined') document.documentElement.lang = lang;

/** SVG/HTML satridagi matn tugunlarini tarjima qilish (chizma ichidagi yozuvlar): >matn< → >tr(matn)< */
export function trSvg(svg: string): string {
  if (lang === 'uz' && !UZ_OVR) return svg;
  return svg.replace(/>([^<>]*\p{L}[^<>]*)</gu, (_m, t: string) => '>' + tr(t.trim() === t ? t : t.trim()) + '<');
}
const UZ_OVR = true;   // oʻzbekchada ham atamalar lugʻati qoʻllanadi

/**
 * Avtomatik tarjima qatlami: interfeysdagi har yangi matn tuguni va title / aria-label / placeholder
 * tr() dan oʻtadi. Kodda tr() bilan oʻralmagan maʼlumot nomlari (funksiya, profil, meʼyor qatori, xona nomi…)
 * ham shu yerda tarjima qilinadi; oʻzbekcha rejimda — atamalar lugʻati boʻyicha yangi atama (strings.json uz ustuni).
 * Chetlab oʻtiladi: input/textarea, [contenteditable], [data-notr] ichidagi matn.
 */
const ATTRS = ['title', 'aria-label', 'placeholder'];
const SKIP = 'input,textarea,script,style,[contenteditable],[data-notr]';
function trText(n: Text): void {
  const v = n.nodeValue; if (!v || !/\p{L}/u.test(v)) return;
  const p = n.parentElement; if (!p || p.closest(SKIP)) return;
  const lead = v.match(/^\s*/)![0], tail = v.match(/\s*$/)![0], core = v.slice(lead.length, v.length - tail.length);
  const t = tr(core); if (t !== core) n.nodeValue = lead + t + tail;
}
function trEl(e: Element): void {
  if (e.closest(SKIP) && !(e instanceof HTMLInputElement)) return;
  for (const a of ATTRS) { const v = e.getAttribute(a); if (v && /\p{L}/u.test(v)) { const t = tr(v); if (t !== v) e.setAttribute(a, t); } }
}
function walk(root: Node): void {
  if (root.nodeType === 3) { trText(root as Text); return; }
  if (root.nodeType !== 1 && root.nodeType !== 11) return;
  if (root.nodeType === 1) trEl(root as Element);
  const w = document.createTreeWalker(root, 5 /* ELEMENT | TEXT */);
  for (let n = w.nextNode(); n; n = w.nextNode()) { if (n.nodeType === 3) trText(n as Text); else trEl(n as Element); }
}
let obs: MutationObserver | null = null;
export function autoTranslate(root: HTMLElement = document.body): void {
  if (obs) return;
  const active = () => lang !== 'uz' || UZ_OVR;
  if (active()) walk(root);
  obs = new MutationObserver(ms => {
    if (!active()) return;
    for (const m of ms) {
      if (m.type === 'childList') m.addedNodes.forEach(walk);
      else if (m.type === 'characterData') trText(m.target as Text);
      else if (m.type === 'attributes' && m.target.nodeType === 1) trEl(m.target as Element);
    }
  });
  subs.add(() => { if (active()) walk(root); });
  obs.observe(root, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
}
