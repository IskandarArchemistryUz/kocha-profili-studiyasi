# Sayt — GitHub ichida yigʻib chiqarish (app/ ni commit qilmaslik): holat, 26.11.2026

Maqsad: yigʻilgan `app/` (60 MB, 622 fayl) repoga commit qilinmasin — parallel PR lar `app/assets` da toʻqnashardi. Egasi 26.11 20:46 da «2-ok» dedi.

## 1-qadam — ✅ bajarildi
- PR #788 (`ce01faa`): `.github/workflows/sayt.yml` — `main` ga push / qoʻlda: `mr` da `npm ci && npm run build` → ildizdagi statik fayllar + yangi `app/` → `_site` (tar, istisnolar: `.git .github mr server tools test tests-e2e docs README.md CLAUDE.md node_modules`) → asset tekshiruvi → `actions/deploy-pages@v4`. PR da faqat `build` (workflow fayli oʻzgarganda).
- Birinchi chiqarish muvaffaqiyatli: sayt shu nusxadan chiqmoqda (`server/package.json`, `mr/package.json`, `README.md`, `CLAUDE.md` → 404; sahifalar 200).
- Jonli tekshiruv (Chrome, 9 sahifa: bosh, app/, binokor, kochasoz, joyshunos, yershunos, narxlar, dizaynkod, tarmoq): JS xato 0, 404 yoʻq. Istisno: `app/yershunos/tiles/9/354/*.png` 404 — bu plitkalar repoda umuman yoʻq (avvaldan; sahifa tashqi DEM ga oʻtadi).

## MUHIM: hozir ikki chiqarish poygasi bor
Pages sozlamasi hali «Deploy from a branch» (main). Shuning uchun har push da **ikkita** chiqarish ishlaydi: GitHub ning oʻz `pages-build-deployment` (shoxdan, butun repo) va bizning `sayt.yml`. Qaysi biri oxirida tugasa, sayt oʻshani koʻrsatadi. Hozir ikkalasining sahifalari bir xil (app/ hali commit qilinadi) — zarar yoʻq.
- **Egasi qiladi:** GitHub → repo → Settings → Pages → Build and deployment → Source: **«GitHub Actions»**. Shundan keyin faqat `sayt.yml` chiqaradi. Proksi `/pages` API ni bermaydi — Claude bu sozlamani na koʻra, na oʻzgartira oladi.

## 2-qadam — sozlama oʻzgargandan KEYIN
1. `app/` ni repodan olib tashlash (`git rm -r --cached app`), `.gitignore` ga `/app/` va `/css/fonts/`, `css/ds2.css`? (postbuild chiqaradi — tekshirish kerak, ildiz sahifalar undan foydalanadi).
2. CI (`master-reja.yml`): «app/ eskirgan» va «asset repoda bormi» qadamlari olib tashlanadi; `test` ishi `app/` ni artefakt qilib yuklaydi, e2e 4 oqimi uni yuklab oladi (har oqim qayta yigʻmasin).
3. `mr/tests/unit/binokor_manba.test.ts` — `../app` tekshiruvi olib tashlanadi (faqat `public/`).
4. `CLAUDE.md` 3–4-boʻlimlari: «app/ ni commit qiling» va toʻqnashuvda `app/` ni qayta yigʻish olib tashlanadi; eski shoxlar uchun: rebase da `app/` toʻqnashsa — `git rm -r --cached app`.
5. Ochiq eski PR lar (#749 app/assets ga tegadi) — rebase da `app/` oʻchiriladi.
Sozlama oʻzgarmasdan 2-qadam qilinsa, shoxdan chiqarish app/ siz sayt chiqarib, **sayt buziladi**.
