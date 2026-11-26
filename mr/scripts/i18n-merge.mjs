/**
 * Tarjima lugʻatlaridagi git toʻqnashuvini kalitma-kalit hal qiladi (26.11.2026).
 * Parallel PR lar odatda lugʻat oxiriga yangi kalit qoʻshadi — git buni «bir joyga ikki qoʻshimcha» deb toʻqnashuv beradi.
 * Rebase yoki merge toʻxtaganda repo ildizidan yoki mr/ dan:  node mr/scripts/i18n-merge.mjs   (yoki: cd mr && node scripts/i18n-merge.mjs)
 * Har kalit 3 tomonlama: bir tomon oʻzgartirgan boʻlsa — oʻsha; ikkalasi har xil oʻzgartirgan boʻlsa — roʻyxatga chiqadi,
 * qiymat «:3» (rebase da — qoʻllanayotgan commit, merge da — qoʻshilayotgan shox) dan olinadi. Tartib: «:2» tartibi, keyin yangi kalitlar.
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { format, FILES } from './i18n-format.mjs';

const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
const git = (...a) => execFileSync('git', a, { cwd: root, encoding: 'utf8', maxBuffer: 1 << 28 });
const stage = (n, f) => { try { return JSON.parse(git('show', `:${n}:${f}`)); } catch { return null; } };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const unmerged = new Set(git('diff', '--name-only', '--diff-filter=U').split('\n').filter(Boolean));

function merge3(base, ours, theirs, clash, f) {
  const out = {}, keys = [...Object.keys(ours), ...Object.keys(theirs).filter(k => !(k in ours))];
  for (const k of keys) {
    const b = base?.[k], o = ours[k], t = theirs[k], inB = base && k in base;
    if (!(k in theirs)) { if (inB && same(o, b)) continue; out[k] = o; continue; }        // ular oʻchirgan / bizda yangi
    if (!(k in ours)) { if (inB && same(t, b)) continue; out[k] = t; continue; }          // biz oʻchirgan / ularda yangi
    if (same(o, t) || same(t, b)) out[k] = o; else if (same(o, b)) out[k] = t; else { out[k] = t; clash.push(`${f}: ${k.slice(0, 80)}`); }
  }
  return out;
}
let n = 0; const clash = [];
for (const f of FILES) {
  const rel = `mr/src/i18n/${f}`; if (!unmerged.has(rel)) continue;
  const b = stage(1, rel), o = stage(2, rel), t = stage(3, rel);
  if (!o || !t) { console.error(`✗ ${rel}: bir tomoni yoʻq — qoʻlda hal qiling`); process.exitCode = 1; continue; }
  const res = f === 'strings.json' ? { ...o, _meta: t._meta ?? o._meta, strings: merge3(b?.strings, o.strings, t.strings, clash, f) } : merge3(b, o, t, clash, f);
  writeFileSync(`${root}/${rel}`, format(f, res)); git('add', rel); n++; console.log(`✓ ${rel}`);
}
if (!n) console.log('Lugʻatlarda toʻqnashuv yoʻq.');
if (clash.length) { console.log(`Ikkala tomon bir kalitni har xil oʻzgartirgan (${clash.length}) — tekshiring:`); clash.forEach(c => console.log('  ' + c)); }
