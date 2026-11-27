# Yershunos — GHS-POP ni rasmiy statistika bilan kalibrlash, Angren (25.11.2026)

Iskandar qarori (25.11, 21:14): sahifaga ulashdan **avval kalibrlash**; prognoz uchun ~0,6 GB yuklashga ruxsat berildi (ThinkPad'da boshlangan).

## Solishtirish: Angren shahri (Overture `division_area` poligoni, 99 % bbox ichida)
| Sana | Rasmiy / e'lon qilingan | GHS-POP (interpolyatsiya) | Nisbat | Manba |
|---|---|---|---|---|
| 1991 | 132 000 | 80 009 | 1,65 | uz.wikipedia jadvali (birlamchi manbasi tekshirilmagan) |
| 2005 | 127 000 | 80 798 | 1,57 | uz.wikipedia jadvali (tekshirilmagan) |
| 1.01.2023 | 178 483 | 110 851 | 1,61 | Toshkent vil. statistika (aniq.uz orqali; citypopulation.de — 178 517) |
| 1.07.2025 | 186 855 | 115 683 | 1,62 | toshvilstat.uz |
| 1.01.2026 | 188 275 | 116 649 | 1,61 | toshvilstat.uz |

**Xulosa:** GHS-POP Angren uchun aholini barqaror ~38 % kam ko'rsatadi; nisbat 35 yil davomida 1,57–1,65 oralig'ida. Demak dinamika (o'sish sur'ati, turg'unlik davri) to'g'ri, mutlaq son past. **Kalibrlash ko'paytirgichi k = 1,61** (1.01.2026 bo'yicha) — birlik ichidagi barcha kataklarga bir xil qo'llanadi.

## Kalibrlangan natija (2020 holati × 1,61) — SKRINING
- Angren shahri: vodiy tubida ~2 890 kishi (xom 1 789).
- Aholi punktlari (jami → vodiy tubida): Angren 113 800 → 500 · Jigiristan 1 970 → 350 (18 %) · Grum 2 880 → 250 (9 %) · Gulbog' 1 240 → 210 (17 %) · Obliq qo'rg'oni 4 470 → 80.
- Ulushlar kalibrlashdan o'zgarmaydi (ko'paytirgich bir xil).

## Cheklovlar
- k faqat Angren shahri uchun tekshirilgan. Ohangaron tumani bbox ichida atigi 39 % — undan k olinmaydi; tuman to'liq qamralganda alohida hisoblanadi (rasmiy: 114 606, 1.01.2026).
- Overture poligoni rasmiy shahar chegarasiga to'liq mos kelishi tekshirilmagan.
- Bir xil ko'paytirgich birlik ichida kam hisoblash bir tekis degan farazga tayanadi; qishloqlarda farq boshqacha bo'lishi mumkin.
- 1991 va 2005 sonlari ikkilamchi manbadan.

## Usul (zanjirga qo'shiladi)
`rasmiy_aholi.csv` (birlik, sana, aholi, manba) → har birlik uchun k = rasmiy / GHS(sana) → birlik ichidagi aholi rastri × k; k mavjud bo'lmagan birlik «kalibrlanmagan» belgisi bilan chiqadi. Natijada ikkala son (xom va kalibrlangan) va k ko'rsatiladi.

## Keyingi
1. Usulni `urban_sinov.py` / `tasir.py` ga kod sifatida qo'shish; stat.uz tuman/shahar jadvalini (viloyat kesimida) yuklovchi.
2. Prognoz natijasi (WUP 2020 / 2050 / 2100) — yuklash tugagach; unga ham shu k.
3. Shundan keyin «Kengayish» rejimiga ulash.
