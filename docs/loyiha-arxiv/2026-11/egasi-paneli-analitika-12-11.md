# Egasi paneli va foydalanish analitikasi (12–13.11.2026)

## 1-bosqich — SAYTDA (PR #545)
- Kirishda davlat/shahar Cloudflare sarlavhasidan (`CF-IPCountry`, `cf-ipcity`): `sessions.country/city`, `users.country`. IP saqlanmaydi.
- `POST /owner/reveal` — «Pochtalarni koʻrsatish»; `GET /owner/user/:id` — foydalanuvchi kartochkasi; davlat ustuni va jadvali.
- Tekshirish kerak: api.archemistry.uz Cloudflare proxy (toʻq sariq bulut) orqalimi; shahar uchun «Add visitor location headers».

## 2-bosqich — SAYTDA (PR #558, 13.11 01:30)
- `events` jadvali: anonim brauzer ID (localStorage `ax-anon`, cookie emas), kirgan boʻlsa user_id, xizmat (mr/joy/ks/ren), hodisa nomi, kichik props, davlat. IP, loyiha mazmuni, joy, matn — yoʻq. 400 kundan eskisi kuniga tozalanadi.
- `POST /ev` (sendBeacon, text/plain JSON; ≤ 50 hodisa/paket; 120/daq IP; egasi yozilmaydi; javob 204). `GET /owner/usage`.
- Brauzer (`mr/src/core/stats.ts`): mavjud `track()`/`pageview()` GoatCounter bilan birga oʻz serverga; tugma bosilishi `click/<xizmat>/<id yoki data-tip yoki data-ev>`; sahifa ochilishi `pv` (ekran kengligi, dpr, sensor, kelgan sayt domeni, utm_source/medium/campaign, til). «Do Not Track», localhost, avtotestlarda yuborilmaydi. Tugmani hisobdan chiqarish: `data-noev`.
- Panel «Foydalanish»: faol brauzerlar, voronka (ochdi → `mr/step/uchastka` → kirdi → `mr/step/parsel` → birinchi pullik harakat (ledger delta<0)), xizmatlar, qaytish (roʻyxatdan oʻtgan haftasi, 1–4-hafta), eng koʻp harakatlar.
- Maxfiylik siyosati: statistika bandi 10 tilda, tahrir 13.11.2026 (oferta 21.10.2026 qoldi). Diqqat: `tools/huquqiy-sahifalar.py` faqat uz/en/ru va eski skript versiyalari bilan — HTML ni toʻgʻridan-toʻgʻri tahrirlang, generatorni qayta ishga tushirmang.
- Yoʻlakay: `server/test/power.test.js` shamol keshi testi endi keshga tushguncha kutadi (oldin CI da beqaror edi).

## 3-bosqich — SAYTDA (PR #562)
- Xatolar: `err/js`, `err/promise`, `err/webgl-lost`, `err/crash` (taxminiy: sessionStorage `ax-live-<xizmat>` belgisi yopilmay qolsa). Bir sahifada ≤ 10.
- Panel: Qurilma (< 768 / 768–1279 / ≥ 1280 px), Qayerdan kelishdi (birinchi ochilish: UTM manba yoki kelgan sayt, hisobga kirganlar ulushi), UTM kampaniyalar, Xatolar.
- Reels/postlarda havolaga UTM qoʻshing, masalan: `https://archemistry.uz/?utm_source=telegram&utm_campaign=reels-14-11`.

## 4-bosqich — KUTILMOQDA: Microsoft Clarity (heatmap, sessiya yozuvlari)
- Egasidan kerak: clarity.microsoft.com da loyiha ochib, Project ID.
- Qilinadi: skript faqat ishchi saytda, «Do Not Track» va avtotestlarda yoʻq; kiritish maydonlari maskalanadi; EI/Buyuk Britaniya tashrifchilariga rozilik so'rash; maxfiylik siyosatiga Clarity (Microsoft) bandi.

## Huquqiy (egasi oʻzi tasdiqlashi kerak)
- OʻRQ-547 «Shaxsga doir maʼlumotlar toʻgʻrisida», 27¹-modda — OʻRQ-1125 (26.03.2026) bilan yangi tahrirda, 27.03.2026 dan kuchda: Oʻzbekistonda saqlash majburiy — biometrik, genetik maʼlumotlar va telekom operatorlari foydalanuvchilari maʼlumotlari. Boshqalari chet elda — shartlardan biri bilan: teng himoya taʼminlovchi davlat (roʻyxat — Vazirlar Mahkamasi), standart shartnoma shartlari / majburiy korporativ qoidalar yoki tasdiqlangan xalqaro standartlarga rioya.
- Manba: https://lex.uz/uz/docs/-8099215 ; asosiy qonun https://www.lex.uz/docs/-4396419
