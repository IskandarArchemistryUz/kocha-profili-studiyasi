# Yershunos — urbanizatsiya, Angren: chegaralar va prognoz bo'yicha qo'shimcha (25.11.2026, 21:15)

Asosiy hujjat: `claude/yershunos-urbanizatsiya-angren-25-11.md` (undagi geoBoundaries/OCHA tuman jadvali bekor — quyidagisi bilan almashtirildi).

## Chegaralar manbasi almashtirildi → Overture Maps `division_area` (ODbL)
bbox ichida: 6 tuman/shahar (county), 48 aholi punkti (locality), 3 viloyat. Nomlar o'zbekcha; mahalla darajasi yo'q.

| Birlik (bbox ichidagi qismi) | 1980 | 2000 | 2020 | 2030 | O'sish 1980–2020 | Vodiy tubida 2020 | Shahar ulushi |
|---|---|---|---|---|---|---|---|
| Angren shahri (99 %) | 62 353 | 78 178 | 105 052 | 124 381 | 68 % | 1 789 | 0,94 |
| Ohangaron tumani (39 %) | 2 278 | 3 858 | 7 496 | 10 526 | 229 % | 315 | 0,01 |
| Pop tumani (9 %) | 87 | 103 | 229 | 307 | 163 % | 22 | 0 |

Aholi punktlari (2020; vodiy tubida): Angren 70 502 (310) · Hakerman 9 810 (8) · Obliq qo'rg'oni 2 768 (49) · Uvaq 2 098 (0) · Samarchuk 1 873 (32) · Grum 1 784 (154) · Jigiristan 1 223 (215) · Gulbog' 768 (132). **Vodiy tubidagi ulushi eng yuqori: Jigiristan 18 %, Gulbog' 17 %, Grum 9 %** — birinchi navbatda joyida tekshiriladigan qishloqlar. Eng tez o'sganlar (1980–2020): Gulbog' +320 %, Chetsu +285 %, Ikkital +228 %, Samarchuk +222 %.

## GHS-POP ni rasmiy son bilan solishtirish
Angren shahri: GHS-POP 2020 — 105 ming; citypopulation.de — 174,4 ming (shahar aholisi; yili va birlamchi manbasi tekshirilmagan). Farq ~40 %. Xulosa: **GHS-POP mutlaq sonlari ishonchsiz; ulush va dinamika uchun ishlatiladi**, mutlaq sonlar rasmiy statistika (stat.uz / siat.stat.uz) bilan kalibrlanadi (birlik bo'yicha ko'paytirgich).

## Prognoz (GHS-WUP-POP R2025A)
JRC'da plitka yo'q, faqat global zip: `GHSL/GHS_WUP_POP_GLOBE_R2025A/GHS_WUP_POP_E{yil}_GLOBE_R2025A_54009_1000/V1-0/…_V1_0.zip` (E2050 — 234 MB). Litsenziya CC BY 4.0 (AWS reyestri). Skriptda tayyor (zip ichidan o'qish, sinovdan o'tgan), `prognoz_ha.txt` fayli bo'lsa ishga tushadi; 2020, 2050, 2100 uchun ~0,6 GB yuklash — Iskandar ruxsatini kutmoqda.

## Keyingi
1. Rasmiy aholi sonlari bilan kalibrlash (stat.uz, tuman/shahar kesimi).
2. Prognoz (ruxsatdan keyin).
3. «Kengayish» rejimiga ulash: aholi punkti turi qatlami, birliklar jadvali, vodiy tubidagi ulush bo'yicha saralash.
