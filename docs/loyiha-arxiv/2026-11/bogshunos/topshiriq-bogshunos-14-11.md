# Topshiriq: Bogʻshunos — yashil master reja va landshaft vositasi (14.11.2026)

Yangi chatda shu hujjatdan boshlang. Bogʻshunos ishi Binokor chatidan ajratildi.

## 000. ENG SOʻNGGI HOLAT (14.11, 11:15) — kodga tayyor
- **Yangi (11:15): yoʻl tarmogʻi — yaxlit tizim.** `claude/bogshunos-yol-tarmogi-tizim-14-11.md` — jahon usullari (Alexander, Lynch, Olmsted, Auckland DM, desire lines, space syntax, Dill/Ewing), 8 qadamli algoritm (OD → xohish chiziqlari → darvoza ratsionallash → bundling → ierarxiya → tugun-joy → hujayra-dastur → tekshiruv), metrikalar (PRD, link–node, CNR, γ/α, uzilish), generator qoidalari R1–R7. Test: «Tizimli» variant — koʻkalamzor 75 %, PRD 1,13, oqimning 94 % i PRD ≤ 1,3, uzilish 0 % (Muvozanatda 65 %). Kod: `claude/bogshunos-src/yol-tarmogi-net.py`, `yol-tarmogi-eval.py`. Kanvas **I**. R1–R7 — PR-7 ga qoʻshiladi.
- **Metodika tasdiqlandi:** `claude/bogshunos-metodika-bosqichlar-14-11.md` — 14 qadam, 4 blok; tashrif modeli; 9 muhandislik boʻlimi; narx (4.3 — kimdan); xorijiy normalar (2.4); ELU zonalari (VMQ 1050); suv muhofaza zonalari — amaldagi nizom yoʻq (P).
- **Iskandar tasdiqlari (14.11, 10:01):** zid normalarda tarmoqni oʻlchash uchun kattasi; tashrifchi suvi 3 l/kishi (P, proksi); kanvas ekranlari A–F qabul.
- **Kanvas** (https://claude.ai/artifact/UR136Yfv15SzhjqktTDRMU, «Interfeyslar»): A, B — zonalar va ekish; C — moslik xaritasi; D — balans va narx; E — L-03 landshaft kesimi; F — «Landshaft albomi» (16 varaq); G — referensdan dizayn; H — referens testi (Tashkent City); I — yoʻl tarmogʻi.
- **Albom qarorlari (09:47):** render Bogʻshunos ichida (Master reja render moduli); albom butunlay tanlangan tilda; A3–A0. Kodga tayyor: `claude/chizmadon-src/landshaft-albomi-la.js`.
- **Asboblar va kutubxona:** `claude/bogshunos-asboblar-kutubxona-14-11.md` — har qadam asboblari (kirish → hisob → tekshiruv → chiqish), kutubxona JSON sxemasi, maʼlumot modeli, **kod navbati PR-1…PR-6** (5-boʻlim).
- **10:18 qarorlari:** (1) Bogʻshunos PR-1…PR-6 kod navbatiga kiritildi — hozir boshqa chat saytda kod yozyapti (repo push 10:15), shuning uchun u tugagach boshlanadi; (2) bizda yoʻq qiymatlar chetdan olinadi (PUE-7, NII VODGEO ψ, GOST koʻchat, USDA UTD — `bogshunos-asboblar-kutubxona-14-11.md` 6.5); (3) qolganlari qayta qidirildi (6.6).
- **«Referensdan dizayn»** — `claude/bogshunos-referensdan-dizayn-14-11.md` (agent → grammatika JSON → deterministik generator; 3A grammatika, 3B reja koʻchirish; Qatʼiy / Muvozanat / Erkin), kanvas **G**, test **H**. Kod — **PR-7**. Referens endi uslubni beradi, tarmoqni emas (yoʻl tarmogʻi hujjati, 5-boʻlim).
- **Keyingi:** kod chati PR-1 dan boshlaydi (`loads.ts` / `cost.ts` / `checks.ts` qatorlari, Master reja bilan umumiy). Bir vaqtda bitta chat kod yozadi.

## 00. Holat (14.11, 03:40) — avval metodika (tarix)
- Iskandar: tahlil gʻoyadan oldin boʻlsin (atrof → joy → «qayerda nima mumkin»), va **muhandislik tarmoqlari** (sugʻorish, suv, kanalizatsiya, yomgʻir, elektr, gaz, aloqa), **yuklamalar, narx va TIK** metodikasi ham kerak.
- Metodika: **`claude/bogshunos-metodika-bosqichlar-14-11.md`**.
- A ekranidagi 464 → 501 tuzatildi (shahar ichidagi park — 501-band, 100 kishi/ga; 463 va 464 — faqat shahar tashqarisi).
- Dunyo qoʻllanmalari (JSST 0,5 ga / 300 m; 3-30-300; Fields in Trust; ParkScore; Natural England GI Framework 2023; PPS; Gehl 12 mezoni; Green Flag; Grahn va Stigsdotter PSD; Terrapin 14 naqsh; Play England; ABC Waters; SITES v2; LCA 2014) — sifat qatlami sifatida.

## 0. Holat (14.11, 03:05) — QAROR OLINDI
- **Iskandar tanladi: aralash yondashuv.** Asosi — muharrir: zona, massiv, yo‘lak, daraxt, gulzor, qoplamani foydalanuvchi chizadi (qo‘lda yoki Maslahatchi buyrug‘i bilan — agent faqat asboblarni ishlatadi, har qadami tarixda). Vosita har o‘zgarishda hisoblaydi va tekshiradi. **«Taklif qil»** — faqat so‘raganda, faqat tanlangan qismga, 2–3 variant; qabul qilingan variant oddiy tahrirlanadigan elementga aylanadi. Butun rejani o‘zi yaratadigan avto-generator — yo‘q.
- **Ikki rejim** (Iskandar tanlovi): `UI-Bogshunos-A` — alohida loyiha (daryo bo‘yi parki); `UI-Bogshunos-B` — Master reja ichida (kvartal hovlisi). Sarlavhada daraja almashtirgich Konsepsiya/Loyiha va norma to‘plami (mamlakat bo‘yicha).
- Ekranlardagi maydonlar, aholi, toj radiusi — **namuna**.

## 1. Nima kerak (Iskandar)
- **Bogʻshunos** — landshaft master reja va landshaft loyihasi vositasi. Archemistry Lab xizmati, rangi pista #b5e04a, Master reja qobig‘ida.
- Butun dunyo uchun ishlashi kerak, faqat Toshkent uchun emas.
- **Ikki rejim:** (a) alohida yashil master reja yoki landshaft loyihasi; (b) Master reja ichidagi park, skver, hovli yoki koridor — hudud chegarasi, aholi soni va binolar Master rejadan keladi.
- **Ikki daraja:** konsepsiya (zonalar, o‘qlar, balans, ko‘rsatkichlar) va loyiha (ekish rejasi, qoplamalar, jihozlar, kesimlar, vedomostlar).
- Faqat o‘simliklar emas: qoplamalar, yo‘laklar, suv, relyef, jihozlar, MAF, yoritish, sport va o‘yin, parvarish — «barcha-barchasi».
- **Muhandislik infratuzilmasi, yuklamalar, narx va TIK** (14.11, 03:22).
- **Avval tahlil (atrof, joy, imkoniyat va cheklovlar), keyin gʻoya** (14.11, 03:15).
- **Yoʻllar — yaxlit funksional tizim, «dogʻ» emas** (14.11, 10:46).
- Chirchiq eko-koridori kabi loyihalarni qila olishi kerak.
- Interfeys juda sodda, ko‘p toifadagi foydalanuvchiga qulay. Agent referens yoki prompt orqali yordam beradi.

## 2. Binokordan saboq
Binokor uchun parametrlardan butun binoni o‘zi yaratadigan **avto-generator** qilingan edi. Iskandar: «bu umuman men hohlagan narsa emas». U Revit/Archicad kabi **muharrirni** xohlagan. Bogʻshunos uchun javob: **aralash** (0-bo‘lim).

## 3. Tayyor materiallar
- **Metodika:** `claude/bogshunos-metodika-bosqichlar-14-11.md` (asosiy).
- **Yoʻl tarmogʻi:** `claude/bogshunos-yol-tarmogi-tizim-14-11.md`.
- **Asboblar va kutubxona:** `claude/bogshunos-asboblar-kutubxona-14-11.md`.
- **Albom oilasi:** `claude/chizmadon-src/landshaft-albomi-la.js`.
- **Normalar parchasi:** `claude/normalar-txt/SanQvaN-0339-16-parcha.md`.
- **Referenslar:** `D:\Work\Claude_Archemistry_Lab\park masterplan` — 60 ta rasm. Ko‘rilgan: 460aa8 (daryo bo‘yi parki), 0a298c (koridor), 4c9bf9 (ekish rejasi), 049f25 (hovli).
- **Tahlil va metodikalar:** `claude/binokor-bogshunos-2-bosqich-14-11.md`, 3-bo‘lim. Diqqat: u yerdagi «464 — sigʻim» qatori faqat shahar tashqarisidagi bogʻlar uchun.
- **Master reja muhandisligi va narxi:** `claude/master-reja-muhandislik-narx-arxitektura.md`, `claude/cheklovlar-navbat-narx-arxitektura.md` (mediana usuli) — formulalar umumiy.
- **Avvalgi konsepsiya:** `claude/binokor-bogshunos-mexanika-14-11.md`, B-bo‘lim.
- **Yadro prototipi (v0):** `claude/bogshunos-src/kernel-prototip-v0.js` — qismlari «Taklif qil» ichiga o‘tadi.
- **Iskandarning qarorlari:** o‘simliklar bazasi uchun hamma manba yig‘iladi (Botanika bog‘i, ko‘chatxonalar, Chirchiq loyihasi, xalqaro bazalar); norma qatlami mamlakat bo‘yicha almashtiriladi.

## 4. Keyingi qadamlar
1. ~~Metodika tasdigʻi~~ — bajarildi.
2. ~~Normalar matnlari~~ — asosiylari oʻqildi; qolgani metodika 7-boʻlimida (P).
3. ~~Kanvas ekranlari~~ — A–I.
4. ~~Asboblar va kutubxona sxemasi~~ — bajarildi.
5. ~~Yoʻl tarmogʻi usuli~~ — bajarildi (R1–R7 PR-7 ga).
6. **Kod:** PR-1…PR-7 (`bogshunos-asboblar-kutubxona-14-11.md`, 5-boʻlim; `bogshunos-referensdan-dizayn-14-11.md`).

## Qoidalar
- Son va norma faqat manbadan; manbasiz qiymat — «P, tekshirilsin».
- Bittadan ish, navbat bilan; interfeys yengil; parallel chatlarga xalaqit bermaslik (`/preferences`).
- Javoblar o‘zbek tilida.
