# Yershunos — urbanizatsiya moduli, Angren sinovi (25.11.2026, 20:55) — SKRINING

Kod: `C:\Work\Yershunos\urban_sinov.py`, `urban.bat` (ThinkPad); natija `natija_urban.json`. Ta'sir moduli holati: `claude/yershunos-tasir-holat-25-11.md`. Iskandar 25.11 da modulni boshlashni tasdiqladi.

## Aholi punkti turi (GHS-SMOD R2023A, 1 km; aholi GHS-POP 100 m)
| Yil | Shahar markazi | Shaharcha (zich/yarim zich) | Shahar atrofi | Qishloq | Shahar ulushi |
|---|---|---|---|---|---|
| 1980 | 0 | 24 485 (10 km²) | 30 150 (38 km²) | 10 160 | 84 % |
| 2000 | 0 | 36 621 (17 km²) | 36 180 (45 km²) | 9 456 | 88 % |
| 2020 | 67 037 (29 km²) | 0 | 31 415 (38 km²) | 14 605 | 87 % |
| 2030 | 79 999 (30 km²) | 0 | 37 950 (43 km²) | 17 623 | 87 % |
- 2020 da «shahar markazi» paydo bo'lishi — tasnif chegarasidan (≥ 50 ming, ≥ 1 500 kishi/km²) o'tish; keskin real o'zgarish emas.
- Qishloq → shahar turiga o'tgan (1980→2020): 19 km², 2020 da 12 870 kishi.
- **Vodiy tubidagi aholi 2020 (2 177):** qishloq 1 202 (55 %), shahar atrofi 856, shahar markazi 120. Qishloq aholisi umumiy aholining 13 % i, vodiy tubida esa 55 % — toshqinga moyil joyda asosan qishloq va shahar chekkasi.

## Tumanlar (geoBoundaries gbOpen ADM2; manba OCHA ROCCA, CC BY 3.0 IGO)
| Birlik (bbox ichidagi qismi) | 1980 | 2000 | 2020 | 2030 | O'sish 1980–2020 | Vodiy tubida 2020 | Shahar ulushi |
|---|---|---|---|---|---|---|---|
| Akhangaran (37 %) | 57 450 | 71 825 | 97 418 | 116 963 | 70 % | 1 984 | 0,86 |
| Angren city (100 %) | 7 133 | 10 157 | 14 984 | 17 699 | 110 % | 114 | 0,98 |
| Pap (13 %) | 136 | 156 | 374 | 553 | 175 % | 27 | 0 |
| Bostanlik (6 %) | 0 | 0 | 0 | 0 | — | 0 | — |
- **Chegaralar ishonchsiz:** «Angren city» poligonida atigi ~15 ming kishi, shahar aholisining asosiy qismi «Akhangaran»ga tushgan → OCHA chegaralari eskirgan yoki siljigan. Tuman jadvali rasmiy chegaralar (kadastr / open.ngis.uz yoki OSM admin_level) bilan qayta hisoblanmaguncha ishlatilmaydi.

## Bajarilmadi
- **Prognoz (GHS-WUP-POP R2025A, 2100 gacha):** plitka manzili taxmin qilingan edi — HTTP 404. To'g'ri manzil JRC yuklash sahifasidan aniqlanadi (ehtimol faqat global fayl, 170–250 MB/davr).

## Ochiq savollar
- GHS-POP 2020 hududda 113 ming — Angren shahri rasmiy aholisidan past ko'rinadi; Statistika agentligi sonlari bilan solishtirish shart.
- SMOD — BMT «urbanizatsiya darajasi» usuli; O'zbekistonning rasmiy shahar/qishloq maqomi emas.

## Keyingi
1. WUP manzilini tuzatish → prognoz.
2. Rasmiy tuman/mahalla chegaralari.
3. Modulni Yershunos sahifasidagi «Kengayish» rejimiga ulash (aholi punkti turi qatlami, davr slayderi, tuman jadvali) va pasport varag'i.
