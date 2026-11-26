/**
 * Tarjima lugʻatlarini «bitta kalit — bitta qator» koʻrinishiga keltiradi (26.11.2026).
 * Sabab: strings.json (1,3 MB) va lang/*.json bitta qatorda edi — matn qoʻshgan har ikki parallel PR toʻqnashardi.
 * Kalitlar TARTIBI OʻZGARMAYDI: i18n/index.ts da teng uzunlikdagi andozalardan birinchisi tanlanadi (tpls), CANON — oxirgisi.
 *   node scripts/i18n-format.mjs          — fayllarni qayta yozadi
 *   node scripts/i18n-format.mjs --check  — faqat tekshiradi (sinov: tests/unit/i18n_format.test.ts)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const DIR = fileURLToPath(new URL('../src/i18n/', import.meta.url));
export const LANGS = ['es', 'pt', 'fr', 'az', 'uk', 'tr', 'kk'];
export const FILES = ['strings.json', ...LANGS.map(l => `lang/${l}.json`)];

const J = v => JSON.stringify(v);
const body = o => Object.entries(o).map(([k, v]) => `${J(k)}: ${J(v)}`).join(',\n');
/** strings.json: {_meta, strings:{…}} — strings ichida har kalit alohida qatorda; lang/*.json — tekis lugʻat */
export function format(name, obj) {
  if (name === 'strings.json') {
    const rest = Object.entries(obj).filter(([k]) => k !== 'strings').map(([k, v]) => `${J(k)}: ${J(v)}`).join(',\n');
    return `{${rest ? `${rest},\n` : ''}"strings": {\n${body(obj.strings)}\n}\n}\n`;
  }
  return `{\n${body(obj)}\n}\n`;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const check = process.argv.includes('--check'); let bad = 0;
  for (const f of FILES) {
    const p = DIR + f, raw = readFileSync(p, 'utf8'), want = format(f, JSON.parse(raw));
    if (raw === want) continue;
    if (check) { console.error(`✗ ${f} — «bitta kalit — bitta qator» emas`); bad++; } else { writeFileSync(p, want); console.log(`✓ ${f}`); }
  }
  if (bad) { console.error('Tuzatish: cd mr && node scripts/i18n-format.mjs'); process.exit(1); }
}
