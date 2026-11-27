# Handoff — keyinga qoldirilgan tuzatishlar (19-11)

Tutorial videolar tugadi va YouTube'ga (Archemistry Urban, Public) joylandi:
- UZ: https://youtu.be/6X1T46XsTcI
- RU: https://youtu.be/67ECTvqk0Dc
- EN: https://youtu.be/0Nt4ttPwT1k

## Repo va ish tartibi
- Repo: github.com/IskandarArchemistryUz/kocha-profili-studiyasi (clone → /home/claude/kocha-profili-studiyasi)
- Branch → PR (`gh api repos/.../pulls --input`) → CI (test, e2e 1–4; kocha_regen e2e flaky — jobni qayta ishga tushirish: `gh api -X POST .../actions/jobs/ID/rerun`) → squash merge (`gh api -X PUT .../pulls/N/merge -f merge_method=squash`).
- `cd mr && npm run build` → app/ ga yozadi. Legacy js/ o'zgarsa tarmoq.html va studio.html dagi `?v=` versiyasini oshirish.
- i18n: src/i18n ichida qo'shish skripti (add_i18n.py) — yangi chatda qayta yozish kerak bo'lishi mumkin.
- Legacy sahifalar (tarmoq.html va b.) lug'ati — js/i18n.js ichidagi `var DICT={en,ru}` (JSON bir qatorda); 7 qo'shimcha til js/i18n/<til>.json, yo'q satr inglizchaga tushadi. i18n.js o'zgarsa barcha *.html dagi `js/i18n.js?v=` ni oshirish (hozir 20261119).
- Tarjimasiz satrlarni topish: repo ildizida `python3 -m http.server`, Playwright + /usr/bin/google-chrome, localStorage kps_lang=en, sahifada `window.kpsT(s)===s` bo'lganlarni yig'ish.
- C board chizmasini tekshirish: vitest ichida `new C({})`, state o'rnatib `renderVals().draw` → SVG → rsvg-convert (to'liq `vitest run` sekin; `tests/unit/kocha* ks_*` yetarli).
- PDF xotirasini o'lchash: `npx vite` (dev) + Playwright, Chrome `--js-flags=--expose-gc --enable-precise-memory-info`, sahifada `import('/src/ui/pdf.ts')` → `svgPdf(sun'iy varaqlar)`, har 300 ms `gc()` dan keyin `performance.memory.usedJSHeapSize`. GC siz o'lchov chalg'itadi.

## Navbat (tartib bo'yicha)
1. ~~Velo yo'lak ulanishi qiyshiq chorrahalarda trotuarni kesib o'tadi~~ — **BAJARILDI (#725)**: ulagich burchak bordyuriga parallel (konsentrik yoy), so'ng o'tish joyiga buriladi. T-chorrahada avtobus bo'lagi davomi yo'q tarmoq tomonga chizilmaydi. Ochiq: o'tmas burchakda o'tish joyi uzoq — qiya velo o'tish joyi (zebra, CF, sim ham o'zgaradi) alohida ish.
2. ~~Tarmoqda tarjima qilinmagan tugmalar~~ — **BAJARILDI (#726)**: 116 kalit EN/RU (dok, maslahatlar, chorraha kartasi, modullar, ShNQ namunaviy kesimlar).
3. ~~Katta albom PDF eksporti~~ — **BAJARILDI (#727)**: sabab — jsPDF xotirasi varaqlar soniga chiziqli (haqiqiy Chrome, Rohat 16 xaritali varaq: 238 → 714 MB). Endi `ui/pdf.ts` varaqlarni ≤ 8 mln belgilik bo'laklarda yasaydi va pdf-lib bilan birlashtiradi: 150 varaq +1026 MB → +124 MB, 66 → 78 s. Kichik albom — avvalgi yo'l. Yunusobod (p_36ae46bf6581) Iskandarning Chrome'ida yo'q — 46 varaqli aynan o'sha albomda qayta sinash ochiq.
4. **Sheet Studio shamol varag'i**: shamol guli deyarli ko'rinmaydi — kontrast/o'lcham.
5. **Albom muqovasi** aksonometriyani ko'rsatyapti — render natijasi (rdLatest) bo'lsa muqovaga renderni qo'yish.

Loyiha sinovi: Yunusobod, p_36ae46bf6581 (owner akkaunt).
