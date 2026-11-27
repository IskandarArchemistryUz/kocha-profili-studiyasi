# Yershunos — butun O'zbekiston: urbanizatsiya va aholi, 1 km (26.11.2026, 08:17) — SKRINING, KALIBRLANMAGAN

Iskandar qarori (25.11, 21:23): tumanma-tuman emas, butun mamlakat bo'yicha. Kod: `C:\Work\Yershunos\uzb_sinov.py` + `uzb_osm.bat` (ThinkPad); natija `natija_uzb_osm.json`, `uzb_birliklar_osm.csv` (13 viloyat + 203 tuman/shahar, 1980–2030 aholi, shahar ulushi, WUP 2020/2050/2100). Hisob 105 s.

## Manbalar
GHS-POP R2023A 1 km, GHS-SMOD R2023A 1 km, GHS-WUP-POP R2025A 1 km (JRC, CC BY 4.0). Chegaralar: **OpenStreetMap, Overpass API orqali (ODbL)** — admin_level 4 (viloyat) va 6 (tuman/shahar); 12 MB. Overture `division_area` mamlakat miqyosida sekin internetda yuklanmadi (har urinishda boshidan boshlanadi) — voz kechildi.

## Natija
- Jami (203 birlik yig'indisi): 2020 — 33,07 mln (rasmiy 2020 — 33,9 mln; nisbat 0,975). **Mamlakat darajasida GHS-POP rasmiy songa mos.**
- Viloyat poligonlari ichida: 14,9 mln (1980) → 31,7 mln (2020) → 36,3 mln (2030); **Qoraqalpog'iston viloyat darajasida yo'q** (OSM'da admin_level boshqa) — tumanlari bor, «vil» bo'sh.
- Prognoz (WUP, Qoraqalpog'istonsiz): 31,8 mln (2020) → 49,5 mln (2050) → 70,5 mln (2100). Global model; BMT prognozi bilan solishtirilmagan.
- Eng tez o'sgan (1980–2020): Qo'shrabot +689 %, Ko'kdala +642 %, Bandixon +542 %, Qorovulbozor +467 %, Nishon +330 %, Dehqonobod +329 %. Juda yuqori foizlar 1980 yil bazasi pastligidan (yangi tashkil etilgan tumanlar, model xatosi) — tekshiriladi.

## Muhim topilma: tuman darajasida GHS-POP ishonchsiz
Toshkent viloyati, rasmiy 1.01.2026 (toshvilstat.uz) ↔ GHS-POP 2026 (interpolyatsiya):
| Birlik | Rasmiy | GHS | k |
|---|---|---|---|
| Angren sh. | 188 275 | 114 221 | 1,65 |
| Olmaliq sh. | 151 022 | 85 247 | 1,77 |
| Chirchiq sh. | 178 270 | 82 568 | 2,16 |
| Bekobod sh. | 107 292 | 52 333 | 2,05 |
| Yangiyo'l sh. | 88 884 | 43 964 | 2,02 |
| Nurafshon sh. | 58 763 | 32 854 | 1,79 |
| O'rta Chirchiq t. | 142 986 | 277 230 | 0,52 |
| Yangiyo'l t. | 207 692 | 280 767 | 0,74 |
| Bo'stonliq t. | 179 084 | 118 887 | 1,51 |
| Oqqo'rg'on t. | 115 547 | 64 322 | 1,80 |
- Shaharlar 1,7–2,2 baravar kam, ayrim shahar atrofi tumanlari 1,3–2 baravar ortiq ko'rsatilgan: model aholini shahardan atrofga «yoyib» yuborgan.
- Toshkent shahri tumanlari umuman noto'g'ri: Sergeli 796 ming, Yangihayot 902 ming, Chilonzor 92 ming (rasmiy 1.01.2025: 173 / 188 / 277 ming).
- **Xulosa:** GHS-POP faqat tuman ichidagi taqsimot uchun; har tuman jami rasmiy songa majburan tenglashtiriladi (k tuman bo'yicha). Kalibrlanmagan tuman sonlari va o'sish reytinglari hech qayerda ishlatilmaydi.

## SMOD «shahar ulushi» haqida
SMOD bo'yicha shahar turidagi kataklarda 86 % aholi (2020); rasmiy shahar aholisi ~51 %. Sabab: BMT «urbanizatsiya darajasi» usuli zich qishloq vodiylarini (Farg'ona, Zarafshon) shahar turi deb oladi. Bu xato emas, boshqa ta'rif — pasportda ikkalasi yonma-yon va izoh bilan beriladi.

## Keyingi
1. stat.uz dan barcha tuman/shaharlar rasmiy aholisi (203 birlik) → `rasmiy_aholi.csv` → k har birlik uchun → kalibrlangan rastr va jadval; «model xatosi» xaritasi (k).
2. Qoraqalpog'iston viloyat poligoni (OSM'da alohida so'rov).
3. O'sish reytinglari faqat kalibrlashdan keyin; tarixiy rasmiy sonlar (1989 ro'yxati, 2000, 2010) bo'lsa — dinamika ham kalibrlanadi.
4. Sahifaga ulash — kalibrlashdan keyin.
