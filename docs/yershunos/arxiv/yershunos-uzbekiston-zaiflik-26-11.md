# Yershunos · O'zbekiston: aholi zaifligi (26.11.2026)

## Nima qilindi
- Manba: stat.uz (SIAT) ochiq ma'lumotlari, tuman/shahar kesimi, 2025-yil (aholi va yosh — 2026-yil 1-yanvar). SIAT sahifasida litsenziya CC BY 4.0 deb ko'rsatilgan (2441-to'plam sahifasi) — pullik xizmatda manba ko'rsatib ishlatish mumkin; boshqa to'plamlar sahifasida alohida tekshirilmagan.
- ThinkPad: `siat_ol.py` / `siat.bat` → `C:\Work\Yershunos\kesh\stat\<id>.json`, xulosa `natija_siat.txt`. 43 to'plam sinab ko'rildi, 24 tasida tuman kesimi bor.
- `kal/zaif_birlik.py` → `zaif_birlik.json` → `birlik.py` da `j` xossasi; respublika qiymatlari GeoJSON ning `ij` maydonida.
- Rasmiy qatorlar birliklarga `osm_moslik.json` dagi `_kodlar` (MHOBT kodi) orqali ulanadi. Birlashgan birliklarda sonlar qo'shiladi, foizlar aholi bo'yicha tortiladi.

## To'plamlar (SIAT id)
| Ko'rsatkich | id | `j` kaliti |
|---|---|---|
| Ichimlik suvi bilan ta'minlangan kvartira (uy)lar, % | 2631 | suv |
| Kanalizatsiya, % | 1242 | kan |
| Tabiiy gaz, % | 1243 | gaz |
| Issiq suv, % / issiqlik, % | 3196 / 3197 | isuv / isq |
| Uy-joy bilan ta'minlanish, m²/kishi (tuman kesimi 2018-yilgacha) | 3198 | uy, uy_y |
| O'rtacha oylik ish haqi, so'm | 500 | haq, haq_n (respublikaga nisbatan %) |
| Ishsizlik darajasi, % | 1875 | ishs |
| 0–2, 3–5, 6–7, 8–15 yosh | 561, 2838, 589, 600 | bol (%) |
| 60–64, 65+ yosh | 1190, 1191 | kek (%) |
| Ko'chib kelganlar / ketganlar | 238 / 239 | mig (1000 kishiga, 2021–2025 o'rtacha) |
| Shahar / qishloq aholisi | 248 / 247 | shahar (%) |
| Shifokorlar soni, shifoxona o'rinlari | 2846, 1432 | shf, orn (10 000 kishiga) |
| Tug'ilganlar | 223 | tug (1000 kishiga) |
| Doimiy aholi | 246 | maxraj |

Tuman kesimi YO'Q (faqat viloyat yoki respublika): kambag'allik darajasi (3495), kam ta'minlanganlar (1737), devor materiali (1256, 1257, 1260), sanitariya (2764), xavfsiz ichimlik suvi (603, 619), go'daklar o'limi (586), maktab va MTT (1440, 829, 1420, 1413, 767), pensiya (1377), o'rtacha yosh (4697). Tuman kesimida kvartiralar soni (1245) va uy-joy fondi (1244) 2018-yildan keyin nol.

## Zaiflik indeksi (`j.z`, 0–100)
Olti tarkib, har biri 197 birlik ichidagi o'rni (foiz-rang), teng vazn: ichimlik suvi (teskari), kanalizatsiya (teskari), ish haqi (teskari), ishsizlik, bolalar + keksalar ulushi, shifokorlar (teskari). Tarkiblar `j.zt` da. Ko'rgazmali; vaznlar ekspert qarori emas.

