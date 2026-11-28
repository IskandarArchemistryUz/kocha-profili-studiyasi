# Archemistry Lab — parallel ish qoidalari

Bu repoda bir vaqtning oʻzida bir nechta Claude chati ishlaydi (har biri oʻz xizmatida). Bu fayl ular bir-birining ishini buzmasligi uchun. Egasi: Iskandar. Javob tili — egasi yozgan til (oʻzbekcha yoki ruscha).

## 1. Boshlashdan oldin (har safar)
```bash
git fetch --depth 50 origin main
R=repos/IskandarArchemistryUz/kocha-profili-studiyasi
for n in $(gh api "$R/pulls?state=open" --jq '.[].number'); do echo "#$n $(gh api $R/pulls/$n --jq .title)"; gh api "$R/pulls/$n/files?per_page=100" --jq '.[].filename' | sed 's/^/   /'; done
```
- Ochiq PR siz tegmoqchi boʻlgan faylni oʻzgartirayotgan boʻlsa — oʻsha fayllarga tegmang, egasiga ayting.
- Oʻz xizmatingizning holat hujjatini oʻqing (`claude/<xizmat>-holat.md`; hali yoʻq boʻlsa — eng yangi `claude/<xizmat>-…-holat-<kun>-<oy>.md`). Ish tugaganda uni yangilang — 8-boʻlimga qarang.

## 2. Kim nimaga egalik qiladi
| Xizmat | Fayllar |
|---|---|
| Master reja | `mr/src/core`, `mr/src/norms`, `mr/src/scene`, `mr/src/context`, `mr/src/ui` (umumiy UI dan tashqari) |
| Koʻchasoz | `mr/src/kochasoz`, `js/ks-*`, `js/kssim-*`, `tarmoq.html`, `kocha.html` |
| Joyshunos | `mr/src/joyshunos` |
| Bogʻshunos | `mr/src/bogshunos` |
| Render | `mr/src/render` |
| Chizmadon | `mr/src/chizmadon`, `mr/public/chizmadon` |
| Transport | `mr/src/transport` |
| Yershunos | `mr/public/yershunos` |
| Dizayn-kod | `dizaynkod*.html`, `js/dk-*` |
| Binokor | `mr/public/binokor*` |
| Server | `server/` |

**Umumiy fayllar — eng koʻp toʻqnashadi, faqat kerak boʻlsa va kam tegining:** `mr/src/i18n/*`, `mr/src/ui/style.css`, `mr/src/ui/ds2.css`, `css/ds2.css`, `mr/src/storage/*`, `mr/src/core/projctx.ts`, `mr/src/main.ts`, `js/i18n.js`, `js/home-i18n.js`, `index.html`, `narxlar*.html`, `.github/workflows/*`. `app/` — yigʻilgan natija, qoʻlda tahrirlanmaydi.

## 3. Ish tartibi
- `main` ga toʻgʻridan-toʻgʻri push yoʻq: shox → PR → CI → squash-merge. Bitta PR — bitta ish, bitta xizmat.
- `gh` GraphQL ishlamaydi — faqat REST: PR `gh api $R/pulls -f title=… -f head=… -f base=main -F body=@fayl`; birlashtirish `gh api -X PUT $R/pulls/N/merge -f merge_method=squash`; CI holati `gh api $R/commits/$SHA/check-runs`.
- Birlashtirish faqat: CI toʻliq yashil, `mergeable_state` = `clean`, egasi ishni tasdiqlagan.
- `mr/` oʻzgarsa: `cd mr && npm run build` va `app/` ni ham commit qiling (CI «app/ eskirgan» deb yiqiladi).

