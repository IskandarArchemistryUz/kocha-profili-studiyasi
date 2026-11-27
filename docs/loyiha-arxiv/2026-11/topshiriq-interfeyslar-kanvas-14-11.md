# Topshiriq: xizmatlar interfeyslari — kanvasda davom ettirish (14.11.2026)

Kanvas: https://claude.ai/artifact/UR136Yfv15SzhjqktTDRMU (slug `de009dd7-4cec-474f-be9e-36d2352a0723`)
Dizayn tizimi: «Archemistry Lab» (o'rnatilgan, `project/ds/archemistry-lab/tokens.json`).

## Sahifalar
- **Ranglar va effektlar**: Render studiya A/B/C (Main, Koshin, OltinSoat), «Tugma effektlari — loy va shisha» (Tugmalar), «Xizmatlar oilasi» (Xizmatlar), «Fon naqshlari va yuklanish» (Fonlar).
- **Interfeyslar**: UI-Joyshunos, UI-Kochasoz, UI-Dizaynkod, UI-Chizmadon, UI-Render, UI-Binokor, UI-Bogshunos (1440×900, asosiy ekran) + Bogʻshunos A–H (boshqa chat).
- **Oʻtishlar** (14.11): `Otish.dc.html` — «Oʻtish: boʻlim → loyihalar», interaktiv (generator: `render-canvas-gen/gen6.py` + `live.py`, sessiya ichida).

## Qabul qilingan qarorlar (Iskandar)
- Xizmatlar: **Master reja** (o'zgarmaydi — oq, nuqtali to'r, siyoh qora), **Joyshunos** (terrakota), **Koʻchasoz** (ko'k, yorug'), **Dizayn-kod** (Toshkent dizayn-kodi brendi: asosiy #025E69, naqsh #149AA6 #02818C #027680 #024952 #014047; brendbuk naqshi, 10 px qiya burchak), **Chizmadon** (binafsha, yorug'), **Render** (oltin = Archemistry brend #f0b323 / yorqin #ffc53d), **Binokor** (yangi — bino arxitekturasi, fasad, parametrik; anor #e5668f), **Bogʻshunos** (yangi — landshaft; pista #b5e04a), **Maslahatchi** (o'z rangi yo'q, kamalak halqa).
- Nomlar: «Binokor» (bunyodkorlik bilan bog'liq; «Naqshsoz», «Binosoz» rad etildi), «Bogʻshunos».
- Tugmalar: yorug' xizmatlarda — **xira loy** (bir tusli pastel, pastda 3 px qalinlik, yaltiroq yo'q; Product UI Styleguide referensi); to'q xizmatlarda — **xira qora kartalar + yonuvchan aksent** (ingichka yonuvchi chiziq, tanlangan qator/kartaning yonuvchi cheti, och aksent asosiy tugma; «The Quiz» referensi). Rangli dog'li (blob) fonlar yoqmadi.
- Fon naqshlari: ingichka, bilinar-bilinmas, aksent kam: Joyshunos — relyef gorizontallari; Koʻchasoz — mayda yo'l chiziqlari va burilish belgilari; Dizayn-kod — Toshkent brendbuk naqshi (maydaroq); Render — qorong'i sahna, bitta oltin nur; Binokor — chizmalar (o'qlar, reja, qavatlar); Bogʻshunos — landshaft rejasi; Chizmadon — daftar katagi + hoshiya + mayda eskizlar.
- Naqshlar **choksiz** bo'lishi shart: davriy naqsh — bitta katak takrorlanadi (Dizayn-kod 100×100 katak, Koʻchasoz 140×96, Chizmadon 300×200); davriysiz (relyef, Binokor, Bogʻshunos, Render) — takrorlanmaydi, cover, chiziqlar `non-scaling-stroke`.
- **(14.11) Jonli naqshlar** — bo'lim ochilganda naqsh o'z ishini ko'rsatadi: Joyshunos — gorizontallar ilon izidek oqadi; Koʻchasoz — strelkalar bittalab chiqib yo'nalishi bo'yicha buriladi, polosalar oqadi; Dizayn-kod — naqsh elementlari (yulduz/doira) joyida aylanadi; Chizmadon — rejalar chizilib paydo bo'ladi; Render — quyosh nurlari (god rays) bir tomondan ikkinchisiga o'tadi; Binokor — o'qlar chiziladi, qavatlar pastdan ko'tariladi, balandlik o'lchami chiqadi. «Harakatni kamaytirish»da — tayyor holat, harakatsiz.
- **Bo'lim → loyihalar o'tishi** (≈1 s): karta bosilgan joyidan ekranga kengayadi (0–420 ms, clip-path) → fon xizmat rangi, naqsh karta markazidan yoyiladi (160–810) → shisha yuqori panel tushadi (300–660) → aksent chiziq yonadi (420–940) → kolba (faqat yuklanish > 300 ms) → sarlavha va loyiha kartalari 50 ms oraliqda (960 →).
- Yuklanish: logotip (sirkul + kolba = A) animatsiyalari yoqdi — «Kolba to'lmoqda», «Chizilmoqda», «Sirkul aylanmoqda», tugma ichida kichik kolba.
- Har xizmatda kunduzgi va tungi rejim; xizmatlar orasida yumshoq o'tish, «harakatni kamaytirish»da o'chadi. Saytda hozir (PR #643) — sahifa 0,24 s da shaffoflik bilan paydo bo'ladi; View Transitions Chromium konsolga «opt-in disabled» xatosini yozgani uchun ishlatilmadi.
- Referenslar: `D:\Work\Claude_Archemistry_Lab\web design`.
- **(14.11, izohlar)** Ekranlar saytdagi haqiqiy interfeys tuzilishiga mos bo'lishi kerak — faqat rang/uslub yangilanadi. Xarita (Joyshunos) butun ekranni egallaydi, panellar ustida suzadi. Bogʻshunos — Master reja tuzilishida (qadamlar), lekin landshaft dizayni. Binokor — bino modellash, struktura, parametrik dizayn, chizmalar/rejalar. Dizayn-kod ekrani yoqdi («qiziq»).

## Ekranlar holati (14.11)
- **Joyshunos** — xarita butun ekranga cho'zildi, legenda/manba belgisi panellar yoniga ko'chdi. Saytdagi Joyshunos bilan hali to'liq solishtirilmagan.
- **Koʻchasoz** — saytdagi `app/kochasoz.html#/b` (Kesim) tuzilishiga qayta qurildi: A Tarmoq · B Kesim · C Chorraha · D Koʻcha muhiti; chap — ShNQ toifasi, Dizayn-kod turi, tayyor kesimlar, chetlar; markaz — ko'rinish + element tasmasi; o'ng — element va Tekshiruv.
- **Dizayn-kod** — haqiqiy qoidalar `test/dizaynkod/qoidalar.json` dan (Kengash qarori VII-19-17-14-0-K/26, 17.02.2026, 2-ilova P2.3): U2; A1, B3, A5; B3 6.5.6-band (10 % / 40 %). Foizlar namuna. Saytda (dizaynkod.html) tungi rejim yo'q — 4-bosqichda yangi dizayn bilan birga.
- **Chizmadon** — saytdagi Chizmadon (Master reja → Taqdimot) tuzilishiga qayta qurildi: Albom (Loyihadan, Varaqlar eskizlari, Qatlamlar/Uslub/Kutubxona), A3 varaq, pastki chizish asboblari, o'ngda Element/Varaq.
- **Bogʻshunos** — Master reja qobig'ida: butun ekran landshaft rejasi, 11 qadam (Hudud → … → Eksport), 5-qadam Koʻkalamzorlashtirish, fasllar, ko'rsatkichlar. Qadamlar ro'yxati — taklif.
- **Binokor** — Model/Struktura/Parametrik/Chizmalar; qavatlar, 3D model + 3-qavat rejasi, modellash asboblari, parametrik panel (devor-pilon/karkas, 8 ball), chizmalar to'plami. GFA/xonadonlar [—].
- **Render** — hali ko'rib chiqilmagan (saytdagi `app/render.html` bilan solishtirish kerak).

## Keyingi qadamlar
1. Iskandarning yangi izohlari bo'yicha tuzatish; Render va Joyshunosni saytdagi haqiqiy interfeys bilan solishtirish.
2. Ma'qullangan ekran saytga alohida PR bilan (3b bosqichi bajarildi: #640 bulutda xizmat holati, #641 xizmat eshigi «Loyihalar», #643 o'tish).
3. Jonli naqshlar va «bo'lim → loyihalar» o'tishi — 4-bosqichda saytga (ekranma-ekran).
