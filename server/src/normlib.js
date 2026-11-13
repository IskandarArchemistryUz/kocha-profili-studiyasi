/* Meʼyor band matnlari kutubxonasi (agent «Maslahatchi» — get_norm_clause).
   Maʼlumot: data/norms.json (tools/normlib/build_norms.py — loyiha hujjatlari claude/normalar-txt dan, soʻzma-soʻz).
   Matn oʻzgartirilmaydi; faqat qidiriladi. Kutubxonada yoʻq band — found: false (model iqtibos keltirmaydi). */
import { readFileSync } from 'node:fs';

const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const toSup = (d) => String(d).split('').map((c) => SUP[+c]).join('');
const norm = (s) => String(s ?? '').toLowerCase().replace(/[\s.\-–ʻʼ'`]+/g, '');
export const MAX_TEXT = 8000;

let LIB = null;
export function loadLib(file = new URL('./data/norms.json', import.meta.url)) {
  if (!LIB) LIB = JSON.parse(readFileSync(file, 'utf8')).docs;
  return LIB;
}

/** «ShNQ 2.07.01-23; SanQvaN 0103-25» → birinchi mos hujjat */
export function findDoc(doc, lib = loadLib()) {
  const q = norm(doc);
  if (!q) return null;
  return lib.find((d) => q.includes(norm(d.doc)) || norm(d.doc).includes(q) || q.includes(norm(d.id))) ?? null;
}

/** «86», «86-band», «651¹», «651^1», «5-jadval», «jadval 5», «3-ilova» → { kind, key } */
export function parseClause(c) {
  const s = String(c ?? '').trim().toLowerCase();
  const md = s.match(/(\d+)\s*-?\s*(modda|модда|article)\b/);
  if (md) return { kind: 'clause', key: `${md[1]}-modda`, sup: '' };
  // «1-ilova, 50-band» — band ustun (ilova ichidagi band)
  const b = s.match(/(\d+)\s*(?:\^\s*)?([⁰¹²³⁴⁵⁶⁷⁸⁹]+|)\s*-?\s*band/);
  if (b) return { kind: 'clause', key: b[1], sup: b[2] || '' };
  let m = s.match(/(\d+)\s*-?\s*(jadval|jadvali|table)\b/) || s.match(/\b(?:jadval|table)\s*(\d+)/);
  if (m) return { kind: 'table', key: m[1] };
  m = s.match(/(\d+)\s*-?\s*(ilova|илова|annex)\b/) || s.match(/\b(?:ilova|annex)\s*(\d+)/);
  if (m) return { kind: 'annex', key: m[1] };
  m = s.match(/(\d+)\s*(?:\^|\.(?=\d)|\()?\s*([⁰¹²³⁴⁵⁶⁷⁸⁹]+|\d{1,2})?\)?/);
  if (!m) return null;
  const sup = m[2] ? (/[⁰-⁹¹²³]/.test(m[2]) ? m[2] : toSup(m[2])) : '';
  return { kind: 'clause', key: m[1], sup };
}

export function lookup(doc, clause, lib = loadLib()) {
  const d = findDoc(doc, lib);
  if (!d) return { found: false, reason: 'doc_not_in_library', library: lib.map((x) => x.doc) };
  const p = parseClause(clause);
  const meta = { doc: d.doc, title: d.title, edition: d.edition, source: d.source, coverage: d.coverage };
  if (!p) return { found: false, reason: 'bad_clause', ...meta };
  const cap = (t) => (t.length > MAX_TEXT ? t.slice(0, MAX_TEXT) + ' …' : t);
  if (p.kind === 'annex') {
    const t = d.annexes?.[p.key];
    return t ? { found: true, ...meta, clause: `${p.key}-ilova`, text: cap(t) } : { found: false, reason: 'not_in_library', ...meta };
  }
  if (p.kind === 'table') {
    const k = d.tables?.[p.key], c = k && d.clauses[k];
    return c ? { found: true, ...meta, clause: `${p.key}-jadval (${k}-band)`, text: cap(c.text), amend: c.amend ?? [] } : { found: false, reason: 'not_in_library', ...meta };
  }
  // «6511» kabi yozuv: avval aynan, keyin oxirgi raqam(lar)ni yuqori indeks deb sinab koʻramiz
  const tries = p.sup ? [p.key + p.sup] : [p.key, ...[1, 2].filter((n) => p.key.length > n).map((n) => p.key.slice(0, -n) + toSup(p.key.slice(-n)))];
  const k = [...tries, `${p.key}-modda`].find((t) => d.clauses[t]);
  if (!k) return { found: false, reason: 'not_in_library', ...meta };
  const c = d.clauses[k];
  return { found: true, ...meta, clause: k.endsWith('-modda') ? k : `${k}-band`, text: cap(c.text), amend: c.amend ?? [] };
}
