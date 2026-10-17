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

let lang: Lang = (() => { try { const v = localStorage.getItem(KEY); if (v === 'uz' || v === 'en' || v === 'ru') return v; } catch { /* */ } return 'uz'; })();   // sukut — oʻzbekcha; foydalanuvchi tanlovi saqlanadi
const subs = new Set<() => void>();

export const getLang = (): Lang => lang;
export function setLang(l: Lang): void { if (l === lang) return; lang = l; try { localStorage.setItem(KEY, l); } catch { /* */ } document.documentElement.lang = l; subs.forEach(f => f()); }
export function onLang(f: () => void): () => void { subs.add(f); return () => subs.delete(f); }

/** ${…} boʻlaklarga ajratish: [matn, ifoda, matn, ifoda, …] */
const PH = /\$\{([^}]*)\}/g;
function raw(key: string): string {
  const v = S[key]; if (!v) return key;
  const t = v[IDX[lang]]; return t || (lang === 'uz' ? key : v[1] || key);
}

/** Oddiy satr (joy egasisiz) */
export function tr(key: string): string { return raw(key); }

/** Kalit + nomlangan qiymatlar: kalitdagi ${ifoda} → qiymat */
export function tf(key: string, vals: Record<string, unknown>): string {
  return raw(key).replace(PH, (_m, e: string) => (e in vals ? String(vals[e]) : `\${${e}}`));
}

/** Teg: t`Qavat ${n}` — kalit sifatida ${…} larni tartib bilan topadi */
export function t(strings: TemplateStringsArray, ...vals: unknown[]): string {
  const canon = strings.raw.join('\u0000');
  const key = CANON.get(canon);
  if (!key) return strings.raw.map((s, i) => s + (i < vals.length ? String(vals[i]) : '')).join('');
  // kalitdagi ifodalar tartibi → qiymatlar; tarjimada nom boʻyicha
  const names: string[] = []; key.replace(PH, (_m, e: string) => { names.push(e); return ''; });
  const byName: Record<string, unknown> = {}; names.forEach((n, i) => { byName[n] = vals[i]; });
  return raw(key).replace(PH, (_m, e: string) => (e in byName ? String(byName[e]) : `\${${e}}`));
}
/** ${…} oʻrniga \0 qoʻyilgan kalit → asl kalit (teg uchun) */
const CANON = new Map<string, string>();
for (const k of Object.keys(S)) if (k.includes('${')) CANON.set(k.replace(PH, '\u0000'), k);

document.documentElement.lang = lang;
