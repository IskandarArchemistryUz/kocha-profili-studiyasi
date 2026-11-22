// 22.11.2026 (audit 1.3): ildiz sahifalar (index, narxlar, oferta…) uchun css/ds2.css.
// Manba mr/src/ui/ds2.css dagi `@import '@fontsource/...'` qatorlari brauzerda hal boʻlmaydi (404) — shu yerda
// @font-face qoidalari bilan almashtiriladi, woff2 fayllari css/fonts/ ga nusxalanadi.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const src = readFileSync(new URL('../src/ui/ds2.css', import.meta.url), 'utf8');
const outCss = new URL('../../css/ds2.css', import.meta.url);
const fontsDir = new URL('../../css/fonts/', import.meta.url);
mkdirSync(fontsDir, { recursive: true });

const out = src.replace(/^@import '(@fontsource\/[^']+\.css)';\s*$/gm, (_m, spec) => {
  const file = require.resolve(spec);
  const css = readFileSync(file, 'utf8');
  return css.replace(/src:\s*url\(\.\/files\/([^)]+\.woff2)\)[^;]*;/g, (_s, name) => {
    copyFileSync(join(dirname(file), 'files', name), new URL(name, fontsDir));
    return `src: url(fonts/${name}) format('woff2');`;
  }).replace(/\/\*[^*]*\*\/\s*/g, '').trim();
});
if (/@import '@fontsource/.test(out)) throw new Error('ds2-root: @fontsource import qoldi');
writeFileSync(outCss, out);
