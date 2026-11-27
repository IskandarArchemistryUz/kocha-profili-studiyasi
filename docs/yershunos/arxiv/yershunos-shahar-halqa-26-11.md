# Yershunos · shahar atrofi ko'rsatkichi — to'liq halqa (26.11.2026)

Oldingi (`claude/yershunos-uzbekiston-kalibrlash-2-26-11.md` §3) hisobda halqa sifatida faqat shu nomli bitta tuman olingan edi. Endi halqa = shahar bilan chegaradosh **barcha** tumanlar (OSM geometriyasi, 200 m bufer bilan kesishish). Skript: `claude/yershunos-src/kal/halqa.py`; chiqish `uzb_shahar_halqa.csv` (27 shahar). Toshkent shahri — 12 tuman birlashmasi.

Davr: shahar va halqadagi oxirgi chegara o'zgarishidan keyingi barqaror yillar (ko'pida 2010–2026; Toshkent 2021–2026; Toshkent viloyati shaharlari 2018–2026).

## Natija
27 shahardan 19 tasida halqa shahardan tez o'sadi. Aholisi 150 mingdan ortiq 15 shahar bo'yicha: qo'shimcha aholi shaharlarda 1,23 mln, halqalarda 2,20 mln — **o'simning 64 % i halqada**.

| Shahar | Shahar, %/yil | Halqa, %/yil | O'simdagi halqa ulushi | Halqa tumanlari |
|---|---|---|---|---|
| Toshkent (2021–26) | 2,13 | 2,36 | 37 % | Quyichirchiq, Zangiota, Yuqorichirchiq + O'rtachirchiq, Qibray va b. (6) |
| Namangan | 1,98 | 2,11 | 68 % | Kosonsoy, Namangan, To'raqo'rg'on, Uychi, Chortoq, Yangiqo'rg'on |
| Samarqand | 1,47 | 2,15 | 74 % | Oqdaryo, Jomboy, Pastdarg'om, Samarqand |
| Andijon | 1,21 | 2,30 | 75 % | Oltinko'l, Andijon, Xo'jaobod |
| Nukus | 1,50 | 1,44 | 49 % | Amudaryo, Qorao'zak, Nukus |
| Farg'ona | 1,71 | 1,87 | 59 % | Toshloq, Farg'ona |
| Qo'qon | 1,54 | 1,86 | 75 % | Uchko'prik, O'zbekiston, Dang'ara, Furqat |
| Buxoro | 0,64 | 2,33 | 77 % | Buxoro, Kogon |
| Qarshi | 1,46 | 2,71 | 68 % | Qarshi |
| Marg'ilon | 1,52 | 1,91 | 77 % | Qo'shtepa, Toshloq, Farg'ona |
| Jizzax | 1,77 | 2,60 | 62 % | Sharof Rashidov |
| Navoiy | 1,36 | 2,32 | 55 % | Karmana |
| Chirchiq (2018–26) | 1,82 | 1,48 | 76 % | Bo'stonliq, Yuqorichirchiq + O'rtachirchiq, Qibray |
| Angren (2018–26) | 1,65 | 1,52 | 36 % | Ohangaron |
| Olmaliq (2018–26) | 1,45 | 1,54 | 59 % | Ohangaron, Piskent |

Istisnolar: Nukus, Chirchiq, Angren (shahar halqadan tezroq), Zarafshon (halqa — Tomdi, kamaymoqda).

## Cheklovlar
1. **Halqa o'sishi faqat shahar atrofiga ko'chish emas.** Qishloq tumanlarida tabiiy o'sish shahardan yuqori; migratsiya ma'lumotisiz ikkalasini ajratib bo'lmaydi. Ko'rsatkich «o'sish qayerda yig'ilyapti»ni ko'rsatadi, sababini emas.
2. Halqa tumanining butun aholisi olinadi, shahar chetidagi qismi emas. Katta tumanlarda (Bo'stonliq, Tomdi) bu ko'rsatkichni buzadi. Aniqroq variant: shahar chegarasidan 5–10 km masofadagi aholi (GHS-POP × k) — keyingi qadam.
3. Bir tuman bir necha shahar halqasiga kiradi (Farg'ona tumani — Farg'ona, Marg'ilon, Quvasoy), shuning uchun shaharlararo yig'indida takror bor (64 % shu takror bilan).
4. Termiz, Urganch, Xiva shaharlari o'z tumani bilan qo'shilgan (OSMda chegara yo'q) — ro'yxatda yo'q. 26.11 da OSMdan qayta so'ralganda ham ma'muriy chegara topilmadi (faqat Termiz uchun `place=city` munosabati) — boshqa manba kerak.
5. Davrlar har xil (Toshkent 5 yil, boshqalar 16 yil).
