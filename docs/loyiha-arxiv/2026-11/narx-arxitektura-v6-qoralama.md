# Archemistry Lab — narx arxitekturasi v6 (QORALAMA, 02.11.2026, 3-tahrir; 18.11 — Jamoa obunasi qoʻshildi)

Asos: Model D (28.10, `narx-simulyatsiya-28-10.md`) + normativ narx qoʻllanmasi (QVUJKX 1-son buyrugʻi, AV 3556, lex.uz/pdffile/7121901) + kalkulyator `server/src/normativ-narx.js` (PR #400).
Holat: egasi koʻrib chiqadi. Hech qaysi raqam kodga kirmagan.
- 2-tahrir: «litsenziya» → **Tashkilot paketi**; QQS olib tashlandi; Pro da «cheklovsiz» yoʻq.
- 3-tahrir: bozor maʼlumoti (egasi: shunday tahlil bozorda ~$5 000 dan boshlanadi) → paket 1,5 %; «skrinshot» muammosiga yechim — ekrandagi tafsilot cheklovi va «qayta chizishdan arzon» tamoyili; Pro keyinga.
- 02.11, 14:20: ofertadagi band matnini egasi **tasdiqladi** (5-boʻlim).
- 18.11: **3a. Jamoa obunasi** (Claude taklifi, egasi «ok» dedi) va Bloom Architects piloti qoʻshildi.

## 0. Asosiy gʻoya
**Ishga tushirishda uchta tarif:** Bepul · Loyiha (tanga) · Tashkilot paketi. Pro va Shartnoma — keyin.

Ikki tamoyil:
1. **Ekran qiziqtiradi, pul aniqlik va fayl uchun olinadi.** Bepul ekran «bu hudud nimaga yaraydi?» degan savolga javob beradi. «Aniq loyiha» (oʻlcham, toʻliq TEP, norma bandlari, fayl) — pullik.
2. **Narx qayta chizish xarajatidan past boʻlishi kerak.** Skrinshotni Revit/AutoCAD da kontur boʻyicha qayta chizish, TEP ni qayta hisoblash va normaga qoʻlda tekshirish 1–3 ish kuni oladi. Loyihachi kunining narxi ~0,5–1 mln soʻm — demak bu 1–3 mln soʻm. Loyiha tarifi (10 ga — ≤ 0,71 mln) bundan arzon, shuning uchun toʻlash foydaliroq.

## 1. Bepul
- Hudud va uchastka chizish, istalgan maydon.
- Har loyihada 3 ta variant.
- Ekranda reja va 3D.
- ≤ 3 ga uchastka — hammasi ochiq: talaba va oʻrganish uchun, ataylab bepul.
- **> 3 ga uchastka, ochilmagan loyiha:**
  - reja va 3D da «QORALAMA» suv belgisi;
  - oʻlcham chiziqlari, koordinatalar va masshtab chizgʻichi yoʻq;
  - TEP faqat 5 ta asosiy koʻrsatkich, **yaxlitlangan** (maydon, umumiy maydon, aholi, zichlik, koʻkalam %);
  - meʼyoriy tekshiruv faqat «N ta muammo bor», bandlar va joylari koʻrsatilmaydi;
  - xonadonlar faqat jami soni (tarkibi va rejasi koʻrinmaydi);
  - eksport faqat belgili PNG.
- «Normativ narx» kalkulyatori — hamma uchun bepul.

## 2. Loyiha (tanga, Model D — raqamlar oʻzgarmaydi)
- «Loyihani ochish» (mavjud `mr.site`, 10 tanga × k) ekrandagi hamma tafsilotni ochadi: aniq raqamlar, oʻlchamlar, norma bandlari.
- Fayllar (DXF, IFC, albom, TIK, hisobot) — har biri alohida, Model D narxida.
- **Loyiha shifti** — bitta loyihada bundan ortiq toʻlanmaydi, keyin hammasi bepul:

| Uchastka | Shift, tanga | Taxminan, soʻm |
|---|---|---|
| ≤ 3 ga | 195 | 565 ming |
| ≤ 10 ga | 245 | 710 ming |
| ≤ 25 ga | 345 | 1,0 mln |
| ≤ 60 ga | 495 | 1,44 mln |
| ≤ 150 ga | 745 | 2,16 mln |
| > 150 ga | 1000 | 2,9 mln |

(1 tanga ≈ 2 900 soʻm, 100 tangalik toʻplam boʻyicha.)
- Kim uchun: jismoniy shaxs, talaba, freelancer. Karta bilan toʻlaydi.

## 3. Tashkilot paketi (litsenziyali loyiha tashkiloti, developer)
**Narx = 1,5 % × normativ narx, kamida 3 mln, koʻpi bilan 20 mln soʻm, QQSsiz** (YaTT).
Normativ narx = kalkulyator; hujjat turi, maydon va faqat hudud koeffitsiyenti.

| Uchastka | Normativ narx, Toshkent | Paket | Bozor narxi bilan (egasi: $5 000 dan, ≈ 60 mln soʻm) |
|---|---|---|---|
| 3–30 ga | 406 mln | **6,1 mln** | bozor minimumining ~10 % i |
| 40 ga | 498 mln | **7,5 mln** | |
| 100 ga | 714 mln | **10,7 mln** | |
| 200 ga | 1 048 mln | **15,7 mln** | |

Viloyat markazi uchun ~8 % arzonroq (koeffitsiyent 1,2).

Paketga kiradi:
- loyihadagi hamma narsa ochiq, shiftsiz va belgisiz;
- **kompaniya shtampi va ramkasi** varaqlarda — faqat shu yerda;
- 3 ta foydalanuvchi;
- 12 oy davomida tuzatishlar;
- normativ narx varagʻi;
- shartnoma, e-hisob-faktura, dalolatnoma.

Birlik: bitta loyiha = bitta uchastka chegarasi (variantlar ichida). Chegara 10 % dan koʻp oʻzgarsa — yangi paket.

Qoʻshimcha modullar (keyin): iqtisodiy tahlil +25 %, ekologik va cheklovlar +15 %, 3D/vizual +10 %, taqdimot +10 %, yillik yangilash 20 %.

Nima uchun firma tangadan emas, paketdan oladi: shtamp, hisob-faktura (buxgalteriya uchun), bir nechta xodim, tuzatishlar. Ammo firma xodimi karta bilan tanga olishi mumkin — bu yoʻqotish emas, u baribir toʻlaydi.

## 3a. Jamoa obunasi (QORALAMA, 18.11 — Claude taklifi, egasi «ok»)
Koʻp loyiha qiladigan firma uchun (har loyihaga paket noqulay boʻlganda). Birinchi holat — Bloom Architects.

| | Narx |
|---|---|
| Pilot (1 oy) | bepul |
| **Jamoa**, 5 kishigacha | **3 mln soʻm/oy** |
| Yillik oldindan | **30 mln soʻm** (2 oy bepul) |
| Birinchi korporativ mijoz, 6 oy | **2 mln soʻm/oy** |

- Kiradi: loyihalar soni cheklanmaydi, hammasi ochiq va belgisiz; shartnoma, e-hisob-faktura.
- Render va ogʻir hisoblar — oylik umumiy tanga hovuzi (taklif: 300 tanga), tugasa alohida.
- Asos: 3 mln = eng kichik Tashkilot paketi; 2 oyda 1 loyiha (6,1 mln) boʻlsa ham arzon; loyihachi kuni 0,5–1 mln → 3–6 ish kuni. Pro 5 × 149 ming ≈ 0,75 mln dan aniq yuqori.
- Muzokara chegarasi: 2 mln dan past emas; «qimmat» desa — oʻrinni kamaytirish (3 kishi — 2 mln).
- Soliq: YaTT 1 % (oyiga ~30 ming), QQS yoʻq.
- Ochiq: hovuz hajmi — pilot sarfi maʼlumotidan; shtamp va jamoa hisobi kodda yoʻq (8-boʻlim, 4–5-band).

### Bloom Architects piloti (18.11)
- Egasi «deyarli barcha loyihalarni ochib beraman» degan.
- 18.11: 2 xodimga sinov kirishi, **har biriga 350 tanga** (≈ 1 mln soʻm; ≤ 25 ga loyiha shiftiga yetadi).
- Keyingi qadam: tugash sanasi (taklif: 1 oy), oy oxirida suhbat + sarf raqamlari bilan Jamoa obunasi taklifi.
- Panelda sinov kirishlari uchun «sarflangan / qolgan» ustuni kerak (egasi-paneli-tuzatishlar-16-11, navbat 4-band).

## 4. Keyin
- **Pro** — 1–2 oy maʼlumotdan keyin. Qoralama: 149 000 soʻm/oy; oyiga 75 tanga; 10 ta ogʻir hisob; har loyihada 20 ta variant; versiyalar tarixi; tanga 2 oy saqlanadi.
- **Shartnoma** (hokimlik, xalqaro loyihalar) — alohida taklif. Urbanizatsiya qoʻmitasiga taklif: Claude Doc «Archemistry Lab — Urbanizatsiya qoʻmitasiga taklif» (https://claude.ai/artifact/3Aft5XYzfSmvPn3RWXpJp8) — pilot 3 loyiha / 2 hafta bepul; keyin har tekshiruv 3–6 mln yoki yillik 90 mln soʻm.

## 5. Biz nima sotamiz — chegara
- Arxitektura-shaharsozlik hujjatlarini ishlab chiqish — litsenziyalanadigan faoliyat. Uni faqat yuridik shaxslar oladi: I toifa ≥ 5, II ≥ 10, III ≥ 15 mutaxassis (gov.uz/oz/mc/sections/view/38346; VMQ 80-son, 21.02.2022).
- Archemistry Lab **dasturiy vosita** sotadi. Paketning asosiy mijozi — litsenziyali tashkilotlar.

### Ofertaga qoʻshiladigan band — TASDIQLANDI 02.11 (5-boʻlim, «Natijalar»; Tashkilot paketi PR'i bilan birga, 10 tilda)
**UZ:** Xizmatda yaratilgan rejalar, hisoblar, meʼyoriy tekshiruv natijalari va eksport fayllari loyihachi uchun ishchi material hisoblanadi va tasdiqlangan shaharsozlik hujjati emas. Ularni shaharsozlik hujjati sifatida buyurtmachiga, davlat organiga yoki ekspertizaga topshirish, imzolash va ular uchun javobgarlik — Oʻzbekiston Respublikasi qonunchiligiga muvofiq arxitektura-shaharsozlik hujjatlarini ishlab chiqish litsenziyasiga ega tashkilot zimmasida. Ijrochi shaharsozlik hujjatlarini ishlab chiqish xizmatini koʻrsatmaydi.

**RU:** Планы, расчёты, результаты нормативной проверки и файлы экспорта, созданные в Сервисе, являются рабочими материалами проектировщика и не являются утверждённой градостроительной документацией. Их передача заказчику, государственному органу или на экспертизу в качестве градостроительной документации, подписание и ответственность за них возлагаются на организацию, имеющую лицензию на разработку архитектурно-градостроительной документации в соответствии с законодательством Республики Узбекистан. Исполнитель не оказывает услуги по разработке градостроительной документации.

**Tijoriy foydalanish:** loyiha natijalarini buyurtmachiga haq evaziga topshirish uchun Tashkilot paketi kerak. Loyiha tarifidagi natijadan ham foydalanish mumkin, lekin shtampsiz.

## 6. Yuridik shakl — YaTT (egasi — YaTT)
- **Manba:** Iqtisodiyot va moliya vazirligining Soliq kodeksi oʻzgarishlariga sharhi (api.mf.uz/media/filestore/Sharx_26-11.pdf).
- **Stavka:** 2026-yil 1-yanvardan yillik aylanmasi 1 mlrd soʻmgacha boʻlgan YaTT va oʻzini oʻzi band uchun aylanmadan olinadigan soliq **1 %**. Umumiy stavka 4 % qoladi.
- **Oʻzgartirilgan moddalar:** 461, 462, 467, 468.
- **Shart:** sharhda xizmatni hisobvaraq-faktura orqali sotish bilan bogʻlangan. Tashkilot paketi aynan shunday sotiladi.
- **QQS:** 1 mlrd soʻmgacha YaTT QQS toʻlovchi emas.
- **Ochiq qolgan:** buxgalter.uz da qayd etilgan PF-100 (26.05.2026) farmonining shu tartibga taʼsiri tekshirilmadi — matni topilmadi. Lex.uz dagi Soliq kodeksining amaldagi tahriri bilan solishtirish kerak.

## 7. KIS
- Qoʻllanmada qiymati berilmagan.
- 2026 ijtimoiy soliq: 12 %, byudjet tashkilotlari uchun 25 %.
- 1,12 — TALQIN.

## 8. Texnik ish (alohida PR'lar)
1. ✅ `normativ-narx.js` (PR #400).
2. Ochilmagan > 3 ga loyiha uchun ekran cheklovi: suv belgisi, oʻlchamsiz, yaxlit TEP, norma — faqat soni.
3. `GET /normativ-narx` + bepul kalkulyator sahifasi; 1-qadamda «Normativ narx» kartasi.
4. `prices.js`: `orgPackageOf(project)` + `projects.org_package`.
5. Chizmadon: kompaniya shtampi — faqat paketda.
6. Oferta: 5-boʻlimga tasdiqlangan band (10 til) + shartnoma va hisob-faktura shabloni.
7. (18.11) Jamoa obunasi: jamoa hisobi (oʻrinlar, umumiy tanga hovuzi, muddat) — Bloom pilotidan keyin.

## 9. Hali ochiq
- 3–5 tashkilot bilan sinov: 6 mln ga «maqbul» deydimi? (Bloom — birinchisi, 3a.)
- PF-100 (26.05.2026) — YaTT soliq tartibiga taʼsiri.
