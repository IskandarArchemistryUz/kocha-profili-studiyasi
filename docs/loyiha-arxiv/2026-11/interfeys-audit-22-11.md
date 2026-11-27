# Archemistry Lab — interfeys auditi (22.11.2026)

**Qamrov:** jonli sayt archemistry.uz, repo holati `4cd2511` (#738). 17 sahifa × 10 til kunduzgi rejimda va 3 til (uz, en, ru) tungi rejimda — 221 ta yuklash. Har tilda birinchi ekranlarda ~780 ta interaktiv element topildi. Uz va en tillarida ~770 marta tugma bosildi. Master reja namunasi 11 qadam bo'yicha uz/en/ru tillarida, kunduzgi va tungi rejimda tekshirildi. Lug'atlar statik tekshirildi: Lab ilovasida 7 124 ta kalit, ildiz sahifalarda 4 493 ta kalit. Ekran 1366×768 (ThinkPad).

**Tekshirilmaganlar:**
- Bogʻshunos — sahifasi repoda yo'q.
- Binokor — faqat egasiga ochiladi, shuning uchun localhost nusxasi tekshirildi.
- Tekshiruv kirmagan foydalanuvchi sifatida o'tkazildi.

## Umumiy xulosa

**Yaxshi:**
- Hech qaysi tugma bosilganda JS xatosi chiqmadi (0 ta).
- Haqiqatan javobsiz tugma topilmadi. Shubhali chiqqanlari qayta tekshirildi: ular kechikib ochiladigan oyna yoki fayl tanlash oynasi bo'lib chiqdi.
- Barcha sahifalarda `html lang` to'g'ri.
- Gorizontal scroll yo'q.
- Master reja, Koʻchasoz, Joyshunos, Render, Chizmadon va Transport birinchi ekranlarida 10 tilning hech birida o'zbekcha qoldiq yo'q.

**Muammolar** quyidagilarda:
- chuqurroq panellardagi tarjima qoldiqlari;
- yangi 7 tilda inglizcha chiqayotgan narx matnlari;
- matni sig'maydigan segment tugmalar;
- tungi rejimdagi xarita;
- bitta jiddiy masala: to'lov devorini localStorage orqali o'chirish mumkin.

## 1. Shoshilinch (pul va ishonch)

**1.1. `kps_auth=0` to'lov devorini o'chiradi.** `mr/src/account/config.ts` dagi `authRequired()` localStorage qiymatini production'da ham o'qiydi. Sinovda tasdiqlangan holatlar:
- Transport'da GLB fayli (8 tanga) kirishsiz, toza holda yuklandi.
- `pay.ts` dagi `freeMode()` va `gate()` og'ir hisoblarni hamda 3 ga dan katta uchastka cheklovini ham ochadi (187- va 291-qatorlar).
- 6–11-qadamlar kirishsiz ochildi.

Tavsiya: `kps_auth` va `kps_api` qiymatlarini faqat localhost'da qabul qilish. `binokor-lab.js` dagi hostname tekshiruvi aynan shunday ishlaydi.

**1.2. Narx matnlari 7 yangi tilda inglizcha chiqadi.** `js/home-i18n.js` dagi 373 ta kalitdan 32 tasi es/pt/fr/az/uk/tr/kk lug'atlarida (`js/i18n/*.json`) yo'q. Bular 14.11 dagi narx o'zgarishlaridan keyin qo'shilgan matnlar. Ta'sir:
- `narxlar.html` — 7 qator inglizcha;
- `narxlar-batafsil.html` — ~15 qator;
- `haqida.html` — ~12 qator.

Misollar: "3 heavy calculations a week", "Free on screen. The apartment calculation…", "Any site size; above 3 ha — free through the “Sun and wind” step".

**1.3. Shrift fayllari 404 qaytaradi.** `css/ds2.css` ning boshida 8 ta `@import '@fontsource/golos-text/…'` qatori bor. Ildiz sahifalarning (bosh, narxlar, oferta, maxfiylik, atamalar, dizayn-kod) har bir yuklanishida 8 ta 404 xatosi chiqadi va Golos kirill shrifti yuklanmaydi. Natijada ru/uk/kk sahifalari zaxira shriftda ko'rinadi. Sabab: `postbuild` `ds2.css` ni o'zgarishsiz nusxalaydi, npm yo'llari esa Vite'siz hal bo'lmaydi.

## 2. Tarjima qoldiqlari (servislar bo'yicha)

**Master reja**
- «Bekor qilish» tugmasining title/aria matni: "Undo: Cheklov qoʻshildi (Ctrl+Z)". `core/commands.ts` dagi undo yorliqlari lug'atda yo'q, shuning uchun hamma tillarda o'zbekcha chiqadi.
- `${…}` ifodalar ichidagi o'zbekcha bo'laklar tarjima qilinmaydi (8 ta joy):
  - avtoturargoh izohi: " — 30 m²/joy brutto, taxmin", " — boʻsh hovlining 35 %, 413-band…";
  - "uchastka yoʻq", " · qoʻllangan", " (OSM dan olingan)";
  - " · balkon ×", "kvartira sxemasidan".
- "≥ 150 m² ta" — en'da.
- Namuna loyiha nomi "Namuna: Yangi Tos…" en/ru'da o'zbekcha qolgan va sarlavhada kesilib chiqadi.

**Koʻchasoz**
- Chorraha (beta) paneli deyarli tarjimasiz: `kochasoz/boards/c.ts` dagi ~20 ta matn en'da o'zbekcha. Misollar:
  - "Toʻxtash masofasi", "Eng uzun oʻtish", "Talabni kiriting va «Hisoblash»ni bosing", "▶ Koʻrsatish";
  - aralash matnlar: "Main street · har yoʻnalish, avt/soat", "Stopping: from the intersection ≥ 30 m, oʻtishdan ≥ 15 m", "chorraha ichida sigʻadi (provisional)";
  - aria: "Asosiy koʻcha talabi", "Toʻgʻriga ulushi".

**Joyshunos**
- Joy pasportida tuman nomi ruscha kirillda chiqadi: «Юнусабадский район» (uz va en rejimida). Geokoder tili interfeys tiliga bog'lanmagan.

**Dizayn-kod** (dizaynkod.html, dizaynkod-joy.html) — barcha 9 tilda:
- Tugma va yorliqlar: "Kunduzgi koʻrinish", "Oʻzbek tili", "Yorugʻ rejim" (title/aria), "Doʻkon qavati", "Boʻyi, sm", "Eshik boʻyi, sm", "Kirish ustida visor (soyabon) bor…", "Miltillash, notekis yorugʻlik", "Qoʻshimcha (ixtiyoriy)", "substratsiz / substratdagi hajmli harflar", "Axborot plitasi".
- Chizma ustidagi yozuvlar: "Peshlavha shu yashil zonaga", "yerdan 337 sm", "Uzunlik / fasad kengligi: 72 % (talab ≤ 60 %)", "102-bet".
- Birlik aralashib ketgan: "800 cm wide × 420 sm boʻyi".
- Joy tipi sahifasi: "Keyin xaritada doʻkoningiz kirish eshigi…", placeholder "Manzil yoki koʻcha nomi", "Yoʻl", "Yoʻl cheti", "Ranglar «Stil» fonida koʻrinadi…", "Ranglarni JSON koʻrinishida nusxalash".

**Bosh sahifa / Batafsil**
- aria "Qavat −" va "Qavat +" tarjima qilinmagan.

**Binokor** (faqat egasiga ochiq)
- Tekshiruv xabarlari, albom matnlari va shablon nomlari barcha tillarda o'zbekcha (en sahifasida 81 ta matn).
- 7 til hozircha inglizcha zaxirada (handoff'da shunday rejalashtirilgan).

**Lug'atdagi xatolar**
- az: "U shakl" → "П formalı", "L shakl" → "Г formalı" (lotin matnida kirill harf).
- en: "(Н1)" va "1.2.2 б" — ingliz matnida kirill harflar.
- Brend nomlari aralash. en/ru menyusida "Street Designer / Site Explorer / Sheet Studio" (lug'atga mos), lekin ~19 ta en matnda hali ham "Koʻchasoz" turibdi ("from Koʻchasoz", "Koʻchasoz → Chizmadon · A3"). ru'da bir joyda "Ko‘chasoz" (U+2018) yozilgan.
- Inglizcha matnda «…» qo'shtirnoq ishlatilgan («All»), vaholanki lug'at qoidasida “…”.

## 3. Oʻzbekcha imlo (ʻ va ʼ)
- `strings.json`: 123 ta o'zbekcha satrda ASCII apostrof bor (Kattaqo'rg'on, Nazorat ro'yxati, Ko'rsatkichlar, Bog'chagacha piyoda, Qo'mita: KZ master-reja…).
- `atamalar.html`: ~110 ta ASCII ' (ko'p qavatli, ta'rifi…). Saytning boshqa qismlarida to'g'ri ʻ ishlatilgan.
- Binokor: 198 ta ‘ (U+2018) va 79 ta ʻ aralash ishlatilgan.

Bosh sahifa, Master reja, Koʻchasoz, Joyshunos va Render ekranlarida imlo to'g'ri.

## 4. Ko'rinish va joylashuv (1366×768)
- **10-qadam, qurilish tizimi segmenti:** en'da "Monolithic walls" va "Frame" bir-birining ustiga chiqib ketgan, uz'da tig'iz turibdi. Segmentlar teng kenglikda bo'lgani uchun uzun matnga joy yetmaydi.
- **5-qadam, avtoturargoh va tipologiya tugmalari:** so'zlar o'rtasidan bo'linadi:
  - en: "Undergroun|d";
  - ru: «Подзем-ная», «Индивидуальные…», «Блокированные…», «Периметральный…»;
  - kk: «Стилобатта».
- **7-qadam:** ru'da «Штукатурка» va «Расположение…» so'zlari bo'linadi.
- **«Maslahatchi» taklif oynasi:** har servisga birinchi kirishda xaritaning yuqori o'ng burchagini yopib qo'yadi — Xarita/Qatlamlar/Dunyo tugmalari, Joyshunos'da esa «Nuqtalar» paneli. Kichik ekranda taqdimot paytida xalaqit beradi.
- **Master reja chap paneli:** pastdagi «Oldingi/Keyingi» qatori «Atrof sozlamalari» bandini yopib turadi — avtomatik test uni bosa olmadi. Pastki chapdagi OSM atributsiyasi ham panel ostida kesilib qolgan.
- **Koʻchasoz:** «Koʻcha muhiti · Tez orada» tugmasini bosib bo'lmaydi, lekin unda aria-disabled yo'q.
- **Master reja «Topish»:** maydon bo'sh bo'lsa, bosilganda hech qanday javob yoki izoh chiqmaydi.
- **Render chap paneli:** sarlavhasi «Kirish» (kiruvchi ma'lumot ma'nosida). Boshqa joylarda «Kirish» hisobga kirishni bildiradi — masalan, «Asos rasm» deb nomlash tavsiya qilinadi.
- **Chizmadon** to'g'ridan-to'g'ri (#/chizmadon) ochilganda Master reja 1-qadami ustida login oynasi chiqadi, sarlavhada esa «Taqdimot albomi» yozilgan — Chizmadon nomiga mos emas.
- **Loyihalar ro'yxati:** «Loyihalar shu brauzerda saqlanadi…» yozuvi bulutga saqlash qo'shilganidan keyin eskirgan bo'lishi mumkin — tekshirib ko'ring.

## 5. Tungi rejim
- Master reja va Dizayn-kod (joy tipi) sahifalarida xarita tunda ham och rangda qoladi, Joyshunos'da esa qorong'i bo'ladi — servislar orasida nomuvofiqlik.
- Koʻchasoz: tunda kesim/reja kanvasi va chapdagi namuna eskizlari oq qoladi.
- «Quyosh va shamol» qadamida shamol guli yorliqlari (Sh, G, J) tunda yaxshi ko'rinmaydi.

Qolgan elementlar tunda to'g'ri ko'rinadi.

## 6. Binokor — ommaga chiqarishdan oldin
- Sahifada dasturchi testlari ro'yxati (`#tests`: "PASS fuzz 1500 bino…", 100 dan ortiq qator) shartsiz ko'rsatiladi. Uni olib tashlash yoki faqat localhost'da ko'rsatish kerak.
- 19 ta belgili tugmada matn ham, aria-label ham, title ham yo'q.
- Tekshiruv xabarlari tarjima qilinmagan (2-bo'limga qarang).

## 7. Tekshirilgan va muammosiz qismlar
- Bosh sahifa, Narxlar (uz/en/ru), Oferta, Maxfiylik.
- Master reja 11 qadami (en/ru/uz) — yuqorida sanalganlardan boshqa muammo yo'q.
- Chizmadon.
- Render: barcha uslub va rejim tugmalari javob beradi, fayl tanlash oynasi ochiladi.
- Transport: 7 ta model, GLB to'lov oynasi.
- Joyshunos qatlam tugmalari.

## Tavsiya etilgan navbat (bitta PR — bitta ish)
1. `kps_auth` / `kps_api` faqat localhost'da ishlashi.
2. `ds2.css` dagi `@fontsource` import yo'llari.
3. Narx matnlari: 32 ta kalit × 7 til.
4. Undo yorliqlari va `${}` ichidagi o'zbekcha bo'laklar.
5. Dizayn-kod matnlari va kanvas yozuvlari.
6. Koʻchasoz Chorraha lug'ati.
7. Segment tugmalar (5-, 7-, 10-qadamlar): kenglikni matnga moslash, so'zni o'rtasidan bo'lmaslik.
8. Apostroflarni tozalash: strings.json (123), atamalar.html, Binokor.
9. az lug'atidagi «П/Г formalı», en'dagi kirill harflar, en'dagi «Koʻchasoz» nomlari.
10. Joyshunos geokoderini interfeys tiliga bog'lash.
11. Master reja va Dizayn-kod uchun tungi xarita uslubi.
12. «Maslahatchi» oynasining joylashuvi.
13. Binokor: testlar ro'yxati va aria-label'lar.

## Usul va cheklovlar
- Playwright + Chrome, 1366×768, kirmagan foydalanuvchi. 6–11-qadamlar namuna loyihada tekshirildi.
- Planshet (1024 px) tekshirilmadi.
- Sandbox tarmog'i ayrim tashqi xostlarni (Google Fonts, S3 relyef plitkalari) to'sdi — ulardan kelgan xatolar hisobga olinmadi.
- Tarjima sifati (so'z tanlovi) faqat uz/en/ru'da ko'z bilan baholandi. Qolgan 7 tilda faqat yo'q yoki aralash matnlar qidirildi.
- Hisob, to'lov va server amallari bosilmadi.

## Holat (22.11, kechqurun) — tuzatildi va saytda
Birlashtirilgan PR'lar: #740 (kps_auth/kps_api faqat localhost, Golos shrifti 404), #741 (narx matnlari 7 tilda, 41 kalit), #742 (undo yorliqlari, birlik, kirill harflar, Joyshunos nomi), #743 (Dizayn-kod sahifalari 10 tilda), #745 (segment/plitka tugmalari), #746 (apostroflar), #748 (Koʻchasoz Chorraha paneli 10 tilda).
Saytda tekshirildi: kps_auth=0 bilan GLB endi toʻlov oynasini chiqaradi; narxlar (es) — inglizcha qoldiq yoʻq, 404 yoʻq.

Qolganlar: Binokor (apostroflar, #tests roʻyxati, aria-label) — artifakt yigʻish skripti bilan birga; tungi rejimda xarita (Master reja, Dizayn-kod); «Maslahatchi» oynasining joyi; Chorraha: ru «YHQ» → ПДД, SVG ichida «m»; atamalar.html «Qisqartirish» katagi ataylab ASCII «yo'q» (lugʻatda none).
