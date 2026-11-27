# Bogʻshunos — «tayyor master reja» darajasiga yoʻl xaritasi (23.11.2026)

Egasi Amir Temur xiyobonida sinadi: 9 ta bir xil yoʻnalishdagi sport maydoni, ichi boʻsh, boshqarib boʻlmaydi — «juda xom». Maqsad: odamlar kirib tayyor landshaft master rejasini oladigan daraja.
Mahsulot mantigʻi: **topshiriq → dastur → avtomatik qoralama → yoʻnaltirilgan tahrir → tekshiruv → koʻrinishlar → albom / Chizmadon**.
Manba kodi — faqat repoda (`mr/src/bogshunos/`). Asl shtaffaj kutubxonasi: `D:\Work\Claude_Archemistry_Lab\shtaffaj svg v2`.

## Bajarildi
- **#757–759** sahifa, loyihalar paneli, kesimda asl shtaffaj.
- **#760 Dastur va joylash** (`dastur.ts`): elementlar katalogi, `suggest()`, `placeBlocks()`, `fitout()`, tahrir `blk`/`blk-add`.
- **#762 Kompozitsiya va relyef**: saqlanadigan obyektlar (haykal, favvora, sanʼat), qoʻpol relyef filtri, oʻtloq ≥ 250 m², tarixiy makonda piyoda xiyoboni — asosiy.
- **#764 Variantlar**: A Saqlovchi · B Faol · C Tabiiy.
- **#765 Xizmat va xavfsizlik**: kirish maydonchalari, hojatxona, kafe, ijara; bolalar maydonida xavfsizlik zonalari (EN 1176, A).
- **#766 Loyiha tekshiruvi** (`nazorat.ts`, `V.qc`): 12–16 tekshiruv, panelda, variant kartalarida va albomda.
- **#767 Sinov toʻplami va tarjima**: 13 bogʻ × 3 variant real OSM + reyestr bilan; topilgan xatolar tuzatildi; interfeys 9 tilda (albom oʻzbekcha).
- **#768 Koʻrinishlar**: yuqori panelda (5-qadamdan) Reja · Akso · Kesim va «Render»; butun hudud aksonometriyasi; kesimlar oynasi (SVG/PNG).
- **#769 Kesimli fragment va oʻz kesimi**: akso kesim yuzalarida tuproq, qoplama, suv havzasi qatlamlari, ildiz tuplari, chuqurlik shkalasi; «Kesim chizigʻi» asbobi (C–C, D–D …) → kesim oynasi, modul, albom (varaqqa 3 tadan).
- **#770 «Chizmadonga →»**: albom (barcha varaqlar), akso va kesimlar A3 varaq sifatida; loyiha tanlovi ui/chzsend orqali.

## Sinov natijasi (#767)
Amir Temur 6,3 ga (tarixiy) · Bobur 9,0 · Seul 0,8 · Salar 0,8 · Yapon 2,5 · Mirzo Ulugʻbek 2,7 · Shahidlar xotirasi 6,2 (tarixiy) · Navroʻz 10,0 · Furqat 9,4 · Ashxobod 14,5 · Gʻafur Gʻulom 14,9 · Abdulla Qodiriy 15,4 · Milliy bogʻ 17,0 (+ sport dasturi bilan) — «tuzatish kerak» barcha variantlarda 0. Koʻkalamzor 72–91 %.

## Navbat / qarzlar
- Brauzerda 1–10 qadamni qoʻlda yurish — hali qilinmagan (Claude in Chrome ulanmagan, bulutdagi brauzer sinovi ruxsat etilmadi). #768–770 ham faqat hisob kodi darajasida sinalgan.
- Chizmadonga yuborilgan varaq — tayyor tasvir; modelga bogʻlangan material (daraxt surilsa varaq yangilanadi) — kelishilgan, hali yoʻq. Chizmadonda «Landshaft albomi» maket oilasi ham yoʻq.
- Katta bogʻda butun hudud aksosi bir necha MB — Chizmadonga uzatishda brauzer xotirasi toʻlishi mumkin (xabar chiqadi).
- Bulutda aholi va relyef yuklanmaydi: sport ehtiyoji (33-jadval) va real nishab brauzerda tekshirilsin.
- B variantda zich bogʻda kichik daraxtlar koʻp koʻchiriladi.
- Tarixiy makonda asosiy oʻqlarni alohida aniqlash yoʻq; `place: 'Toshkent'` qotirilgan; `albom.test.ts`, `run.test.ts` repoda yoʻq.

## Normalar (matndan tekshirilgan)
- ShNQ 2.07.01-23, 33-jadval: sport maydonchalari 3 800–4 000 m² / 1 000 dam oluvchi.
- ShNQ 2.07.01-23, 491-band: istirohat bogʻi hududining kamida 70 % — koʻkalamzor; 490-band — minimal maydonlar.
- ShNQ 2.07.01-23, 89-band, 4-jadval (turar joy hududi; oʻxshashlik boʻyicha, P): bolalar oʻyini — binogacha 10 m; jismoniy tarbiya 10–40 m; it sayr 40 m.
- Sport oʻqi: Oʻzbekiston normasida band topilmadi; xalqaro qoʻllanmalar (A) — 285°–20°, eng maʼquli 345°.
