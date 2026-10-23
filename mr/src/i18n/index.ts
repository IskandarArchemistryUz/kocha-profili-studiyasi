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

export type Lang = 'uz' | 'en' | 'ru';
export const LANGS: { id: Lang; name: string }[] = [{ id: 'uz', name: 'uz' }, { id: 'en', name: 'en' }, { id: 'ru', name: 'ru' }];
const KEY = 'mr-lang';
const S = (data as unknown as { strings: Record<string, [string, string, string]> }).strings;
const IDX: Record<Lang, number> = { uz: 0, en: 1, ru: 2 };

let lang: Lang = (() => { try { const v = localStorage.getItem(KEY) ?? localStorage.getItem('kps_lang'); if (v === 'uz' || v === 'en' || v === 'ru') return v; } catch { /* */ } return 'en'; })();   // sukut — inglizcha; foydalanuvchi tanlovi saqlanadi
const subs = new Set<() => void>();

export const getLang = (): Lang => lang;
export function setLang(l: Lang): void { if (l === lang) return; lang = l; try { localStorage.setItem(KEY, l); localStorage.setItem('kps_lang', l); } catch { /* eski sahifalar (js/i18n.js) ham shu tilda */ } document.documentElement.lang = l; subs.forEach(f => f()); }
export function onLang(f: () => void): () => void { subs.add(f); return () => subs.delete(f); }