## 4. Toʻqnashuv boʻlsa (PR «dirty»)
```bash
git fetch --depth 50 origin main && git rebase origin/main
# lugʻatlar:            node mr/scripts/i18n-merge.mjs
# app/ (yigʻma natija):  git checkout origin/main -- app && (cd mr && npm run build) && git add app
GIT_EDITOR=true git rebase --continue
git push --force-with-lease=<shox>:<eski sha> origin <shox>
```
Boshqa chat oʻzgartirgan faylni «oʻzimniki» deb ustidan yozmang — ikkala tomonni saqlang yoki egasidan soʻrang.

## 5. Tarjima lugʻatlari
- `mr/src/i18n/strings.json` (`[uz, en, ru]`) va `lang/{es,pt,fr,az,uk,tr,kk}.json` — **bitta kalit, bitta qator**.
- Tahrirdan keyin: `cd mr && node scripts/i18n-format.mjs` (aks holda `i18n_format` sinovi yiqiladi).
- Kalitlarni saralamang va tartibini oʻzgartirmang: `i18n/index.ts` teng uzunlikdagi andozalardan birinchisini oladi.

## 6. Beqaror sinovlar
CI yiqilsa, avval qaysi sinov ekanini koʻring. Quyidagilar sizning oʻzgarishingizsiz ham yiqiladi — faqat oʻsha ishni bir marta qayta ishga tushiring (`gh api -X POST $R/actions/jobs/<id>/rerun`):
- e2e 2: `kocha_regen`;
- e2e 4: `sayt.spec.ts` «Yershunos · istalgan hudud» (xarita kutishi);
- Joyshunos e2e — parallel oqimlarda sekinlikdan.

Boshqa xizmatning sinovini oʻzingiz «tuzatmang» — holatini oʻsha xizmat hujjatiga yozing va egasiga ayting.

## 7. Xizmatga xos
- **Binokor:** manba — `mr/public/binokor*` (repo). Artifaktdan qayta yigʻilmaydi (`site_variant.py` ishlatilmasin — ustidan yozib yuboradi). `binokor.html` dagi skriptlar tartibi muhim; `binokor_manba` sinovi buni tekshiradi.

## 8. Loyiha hujjatlari (claude.ai «Archemistry Lab» loyihasi)
Loyiha sigʻimi qatʼiy: ~2 MB matn. Shuning uchun:
- **Bitta xizmat — bitta holat hujjati:** `claude/<xizmat>-holat.md`. Yangilaganda shu faylning ustidan yoziladi (`project_read` → oʻzgartirish → `project_write` xuddi shu yoʻlga). Har kuni yangi sanali fayl ochilmaydi.
- Holat hujjati tarkibi: hozirgi holat (nima saytda, qaysi PR) · **ochiq qarorlar va qilinmaganlar** · navbat · saboqlar. Tugagan ish tafsiloti — PR tavsifida, hujjatda emas.
- Alohida hujjat faqat mustaqil qiymatga ega boʻlsa (tadqiqot, meʼyor tahlili, dizayn qarori). Topshiriq va HANDOFF — ish tugagach ochiq qismi holat hujjatiga koʻchiriladi.
- **Kod loyihaga yuklanmaydi.** Skript, prototip, maʼlumot fayli (`*.py`, `*.js`, `*.ts`, `*.csv`, `*.html`) — repoga PR (`tools/<xizmat>/` yoki xizmat papkasi). Loyiha hujjatida faqat yoʻl.
- **Eski hujjatni oʻchirish:** faqat undagi ochiq qarorlar, raqamlar va manbalar holat hujjatiga yoki repoga koʻchirilganini tekshirgandan keyin va faqat oʻz xizmatingiz hujjatlarini. Kod (`*-src/`) — faqat repoda shu fayl borligi (mazmuni bilan) tekshirilgandan keyin.

## 9. Hech qachon
- Maxfiy qiymatlar (kalit, parol, token, `.env`) — repoga ham, chatga ham.
- Egasi soʻramagan funksiyani olib tashlash.
- Boshqa chat ochgan PR ni yopish, uning shoxini oʻchirish yoki unga push qilish.