## Natija
- Ichimlik suvi 60 % dan past: 31 birlik, 6,13 mln kishi (15,7 %). Eng past: Koson 20,5 %, G'uzor 22,9 %, Qamashi 27,0 %, Dehqonobod 30,4 %, Baxmal 33,4 %.
- Kanalizatsiya 30 % dan past: 55 birlik, 10,19 mln kishi (26,1 %).
- Ish haqi respublikaning 65 % idan past: 89 birlik, 17,57 mln kishi (45 %). Median tuman — 65 %; Toshkent shahri 153 %, Navoiy viloyati 101 %.
- Indeks 60+: 77 birlik, 15,78 mln kishi (40,5 %). Eng zaif: Qamashi 86, Boysun 86, Forish 85, Uzun 84, Dehqonobod 84, Ko'kdala+Chiroqchi 83, Angor 82, Qarshi t. 81, Qo'shrabot 80, Kasbi 80.
- Viloyat (aholi bo'yicha, indeks · suv % · kanalizatsiya % · ish haqi %): Surxondaryo 68 · 69 · 38 · 64; Qashqadaryo 68 · 60 · 34 · 64; Samarqand 58 · 81 · 41 · 67; Jizzax 58 · 72 · 42 · 70; Andijon 54 · 83 · 31 · 77; Buxoro 51 · 69 · 39 · 70; Farg'ona 48 · 78 · 53 · 68; Namangan 47 · 90 · 52 · 70; Xorazm 46 · 71 · 34 · 68; Sirdaryo 46 · 87 · 56 · 74; Qoraqalpog'iston 46 · 70 · 40 · 76; Toshkent vil. 43 · 82 · 70 · 77; Navoiy 37 · 87 · 47 · 101; Toshkent sh. 9 · 97 · 96 · 153.
- Bog'liqlik (197 birlik, Pearson): indeks ~ aholi o'sishi sur'ati +0,45; ~ zichlik (log) −0,46; ~ issiq kunlar −0,01; ~ suv stressi +0,21. Ya'ni eng tez o'sayotgan tumanlar ayni paytda eng zaif; jazirama esa zaiflikka bog'liq emas.
- Kesishmalar: indeks 60+ va 2050-yilda 90+ issiq kun (SSP2-4.5): 20 birlik, 3,47 mln kishi (G'ijduvon, Koson, Qumqo'rg'on, Jarqo'rg'on, Baliqchi, Kasbi, Buxoro t., Jondor, Shofirkon, Nishon). Indeks 60+ va suv stressi 4+: 47 birlik, 10,16 mln kishi.
- Baxmal: indeks 70; ichimlik suvi 33 %, kanalizatsiya 33 %, gaz 20 %, ish haqi respublikaning 71 %, 0–15 yosh 36,7 %, shifokor 11,8 / 10 000.

## Cheklovlar
- Ish haqi faqat rasmiy sektor; norasmiy daromad, pul o'tkazmalari, tomorqa kirmaydi. Kambag'allik tuman kesimida e'lon qilinmagan.
- Rasmiy ishsizlik 3,2–5,8 % oralig'ida: tumanlarni deyarli ajratmaydi.
- Shifokor va shifoxona o'rinlari muassasa joylashgan birlikka yoziladi: viloyat markazi shaharlari yuqori (225 / 10 000 gacha), atrof tumanlar past chiqadi. Xizmat ko'rsatish hududi hisobga olinmagan.
- Kommunal ta'minot — kvartira (uy)lar ulushi; birlashgan birliklarda aholi bo'yicha tortilgan (kvartiralar soni yo'q).
- "Issiqlik" (3197) markaziy isitishmi yoki har qanday isitish tizimimi — metodika o'qilmagan; sahifada "isitish tizimi" deb yozilgan.
- 2631 qatorida yillararo sakrashlar bor (Baxmal: 2021 — 49,8 %, 2022 — 30,4 %): qayta hisoblash yoki chegara o'zgarishi bo'lishi mumkin, tekshirilmagan.
- Ustuvorlik reytingiga qo'shilmagan.

## Sahifa
"Aholi zaifligi" guruhi (`#uzs6`): Zaiflik indeksi (`zi`), Ichimlik suvi (`zs`), Kanalizatsiya (`zk`), Ish haqi (`zh`); kartada blok; CSV ga 9 ustun. Artefakt versiyasi `1795709647-c345`.

## Keyingi
- Reyting tuzilmasi: xavf (issiq, qurg'oqchillik, suv, toshqin) × ta'sir ostidagilar (aholi, o'sish) × zaiflik — qaror kutilmoqda.
- Seysmik zaiflik uchun devor materiali faqat viloyat kesimida; tuman uchun aholini ro'yxatga olish (2026) natijalari e'lon qilinganda qaytish.
