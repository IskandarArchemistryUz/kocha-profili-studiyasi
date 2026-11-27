# Archemistry Lab — sayt, server, toʻlov, kirish: holat (27.10.2026, kechqurun; toʻlov qismi 24.11.2026 yangilandi)

> Arxiv eslatmasi (27.11.2026): repo public boʻlgani uchun «Kassa maʼlumotlari» qatoridagi JShShIR, MFO va h/r qiymatlari olib tashlandi — ular aynan shu koʻrinishda loyiha hujjati `claude/kassa-rekvizitlar.md` da. Qolgan matn oʻzgarmagan.

## Repo va qoidalar
- Repo: IskandarArchemistryUz/kocha-profili-studiyasi. Ilova `mr/` → yigʻiladi `app/` ga (commit qilinadi). Server — `server/`.
- Qoidalar: funksiya tashlab yuborilmaydi (faqat egasi aytsa); UI matni i18n uz/en/ru (`mr/src/i18n/strings.json`); tungi rejim `[data-theme=dark]`; native kontrol yoʻq; har bosqich — alohida PR (skrinshot, 1024 px, tungi rejim); main ga toʻgʻridan-toʻgʻri push yoʻq — branch → PR → CI → squash-merge. Sukut tili — inglizcha.
- `gh` GraphQL ishlamaydi — PR yaratish/merge REST orqali (`gh api repos/.../pulls`, `.../pulls/N/merge`). CI (`test`) ~10–25 daqiqa; Joyshunos va kochatahrir e2e testlari beqaror (CI da ba'zan yiqiladi — `rerun-failed-jobs`). Bir nechta oyna parallel ishlaganda `main` tez siljiydi — PR ni birlashtirishdan oldin `main` bilan qayta birlashtirib, `app/` ni qayta yig'ish kerak boʻladi.
- Server-only PR (`server/`) faqat «Server — testlar» ni ishga tushiradi (tez). Deploy — `server-deploy.yml` (workflow_run yoki qoʻlda `workflow_dispatch`). Deploy baʼzan oʻtkazib yuborilishi mumkin — serverda `sudo -u archemistry git -C /srv/archemistry log --oneline -1` bilan tekshirish.

## Server
- VPS Airnet 46.8.195.239, Ubuntu 24.04. Admin kirish: `ssh ubuntu@46.8.195.239` (faqat kalit, faqat egasining uydagi kompyuteridan; noutbuk kaliti hali qoʻshilmagan). Ilova foydalanuvchisi `archemistry`, papka `/srv/archemistry`, servis `archemistry-api`, oldida nginx.
- Sayt https://archemistry.uz, API https://api.archemistry.uz.
- Maxfiy qiymatlar faqat serverdagi `.env` yoki GitHub Secrets da; chatga yoki repoga hech qachon.
- `.env` da `MAIL_FROM` qoʻshtirnoqsiz (`<...>` bor) — `source .env` xato beradi; DATABASE_URL ni `grep '^DATABASE_URL=' .env | cut -d= -f2-` bilan oling.
- Loglar: `journalctl -u archemistry-api` (Fastify har soʻrovni yozadi), nginx: `/var/log/nginx/*access*.log`.

## Pochta
- Zoho Mail Lite (US), info@archemistry.uz. SMTP smtppro.zoho.com:465, ilova paroli serverda. Ishlaydi.

## Kirish (Google + pochta kodi) — YOQILGAN
- Google Cloud loyiha `archemistry-lab`, OAuth mijozi "archemistry.uz" (Web). Client ID: 697125002456-n8melv5nisud0lmscgf22gm4a38k0lmq.apps.googleusercontent.com (maxfiy emas). Ilova **In production**.
- PR #171 (21.10.2026): `AUTH_REQUIRED=true`; loyihalar sahifasida hisob qatori. Brauzerda oʻchirish: localStorage `kps_auth=0`; egasi rejimi `kps_owner=1`.

## Toʻlov — Multicard / Rahmat — ISHLAYAPTI (27.10.2026 19:44)
- **Birinchi haqiqiy toʻlov muvaffaqiyatli:** Payme orqali 39 000 soʻm, +10 tanga (balans 20), callback 200.
- Telegram guruh «Archemistry Lab x Rahmat»: Maksim Shinkarenko, Daniil. Hujjatlar: https://docs.multicard.uz/
- Prod: **store_id 42398**, `MULTICARD_BASE=https://mesh.multicard.uz`, callback IP 195.158.26.90 (sukut). application_id va secret — egasining pochtasida va serverdagi `.env` da.
- Kassa maʼlumotlari: JShShIR [claude/kassa-rekvizitlar.md], STIR 563413523, MFO [claude/kassa-rekvizitlar.md], h/r [claude/kassa-rekvizitlar.md], MXIK 10305008002000000 (qadoq 1514296), QQS toʻlovchisi emas.
- Shartnoma №AGRFSCL/15093 (23.10.2026), egasi ERI bilan 26.10.2026 20:23 imzolagan. Kassa 27.10 10:57 faollashtirildi.

### 27.10 dagi nosozlik va yechim
- Belgi: toʻlov oʻtadi, darhol bekor boʻladi («Otmena operatsiy karti» / Payme «Отменен»). Sabab: bizning callback 400 qaytargan → Multicard pulni qaytaradi.
- Aniq sabab: **«Doʻkon notoʻgʻri»** — `.env` dagi `MULTICARD_STORE_ID` oxirida koʻrinmas belgi (`\r`, Windows'dan nusxalashda). Invoys `Number()` bilan toʻgʻri ketgan, callback esa satr boʻyicha solishtirilgan.
- Tuzatish: serverda `sed -i 's/\r$//; s/[[:space:]]*$//' .env` + restart; kodda PR #281 (sha1 imzo ham, `data`/form tana, rad sababi logga) va PR #282 (store_id faqat raqamlar boʻyicha, `.env` qiymatlari trim, logda `ourStore`).
- Rad etilgan callback logi: `journalctl -u archemistry-api | grep "multicard callback rad"`.
- Invoyslar `draft` holatida qolishi mumkin (toʻlanmagan) — Multicard `DELETE` bilan annulyatsiya qilishni tavsiya qildi (taklif: 30 daqiqadan keyin avtomatik).

### Visa/Mastercard — ISHLAYAPTI (24.11.2026)
- 12.11 16:10: Visa (Ipak Yoʻli) sinovi «Ошибка привязки карты» (invoys 9b287c95-de89-11f1-b630-00505680eaf6). Support uzoq javob bermadi, 16.11 eslatma tayyorlandi.
- 24.11 14:05 Maksim: «Платежи теперь работают по VISA/MasterCard».
- 24.11 16:25: Visa sinov toʻlovi oʻtdi — 21 000 soʻm, terminal ARCHEMISTRY-2, tranzaksiya 122881795, RRN 632888963577, toʻlov tafsiloti «18» (buyurtma 18 boʻlsa kerak).
- Tekshirish kerak: 18-buyurtma ilovada «toʻlangan» boʻldimi va tanga tushdimi (callback 200); MasterCard alohida sinovi; support chatida bahoni bosib murojaatni yopish.

### Ochiq masalalar (27.10 holatiga; 24.11 da qayta tekshirilmagan)
- **Click** (va «Добавить карту» → Click sahifasi) — «Что-то пошло не так»; Multicard alohida koʻrib chiqmoqda. Uzum ilovasida ham «Оплата временно недоступна» boʻlgan.
- **Visa/Mastercard KYC:** anketa toʻldirilgan edi (`KYC_Archemistry_Lab.docx`; yuridik manzil reyestrdagi — Kichik Xalqa Yoʻli 28, haqiqiy — 1-proezd Shota Rustaveli 8). Komissiya: mahalliy Visa/MC 2,5 %, xalqaro 4 %. MPS uchun ijtimoiy tarmoqlar havolalari soʻralgan. Endi Visa ishlagani — KYC qabul qilinganini koʻrsatadi.
- **Komissiya kim toʻlaydi:** Maksim — sukut boʻyicha «сверху (платит плательщик)»; shartnoma 2.1 — merchantdan ushlanadi. Merchantdan ushlash soʻralgan (javob kutilmoqda).
- **Kassa toifasi:** Payme chekida «общепит» — MCC 5734/7372 ga tuzatish soʻralgan.
- Oy boshida Multicard e-hisob-fakturasini 3 ish kunida imzolash.
- Sinov tangalari (22.10, 10 tanga) — xohlansa balansdan olib tashlash.

### Shartnoma (26.10.2026 koʻrib chiqildi)
- Oferta: https://multicard.uz/offer_acquiring_b2b.html (tahrir 24.09.2026). Pul **3 ish kuni**; refund faqat shu oy ichida; komissiya refundda qaytmaydi (shu kuni boʻlsa — qaytadi); chargeback — merchant javobgar; tariflar bir tomonlama oʻzgarishi mumkin; 15 kun oldin bekor qilish; minimal oborot yoʻq.
- **Majburiyat (9.2.5):** saytda Visa/Mastercard logotiplari va toʻlov tashkiloti haqida maʼlumot (AO «MULTICARD PAYMENT», Toshkent, Yashnobod t., Maxtumquli k. 1, tel. 1865, info@rhmt.uz, MB litsenziyasi №26, 12.05.2021). 9.2.4: manzil oʻzgarsa 3 ish kunida xabar berish.

### Keyingi qadamlar (sayt)
- PR: narxlar sahifasi — «Draft…» olib tashlash; «Buy coins» → `buyDialog`; futerga toʻlov tashkiloti maʼlumoti va Visa/MC belgilari; provayder xatolari uz/en/ru tushunarli xabarga. Narx tuzilmasi — `narx-siyosati-v5.md` (qoralama, yakuniy hujjat faqat Max).
- Toʻlanmagan buyurtmalarni 30 daqiqadan keyin bekor qilish + Multicard `DELETE`.

## Huquqiy
- oferta.html, maxfiylik.html — `tools/huquqiy-sahifalar.py .` bilan generatsiya. Aloqa: info@archemistry.uz. Manzil — reyestrdagi (Kichik Xalqa Yoʻli 28); birdarchada oʻzgarganda yangilash.

## Ochiq ma'lumot va xarita kalitlari (24.10.2026)
- **Server keshi — PR #219**, `POST /data/overpass`, `GET /data/sources`. VPS: 2 yadro, 3,8 GB, 50 GB.
- **Esri ArcGIS — PR #220.** Hisob info@archemistry.uz, Pay-as-you-go oʻchiq; kalit muddati ~24.10.2027 (eslatma 2027-09-24).
- **EPW / TMYx — RUXSAT OLINDI (Dru Crawley, 27.10.2026):** tijoriy foydalanish va boshqa davlatlar mumkin; iqtibos «Lawrie, Linda K, Drury B Crawley. 2026. Development of Global Typical Meteorological Years (TMYx). https://climate.onebuilding.org» — PR #268 bilan ilovada.
- **Overture Maps binolari — PR #227.**

## Kutilayotgan ishlar
- SSH kalit zaxirasi (fleshka), noutbuk uchun alohida SSH kalit, ERI kalitlari zaxirasi, shaxsga doir maʼlumotlar bazasini roʻyxatdan oʻtkazish (OʻRQ-547).