/** ${…} boʻlaklarga ajratish: [matn, ifoda, matn, ifoda, …] */
const PH = /\$\{([^}]*)\}/g;
function raw(key: string): string {
  const v = S[key]; if (!v) return key;
  const t = v[IDX[lang]]; return t || (lang === 'uz' ? uzTerms(key) : v[1] || key);
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
];
const UZC = new Map<string, string>();
export function uzTerms(s: string): string {
  const c = UZC.get(s); if (c != null) return c;
  let o = s; for (const [re, to] of UZT) o = o.replace(re, to as Rep);
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
/** Xizmat nomlari inglizcha va ruscha (sayt: js/site.js dagi BRAND bilan bir xil). Oʻzbekchada — asl nom. */
export const BRAND: Record<'en' | 'ru', [RegExp, string][]> = {
  en: [[/Koʻchasoz\p{L}*/gu, 'Street Designer'], [/Joyshunos\p{L}*/gu, 'Site Explorer'], [/Chizmadon\p{L}*/gu, 'Sheet Studio']],
  ru: [[/Koʻchasoz\p{L}*/gu, 'Конструктор улиц'], [/Joyshunos\p{L}*/gu, 'Анализ места'], [/Chizmadon\p{L}*/gu, 'Студия листов']],
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
const OUTS: Record<Lang, Set<string>> = { uz: new Set(), en: new Set(), ru: new Set() };

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
const UNITS: Record<'en' | 'ru', [RegExp, string][]> = {
  en: [[/^(.+) tumani( \(total\))?$/, '$1 district$2'], [/^(.+) shahri( \(total\))?$/, '$1 city$2'], [/^(.+) viloyati( \(total\))?$/, '$1 region$2'], [/\(total\)$/, '(total)'], [/(\d) ga\b/g, '$1 ha'], [/\/ga\b/g, '/ha'], [/\/kishi\b/g, '/person'], [/\/joy\b/g, '/space'], [/(\d) ming\b/g, '$1 thousand'], [/(\d) mln\b/g, '$1 mln'], [/kishi\/ga\b/g, 'people/ha'], [/(\d) kishi\b/g, '$1 people'], [/(\d) qavat\b/g, '$1 fl.'], [/(\d) oʻrin\b/g, '$1 places'], [/(\d) joy\b/g, '$1 spaces'], [/(\d) ta\b/g, '$1'], [/(\d)-qavat\b/g, 'floor $1'], [/(\d)-bino\b/g, 'building $1'], [/(\d)-qadam/g, 'step $1'], [/(\d[\d.,–\s]*?)-bandlar\b/g, 'cl. $1'], [/(\d[\d.,–]*)-band\b/g, 'cl. $1'], [/(\d) mos\b/g, '$1 pass'], [/(\d) seksiya\b/g, '$1 sections'], [/(\d) xonadon\b/g, '$1 apartments'], [/(\d) kvartira\b/g, '$1 apartments'], [/(\d[\d.,–\s]*?)-jadvallar\b/g, 'tables $1'], [/(\d+)-jadval\b/g, 'table $1'], [/(\d+)-izoh\b/g, 'note $1'], [/(\d+)-modda\b/g, 'art. $1'], [/(\d+)-qism\b/g, 'part $1'], [/(\d+)-ilova\b/g, 'annex $1'], [/OʻRQ-/g, 'ZRU-']],
  ru: [[/^(.+) tumani( \(total\))?$/, '$1 район$2'], [/^(.+) shahri( \(total\))?$/, 'г. $1$2'], [/^(.+) viloyati( \(total\))?$/, '$1 область$2'], [/ \(total\)$/, ' (всего)'], [/(\d) m²/g, '$1 м²'], [/\/ga\b/g, '/га'], [/m²\//g, 'м²/'], [/\/kishi\b/g, '/чел.'], [/\/joy\b/g, '/место'], [/(\d) ming\b/g, '$1 тыс.'], [/(\d) mln\b/g, '$1 млн'], [/(\d) km\b/g, '$1 км'], [/(\d) m\b/g, '$1 м'], [/(\d) ga\b/g, '$1 га'], [/kishi\/ga\b/g, 'чел./га'], [/(\d) kishi\b/g, '$1 чел.'], [/(\d) qavat\b/g, '$1 эт.'], [/(\d) oʻrin\b/g, '$1 мест'], [/(\d) joy\b/g, '$1 мест'], [/(\d) ta\b/g, '$1'], [/(\d)-qavat\b/g, '$1-й этаж'], [/(\d)-bino\b/g, 'здание $1'], [/(\d)-qadam/g, 'шаг $1'], [/(\d[\d.,–\s]*?)-bandlar\b/g, 'п. $1'], [/(\d[\d.,–]*)-band\b/g, 'п. $1'], [/(\d) mos\b/g, '$1 соотв.'], [/(\d) seksiya\b/g, '$1 секций'], [/(\d) xonadon\b/g, '$1 кв.'], [/(\d) kvartira\b/g, '$1 кв.'], [/(\d[\d.,–\s]*?)-jadvallar\b/g, 'табл. $1'], [/(\d+)-jadval\b/g, 'табл. $1'], [/(\d+)-izoh\b/g, 'прим. $1'], [/(\d+)-modda\b/g, 'ст. $1'], [/(\d+)-qism\b/g, 'ч. $1'], [/(\d+)-ilova\b/g, 'прил. $1'], [/ShNQ\b/g, 'ШНК'], [/SanQvaN\b/g, 'СанПиН'], [/QMQ\b/g, 'КМК'], [/OʻRQ-/g, 'ЗРУ-']],
};
const CACHE: Record<Lang, Map<string, string>> = { uz: new Map(), en: new Map(), ru: new Map() };
function dyn(s: string, depth: number): string {
  if (!s || depth > 3 || !/\p{L}/u.test(s)) return s;
  const C = CACHE[lang]; const c = C.get(s); if (c != null) return c;
  let out: string | null = null;
  const t0 = s.trim();
  if (t0 !== s && S[t0]) out = s.replace(t0, raw(t0));
  // boshidagi tire yoki nuqta belgisi («— Koʻp qavatli turar joy»)
  if (out == null) { const lp = /^([—–·•-]\s+)(.+)$/s.exec(s); if (lp) { const r0 = S[lp[2]] ? raw(lp[2]) : dyn(lp[2], depth + 1); if (r0 !== lp[2]) out = lp[1] + r0; } }
  if (out == null) for (const tp of tpls()) {
    const m = tp.re.exec(s); if (!m) continue;
    out = raw(tp.key).replace(PH, (_m, e: string) => { const i = tp.names.indexOf(e); if (i < 0) return `\${${e}}`; const v = m[i + 1]; return S[v] ? raw(v) : dyn(v, depth + 1); });
    break;
  }
  if (out == null) { const pm = /^(.+?)(\s*\([^()]*\))$/s.exec(s); if (pm) { const m0 = S[pm[1]] ? raw(pm[1]) : dyn(pm[1], depth + 1), inr = pm[2].trim().slice(1, -1), i0 = S[inr] ? raw(inr) : dyn(inr, depth + 1); if (m0 !== pm[1] || i0 !== inr) out = `${m0}${pm[2].startsWith(' ') ? ' ' : ''}(${i0})`; } }
  if (out == null) for (const sep of ['\n', ' · ', '; ', ' — ', ': ', ', ', ' / ', ' → ', '–', ' + ']) {
    if (!s.includes(sep)) continue;
    const parts = s.split(sep); const tp = parts.map(p => (S[p] ? raw(p) : dyn(p, depth + 1)));
    if (tp.some((x, i) => x !== parts[i])) { out = tp.join(sep); break; }
  }
  if (out == null) out = s;
  if (lang !== 'uz') for (const [re, to] of UNITS[lang]) out = out.replace(re, to);
  else out = uzTerms(out);
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
